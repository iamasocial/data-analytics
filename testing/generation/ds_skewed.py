import numpy as np
import csv
import os

def generate_ds_skewed():
    # Путь к файлу: на уровень выше в папку data
    output_path = os.path.join("..", "datasets", "ds_skewed.csv")

    # Убедимся, что папка ../data существует
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Генерация логнормального распределения: 50 значений
    np.random.seed(42)  # для воспроизводимости
    data = np.random.lognormal(mean=1.0, sigma=0.8, size=50)

    # Сохраняем в CSV
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["value"])
        for val in data:
            writer.writerow([round(val, 4)])

    print(f"Файл создан: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    generate_ds_skewed()
