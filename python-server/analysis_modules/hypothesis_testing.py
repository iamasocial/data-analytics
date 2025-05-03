# python-server/analysis_modules/hypothesis_testing.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple

def perform_one_sample_t_test(df: pd.DataFrame, popmean: float = 0.0, alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет одновыборочный t-тест для числовых столбцов DataFrame.
    Проверяет гипотезу H0: среднее значение выборки = popmean.

    Args:
        df: Входной DataFrame.
        popmean: Гипотетическое среднее генеральной совокупности для сравнения.
        alpha: Уровень значимости.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет результат теста.
        - Список строк с логами обработки.
    """
    results = []
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for one-sample t-test.")
        return [], logs

    logs.append(f"Found numerical columns for one-sample t-test: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()
        count = col_data.count()

        test_result = {
            "variable_name": col_name,
            "test_name": "One-sample t-test",
            "description": f"H0: mean = {popmean}",
            "statistic": np.nan,
            "p_value": np.nan,
            "conclusion": "N/A"
        }

        # Тест требует хотя бы 2 наблюдения и ненулевую дисперсию
        if count < 2:
            test_result["conclusion"] = "Skipped (insufficient data)"
            logs.append(f"Skipped t-test for '{col_name}' (less than 2 non-NaN values).")
        elif col_data.std(ddof=1) == 0 or pd.isna(col_data.std(ddof=1)):
             test_result["conclusion"] = "Skipped (zero variance)"
             logs.append(f"Skipped t-test for '{col_name}' (zero variance).")
        else:
            try:
                t_stat, p_value = stats.ttest_1samp(col_data, popmean=popmean)
                test_result["statistic"] = float(t_stat)
                test_result["p_value"] = float(p_value)
                if p_value < alpha:
                    test_result["conclusion"] = f"Reject H0 (mean is likely different from {popmean} at alpha={alpha})"
                else:
                    test_result["conclusion"] = f"Fail to reject H0 (mean is not significantly different from {popmean} at alpha={alpha})"
                logs.append(f"Performed One-sample t-test for '{col_name}'.")
            except Exception as ex:
                 test_result["conclusion"] = f"Skipped (Unexpected Error: {ex})"
                 logs.append(f"Skipped t-test for '{col_name}' due to unexpected error: {ex}")

        results.append(test_result)

    return results, logs 