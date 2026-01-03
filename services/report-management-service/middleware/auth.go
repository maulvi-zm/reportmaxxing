package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"reportmaxxing/services/report-management-service/models"
)

type KeycloakClaims struct {
	jwt.RegisteredClaims
	Email             string `json:"email"`
	PreferredUsername string `json:"preferred_username"`
	Name              string `json:"name"`
	RealmAccess       struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
}

type AuthMiddleware struct {
	jwks keyfunc.Keyfunc
	db   *gorm.DB
}

func NewAuthMiddleware(keycloakURL, realm string, db *gorm.DB) (*AuthMiddleware, error) {
	jwksURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", keycloakURL, realm)

	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("failed to create keyfunc: %w", err)
	}

	return &AuthMiddleware{jwks: k, db: db}, nil
}

func (a *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.ParseWithClaims(tokenString, &KeycloakClaims{}, a.jwks.Keyfunc)
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		claims := token.Claims.(*KeycloakClaims)

		user, err := a.syncUser(claims)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync user"})
			return
		}

		c.Set("userID", user.ID)
		c.Set("email", claims.Email)
		c.Set("name", claims.Name)
		c.Set("roles", claims.RealmAccess.Roles)
		c.Next()
	}
}

func (a *AuthMiddleware) syncUser(claims *KeycloakClaims) (*models.User, error) {
	var user models.User

	// Try to find existing user
	result := a.db.Where("id = ?", claims.Subject).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create new user
			user = models.User{
				ID:    claims.Subject,
				Email: claims.Email,
				Name:  claims.Name,
			}
			if err := a.db.Create(&user).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, result.Error
		}
	} else {
		// Update existing user if email or name changed
		if user.Email != claims.Email || user.Name != claims.Name {
			a.db.Model(&user).Updates(map[string]interface{}{
				"email": claims.Email,
				"name":  claims.Name,
			})
		}
	}

	return &user, nil
}

func (a *AuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoles, exists := c.Get("roles")
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "No roles found"})
			return
		}

		for _, userRole := range userRoles.([]string) {
			for _, requiredRole := range roles {
				if userRole == requiredRole {
					c.Next()
					return
				}
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
	}
}

func HasRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}
