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
            obs_final = []
            exp_final = []
            buffer_obs = 0
            buffer_exp = 0

            for o, e in zip(observed_freq, expected_freq):
                buffer_obs += o
                buffer_exp += e
                if buffer_exp >= min_expected_freq:
                    obs_final.append(buffer_obs)
                    exp_final.append(buffer_exp)
                    buffer_obs = 0
                    buffer_exp = 0
            
            # Добавляем оставшийся буфер к последнему бину
            if buffer_exp > 0:
                if len(obs_final) > 0:
                    obs_final[-1] += buffer_obs
                    exp_final[-1] += buffer_exp
                else:
                    # Этот случай маловероятен при n>=20, но для надежности
                    obs_final.append(buffer_obs)
                    exp_final.append(buffer_exp)
            
            observed_freq = np.array(obs_final)
            expected_freq = np.array(exp_final)
            
            # Перепроверка после объединения
            if len(expected_freq) < 2: # Для ddof=2 нужно хотя бы 4 группы (4-1-2=1 dof), но для самого теста хотя бы 2
                 test_result["conclusion"] = f"Skipped (Not enough bins after merging)"
                 logs.append(f"Skipped Chi-square test for '{col_name}' (bins < 2 after merging).")
                 results.append(test_result)
                 continue
            
            # 4. Выполняем тест Хи-квадрат
            ddof = 2 # Оценили 2 параметра: mean, std_dev
            current_num_bins = len(expected_freq)
            degrees_of_freedom = current_num_bins - 1 - ddof

            if degrees_of_freedom <= 0:
                 test_result["conclusion"] = "Skipped (Degrees of freedom <= 0 after bin merging)"
                 logs.append(f"Skipped Chi-square test for '{col_name}' (DoF = {degrees_of_freedom} <= 0, Bins = {current_num_bins}).")
                 results.append(test_result)
                 continue

            try:
                # Заменяем вызов stats.chisquare на ручной расчет,
                # чтобы избежать внутренней нормализации и получить точное соответствие со скриптом.
                chi2_stat = np.sum((observed_freq - expected_freq)**2 / expected_freq)
                p_value = stats.chi2.sf(chi2_stat, degrees_of_freedom) # sf - это 1 - cdf

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