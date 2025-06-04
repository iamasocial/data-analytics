from typing import List, Dict, Any, Tuple
import pandas as pd

from internal.core.ports.analysis_ports import RegressionPort
from analysis_modules.regression import perform_simple_linear_regression

class RegressionAdapter(RegressionPort):
    """Адаптер для модуля регрессионного анализа"""
    
    def perform_simple_linear_regression(self, df: pd.DataFrame, dependent_var: str = None, 
                                        independent_var: str = None) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет регрессионный анализ для числовых столбцов DataFrame.
        Поддерживает линейную, степенную, логарифмическую, квадратичную, 
        тригонометрическую и сигмоидную регрессии.
        
        Args:
            df: Входной DataFrame.
            dependent_var: Имя зависимой переменной (Y). Если None, будут перебраны все числовые столбцы.
            independent_var: Имя независимой переменной (X). Если None, будут перебраны все числовые столбцы.
            
        Returns:
            Кортеж:
            - Список словарей с результатами регрессионного анализа
            - Список логов обработки
        """
        
        # Делегируем расчеты существующей функции из analysis_modules
        regression_results, logs = perform_simple_linear_regression(df, dependent_var, independent_var)
        
        # Преобразуем результаты в словари для передачи через порты
        result_dicts = []
        for reg_result in regression_results:
            coef_dicts = []
            for coef in reg_result.coefficients:
                coef_dict = {
                    "variable_name": coef.variable_name,
                    "coefficient": coef.coefficient,
                    "standard_error": coef.standard_error,
                    "t_statistic": coef.t_statistic,
                    "p_value": coef.p_value,
                    "confidence_interval_lower": coef.confidence_interval_lower,
                    "confidence_interval_upper": coef.confidence_interval_upper
                }
                coef_dicts.append(coef_dict)
                
            result_dict = {
                "model_type": reg_result.model_type,
                "dependent_variable": reg_result.dependent_variable,
                "independent_variables": reg_result.independent_variables,
                "r_squared": reg_result.r_squared,
                "adjusted_r_squared": reg_result.adjusted_r_squared,
                "f_statistic": reg_result.f_statistic,
                "f_p_value": reg_result.prob_f_statistic,  # Обратите внимание на имя поля
                "sse": reg_result.sse,  # Добавляем SSE
                "coefficients": coef_dicts,
                "data_points": reg_result.data_points,  # Добавляем точки данных
                "residuals": reg_result.residuals  # Добавляем остатки регрессии
            }
            result_dicts.append(result_dict)
        
        return result_dicts, logs 