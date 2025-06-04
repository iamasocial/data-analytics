package handlers

import (
	"diploma/go-server/internal/models"
	"diploma/go-server/internal/services" // Путь к нашему сервису
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"  // <<-- Добавлено
	"google.golang.org/grpc/status" // <<-- Добавлено
	"google.golang.org/protobuf/encoding/protojson"
)

// AnalysisHandler обрабатывает HTTP запросы, связанные с анализом.
type AnalysisHandler struct {
	service services.AnalysisService // Зависимость от сервиса анализа
}

// NewAnalysisHandler создает новый экземпляр обработчика анализа.
func NewAnalysisHandler(service services.AnalysisService) *AnalysisHandler {
	if service == nil {
		log.Println("Warning: AnalysisService is nil in NewAnalysisHandler")
	}
	return &AnalysisHandler{
		service: service,
	}
}

// RegisterRoutes регистрирует маршруты для обработчика в Gin роутере.
func (h *AnalysisHandler) RegisterRoutes(router *gin.Engine) {
	// Группа маршрутов API (опционально)
	// Эти маршруты теперь регистрируются в cmd/main.go с использованием middleware
	// api := router.Group("/api")
	// {
	// 	api.POST("/analyze", h.HandleAnalyzeData) // POST /api/analyze
	// 	api.POST("/columns", h.HandleGetColumns)  // POST /api/columns
	// }
}

