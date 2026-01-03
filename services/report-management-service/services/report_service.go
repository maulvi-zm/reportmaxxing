package services

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"reportmaxxing/services/report-management-service/kafka"
	"reportmaxxing/services/report-management-service/models"
)

const (
	StatusOpen       = models.ReportStatus("OPEN")
	StatusInProgress = models.ReportStatus("IN_PROGRESS")
	StatusResolved   = models.ReportStatus("RESOLVED")
)

type ReportService struct {
	db       *gorm.DB
	producer *kafka.Producer
}

func NewReportService(db *gorm.DB, producer *kafka.Producer) *ReportService {
	return &ReportService{db: db, producer: producer}
}

func (s *ReportService) GetAllReports() ([]models.Report, error) {
	var reports []models.Report
	err := s.db.Preload("Updates").
		Where("visibility != ?", models.VisibilityPrivate).
		Order("created_at DESC").
		Find(&reports).Error
	return reports, err
}

func (s *ReportService) GetReportByID(id string) (*models.Report, error) {
	var report models.Report
	err := s.db.Preload("Updates").
		Where("id = ?", id).
		First(&report).Error
	if err != nil {
		return nil, err
	}
	return &report, nil
}

func (s *ReportService) GetReportsByUserID(userID string) ([]models.Report, error) {
	var reports []models.Report
	err := s.db.Preload("Updates").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&reports).Error
	return reports, err
}

func (s *ReportService) CreateReport(userID string, req models.CreateReportRequest) (*models.Report, error) {
	reportID, err := s.generateReportID()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	report := models.Report{
		ID:          reportID,
		Title:       req.Title,
		Description: req.Description,
		Category:    models.ReportCategory(req.Category),
		Status:      StatusOpen,
		Visibility:  models.ReportVisibility(req.Visibility),
		ImageURL:    req.ImageURL,
		CreatedAt:   now,
		UpdatedAt:   now,
		UserID:      userID,
		Updates: []models.ReportUpdate{
			{
				ID:        uuid.New().String(),
				Title:     "Report Received",
				Date:      formatDateLabel(now),
				IsActive:  true,
				CreatedAt: now,
			},
			{
				ID:        uuid.New().String(),
				Title:     "In Review",
				Date:      "Pending",
				IsActive:  false,
				CreatedAt: now,
			},
			{
				ID:        uuid.New().String(),
				Title:     "Issue Resolved",
				Date:      "Pending",
				IsActive:  false,
				CreatedAt: now,
			},
		},
	}

	if err := s.db.Create(&report).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Updates").First(&report, "id = ?", report.ID)

	event := &models.ReportCreatedEvent{
		EventID:     uuid.New().String(),
		EventType:   models.EventTypeReportCreated,
		Timestamp:   time.Now(),
		ReportID:    report.ID,
		UserID:      userID,
		Title:       report.Title,
		Description: report.Description,
		Category:    string(report.Category),
		Status:      string(report.Status),
		Visibility:  string(report.Visibility),
	}

	if err := s.producer.PublishReportCreated(event); err != nil {
		log.Printf("Kafka publish failed (continuing): %v", err)
	}

	return &report, nil
}

func (s *ReportService) generateReportID() (string, error) {
	var count int64
	s.db.Model(&models.Report{}).Count(&count)
	seq := count + 1
	return fmt.Sprintf("R-2025-%03d", seq), nil
}

func formatDateLabel(t time.Time) string {
	return t.Format("Jan 02, 2006")
}

func (s *ReportService) UpdateReportStatus(reportID string, newStatus models.ReportStatus) (*models.Report, error) {
	var report models.Report
	if err := s.db.First(&report, "id = ?", reportID).Error; err != nil {
		return nil, err
	}

	oldStatus := report.Status

	report.Status = newStatus
	report.UpdatedAt = time.Now()
	if err := s.db.Save(&report).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Updates").First(&report, "id = ?", report.ID)

	event := &models.ReportStatusChangedEvent{
		EventID:   uuid.New().String(),
		EventType: models.EventTypeReportStatusChanged,
		Timestamp: time.Now(),
		ReportID:  report.ID,
		UserID:    report.UserID,
		OldStatus: string(oldStatus),
		NewStatus: string(newStatus),
	}

	if err := s.producer.PublishReportStatusChanged(event); err != nil {
		log.Printf("Kafka publish failed (continuing): %v", err)
	}

	return &report, nil
}
