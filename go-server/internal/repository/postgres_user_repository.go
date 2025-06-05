package repository

import (
	"context"
	"database/sql"
	"diploma/go-server/internal/models" // Убедитесь, что путь к моделям корректен
	"errors"
	"fmt"
	"time"

	_ "github.com/lib/pq" // Драйвер PostgreSQL
)

// postgresUserRepository реализует UserRepository для PostgreSQL.
type postgresUserRepository struct {
	db *sql.DB
}

// NewPostgresUserRepository создает новый экземпляр postgresUserRepository.
func NewPostgresUserRepository(db *sql.DB) UserRepository { // Возвращаем интерфейс
	return &postgresUserRepository{db: db}
}

// Create создает нового пользователя в базе данных.
func (r *postgresUserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`
	now := time.Now()
	user.CreatedAt = now // Устанавливаем время создания перед вставкой
	user.UpdatedAt = now // Устанавливаем время обновления перед вставкой

	err := r.db.QueryRowContext(ctx, query, user.Email, user.PasswordHash, user.CreatedAt, user.UpdatedAt).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		// Здесь можно добавить проверку на специфические ошибки PostgreSQL,
		// например, нарушение уникальности email (драйвер lib/pq возвращает объект pq.Error).
		// import "github.com/lib/pq"
		// if pgErr, ok := err.(*pq.Error); ok {
		// 	if pgErr.Code == "23505" { // unique_violation
		// 		return fmt.Errorf("user with email %s already exists: %w", user.Email, err) // Или специальный тип ошибки
		// 	}
		// }
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByEmail извлекает пользователя из базы данных по его email.
func (r *postgresUserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	user := &models.User{}

	err := r.db.QueryRowContext(ctx, query, email).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Пользователь не найден - это не ошибка для этого метода, возвращаем nil, nil
			return nil, nil
		}
		// Другая ошибка при запросе к БД
		return nil, fmt.Errorf("failed to get user by email %s: %w", email, err)
	}
	return user, nil
}

// GetByID извлекает пользователя из базы данных по его ID.
func (r *postgresUserRepository) GetByID(ctx context.Context, id int) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	user := &models.User{}

	err := r.db.QueryRowContext(ctx, query, id).
		Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Пользователь не найден, возвращаем nil, nil
		}
		return nil, fmt.Errorf("failed to get user by id %d: %w", id, err)
	}
	return user, nil
}

// Update обновляет информацию о пользователе в базе данных.
func (r *postgresUserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users 
		SET email = $1, password_hash = $2, updated_at = $3
		WHERE id = $4
	`
	user.UpdatedAt = time.Now() // Обновляем время изменения

	result, err := r.db.ExecContext(ctx, query, user.Email, user.PasswordHash, user.UpdatedAt, user.ID)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	// Проверяем, был ли изменен хотя бы один пользователь
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user with ID %d not found", user.ID)
	}

	return nil
}
