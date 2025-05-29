# python-server/analysis_modules/goodness_of_fit.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple

def perform_chi_square_test(df: pd.DataFrame, distribution: str = 'norm', alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет критерий согласия Хи-квадрат Пирсона для числовых столбцов.
    По умолчанию проверяет гипотезу о нормальности распределения.

    Args:
        df: Входной DataFrame.
        distribution: Строка, указывающая теоретическое распределение ('norm', etc.).
                      Пока поддерживается только 'norm'.
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
        logs.append("No numerical columns found for Chi-square goodness-of-fit test.")
        return [], logs

    logs.append(f"Found numerical columns for Chi-square test: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()
        n = len(col_data)

        test_result = {
            "variable_name": col_name,
            "test_name": "Chi-square Goodness-of-fit",
            "distribution": distribution,
            "statistic": np.nan,
            "p_value": np.nan,
            "degrees_of_freedom": np.nan,
            "intervals": 0,
            "conclusion": "N/A"
        }

        # Требования к тесту: достаточно данных, ожидаемые частоты >= 5
        min_observations = 20 # Условный минимум для осмысленного разбиения
        min_expected_freq = 5

        if n < min_observations:
            test_result["conclusion"] = f"Skipped (insufficient data: need >={min_observations})"
            logs.append(f"Skipped Chi-square test for '{col_name}' (n={n} < {min_observations}).")
            results.append(test_result)
            continue

        # 1. Определяем количество интервалов (например, по правилу Стёрджеса)
        num_bins = int(np.ceil(1 + 3.322 * np.log10(n))) if n > 0 else 1
        if num_bins < 3: # Нужно хотя бы 3 бина для осмысления
            num_bins = 3

        # 2. Получаем наблюдаемые частоты и границы бинов
        observed_freq, bin_edges = np.histogram(col_data, bins=num_bins)

        # 3. Рассчитываем ожидаемые частоты для нормального распределения
        if distribution == 'norm':
            mean_val = col_data.mean()
            std_dev_val = col_data.std(ddof=1)

            if std_dev_val == 0 or pd.isna(std_dev_val):
                test_result["conclusion"] = "Skipped (zero or NaN variance)"
                logs.append(f"Skipped Chi-square test for '{col_name}' (zero variance).")
                results.append(test_result)
                continue

            # Используем CDF (Cumulative Distribution Function) нормального распределения
            expected_freq = np.diff(stats.norm.cdf(bin_edges, loc=mean_val, scale=std_dev_val)) * n
            # Корректируем первую и последнюю ожидаемую частоту (CDF дает P(X<=x))
            # Убедимся, что частоты не нулевые и достаточно большие
            expected_freq = np.maximum(expected_freq, 1e-8) # Заменяем нули малым числом

             # Объединяем бины с ожидаемой частотой < min_expected_freq
            i = 0
            while i < len(expected_freq):
                if expected_freq[i] < min_expected_freq:
                    if i == 0:
                        # Объединяем с правым соседом
                        if len(expected_freq) > 1:
                            expected_freq[1] += expected_freq[0]
                            observed_freq[1] += observed_freq[0]
                            expected_freq = expected_freq[1:]
                            observed_freq = observed_freq[1:]
                            num_bins -= 1
                        else: # Невозможно объединить, слишком мало бинов
                             break # Прерываем объединение
                    else:
                        # Объединяем с левым соседом
                        expected_freq[i-1] += expected_freq[i]
                        observed_freq[i-1] += observed_freq[i]
                        expected_freq = np.delete(expected_freq, i)
                        observed_freq = np.delete(observed_freq, i)
                        num_bins -= 1
                        continue # Перепроверяем объединенный бин
                i += 1
            
            # Перепроверка после объединения
            if np.any(expected_freq < min_expected_freq) or len(expected_freq) < 2:
                 test_result["conclusion"] = f"Skipped (Could not ensure expected freq >= {min_expected_freq})"
                 logs.append(f"Skipped Chi-square test for '{col_name}' (low expected frequencies).")
                 results.append(test_result)
                 continue
            
            # Убедимся, что суммы совпадают из-за возможных ошибок округления
            sum_obs = np.sum(observed_freq)
            sum_exp = np.sum(expected_freq)
            if sum_obs > 0 and not np.isclose(sum_obs, sum_exp): # Проверяем, что sum_obs > 0
                logs.append(f"Normalizing expected frequencies for '{col_name}' (Obs Sum: {sum_obs}, Exp Sum Before: {sum_exp:.4f}).")
                expected_freq = expected_freq * (sum_obs / sum_exp)
                # Убедимся, что частоты не отрицательные после нормализации
                expected_freq = np.maximum(expected_freq, 1e-9) 
                sum_exp_after = np.sum(expected_freq)
                logs.append(f"Expected frequencies normalized. Exp Sum After: {sum_exp_after:.4f}. Relative Diff: {abs(sum_obs - sum_exp_after) / sum_obs if sum_obs else 0:.2e}")

            # 4. Выполняем тест Хи-квадрат
            ddof = 2 # Оценили 2 параметра: mean, std_dev
            degrees_of_freedom = num_bins - 1 - ddof # num_bins здесь может быть неактуальным после слияния?
            # Правильнее использовать количество бинов ПОСЛЕ слияния:
            current_num_bins = len(expected_freq)
            degrees_of_freedom = current_num_bins - 1 - ddof

            if degrees_of_freedom <= 0:
                 test_result["conclusion"] = "Skipped (Degrees of freedom <= 0 after bin merging)"
                 logs.append(f"Skipped Chi-square test for '{col_name}' (DoF = {degrees_of_freedom} <= 0, Bins = {current_num_bins}).")
                 results.append(test_result)
                 continue

            try:
                chi2_stat, p_value = stats.chisquare(f_obs=observed_freq, f_exp=expected_freq, ddof=ddof)

                test_result["statistic"] = float(chi2_stat)
                test_result["p_value"] = float(p_value)
                test_result["degrees_of_freedom"] = degrees_of_freedom
                test_result["intervals"] = current_num_bins
                if p_value < alpha:
                    test_result["conclusion"] = f"Reject H0 (distribution likely not {distribution} at alpha={alpha})"
                else:
                    test_result["conclusion"] = f"Fail to reject H0 (distribution consistent with {distribution} at alpha={alpha})"
                logs.append(f"Performed Chi-square test for '{col_name}' (distribution: {distribution}).")
            except ValueError as ve:
                # Добавим обработку возможной ошибки ValueError из chisquare
                test_result["conclusion"] = f"Skipped (ValueError during chisquare: {ve})"
                logs.append(f"Skipped Chi-square test for '{col_name}' due to ValueError: {ve}")

        else:
            test_result["conclusion"] = f"Skipped (Unsupported distribution: {distribution})"
            logs.append(f"Skipped Chi-square test for '{col_name}' (unsupported distribution).")

        results.append(test_result)

    return results, logs 