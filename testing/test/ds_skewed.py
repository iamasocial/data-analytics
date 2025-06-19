import pandas as pd
import numpy as np
from scipy import stats
import os

def analyze_ds_skewed():
    path = os.path.join("..", "datasets", "ds_skewed.csv")

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

    print("Статистики для ds_skewed.csv:\n")
    print(f"Кол-во:           {count}")
    print(f"Среднее:          {mean:.4f}")
    print(f"Медиана:          {median:.4f}")
    print(f"Мода:             {mode:.4f}")
    print(f"Стд.Откл.:        {std:.4f}")
    print(f"Мин.:             {min_val:.4f}")
    print(f"Макс.:            {max_val:.4f}")
    print(f"Q1 (25%):         {q1:.4f}")
    print(f"Q3 (75%):         {q3:.4f}")
    print(f"IQR:              {iqr:.4f}")
    print(f"Коэф. вариации:   {coef_var:.4f}")
    print(f"Асимметрия:       {skewness:.4f}")
    print(f"Эксцесс:          {kurtosis:.4f}")

if __name__ == "__main__":
    analyze_ds_skewed()
