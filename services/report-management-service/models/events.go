package models

import "time"

type ReportCreatedEvent struct {
	EventID     string    `json:"event_id"`
	EventType   string    `json:"event_type"`
	Timestamp   time.Time `json:"timestamp"`
	ReportID    string    `json:"report_id"`
	UserID      string    `json:"user_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Status      string    `json:"status"`
	Visibility  string    `json:"visibility"`
}

type ReportStatusChangedEvent struct {
	EventID   string    `json:"event_id"`
	EventType string    `json:"event_type"`
	Timestamp time.Time `json:"timestamp"`
	ReportID  string    `json:"report_id"`
	UserID    string    `json:"user_id"`
	OldStatus string    `json:"old_status"`
	NewStatus string    `json:"new_status"`
}

const (
	EventTypeReportCreated       = "reports.created"
	EventTypeReportStatusChanged = "reports.status-changed"
)
