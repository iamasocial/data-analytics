import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from scipy.stats import t, shapiro, f

def logarithmic_model(x, a, b):
    return a + b * np.log(x)

def analyze_logarithmic_curvefit():
    df = pd.read_csv("../datasets/Reg_Logarithmic.csv")
    X = df["X"].values
    Y = df["Y"].values

    # Исключаем значения X <= 0
    mask = X > 0
    X = X[mask]
    Y = Y[mask]
    n = len(X)

    # Аппроксимация
    popt, pcov = curve_fit(logarithmic_model, X, Y)
    a, b = popt
    dof = max(0, n - len(popt))

    # Предсказания и остатки
    y_pred = logarithmic_model(X, a, b)
    residuals = Y - y_pred

    # SSE и R²
    sse = np.sum(residuals ** 2)
    ss_total = np.sum((Y - np.mean(Y))**2)
    r_squared = 1 - sse / ss_total
    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / dof

    # Стандартные ошибки
    se = np.sqrt(np.diag(pcov))
    se_a, se_b = se

    # t-статистики
    t_a = a / se_a
    t_b = b / se_b

    # p-value
    p_a = 2 * (1 - t.cdf(np.abs(t_a), df=dof))
    p_b = 2 * (1 - t.cdf(np.abs(t_b), df=dof))

    # Доверительные интервалы (95%)
    alpha = 0.05
    tval = t.ppf(1.0 - alpha / 2., dof)
    ci_a = (a - tval * se_a, a + tval * se_a)
    ci_b = (b - tval * se_b, b + tval * se_b)

    # F-статистика
    msr = np.sum((y_pred - np.mean(Y))**2) / 1
    mse = sse / dof
    f_stat = msr / mse
    f_p = 1 - f.cdf(f_stat, 1, dof)

    # Тест Шапиро-Уилка
    shapiro_stat, shapiro_p = shapiro(residuals)

    # Вывод результатов
    print("Модель: Y = a + b * ln(X)")
    print("====================================")
    print(f"a = {a:.6f}")
    print(f"b = {b:.6f}\n")

    print("Стандартные ошибки:")
    print(f"SE(a): {se_a:.6f}")
    print(f"SE(b): {se_b:.6f}\n")

    print("t-статистики и p-value:")
    print(f"t(a): {t_a:.4f}, p-value: {p_a:.4f}")
    print(f"t(b): {t_b:.4f}, p-value: {p_b:.4f}\n")

    print("95% доверительные интервалы:")
    print(f"a: ({ci_a[0]:.6f}, {ci_a[1]:.6f})")
    print(f"b: ({ci_b[0]:.6f}, {ci_b[1]:.6f})\n")

    print(f"R²: {r_squared:.4f}")
    print(f"Adjusted R²: {adj_r_squared:.4f}")
    print(f"SSE: {sse:.4f}")
    print(f"F-статистика: {f_stat:.4f}, p-value: {f_p:.4f}\n")

    print("Тест Шапиро–Уилка на нормальность остатков:")
    print(f"Статистика: {shapiro_stat:.4f}, p-value: {shapiro_p:.4f}")
    if shapiro_p > 0.05:
        print("Остатки можно считать нормально распределёнными.")
    else:
        print("Остатки не являются нормально распределёнными.")

if __name__ == "__main__":
    analyze_logarithmic_curvefit()
