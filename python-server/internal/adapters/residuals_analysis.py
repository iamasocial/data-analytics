from typing import List, Dict, Any
from internal.core.ports.analysis_ports import ResidualsAnalysisPort
from analysis_modules.residuals_analysis import (
    perform_residuals_normality_test,
    generate_residuals_histogram_data,
    generate_qq_plot_data
)

class ResidualsAnalysisAdapter(ResidualsAnalysisPort):
    """Адаптер для анализа остатков регрессии"""
    
    def analyze_residuals(self, residuals: List[float]) -> Dict[str, Any]:
        """
        Выполняет анализ остатков регрессии.
        
        Args:
            residuals: Список остатков регрессии.
            
        Returns:
            Словарь с результатами анализа.
        """
        # Проверка на нормальность с помощью теста Шапиро-Уилка
        shapiro_test_result = perform_residuals_normality_test(residuals)
        
        # Генерация данных для гистограммы
        histogram_data = generate_residuals_histogram_data(residuals)
        
        # Генерация данных для QQ-графика
        qq_plot_data = generate_qq_plot_data(residuals)
        
        # Формирование результата
        return {
            "shapiro_test": shapiro_test_result,
            "histogram": histogram_data,
            "qq_plot": qq_plot_data
        } 