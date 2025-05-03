# python-server/analysis_modules/correlation.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple, Optional

def calculate_correlations(df: pd.DataFrame, alpha: float = 0.05) -> Tuple[Optional[Dict[str, List[Dict[str, Any]]]], List[str]]:
    """
    Вычисляет коэффициенты корреляции Пирсона и Спирмена для всех пар
    числовых столбцов в DataFrame.

    Args:
        df: Входной DataFrame.
        alpha: Уровень значимости для определения статистической значимости.

    Returns:
        Кортеж:
        - Словарь с результатами {'pearson': [...], 'spearman': [...]},
          или None, если недостаточно данных.
        - Список строк с логами обработки.
    """
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()
    n_cols = len(numerical_cols)

    if n_cols < 2:
        logs.append("Skipping correlation analysis: Need at least 2 numerical columns.")
        return None, logs

    logs.append(f"Found {n_cols} numerical columns for correlation analysis: {', '.join(numerical_cols)}")

    pearson_results = []
    spearman_results = []

    for i in range(n_cols):
        for j in range(i + 1, n_cols):
            col1_name = numerical_cols[i]
            col2_name = numerical_cols[j]

            # Получаем данные, удаляя пары с NaN
            valid_data = df[[col1_name, col2_name]].dropna()
            n_valid = len(valid_data)

            if n_valid < 3: # Нужно хотя бы 3 пары для расчета корреляции
                logs.append(f"Skipping correlation between '{col1_name}' and '{col2_name}' (n={n_valid} < 3 valid pairs).")
                continue

            col1_data = valid_data[col1_name]
            col2_data = valid_data[col2_name]
            
            # Проверка на нулевую дисперсию (после удаления NaN)
            if col1_data.var() == 0 or col2_data.var() == 0:
                 logs.append(f"Skipping correlation between '{col1_name}' and '{col2_name}' (zero variance in one or both columns).")
                 continue

            try:
                # Корреляция Пирсона
                pearson_corr, pearson_p = stats.pearsonr(col1_data, col2_data)
                pearson_results.append({
                    "variable1": col1_name,
                    "variable2": col2_name,
                    "coefficient": float(pearson_corr) if pd.notna(pearson_corr) else np.nan,
                    "p_value": float(pearson_p) if pd.notna(pearson_p) else np.nan,
                    "significant": bool(pearson_p < alpha) if pd.notna(pearson_p) else False # Доп. поле для удобства
                })
                logs.append(f"Calculated Pearson correlation between '{col1_name}' and '{col2_name}'.")

                # Корреляция Спирмена
                spearman_corr, spearman_p = stats.spearmanr(col1_data, col2_data)
                spearman_results.append({
                    "variable1": col1_name,
                    "variable2": col2_name,
                    "coefficient": float(spearman_corr) if pd.notna(spearman_corr) else np.nan,
                    "p_value": float(spearman_p) if pd.notna(spearman_p) else np.nan,
                    "significant": bool(spearman_p < alpha) if pd.notna(spearman_p) else False # Доп. поле для удобства
                })
                logs.append(f"Calculated Spearman correlation between '{col1_name}' and '{col2_name}'.")

            except Exception as e:
                 logs.append(f"Error calculating correlation between '{col1_name}' and '{col2_name}': {e}")


    if not pearson_results and not spearman_results:
         logs.append("No correlations could be calculated.")
         return None, logs

    correlation_output = {
        "pearson": pearson_results,
        "spearman": spearman_results
    }

    return correlation_output, logs 