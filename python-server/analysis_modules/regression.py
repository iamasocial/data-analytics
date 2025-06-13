# python-server/analysis_modules/regression.py
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError
from typing import List, Dict, Any, Tuple
from scipy.optimize import curve_fit
from scipy.signal import find_peaks
import sys 
from scipy import stats # <--- ВАЖНЫЙ ИМПОРТ

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
        self.sse = 0.0  # Сумма квадратов ошибок (Residual Sum of Squares)
        self.coefficients = []
        self.data_points = []
        self.residuals = []  # Остатки регрессии для анализа нормальности

class RegressionCoefficient:
    def __init__(self, variable_name="", coefficient=0.0, standard_error=0.0,
                 t_statistic=0.0, p_value=1.0, ci_lower=0.0, ci_upper=0.0): # p_value по умолчанию 1.0
        self.variable_name = variable_name
        self.coefficient = coefficient
        self.standard_error = standard_error
        self.t_statistic = t_statistic
        self.p_value = p_value
        self.confidence_interval_lower = ci_lower
        self.confidence_interval_upper = ci_upper

# Функции для различных типов регрессий
def linear_func(x, a, b):
    return a * np.asarray(x) + b

def power_func(x, a, b):
    x_safe = np.maximum(np.asarray(x), 1e-10) 
    return a * np.power(x_safe, b)

def log_func(x, a, b):
    x_safe = np.maximum(np.asarray(x), 1e-10)
    return a + b * np.log(x_safe)

def quadratic_func(x, a, b, c):
    return a * np.asarray(x)**2 + b * np.asarray(x) + c

def trigonometric_func(x, a, b, c, d):
    return a * np.sin(b * np.asarray(x) + c) + d

def sigmoid_func(x, k, x0, l_param): 
    x_arr = np.asarray(x) 
    z = -k * (x_arr - x0)
    z = np.clip(z, -709, 709)
    return l_param / (1 + np.exp(z))

regression_types = [
    ("Power", power_func, 2),
    ("Logarithmic", log_func, 2),
    ("Quadratic", quadratic_func, 3),
    ("Trigonometric", trigonometric_func, 4),
    ("Sigmoid", sigmoid_func, 3)
]

