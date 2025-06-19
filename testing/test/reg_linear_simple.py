import pandas as pd
import statsmodels.api as sm
from scipy.stats import shapiro
import numpy as np

# Загрузка данных
df = pd.read_csv('../datasets/Reg_Linear_Simple.csv')
X = df['X']
y = df['Y']

# Добавляем константу для свободного члена
X_with_const = sm.add_constant(X)

# Создание и обучение модели
model = sm.OLS(y, X_with_const)
results = model.fit()

# Остатки
residuals = results.resid

# SSE (сумма квадратов остатков)
sse = np.sum(residuals ** 2)

# Тест Шапиро-Уилка на нормальность остатков
shapiro_stat, shapiro_p = shapiro(residuals)

# Вывод результатов
print("📊 Линейная регрессия через statsmodels.OLS")
print("============================================")
print("Коэффициенты модели:")
print(results.params)

print("\nT-статистика и P-value по каждому коэффициенту:")
print(results.tvalues)
print(results.pvalues)

print("\nДоверительные интервалы (95%):")
print(results.conf_int())

print("\nR^2:", round(results.rsquared, 4))
print("Adjusted R^2:", round(results.rsquared_adj, 4))
print("F-статистика:", round(results.fvalue, 4))
print("P-value (F):", round(results.f_pvalue, 4))
print("SSE:", round(sse, 4))

print("\n🧪 Проверка нормальности остатков (Shapiro-Wilk):")
print(f"Статистика: {shapiro_stat:.4f}, P-value: {shapiro_p:.4f}")
print("Вывод:", "✅ Остатки нормальны" if shapiro_p > 0.05 else "⚠️ Остатки не нормальны")
