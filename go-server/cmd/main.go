package main

import (
	"context"
	"diploma/go-server/internal/adapter"    // Путь к адаптеру
	"diploma/go-server/internal/database"   // <--- Добавлен импорт БД
	"diploma/go-server/internal/handlers"   // Путь к хэндлеру
	"diploma/go-server/internal/middleware" // <--- Добавлен импорт middleware
	"diploma/go-server/internal/repository" // <--- Добавлен импорт репозитория
	"diploma/go-server/internal/server"     // Путь к нашему новому серверу
	"diploma/go-server/internal/services"   // Путь к сервису
	"log"

	// "net/http" // Больше не нужен здесь напрямую
	"os"
	"os/signal"
	"strconv" // <--- Добавлен импорт для преобразования строки в число
	"syscall"
	"time"

	"github.com/gin-contrib/cors" // Для CORS
	"github.com/gin-gonic/gin"
)

const (
	defaultPythonServerAddress = "localhost:9000"                             // Адрес Python gRPC сервера по умолчанию (изменено с 50051 на 9000)
	defaultGoServerPort        = "8080"                                       // Порт Go HTTP сервера по умолчанию
	defaultJWTSecret           = "your-super-secret-jwt-key-please-change-it" // Секретный ключ JWT по умолчанию
	defaultJWTTokenTTLMinutes  = "60"                                         // Время жизни JWT токена в минутах по умолчанию

	// ВАЖНО: Укажите правильный путь к директории сборки вашего React приложения
	// staticFilesPath = "./frontend/out"
)

func main() {
	log.Println("Starting Go application...")

	// --- Подключение к базе данных ---
	db, errDb := database.ConnectDB()
	if errDb != nil {
		log.Fatalf("Failed to connect to database: %v", errDb)
	}
	defer func() {
		log.Println("Closing database connection...")
		if errClose := db.Close(); errClose != nil {
			log.Printf("Error closing database connection: %v", errClose)
		}
	}()

	// --- Конфигурация ---
	pythonServerAddr := getEnv("PYTHON_SERVER_ADDR", defaultPythonServerAddress)
	goServerPort := getEnv("GO_SERVER_PORT", defaultGoServerPort)
	jwtSecret := getEnv("JWT_SECRET_KEY", defaultJWTSecret)
	jtwTokenTTLStr := getEnv("JWT_TOKEN_TTL_MINUTES", defaultJWTTokenTTLMinutes)

	jwtTokenTTLMinutes, err := strconv.Atoi(jtwTokenTTLStr)
	if err != nil {
		log.Printf("Invalid JWT_TOKEN_TTL_MINUTES value: %s. Using default value: %s minutes", jtwTokenTTLStr, defaultJWTTokenTTLMinutes)
		jwtTokenTTLMinutes, _ = strconv.Atoi(defaultJWTTokenTTLMinutes) // Используем значение по умолчанию
	}

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

	// --- Инициализация репозитория анализа ---
	analysisRepository := repository.NewPostgresAnalysisRepository(db)                 // <--- Инициализация репозитория анализа
	analysisService := services.NewAnalysisService(analysisClient, analysisRepository) // <--- Новая инициализация с репозиторием

	// Создаем хэндлер
	analysisHandler := handlers.NewAnalysisHandler(analysisService)

	// --- Инициализация репозитория пользователя ---
	userRepository := repository.NewPostgresUserRepository(db)

	// --- Инициализация сервиса аутентификации ---
	authService := services.NewAuthService(userRepository, jwtSecret, jwtTokenTTLMinutes)

	// --- Инициализация хэндлера аутентификации ---
	authHandler := handlers.NewAuthHandler(authService)

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
	// analysisHandler.RegisterRoutes(router) // <--- Старая регистрация
	authHandler.RegisterRoutes(router) // <--- Регистрация маршрутов аутентификации

	// --- Защищенные маршруты API ---
	apiProtected := router.Group("/api")
	apiProtected.Use(middleware.AuthMiddleware(jwtSecret, authService)) // <--- Применяем middleware
	{
		// Маршруты, требующие аутентификации
		// Вместо analysisHandler.RegisterRoutes(router) делаем так:
		apiProtected.POST("/analyze", analysisHandler.HandleAnalyzeData)                                  // Используем метод хендлера напрямую
		apiProtected.POST("/columns", analysisHandler.HandleGetColumns)                                   // Используем метод хендлера напрямую
		apiProtected.GET("/analyses/history", analysisHandler.HandleGetUserAnalysisHistory)               // Новый маршрут
		apiProtected.GET("/analyses/history/:runId/results", analysisHandler.HandleGetAnalysisRunResults) // Новый маршрут для деталей
		apiProtected.DELETE("/analyses/history/:runId", analysisHandler.HandleDeleteAnalysisRun)          // Маршрут для удаления
		apiProtected.POST("/user/change-password", authHandler.ChangePassword)                            // Маршрут для смены пароля
	}

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
	log.Printf("Protected API endpoints available at POST /api/analyze and POST /api/columns") // <--- Новое сообщение
	log.Printf("Auth endpoints available at POST /api/auth/register and POST /api/auth/login") // <--- Добавлено сообщение о маршрутах аутентификации
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
