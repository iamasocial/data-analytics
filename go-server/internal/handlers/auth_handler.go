package handlers

import (
	"diploma/go-server/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthHandler обрабатывает HTTP запросы, связанные с аутентификацией.
type AuthHandler struct {
	authService services.AuthService
}

// NewAuthHandler создает новый экземпляр AuthHandler.
func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// RegisterRequest представляет тело запроса для регистрации.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"` // Пример: пароль мин. 8 символов
}

// LoginRequest представляет тело запроса для входа.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// ChangePasswordRequest представляет тело запроса для смены пароля.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// Register обрабатывает запрос на регистрацию нового пользователя.
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	user, err := h.authService.RegisterUser(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		// TODO: Различать типы ошибок (например, пользователь уже существует vs. внутренняя ошибка)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "user_id": user.ID, "email": user.Email})
}

// Login обрабатывает запрос на вход пользователя.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	token, user, err := h.authService.LoginUser(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		// TODO: Различать типы ошибок (например, пользователь не найден vs. неверный пароль vs. внутренняя ошибка)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()}) // Статус 401 для неудачной аутентификации
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "token": token, "user_id": user.ID, "email": user.Email})
}

// ChangePassword обрабатывает запрос на изменение пароля пользователя.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	err := h.authService.ChangePassword(c.Request.Context(), req.CurrentPassword, req.NewPassword)
	if err != nil {
		// Проверяем тип ошибки для возврата подходящего статуса ответа
		if err.Error() == "current password is incorrect" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		
		if err.Error() == "new password must be at least 8 characters long" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to change password: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// RegisterRoutes регистрирует маршруты аутентификации.
func (h *AuthHandler) RegisterRoutes(router *gin.Engine) {
	// Группа маршрутов для аутентификации, например /auth
	authRoutes := router.Group("/api/auth")
	{
		authRoutes.POST("/register", h.Register)
		authRoutes.POST("/login", h.Login)
	}
	// Можно добавить и другие маршруты, например, /refresh-token, /logout и т.д.
}