// HandleAnalyzeData обрабатывает запрос на анализ данных (POST /api/analyze).
func (h *AnalysisHandler) HandleAnalyzeData(c *gin.Context) {
	log.Println("Handler: Received /api/analyze request")

	if h.service == nil {
		log.Println("Error: AnalysisService is not initialized in AnalysisHandler")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: service not available"})
		return
	}

	// Получаем файл из multipart/form-data запроса
	// "file" - это ожидаемое имя поля в форме
	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("Error getting file from form: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Error getting file from form: %v", err)})
		return
	}

	// Получаем выбранные анализы из формы
	// Фронтенд должен отправлять их как selected_analyses=value1&selected_analyses=value2...
	selectedAnalyses := c.PostFormArray("selected_analyses")
	if len(selectedAnalyses) == 0 {
		// Если PostFormArray не находит, попробуем получить как одну строку и разделить
		// Это для случая, если фронтенд шлет как selected_analyses="value1,value2"
		selectedAnalysesStr := c.PostForm("selected_analyses_single") // Используем другое имя, чтобы не конфликтовать
		if selectedAnalysesStr != "" {
			// TODO: Реализовать разделение строки, если это нужно
			// selectedAnalyses = strings.Split(selectedAnalysesStr, ",")
			log.Printf("Received selected_analyses_single: %s. Splitting logic needs to be implemented if used.", selectedAnalysesStr)
		} else {
			log.Println("Warning: No analyses selected by the user, or 'selected_analyses' field is missing/empty.")
			// По умолчанию можно выбрать все или вернуть ошибку
			// selectedAnalyses = []string{"descriptive_stats", "normality_test", "regression"} // Пример: выбрать все
		}
	}
	log.Printf("Handler: Selected analyses from form: %v", selectedAnalyses)

	var dependentVariable, independentVariable string
	// Создадим новый слайс для передачи в сервис, чтобы не изменять исходный selectedAnalyses
	// который может использоваться где-то еще или для логирования "чистых" пользовательских выборов.
	// Однако, в текущей логике selectedAnalyses извлекается из формы и сразу используется.
	// Важно, чтобы selectedAnalyses, передаваемый в PerformAnalysis,
	// не содержал regression_dependent/independent.
	// А dependentVariable и independentVariable передавались отдельно.

	cleanedSelectedAnalyses := make([]string, 0, len(selectedAnalyses))
	isRegressionSelected := false

	for _, analysis := range selectedAnalyses {
		if analysis == "regression" {
			isRegressionSelected = true
			// Добавляем "regression" в cleanedSelectedAnalyses, но не строки с префиксами
			cleanedSelectedAnalyses = append(cleanedSelectedAnalyses, analysis)
		} else if !strings.HasPrefix(analysis, "regression_dependent:") && !strings.HasPrefix(analysis, "regression_independent:") {
			cleanedSelectedAnalyses = append(cleanedSelectedAnalyses, analysis)
		}
	}

	if isRegressionSelected {
		dependentVariable = c.PostForm("dependent_variable")
		independentVariable = c.PostForm("independent_variable")

		if dependentVariable == "" || independentVariable == "" {
			log.Printf("Error: Missing regression variables. dependent_variable=%s, independent_variable=%s", dependentVariable, independentVariable)
			c.JSON(http.StatusBadRequest, gin.H{"error": "For regression analysis, both dependent and independent variables must be specified"})
			return
		}
		log.Printf("Handler: Regression variables - dependent: %s, independent: %s", dependentVariable, independentVariable)
	}

	// Открываем файл
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("Error opening uploaded file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error opening uploaded file: %v", err)})
		return
	}
	defer file.Close() // Важно закрыть файл

	// Читаем содержимое файла в байтовый срез
	fileContent, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file content: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error reading file content: %v", err)})
		return
	}

	fileName := fileHeader.Filename
	log.Printf("Handler: Read file %s, size: %d bytes", fileName, len(fileContent))

	// Вызываем сервис анализа, передавая "очищенный" selectedAnalyses
	analysisResponse, err := h.service.PerformAnalysis(c.Request.Context(), fileName, fileContent, cleanedSelectedAnalyses, dependentVariable, independentVariable)
	if err != nil {
		log.Printf("Error performing analysis: %v", err)

		// Проверяем, является ли ошибка ошибкой gRPC
		st, ok := status.FromError(err)
		if ok {
			// Проверяем код статуса gRPC
			switch st.Code() {
			case codes.InvalidArgument: // Ошибка пользователя (напр., пустой файл, неверный формат)
				c.JSON(http.StatusBadRequest, gin.H{"error": st.Message()})
			case codes.FailedPrecondition: // Напр., отсутствует зависимость (openpyxl)
				c.JSON(http.StatusBadRequest, gin.H{"error": st.Message()}) // Тоже ошибка клиента
			case codes.DeadlineExceeded: // Таймаут при вызове Python
				c.JSON(http.StatusGatewayTimeout, gin.H{"error": "Analysis request timed out"})
			// Можно добавить обработку других кодов gRPC (NotFound, Unauthenticated, etc.)
			default:
				// Другие ошибки gRPC считаем внутренними ошибками сервера
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error during analysis"})
			}
		} else {
			// Если это не ошибка gRPC (напр., проблема с соединением к Python серверу)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error connecting to analysis service"})
		}
		return // Важно выйти после обработки ошибки
	}

	log.Printf("Handler: Analysis successful for %s. Converting to JSON...", fileName)

	// Конвертируем Protobuf ответ в JSON
	// Используем стандартный marshaller protobuf -> json
	m := protojson.MarshalOptions{
		Indent:          "  ", // Отступы для читаемости
		UseProtoNames:   true, // Использовать имена полей как в .proto
		EmitUnpopulated: true, // Показывать поля с нулевыми значениями (по желанию)
	}
	jsonBytes, err := m.Marshal(analysisResponse)
	if err != nil {
		log.Printf("Error marshalling analysis response to JSON: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error marshalling response to JSON: %v", err)})
		return
	}

	log.Printf("Handler: Sending JSON response for %s", fileName)
	// Отправляем JSON ответ
	c.Data(http.StatusOK, "application/json; charset=utf-8", jsonBytes)
}

