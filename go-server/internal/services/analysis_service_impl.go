package services

import (
	"context"
	"diploma/go-server/generated"
	"diploma/go-server/internal/adapter"
	"diploma/go-server/internal/common"
	"diploma/go-server/internal/models" // Добавлено для models.AnalysisRun
	"diploma/go-server/internal/repository"
	"encoding/json" // Для json.RawMessage и json.Marshal
	"fmt"
	"log"
	"strconv"

	"google.golang.org/protobuf/encoding/protojson" // Для Marshal
)

// Определение интерфейса AnalysisService должно быть только в analysis_service.go
// // AnalysisService defines the interface for analysis operations.
// type AnalysisService interface {
// 	PerformAnalysis(ctx context.Context, fileName string, fileContent []byte, selectedAnalyses []string, dependentVariable string, independentVariable string) (*generated.AnalyzeDataResponse, error)
// 	GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error)
// 	GetUserAnalysisHistory(ctx context.Context) ([]models.AnalysisRun, error)
// 	GetAnalysisRunResults(ctx context.Context, runID int64) (map[string]json.RawMessage, error)
// }

// analysisService реализует AnalysisService.
type analysisService struct {
	grpcClient   adapter.AnalysisClient
	analysisRepo repository.AnalysisRepository
	// userRepo     repository.UserRepository // Удалено, так как не используется пока
}

// NewAnalysisService создает новый экземпляр analysisService.
func NewAnalysisService(client adapter.AnalysisClient, analysisRepo repository.AnalysisRepository) AnalysisService {
	return &analysisService{
		grpcClient:   client,
		analysisRepo: analysisRepo,
	}
}

// PerformAnalysis выполняет анализ данных, вызывая gRPC клиент и сохраняя результаты.
func (s *analysisService) PerformAnalysis(ctx context.Context, fileName string, fileContent []byte, selectedAnalyses []string, dependentVariable string, independentVariable string) (*generated.AnalyzeDataResponse, error) {
	log.Printf("Service: Performing analysis for file: %s, analyses: %v", fileName, selectedAnalyses)

	userIDRaw := ctx.Value(common.UserIDKey)
	if userIDRaw == nil {
		log.Println("Error: User ID not found in context")
		return nil, fmt.Errorf("user ID not found in context, authentication required")
	}

	var userID int
	switch v := userIDRaw.(type) {
	case float64:
		userID = int(v)
	case int:
		userID = v
	case string:
		parsedID, err := strconv.Atoi(v)
		if err != nil {
			log.Printf("Error converting userID '%s' to int: %v", v, err)
			return nil, fmt.Errorf("invalid user ID format in context")
		}
		userID = parsedID
	default:
		log.Printf("Error: User ID in context is of an unexpected type: %T", v)
		return nil, fmt.Errorf("invalid user ID format in context")
	}

	if userID == 0 {
		log.Println("Error: User ID is invalid after type assertion/conversion")
		return nil, fmt.Errorf("invalid user ID format in context")
	}

	// Формируем combinedSelectedAnalyses для gRPC вызова, включая параметры регрессии
	combinedSelectedAnalyses := make([]string, len(selectedAnalyses))
	copy(combinedSelectedAnalyses, selectedAnalyses)
	if dependentVariable != "" {
		combinedSelectedAnalyses = append(combinedSelectedAnalyses, "regression_dependent:"+dependentVariable)
	}
	if independentVariable != "" {
		combinedSelectedAnalyses = append(combinedSelectedAnalyses, "regression_independent:"+independentVariable)
	}

	// Вызов gRPC клиента
	pyResponse, err := s.grpcClient.AnalyzeData(ctx, fileContent, fileName, combinedSelectedAnalyses)
	if err != nil {
		log.Printf("Error calling Python analysis service: %v", err)
		return nil, fmt.Errorf("python analysis service call failed: %w", err)
	}

	// Сохранение результатов анализа
	runID, err := s.analysisRepo.SaveAnalysisRun(ctx, userID, fileName, selectedAnalyses, dependentVariable, independentVariable)
	if err != nil {
		log.Printf("Error saving analysis run metadata: %v", err)
		return nil, fmt.Errorf("failed to save analysis run metadata: %w", err)
	}

	resultsToSave := make(map[string]interface{})
	marshaller := protojson.MarshalOptions{EmitUnpopulated: true} // Определяем один раз

	// Описательные статистики
	if pyResponse.DescriptiveStats != nil {
		jsonData, err := marshaller.Marshal(pyResponse.DescriptiveStats)
		if err != nil {
			log.Printf("Error marshalling DescriptiveStats to JSON for run %d: %v", runID, err)
		} else {
			resultsToSave["descriptive_stats"] = jsonData
		}
	}

	// Тесты на нормальность
	if pyResponse.NormalityTests != nil {
		// Сохраняем всю структуру NormalityTests - содержит все результаты
		completeNormalityTests, err := marshaller.Marshal(pyResponse.NormalityTests)
		if err != nil {
			log.Printf("Error marshalling complete NormalityTests to JSON for run %d: %v", runID, err)
		} else {
			resultsToSave["normality_tests"] = completeNormalityTests
		}
	}

	// Регрессионный анализ
	if pyResponse.RegressionAnalysis != nil {
		// Сохраняем весь RegressionAnalysisResponse, так как он содержит и модели, и переменные
		jsonData, err := marshaller.Marshal(pyResponse.RegressionAnalysis)
		if err != nil {
			log.Printf("Error marshalling RegressionAnalysis to JSON for run %d: %v", runID, err)
		} else {
			resultsToSave["regression_analysis"] = jsonData
		}
	}

	if len(resultsToSave) > 0 {
		err = s.analysisRepo.SaveAnalysisResults(ctx, runID, resultsToSave)
		if err != nil {
			log.Printf("Error saving analysis results data: %v", err)
			// Не возвращаем ошибку клиенту, если основной анализ прошел, но логируем
			// return nil, fmt.Errorf("failed to save analysis results data: %w", err)
		}
	}

	return pyResponse, nil
}

