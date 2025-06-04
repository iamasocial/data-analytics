package models

import "encoding/json"

// AnalysisResultData хранит фактические JSON-результаты для части анализа.
type AnalysisResultData struct {
	ID            int64           `json:"id"`
	AnalysisRunID int64           `json:"analysis_run_id"`
	ResultType    string          `json:"result_type"` // e.g., "descriptive_stats", "regression_analysis"
	Data          json.RawMessage `json:"data"`        // Для хранения JSONB
}
