package main

import (
	"context"
	"diploma/go-server/internal/adapter"  // Путь к адаптеру
	"diploma/go-server/internal/handlers" // Путь к хэндлеру
	"diploma/go-server/internal/server"   // Путь к нашему новому серверу
	"diploma/go-server/internal/services" // Путь к сервису
	"log"

	// "net/http" // Больше не нужен здесь напрямую
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors" // Для CORS
	"github.com/gin-gonic/gin"
)

const (
	defaultPythonServerAddress = "localhost:50051" // Адрес Python gRPC сервера по умолчанию
	defaultGoServerPort        = "8080"            // Порт Go HTTP сервера по умолчанию
	// ВАЖНО: Укажите правильный путь к директории сборки вашего React приложения
	// staticFilesPath = "./frontend/out"
)

func main() {
	log.Println("Starting Go application...")

	// --- Конфигурация ---
	pythonServerAddr := getEnv("PYTHON_SERVER_ADDR", defaultPythonServerAddress)
	goServerPort := getEnv("GO_SERVER_PORT", defaultGoServerPort)

	// --- Инициализация зависимостей ---
	_, cancel := context.WithCancel(context.Background()) // Контекст для отмены операций при завершении
	defer cancel()                                        // Вызовется при выходе из main

	// Создаем gRPC клиент
	analysisClient, err := adapter.NewGRPCAnalysisClient(pythonServerAddr)
	if err != nil {
		log.Fatalf("Failed to create gRPC client: %v", err)
	}
	// Отложенное закрытие соединения gRPC
	defer func() {
		log.Println("Closing gRPC client connection...")
		if err := analysisClient.Close(); err != nil {
			log.Printf("Error closing gRPC connection: %v", err)
		}
	}()

	// Создаем сервис
	analysisService := services.NewAnalysisService(analysisClient)

	// Создаем хэндлер
	analysisHandler := handlers.NewAnalysisHandler(analysisService)

	// --- Настройка HTTP сервера (Gin) ---
	router := gin.Default()

	// Middleware для CORS (разрешаем все для разработки)
	// В продакшене лучше указать конкретный origin фронтенда:
	// config.AllowOrigins = []string{"http://your-frontend-domain.com"}
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	// Регистрация маршрутов API
	analysisHandler.RegisterRoutes(router)

	// --- Отдача статических файлов React ---
	// Используем middleware static.Serve для отдачи файлов из staticFilesPath
	// 'true' означает, что LocalFile будет использовать os.Stat для проверки существования файла
	// router.Use(static.Serve("/", static.LocalFile(staticFilesPath, true)))

	// Обработчик NoRoute для поддержки React Router (Client-Side Routing)
	// Все запросы, не начинающиеся с /api (и не найденные как статические файлы),
	// будут перенаправлены на index.html
	// router.NoRoute(func(c *gin.Context) { ... })

	// --- Создание и Запуск HTTP Сервера ---
	serverAddr := ":" + goServerPort
	appServer := server.NewHTTPServer(serverAddr, router) // Используем наш новый сервер

	// Запускаем сервер и получаем канал ошибок
	serverErrChan := appServer.Start()

	log.Printf("Go application running. HTTP server (API only) listening on %s", serverAddr)
	// log.Printf("Serving static files from: %s", staticFilesPath)
	log.Printf("API endpoint available at POST /api/analyze")
	log.Printf("Connecting to Python gRPC server at %s", pythonServerAddr)

	// --- Грациозное завершение ---
	quit := make(chan os.Signal, 1)
	// Ожидаем сигналы прерывания (Ctrl+C) или завершения
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Блокируемся, пока не придет сигнал завершения или ошибка сервера
	select {
	case sig := <-quit:
		log.Printf("Received signal: %v. Shutting down...", sig)
	case err := <-serverErrChan:
		// Если сервер завершился с ошибкой до получения сигнала
		if err != nil {
			log.Fatalf("HTTP Server error: %v", err)
		} else {
			log.Println("HTTP Server stopped unexpectedly without error.")
		}
	}

	// Начинаем процесс остановки
	shutdownTimeout := 5 * time.Second
	if err := appServer.Shutdown(shutdownTimeout); err != nil { // Используем метод Shutdown нашего сервера
		log.Printf("Server shutdown failed: %v", err)
	} else {
		log.Println("Server exited gracefully.")
	}
}

// getEnv получает переменную окружения или возвращает значение по умолчанию.
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
