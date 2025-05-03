# python-server/analysis_modules/normality.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple

def perform_normality_test(df: pd.DataFrame, alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет тест Шапиро-Уилка на нормальность для числовых столбцов DataFrame.

    Args:
        df: Входной DataFrame.
        alpha: Уровень значимости для определения вывода.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет результат теста для одного столбца.
        - Список строк с логами обработки.
    """
    results = []
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for normality tests.")
        return [], logs

    logs.append(f"Found numerical columns for normality tests: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()
        count = col_data.count()

        test_result = {
            "variable_name": col_name,
            "test_name": "Shapiro-Wilk",
            "statistic": np.nan,
            "p_value": np.nan,
            "conclusion": "N/A"
        }

        # Тест требует хотя бы 3 не-NaN значения
        if count < 3:
            test_result["conclusion"] = "Skipped (insufficient data)"
            logs.append(f"Skipped Shapiro-Wilk for '{col_name}' (less than 3 non-NaN values).")
        # Проверка на константность данных (shapiro выдаст ошибку)
        elif col_data.nunique() == 1:
            test_result["conclusion"] = "Skipped (constant data)"
            logs.append(f"Skipped Shapiro-Wilk for '{col_name}' (constant values).")
        else:
            try:
                shapiro_stat, shapiro_p_value = stats.shapiro(col_data)
                test_result["statistic"] = float(shapiro_stat)
                test_result["p_value"] = float(shapiro_p_value)
                if shapiro_p_value > alpha:
                    test_result["conclusion"] = f"Sample looks Gaussian (fail to reject H0 at alpha={alpha})"
                else:
                    test_result["conclusion"] = f"Sample does not look Gaussian (reject H0 at alpha={alpha})"
                logs.append(f"Performed Shapiro-Wilk test for '{col_name}'.")
            except ValueError as ve:
                test_result["conclusion"] = f"Skipped (Error: {ve})"
                logs.append(f"Skipped Shapiro-Wilk for '{col_name}' due to error: {ve}")
            except Exception as ex: # Ловим другие неожиданные ошибки
                 test_result["conclusion"] = f"Skipped (Unexpected Error: {ex})"
                 logs.append(f"Skipped Shapiro-Wilk for '{col_name}' due to unexpected error: {ex}")

        results.append(test_result)

    return results, logs 