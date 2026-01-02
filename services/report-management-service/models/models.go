package models

import (
	"time"
)

type ReportCategory string
type ReportStatus string
type ReportVisibility string

const (
	CategoryCrime      ReportCategory = "CRIME"
	CategorySanitation ReportCategory = "SANITATION"
	CategoryHealth     ReportCategory = "HEALTH"

	StatusOpen       ReportStatus = "OPEN"
	StatusInProgress ReportStatus = "IN_PROGRESS"
	StatusResolved   ReportStatus = "RESOLVED"

	VisibilityPublic    ReportVisibility = "PUBLIC"
	VisibilityPrivate   ReportVisibility = "PRIVATE"
	VisibilityAnonymous ReportVisibility = "ANONYMOUS"
)

type User struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Email     string    `gorm:"uniqueIndex;type:varchar(255);not null" json:"email"`
	Name      string    `gorm:"type:varchar(255)" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Report struct {
	ID          string           `gorm:"primaryKey;type:varchar(20)" json:"id"`
	Title       string           `gorm:"type:varchar(255);not null" json:"title"`
	Description string           `gorm:"type:text;not null" json:"description"`
	Category    ReportCategory   `gorm:"type:varchar(50);not null" json:"category"`
	Status      ReportStatus     `gorm:"type:varchar(50);not null;default:OPEN" json:"status"`
	Visibility  ReportVisibility `gorm:"type:varchar(50);not null;default:PUBLIC" json:"visibility"`
	ImageURL    string           `gorm:"type:text" json:"image_url,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`

	UserID  string         `gorm:"type:varchar(36);index" json:"user_id"`
	Updates []ReportUpdate `gorm:"foreignKey:ReportID" json:"updates,omitempty"`
}

type ReportUpdate struct {
	ID        string    `gorm:"primaryKey;type:varchar(36)" json:"id"`
	ReportID  string    `gorm:"type:varchar(20);index" json:"report_id"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Date      string    `gorm:"type:varchar(100)" json:"date"`
	IsActive  bool      `gorm:"default:false" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`

	Report *Report `gorm:"foreignKey:ReportID" json:"report,omitempty"`
}
