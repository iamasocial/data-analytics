package middleware

import (
	"diploma/go-server/internal/services"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	authorizationHeader = "Authorization"
	userCtx             = "userId"
)

// AuthMiddleware creates a gin.HandlerFunc for JWT authentication.
func AuthMiddleware(jwtSecret string, authService services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader(authorizationHeader)
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
			userIDString, ok := claims["sub"].(string) // "sub" is typically used for subject (user ID)
			if !ok {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims: user ID not found or not a string"})
				return
			}
			// You might want to convert userIDString to an integer or appropriate type if needed.
			// For now, we'll store it as a string.
			c.Set(userCtx, userIDString)
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		c.Next()
	}
}

// GetUserIDFromContext retrieves the user ID from the Gin context.
// It should be called by handlers that are protected by AuthMiddleware.
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get(userCtx)
	if !exists {
		return "", false
	}
	userIDStr, ok := userID.(string)
	return userIDStr, ok
}
