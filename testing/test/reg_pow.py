import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from scipy.stats import t, shapiro, f

def power_model(x, a, b):
    return a * x ** b

def analyze_power_curvefit():
    df = pd.read_csv("../datasets/Reg_Power.csv")
    X = df["X"].values
    Y = df["Y"].values

    # Исключаем нули и отрицательные значения
    mask = (X > 0) & (Y > 0)
    X = X[mask]
    Y = Y[mask]

    # Фиттинг модели
    popt, pcov = curve_fit(power_model, X, Y, p0=(1, 1))
    a, b = popt
    n = len(X)
    dof = max(0, n - len(popt))  # degrees of freedom

    # Предсказания и остатки
    y_pred = power_model(X, a, b)
    residuals = Y - y_pred
    sse = np.sum(residuals**2)
    ss_total = np.sum((Y - np.mean(Y))**2)
    r_squared = 1 - sse / ss_total
    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - len(popt))

    # Стандартные ошибки
    perr = np.sqrt(np.diag(pcov))
    se_a, se_b = perr

    # t-статистики
    t_a = a / se_a
    t_b = b / se_b

    # p-value
    p_a = 2 * (1 - t.cdf(abs(t_a), df=dof))
    p_b = 2 * (1 - t.cdf(abs(t_b), df=dof))

    # Доверительные интервалы
    alpha = 0.05
    tval = t.ppf(1.0 - alpha / 2., dof)
    ci = [(p - tval * err, p + tval * err) for p, err in zip(popt, perr)]

    # F-статистика
    msr = np.sum((y_pred - np.mean(Y))**2) / 1
    mse = sse / dof
    f_stat = msr / mse
    f_p = 1 - f.cdf(f_stat, 1, dof)

    # Тест Шапиро-Уилка
    shapiro_stat, shapiro_p = shapiro(residuals)

    # Вывод
    print("Модель: Y = a * X^b")
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
    print(f"a: ({ci[0][0]:.6f}, {ci[0][1]:.6f})")
    print(f"b: ({ci[1][0]:.6f}, {ci[1][1]:.6f})\n")

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
    analyze_power_curvefit()
