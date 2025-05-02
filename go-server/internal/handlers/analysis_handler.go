package handlers

import (
	"diploma/go-server/internal/services" // Путь к нашему сервису
	"fmt"
	"io"
	"log"
	"net/http"

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
	api := router.Group("/api")
	{
		api.POST("/analyze", h.handleAnalyzeData) // POST /api/analyze
	}
}

// handleAnalyzeData обрабатывает запрос на анализ данных (POST /api/analyze).
func (h *AnalysisHandler) handleAnalyzeData(c *gin.Context) {
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

	// Вызываем сервис анализа, передавая контекст запроса Gin
	analysisResponse, err := h.service.PerformAnalysis(c.Request.Context(), fileContent, fileName)
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
