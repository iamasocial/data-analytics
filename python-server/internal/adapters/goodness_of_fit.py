from typing import List, Dict, Any, Tuple
import pandas as pd

from internal.core.ports.analysis_ports import GoodnessOfFitPort
from analysis_modules.goodness_of_fit import perform_chi_square_test

class GoodnessOfFitAdapter(GoodnessOfFitPort):
    """Адаптер для модуля критерия согласия хи-квадрат"""
    
    def perform_chi_square_test(self, df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет критерий хи-квадрат для проверки нормальности распределения.
        
        Args:
            df: Входной DataFrame.
            
        Returns:
            Кортеж:
            - Список словарей с результатами критерия хи-квадрат
            - Список логов обработки
        """
        
        # Делегируем расчеты существующей функции из analysis_modules
        return perform_chi_square_test(df) 