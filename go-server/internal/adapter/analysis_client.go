package adapter

import (
	"context"
	"diploma/go-server/generated" // Путь к сгенерированному коду (проверьте!)
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure" // Для небезопасного соединения (для разработки)
)

// AnalysisClient определяет интерфейс для клиента сервиса анализа.
type AnalysisClient interface {
	AnalyzeData(ctx context.Context, fileContent []byte, fileName string, selectedAnalyses []string) (*generated.AnalyzeDataResponse, error)
	GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error)
	Close() error // Метод для закрытия соединения
}

// grpcAnalysisClient реализует AnalysisClient с использованием gRPC.
type grpcAnalysisClient struct {
	conn   *grpc.ClientConn
	client generated.AnalysisServiceClient
}

// NewGRPCAnalysisClient создает новый экземпляр gRPC клиента для сервиса анализа.
// targetAddr - адрес Python сервера (например, "localhost:9000").
func NewGRPCAnalysisClient(targetAddr string) (AnalysisClient, error) {
	log.Printf("Attempting to connect to gRPC server at %s", targetAddr)

	// Устанавливаем соединение с gRPC сервером
	// Используем insecure credentials, так как пока нет TLS
	conn, err := grpc.Dial(targetAddr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithBlock())
	if err != nil {
		log.Printf("Failed to connect to gRPC server: %v", err)
		return nil, fmt.Errorf("failed to connect to gRPC server at %s: %w", targetAddr, err)
	}
	log.Printf("Successfully connected to gRPC server at %s", targetAddr)

	// Создаем gRPC клиент на основе соединения
	client := generated.NewAnalysisServiceClient(conn)

	return &grpcAnalysisClient{
		conn:   conn,
		client: client,
	}, nil
}

// AnalyzeData отправляет запрос на анализ данных Python серверу.
func (c *grpcAnalysisClient) AnalyzeData(ctx context.Context, fileContent []byte, fileName string, selectedAnalyses []string) (*generated.AnalyzeDataResponse, error) {
	log.Printf("Sending AnalyzeData request for file: %s, selected analyses: %v", fileName, selectedAnalyses)

	// Создаем запрос с использованием сгенерированных структур
	request := &generated.AnalysisRequest{
		FileContent:      fileContent,
		FileName:         fileName,
		SelectedAnalyses: selectedAnalyses,
	}

	// Устанавливаем таймаут для запроса (например, 30 секунд)
	reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Вызываем удаленный метод
	response, err := c.client.AnalyzeData(reqCtx, request)
	if err != nil {
		log.Printf("gRPC AnalyzeData call failed: %v", err)
		return nil, fmt.Errorf("gRPC call to AnalyzeData failed: %w", err)
	}

	log.Printf("Received AnalyzeData response for file: %s", fileName)
	return response, nil
}

// GetFileColumns получает список столбцов из файла через Python сервис.
func (c *grpcAnalysisClient) GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error) {
	log.Printf("Getting columns for file: %s", fileName)

	// Создаем запрос на анализ, но с особым флагом или специальным списком анализов
	request := &generated.AnalysisRequest{
		FileContent:      fileContent,
		FileName:         fileName,
		SelectedAnalyses: []string{"get_columns"}, // Специальный маркер для получения только столбцов
	}

	// Устанавливаем таймаут для запроса (короткий, т.к. это простая операция)
	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Вызываем тот же метод AnalyzeData, но с особым маркером
	response, err := c.client.AnalyzeData(reqCtx, request)
	if err != nil {
		log.Printf("gRPC GetFileColumns call failed: %v", err)
		return nil, fmt.Errorf("gRPC call to GetFileColumns failed: %w", err)
	}

	// Извлекаем столбцы из логов или специального поля response
	// В этом примере предполагаем, что они находятся в первых строках логов в формате "COLUMNS: column1,column2,..."
	columns := []string{}

	// Перебираем логи и ищем строки, начинающиеся с маркера "COLUMNS:"
	for _, logLine := range response.ProcessingLog {
		if len(logLine) > 8 && logLine[:8] == "COLUMNS:" {
			// Parse the column names from the log line
			columnsPart := logLine[8:] // Skip "COLUMNS:"

			// Split the columns by comma and add to our result
			// Note: This implementation assumes columns are comma-separated
			// You might need a more robust parsing depending on your format
			columnNames := parseCSVList(columnsPart) // Implement this helper function
			columns = append(columns, columnNames...)
		}
	}

	log.Printf("Found %d columns in file: %s", len(columns), fileName)
	return columns, nil
}

// Helper function to parse a comma-separated string into a slice of strings
func parseCSVList(csvString string) []string {
	var result []string
	var current string
	var inQuotes bool

	// Simple CSV parser that handles quoted values
	for _, char := range csvString {
		switch char {
		case ',':
			if !inQuotes {
				result = append(result, current)
				current = ""
			} else {
				current += string(char)
			}
		case '"':
			inQuotes = !inQuotes
		case ' ', '\t', '\n', '\r':
			// Skip leading/trailing whitespace
			if current != "" || inQuotes {
				current += string(char)
			}
		default:
			current += string(char)
		}
	}

	// Add the last field if not empty
	if current != "" {
		result = append(result, current)
	}

	return result
}

// Close закрывает gRPC соединение.
func (c *grpcAnalysisClient) Close() error {
	if c.conn != nil { // Исправлено: проверка conn на nil
		log.Println("Closing gRPC connection")
		return c.conn.Close()
	}
	return nil
}
