import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple

def perform_residuals_normality_test(residuals: List[float], alpha: float = 0.05) -> Dict[str, Any]:
    """
    Выполняет тест Шапиро-Уилка на нормальность остатков регрессии.

    Args:
        residuals: Список остатков регрессии.
        alpha: Уровень значимости для определения вывода.

    Returns:
        Словарь с результатами теста.
    """
    if len(residuals) < 3:
        return {
            "test_name": "Shapiro-Wilk",
            "statistic": np.nan,
            "p_value": np.nan,
            "is_normal": False,
            "conclusion": "Insufficient data (need at least 3 values)"
        }
    
    try:
        # Проверка на константность данных
        if np.var(residuals) < 1e-9:  # Почти одинаковые остатки
            return {
                "test_name": "Shapiro-Wilk",
                "statistic": np.nan,
                "p_value": np.nan,
                "is_normal": False,
                "conclusion": "Constant residuals"
            }
            
        # Выполнение теста Шапиро-Уилка
        shapiro_stat, p_value = stats.shapiro(residuals)
        
        conclusion = f"Residuals look Gaussian (fail to reject H0 at alpha={alpha})" if p_value > alpha else f"Residuals do not look Gaussian (reject H0 at alpha={alpha})"
        
        return {
            "test_name": "Shapiro-Wilk",
            "statistic": float(shapiro_stat),
            "p_value": float(p_value),
            "is_normal": p_value > alpha,
            "conclusion": conclusion
        }
    except Exception as e:
        return {
            "test_name": "Shapiro-Wilk",
            "statistic": np.nan,
            "p_value": np.nan,
            "is_normal": False,
            "conclusion": f"Error performing test: {str(e)}"
        }

def generate_residuals_histogram_data(residuals: List[float], n_bins: int = 10) -> Dict[str, Any]:
    """
    Генерирует данные гистограммы для остатков регрессии.
    
    Args:
        residuals: Список остатков регрессии.
        n_bins: Количество интервалов гистограммы.
        
    Returns:
        Словарь с данными гистограммы.
    """
    if len(residuals) < 2:
        return {
            "bins": [],
            "frequencies": []
        }
    
    try:
        # Определение количества интервалов по правилу Стёрджеса
        if n_bins <= 0:
            n_bins = int(np.ceil(1 + 3.322 * np.log10(len(residuals))))
        
        # Вычисление гистограммы
        hist, bin_edges = np.histogram(residuals, bins=n_bins)
        
        return {
            "bins": bin_edges.tolist(),
            "frequencies": hist.tolist()
        }
    except Exception as e:
        return {
            "bins": [],
            "frequencies": [],
            "error": str(e)
        }

def generate_qq_plot_data(residuals: List[float]) -> Dict[str, Any]:
    """
    Генерирует данные для QQ-графика остатков регрессии.
    
    Args:
        residuals: Список остатков регрессии.
        
    Returns:
        Словарь с данными для QQ-графика.
    """
    if len(residuals) < 2:
        return {
            "theoretical_quantiles": [],
            "sample_quantiles": []
        }
    
    try:
        # Сортировка остатков
        sorted_residuals = np.sort(residuals)
        
        # Вычисление теоретических квантилей нормального распределения
        theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(residuals)))
        
        return {
            "theoretical_quantiles": theoretical_quantiles.tolist(),
            "sample_quantiles": sorted_residuals.tolist()
        }
    except Exception as e:
        return {
            "theoretical_quantiles": [],
            "sample_quantiles": [],
            "error": str(e)
        } 