package models

type CreateReportRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description" binding:"required"`
	Category    string `json:"category" binding:"required"`
	Visibility  string `json:"visibility" binding:"required"`
}