// HandleGetColumns обрабатывает запрос на получение списка колонок (POST /api/columns)
func (h *AnalysisHandler) HandleGetColumns(c *gin.Context) {
	log.Println("Handler: Received /api/columns request")

	if h.service == nil {
		log.Println("Error: AnalysisService is not initialized in AnalysisHandler")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: service not available"})
		return
	}

	// Получаем файл из multipart/form-data запроса
	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("Error getting file from form: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Error getting file from form: %v", err)})
		return
	}

	// Открываем файл
	file, err := fileHeader.Open()
	if err != nil {
		log.Printf("Error opening uploaded file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error opening uploaded file: %v", err)})
		return
	}
	defer file.Close()

	// Читаем содержимое файла в байтовый срез
	fileContent, err := io.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file content: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error reading file content: %v", err)})
		return
	}

	fileName := fileHeader.Filename
	log.Printf("Handler: Read file %s for column extraction, size: %d bytes", fileName, len(fileContent))

	// Вызываем сервис для получения столбцов
	columns, err := h.service.GetFileColumns(c.Request.Context(), fileContent, fileName)
	if err != nil {
		log.Printf("Error getting columns: %v", err)

		// Проверяем, является ли ошибка ошибкой gRPC
		st, ok := status.FromError(err)
		if ok {
			switch st.Code() {
			case codes.InvalidArgument:
				c.JSON(http.StatusBadRequest, gin.H{"error": st.Message()})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error connecting to analysis service"})
		}
		return
	}

	// Возвращаем список столбцов в формате JSON
	c.JSON(http.StatusOK, gin.H{
		"columns": columns,
	})
}

// HandleGetUserAnalysisHistory обрабатывает запрос на получение истории анализов пользователя.
func (h *AnalysisHandler) HandleGetUserAnalysisHistory(c *gin.Context) {
	log.Println("Handler: Received /api/analyses/history request")

	if h.service == nil {
		log.Println("Error: AnalysisService is not initialized in AnalysisHandler for history")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: service not available"})
		return
	}

	// Контекст уже содержит userID благодаря AuthMiddleware
	userAnalyses, err := h.service.GetUserAnalysisHistory(c.Request.Context())
	if err != nil {
		// Логируем ошибку, которая пришла из сервисного слоя (она уже содержит детали)
		log.Printf("Error getting user analysis history from service: %v", err)
		// Проверяем на известные типы ошибок, если нужно специфичное поведение
		// Например, если ошибка связана с тем, что userID не найден (хотя middleware должен это покрывать)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve analysis history"})
		return
	}

	if userAnalyses == nil {
		// Если история пуста, возвращаем пустой массив, а не ошибку
		log.Println("Handler: No analysis history found for the user, returning empty list.")
		c.JSON(http.StatusOK, []models.AnalysisRun{}) // Важно вернуть [] а не null для JSON
		return
	}

	log.Printf("Handler: Successfully retrieved %d analysis runs for history.", len(userAnalyses))
	c.JSON(http.StatusOK, userAnalyses)
}

// HandleGetAnalysisRunResults обрабатывает запрос на получение детальных результатов конкретного запуска анализа.
func (h *AnalysisHandler) HandleGetAnalysisRunResults(c *gin.Context) {
	runIDStr := c.Param("runId") // Получаем runId из параметра пути
	runID, err := strconv.ParseInt(runIDStr, 10, 64)
	if err != nil {
		log.Printf("Error parsing runId '%s' from path: %v", runIDStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid run ID format"})
		return
	}

	log.Printf("Handler: Received /api/analyses/history/%d/results request", runID)

	if h.service == nil {
		log.Println("Error: AnalysisService is not initialized in AnalysisHandler for run results")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: service not available"})
		return
	}

	// Здесь также подразумевается, что AuthMiddleware уже проверил аутентификацию.
	// Дополнительная проверка, принадлежит ли runID текущему пользователю, может быть добавлена в сервисе.
	resultsMap, err := h.service.GetAnalysisRunResults(c.Request.Context(), runID)
	if err != nil {
		log.Printf("Error getting analysis run results from service for runID %d: %v", runID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve analysis results"})
		return
	}

	if len(resultsMap) == 0 {
		// Если для данного runID нет результатов (или сам runID не найден/не принадлежит пользователю, в зависимости от логики сервиса)
		// Можно вернуть 404 Not Found
		log.Printf("Handler: No results found for analysis run ID %d.", runID)
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("No analysis results found for run ID %d", runID)})
		return
	}

	log.Printf("Handler: Successfully retrieved results for analysis run ID %d.", runID)
	// Отправляем напрямую карту, так как значения в ней уже json.RawMessage (байты JSON)
	c.JSON(http.StatusOK, resultsMap)
}
