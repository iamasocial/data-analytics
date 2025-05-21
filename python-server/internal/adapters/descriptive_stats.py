from typing import List, Dict, Any, Tuple
import pandas as pd

from internal.core.ports.analysis_ports import DescriptiveStatsPort
from analysis_modules.descriptive import calculate_descriptive_stats

class DescriptiveStatsAdapter(DescriptiveStatsPort):
    """Адаптер для модуля расчета описательных статистик"""
    
    def calculate_descriptive_stats(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Вычисляет описательные статистики и данные гистограмм для числовых столбцов DataFrame.
        
        Args:
            df: Входной DataFrame.
            
        Returns:
            Кортеж из трех элементов:
            - Список словарей с описательными статистиками
            - Список словарей с данными гистограмм
            - Список логов обработки
        """
        
        # Делегируем расчеты существующей функции из analysis_modules
        return calculate_descriptive_stats(df) 