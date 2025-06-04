package services

import (
	"context"
	"diploma/go-server/generated"
	"diploma/go-server/internal/models"
	"encoding/json"
)

// AnalysisService defines the interface for analysis operations.
// It orchestrates calls to the Python gRPC service and handles data persistence.
type AnalysisService interface {
	PerformAnalysis(ctx context.Context, fileName string, fileContent []byte, selectedAnalyses []string, dependentVariable string, independentVariable string) (*generated.AnalyzeDataResponse, error)
	GetFileColumns(ctx context.Context, fileContent []byte, fileName string) ([]string, error)
	GetUserAnalysisHistory(ctx context.Context) ([]models.AnalysisRun, error)
	GetAnalysisRunResults(ctx context.Context, runID int64) (map[string]json.RawMessage, error)
	// TODO: Add methods for retrieving past analysis results for a user
}
