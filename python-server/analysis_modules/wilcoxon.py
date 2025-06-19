# python-server/analysis_modules/wilcoxon.py
import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple, Optional, Union

def perform_wilcoxon_signed_rank_test(df: pd.DataFrame, var1: Optional[str] = None, var2: Optional[str] = None, 
                               alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет критерий знаковых рангов Вилкоксона для связанных выборок.
    Используется для проверки различий между парами связанных измерений.

    Args:
        df: Входной DataFrame.
        var1: Имя первого столбца для сравнения.
        var2: Имя второго столбца для сравнения.
        alpha: Уровень значимости для определения вывода.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет результат теста.
        - Список строк с логами обработки.
    """
    results = []
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for Wilcoxon tests.")
        return [], logs

    logs.append(f"Found numerical columns for Wilcoxon tests: {', '.join(numerical_cols)}")
    
    # Определяем, какие пары столбцов сравнивать
    column_pairs = []
    if var1 is not None and var2 is not None:
        # Если оба столбца указаны
        if var1 in numerical_cols and var2 in numerical_cols:
            column_pairs = [(var1, var2)]
            logs.append(f"Using specified columns: '{var1}' and '{var2}'")
        else:
            logs.append(f"Specified columns not found or not numeric: '{var1}', '{var2}'")
            return [], logs
    else:
        # Если столбцы не указаны, сравниваем все пары численных столбцов
        column_pairs = [(numerical_cols[i], numerical_cols[j]) 
                         for i in range(len(numerical_cols)) 
                         for j in range(i + 1, len(numerical_cols))]
        logs.append(f"Testing all pairs of numerical columns. Total pairs: {len(column_pairs)}")

    # Выполняем тест для каждой пары столбцов
    for col1, col2 in column_pairs:
        # Получаем данные и удаляем строки с NaN
        data_pair = df[[col1, col2]].dropna()
        col1_data = data_pair[col1].values
        col2_data = data_pair[col2].values
        
        sample_size = len(col1_data)

        test_result = {
            "test_type": "Wilcoxon signed-rank test",
            "variable1": col1,
            "variable2": col2,
            "statistic": np.nan,
            "p_value": np.nan,
            "conclusion": "N/A",
            "sample_size": sample_size
        }

        # Проверяем минимальный размер выборки
        if sample_size < 6:
            test_result["conclusion"] = f"Пропущено (недостаточно данных, n={sample_size} < 6 рекомендуется)"
            logs.append(f"Skipped Wilcoxon signed-rank test for '{col1}' and '{col2}' (insufficient data points)")
        else:
            try:
                # Вычисляем разности между парами
                differences = col1_data - col2_data
                
                # Проверяем, что есть ненулевые разности
                if all(abs(diff) < 1e-9 for diff in differences):
                    test_result["conclusion"] = "Пропущено (все разности равны нулю)"
                    logs.append(f"Skipped Wilcoxon signed-rank test for '{col1}' and '{col2}' (all differences are zero)")
                    results.append(test_result)
                    continue
                
                # Выполняем тест Вилкоксона
                wilcoxon_result = stats.wilcoxon(col1_data, col2_data)
                statistic = wilcoxon_result.statistic
                p_value = wilcoxon_result.pvalue
                
                test_result["statistic"] = float(statistic)
                test_result["p_value"] = float(p_value)
                
                # Интерпретация результата
                if p_value > alpha:
                    test_result["conclusion"] = f"Статистически значимых различий нет (p > {alpha})"
                else:
                    test_result["conclusion"] = f"Обнаружены статистически значимые различия (p <= {alpha})"
                
                logs.append(f"Performed Wilcoxon signed-rank test for '{col1}' and '{col2}': p={p_value:.4f}")
            
            except Exception as e:
                test_result["conclusion"] = f"Ошибка: {str(e)}"
                logs.append(f"Error performing Wilcoxon signed-rank test for '{col1}' and '{col2}': {str(e)}")
        
        results.append(test_result)

    return results, logs


def perform_mann_whitney_test(df: pd.DataFrame, group_column: str, value_column: str, 
                              alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет тест Манна-Уитни (критерий суммы рангов Вилкоксона) для двух независимых выборок.

    Args:
        df: Входной DataFrame.
        group_column: Имя столбца, содержащего группировочную переменную (для разделения на выборки).
        value_column: Имя столбца с числовыми значениями для сравнения.
        alpha: Уровень значимости для определения вывода.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет результат теста.
        - Список строк с логами обработки.
    """
    results = []
    logs = []
    
    # Проверка наличия указанных столбцов
    if group_column not in df.columns:
        logs.append(f"Group column '{group_column}' not found in dataset")
        return [], logs
    
    if value_column not in df.columns:
        logs.append(f"Value column '{value_column}' not found in dataset")
        return [], logs
    
    # Проверка, что value_column - числовой
    if not pd.api.types.is_numeric_dtype(df[value_column]):
        logs.append(f"Value column '{value_column}' is not numeric")
        return [], logs
        
    # Получаем уникальные значения группировочной переменной
    groups = df[group_column].unique()
    
    # Для теста Манна-Уитни нужно ровно 2 группы
    if len(groups) != 2:
        logs.append(f"Mann-Whitney test requires exactly 2 groups, but {len(groups)} found in '{group_column}'")
        return [], logs
    
    group1 = groups[0]
    group2 = groups[1]
    
    # Выделяем данные для каждой группы
    group1_data = df[df[group_column] == group1][value_column].dropna().values
    group2_data = df[df[group_column] == group2][value_column].dropna().values
    
    group1_size = len(group1_data)
    group2_size = len(group2_data)
    
    test_result = {
        "test_type": "Mann-Whitney U test",
        "group_column": group_column,
        "value_column": value_column,
        "group1": str(group1),
        "group2": str(group2),
        "group1_size": group1_size,
        "group2_size": group2_size,
        "statistic": np.nan,
        "p_value": np.nan,
        "conclusion": "N/A"
    }
    
    # Проверяем размеры выборок
    min_sample = 5  # Минимальный размер выборки для надежности результатов
    
    if group1_size < min_sample or group2_size < min_sample:
        test_result["conclusion"] = f"Пропущено (недостаточно данных, размеры групп: {group1_size}, {group2_size} < {min_sample} рекомендуется)"
        logs.append(f"Skipped Mann-Whitney test for '{value_column}' by '{group_column}' (insufficient data)")
    else:
        try:
            # Выполняем тест Манна-Уитни
            mann_whitney_result = stats.mannwhitneyu(group1_data, group2_data)
            statistic = mann_whitney_result.statistic
            p_value = mann_whitney_result.pvalue
            
            test_result["statistic"] = float(statistic)
            test_result["p_value"] = float(p_value)
            
            # Интерпретация результата
            if p_value > alpha:
                test_result["conclusion"] = f"Статистически значимых различий нет (p > {alpha})"
            else:
                test_result["conclusion"] = f"Обнаружены статистически значимые различия (p <= {alpha})"
            
            logs.append(f"Performed Mann-Whitney test for '{value_column}' by '{group_column}': p={p_value:.4f}")
            
            # Добавим дополнительную информацию о медианах групп
            test_result["group1_median"] = float(np.median(group1_data))
            test_result["group2_median"] = float(np.median(group2_data))
            
        except Exception as e:
            test_result["conclusion"] = f"Error: {str(e)}"
            logs.append(f"Error performing Mann-Whitney test for '{value_column}' by '{group_column}': {str(e)}")
    
    results.append(test_result)

    return results, logs 