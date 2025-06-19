import numpy as np
import csv
import os

def generate_norm_test_n50():
    # Путь к файлу: ../datasets/Norm_Test_N50_Mean0_Std1.csv
    output_path = os.path.join("..", "datasets", "Norm_Test_N50_Mean0_Std1.csv")

    # Убедимся, что папка ../datasets существует
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Генерация 50 значений из стандартного нормального распределения
    np.random.seed(42)  # Для воспроизводимости
    data = np.random.normal(loc=0.0, scale=1.0, size=50)

    # Сохраняем в CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["value"])
        for val in data:
            writer.writerow([round(val, 4)])

    print(f"Файл создан: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    generate_norm_test_n50()