// GetFileColumns вызывает gRPC клиент для получения имен столбцов из файла.
func (s *analysisService) GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error) {
	log.Printf("Service: Getting columns for file: %s", fileName)

	// Предполагаем, что gRPC клиент имеет метод GetFileColumns или аналогичный.
	// Если его нет, его нужно будет добавить в .proto, сгенерировать код и реализовать на Python сервере.
	// В данном примере я предполагаю, что он существует и совпадает с интерфейсом AnalysisClient.
	columns, err := s.grpcClient.GetFileColumns(ctx, fileContent, fileName)
	if err != nil {
		log.Printf("Error getting columns from gRPC client: %v", err)
		return nil, err
	}

	log.Printf("Service: Successfully received columns: %v", columns)
	return columns, nil
}

// GetUserAnalysisHistory извлекает историю запусков анализа для пользователя из контекста.
func (s *analysisService) GetUserAnalysisHistory(ctx context.Context) ([]models.AnalysisRun, error) {
	log.Println("Service: Getting user analysis history")

	userIDRaw := ctx.Value(common.UserIDKey)
	if userIDRaw == nil {
		log.Println("Error: User ID not found in context for GetUserAnalysisHistory")
		return nil, fmt.Errorf("user ID not found in context, authentication required")
	}

	var userID int
	switch v := userIDRaw.(type) {
	case float64:
		userID = int(v)
	case int:
		userID = v
	case string:
		parsedID, err := strconv.Atoi(v)
		if err != nil {
			log.Printf("Error converting userID '%s' to int in GetUserAnalysisHistory: %v", v, err)
			return nil, fmt.Errorf("invalid user ID format in context")
		}
		userID = parsedID
	default:
		log.Printf("Error: User ID in context is of an unexpected type in GetUserAnalysisHistory: %T", v)
		return nil, fmt.Errorf("invalid user ID format in context")
	}

	if userID == 0 {
		log.Println("Error: User ID is invalid after type assertion/conversion in GetUserAnalysisHistory")
		return nil, fmt.Errorf("invalid user ID format in context (zero value)")
	}

	runs, err := s.analysisRepo.GetAnalysisRunsByUserID(ctx, userID)
	if err != nil {
		log.Printf("Error getting analysis runs from repository for user %d: %v", userID, err)
		// Оборачиваем ошибку, чтобы сохранить контекст, но не дублируем сообщение "failed to retrieve analysis history"
		return nil, fmt.Errorf("failed to get analysis runs for user %d from repository: %w", userID, err)
	}

	log.Printf("Service: Successfully retrieved %d analysis runs for user %d", len(runs), userID)
	return runs, nil
}

