import numpy as np
import pandas as pd
import os

def generate_trigonometric_data():
    np.random.seed(42)
    n = 100
    X = np.linspace(0, 4 * np.pi, n)
    a = 10     # амплитуда
    b = 1      # частота
    c = 5      # вертикальное смещение
    noise = np.random.normal(0, 1, n)  # небольшой шум
    Y = a * np.sin(b * X) + c + noise

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Trigonometric.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл с тригонометрической зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_trigonometric_data()
