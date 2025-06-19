import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy.stats import shapiro

def analyze_quadratic_regression():
    # Загрузка данных
    df = pd.read_csv("../datasets/Reg_Quadratic.csv")
    X = df["X"]
    Y = df["Y"]

    # Формируем признаки: X и X^2 + константа
    X_quad = pd.DataFrame({
        "const": 1,
        "X": X,
        "X2": X**2
    })

    # Строим модель OLS
    model = sm.OLS(Y, X_quad).fit()

    residuals = model.resid

    # Тест Шапиро-Уилка
    shapiro_stat, shapiro_p = shapiro(residuals)

    # SSE
    SSE = np.sum(residuals**2)

    print("Коэффициенты модели:")
    print(model.params)

    print("\nСтандартные ошибки коэффициентов:")
    print(model.bse)

    print("\nT-статистики:")
    print(model.tvalues)

    print("\nP-значения:")
    print(model.pvalues)

    print("\nДоверительные интервалы (95%):")
    print(model.conf_int(alpha=0.05))

    print(f"\nR²: {model.rsquared:.4f}")
    print(f"Adjusted R²: {model.rsquared_adj:.4f}")
    print(f"F-статистика: {model.fvalue:.4f}, p-value: {model.f_pvalue:.4g}")
    print(f"SSE: {SSE:.4f}")

    print("\nТест Шапиро–Уилка для остатков:")
    print(f"Статистика: {shapiro_stat:.4f}, p-value: {shapiro_p:.4f}")
    if shapiro_p > 0.05:
        print("Остатки можно считать нормально распределёнными.")
    else:
        print("Остатки не являются нормально распределёнными.")

if __name__ == "__main__":
    analyze_quadratic_regression()
