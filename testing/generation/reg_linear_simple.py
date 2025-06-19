import numpy as np
import pandas as pd
import os

def generate_linear_data():
    np.random.seed(42)  # для воспроизводимости
    n = 20
    X = np.linspace(0, 10, n)
    noise = np.random.normal(0, 1, n)  # небольшой шум
    Y = 3 * X + 5 + noise  # линейная зависимость: Y = 3X + 5 + шум

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Linear_Simple.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл с линейной зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_linear_data()
