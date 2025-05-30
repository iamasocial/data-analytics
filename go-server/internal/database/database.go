package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// DB является глобальной переменной для хранения экземпляра базы данных,
// или вы можете передавать его через зависимости.
// var DB *sql.DB

// Config хранит параметры конфигурации базы данных.
// Мы будем читать их из переменных окружения.
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// ConnectDB инициализирует соединение с базой данных PostgreSQL
// и возвращает экземпляр *sql.DB.
func ConnectDB() (*sql.DB, error) {
	cfg := Config{
		Host:     getEnv("DB_HOST", "localhost"), // localhost, если запускаем локально без Docker Compose для Go-сервера, или имя сервиса БД из Docker Compose
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "appuser"),         // Должно совпадать с POSTGRES_USER в docker-compose.yml
		Password: getEnv("DB_PASSWORD", "apppassword"), // Должно совпадать с POSTGRES_PASSWORD в docker-compose.yml
		DBName:   getEnv("DB_NAME", "analysis_app_db"), // Должно совпадать с POSTGRES_DB в docker-compose.yml
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s "+
		"password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	err = db.Ping()
	if err != nil {
		db.Close() // Закрываем соединение, если пинг не прошел
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	fmt.Println("Successfully connected to the database!")
	// DB = db // Если вы решили использовать глобальную переменную
	return db, nil
}

// getEnv получает значение переменной окружения или возвращает значение по умолчанию.
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
