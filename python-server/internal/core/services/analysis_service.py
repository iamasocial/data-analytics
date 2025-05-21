import io
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional

from internal.core.domain.entities import (
    DataFileRequest,
    AnalysisResponse,
    DescriptiveStats,
    HistogramData,
    NormalityTestResult,
    ConfidenceInterval,
    PearsonChiSquareResult,
    RegressionResult,
    RegressionCoefficient
)
from internal.core.ports.analysis_ports import (
    AnalysisServicePort,
    DataLoaderPort,
    DescriptiveStatsPort,
    NormalityTestPort,
    ConfidenceIntervalPort,
    GoodnessOfFitPort,
    RegressionPort
)

# Определим константы для имен анализов, чтобы избежать опечаток
DESCRIPTIVE_STATS_ANALYSIS = "descriptive_stats"
NORMALITY_TEST_ANALYSIS = "normality_test"
REGRESSION_ANALYSIS = "regression"
# Добавим также для Хи-квадрат и доверительных интервалов, если они будут отдельно выбираться
CHI_SQUARE_ANALYSIS = "chi_square"
CONFIDENCE_INTERVALS_ANALYSIS = "confidence_intervals"


class AnalysisService(AnalysisServicePort):
    """Реализация основного сервиса анализа данных"""
    
    def __init__(self, 
                 data_loader: DataLoaderPort,
                 descriptive_stats: DescriptiveStatsPort,
                 normality_test: NormalityTestPort,
                 confidence_interval: ConfidenceIntervalPort,
                 goodness_of_fit: GoodnessOfFitPort,
                 regression: RegressionPort):
        self.data_loader = data_loader
        self.descriptive_stats = descriptive_stats
        self.normality_test = normality_test 
        self.confidence_interval = confidence_interval
        self.goodness_of_fit = goodness_of_fit
        self.regression = regression
    
    def analyze_data(self, request: DataFileRequest) -> AnalysisResponse:
        """Анализирует данные из запроса и возвращает ответ с результатами анализа"""
        
        response = AnalysisResponse()
        selected_analyses = set(request.selected_analyses) # Используем set для быстрой проверки
        response.processing_log.append(f"Selected analyses: {selected_analyses}")
        
        try:
            df, load_logs = self.data_loader.load_data(
                file_content=request.file_content, 
                file_name=request.file_name
            )
            response.processing_log.extend(load_logs)
            
            if df is not None:
                if not selected_analyses: # Если ничего не выбрано, выполняем все по умолчанию (или логируем предупреждение)
                    response.processing_log.append("Warning: No specific analyses selected. Performing all available analyses.")
                    # Чтобы выполнить все, можно временно добавить все ключи в selected_analyses
                    # selected_analyses.update([DESCRIPTIVE_STATS_ANALYSIS, NORMALITY_TEST_ANALYSIS, REGRESSION_ANALYSIS, CHI_SQUARE_ANALYSIS, CONFIDENCE_INTERVALS_ANALYSIS])
                    # Либо, если пользователь должен ОБЯЗАТЕЛЬНО выбрать, то тут можно вернуть ошибку или пустой результат
                    # return response # Возвращаем пустой response, если не выбрано ничего и мы не хотим выполнять все по умолчанию

                # --- Описательные статистики и гистограммы ---
                if DESCRIPTIVE_STATS_ANALYSIS in selected_analyses:
                    # Возвращает кортеж с тремя элементами вместо четырех
                    desc_stats_data, hist_data, desc_logs = self.descriptive_stats.calculate_descriptive_stats(df)
                    response.processing_log.extend(desc_logs)
                    
                    for stats_dict in desc_stats_data:
                        stats = DescriptiveStats(
                            variable_name=stats_dict.get("variable_name", ""),
                            count=stats_dict.get("count", 0),
                            mean=stats_dict.get("mean", 0.0) if pd.notna(stats_dict.get("mean")) else 0.0,
                            median=stats_dict.get("median", 0.0) if pd.notna(stats_dict.get("median")) else 0.0,
                            mode=stats_dict.get("mode", []),
                            variance=stats_dict.get("variance", 0.0) if pd.notna(stats_dict.get("variance")) else 0.0,
                            std_dev=stats_dict.get("std_dev", 0.0) if pd.notna(stats_dict.get("std_dev")) else 0.0,
                            variation_coefficient=stats_dict.get("variation_coefficient", 0.0) if pd.notna(stats_dict.get("variation_coefficient")) else 0.0,
                            skewness=stats_dict.get("skewness", 0.0) if pd.notna(stats_dict.get("skewness")) else 0.0,
                            kurtosis=stats_dict.get("kurtosis", 0.0) if pd.notna(stats_dict.get("kurtosis")) else 0.0,
                            min_value=stats_dict.get("min_value", 0.0) if pd.notna(stats_dict.get("min_value")) else 0.0,
                            max_value=stats_dict.get("max_value", 0.0) if pd.notna(stats_dict.get("max_value")) else 0.0
                        )
                        response.descriptives.append(stats)
                    
                    for hist_dict in hist_data:
                        hist = HistogramData(
                            variable_name=hist_dict.get("variable_name", ""),
                            bins=hist_dict.get("bins", []),
                            frequencies=hist_dict.get("frequencies", [])
                        )
                        response.histograms.append(hist)
                
                # --- Тесты на нормальность (Шапиро-Уилка) ---
                if NORMALITY_TEST_ANALYSIS in selected_analyses:
                    normality_results, norm_logs = self.normality_test.perform_normality_test(df)
                    response.processing_log.extend(norm_logs)
                    for test_dict in normality_results:
                        test = NormalityTestResult(
                            variable_name=test_dict.get("variable_name", ""),
                            test_name=test_dict.get("test_name", ""),
                            statistic=test_dict.get("statistic", 0.0) if pd.notna(test_dict.get("statistic")) else 0.0,
                            p_value=test_dict.get("p_value", 0.0) if pd.notna(test_dict.get("p_value")) else 0.0,
                            conclusion=test_dict.get("conclusion", "")
                        )
                        response.normality_tests.append(test)
                
                    # --- Критерий хи-квадрат (как часть проверки нормальности) ---
                    # Считаем, что хи-квадрат выполняется, если выбрана проверка нормальности
                    chi2_results, chi2_logs = self.goodness_of_fit.perform_chi_square_test(df)
                    response.processing_log.extend(chi2_logs)
                    for chi2_dict in chi2_results:
                        chi2 = PearsonChiSquareResult(
                            variable_name=chi2_dict.get("variable_name", ""),
                            test_name=chi2_dict.get("test_name", ""),
                            distribution=chi2_dict.get("distribution", ""),
                            statistic=chi2_dict.get("statistic", 0.0) if pd.notna(chi2_dict.get("statistic")) else 0.0,
                            p_value=chi2_dict.get("p_value", 0.0) if pd.notna(chi2_dict.get("p_value")) else 0.0,
                            degrees_of_freedom=int(chi2_dict.get("degrees_of_freedom", 0)),
                            conclusion=chi2_dict.get("conclusion", "")
                        )
                        response.pearson_chi_square_results.append(chi2)

                # --- Доверительные интервалы (если "descriptive_stats" выбраны, т.к. они часто идут вместе) ---
                # Можно вынести в отдельный ключ CONFIDENCE_INTERVALS_ANALYSIS, если нужно выбирать отдельно
                if DESCRIPTIVE_STATS_ANALYSIS in selected_analyses:
                    ci_results, ci_logs = self.confidence_interval.calculate_confidence_intervals(df)
                    response.processing_log.extend(ci_logs)
                    for ci_dict in ci_results:
                        ci = ConfidenceInterval(
                            variable_name=ci_dict.get("variable_name", ""),
                            statistic_name=ci_dict.get("statistic_name", ""),
                            confidence_level=ci_dict.get("confidence_level", 0.95),
                            point_estimate=ci_dict.get("point_estimate", 0.0) if pd.notna(ci_dict.get("point_estimate")) else 0.0,
                            lower_bound=ci_dict.get("lower_bound", 0.0) if pd.notna(ci_dict.get("lower_bound")) else 0.0,
                            upper_bound=ci_dict.get("upper_bound", 0.0) if pd.notna(ci_dict.get("upper_bound")) else 0.0
                        )
                        response.confidence_intervals.append(ci)
                
                # --- Регрессионный анализ ---
                if REGRESSION_ANALYSIS in selected_analyses:
                    # Check for specified regression variables
                    dependent_var = None
                    independent_var = None
                    
                    # Extract variable names from selected_analyses
                    for analysis in request.selected_analyses:
                        if analysis.startswith("regression_dependent:"):
                            dependent_var = analysis[len("regression_dependent:"):]
                        elif analysis.startswith("regression_independent:"):
                            independent_var = analysis[len("regression_independent:"):]
                    
                    # Perform regression with specified variables if provided
                    reg_results, reg_logs = self.regression.perform_simple_linear_regression(
                        df, dependent_var=dependent_var, independent_var=independent_var
                    )
                    response.processing_log.extend(reg_logs)
                    
                    for reg_dict in reg_results:
                        reg = RegressionResult(
                            dependent_variable=reg_dict.get("dependent_variable", ""),
                            independent_variables=reg_dict.get("independent_variables", []),
                            r_squared=reg_dict.get("r_squared", 0.0) if pd.notna(reg_dict.get("r_squared")) else 0.0,
                            adjusted_r_squared=reg_dict.get("adjusted_r_squared", 0.0) if pd.notna(reg_dict.get("adjusted_r_squared")) else 0.0,
                            f_statistic=reg_dict.get("f_statistic", 0.0) if pd.notna(reg_dict.get("f_statistic")) else 0.0,
                            f_p_value=reg_dict.get("f_p_value", 0.0) if pd.notna(reg_dict.get("f_p_value")) else 0.0,
                            sse=reg_dict.get("sse", 0.0) if pd.notna(reg_dict.get("sse")) else 0.0,
                            data_points=reg_dict.get("data_points", [])
                        )
                        # Установка типа модели
                        if "model_type" in reg_dict:
                            reg.model_type = reg_dict["model_type"]
                        
                        coef_list = reg_dict.get("coefficients", [])
                        for coef_dict in coef_list:
                            coef = RegressionCoefficient(
                                variable_name=coef_dict.get("variable_name", ""),
                                coefficient=coef_dict.get("coefficient", 0.0) if pd.notna(coef_dict.get("coefficient")) else 0.0,
                                standard_error=coef_dict.get("standard_error", 0.0) if pd.notna(coef_dict.get("standard_error")) else 0.0,
                                t_statistic=coef_dict.get("t_statistic", 0.0) if pd.notna(coef_dict.get("t_statistic")) else 0.0,
                                p_value=coef_dict.get("p_value", 0.0) if pd.notna(coef_dict.get("p_value")) else 0.0
                            )
                            reg.coefficients.append(coef)
                        response.regressions.append(reg)
        
        except Exception as e:
            import traceback
            error_message = f"Error analyzing data: {e}\n{traceback.format_exc()}"
            response.processing_log.append(error_message)
        
        return response 