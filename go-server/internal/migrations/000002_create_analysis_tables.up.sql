CREATE TABLE IF NOT EXISTS analysis_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    selected_analyses TEXT [],
    dependent_variable VARCHAR(255),
    independent_variable VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS analysis_results_data (
    id SERIAL PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    result_type VARCHAR(255) NOT NULL, -- e.g., 'descriptive_stats', 'normality_shapiro', 'regression_linear'
    data JSONB NOT NULL
); 