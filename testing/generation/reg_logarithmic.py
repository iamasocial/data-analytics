import numpy as np
import pandas as pd
import os

def generate_logarithmic_data():
    np.random.seed(42)
    n = 100
    X = np.linspace(1, 100, n)  # X > 0 для логарифма
    a = 10
    b = 5
    noise = np.random.normal(0, 2, n)
    Y = a * np.log(X) + b + noise

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Logarithmic.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл с логарифмической зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_logarithmic_data()
