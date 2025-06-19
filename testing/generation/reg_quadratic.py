import numpy as np
import pandas as pd
import os

def generate_quadratic_data():
    np.random.seed(42)  # для воспроизводимости
    n = 30
    X = np.linspace(-10, 10, n)
    noise = np.random.normal(0, 5, n)  # шум
    Y = 2 * X**2 + 3 * X + 7 + noise   # квадратичная зависимость: Y = 2X² + 3X + 7 + шум

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Quadratic.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл с квадратичной зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_quadratic_data()
