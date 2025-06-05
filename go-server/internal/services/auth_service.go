package services

import (
	"context"
	"diploma/go-server/internal/models"
)

// AuthService определяет интерфейс для операций аутентификации.
type AuthService interface {
	RegisterUser(ctx context.Context, email string, password string) (*models.User, error)
	LoginUser(ctx context.Context, email string, password string) (string, *models.User, error) // Возвращает токен и пользователя
	ChangePassword(ctx context.Context, currentPassword string, newPassword string) error // Изменение пароля пользователя
}
