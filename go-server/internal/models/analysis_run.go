package models

import "time"

// AnalysisRun представляет метаданные о запуске анализа.
type AnalysisRun struct {
	ID                  int64     `json:"id"`
	UserID              int       `json:"user_id"`
	FileName            string    `json:"file_name"`
	RunAt               time.Time `json:"run_at"`
	SelectedAnalyses    []string  `json:"selected_analyses" db:"selected_analyses"` // Для pq для работы с TEXT[]
	DependentVariable   *string   `json:"dependent_variable,omitempty"`             // Указатель, чтобы было nullable
	IndependentVariable *string   `json:"independent_variable,omitempty"`           // Указатель, чтобы было nullable
}
