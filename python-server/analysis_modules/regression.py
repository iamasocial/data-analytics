# python-server/analysis_modules/regression.py
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError
from typing import List, Dict, Any, Tuple
from scipy.optimize import curve_fit
# Импортируем сгенерированные классы protobuf
# import analysis_pb2 # Закомментировано, так как не используется в этом фрагменте

# Создаем классы для доменной модели, отдельно от protobuf
class RegressionData:
    def __init__(self):
        self.model_type = "Linear"
        self.dependent_variable = ""
        self.independent_variables = []
        self.r_squared = 0.0
        self.adjusted_r_squared = 0.0
        self.f_statistic = 0.0
        self.prob_f_statistic = 0.0
        self.sse = 0.0
        self.coefficients = []
        self.data_points = []

class RegressionCoefficient:
    def __init__(self, variable_name="", coefficient=0.0, standard_error=0.0,
                 t_statistic=0.0, p_value=0.0, ci_lower=0.0, ci_upper=0.0):
        self.variable_name = variable_name
        self.coefficient = coefficient
        self.standard_error = standard_error
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
    x_safe = np.maximum(np.asarray(x), 1e-10) # Убедимся, что x - это numpy array для np.power
    return a * np.power(x_safe, b)

def log_func(x, a, b):
    """Логарифмическая регрессия: y = a + b*log(x)"""
    x_safe = np.maximum(np.asarray(x), 1e-10) # Убедимся, что x - это numpy array для np.log
    return a + b * np.log(x_safe)

def quadratic_func(x, a, b, c):
    """Квадратичная регрессия: y = a*x^2 + b*x + c"""
    return a * x**2 + b * x + c

def trigonometric_func(x, a, b, c, d):
    """Тригонометрическая регрессия: y = a*sin(b*x + c) + d"""
    return a * np.sin(b * x + c) + d

def sigmoid_func(x, a, b, c):
    """Сигмоидная регрессия: y = c / (1 + exp(-a*(x-b)))"""
    x_arr = np.asarray(x) # Убедимся, что x - это numpy array
    z = -a * (x_arr - b)
    z = np.clip(z, -709, 709)
    return c / (1 + np.exp(z))

# Определение regression_types (ВАЖНО: было пропущено в исходном коде)
regression_types = [
    ("Power", power_func, 2),          # Имя, функция, количество параметров
    ("Logarithmic", log_func, 2),
    ("Quadratic", quadratic_func, 3),
    ("Trigonometric", trigonometric_func, 4),
    ("Sigmoid", sigmoid_func, 3)
]

def calculate_r_squared(y_true, y_pred):
    """Вычисляет коэффициент детерминации R²"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    ss_total = np.sum((y_true - np.mean(y_true))**2)
    ss_residual = np.sum((y_true - y_pred)**2)

    if ss_total == 0:
        # Если все y_true одинаковы, R^2 не определен или может быть 1 если y_pred тоже все одинаковы и равны y_true
        return 1.0 if ss_residual == 0 else 0.0

    r_squared = 1 - (ss_residual / ss_total)
    return r_squared # R² может быть отрицательным, если модель очень плохая. Обычно не обрезают.
                     # Если нужно обрезать: max(0, r_squared) или max(0, min(1, r_squared))

def calculate_sse(y_true, y_pred):
    """Вычисляет сумму квадратов ошибок (SSE)"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return np.sum((y_true - y_pred)**2)

