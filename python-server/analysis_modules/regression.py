# python-server/analysis_modules/regression.py
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tools.sm_exceptions import PerfectSeparationError
from typing import List, Dict, Any, Tuple
from scipy.optimize import curve_fit
from scipy.signal import find_peaks
import sys # Добавлено для отладочного вывода в stderr
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

def estimate_dominant_frequency(x_data: np.ndarray, y_data: np.ndarray, min_points_for_fft: int = 10) -> float | None:
    """
    Оценивает доминирующую частоту в y_data с использованием FFT.
    Возвращает частоту в циклах на единицу x или None.
    """
    n = len(y_data)
    if n < min_points_for_fft: # Требуем минимальное количество точек для осмысленного FFT
        return None

    # Вычитаем среднее, чтобы убрать компоненту с нулевой частотой из основного пика
    y_detrended = y_data - np.mean(y_data)

    # FFT
    yf = np.fft.fft(y_detrended)
    # Частоты, соответствующие yf. x_spacing - средний интервал между точками x
    # Если x_data не отсортированы или имеют большие пропуски, это может быть неточно.
    # Предполагаем, что x_data более-менее упорядочены.
    if n > 1:
        x_spacing = (np.max(x_data) - np.min(x_data)) / (n - 1)
        if x_spacing < 1e-9: # Если все x одинаковы
             return None
    else:
        return None # Невозможно определить интервал для одной точки

    # Получаем частоты для FFT (в циклах на единицу x)
    # Используем x_spacing как интервал дискретизации
    freq = np.fft.fftfreq(n, d=x_spacing)

    # Интересуют только положительные частоты (первая половина спектра)
    # и исключаем нулевую частоту (постоянную составляющую, которую мы уже убрали)
    positive_freq_indices = np.where((freq > 1e-9))[0] # 1e-9 чтобы точно исключить 0
    
    if len(positive_freq_indices) == 0:
        return None # Нет положительных частот (например, если все y_data одинаковы после вычитания среднего)

    # Амплитуды для положительных частот
    amplitudes = np.abs(yf[positive_freq_indices])
    
    # Используем find_peaks для поиска пиков в амплитудном спектре
    # height - минимальная высота пика (можно настроить)
    # distance - минимальное расстояние между пиками (можно настроить)
    peaks_indices, properties = find_peaks(amplitudes, height=np.max(amplitudes)*0.1, distance=1)

    if len(peaks_indices) == 0: # Если пики не найдены
        # В качестве запасного варианта, если пики не найдены, но есть положительные частоты,
        # можно взять частоту с максимальной амплитудой.
        # Но это может быть менее надежно, чем find_peaks.
        # Пока вернем None, если find_peaks не нашел явных пиков.
        # Или: dominant_peak_index_in_amplitudes = np.argmax(amplitudes)
        return None
    
    # Берем самый высокий пик
    dominant_peak_index_in_amplitudes = peaks_indices[np.argmax(properties["peak_heights"])]
    
    # Частота, соответствующая этому пику
    dominant_freq = freq[positive_freq_indices[dominant_peak_index_in_amplitudes]]
    
    # Частота из fftfreq - это циклы на единицу x
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
                logs.append(log_prefix + f"Linear model (OLS) fitted. R²={results.rsquared:.4f}, SSE={results.ssr:.4f}")
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
        # Добавляем внешний try-except для всего цикла
        try: 
            print("DEBUG: Entering non-linear regression loop.", file=sys.stderr) # Отладка
            for reg_type, func, n_params in regression_types:
                print(f"DEBUG: Processing model type: {reg_type}", file=sys.stderr) # Отладка
                try:
                    p0 = np.ones(n_params) # Общее начальное значение по умолчанию
                    bounds = (-np.inf, np.inf) # Общие границы по умолчанию (без ограничений)
                    method_for_curve_fit = 'lm' # Метод по умолчанию
                    current_maxfev = 10000 # Значение по умолчанию для maxfev

                    if reg_type == "Trigonometric":
                        y_mean = np.mean(y_data)
                        y_amplitude = (np.max(y_data) - np.min(y_data)) / 2.0
                        if y_amplitude < 1e-6: 
                            y_amplitude = 1.0 
                        
                        b_initial_guess = None
                        dominant_freq_hz = estimate_dominant_frequency(x_data, y_data)
                        
                        x_range_val = np.max(x_data) - np.min(x_data)
                        if x_range_val < 1e-6: # Защита от деления на ноль или слишком малого диапазона
                            x_range_val = 1.0 # Используем значение по умолчанию, если диапазон X слишком мал

                        if dominant_freq_hz is not None and dominant_freq_hz > 1e-6:
                            b_initial_guess = 2 * np.pi * dominant_freq_hz
                            logs.append(log_prefix + f"Trigonometric FFT: Estimated dominant frequency (Hz) = {dominant_freq_hz:.4f}, b_initial_guess = {b_initial_guess:.4f}")
                        else:
                            # Fallback: один полный цикл в диапазоне x_data
                            b_initial_guess = (2 * np.pi) / x_range_val 
                            if b_initial_guess < 1e-6: # Дополнительная проверка
                                 b_initial_guess = 1.0
                            logs.append(log_prefix + f"Trigonometric Fallback: Using x_range for b_initial_guess = {b_initial_guess:.4f}")

                        # Определение границ для b
                        if x_range_val > 1e-6:
                            b_lower_bound = np.pi / x_range_val  # Период до 2 * x_range
                            b_upper_bound = 40 * np.pi / x_range_val # Период до x_range / 20 (20 циклов)
                        else: # Если x_range_val очень мал
                            b_lower_bound = 1e-3
                            b_upper_bound = 1e3
                        
                        # Убедимся, что b_initial_guess находится в границах
                        if b_initial_guess < b_lower_bound:
                            b_initial_guess = b_lower_bound
                            logs.append(log_prefix + f"Trigonometric: Clipped b_initial_guess to lower bound: {b_initial_guess:.4f}")
                        elif b_initial_guess > b_upper_bound:
                            b_initial_guess = b_upper_bound
                            logs.append(log_prefix + f"Trigonometric: Clipped b_initial_guess to upper bound: {b_initial_guess:.4f}")
                        
                        p0 = [
                            y_amplitude,      # a: амплитуда
                            b_initial_guess,  # b: частота (уже в границах)
                            0.0,              # c: фаза
                            y_mean            # d: вертикальный сдвиг
                        ]
                        
                        bounds = (
                            [1e-9, b_lower_bound, -2 * np.pi, -np.inf], 
                            [np.inf, b_upper_bound, 2 * np.pi, np.inf]   
                        )
                        method_for_curve_fit = 'trf'
                        current_maxfev = 20000 # Уменьшено, чтобы избежать таймаутов
                        print(f"DEBUG: {log_prefix}Trigonometric - Initial p0: {p0}, Bounds for b: ({b_lower_bound:.4f}, {b_upper_bound:.4f})", file=sys.stderr)

                    if reg_type == "Sigmoid":
                        # Определение начальных приближений (p0) для сигмоиды
                        y_min, y_max = np.min(y_data), np.max(y_data)
                        x_min, x_max = np.min(x_data), np.max(x_data)

                        c0 = y_max
                        if abs(y_max - y_min) < 1e-6: # Если Y почти не меняется
                            if abs(y_max) < 1e-6: # Если Y около нуля
                                c0 = 1.0 # Небольшое положительное значение
                            # иначе c0 остается y_max
                        
                        # Ищем x, где y ближе всего к c0/2
                        # Если c0 очень мало, y_target_for_b0 может быть почти 0, что нормально
                        y_target_for_b0 = y_min + (c0 - y_min) / 2.0 
                        
                        # Проверим, что y_data не пустой и содержит не только NaN
                        valid_y_indices = ~np.isnan(y_data)
                        if np.any(valid_y_indices):
                            b0_index = np.argmin(np.abs(y_data[valid_y_indices] - y_target_for_b0))
                            b0 = x_data[valid_y_indices][b0_index]
                        else: # Fallback если все y_data это NaN (маловероятно здесь, т.к. есть dropna)
                            b0 = (x_min + x_max) / 2.0

                        a0 = 1.0 # Начальное приближение для крутизны
                        # Попробуем оценить крутизну, если есть разброс по X и Y
                        if (x_max - x_min) > 1e-6 and (y_max - y_min) > 1e-6:
                             # Эвристика: 4 / (ширина диапазона X, где происходит основной рост)
                             # Предположим, что основной рост происходит на ~1/4 .. 3/4 диапазона Y
                             try:
                                 y_25 = y_min + 0.25 * (y_max - y_min)
                                 y_75 = y_min + 0.75 * (y_max - y_min)
                                 x_at_y25 = x_data[np.argmin(np.abs(y_data - y_25))]
                                 x_at_y75 = x_data[np.argmin(np.abs(y_data - y_75))]
                                 if abs(x_at_y75 - x_at_y25) > 1e-6:
                                     a0 = 4 / abs(x_at_y75 - x_at_y25) # Чем круче, тем больше a
                             except:
                                 pass # Оставляем a0 = 1.0 если эвристика не сработала

                        p0 = [a0, b0, c0]
                        logs.append(log_prefix + f"Sigmoid p0: a={a0:.3g}, b={b0:.3g}, c={c0:.3g}")
                        
                        # Определение границ (bounds) для сигмоиды
                        # c (y_max_param) должен быть больше или равен y_max, но может быть и чуть больше
                        # если данные шумные. Но не меньше чем y_min.
                        lower_c_bound = y_min 
                        upper_c_bound = y_max
                        if abs(y_max - y_min) < 1e-6: # если Y почти константа
                            if abs(y_max) < 1e-6 : # если Y около нуля
                                upper_c_bound = 1.0
                                lower_c_bound = -1.0 if y_min < 0 else 0.0 # Позволим быть немного отрицательным, если y_min отрицателен
                            else: # Y константа, но не ноль
                                upper_c_bound = y_max * 1.1 if y_max > 0 else y_max * 0.9 # небольшой запас
                                lower_c_bound = y_min * 0.9 if y_min > 0 else y_min * 1.1
                        else: # Y варьируется
                            padding_y = (y_max - y_min) * 0.1 # 10% запас
                            upper_c_bound = y_max + padding_y
                            # lower_c_bound уже y_min, что логично для асимптоты снизу, если она не 0
                            # Если мы ожидаем, что сигмоида всегда начинается от 0 или положительного значения, то:
                            # lower_c_bound = max(0, y_min - padding_y)
                            lower_c_bound = y_min - padding_y # Позволим асимптоте быть чуть ниже min(y_data)

                        bounds = (
                            [1e-9, x_min, lower_c_bound],       # lower bounds for a, b, c
                            [np.inf, x_max, upper_c_bound]    # upper bounds for a, b, c
                        )
                        method_for_curve_fit = 'trf' # 'trf' обычно лучше работает с границами
                        logs.append(log_prefix + f"Sigmoid bounds: a=({bounds[0][0]:.2g},{bounds[1][0]:.2g}), b=({bounds[0][1]:.2g},{bounds[1][1]:.2g}), c=({bounds[0][2]:.2g},{bounds[1][2]:.2g})")
                        # Для сигмоиды также может потребоваться больше итераций
                        current_maxfev = 20000 

                    if reg_type in ["Power", "Logarithmic"] and np.any(x_data <= 1e-9):
                        logs.append(log_prefix + f"Skipped {reg_type} model (non-positive values in X).")
                        print(f"DEBUG: Skipped {reg_type} model (non-positive X).", file=sys.stderr) # Отладка
                        continue

                    print(f"DEBUG: Attempting to fit {reg_type} model with maxfev={current_maxfev}...", file=sys.stderr) # Отладка
                    
                    params, pcov = curve_fit(func, x_data, y_data, p0=p0, bounds=bounds, method=method_for_curve_fit, maxfev=current_maxfev, check_finite=True)
                    
                    print(f"DEBUG: Successfully fitted {reg_type}. pcov is None: {pcov is None}", file=sys.stderr) # Отладка

                    if pcov is None:
                        valid_covariance = False
                        print(f"DEBUG: pcov is None for {reg_type}, setting valid_covariance=False", file=sys.stderr)
                    else:
                        try:
                            diag_pcov = np.diag(pcov)
                            valid_covariance = not np.any(np.isinf(pcov)) and np.all(diag_pcov >= 0)
                            print(f"DEBUG: pcov for {reg_type} processed. valid_covariance={valid_covariance}", file=sys.stderr)
                        except Exception as e_diag:
                            valid_covariance = False
                            print(f"DEBUG: Error processing pcov for {reg_type}: {e_diag}", file=sys.stderr)
                    
                    if not valid_covariance:
                        logs.append(log_prefix + f"Warning: For {reg_type} model, covariance could not be reliably estimated or is invalid.")
                        print(f"DEBUG: Covariance invalid for {reg_type}", file=sys.stderr) # Отладка

                    y_pred = func(x_data, *params)
                    r_squared = calculate_r_squared(y_data, y_pred)
                    sse = calculate_sse(y_data, y_pred)
                    print(f"DEBUG: {reg_type} R²={r_squared:.4f}", file=sys.stderr) # Отладка

                    # Расчет Adjusted R-squared
                    n_obs = len(y_data) # Количество наблюдений
                    # n_params уже есть для каждой нелинейной модели (из regression_types)
                    adj_r_squared_val = r_squared # По умолчанию, если расчет невозможен (например, если r_squared сам по себе некорректен)
                    if n_obs > n_params + 1: # Условие для корректного расчета
                        # Проверим, что r_squared это число, а не NaN, перед расчетом
                        if isinstance(r_squared, (int, float)) and not np.isnan(r_squared):
                            adj_r_squared_val = 1 - (1 - r_squared) * (n_obs - 1) / (n_obs - n_params - 1)
                        else:
                            logs.append(log_prefix + f"Warning: For {reg_type} model, R² is NaN or not a number. Adjusted R² cannot be calculated.")
                            adj_r_squared_val = np.nan # Или другое значение по умолчанию для NaN R²
                    else:
                        logs.append(log_prefix + f"Warning: For {reg_type} model, Adjusted R² cannot be reliably calculated (n_obs={n_obs} <= n_params={n_params} + 1). Using R² or NaN instead.")
                        # Если r_squared сам по себе NaN, то и adj_r_squared_val должен быть NaN
                        if isinstance(r_squared, (int, float)) and not np.isnan(r_squared):
                             adj_r_squared_val = r_squared # Используем обычный R² в этом крайнем случае, если он валиден
                        else:
                            adj_r_squared_val = np.nan
                    
                    # Исправленный отладочный print
                    formatted_adj_r2 = f"{adj_r_squared_val:.4f}" if isinstance(adj_r_squared_val, float) and not np.isnan(adj_r_squared_val) else "NaN"
                    print(f"DEBUG: {reg_type} Adjusted R²={formatted_adj_r2}", file=sys.stderr)

                    coefficients_nl = []
                    param_names_map = {
                        "Power": ["a", "b"], "Logarithmic": ["a", "b"],
                        "Quadratic": ["a", "b", "c"], "Trigonometric": ["a", "b", "c", "d"],
                        "Sigmoid": ["a", "b", "c"]
                    }
                    current_param_names = param_names_map[reg_type]

                    for idx, name in enumerate(current_param_names):
                        std_err = 0.0
                        ci_l, ci_u = params[idx], params[idx]
                        # Добавлена проверка pcov is not None и длины diag
                        if valid_covariance and pcov is not None and idx < len(np.diag(pcov)) and np.diag(pcov)[idx] >= 0:
                            if np.diag(pcov)[idx] > 1e-9: 
                                std_err = np.sqrt(np.diag(pcov))[idx]
                                ci_l = float(params[idx] - 1.96 * std_err)
                                ci_u = float(params[idx] + 1.96 * std_err)
                            else:
                                logs.append(log_prefix + f"Warning: For {reg_type} model, coefficient '{name}', diag(pcov)[{idx}] is too small or zero.")
                        else:
                            logs.append(log_prefix + f"Warning: For {reg_type} model, coefficient '{name}', std_err could not be reliably estimated (valid_covariance: {valid_covariance}, pcov is None: {pcov is None}).")
                        
                        coef = RegressionCoefficient(
                            variable_name=name, coefficient=float(params[idx]),
                            standard_error=float(std_err),
                            t_statistic=0.0, p_value=0.0, 
                            ci_lower=ci_l, ci_upper=ci_u
                        )
                        coefficients_nl.append(coef)

                    regression_result_nl = RegressionData()
                    regression_result_nl.model_type = reg_type
                    regression_result_nl.dependent_variable = y_col_name
                    regression_result_nl.independent_variables = [x_col_name]
                    regression_result_nl.r_squared = float(r_squared) if isinstance(r_squared, (int, float)) and not np.isnan(r_squared) else 0.0 # Защита от NaN
                    regression_result_nl.adjusted_r_squared = float(adj_r_squared_val) if isinstance(adj_r_squared_val, (int, float)) and not np.isnan(adj_r_squared_val) else 0.0 # Используем рассчитанное значение, защита от NaN
                    regression_result_nl.f_statistic = 0.0
                    regression_result_nl.prob_f_statistic = 0.0
                    regression_result_nl.sse = float(sse)
                    regression_result_nl.coefficients = coefficients_nl
                    regression_result_nl.data_points = [
                        {"x": float(xv), "y": float(yv)} for xv, yv in zip(x_data, y_data)
                    ]
                    all_models_for_pair.append(regression_result_nl)
                    logs.append(log_prefix + f"{reg_type} model fitted. R²={r_squared:.4f}, SSE={sse:.4f}, Params={np.round(params, 3).tolist()}")
                    print(f"DEBUG: Appended {reg_type} to results.", file=sys.stderr) # Отладка

                except RuntimeError as rte: 
                    logs.append(log_prefix + f"Skipped {reg_type} model (RuntimeError: {rte}).")
                    print(f"DEBUG: RuntimeError for {reg_type}: {rte}", file=sys.stderr) # Отладка
                except Exception as e_inner:
                    import traceback
                    error_traceback_inner = traceback.format_exc()
                    logs.append(log_prefix + f"Skipped {reg_type} model due to unexpected error: {e_inner}. Traceback: {error_traceback_inner}")
                    print(f"DEBUG: Inner Exception for {reg_type}: {e_inner}\nTRACEBACK:\n{error_traceback_inner}", file=sys.stderr) # Отладка
        
        except Exception as e_outer: # Внешний try-except
            import traceback
            error_traceback_outer = traceback.format_exc()
            logs.append(log_prefix + f"Critical error during non-linear regression loop: {e_outer}. Traceback: {error_traceback_outer}")
            print(f"DEBUG: Outer Exception: {e_outer}\nTRACEBACK:\n{error_traceback_outer}", file=sys.stderr) # Отладка

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