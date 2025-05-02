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
	AnalyzeData(ctx context.Context, fileContent []byte, fileName string) (*generated.AnalysisResponse, error)
	Close() error // Метод для закрытия соединения
}

// grpcAnalysisClient реализует AnalysisClient с использованием gRPC.
type grpcAnalysisClient struct {
	conn   *grpc.ClientConn
	client generated.AnalysisServiceClient
}

// NewGRPCAnalysisClient создает новый экземпляр gRPC клиента для сервиса анализа.
// targetAddr - адрес Python сервера (например, "localhost:50051").
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
func (c *grpcAnalysisClient) AnalyzeData(ctx context.Context, fileContent []byte, fileName string) (*generated.AnalysisResponse, error) {
	log.Printf("Sending AnalyzeData request for file: %s", fileName)

	// Создаем запрос с использованием сгенерированных структур
	request := &generated.AnalysisRequest{
		FileContent: fileContent,
		FileName:    fileName,
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

// Close закрывает gRPC соединение.
func (c *grpcAnalysisClient) Close() error {
	if c.conn != nil { // Исправлено: проверка conn на nil
		log.Println("Closing gRPC connection")
		return c.conn.Close()
	}
	return nil
}
