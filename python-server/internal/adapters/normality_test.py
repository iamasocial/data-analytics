from typing import List, Dict, Any, Tuple
import pandas as pd

from internal.core.ports.analysis_ports import NormalityTestPort
from analysis_modules.normality import perform_normality_test

class NormalityTestAdapter(NormalityTestPort):
    """Адаптер для модуля тестов на нормальность"""
    
    def perform_normality_test(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет тесты на нормальность для числовых столбцов DataFrame.
        
        Args:
            df: Входной DataFrame.
            
        Returns:
            Кортеж:
            - Список словарей с результатами тестов на нормальность
            - Список логов обработки
        """
        
        # Делегируем расчеты существующей функции из analysis_modules
        return perform_normality_test(df) 