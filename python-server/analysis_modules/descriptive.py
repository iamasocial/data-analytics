# python-server/analysis_modules/descriptive.py
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
# Импортируем сгенерированные классы protobuf
import analysis_pb2 
from scipy import stats

# Define a type hint for the histogram data dictionary
HistogramResultDict = Dict[str, Any]

# Функция для генерации точек нормальной кривой
def generate_normal_curve_points(mean: float, std_dev: float, min_val: float, max_val: float, num_points: int = 100) -> Tuple[List[float], List[float]]:
    """
    Генерирует точки для построения нормальной кривой.
    
    Args:
        mean: Среднее значение.
        std_dev: Стандартное отклонение.
        min_val: Минимальное значение для диапазона X.
        max_val: Максимальное значение для диапазона X.
        num_points: Количество точек для генерации.
        
    Returns:
        Кортеж из двух списков: x_values и y_values.
    """
    if std_dev <= 0:
        print(f"Warning: std_dev <= 0 ({std_dev}), skipping normal curve generation")
        return [], []
    
    # Расширяем диапазон для лучшего отображения
    range_extension = 0.2 * (max_val - min_val)
    x_min = max(min_val - range_extension, mean - 4 * std_dev)
    x_max = min(max_val + range_extension, mean + 4 * std_dev)
    
    # Генерируем равномерно распределенные точки по оси X
    x_values = np.linspace(x_min, x_max, num_points).tolist()
    
    # Вычисляем значения плотности вероятности для нормального распределения
    try:
        y_values = stats.norm.pdf(x_values, loc=mean, scale=std_dev).tolist()
        print(f"Generated normal curve with {len(x_values)} points. Mean: {mean}, StdDev: {std_dev}")
        print(f"X range: [{x_values[0]:.2f}, {x_values[-1]:.2f}], Y range: [{min(y_values):.6f}, {max(y_values):.6f}]")
        return x_values, y_values
    except Exception as e:
        print(f"Error generating normal curve: {e}")
        return [], []

