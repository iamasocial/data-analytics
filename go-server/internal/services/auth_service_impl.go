package services

import (
	"context"
	"diploma/go-server/internal/models"
	"diploma/go-server/internal/repository"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5" // Импорт JWT
	"golang.org/x/crypto/bcrypt"   // Правильный импорт bcrypt
	// "github.com/golang-jwt/jwt/v5" // Будет добавлено позже для генерации токенов
)

// authService реализует AuthService.
type authService struct {
	userRepo     repository.UserRepository
	jwtSecretKey []byte        // Ключ для подписи JWT токенов
	tokenTTL     time.Duration // Время жизни токена
}

// NewAuthService создает новый экземпляр authService.
func NewAuthService(userRepo repository.UserRepository, jwtSecret string, tokenTTLMinutes int) AuthService {
	return &authService{
		userRepo:     userRepo,
		jwtSecretKey: []byte(jwtSecret),
		tokenTTL:     time.Duration(tokenTTLMinutes) * time.Minute,
	}
}

// RegisterUser регистрирует нового пользователя.
func (s *authService) RegisterUser(ctx context.Context, email string, password string) (*models.User, error) {
	if email == "" || password == "" {
		return nil, fmt.Errorf("email and password cannot be empty") // Или более специфичная ошибка
	}

	// Проверка, существует ли пользователь с таким email
	existingUser, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("error checking for existing user: %w", err)
	}
	if existingUser != nil {
		return nil, fmt.Errorf("user with email '%s' already exists", email) // Ошибка, если пользователь уже есть
	}

	// Хэширование пароля
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user in repository: %w", err)
	}

	// Возвращаем пользователя без хэша пароля (или только ID и email)
	// Для безопасности лучше не возвращать PasswordHash клиенту после регистрации
	user.PasswordHash = ""
	return user, nil
}

// LoginUser аутентифицирует пользователя и возвращает JWT токен.
func (s *authService) LoginUser(ctx context.Context, email string, password string) (string, *models.User, error) {
	if email == "" || password == "" {
		return "", nil, fmt.Errorf("email and password cannot be empty")
	}

	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", nil, fmt.Errorf("error getting user by email: %w", err)
	}
	if user == nil {
		return "", nil, fmt.Errorf("user with email '%s' not found", email) // Используем fmt.Errorf для единообразия
	}

	// Сравнение предоставленного пароля с хэшем в базе данных
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		// Если ошибка bcrypt.ErrMismatchedHashAndPassword, то пароль неверный
		// В других случаях - другая ошибка bcrypt
		return "", nil, fmt.Errorf("invalid password: %w", err)
	}

	// Генерация JWT токена
	expirationTime := time.Now().Add(s.tokenTTL)
	claims := &jwt.RegisteredClaims{
		Subject:   fmt.Sprint(user.ID), // Используем ID пользователя как Subject
		ExpiresAt: jwt.NewNumericDate(expirationTime),
		Issuer:    "diploma-app", // Название вашего приложения (можно вынести в конфиг)
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecretKey)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Для безопасности очистим хэш пароля перед возвратом пользователя
	user.PasswordHash = ""

	return tokenString, user, nil
}
