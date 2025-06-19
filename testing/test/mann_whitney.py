import pandas as pd
from scipy.stats import mannwhitneyu

def run_mann_whitney(file_path):
    df = pd.read_csv(file_path)

    if 'value' not in df.columns or 'group' not in df.columns:
        raise ValueError(f"Файл {file_path} должен содержать колонки 'value' и 'group'.")

    groups = df['group'].unique()
    if len(groups) != 2:
        raise ValueError(f"В файле {file_path} должно быть ровно 2 группы, найдено: {len(groups)}")

    group1 = df[df['group'] == groups[0]]['value']
    group2 = df[df['group'] == groups[1]]['value']

    median1 = group1.median()
    median2 = group2.median()

    stat, p = mannwhitneyu(group1, group2, alternative='two-sided')

    print(f"\n📄 Анализ файла: {file_path}")
    print(f"Группы: {groups[0]} vs {groups[1]}")
    print(f"Медианы: {groups[0]} = {median1:.3f}, {groups[1]} = {median2:.3f}")
    print(f"U-статистика: {stat:.3f}")
    print(f"P-value: {p:.4f}")
    print("Вывод:", "✅ Есть значимое различие" if p < 0.05 else "ℹ️ Нет статистически значимого различия")

# Пути к файлам
files = [
    "../datasets/MannWhitney_Independent_Significant.csv",
    "../datasets/MannWhitney_Indep_NoDiff.csv"
]

# Запуск анализа
for path in files:
    run_mann_whitney(path)
