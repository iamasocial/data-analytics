import numpy as np
import pandas as pd
import os

def generate_uniform_sample():
    n = 50
    data = np.random.uniform(low=0.0, high=1.0, size=n)
    df = pd.DataFrame({'value': data})

    output_dir = os.path.join("..", "datasets")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Norm_Test_Uniform50.csv")

    df.to_csv(output_path, index=False)
    print(f"Файл с выборкой равномерного распределения создан: {output_path}")

if __name__ == "__main__":
    generate_uniform_sample()
