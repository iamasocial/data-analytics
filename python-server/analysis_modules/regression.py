# python-server/analysis_modules/regression.py
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError
from typing import List, Dict, Any, Tuple
from scipy.optimize import curve_fit
# Импортируем сгенерированные классы protobuf
import analysis_pb2

# Создаем классы для доменной модели, отдельно от protobuf
class RegressionData:
    def __init__(self):
        self.model_type = "Linear"  # Изменено с regression_type для соответствия с entities.py
        self.dependent_variable = ""
        self.independent_variables = []
        self.r_squared = 0.0
        self.adjusted_r_squared = 0.0
        self.f_statistic = 0.0
        self.prob_f_statistic = 0.0  # переименовано с f_p_value
        self.sse = 0.0  # Sum of Squared Errors - добавлено
        self.coefficients = []
        self.data_points = []  # Добавляем точки данных для построения графика

class RegressionCoefficient:
    def __init__(self, variable_name="", coefficient=0.0, standard_error=0.0,
                 t_statistic=0.0, p_value=0.0, ci_lower=0.0, ci_upper=0.0):
        self.variable_name = variable_name
        self.coefficient = coefficient
        self.standard_error = standard_error  # переименовано с std_error
        self.t_statistic = t_statistic
        self.p_value = p_value
        self.confidence_interval_lower = ci_lower
        self.confidence_interval_upper = ci_upper

# Функции для различных типов регрессий
def linear_func(x, a, b):
    """Линейная регрессия: y = a*x + b"""
    return a * x + b

def power_func(x, a, b):
    """Степенная регрессия: y = a * x^b"""
    # Обрабатываем отрицательные значения x
    x_safe = np.maximum(x, 1e-10)  # Избегаем 0 и отрицательных значений
    return a * np.power(x_safe, b)

def log_func(x, a, b):
    """Логарифмическая регрессия: y = a + b*log(x)"""
    # Обрабатываем отрицательные значения x
    x_safe = np.maximum(x, 1e-10)  # Избегаем 0 и отрицательных значений
    return a + b * np.log(x_safe)

def quadratic_func(x, a, b, c):
    """Квадратичная регрессия: y = a*x^2 + b*x + c"""
    return a * x**2 + b * x + c

def trigonometric_func(x, a, b, c, d):
    """Тригонометрическая регрессия: y = a*sin(b*x + c) + d"""
    return a * np.sin(b * x + c) + d

def sigmoid_func(x, a, b, c):
    """Сигмоидная регрессия: y = c / (1 + exp(-a*(x-b)))"""
    return c / (1 + np.exp(-a * (x - b)))

def calculate_r_squared(y_true, y_pred):
    """Вычисляет коэффициент детерминации R²"""
    ss_total = np.sum((y_true - np.mean(y_true))**2)
    ss_residual = np.sum((y_true - y_pred)**2)
    
    if ss_total == 0:
        return 0  # Если все значения y одинаковые
    
    r_squared = 1 - (ss_residual / ss_total)
    return max(0, min(1, r_squared))  # Ограничиваем R² в диапазоне [0, 1]

def calculate_sse(y_true, y_pred):
    """Вычисляет сумму квадратов ошибок (SSE)"""
    return np.sum((y_true - y_pred)**2)

