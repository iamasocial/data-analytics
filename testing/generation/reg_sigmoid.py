import numpy as np
import pandas as pd
import os

def sigmoid(x, L=1, k=1, x0=0):
    return L / (1 + np.exp(-k * (x - x0)))

def generate_sigmoid_data():
    np.random.seed(42)
    n = 100
    X = np.linspace(-10, 10, n)
    
    # Параметры сигмоиды
    L = 20     # верхняя граница
    k = 1      # крутизна
    x0 = 0     # сдвиг по оси X
    
    noise = np.random.normal(0, 1, n)
    Y = sigmoid(X, L, k, x0) + noise

    df = pd.DataFrame({'X': X, 'Y': Y})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Reg_Sigmoid.csv")
    df.to_csv(output_path, index=False)

    print(f"CSV-файл с сигмоидной зависимостью сохранён: {output_path}")

if __name__ == "__main__":
    generate_sigmoid_data()
