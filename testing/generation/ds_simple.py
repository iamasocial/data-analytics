import csv
import os

def generate_ds_simple():
    # Путь к файлу: на уровень выше + папка data
    output_path = os.path.join("..", "datasets", "ds_simple.csv")

    # Убедимся, что папка ../data существует
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Данные
    data = [3, 7, 2, 9, 5, 8, 1, 4, 6, 10]

    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["value"])
            for num in data:
                writer.writerow([num])
        print(f"Файл создан: {os.path.abspath(output_path)}")
    except Exception as e:
        print("Ошибка при создании файла:", e)

if __name__ == "__main__":
    generate_ds_simple()
