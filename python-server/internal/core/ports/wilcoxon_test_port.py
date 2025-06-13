# python-server/internal/core/ports/wilcoxon_test_port.py
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from abc import ABC, abstractmethod

class WilcoxonTestPort(ABC):
    """
    Интерфейс для выполнения критериев Вилкоксона.
    """

    @abstractmethod
    def perform_wilcoxon_signed_rank_test(self, df: pd.DataFrame, var1: Optional[str] = None, 
                                   var2: Optional[str] = None, alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет критерий знаковых рангов Вилкоксона для связанных выборок.

        Args:
            df: Входной DataFrame.
            var1: Имя первого столбца для сравнения.
            var2: Имя второго столбца для сравнения.
            alpha: Уровень значимости для определения вывода.

        Returns:
            Кортеж:
            - Список словарей, где каждый словарь представляет результат теста.
            - Список строк с логами обработки.
        """
        pass

    @abstractmethod
    def perform_mann_whitney_test(self, df: pd.DataFrame, group_column: str, value_column: str, 
                                 alpha: float = 0.05) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Выполняет тест Манна-Уитни (критерий суммы рангов Вилкоксона) для независимых выборок.

        Args:
            df: Входной DataFrame.
            group_column: Имя столбца, содержащего группировочную переменную.
            value_column: Имя столбца с числовыми значениями для сравнения.
            alpha: Уровень значимости для определения вывода.

        Returns:
            Кортеж:
            - Список словарей, где каждый словарь представляет результат теста.
            - Список строк с логами обработки.
        """
        pass 