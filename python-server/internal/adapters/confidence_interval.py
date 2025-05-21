from typing import List, Dict, Any, Tuple
import pandas as pd

from internal.core.ports.analysis_ports import ConfidenceIntervalPort
from analysis_modules.confidence_interval import calculate_confidence_intervals

class ConfidenceIntervalAdapter(ConfidenceIntervalPort):
    """Адаптер для модуля расчета доверительных интервалов"""
    
    def calculate_confidence_intervals(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Вычисляет доверительные интервалы для числовых столбцов DataFrame.
        
        Args:
            df: Входной DataFrame.
            
        Returns:
            Кортеж:
            - Список словарей с доверительными интервалами
            - Список логов обработки
        """
        
        # Делегируем расчеты существующей функции из analysis_modules
        return calculate_confidence_intervals(df) 