# Updated return type hint to remove box plot data
def calculate_descriptive_stats(df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[HistogramResultDict], List[str]]:
    """
    Вычисляет описательные статистики и данные гистограмм для числовых столбцов DataFrame.

    Args:
        df: Входной DataFrame.

    Returns:
        Кортеж:
        - Список словарей, где каждый словарь представляет статистики одного столбца.
        - Список словарей, где каждый словарь представляет данные гистограммы одного столбца.
        - Список строк с логами обработки.
    """
    descriptive_results = []
    histogram_results = [] # New list for histogram data
    logs = []
    numerical_cols = df.select_dtypes(include=np.number).columns.tolist()

    if not numerical_cols:
        logs.append("No numerical columns found for descriptive statistics.")
        return [], [], logs # Return empty lists for all results

    logs.append(f"Found numerical columns for descriptives: {', '.join(numerical_cols)}")

    for col_name in numerical_cols:
        col_data = df[col_name].dropna()

        if col_data.empty:
            logs.append(f"Skipping descriptive statistics and histogram for column '{col_name}' (all values are NaN).")
            continue

        # --- Descriptive Stats ---    
        count = int(col_data.count()) # Приводим к int
        mean_val = float(col_data.mean())
        median_val = float(col_data.median())
        mode_result = col_data.mode()
        variance_val = col_data.var(ddof=1)
        std_dev_val = col_data.std(ddof=1)
        skewness_val = col_data.skew()
        kurtosis_val = col_data.kurt()
        min_val = float(col_data.min())
        max_val = float(col_data.max())
        
        # Добавляем расчет квартилей и межквартильного размаха
        q1_val = float(col_data.quantile(0.25))
        q3_val = float(col_data.quantile(0.75))
        iqr_val = float(q3_val - q1_val)

        variation_coefficient_val = 0.0
        # Проверяем, что mean_val не None/NaN и не 0 перед делением
        if pd.notna(mean_val) and mean_val != 0 and pd.notna(std_dev_val):
            variation_coefficient_val = float(std_dev_val / mean_val)
        elif pd.isna(mean_val) or pd.isna(std_dev_val):
             variation_coefficient_val = np.nan # Используем NaN если не можем посчитать

        stats_dict: Dict[str, Any] = {
            "variable_name": col_name,
            "count": count,
            "mean": mean_val if pd.notna(mean_val) else np.nan, # Используем NaN для неопределенных
            "median": median_val if pd.notna(median_val) else np.nan,
            "mode": [] if mode_result.empty else mode_result.astype(float).tolist(), # Приводим к float
            "variance": float(variance_val) if pd.notna(variance_val) else np.nan,
            "std_dev": float(std_dev_val) if pd.notna(std_dev_val) else np.nan,
            "variation_coefficient": variation_coefficient_val, # Уже обработали выше
            "skewness": float(skewness_val) if pd.notna(skewness_val) else np.nan,
            "kurtosis": float(kurtosis_val) if pd.notna(kurtosis_val) else np.nan,
            "min_value": min_val,
            "max_value": max_val,
            "q1": q1_val if pd.notna(q1_val) else np.nan,
            "q3": q3_val if pd.notna(q3_val) else np.nan,
            "iqr": iqr_val if pd.notna(iqr_val) else np.nan,
        }
        descriptive_results.append(stats_dict)
        logs.append(f"Calculated descriptives for '{col_name}'.")

        # --- Histogram Calculation --- 
        try:
            # Use numpy.histogram. Let numpy determine the optimal bins ('auto')
            # We need frequencies (counts in each bin) and bin_edges
            frequencies, bin_edges = np.histogram(col_data, bins='auto')
            
            # Генерируем данные для нормальной кривой
            normal_curve_x, normal_curve_y = [], []
            if pd.notna(mean_val) and pd.notna(std_dev_val) and std_dev_val > 0:
                print(f"\nGenerating normal curve for '{col_name}'. Mean: {mean_val}, StdDev: {std_dev_val}")
                normal_curve_x, normal_curve_y = generate_normal_curve_points(
                    mean=mean_val, 
                    std_dev=std_dev_val, 
                    min_val=min_val, 
                    max_val=max_val, 
                    num_points=100
                )
                
                # Масштабируем y-значения нормальной кривой, чтобы они соответствовали высоте гистограммы
                if normal_curve_y and len(normal_curve_y) > 0:
                    total_frequency = sum(frequencies)
                    bin_width = (bin_edges[-1] - bin_edges[0]) / len(frequencies)
                    scale_factor = total_frequency * bin_width
                    normal_curve_y = [y * scale_factor for y in normal_curve_y]
                    print(f"Scaled Y values with factor {scale_factor:.2f}. New Y range: [{min(normal_curve_y):.2f}, {max(normal_curve_y):.2f}]")
            else:
                print(f"\nSkipping normal curve for '{col_name}'. Invalid parameters: mean={mean_val}, std_dev={std_dev_val}")
            
            # Prepare histogram data dictionary
            hist_dict: HistogramResultDict = {
                 "variable_name": col_name,
                 "bins": bin_edges.tolist(), # Convert numpy array to list
                 "frequencies": frequencies.tolist(), # Convert numpy array to list
                 "normal_curve_x": normal_curve_x,
                 "normal_curve_y": normal_curve_y,
                 "mean": mean_val if pd.notna(mean_val) else 0.0,
                 "std_dev": std_dev_val if pd.notna(std_dev_val) else 0.0
            }
            
            # Отладочный вывод для проверки данных
            print(f"Histogram data for '{col_name}':")
            print(f"- Bins: {len(hist_dict['bins'])} values, range [{hist_dict['bins'][0]:.2f}, {hist_dict['bins'][-1]:.2f}]")
            print(f"- Frequencies: {len(hist_dict['frequencies'])} values, sum: {sum(hist_dict['frequencies'])}")
            print(f"- Normal curve: {len(hist_dict['normal_curve_x'])} points")
            
            histogram_results.append(hist_dict)
            logs.append(f"Calculated histogram data for '{col_name}' (bins: {len(frequencies)}).")
            if normal_curve_x:
                logs.append(f"Generated normal curve data for '{col_name}' (points: {len(normal_curve_x)}).")
        except Exception as e:
            logs.append(f"Warning: Could not calculate histogram for '{col_name}': {e}")
            # Optionally append a placeholder or skip if histogram fails
            # histogram_results.append({"variable_name": col_name, "bins": [], "frequencies": []}) 
            
    # Return only three lists (no boxplot_results)
    return descriptive_results, histogram_results, logs 