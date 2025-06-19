import pandas as pd
import numpy as np
from scipy.optimize import curve_fit
from scipy.stats import shapiro, t, f

def trig_model(x, a, b, c, d):
    return a * np.sin(b * x + c) + d

def analyze_trigonometric_nonlinear():
    # Загрузка данных
    df = pd.read_csv("../datasets/Reg_Trigonometric.csv")
    X = df["X"].values
    Y = df["Y"].values

    # Начальные приближения
    initial_guess = [1, 1, 0, 0]

    # Аппроксимация с методом trf
    popt, pcov = curve_fit(
        trig_model,
        X, Y,
        p0=initial_guess,
        method="trf",
        maxfev=10000
    )
    perr = np.sqrt(np.diag(pcov))

    n = len(Y)
    p = len(popt)
    df_resid = n - p

    # Прогноз и остатки
    Y_pred = trig_model(X, *popt)
    residuals = Y - Y_pred

    # Метрики
    SSE = np.sum(residuals**2)
    TSS = np.sum((Y - np.mean(Y))**2)
    R2 = 1 - SSE / TSS
    adj_R2 = 1 - (1 - R2) * (n - 1) / df_resid

    # F-статистика
    MSR = (TSS - SSE) / (p - 1)
    MSE = SSE / df_resid
    F_stat = MSR / MSE
    F_p_value = 1 - f.cdf(F_stat, p, df_resid)

    # t-статистики и p-значения
    t_stats = popt / perr
    p_values = [2 * (1 - t.cdf(abs(t_val), df_resid)) for t_val in t_stats]

    # 95% доверительные интервалы
    ci_bounds = [
        (param - t.ppf(0.975, df_resid) * err, param + t.ppf(0.975, df_resid) * err)
        for param, err in zip(popt, perr)
    ]

    # Тест Шапиро-Уилка
    shapiro_stat, shapiro_p = shapiro(residuals)

    # Имена параметров
    param_names = ['a', 'b', 'c', 'd']

    # Вывод результатов
    print("Параметры модели и статистика:")
    print(f"{'Параметр':>10} {'Значение':>12} {'Std. Error':>12} {'t-стат':>10} {'p-value':>10} {'95% CI':>25}")
    for name, param, err, t_val, p_val, ci in zip(param_names, popt, perr, t_stats, p_values, ci_bounds):
        print(f"{name:>10} {param:12.4f} {err:12.4f} {t_val:10.4f} {p_val:10.4f} [{ci[0]:.4f}, {ci[1]:.4f}]")

    print("\nКоэффициент детерминации:")
    print(f"R² = {R2:.4f}")
    print(f"Adjusted R² = {adj_R2:.4f}")
    print(f"F-статистика: {F_stat:.4f}, p-value: {F_p_value:.4g}")
    print(f"SSE = {SSE:.4f}")

    print("\nТест Шапиро–Уилка для остатков:")
    print(f"Статистика: {shapiro_stat:.4f}, p-value: {shapiro_p:.4f}")
    if shapiro_p > 0.05:
        print("Остатки можно считать нормально распределёнными.")
    else:
        print("Остатки не являются нормально распределёнными.")

if __name__ == "__main__":
    analyze_trigonometric_nonlinear()
