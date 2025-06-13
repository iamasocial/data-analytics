# python-server/internal/adapters/wilcoxon_test.py
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional

from analysis_modules import wilcoxon
from internal.core.ports import wilcoxon_test_port

class WilcoxonTestAdapter(wilcoxon_test_port.WilcoxonTestPort):
    """
    Адаптер для проведения тестов Вилкоксона.
    """
    
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
        return wilcoxon.perform_wilcoxon_signed_rank_test(df, var1, var2, alpha)

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
        return wilcoxon.perform_mann_whitney_test(df, group_column, value_column, alpha) 