// GetAnalysisRunResults извлекает сохраненные JSON-результаты для конкретного запуска анализа.
func (s *analysisService) GetAnalysisRunResults(ctx context.Context, runID int64) (map[string]json.RawMessage, error) {
	log.Printf("Service: Getting results for analysis run ID %d", runID)

	// Проверка userID из контекста здесь не обязательна, если предполагается,
	// что доступ к этому методу уже защищен и runID принадлежит пользователю.
	// Однако, для большей безопасности можно было бы добавить проверку, что runID принадлежит текущему userID.
	// Пока что для простоты опустим эту проверку.
	
	// Получаем ID пользователя из контекста
	userIDRaw := ctx.Value(common.UserIDKey)
	if userIDRaw == nil {
		log.Println("Error: User ID not found in context for GetAnalysisRunResults")
		return nil, fmt.Errorf("user ID not found in context, authentication required")
	}

	var userID int
	switch v := userIDRaw.(type) {
	case float64:
		userID = int(v)
	case int:
		userID = v
	case string:
		parsedID, err := strconv.Atoi(v)
		if err != nil {
			log.Printf("Error converting userID '%s' to int in GetAnalysisRunResults: %v", v, err)
			return nil, fmt.Errorf("invalid user ID format in context")
		}
		userID = parsedID
	default:
		log.Printf("Error: User ID in context is of an unexpected type in GetAnalysisRunResults: %T", v)
		return nil, fmt.Errorf("invalid user ID format in context")
	}

	if userID == 0 {
		log.Println("Error: User ID is invalid after type assertion/conversion in GetAnalysisRunResults")
		return nil, fmt.Errorf("invalid user ID format in context (zero value)")
	}
	
	// Получаем информацию о запуске анализа, чтобы проверить принадлежность пользователю
	runs, err := s.analysisRepo.GetAnalysisRunsByUserID(ctx, userID)
	if err != nil {
		log.Printf("Error getting analysis runs from repository for user %d: %v", userID, err)
		return nil, fmt.Errorf("failed to verify access rights for analysis run %d: %w", runID, err)
	}
	
	// Проверяем, принадлежит ли запрошенный runID текущему пользователю
	var belongsToUser bool
	for _, run := range runs {
		if run.ID == runID {
			belongsToUser = true
			break
		}
	}
	
	if !belongsToUser {
		log.Printf("Warning: User %d attempted to access analysis run %d which does not belong to them", userID, runID)
		return nil, fmt.Errorf("access denied: analysis run %d does not belong to current user", runID)
	}

	resultsData, err := s.analysisRepo.GetAnalysisResultsByRunID(ctx, runID)
	if err != nil {
		log.Printf("Error getting analysis results data from repository for run ID %d: %v", runID, err)
		return nil, fmt.Errorf("failed to retrieve results for analysis run %d: %w", runID, err)
	}

	if len(resultsData) == 0 {
		log.Printf("Service: No results data found for analysis run ID %d", runID)
		// Можно вернуть пустую мапу или ошибку NotFound, в зависимости от желаемого поведения.
		// Возвращаем пустую мапу, чтобы фронтенд мог это обработать.
		return make(map[string]json.RawMessage), nil
	}

	resultsMap := make(map[string]json.RawMessage)
	for _, resultItem := range resultsData {
		resultsMap[resultItem.ResultType] = resultItem.Data // Data уже должно быть []byte (json.RawMessage)
	}

	log.Printf("Service: Successfully retrieved %d result types for analysis run ID %d", len(resultsMap), runID)
	return resultsMap, nil
}

// DeleteAnalysisRun удаляет запись о выполненном анализе и его результаты
func (s *analysisService) DeleteAnalysisRun(ctx context.Context, runID int64) error {
	log.Printf("Service: Deleting analysis run ID %d", runID)

	// Получаем ID пользователя из контекста
	userIDRaw := ctx.Value(common.UserIDKey)
	if userIDRaw == nil {
		log.Println("Error: Missing user ID in context")
		return fmt.Errorf("missing user ID in context")
	}

	// Преобразуем ID пользователя в число
	userID, err := strconv.Atoi(fmt.Sprint(userIDRaw))
	if err != nil {
		log.Printf("Error: Invalid user ID format: %v", err)
		return fmt.Errorf("invalid user ID format: %w", err)
	}

	// Получаем список анализов пользователя
	runs, err := s.analysisRepo.GetAnalysisRunsByUserID(ctx, userID)
	if err != nil {
		log.Printf("Error getting user's analysis runs: %v", err)
		return fmt.Errorf("failed to get user analysis runs: %w", err)
	}

	// Проверяем, принадлежит ли указанный runID текущему пользователю
	found := false
	for _, run := range runs {
		if run.ID == runID {
			found = true
			break
		}
	}

	if !found {
		log.Printf("Error: User %d attempted to delete analysis run %d which they don't own", userID, runID)
		return fmt.Errorf("access denied: analysis run #%d does not belong to current user", runID)
	}

	// Удаление результатов анализа
	err = s.analysisRepo.DeleteAnalysisResults(ctx, runID)
	if err != nil {
		log.Printf("Error deleting analysis results for run ID %d: %v", runID, err)
		return fmt.Errorf("failed to delete analysis results: %w", err)
	}

	// Удаление записи о запуске анализа
	err = s.analysisRepo.DeleteAnalysisRun(ctx, runID)
	if err != nil {
		log.Printf("Error deleting analysis run ID %d: %v", runID, err)
		return fmt.Errorf("failed to delete analysis run: %w", err)
	}

	log.Printf("Successfully deleted analysis run ID %d and its results", runID)
	return nil
}
