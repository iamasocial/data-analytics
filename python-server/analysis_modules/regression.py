# python-server/analysis_modules/regression.py
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError
from typing import List, Dict, Any, Tuple

def perform_simple_linear_regression(df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Выполняет простую линейную регрессию (OLS) для всех возможных пар
    числовых столбцов (Y ~ X).

    Args:
        df: Входной DataFrame.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет результат одной регрессионной модели.
        - Список строк с логами обработки.
    """
    logs = []
    results_list = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()
    n_cols = len(numerical_cols)

    if n_cols < 2:
        logs.append("Skipping regression analysis: Need at least 2 numerical columns.")
        return [], logs

    logs.append(f"Found {n_cols} numerical columns for regression analysis: {', '.join(numerical_cols)}")

    for i in range(n_cols):
        for j in range(n_cols):
            if i == j:
                continue # Не строим регрессию переменной на саму себя

            y_col_name = numerical_cols[i]
            x_col_name = numerical_cols[j]
            
            log_prefix = f"Regression {y_col_name} ~ {x_col_name}: "

            # Подготовка данных
            temp_df = df[[y_col_name, x_col_name]].dropna()
            n_valid = len(temp_df)

            # Для OLS нужно n > k (количество регрессоров, включая константу)
            # В нашем случае k = 2 (константа + x)
            if n_valid <= 2:
                logs.append(log_prefix + f"Skipped (insufficient data: n={n_valid} <= 2 required)." )
                continue

            y_data = temp_df[y_col_name]
            x_data = temp_df[x_col_name]

            # Проверка на нулевую дисперсию
            if y_data.var() == 0 or x_data.var() == 0:
                 logs.append(log_prefix + f"Skipped (zero variance in Y or X).")
                 continue

            try:
                # Добавляем константу (intercept) к X
                x_data_with_const = sm.add_constant(x_data, has_constant='raise')

                # Строим и обучаем модель OLS
                model = sm.OLS(y_data, x_data_with_const)
                results = model.fit()
                
                # Формируем словарь с результатами
                regression_result = {
                    "model_type": "Simple Linear Regression",
                    "dependent_variable": y_col_name,
                    "independent_variables": [x_col_name],
                    "r_squared": results.rsquared if pd.notna(results.rsquared) else np.nan,
                    "adjusted_r_squared": results.rsquared_adj if pd.notna(results.rsquared_adj) else np.nan,
                    "f_statistic": results.fvalue if pd.notna(results.fvalue) else np.nan,
                    "f_p_value": results.f_pvalue if pd.notna(results.f_pvalue) else np.nan,
                    "coefficients": []
                }

                # Добавляем коэффициенты
                for idx, name in enumerate(results.params.index):
                    coef_dict = {
                        "variable_name": str(name), # Имя может быть 'const' или x_col_name
                        "estimate": results.params.iloc[idx] if pd.notna(results.params.iloc[idx]) else np.nan,
                        "std_error": results.bse.iloc[idx] if pd.notna(results.bse.iloc[idx]) else np.nan,
                        "t_statistic": results.tvalues.iloc[idx] if pd.notna(results.tvalues.iloc[idx]) else np.nan,
                        "p_value": results.pvalues.iloc[idx] if pd.notna(results.pvalues.iloc[idx]) else np.nan,
                    }
                    regression_result["coefficients"].append(coef_dict)
                
                results_list.append(regression_result)
                logs.append(log_prefix + "Model fitted successfully.")

            except PerfectSeparationError:
                 logs.append(log_prefix + "Skipped (Perfect separation detected).")
            except ValueError as ve:
                # Может возникнуть, если в данных остались Inf/NaN после add_constant
                 logs.append(log_prefix + f"Skipped (ValueError during OLS setup/fit: {ve}).")
            except Exception as e:
                import traceback
                error_traceback = traceback.format_exc()
                logs.append(log_prefix + f"Skipped (Unexpected error: {e}\n{error_traceback}).")

    if not results_list:
        logs.append("No regression models could be fitted.")

    return results_list, logs 