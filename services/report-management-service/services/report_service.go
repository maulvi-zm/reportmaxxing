package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"reportmaxxing/services/report-management-service/models"
)

const (
	StatusOpen       = models.ReportStatus("OPEN")
	StatusInProgress = models.ReportStatus("IN_PROGRESS")
	StatusResolved   = models.ReportStatus("RESOLVED")
)

type ReportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
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

	s.db.Preload("Updates").First(&report, report.ID)
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