def perform_simple_linear_regression(df: pd.DataFrame, dependent_var: str = None, independent_var: str = None) -> Tuple[List[RegressionData], List[str]]:
    """
    Выполняет простую линейную регрессию (OLS) для всех возможных пар
    числовых столбцов (Y ~ X), или для указанных переменных, если они заданы.

    Args:
        df: Входной DataFrame.
        dependent_var: Имя зависимой переменной (Y). Если None, будут перебраны все числовые столбцы.
        independent_var: Имя независимой переменной (X). Если None, будут перебраны все числовые столбцы.

    Returns:
        Кортеж:
        - Список объектов RegressionData.
        - Список строк с логами обработки.
    """
    logs = []
    results_list = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()
    n_cols = len(numerical_cols)

    if n_cols < 2:
        logs.append("Skipping regression analysis: Need at least 2 numerical columns.")
        return [], logs

    # Если указаны обе переменные, проверяем их наличие в данных
    if dependent_var is not None and independent_var is not None:
        if dependent_var not in df.columns:
            logs.append(f"Error: Dependent variable '{dependent_var}' not found in data.")
            return [], logs
        if independent_var not in df.columns:
            logs.append(f"Error: Independent variable '{independent_var}' not found in data.")
            return [], logs
        
        # Проверяем, что обе переменные числовые
        if dependent_var not in numerical_cols:
            logs.append(f"Error: Dependent variable '{dependent_var}' is not numeric.")
            return [], logs
        if independent_var not in numerical_cols:
            logs.append(f"Error: Independent variable '{independent_var}' is not numeric.")
            return [], logs
        
        # Используем только указанные переменные
        selected_pairs = [(dependent_var, independent_var)]
        logs.append(f"Using specified variables: Y = {dependent_var}, X = {independent_var}")
    else:
        # Если переменные не указаны, перебираем все пары
        logs.append(f"Found {n_cols} numerical columns for regression analysis: {', '.join(numerical_cols)}")
        selected_pairs = [(numerical_cols[i], numerical_cols[j]) 
                          for i in range(n_cols) 
                          for j in range(n_cols) 
                          if i != j]

    # Типы регрессий для анализа
    regression_types = [
        ("Linear", linear_func, 2),  # (название, функция, кол-во параметров)
        ("Power", power_func, 2),
        ("Logarithmic", log_func, 2),
        ("Quadratic", quadratic_func, 3),
        ("Trigonometric", trigonometric_func, 4),
        ("Sigmoid", sigmoid_func, 3)
    ]

    for y_col_name, x_col_name in selected_pairs:
        log_prefix = f"Regression {y_col_name} ~ {x_col_name}: "

        # Подготовка данных
        temp_df = df[[y_col_name, x_col_name]].dropna()
        n_valid = len(temp_df)

        # Для OLS нужно n > k (количество регрессоров, включая константу)
        # В нашем случае k = 2 (константа + x)
        if n_valid <= 2:
            logs.append(log_prefix + f"Skipped (insufficient data: n={n_valid} <= 2 required)." )
            continue

        y_data = temp_df[y_col_name].values
        x_data = temp_df[x_col_name].values

        # Проверка на нулевую дисперсию
        if np.var(y_data) == 0 or np.var(x_data) == 0:
             logs.append(log_prefix + f"Skipped (zero variance in Y or X).")
             continue

        # Словарь для хранения результатов всех типов регрессий
        all_models = []

        # 1. Линейная регрессия через statsmodels (OLS)
        try:
            # Добавляем константу (intercept) к X
            x_data_with_const = sm.add_constant(x_data, has_constant='raise')

            # Строим и обучаем модель OLS
            model = sm.OLS(y_data, x_data_with_const)
            results = model.fit()
            
            # Формируем объект с результатами
            coefficients = []
            # Добавляем коэффициенты
            for idx, name in enumerate(results.params.index):
                # Проверяем на NaN перед созданием объекта
                if all(pd.notna(val) for val in [results.params.iloc[idx], results.bse.iloc[idx], results.tvalues.iloc[idx], results.pvalues.iloc[idx]]):
                    # Получаем доверительные интервалы для коэффициентов (95%)
                    ci = results.conf_int(alpha=0.05).iloc[idx]
                    coef = RegressionCoefficient(
                        variable_name=str(name),
                        coefficient=float(results.params.iloc[idx]),
                        standard_error=float(results.bse.iloc[idx]),
                        t_statistic=float(results.tvalues.iloc[idx]),
                        p_value=float(results.pvalues.iloc[idx]),
                        ci_lower=float(ci[0]),
                        ci_upper=float(ci[1])
                    )
                    coefficients.append(coef)
                else:
                    logs.append(log_prefix + f"Skipping coefficient '{name}' due to NaN values.")

            # Убедимся, что основные метрики не NaN
            if all(pd.notna(val) for val in [results.rsquared, results.rsquared_adj, results.fvalue, results.f_pvalue]):
                regression_result = RegressionData()
                regression_result.model_type = "Linear"
                regression_result.dependent_variable = y_col_name
                regression_result.independent_variables = [x_col_name]
                regression_result.r_squared = float(results.rsquared)
                regression_result.adjusted_r_squared = float(results.rsquared_adj)
                regression_result.f_statistic = float(results.fvalue)
                regression_result.prob_f_statistic = float(results.f_pvalue)
                regression_result.sse = float(results.ssr)  # Sum of squared residuals
                regression_result.coefficients = coefficients
                
                # Добавляем точки данных для построения графика
                regression_result.data_points = [
                    {"x": float(x), "y": float(y)} for x, y in zip(x_data, y_data)
                ]
                
                all_models.append(regression_result)
                logs.append(log_prefix + "Linear model fitted successfully.")
            else:
                 logs.append(log_prefix + "Skipped linear model summary due to NaN in main metrics.")

        except PerfectSeparationError:
             logs.append(log_prefix + "Skipped linear model (Perfect separation detected).")
        except ValueError as ve:
            # Может возникнуть, если в данных остались Inf/NaN после add_constant
             logs.append(log_prefix + f"Skipped linear model (ValueError during OLS setup/fit: {ve}).")
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            logs.append(log_prefix + f"Skipped linear model (Unexpected error: {e}).")

        # 2. Нелинейные регрессии через scipy.optimize.curve_fit
        for reg_type, func, n_params in regression_types[1:]:  # Пропускаем линейную, она уже обработана
            try:
                # Начальные параметры для оптимизации
                p0 = np.ones(n_params)
                
                # Для логарифмической и степенной регрессий нужны положительные X
                if reg_type in ["Power", "Logarithmic"] and np.any(x_data <= 0):
                    logs.append(log_prefix + f"Skipped {reg_type} model (negative or zero values in X).")
                    continue
                
                # Подгоняем модель
                params, pcov = curve_fit(func, x_data, y_data, p0=p0, maxfev=10000)
                
                # Вычисляем предсказанные значения
                y_pred = func(x_data, *params)
                
                # Вычисляем R² и SSE
                r_squared = calculate_r_squared(y_data, y_pred)
                sse = calculate_sse(y_data, y_pred)
                
                # Создаем коэффициенты
                coefficients = []
                param_names = {
                    "Power": ["a", "b"],
                    "Logarithmic": ["a", "b"],
                    "Quadratic": ["a", "b", "c"],
                    "Trigonometric": ["a", "b", "c", "d"],
                    "Sigmoid": ["a", "b", "c"]
                }
                
                for idx, name in enumerate(param_names[reg_type]):
                    # Для нелинейных моделей у нас нет стандартных ошибок и p-значений,
                    # но мы можем примерно оценить стандартную ошибку из ковариационной матрицы
                    std_err = np.sqrt(np.diag(pcov))[idx] if not np.any(np.isinf(pcov)) else 0.0
                    
                    coef = RegressionCoefficient(
                        variable_name=name,
                        coefficient=float(params[idx]),
                        standard_error=float(std_err),
                        t_statistic=0.0,  # Не применимо для нелинейной регрессии
                        p_value=0.0,      # Не применимо для нелинейной регрессии
                        ci_lower=float(params[idx] - 1.96 * std_err),
                        ci_upper=float(params[idx] + 1.96 * std_err)
                    )
                    coefficients.append(coef)
                
                # Создаем объект результата регрессии
                regression_result = RegressionData()
                regression_result.model_type = reg_type
                regression_result.dependent_variable = y_col_name
                regression_result.independent_variables = [x_col_name]
                regression_result.r_squared = float(r_squared)
                regression_result.adjusted_r_squared = float(r_squared)  # Для нелинейной регрессии используем обычный R²
                regression_result.f_statistic = 0.0  # Не применимо для нелинейной регрессии
                regression_result.prob_f_statistic = 0.0  # Не применимо для нелинейной регрессии
                regression_result.sse = float(sse)
                regression_result.coefficients = coefficients
                
                # Добавляем точки данных для построения графика
                regression_result.data_points = [
                    {"x": float(x), "y": float(y)} for x, y in zip(x_data, y_data)
                ]
                
                all_models.append(regression_result)
                logs.append(log_prefix + f"{reg_type} model fitted successfully. R²={r_squared:.4f}, SSE={sse:.4f}")
                
            except Exception as e:
                logs.append(log_prefix + f"Skipped {reg_type} model: {str(e)}")
        
        # Добавляем все модели в общий список результатов
        results_list.extend(all_models)

    if not results_list:
        logs.append("No regression models could be fitted.")

    return results_list, logs 