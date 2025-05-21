package services

import (
	"context"
	"diploma/go-server/generated"        // Проверьте путь!
	"diploma/go-server/internal/adapter" // Путь к нашему адаптеру
	"fmt"
	"log"
)

// AnalysisService определяет интерфейс для сервиса анализа данных.
type AnalysisService interface {
	PerformAnalysis(ctx context.Context, fileContent []byte, fileName string, selectedAnalyses []string) (*generated.AnalyzeDataResponse, error)
	GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error)
}

// analysisServiceImpl реализует AnalysisService.
type analysisServiceImpl struct {
	grpcClient adapter.AnalysisClient // Зависимость от gRPC клиента
}

// NewAnalysisService создает новый экземпляр сервиса анализа.
func NewAnalysisService(client adapter.AnalysisClient) AnalysisService {
	if client == nil {
		// Можно добавить обработку, если клиент не предоставлен,
		// но в чистой архитектуре это обычно делается на уровне сборки приложения (в main).
		log.Println("Warning: AnalysisClient is nil in NewAnalysisService")
	}
	return &analysisServiceImpl{
		grpcClient: client,
	}
}

// PerformAnalysis выполняет анализ данных, делегируя вызов gRPC клиенту.
func (s *analysisServiceImpl) PerformAnalysis(ctx context.Context, fileContent []byte, fileName string, selectedAnalyses []string) (*generated.AnalyzeDataResponse, error) {
	log.Printf("Service: Performing analysis for file: %s, selected analyses: %v", fileName, selectedAnalyses)

	if s.grpcClient == nil {
		log.Println("Error: gRPC client is not initialized in AnalysisService")
		return nil, fmt.Errorf("internal server error: analysis client not available")
	}

	// Просто вызываем метод нашего gRPC клиента
	response, err := s.grpcClient.AnalyzeData(ctx, fileContent, fileName, selectedAnalyses)
	if err != nil {
		log.Printf("Service: Error calling gRPC client: %v", err)
		// Здесь можно добавить логику обработки специфических ошибок от gRPC, если нужно
		return nil, fmt.Errorf("failed to perform analysis: %w", err)
	}

	log.Printf("Service: Analysis completed successfully for file: %s", fileName)
	return response, nil
}

// GetFileColumns получает список столбцов из файла.
func (s *analysisServiceImpl) GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error) {
	log.Printf("Service: Getting columns for file: %s", fileName)

	if s.grpcClient == nil {
		log.Println("Error: gRPC client is not initialized in AnalysisService")
		return nil, fmt.Errorf("internal server error: analysis client not available")
	}

	// Вызываем метод нашего gRPC клиента для получения столбцов
	columns, err := s.grpcClient.GetFileColumns(ctx, fileContent, fileName)
	if err != nil {
		log.Printf("Service: Error getting columns from gRPC client: %v", err)
		return nil, fmt.Errorf("failed to get file columns: %w", err)
	}

	log.Printf("Service: Successfully got %d columns for file: %s", len(columns), fileName)
	return columns, nil
}