def perform_simple_linear_regression(df: pd.DataFrame, dependent_var: str = None, independent_var: str = None) -> Tuple[List[RegressionData], List[str]]:
    logs = []
    results_list = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()
    n_cols = len(numerical_cols)

    if n_cols < 2:
        logs.append("Skipping regression analysis: Need at least 2 numerical columns.")
        return [], logs

    if dependent_var is not None and independent_var is not None:
        if dependent_var not in df.columns:
            logs.append(f"Error: Dependent variable '{dependent_var}' not found in data.")
            return [], logs
        if independent_var not in df.columns:
            logs.append(f"Error: Independent variable '{independent_var}' not found in data.")
            return [], logs

        if dependent_var not in numerical_cols:
            logs.append(f"Error: Dependent variable '{dependent_var}' is not numeric.")
            return [], logs
        if independent_var not in numerical_cols:
            logs.append(f"Error: Independent variable '{independent_var}' is not numeric.")
            return [], logs

        selected_pairs = [(dependent_var, independent_var)]
        logs.append(f"Using specified variables: Y = {dependent_var}, X = {independent_var}")
    else:
        logs.append(f"Found {n_cols} numerical columns for regression analysis: {', '.join(numerical_cols)}")
        selected_pairs = [(numerical_cols[i], numerical_cols[j])
                          for i in range(n_cols)
                          for j in range(n_cols)
                          if i != j]

    for y_col_name, x_col_name in selected_pairs:
        log_prefix = f"Regression {y_col_name} ~ {x_col_name}: "

        temp_df = df[[y_col_name, x_col_name]].dropna()
        n_valid = len(temp_df)

        if n_valid <= 2: # Для OLS с константой нужно > 2 точек
            logs.append(log_prefix + f"Skipped (insufficient data: n={n_valid} <= 2 required).")
            continue

        y_data = temp_df[y_col_name].values
        x_data = temp_df[x_col_name].values

        if np.var(y_data) < 1e-9 or np.var(x_data) < 1e-9: # Добавил небольшой порог для сравнения с нулем
            logs.append(log_prefix + f"Skipped (near zero variance in Y or X).")
            continue

        all_models_for_pair = [] # Модели для текущей пары X, Y

        # 1. Линейная регрессия через statsmodels (OLS)
        try:
            x_data_with_const = sm.add_constant(x_data, has_constant='raise')
            logs.append(f"DEBUG: {log_prefix}Linear regression - Added constant to X data, shape: {x_data_with_const.shape}")

            model = sm.OLS(y_data, x_data_with_const)
            results = model.fit()
            logs.append(f"DEBUG: {log_prefix}Linear regression - Model fitted successfully")
            logs.append(f"DEBUG: {log_prefix}Linear regression - Parameters: {results.params.to_dict()}")

            coefficients = []
            param_names_ols = ['const'] + [x_col_name] # statsmodels добавляет const первым, если X одномерный

            # results.params.index должен быть ['const', x_col_name] (или как названа колонка)
            # если x_data одномерный. Если x_data многомерный, порядок может отличаться.
            # Здесь x_data всегда одномерный.

            for idx, name_from_results in enumerate(results.params.index):
                # Убедимся, что имя соответствует ожидаемому или используем имя из results
                # В простой регрессии это 'const' и x_col_name
                var_name = str(name_from_results)

                if all(pd.notna(val) for val in [results.params.iloc[idx], results.bse.iloc[idx], results.tvalues.iloc[idx], results.pvalues.iloc[idx]]):
                    ci = results.conf_int(alpha=0.05).iloc[idx]
                    coef = RegressionCoefficient(
                        variable_name=var_name,
                        coefficient=float(results.params.iloc[idx]),
                        standard_error=float(results.bse.iloc[idx]),
                        t_statistic=float(results.tvalues.iloc[idx]),
                        p_value=float(results.pvalues.iloc[idx]),
                        ci_lower=float(ci[0]),
                        ci_upper=float(ci[1])
                    )
                    coefficients.append(coef)
                    logs.append(f"DEBUG: {log_prefix}Linear regression - Added coefficient: {var_name} = {results.params.iloc[idx]}")
                else:
                    logs.append(log_prefix + f"Skipping coefficient '{var_name}' due to NaN values in OLS results.")

            if coefficients and all(pd.notna(val) for val in [results.rsquared, results.rsquared_adj, results.fvalue, results.f_pvalue]):
                regression_result = RegressionData()
                regression_result.model_type = "Linear"
                regression_result.dependent_variable = y_col_name
                regression_result.independent_variables = [x_col_name]
                regression_result.r_squared = float(results.rsquared)
                regression_result.adjusted_r_squared = float(results.rsquared_adj)
                regression_result.f_statistic = float(results.fvalue)
                regression_result.prob_f_statistic = float(results.f_pvalue)
                regression_result.sse = float(results.ssr)
                regression_result.coefficients = coefficients
                regression_result.data_points = [
                    {"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)
                ]
                all_models_for_pair.append(regression_result)
                logs.append(log_prefix + "Linear model (OLS) fitted successfully.")
                logs.append(f"DEBUG: {log_prefix}Linear regression - Added to model list, total for pair: {len(all_models_for_pair)}")
            else:
                logs.append(log_prefix + "Skipped linear model (OLS) summary due to NaN in main metrics or no valid coefficients.")
                logs.append(f"DEBUG: {log_prefix}Linear regression (OLS) - Metrics: rsquared={results.rsquared}, rsquared_adj={results.rsquared_adj}, fvalue={results.fvalue}, f_pvalue={results.f_pvalue}")

        except PerfectSeparationError:
            logs.append(log_prefix + "Skipped linear model (OLS) (Perfect separation detected).")
        except ValueError as ve:
            logs.append(log_prefix + f"Skipped linear model (OLS) (ValueError during OLS setup/fit: {ve}).")
            logs.append(f"DEBUG: {log_prefix}Linear regression (OLS) - ValueError details: {str(ve)}")
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            logs.append(log_prefix + f"Skipped linear model (OLS) (Unexpected error: {e}).")
            logs.append(f"DEBUG: {log_prefix}Linear regression (OLS) - Exception details: {error_traceback}")

        # 2. Нелинейные регрессии через scipy.optimize.curve_fit
        for reg_type, func, n_params in regression_types:
            try:
                p0 = np.ones(n_params) # Начальные параметры

                # Для некоторых функций могут потребоваться более специфичные p0 или ограничения
                if reg_type in ["Power", "Logarithmic"] and np.any(x_data <= 1e-9): # небольшой порог
                    logs.append(log_prefix + f"Skipped {reg_type} model (non-positive values in X).")
                    continue

                params, pcov = curve_fit(func, x_data, y_data, p0=p0, maxfev=10000, check_finite=True)

                valid_covariance = pcov is not None and not np.any(np.isinf(pcov)) and np.all(np.diag(pcov) >= 0) # >=0, т.к. дисперсия может быть 0

                y_pred = func(x_data, *params)
                r_squared = calculate_r_squared(y_data, y_pred)
                sse = calculate_sse(y_data, y_pred)

                coefficients_nl = []
                param_names_map = {
                    "Power": ["a", "b"], "Logarithmic": ["a", "b"],
                    "Quadratic": ["a", "b", "c"], "Trigonometric": ["a", "b", "c", "d"],
                    "Sigmoid": ["a", "b", "c"]
                }
                current_param_names = param_names_map[reg_type]

                for idx, name in enumerate(current_param_names):
                    std_err = 0.0
                    ci_l, ci_u = params[idx], params[idx] # по умолчанию, если нет std_err
                    if valid_covariance and np.diag(pcov)[idx] > 1e-9: # чтобы избежать деления на 0 или корень из малого числа
                        std_err = np.sqrt(np.diag(pcov))[idx]
                        ci_l = float(params[idx] - 1.96 * std_err)
                        ci_u = float(params[idx] + 1.96 * std_err)
                    else: # Если ковариация невалидна или диагональный элемент слишком мал
                         logs.append(log_prefix + f"Warning: For {reg_type} model, coefficient '{name}', std_err could not be reliably estimated.")


                    coef = RegressionCoefficient(
                        variable_name=name, coefficient=float(params[idx]),
                        standard_error=float(std_err),
                        t_statistic=0.0, p_value=0.0, # Не применимо напрямую из curve_fit
                        ci_lower=ci_l, ci_upper=ci_u
                    )
                    coefficients_nl.append(coef)

                regression_result_nl = RegressionData()
                regression_result_nl.model_type = reg_type
                regression_result_nl.dependent_variable = y_col_name
                regression_result_nl.independent_variables = [x_col_name]
                regression_result_nl.r_squared = float(r_squared)
                regression_result_nl.adjusted_r_squared = float(r_squared) # Упрощение
                regression_result_nl.f_statistic = 0.0
                regression_result_nl.prob_f_statistic = 0.0
                regression_result_nl.sse = float(sse)
                regression_result_nl.coefficients = coefficients_nl
                regression_result_nl.data_points = [
                    {"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)
                ]
                all_models_for_pair.append(regression_result_nl)
                logs.append(log_prefix + f"{reg_type} model fitted. R²={r_squared:.4f}, SSE={sse:.4f}")

            except RuntimeError: # Часто возникает, когда curve_fit не может сойтись
                logs.append(log_prefix + f"Skipped {reg_type} model (RuntimeError: curve_fit could not find optimal parameters).")
            except Exception as e:
                logs.append(log_prefix + f"Skipped {reg_type} model (Error: {str(e)}).")


        # Резервная линейная регрессия через curve_fit, если OLS не удалась
        # и если линейная модель еще не была добавлена (например, если OLS выбросил исключение)
        if not any(model.model_type == "Linear" for model in all_models_for_pair):
            logs.append(log_prefix + "Trying to fit linear model with curve_fit as backup for OLS.")
            try:
                params_lin_cf, pcov_lin_cf = curve_fit(linear_func, x_data, y_data, p0=np.ones(2), maxfev=10000, check_finite=True)
                valid_covariance_lin_cf = pcov_lin_cf is not None and not np.any(np.isinf(pcov_lin_cf)) and np.all(np.diag(pcov_lin_cf) >= 0)

                y_pred_lin_cf = linear_func(x_data, *params_lin_cf)
                r_squared_lin_cf = calculate_r_squared(y_data, y_pred_lin_cf)
                sse_lin_cf = calculate_sse(y_data, y_pred_lin_cf)

                coefficients_lin_cf = []
                param_names_lin = ["slope (a)", "intercept (b)"] # Соответствует a*x + b
                
                for idx, name in enumerate(param_names_lin):
                    std_err_lc = 0.0
                    ci_l_lc, ci_u_lc = params_lin_cf[idx], params_lin_cf[idx]
                    if valid_covariance_lin_cf and np.diag(pcov_lin_cf)[idx] > 1e-9:
                        std_err_lc = np.sqrt(np.diag(pcov_lin_cf))[idx]
                        ci_l_lc = float(params_lin_cf[idx] - 1.96 * std_err_lc)
                        ci_u_lc = float(params_lin_cf[idx] + 1.96 * std_err_lc)
                    else:
                        logs.append(log_prefix + f"Warning: For Linear (curve_fit) model, coefficient '{name}', std_err could not be reliably estimated.")

                    # Для соответствия OLS, где первый коэффициент - наклон X, второй - константа
                    # если statsmodels OLS даёт [const, x_col_name], а linear_func(x, a, b) это a*x + b
                    # то a -> slope, b -> intercept.
                    # В нашем RegressionCoefficient: variable_name="x" для slope, variable_name="const" для intercept
                    var_name_map = {"slope (a)": x_col_name, "intercept (b)": "const"}

                    coef_lc = RegressionCoefficient(
                        variable_name=var_name_map[name], coefficient=float(params_lin_cf[idx]),
                        standard_error=float(std_err_lc),
                        t_statistic=0.0, p_value=0.0,
                        ci_lower=ci_l_lc, ci_upper=ci_u_lc
                    )
                    coefficients_lin_cf.append(coef_lc)
                
                # Порядок коэффициентов: statsmodels OLS обычно [const, slope], curve_fit [slope, const]
                # Нужно обеспечить единообразие или четко документировать
                # Если OLS выдает const первым, а x_col_name вторым, а наш RegressionCoefficient
                # ожидает variable_name ('const' или x_col_name), то OLS часть уже корректна.
                # Для curve_fit (a*x+b): params_lin_cf[0] это 'a' (slope), params_lin_cf[1] это 'b' (intercept)
                # Поменяем порядок для единообразия с OLS (const, потом slope)
                # Если в OLS было const, X1, то тут тоже сделаем const, X1
                # Пересортируем coefficients_lin_cf, чтобы 'const' был первым, если есть
                coefficients_lin_cf.sort(key=lambda c: 0 if c.variable_name == "const" else 1)


                regression_result_lin_cf = RegressionData()
                regression_result_lin_cf.model_type = "Linear" # Отмечаем, что это линейная
                regression_result_lin_cf.dependent_variable = y_col_name
                regression_result_lin_cf.independent_variables = [x_col_name]
                regression_result_lin_cf.r_squared = float(r_squared_lin_cf)
                regression_result_lin_cf.adjusted_r_squared = float(r_squared_lin_cf)
                regression_result_lin_cf.f_statistic = 0.0
                regression_result_lin_cf.prob_f_statistic = 0.0
                regression_result_lin_cf.sse = float(sse_lin_cf)
                regression_result_lin_cf.coefficients = coefficients_lin_cf
                regression_result_lin_cf.data_points = [
                    {"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)
                ]
                all_models_for_pair.append(regression_result_lin_cf)
                logs.append(log_prefix + f"Linear model (curve_fit backup) fitted. R²={r_squared_lin_cf:.4f}, SSE={sse_lin_cf:.4f}")

            except RuntimeError:
                logs.append(log_prefix + f"Failed to fit linear model with curve_fit (RuntimeError).")
            except Exception as e:
                logs.append(log_prefix + f"Failed to fit linear model with curve_fit (Error: {str(e)}).")

        results_list.extend(all_models_for_pair)

    if not results_list:
        logs.append("No regression models could be fitted for any pair of variables.")

    return results_list, logs