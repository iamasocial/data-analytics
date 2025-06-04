from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union
import pandas as pd
import numpy as np

@dataclass
class DataFileRequest:
    """Запрос с данными файла для анализа"""
    file_content: bytes
    file_name: str
    selected_analyses: List[str] = field(default_factory=list)
    
@dataclass
class DescriptiveStats:
    """Описательные статистики переменной"""
    variable_name: str
    count: int
    mean: float = 0.0
    median: float = 0.0
    mode: List[float] = field(default_factory=list)
    variance: float = 0.0
    std_dev: float = 0.0
    variation_coefficient: float = 0.0
    skewness: float = 0.0
    kurtosis: float = 0.0
    min_value: float = 0.0
    max_value: float = 0.0

@dataclass
class HistogramData:
    """Данные гистограммы переменной"""
    variable_name: str
    bins: List[float] = field(default_factory=list)
    frequencies: List[int] = field(default_factory=list)

@dataclass
class ConfidenceInterval:
    """Доверительный интервал для переменной"""
    variable_name: str
    statistic_name: str
    confidence_level: float = 0.95
    point_estimate: float = 0.0
    lower_bound: float = 0.0
    upper_bound: float = 0.0

@dataclass
class NormalityTestResult:
    """Результат теста на нормальность"""
    variable_name: str
    test_name: str
    statistic: float = 0.0
    p_value: float = 0.0
    is_normal: bool = False
    conclusion: str = ""

@dataclass
class PearsonChiSquareResult:
    """Результат хи-квадрат теста"""
    variable_name: str
    test_name: str = "Chi-square Goodness-of-fit"
    distribution: str = "norm"
    statistic: float = 0.0
    p_value: float = 0.0
    degrees_of_freedom: int = 0
    intervals: int = 0
    is_normal: bool = False
    conclusion: str = ""

@dataclass
class RegressionCoefficient:
    """Коэффициент регрессии"""
    variable_name: str
    coefficient: float = 0.0
    standard_error: float = 0.0
    t_statistic: float = 0.0
    p_value: float = 0.0

@dataclass
class RegressionResult:
    """Результат регрессионного анализа"""
    dependent_variable: str
    independent_variables: List[str] = field(default_factory=list)
    r_squared: float = 0.0
    adjusted_r_squared: float = 0.0
    f_statistic: float = 0.0
    f_p_value: float = 0.0
    sse: float = 0.0
    coefficients: List[RegressionCoefficient] = field(default_factory=list)
    data_points: List[Dict[str, float]] = field(default_factory=list)
    residuals: List[float] = field(default_factory=list)  # Остатки регрессии
    residuals_analysis: Dict[str, Any] = field(default_factory=dict)  # Результаты анализа остатков

@dataclass
class AnalysisResponse:
    """Полный ответ с результатами анализа"""
    processing_log: List[str] = field(default_factory=list)
    descriptives: List[DescriptiveStats] = field(default_factory=list)
    histograms: List[HistogramData] = field(default_factory=list)
    normality_tests: List[NormalityTestResult] = field(default_factory=list)
    confidence_intervals: List[ConfidenceInterval] = field(default_factory=list)
    pearson_chi_square_results: List[PearsonChiSquareResult] = field(default_factory=list)
    regressions: List[RegressionResult] = field(default_factory=list) 