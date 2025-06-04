package middleware

import (
	"context"
	"diploma/go-server/internal/common"
	"diploma/go-server/internal/services"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	AuthorizationHeader = "Authorization"
)

// AuthMiddleware creates a gin.HandlerFunc for JWT authentication.
func AuthMiddleware(jwtSecret string, authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader(AuthorizationHeader)
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Empty auth header"})
			return
		}

		headerParts := strings.Split(header, " ")
		if len(headerParts) != 2 || headerParts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid auth header format"})
			return
		}

		if len(headerParts[1]) == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token is empty"})
			return
		}

		tokenString := headerParts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token: " + err.Error()})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userIDString, ok := claims["sub"].(string)
			if !ok {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims: user ID not found or not a string"})
				return
			}
			// Устанавливаем значение в стандартный контекст запроса
			ctxWithUser := context.WithValue(c.Request.Context(), common.UserIDKey, userIDString)
			c.Request = c.Request.WithContext(ctxWithUser)
			// Также можно продублировать в gin.Context.Keys для прямого доступа через c.Get(), если потребуется где-то еще
			c.Set(string(common.UserIDKey), userIDString)
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		c.Next()
	}
}

// GetUserIDFromContext retrieves the user ID from the Gin context.
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	// Пример получения из стандартного контекста, если он был установлен
	userIDFromStdCtx := c.Request.Context().Value(common.UserIDKey)
	if userIDFromStdCtx == nil {
		return "", false
	}
	userIDStr, ok := userIDFromStdCtx.(string)
	return userIDStr, ok
}
