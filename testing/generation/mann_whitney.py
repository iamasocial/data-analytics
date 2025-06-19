import numpy as np
import pandas as pd
import os

# Папка для сохранения
save_dir = "../datasets"
os.makedirs(save_dir, exist_ok=True)

# Параметры
n = 20  # размер выборок

# --- 1. Независимые с различием ---
np.random.seed(0)
group_a_sig = np.random.normal(loc=10, scale=2, size=n)
group_b_sig = np.random.normal(loc=15, scale=2, size=n)

df_sig = pd.DataFrame({
    "value": np.concatenate([group_a_sig, group_b_sig]),
    "group": ["A"] * n + ["B"] * n
})
df_sig.to_csv(f"{save_dir}/MannWhitney_Independent_Significant.csv", index=False)

# --- 2. Независимые без различий ---
np.random.seed(1)
group_a_nodiff = np.random.normal(loc=12, scale=2, size=n)
group_b_nodiff = np.random.normal(loc=12, scale=2, size=n)

df_nodiff = pd.DataFrame({
    "value": np.concatenate([group_a_nodiff, group_b_nodiff]),
    "group": ["A"] * n + ["B"] * n
})
df_nodiff.to_csv(f"{save_dir}/MannWhitney_Indep_NoDiff.csv", index=False)

print("✅ Файлы сгенерированы:")
print("- MannWhitney_Independent_Significant.csv")
print("- MannWhitney_Indep_NoDiff.csv")
