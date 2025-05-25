# python-server/analysis_modules/descriptive.py
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
# Импортируем сгенерированные классы protobuf
import analysis_pb2 

# Define a type hint for the histogram data dictionary
HistogramResultDict = Dict[str, Any]

# Updated return type hint to remove box plot data
def calculate_descriptive_stats(df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[HistogramResultDict], List[str]]:
    """
    Вычисляет описательные статистики и данные гистограмм для числовых столбцов DataFrame.

    Args:
        df: Входной DataFrame.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет статистики одного столбца.
        - Список словарей, где каждый словарь представляет данные гистограммы одного столбца.
        - Список строк с логами обработки.
    """
    descriptive_results = []
    histogram_results = [] # New list for histogram data
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for descriptive statistics.")
        return [], [], logs # Return empty lists for all results

    logs.append(f"Found numerical columns for descriptives: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()

        if col_data.empty:
            logs.append(f"Skipping descriptive statistics and histogram for column '{col_name}' (all values are NaN).")
            continue

        # --- Descriptive Stats ---    
        count = int(col_data.count()) # Приводим к int
        mean_val = float(col_data.mean())
        median_val = float(col_data.median())
        mode_result = col_data.mode()
        variance_val = col_data.var(ddof=1)
        std_dev_val = col_data.std(ddof=1)
        skewness_val = col_data.skew()
        kurtosis_val = col_data.kurt()
        min_val = float(col_data.min())
        max_val = float(col_data.max())

        variation_coefficient_val = 0.0
        # Проверяем, что mean_val не None/NaN и не 0 перед делением
        if pd.notna(mean_val) and mean_val != 0 and pd.notna(std_dev_val):
            variation_coefficient_val = float(std_dev_val / mean_val)
        elif pd.isna(mean_val) or pd.isna(std_dev_val):
             variation_coefficient_val = np.nan # Используем NaN если не можем посчитать

        stats_dict: Dict[str, Any] = {
            "variable_name": col_name,
            "count": count,
            "mean": mean_val if pd.notna(mean_val) else np.nan, # Используем NaN для неопределенных
            "median": median_val if pd.notna(median_val) else np.nan,
            "mode": [] if mode_result.empty else mode_result.astype(float).tolist(), # Приводим к float
            "variance": float(variance_val) if pd.notna(variance_val) else np.nan,
            "std_dev": float(std_dev_val) if pd.notna(std_dev_val) else np.nan,
            "variation_coefficient": variation_coefficient_val, # Уже обработали выше
            "skewness": float(skewness_val) if pd.notna(skewness_val) else np.nan,
            "kurtosis": float(kurtosis_val) if pd.notna(kurtosis_val) else np.nan,
            "min_value": min_val,
            "max_value": max_val,
        }
        descriptive_results.append(stats_dict)
        logs.append(f"Calculated descriptives for '{col_name}'.")

        # --- Histogram Calculation --- 
        try:
            # Use numpy.histogram. Let numpy determine the optimal bins ('auto')
            # We need frequencies (counts in each bin) and bin_edges
            frequencies, bin_edges = np.histogram(col_data, bins='auto')
            
            # Prepare histogram data dictionary
            hist_dict: HistogramResultDict = {
                 "variable_name": col_name,
                 "bins": bin_edges.tolist(), # Convert numpy array to list
                 "frequencies": frequencies.tolist() # Convert numpy array to list
            }
            histogram_results.append(hist_dict)
            logs.append(f"Calculated histogram data for '{col_name}' (bins: {len(frequencies)}).")
        except Exception as e:
            logs.append(f"Warning: Could not calculate histogram for '{col_name}': {e}")
            # Optionally append a placeholder or skip if histogram fails
            # histogram_results.append({"variable_name": col_name, "bins": [], "frequencies": []}) 
            
    # Return only three lists (no boxplot_results)
    return descriptive_results, histogram_results, logs 