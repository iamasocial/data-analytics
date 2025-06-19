import pandas as pd
import numpy as np
from scipy import stats
import os

def chi_square_normality_test(data):
    n = len(data)
    k = int(np.ceil(1 + 3.322 * np.log10(n)))  # число интервалов по правилу Стерджесса

    observed, bin_edges = np.histogram(data, bins=k)
    mu = np.mean(data)
    sigma = np.std(data, ddof=1)

    expected = []
    for i in range(len(bin_edges) - 1):
        p = stats.norm.cdf(bin_edges[i+1], mu, sigma) - stats.norm.cdf(bin_edges[i], mu, sigma)
        expected.append(p * n)

    obs_final = []
    exp_final = []
    buffer_obs = 0
    buffer_exp = 0

    for o, e in zip(observed, expected):
        buffer_obs += o
        buffer_exp += e
        if buffer_exp >= 5:
            obs_final.append(buffer_obs)
            exp_final.append(buffer_exp)
            buffer_obs = 0
            buffer_exp = 0

    if buffer_exp > 0:
        if len(obs_final) > 0:
            obs_final[-1] += buffer_obs
            exp_final[-1] += buffer_exp
        else:
            obs_final.append(buffer_obs)
            exp_final.append(buffer_exp)

    df = len(obs_final) - 1 - 2
    if df <= 0:
        return None, None, 0, 0

    chi_stat = sum((o - e) ** 2 / e for o, e in zip(obs_final, exp_final))
    p_value = 1 - stats.chi2.cdf(chi_stat, df)
    return chi_stat, p_value, len(obs_final), df

def main():
    file_path = os.path.join("..", "datasets", "Norm_Test_Uniform50.csv")

    try:
        df = pd.read_csv(file_path)
        data = df["value"].dropna().values
    except Exception as e:
        print(f"Ошибка при чтении файла: {e}")
        return

    print("\n=== Проверка нормальности распределения ===\n")

    w_stat, p_shapiro = stats.shapiro(data)
    print("▶ Тест Шапиро–Уилка:")
    print(f"  Статистика W: {w_stat:.4f}")
    print(f"  p-значение  : {p_shapiro:.4f}")
    print(f"  ➤ {'Нормальное распределение' if p_shapiro > 0.05 else 'Отклонение от нормальности'}\n")

    chi_stat, p_chi, bins_used, df_used = chi_square_normality_test(data)
    if p_chi is None:
        print("▶ Критерий χ²: недостаточно интервалов для теста (df ≤ 0)\n")
    else:
        print("▶ Критерий χ²:")
        print(f"  Статистика χ² : {chi_stat:.4f}")
        print(f"  p-значение    : {p_chi:.4f}")
        print(f"  Интервалов    : {bins_used}")
        print(f"  Степеней своб.: {df_used}")
        print(f"  ➤ {'Нормальное распределение' if p_chi > 0.05 else 'Отклонение от нормальности'}\n")

if __name__ == "__main__":
    main()
