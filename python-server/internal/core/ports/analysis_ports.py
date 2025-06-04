from abc import ABC, abstractmethod
import pandas as pd
from typing import Tuple, List, Dict, Any

from internal.core.domain.entities import (
    DataFileRequest,
    AnalysisResponse,
    DescriptiveStats,
    HistogramData,
    NormalityTestResult,
    ConfidenceInterval,
    PearsonChiSquareResult, 
    RegressionResult
)

# Порты для первичных адаптеров (Primary/Driving adapters)
class AnalysisServicePort(ABC):
    """Интерфейс основного сервиса анализа данных"""
    
    @abstractmethod
    def analyze_data(self, request: DataFileRequest) -> AnalysisResponse:
        """Анализирует данные и возвращает результаты"""
        pass

# Порты для вторичных адаптеров (Secondary/Driven adapters)
class DataLoaderPort(ABC):
    """Интерфейс для загрузки данных"""
    
    @abstractmethod
    def load_data(self, file_content: bytes, file_name: str) -> Tuple[pd.DataFrame, List[str]]:
        """Загружает данные из байтового содержимого файла"""
        pass

class DescriptiveStatsPort(ABC):
    """Интерфейс для вычисления описательных статистик"""
    
    @abstractmethod
    def calculate_descriptive_stats(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """Вычисляет описательные статистики и гистограммы для числовых столбцов DataFrame"""
        pass

class NormalityTestPort(ABC):
    """Интерфейс для тестов на нормальность"""
    
    @abstractmethod
    def perform_normality_test(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Выполняет тесты на нормальность для числовых столбцов DataFrame"""
        pass

class ConfidenceIntervalPort(ABC):
    """Интерфейс для расчета доверительных интервалов"""
    
    @abstractmethod
    def calculate_confidence_intervals(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Вычисляет доверительные интервалы для числовых столбцов DataFrame"""
        pass

class GoodnessOfFitPort(ABC):
    """Интерфейс для критерия согласия хи-квадрат"""
    
    @abstractmethod
    def perform_chi_square_test(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Выполняет критерий хи-квадрат для проверки нормальности распределения"""
        pass

class RegressionPort(ABC):
    """Интерфейс для регрессионного анализа"""
    
    @abstractmethod
    def perform_simple_linear_regression(self, df: pd.DataFrame, dependent_var: str = None, 
                                      independent_var: str = None) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет простой линейный регрессионный анализ для числовых столбцов DataFrame
        
        Args:
            df: Входной DataFrame.
            dependent_var: Имя зависимой переменной (Y). Если None, будут перебраны все числовые столбцы.
            independent_var: Имя независимой переменной (X). Если None, будут перебраны все числовые столбцы.
        """
        pass

class ResidualsAnalysisPort(ABC):
    """Интерфейс для анализа остатков регрессии"""
    
    @abstractmethod
    def analyze_residuals(self, residuals: List[float]) -> Dict[str, Any]:
        """
        Выполняет анализ остатков регрессии.
        
        Args:
            residuals: Список остатков регрессии.
            
        Returns:
            Словарь с результатами анализа.
        """
        pass 