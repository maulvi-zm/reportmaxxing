package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"reportmaxxing/services/report-management-service/kafka"
	"reportmaxxing/services/report-management-service/middleware"
	"reportmaxxing/services/report-management-service/models"
	"reportmaxxing/services/report-management-service/response"
	"reportmaxxing/services/report-management-service/services"
)

func main() {
	dsn := "host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("failed to connect database")
	}

	if err := db.AutoMigrate(&models.User{}, &models.Report{}, &models.ReportUpdate{}); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	brokerURL := getEnv("KAFKA_BROKER_URL", "localhost:9092")
	kafkaProducer := kafka.NewProducer(brokerURL)
	defer kafkaProducer.Close()

	keycloakURL := getEnv("KEYCLOAK_URL", "http://localhost:8080")
	keycloakRealm := getEnv("KEYCLOAK_REALM", "reportmaxxing")

	authMiddleware, err := middleware.NewAuthMiddleware(keycloakURL, keycloakRealm, db)
	if err != nil {
		log.Fatalf("failed to initialize auth middleware: %v", err)
	}

	reportService := services.NewReportService(db, kafkaProducer)
	s3Service, err := services.NewS3ServiceFromEnv()
	if err != nil {
		log.Fatalf("failed to initialize s3 service: %v", err)
	}

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	api.Use(authMiddleware.Authenticate())
	{
		// Profile endpoint - returns current user info with report stats
		api.GET("/profile", func(c *gin.Context) {
			userID := c.GetString("userID")
			email := c.GetString("email")
			name := c.GetString("name")
			roles := c.MustGet("roles").([]string)

			// Get report counts for user
			var openCount, resolvedCount int64
			db.Model(&models.Report{}).Where("user_id = ? AND status IN ?", userID, []string{"OPEN", "IN_PROGRESS"}).Count(&openCount)
			db.Model(&models.Report{}).Where("user_id = ? AND status = ?", userID, "RESOLVED").Count(&resolvedCount)

			// Determine primary role for display
			primaryRole := "CITIZEN"
			if middleware.HasRole(roles, "DEPARTMENT_STAFF") {
				primaryRole = "DEPARTMENT_STAFF"
			}

			response.Success(c, gin.H{
				"id":               userID,
				"email":            email,
				"name":             name,
				"role":             primaryRole,
				"roles":            roles,
				"open_reports":     openCount,
				"resolved_reports": resolvedCount,
			})
		})

		api.GET("/reports", func(c *gin.Context) {
			userID := c.GetString("userID")
			roles := c.MustGet("roles").([]string)

			var reports []models.Report
			var err error

			if middleware.HasRole(roles, "DEPARTMENT_STAFF") {
				reports, err = reportService.GetAllReports()
			} else {
				reports, err = reportService.GetReportsByUserID(userID)
			}

			if err != nil {
				response.InternalError(c, "Failed to fetch reports")
				return
			}
			response.Success(c, reports)
		})

		api.GET("/reports/:id", func(c *gin.Context) {
			id := c.Param("id")
			userID := c.GetString("userID")
			roles := c.MustGet("roles").([]string)

			report, err := reportService.GetReportByID(id)
			if err != nil {
				response.NotFound(c, "Report not found")
				return
			}

			if !middleware.HasRole(roles, "DEPARTMENT_STAFF") && report.UserID != userID {
				response.Forbidden(c, "Access denied")
				return
			}

			response.Success(c, report)
		})

		api.POST("/reports", authMiddleware.RequireRole("CITIZEN"), func(c *gin.Context) {
			var req models.CreateReportRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				response.BadRequest(c, err.Error())
				return
			}

			userID := c.GetString("userID")
			report, err := reportService.CreateReport(userID, req)
			if err != nil {
				response.InternalError(c, "Failed to create report")
				return
			}
			response.CreatedWithMessage(c, "Report created successfully", report)
		})

		api.POST("/reports/upload-url", authMiddleware.RequireRole("CITIZEN"), func(c *gin.Context) {
			var req struct {
				FileName    string `json:"file_name" binding:"required"`
				ContentType string `json:"content_type" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				response.BadRequest(c, err.Error())
				return
			}

			userID := c.GetString("userID")
			uploadURL, imageURL, objectKey, err := s3Service.GenerateUploadURL(
				c.Request.Context(),
				userID,
				req.FileName,
				req.ContentType,
			)
			if err != nil {
				response.InternalError(c, "Failed to create upload URL")
				return
			}

			response.Success(c, gin.H{
				"upload_url": uploadURL,
				"image_url":  imageURL,
				"object_key": objectKey,
			})
		})

		api.PUT("/reports/:id/status", authMiddleware.RequireRole("DEPARTMENT_STAFF"), func(c *gin.Context) {
			id := c.Param("id")

			var req struct {
				Status string `json:"status" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				response.BadRequest(c, err.Error())
				return
			}

			report, err := reportService.UpdateReportStatus(id, models.ReportStatus(req.Status))
			if err != nil {
				response.NotFound(c, "Report not found")
				return
			}
			response.Success(c, report)
		})
	}

	port := getEnv("PORT", "8081")
	r.Run(":" + port)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
