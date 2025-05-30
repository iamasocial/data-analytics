package repository

import (
	"context"
	"diploma/go-server/internal/models"
)

// UserRepository определяет интерфейс для взаимодействия с хранилищем пользователей.
type UserRepository interface {
	// Create создает нового пользователя в хранилище.
	// Пароль должен быть уже хеширован перед передачей в этот метод.
	Create(ctx context.Context, user *models.User) error

	// GetByEmail находит пользователя по его адресу электронной почты.
	// Возвращает nil, nil, если пользователь не найден, без ошибки.
	// Возвращает ошибку, если произошла проблема с базой данных.
	GetByEmail(ctx context.Context, email string) (*models.User, error)

	// GetByID находит пользователя по его ID.
	// Возвращает nil, nil, если пользователь не найден, без ошибки.
	// Возвращает ошибку, если произошла проблема с базой данных.
	// GetByID(ctx context.Context, id int64) (*models.User, error) // Закомментировано, добавим при необходимости
}
