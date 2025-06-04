package repository

import (
	"context"
	"database/sql"
	"diploma/go-server/internal/models"
	"fmt"

	"github.com/lib/pq" // Для работы с массивами PostgreSQL (TEXT[])
)

// AnalysisRepository определяет интерфейс для взаимодействия с хранилищем результатов анализа.
type AnalysisRepository interface {
	// SaveAnalysisRun сохраняет метаданные запуска анализа и возвращает его ID.
	SaveAnalysisRun(ctx context.Context, userID int, fileName string, selectedAnalyses []string, dependentVariable string, independentVariable string) (int64, error)
	// SaveAnalysisResults сохраняет JSON-результаты различных этапов анализа.
	SaveAnalysisResults(ctx context.Context, analysisRunID int64, results map[string]interface{}) error
	// GetAnalysisRunsByUserID извлекает все запуски анализа для указанного пользователя.
	GetAnalysisRunsByUserID(ctx context.Context, userID int) ([]models.AnalysisRun, error)
	// GetAnalysisResultsByRunID извлекает все сохраненные результаты для конкретного запуска анализа.
	GetAnalysisResultsByRunID(ctx context.Context, runID int64) ([]models.AnalysisResultData, error)
	// TODO: Add methods like GetAnalysisResultDataByRunID
}

// postgresAnalysisRepository реализует AnalysisRepository для PostgreSQL.
type postgresAnalysisRepository struct {
	db *sql.DB
}

// NewPostgresAnalysisRepository создает новый экземпляр postgresAnalysisRepository.
func NewPostgresAnalysisRepository(db *sql.DB) AnalysisRepository {
	return &postgresAnalysisRepository{db: db}
}

// SaveAnalysisRun сохраняет метаданные запуска анализа и возвращает его ID.
func (r *postgresAnalysisRepository) SaveAnalysisRun(ctx context.Context, userID int, fileName string, selectedAnalyses []string, dependentVariable string, independentVariable string) (int64, error) {
	query := `
		INSERT INTO analysis_runs (user_id, file_name, selected_analyses, dependent_variable, independent_variable, run_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) -- Добавлено run_at
		RETURNING id
	`
	var runID int64

	// Обработка nullable полей для dependent_variable и independent_variable
	var depVar sql.NullString
	if dependentVariable != "" {
		depVar = sql.NullString{String: dependentVariable, Valid: true}
	} else {
		depVar = sql.NullString{Valid: false}
	}

	var indepVar sql.NullString
	if independentVariable != "" {
		indepVar = sql.NullString{String: independentVariable, Valid: true}
	} else {
		indepVar = sql.NullString{Valid: false}
	}

	err := r.db.QueryRowContext(ctx, query,
		userID, // userID теперь int
		fileName,
		pq.Array(selectedAnalyses),
		depVar,
		indepVar,
	).Scan(&runID)

	if err != nil {
		return 0, fmt.Errorf("failed to save analysis run: %w", err)
	}
	return runID, nil
}

// SaveAnalysisResults сохраняет JSON-результаты различных этапов анализа.
func (r *postgresAnalysisRepository) SaveAnalysisResults(ctx context.Context, analysisRunID int64, results map[string]interface{}) error {
	query := `
		INSERT INTO analysis_results_data (analysis_run_id, result_type, data)
		VALUES ($1, $2, $3)
	`
	for resultType, data := range results {
		// Важно: data здесь должно быть чем-то, что драйвер pq может преобразовать в JSONB.
		// Обычно это []byte (JSON-строка) или map[string]interface{}.
		_, err := r.db.ExecContext(ctx, query, analysisRunID, resultType, data)
		if err != nil {
			return fmt.Errorf("failed to save analysis result data for run %d, type %s: %w",
				analysisRunID, resultType, err)
		}
	}
	return nil
}

// GetAnalysisRunsByUserID извлекает все запуски анализа для указанного пользователя.
func (r *postgresAnalysisRepository) GetAnalysisRunsByUserID(ctx context.Context, userID int) ([]models.AnalysisRun, error) {
	query := `
		SELECT id, user_id, file_name, run_at, selected_analyses, dependent_variable, independent_variable
		FROM analysis_runs
		WHERE user_id = $1
		ORDER BY run_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query analysis runs for user %d: %w", userID, err)
	}
	defer rows.Close()

	var runs []models.AnalysisRun
	for rows.Next() {
		var run models.AnalysisRun
		// Для nullable полей dependent_variable и independent_variable используем sql.NullString
		var depVar sql.NullString
		var indepVar sql.NullString

		err := rows.Scan(
			&run.ID,
			&run.UserID,
			&run.FileName,
			&run.RunAt,
			pq.Array(&run.SelectedAnalyses), // Для чтения TEXT[] в []string
			&depVar,
			&indepVar,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan analysis run: %w", err)
		}

		if depVar.Valid {
			run.DependentVariable = &depVar.String
		}
		if indepVar.Valid {
			run.IndependentVariable = &indepVar.String
		}
		runs = append(runs, run)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating analysis runs: %w", err)
	}

	return runs, nil
}

// GetAnalysisResultsByRunID извлекает все сохраненные результаты для конкретного запуска анализа.
func (r *postgresAnalysisRepository) GetAnalysisResultsByRunID(ctx context.Context, runID int64) ([]models.AnalysisResultData, error) {
	query := `
		SELECT id, analysis_run_id, result_type, data
		FROM analysis_results_data
		WHERE analysis_run_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, runID)
	if err != nil {
		return nil, fmt.Errorf("failed to query analysis results for run ID %d: %w", runID, err)
	}
	defer rows.Close()

	var results []models.AnalysisResultData
	for rows.Next() {
		var res models.AnalysisResultData
		// Поле Data в models.AnalysisResultData уже должно быть json.RawMessage или []byte
		if err := rows.Scan(&res.ID, &res.AnalysisRunID, &res.ResultType, &res.Data); err != nil {
			return nil, fmt.Errorf("failed to scan analysis result data: %w", err)
		}
		results = append(results, res)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating analysis results data: %w", err)
	}

	return results, nil
}
