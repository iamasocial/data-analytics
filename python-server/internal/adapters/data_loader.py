import io
import pandas as pd
from typing import List, Tuple, Optional

from internal.core.ports.analysis_ports import DataLoaderPort

class FileDataLoader(DataLoaderPort):
    """Загрузчик данных из файлов различных форматов"""
    
    def load_data(self, file_content: bytes, file_name: str) -> Tuple[Optional[pd.DataFrame], List[str]]:
        """
        Загружает данные из байтового содержимого файла.
        
        Args:
            file_content: Байтовое содержимое файла
            file_name: Имя файла (для определения формата)
            
        Returns:
            Кортеж (DataFrame с загруженными данными, список логов)
        """
        logs = []
        df = None
        
        # Определяем формат файла по расширению
        file_type = "unknown"
        if file_name.lower().endswith(".csv"):
            file_type = "csv"
        elif file_name.lower().endswith(".xlsx"):
            file_type = "xlsx"
        elif file_name.lower().endswith(".json"):
            file_type = "json"
            
        logs.append(f"Detected file type: {file_type}")
        
        try:
            # Оборачиваем байты в BytesIO, чтобы pandas мог их прочитать как файл
            file_like_object = io.BytesIO(file_content)
            
            if file_type == "csv":
                df = pd.read_csv(file_like_object)
                logs.append(f"Successfully parsed CSV data. Shape: {df.shape}")
            elif file_type == "xlsx":
                # Проверим, установлен ли openpyxl
                try:
                    import openpyxl
                    df = pd.read_excel(file_like_object, engine='openpyxl')
                    logs.append(f"Successfully parsed Excel data. Shape: {df.shape}")
                except ImportError:
                    logs.append("Error: openpyxl is required to read Excel files (.xlsx)")
                    return None, logs
            elif file_type == "json":
                df = pd.read_json(file_like_object)
                logs.append(f"Successfully parsed JSON data. Shape: {df.shape}")
            else:
                logs.append(f"Unsupported file type for file: {file_name}")
                return None, logs
            
            # Проверка на успешную загрузку данных
            if df is None or df.empty:
                logs.append("Error: Loaded dataframe is empty")
                return None, logs
            
            # Базовая очистка данных
            # Проверка на наличие пропущенных значений
            if df.isna().any().any():
                na_counts = df.isna().sum()
                na_cols = na_counts[na_counts > 0]
                logs.append(f"Warning: Found missing values in columns: {list(na_cols.index)}")
                
            # Информация о типах данных
            logs.append(f"DataFrame dtypes: {df.dtypes.to_dict()}")
            
            return df, logs
        
        except Exception as e:
            logs.append(f"Error loading data: {str(e)}")
            return None, logs 