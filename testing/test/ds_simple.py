import pandas as pd
import numpy as np
from scipy import stats
import os

def analyze_ds_simple():
    path = os.path.join("..", "datasets", "ds_simple.csv")

    try:
        df = pd.read_csv(path)
    except FileNotFoundError:
        print(f"Файл не найден: {path}")
        return

    if 'value' not in df.columns:
        print("Ожидается колонка 'value' в CSV.")
        return

    values = df['value'].dropna()

    count = len(values)
    mean = values.mean()
    median = values.median()
    mode = values.mode().iloc[0] if not values.mode().empty else None
    std = values.std(ddof=1)
    min_val = values.min()
    max_val = values.max()
    q1 = values.quantile(0.25)
    q3 = values.quantile(0.75)
    iqr = q3 - q1
    coef_var = std / mean if mean != 0 else np.nan
    skewness = stats.skew(values)
    kurtosis = stats.kurtosis(values)

    print("Статистики для ds_simple.csv:\n")
    print(f"Кол-во:           {count}")
    print(f"Среднее:          {mean:.2f}")
    print(f"Медиана:          {median}")
    print(f"Мода:             {mode}")
    print(f"Стд.Откл.:        {std:.2f}")
    print(f"Мин.:             {min_val}")
    print(f"Макс.:            {max_val}")
    print(f"Q1 (25%):         {q1}")
    print(f"Q3 (75%):         {q3}")
    print(f"IQR:              {iqr}")
    print(f"Коэф. вариации:   {coef_var:.2f}")
    print(f"Асимметрия:       {skewness:.2f}")
    print(f"Эксцесс:          {kurtosis:.2f}")

if __name__ == "__main__":
    analyze_ds_simple()
