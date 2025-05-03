# python-server/analysis_modules/confidence_interval.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple

def calculate_confidence_intervals(df: pd.DataFrame, confidence: float = 0.95) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Вычисляет доверительные интервалы для среднего значения числовых столбцов.

    Args:
        df: Входной DataFrame.
        confidence: Уровень доверия (например, 0.95 для 95%).

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет доверительный интервал.
        - Список строк с логами обработки.
    """
    results = []
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for confidence intervals.")
        return [], logs

    logs.append(f"Found numerical columns for confidence intervals: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()
        count = col_data.count()
        mean_val = col_data.mean()

        ci_result = {
            "variable_name": col_name,
            "parameter_name": "Mean",
            "confidence_level": confidence,
            "lower_bound": np.nan, # Используем NaN по умолчанию
            "upper_bound": np.nan
        }

        # Интервал можно построить, если есть хотя бы 2 наблюдения
        if count < 2:
            ci_result["lower_bound"] = mean_val if pd.notna(mean_val) else np.nan
            ci_result["upper_bound"] = mean_val if pd.notna(mean_val) else np.nan
            logs.append(f"Skipped CI for mean of '{col_name}' (less than 2 non-NaN values).")
        else:
            try:
                # Стандартная ошибка среднего
                sem_val = stats.sem(col_data)
                if pd.notna(sem_val) and sem_val >= 0:
                    # Степени свободы
                    df_ci = count - 1
                    # Вычисляем интервал с помощью t-распределения
                    lower, upper = stats.t.interval(confidence, df_ci, loc=mean_val, scale=sem_val)
                    ci_result["lower_bound"] = float(lower) if pd.notna(lower) else np.nan
                    ci_result["upper_bound"] = float(upper) if pd.notna(upper) else np.nan
                    logs.append(f"Calculated {confidence*100:.0f}% CI for mean of '{col_name}'.")
                else:
                    ci_result["lower_bound"] = mean_val if pd.notna(mean_val) else np.nan
                    ci_result["upper_bound"] = mean_val if pd.notna(mean_val) else np.nan
                    logs.append(f"Skipped CI for mean of '{col_name}' (invalid SEM: {sem_val}).")
            except Exception as ci_err:
                 ci_result["lower_bound"] = mean_val if pd.notna(mean_val) else np.nan
                 ci_result["upper_bound"] = mean_val if pd.notna(mean_val) else np.nan
                 logs.append(f"Skipped CI for mean of '{col_name}' due to error: {ci_err}")

        results.append(ci_result)

    return results, logs 