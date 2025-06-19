import numpy as np
import pandas as pd
import os

def generate_power_data():
    np.random.seed(42)
    n = 100
    X = np.linspace(1, 10, n)  # начинаем с 1, чтобы избежать X^b при X=0
    a = 2.5
    b = 1.8
    noise = np.random.normal(0, 5, n)
    Y = a * X**b + noise

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Power.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл со степенной зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_power_data()
