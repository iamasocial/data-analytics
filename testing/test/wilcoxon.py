import pandas as pd
from scipy.stats import wilcoxon

def analyze_wilcox(file_path):
    df = pd.read_csv(file_path)
    before = df["Before"]
    after = df["After"]

    stat, p = wilcoxon(before, after)

    print(f"Анализ файла: {file_path}")
    print(f"Статистика Вилкоксона: {stat:.4f}")
    print(f"p-value: {p:.4f}")

    if p < 0.05:
        print("Результат: Статистически значимое различие между выборками.\n")
    else:
        print("Результат: Нет статистически значимого различия между выборками.\n")

if __name__ == "__main__":
    analyze_wilcox("../datasets/Wilcox_Paired_Significant.csv")
    analyze_wilcox("../datasets/Wilcox_Paired_NoDiff.csv")