def calculate_r_squared(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    ss_total = np.sum((y_true - np.mean(y_true))**2)
    ss_residual = np.sum((y_true - y_pred)**2)
    if ss_total == 0:
        return 1.0 if ss_residual < 1e-9 else 0.0
    r_squared = 1 - (ss_residual / ss_total)
    return r_squared

def calculate_sse(y_true, y_pred):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return np.sum((y_true - y_pred)**2)

def estimate_dominant_frequency(x_data: np.ndarray, y_data: np.ndarray, min_points_for_fft: int = 10) -> float | None:
    n = len(y_data)
    if n < min_points_for_fft: return None
    y_detrended = y_data - np.mean(y_data)
    yf = np.fft.fft(y_detrended)
    if n > 1:
        x_spacing = (np.max(x_data) - np.min(x_data)) / (n - 1)
        if x_spacing < 1e-9: return None
    else: return None
    freq = np.fft.fftfreq(n, d=x_spacing)
    positive_freq_indices = np.where((freq > 1e-9))[0]
    if len(positive_freq_indices) == 0: return None
    amplitudes = np.abs(yf[positive_freq_indices])
    peaks_indices, properties = find_peaks(amplitudes, height=np.max(amplitudes)*0.1, distance=1)
    if len(peaks_indices) == 0: return None
    dominant_peak_index_in_amplitudes = peaks_indices[np.argmax(properties["peak_heights"])]
    dominant_freq = freq[positive_freq_indices[dominant_peak_index_in_amplitudes]]
    return dominant_freq

def perform_simple_linear_regression(df: pd.DataFrame, dependent_var: str = None, independent_var: str = None) -> Tuple[List[RegressionData], List[str]]:
    logs = []
    results_list = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()
    n_cols = len(numerical_cols)

    if n_cols < 2:
        logs.append("Skipping regression analysis: Need at least 2 numerical columns.")
        return [], logs

    if dependent_var is not None and independent_var is not None:
        if dependent_var not in df.columns or independent_var not in df.columns or \
           dependent_var not in numerical_cols or independent_var not in numerical_cols:
            logs.append(f"Error: Invalid or non-numeric variables selected for regression: Y={dependent_var}, X={independent_var}")
            return [], logs
        selected_pairs = [(dependent_var, independent_var)]
        logs.append(f"Using specified variables: Y = {dependent_var}, X = {independent_var}")
    else:
        logs.append(f"Found {n_cols} numerical columns for pair-wise regression: {', '.join(numerical_cols)}")
        selected_pairs = [(numerical_cols[i], numerical_cols[j])
                          for i in range(n_cols) for j in range(n_cols) if i != j]

    for y_col_name, x_col_name in selected_pairs:
        log_prefix = f"Regression {y_col_name} ~ {x_col_name}: "
        temp_df = df[[y_col_name, x_col_name]].dropna()
        n_valid = len(temp_df)

        if n_valid <= 2: 
            logs.append(log_prefix + f"Skipped (insufficient data: n={n_valid} <= 2 required for OLS with intercept).")
            continue

        y_data = temp_df[y_col_name].values.astype(float)
        x_data = temp_df[x_col_name].values.astype(float)

        if np.var(y_data) < 1e-9 or np.var(x_data) < 1e-9:
            logs.append(log_prefix + f"Skipped (near zero variance in Y or X).")
            continue

        all_models_for_pair = []
        ss_total_for_pair = np.sum((y_data - np.mean(y_data))**2)
        if ss_total_for_pair < 1e-12: 
            logs.append(log_prefix + f"Skipped (near zero variance in dependent variable Y).")
            continue

        # 1. Линейная регрессия через statsmodels (OLS)
        try:
            x_data_with_const = sm.add_constant(x_data, has_constant='raise')
            model = sm.OLS(y_data, x_data_with_const)
            results = model.fit()
            coefficients = []
            param_names_ols = results.model.exog_names 
            
            for idx, name_from_results in enumerate(param_names_ols):
                var_name = str(name_from_results)
                actual_var_name = x_col_name if var_name != 'const' else 'const' # Обеспечиваем правильное имя

                if all(pd.notna(val) for val in [results.params[idx], results.bse[idx], results.tvalues[idx], results.pvalues[idx]]):
                    ci = results.conf_int(alpha=0.05).iloc[idx]
                    coef = RegressionCoefficient(
                        variable_name=actual_var_name, coefficient=float(results.params[idx]),
                        standard_error=float(results.bse[idx]), t_statistic=float(results.tvalues[idx]),
                        p_value=float(results.pvalues[idx]), ci_lower=float(ci[0]), ci_upper=float(ci[1])
                    )
                    coefficients.append(coef)
            if coefficients and all(pd.notna(val) for val in [results.rsquared, results.rsquared_adj, results.fvalue, results.f_pvalue, results.ssr]):
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
                regression_result.data_points = [{"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)]
                y_pred_ols = results.predict(x_data_with_const)
                regression_result.residuals = (y_data - y_pred_ols).tolist()
                all_models_for_pair.append(regression_result)
                logs.append(log_prefix + f"Linear model (OLS) fitted. R²={results.rsquared:.4f}, F={results.fvalue:.2f} (p={results.f_pvalue:.3g})")
            else:
                logs.append(log_prefix + "OLS: Skipping summary due to NaN in main metrics or no valid coefficients.")
        except PerfectSeparationError:
            logs.append(log_prefix + "Skipped OLS (Perfect separation detected).")
        except ValueError as ve:
            logs.append(log_prefix + f"Skipped OLS (ValueError: {ve}).")
        except Exception as e:
            logs.append(log_prefix + f"Skipped OLS (Unexpected error: {e}).")

        # 2. Нелинейные регрессии и линейная через curve_fit
        models_to_try_cf = regression_types 
        if not any(m.model_type == "Linear" for m in all_models_for_pair):
            models_to_try_cf = [("Linear (curve_fit)", linear_func, 2)] + models_to_try_cf
        
        for reg_type_tuple_cf in models_to_try_cf:
            reg_type, func, n_params_in_signature = reg_type_tuple_cf
            is_linear_curve_fit = (reg_type == "Linear (curve_fit)")
            current_n_params = n_params_in_signature
            
            if n_valid <= current_n_params: 
                logs.append(log_prefix + f"Skipped {reg_type} (insufficient data: n={n_valid} <= n_params={current_n_params}).")
                continue
            
            try:
                p0 = np.ones(current_n_params)
                bounds = (-np.inf, np.inf)
                method_for_curve_fit = 'lm' 
                current_maxfev = 10000 * current_n_params 

                if reg_type == "Trigonometric":
                    y_mean_trig = np.mean(y_data); y_amplitude_trig = (np.max(y_data) - np.min(y_data)) / 2.0
                    if y_amplitude_trig < 1e-6: y_amplitude_trig = 1.0
                    x_range_trig = np.max(x_data) - np.min(x_data)
                    b_initial_trig = (2 * np.pi) / x_range_trig if x_range_trig > 1e-6 else np.pi
                    dominant_freq_est = estimate_dominant_frequency(x_data, y_data)
                    if dominant_freq_est is not None and dominant_freq_est > 1e-6:
                        b_fft_est = 2 * np.pi * dominant_freq_est
                        if 1e-3 < b_fft_est < 1000: b_initial_trig = b_fft_est
                    b_low_trig = max(1e-3, (2 * np.pi) / (x_range_trig * 20)) if x_range_trig > 1e-6 else 1e-3
                    b_high_trig = min(1000, (2 * np.pi * (n_valid / 2)) / x_range_trig) if x_range_trig > 1e-6 else 1000
                    if b_low_trig >= b_high_trig : b_low_trig = 1e-3; b_high_trig = max(b_low_trig*10, 100.0)
                    b_initial_trig = np.clip(b_initial_trig, b_low_trig, b_high_trig)
                    p0 = [y_amplitude_trig, b_initial_trig, 0.0, y_mean_trig]
                    bounds = ([1e-9, b_low_trig, -np.pi, -np.inf], [np.inf, b_high_trig, np.pi, np.inf])
                    method_for_curve_fit = 'trf'; current_maxfev = max(current_maxfev, 30000 * current_n_params)

                    if reg_type == "Sigmoid":
                        y_min_s, y_max_s = np.min(y_data), np.max(y_data)
                        x_min_s, x_max_s = np.min(x_data), np.max(x_data)
                        l_param0 = y_max_s
                        if abs(y_max_s - y_min_s) < 1e-6: l_param0 = y_max_s + 1.0 if abs(y_max_s) < 1e-6 else y_max_s
                        x0_0 = np.median(x_data)
                        k0_val = 1.0
                        y_range_s = y_max_s - y_min_s; x_range_s = x_max_s - x_min_s
                        if x_range_s > 1e-6 and y_range_s > 1e-6:
                            try: 
                                # Улучшенная оценка начального наклона
                                # Находим точки в середине диапазона Y для лучшей оценки наклона в точке перегиба
                                mid_y = y_min_s + y_range_s * 0.5
                                mid_indices = np.argsort(np.abs(y_data - mid_y))[:max(3, n_valid // 5)]  # Берем до 20% точек ближайших к середине
                                if len(mid_indices) >= 3:  # Если достаточно точек для оценки
                                    mid_x = x_data[mid_indices]
                                    mid_y_actual = y_data[mid_indices]
                                    # Линейная регрессия на этом участке даст хорошую оценку наклона в точке перегиба
                                    slope_mid = np.polyfit(mid_x, mid_y_actual, 1)[0]
                                    # Для сигмоиды максимальный наклон = k*L/4, отсюда k = 4*slope/L
                                    k0_val = 4 * slope_mid / l_param0 if abs(l_param0) > 1e-6 else slope_mid
                                else:
                                    slope_sign = np.sign(np.polyfit(x_data, y_data, 1)[0])
                                    k0_val = slope_sign * 4 / (x_range_s * 0.5)
                                
                                # Ограничиваем k в разумных пределах
                                k0_val = np.clip(k0_val, -100/ (x_range_s if x_range_s >0.1 else 0.1), 100 / (x_range_s if x_range_s > 0.1 else 0.1))
                                if abs(k0_val) < 1e-3: k0_val = slope_sign * 1e-3 if k0_val !=0 else 1e-3
                            except Exception as e:
                                logs.append(log_prefix + f"Warning during sigmoid k0 estimation: {e}. Using default value.")
                                k0_val = 1.0
                        
                        # Оценка x0 - точки перегиба
                        try:
                            # Находим точку, где y примерно равно половине максимума
                            half_height = y_min_s + y_range_s * 0.5
                            closest_idx = np.argmin(np.abs(y_data - half_height))
                            x0_0 = x_data[closest_idx]  # Это лучшая оценка точки перегиба x0
                        except:
                            x0_0 = np.median(x_data)  # Запасной вариант
                        
                        p0 = [k0_val, x0_0, l_param0] 
                        l_low_bound = y_min_s - 0.2 * abs(y_range_s); l_high_bound = y_max_s + 0.2 * abs(y_range_s)
                        if abs(y_range_s) < 1e-3: 
                            l_low_bound = min(y_min_s, l_param0) - 0.5 * abs(l_param0 if l_param0 !=0 else 1.0)
                            l_high_bound = max(y_max_s, l_param0) + 0.5 * abs(l_param0 if l_param0 !=0 else 1.0)
                        if l_high_bound <= l_low_bound + 1e-3 : l_high_bound = l_low_bound + max(1.0, 0.1*abs(l_low_bound))
                        x_range_s_eff = x_range_s if x_range_s > 1e-6 else 1.0 
                        k_abs_max = 1000 / (x_range_s_eff if x_range_s_eff > 0.01 else 0.01)
                        bounds = ([-k_abs_max, x_min_s - 0.1*x_range_s_eff, l_low_bound], 
                                  [k_abs_max,  x_max_s + 0.1*x_range_s_eff,  l_high_bound])
                        method_for_curve_fit = 'trf'
                        current_maxfev = max(current_maxfev, 50000 * current_n_params)  # Увеличиваем количество итераций
                
                if reg_type == "Linear (curve_fit)":
                    slope_init = (np.mean(y_data*x_data) - np.mean(y_data)*np.mean(x_data)) / (np.mean(x_data**2) - np.mean(x_data)**2) if np.var(x_data)>1e-9 else 1.0
                    if np.isnan(slope_init) or np.isinf(slope_init): slope_init = 1.0
                    intercept_init = np.mean(y_data) - slope_init*np.mean(x_data)
                    if np.isnan(intercept_init) or np.isinf(intercept_init): intercept_init = 0.0
                    p0 = [slope_init, intercept_init]

                    if reg_type in ["Power", "Logarithmic"] and np.any(x_data <= 1e-9):
                        logs.append(log_prefix + f"Skipped {reg_type} (non-positive X values).")
                        continue

                params, pcov = curve_fit(func, x_data, y_data, p0=p0, bounds=bounds, method=method_for_curve_fit, maxfev=current_maxfev, check_finite=True, ftol=1e-7, xtol=1e-7, gtol=1e-7)
                
                valid_covariance = False
                diag_pcov_elements = np.array([np.nan] * current_n_params) 
                if pcov is not None and not np.any(np.isinf(pcov)) and not np.any(np.isnan(pcov)):
                    try:
                        diag_pcov_raw = np.diag(pcov)
                        valid_indices = ~np.isinf(diag_pcov_raw) & ~np.isnan(diag_pcov_raw)
                        if np.all(diag_pcov_raw[valid_indices] >= -1e-9): 
                            diag_pcov_elements = np.where(valid_indices, diag_pcov_raw, np.nan)
                            diag_pcov_elements[diag_pcov_elements < 0] = 0 
                            valid_covariance = not np.all(np.isnan(diag_pcov_elements)) 
                    except Exception as e_cov: 
                        logs.append(log_prefix + f"Warning: Could not extract covariance diagonal: {e_cov}")
                else:
                    # Если ковариация не может быть оценена, логируем это
                    if pcov is None:
                        logs.append(log_prefix + f"Warning: Covariance matrix is None for {reg_type} model.")
                    elif np.any(np.isinf(pcov)):
                        logs.append(log_prefix + f"Warning: Infinite values in covariance matrix for {reg_type} model.")
                    elif np.any(np.isnan(pcov)):
                        logs.append(log_prefix + f"Warning: NaN values in covariance matrix for {reg_type} model.")
                    
                    # Для сигмоидной модели это частая проблема, попробуем улучшить оценку
                    if reg_type == "Sigmoid" and not valid_covariance:
                        logs.append(log_prefix + f"Attempting to improve Sigmoid model fit with different initial values.")
                        # Пробуем альтернативные начальные значения
                        try:
                            # Пробуем несколько разных начальных значений для k
                            for k_factor in [0.5, 2.0, 0.1, 10.0]:
                                alt_p0 = [p0[0] * k_factor, p0[1], p0[2]]
                                try:
                                    alt_params, alt_pcov = curve_fit(func, x_data, y_data, p0=alt_p0, bounds=bounds, 
                                                                    method=method_for_curve_fit, maxfev=current_maxfev)
                                    if alt_pcov is not None and not np.any(np.isinf(alt_pcov)) and not np.any(np.isnan(alt_pcov)):
                                        params, pcov = alt_params, alt_pcov
                                        logs.append(log_prefix + f"Found better initial values with k_factor={k_factor}")
                                        break
                                except:
                                    continue
                        except Exception as alt_e:
                            logs.append(log_prefix + f"Alternative fitting attempt failed: {alt_e}")

                y_pred_cf = func(x_data, *params)
                r_squared_val = calculate_r_squared(y_data, y_pred_cf)
                sse_val = calculate_sse(y_data, y_pred_cf)
                
                adj_r_squared_val = np.nan
                if pd.notna(r_squared_val) and n_valid > current_n_params : 
                    if (n_valid - current_n_params -1) > 0 : 
                         adj_r_squared_val = 1 - (1 - r_squared_val) * (n_valid - 1) / (n_valid - current_n_params - 1)
                    elif n_valid > current_n_params:
                        adj_r_squared_val = r_squared_val 

                f_statistic_val, prob_f_statistic_val = np.nan, np.nan
                
                # Не вычисляем F-статистику для сигмоидной и тригонометрической моделей
                if reg_type in ["Sigmoid", "Trigonometric"]:
                    f_statistic_val = np.nan
                    prob_f_statistic_val = np.nan
                elif pd.notna(sse_val) and ss_total_for_pair > 1e-12 and n_valid > current_n_params:
                    df_model_cf = current_n_params 
                    df_error_cf = n_valid - current_n_params 
                    if df_error_cf > 0 and df_model_cf > 0: 
                        ss_model_cf = ss_total_for_pair - sse_val
                        if ss_model_cf < 0: ss_model_cf = 0 
                        ms_model_cf = ss_model_cf / df_model_cf
                        ms_error_cf = sse_val / df_error_cf
                        if ms_error_cf > 1e-12: 
                            f_statistic_val = ms_model_cf / ms_error_cf
                            if f_statistic_val < 0: f_statistic_val = 0.0 
                            try: prob_f_statistic_val = stats.f.sf(f_statistic_val, df_model_cf, df_error_cf)
                            except (ValueError, FloatingPointError): prob_f_statistic_val = np.nan
                        elif sse_val <= 1e-12 : 
                            f_statistic_val = np.inf if ss_model_cf > 1e-12 else 0.0
                            prob_f_statistic_val = 0.0 if ss_model_cf > 1e-12 else 1.0
                
                coefficients_cf = []
                param_names_map = {
                    "Power": ["a", "b"], "Logarithmic": ["a", "b"],
                    "Quadratic": ["a", "b", "c"], "Trigonometric": ["a", "b", "c", "d"],
                    "Sigmoid": ["a", "b", "c"],
                    "Linear (curve_fit)": [x_col_name, "const"] 
                }
                current_param_names_list_cf = param_names_map.get(reg_type, [f"p{i+1}" for i in range(current_n_params)])

                for idx, name_cf in enumerate(current_param_names_list_cf):
                    std_err_cf, t_stat_cf, p_val_cf = np.nan, np.nan, np.nan
                    ci_l_cf, ci_u_cf = params[idx], params[idx] 

                    # Не вычисляем t-статистику для сигмоидной и тригонометрической моделей
                    if reg_type in ["Sigmoid", "Trigonometric"]:
                        std_err_cf = np.nan
                        t_stat_cf = np.nan
                        p_val_cf = np.nan
                        ci_l_cf, ci_u_cf = np.nan, np.nan
                    elif valid_covariance and idx < len(diag_pcov_elements) and pd.notna(diag_pcov_elements[idx]) and diag_pcov_elements[idx] >= 0:
                        param_variance_cf = diag_pcov_elements[idx]
                        if param_variance_cf > 1e-12: 
                            std_err_cf = np.sqrt(param_variance_cf)
                            df_error_t_cf = n_valid - current_n_params 
                            if df_error_t_cf > 0:
                                try: 
                                    t_stat_cf = params[idx] / std_err_cf
                                    p_val_cf = stats.t.sf(np.abs(t_stat_cf), df_error_t_cf) * 2 
                                except (ValueError, FloatingPointError): t_stat_cf, p_val_cf = np.nan, np.nan
                                try: 
                                    t_crit_cf = stats.t.ppf(1 - 0.05/2, df_error_t_cf) 
                                    ci_l_cf = float(params[idx] - t_crit_cf * std_err_cf)
                                    ci_u_cf = float(params[idx] + t_crit_cf * std_err_cf)
                                except (ValueError, FloatingPointError): ci_l_cf, ci_u_cf = np.nan, np.nan
                        else: 
                            std_err_cf = 0.0 
                            if abs(params[idx]) > 1e-9 : t_stat_cf = np.inf * np.sign(params[idx]); p_val_cf = 0.0
                            else: t_stat_cf = 0.0; p_val_cf = 1.0
                    
                    coefficients_cf.append(RegressionCoefficient(
                        variable_name=name_cf, coefficient=float(params[idx]),
                        standard_error=float(std_err_cf) if pd.notna(std_err_cf) else 0.0,
                        t_statistic=float(t_stat_cf) if pd.notna(t_stat_cf) else 0.0,
                        p_value=float(p_val_cf) if pd.notna(p_val_cf) else 1.0,
                        ci_lower=float(ci_l_cf) if pd.notna(ci_l_cf) else float(params[idx]),
                        ci_upper=float(ci_u_cf) if pd.notna(ci_u_cf) else float(params[idx])
                    ))
                
                if is_linear_curve_fit and current_param_names_list_cf == [x_col_name, "const"]:
                     const_obj_idx = next((i for i, c in enumerate(coefficients_cf) if c.variable_name == "const"), -1)
                     slope_obj_idx = next((i for i, c in enumerate(coefficients_cf) if c.variable_name == x_col_name), -1)
                     if const_obj_idx != -1 and slope_obj_idx != -1 and const_obj_idx > slope_obj_idx: 
                         coefficients_cf[const_obj_idx], coefficients_cf[slope_obj_idx] = coefficients_cf[slope_obj_idx], coefficients_cf[const_obj_idx]

                final_model_type_name = "Linear" if is_linear_curve_fit else reg_type

                regression_result_cf = RegressionData()
                regression_result_cf.model_type = final_model_type_name
                regression_result_cf.dependent_variable = y_col_name
                regression_result_cf.independent_variables = [x_col_name]
                regression_result_cf.r_squared = float(r_squared_val) if pd.notna(r_squared_val) else 0.0
                regression_result_cf.adjusted_r_squared = float(adj_r_squared_val) if pd.notna(adj_r_squared_val) else 0.0
                regression_result_cf.f_statistic = float(f_statistic_val) if pd.notna(f_statistic_val) else 0.0
                regression_result_cf.prob_f_statistic = float(prob_f_statistic_val) if pd.notna(prob_f_statistic_val) else 1.0
                regression_result_cf.sse = float(sse_val) if pd.notna(sse_val) else 0.0
                regression_result_cf.coefficients = coefficients_cf
                regression_result_cf.data_points = [{"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)]
                regression_result_cf.residuals = (y_data - y_pred_cf).tolist()
                
                can_add_cf_model = True
                if is_linear_curve_fit: 
                    if any(m.model_type == "Linear" for m in all_models_for_pair): 
                        can_add_cf_model = False 
                        logs.append(log_prefix + "Skipping Linear (curve_fit) as OLS Linear model already exists.")
                
                if can_add_cf_model:
                    all_models_for_pair.append(regression_result_cf)
                    logs.append(log_prefix + f"{reg_type} model fitted. R²={r_squared_val:.4f}, F={f_statistic_val:.2f} (p={prob_f_statistic_val:.3g})")

            except RuntimeError as rte_cf: 
                logs.append(log_prefix + f"Skipped {reg_type} (RuntimeError: {rte_cf}).")
            except ValueError as ve_cf:
                logs.append(log_prefix + f"Skipped {reg_type} (ValueError: {ve_cf}).")
            except Exception as e_cf_model: 
                logs.append(log_prefix + f"Skipped {reg_type} (Unexpected error: {e_cf_model}). Details: {str(e_cf_model)}")

        results_list.extend(all_models_for_pair)

    if not results_list:
        logs.append("No regression models could be fitted for any pair of variables.")
    return results_list, logs

def print_regression_results(results_list: List[RegressionData], logs: List[str]):
    print("---- Regression Logs ----")
    for log_entry in logs:
        print(log_entry)
    print("\n---- Regression Results ----")
    if not results_list:
        print("No models were successfully fitted.")
        return
    for result in results_list:
        print(f"\nModel Type: {result.model_type}")
        print(f"Dependent Variable: {result.dependent_variable}")
        print(f"Independent Variable(s): {', '.join(result.independent_variables)}")
        print(f"R-squared: {result.r_squared:.4f}")
        print(f"Adjusted R-squared: {result.adjusted_r_squared:.4f}")
        print(f"F-statistic: {result.f_statistic:.4f} (p-value: {result.prob_f_statistic:.4g})")
        print(f"SSE: {result.sse:.4f}")
        print("Coefficients:")
        for coef in result.coefficients:
            print(f"  {coef.variable_name}: {coef.coefficient:.4f} "
                  f"(StdErr: {coef.standard_error:.4f}, "
                  f"t-stat: {coef.t_statistic:.4f}, "
                  f"p-value: {coef.p_value:.4g}, "
                  f"CI: [{coef.confidence_interval_lower:.4f}, {coef.confidence_interval_upper:.4f}])")

if __name__ == '__main__':
    data_size = 50
    np.random.seed(43) # Changed seed slightly for variety
    
    # Sigmoid Test
    x_test_sig = np.linspace(-2, 12, data_size) # Wider range for x0=5
    y_true_sig = 10 / (1 + np.exp(-1.5 * (x_test_sig - 5))) # k=1.5, x0=5, L=10
    y_noise_sig = y_true_sig + np.random.normal(0, 0.8, data_size) # Slightly more noise
    df_test_sig = pd.DataFrame({'X_sig': x_test_sig, 'Y_sig': y_noise_sig})
    print("\n--- Testing Sigmoid Regression (perform_simple_linear_regression) ---")
    results_sig, logs_sig = perform_simple_linear_regression(df_test_sig, dependent_var='Y_sig', independent_var='X_sig')
    print_regression_results(results_sig, logs_sig)

    # Linear Test
    x_lin = np.linspace(0, 10, data_size)
    y_lin_true = -3 * x_lin + 15
    y_lin_noise = y_lin_true + np.random.normal(0, 2, data_size)
    df_lin_test = pd.DataFrame({'X_linear': x_lin, 'Y_linear': y_lin_noise})
    print("\n--- Testing Linear Regression (OLS and curve_fit backup) ---")
    results_lin, logs_lin = perform_simple_linear_regression(df_lin_test, dependent_var='Y_linear', independent_var='X_linear')
    print_regression_results(results_lin, logs_lin)
    
    # Trigonometric Test
    x_trig = np.linspace(0, 3 * np.pi, data_size * 2) 
    y_true_trig = 3 * np.sin(1.2 * x_trig - 0.5) + 7 # a=3, b=1.2, c=-0.5, d=7
    y_noise_trig = y_true_trig + np.random.normal(0, 0.7, data_size*2)
    df_test_trig = pd.DataFrame({'X_trig': x_trig, 'Y_trig': y_noise_trig})
    print("\n--- Testing Trigonometric Regression ---")
    results_trig_main, logs_trig_main = perform_simple_linear_regression(df_test_trig, dependent_var='Y_trig', independent_var='X_trig')
    print_regression_results(results_trig_main, logs_trig_main)

    # Test with low variance Y
    df_low_var_y = pd.DataFrame({'X': np.random.rand(20), 'Y_low_var': np.full(20, 5.0) + np.random.normal(0, 1e-7, 20)})
    print("\n--- Testing Low Variance Y ---")
    results_low_y, logs_low_y = perform_simple_linear_regression(df_low_var_y, dependent_var='Y_low_var', independent_var='X')
    print_regression_results(results_low_y, logs_low_y)

    # Test with insufficient data
    df_insufficient = pd.DataFrame({'X': [1,2], 'Y': [1,2]})
    print("\n--- Testing Insufficient Data ---")
    results_ins, logs_ins = perform_simple_linear_regression(df_insufficient, dependent_var='Y', independent_var='X')
    print_regression_results(results_ins, logs_ins)