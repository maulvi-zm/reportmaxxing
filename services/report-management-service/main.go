package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"reportmaxxing/services/report-management-service/kafka"
	"reportmaxxing/services/report-management-service/models"
	"reportmaxxing/services/report-management-service/response"
	"reportmaxxing/services/report-management-service/services"
)

const MOCK_USER_ID = "mock-user-1"

func main() {
	dsn := "host=localhost user=gorm password=gorm dbname=gorm port=9920 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("failed to connect database")
	}

	if err := db.AutoMigrate(&models.User{}, &models.Report{}, &models.ReportUpdate{}); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	brokerURL := "localhost:9092"
	if url := os.Getenv("KAFKA_BROKER_URL"); url != "" {
		brokerURL = url
	}
	kafkaProducer := kafka.NewProducer(brokerURL)
	defer kafkaProducer.Close()

	reportService := services.NewReportService(db, kafkaProducer)

	r := gin.Default()

	api := r.Group("/api")
	{
		api.GET("/reports", func(c *gin.Context) {
			log.Println("GET /api/reports called")
			reports, err := reportService.GetAllReports()
			if err != nil {
				response.InternalError(c, "Failed to fetch reports")
				return
			}
			response.Success(c, reports)
		})

		api.GET("/reports/:id", func(c *gin.Context) {
			id := c.Param("id")
			report, err := reportService.GetReportByID(id)
			if err != nil {
				response.NotFound(c, "Report not found")
				return
			}
			response.Success(c, report)
		})

		api.POST("/reports", func(c *gin.Context) {
			var req models.CreateReportRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				response.BadRequest(c, err.Error())
				return
			}

			report, err := reportService.CreateReport(MOCK_USER_ID, req)
			if err != nil {
				response.InternalError(c, "Failed to create report")
				return
			}
			response.CreatedWithMessage(c, "Report created successfully", report)
		})

		api.PUT("/reports/:id/status", func(c *gin.Context) {
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

	r.Run()
}
