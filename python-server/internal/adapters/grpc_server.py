import grpc
from concurrent import futures
import time
import sys
from typing import Optional

import analysis_pb2
import analysis_pb2_grpc

from internal.core.domain.entities import DataFileRequest
from internal.core.ports.analysis_ports import AnalysisServicePort


class AnalysisServiceGrpcAdapter(analysis_pb2_grpc.AnalysisServiceServicer):
    """gRPC адаптер для сервиса анализа данных"""
    
    def __init__(self, analysis_service: AnalysisServicePort):
        """
        Инициализирует gRPC адаптер для сервиса анализа данных.
        
        Args:
            analysis_service: Сервис анализа данных, реализующий порт AnalysisServicePort
        """
        self.analysis_service = analysis_service
        # Сохраняем прямую ссылку на data_loader для обработки специальных запросов
        if hasattr(analysis_service, 'data_loader'):
            self.data_loader = analysis_service.data_loader
        else:
            self.data_loader = None
            print("Warning: analysis_service does not have data_loader attribute")
    
    def AnalyzeData(self, request, context):
        """
        Обрабатывает gRPC запрос на анализ данных.
        
        Args:
            request: gRPC запрос с файлом для анализа
            context: Контекст gRPC запроса
        
        Returns:
            Ответ с результатами анализа в формате protobuf
        """
        print(f"Received request to analyze file: {request.file_name}")
        print(f"Selected analyses from gRPC request: {list(request.selected_analyses)}")
        
        # Создаем объект ответа
        grpc_response = analysis_pb2.AnalyzeDataResponse()
        
        try:
            # Проверяем, это запрос на получение списка столбцов
            if "get_columns" in request.selected_analyses:
                print("Detected request for column names")
                # Проверяем доступность data_loader
                if self.data_loader is None:
                    error_msg = "ERROR: data_loader is not available for column extraction"
                    print(error_msg)
                    grpc_response.processing_log.append(error_msg)
                    
                    error_details_msg = analysis_pb2.ErrorDetails()
                    error_details_msg.code = "DATA_LOADER_NOT_AVAILABLE"
                    error_details_msg.message = error_msg
                    grpc_response.error.CopyFrom(error_details_msg)
                    
                    return grpc_response
                    
                # Мы можем использовать data_loader напрямую, чтобы загрузить файл
                # и получить список столбцов без выполнения полного анализа
                try:
                    df, load_logs = self.data_loader.load_data(
                        file_content=request.file_content, 
                        file_name=request.file_name
                    )
                    grpc_response.processing_log.extend(load_logs)
                    
                    if df is not None:
                        # Добавляем имена столбцов в лог обработки с особым префиксом
                        columns_str = ",".join(df.columns.tolist())
                        grpc_response.processing_log.append(f"COLUMNS:{columns_str}")
                        print(f"Returning {len(df.columns)} columns: {columns_str}")
                    else:
                        error_msg = "ERROR: Failed to load data for column extraction"
                        grpc_response.processing_log.append(error_msg)
                        print(error_msg)
                        
                        # Добавляем информацию об ошибке
                        error_details_msg = analysis_pb2.ErrorDetails()
                        error_details_msg.code = "DATA_LOAD_ERROR"
                        error_details_msg.message = "Failed to load data for column extraction"
                        grpc_response.error.CopyFrom(error_details_msg)
                    
                    return grpc_response
                except Exception as e:
                    import traceback
                    error_message = f"Error loading data for column extraction: {e}"
                    full_traceback = traceback.format_exc()
                    print(f"{error_message}\n{full_traceback}")
                    
                    grpc_response.processing_log.append(error_message)
                    grpc_response.processing_log.append(full_traceback)
                    
                    error_details_msg = analysis_pb2.ErrorDetails()
                    error_details_msg.code = "COLUMN_EXTRACTION_ERROR"
                    error_details_msg.message = str(e)
                    error_details_msg.details.append(full_traceback)
                    grpc_response.error.CopyFrom(error_details_msg)
                    
                    return grpc_response
            
            # Преобразуем запрос в доменный объект
            domain_request = DataFileRequest(
                file_content=request.file_content,
                file_name=request.file_name,
                selected_analyses=list(request.selected_analyses)
            )
            
            # Вызываем сервис для анализа данных
            domain_response = self.analysis_service.analyze_data(domain_request)
            
            # Заполняем логи обработки
            grpc_response.processing_log.extend(domain_response.processing_log)
            
            # --- Populate Descriptive Statistics ---
            if domain_response.descriptives or domain_response.histograms or domain_response.confidence_intervals:
                desc_stats_response = analysis_pb2.DescriptiveStatisticsResponse()
                for stats in domain_response.descriptives:
                    stats_msg = analysis_pb2.DescriptiveStatistics()
                    stats_msg.variable_name = stats.variable_name
                    stats_msg.count = str(stats.count)
                    stats_msg.mean = stats.mean
                    stats_msg.median = stats.median
                    stats_msg.mode.extend([str(m) for m in stats.mode])
                    stats_msg.variance = stats.variance
                    stats_msg.std_dev = stats.std_dev
                    stats_msg.variation_coefficient = stats.variation_coefficient
                    stats_msg.skewness = stats.skewness
                    stats_msg.kurtosis = stats.kurtosis
                    stats_msg.min_value = stats.min_value
                    stats_msg.max_value = stats.max_value
                    desc_stats_response.descriptives.append(stats_msg)
                
                for hist in domain_response.histograms:
                    hist_msg = analysis_pb2.HistogramData()
                    hist_msg.column_name = hist.variable_name
                    hist_msg.bins.extend([float(b) for b in hist.bins])
                    hist_msg.frequencies.extend([int(f) for f in hist.frequencies])
                    desc_stats_response.histograms.append(hist_msg)
                
                for ci in domain_response.confidence_intervals:
                    ci_msg = analysis_pb2.ConfidenceInterval()
                    ci_msg.column_name = ci.variable_name
                    ci_msg.confidence_level = ci.confidence_level
                    ci_msg.lower_bound = ci.lower_bound
                    ci_msg.upper_bound = ci.upper_bound
                    ci_msg.mean = ci.point_estimate
                    z_value = 1.96
                    ci_msg.standard_error = (ci.upper_bound - ci.lower_bound) / (2 * z_value) if z_value != 0 else 0.0
                    desc_stats_response.confidence_intervals.append(ci_msg)
                grpc_response.descriptive_stats.CopyFrom(desc_stats_response)

            # --- Populate Normality Tests ---
            if domain_response.normality_tests or domain_response.pearson_chi_square_results:
                norm_tests_response = analysis_pb2.NormalityTestsResponse()
                for test in domain_response.normality_tests:
                    test_msg = analysis_pb2.NormalityTestResult()
                    test_msg.column_name = test.variable_name
                    test_msg.test_name = test.test_name
                    test_msg.statistic = test.statistic
                    test_msg.p_value = test.p_value
                    # Используем is_normal из доменной сущности, если оно там есть, иначе считаем по p_value
                    if hasattr(test, 'is_normal'):
                        test_msg.is_normal = test.is_normal
                    else: # Обратная совместимость или если is_normal не было установлено
                        test_msg.is_normal = test.p_value > 0.05 
                    norm_tests_response.shapiro_wilk_results.append(test_msg)
                
                for chi2 in domain_response.pearson_chi_square_results:
                    chi2_msg = analysis_pb2.PearsonChiSquareResult()
                    chi2_msg.column_name = chi2.variable_name
                    chi2_msg.statistic = chi2.statistic
                    chi2_msg.p_value = chi2.p_value
                    chi2_msg.degrees_of_freedom = chi2.degrees_of_freedom
                    chi2_msg.intervals = chi2.intervals # Используем значение из доменной сущности
                    # Используем is_normal из доменной сущности, если оно там есть, иначе считаем по p_value
                    if hasattr(chi2, 'is_normal'):
                        chi2_msg.is_normal = chi2.is_normal
                    else:
                        chi2_msg.is_normal = chi2.p_value > 0.05
                    norm_tests_response.chi_square_results.append(chi2_msg)
                grpc_response.normality_tests.CopyFrom(norm_tests_response)

            # --- Populate Regression Analysis ---
            if domain_response.regressions:
                # Create a regression analysis response
                reg_analysis_response = analysis_pb2.RegressionAnalysisResponse()
                
                # Assuming all regression models have the same dependent and independent variables
                first_model = domain_response.regressions[0]
                reg_analysis_response.dependent_variable = first_model.dependent_variable
                reg_analysis_response.independent_variables.extend(first_model.independent_variables)
                
                # Add data points (only need to do this once since all models use the same data)
                for point in first_model.data_points:
                    data_point = analysis_pb2.DataPoint()
                    data_point.x = point.get("x", 0.0)
                    data_point.y = point.get("y", 0.0)
                    reg_analysis_response.data_points.append(data_point)
                
                # Add all regression models
                for reg_domain_data in domain_response.regressions:
                    # Create a new regression model
                    model = analysis_pb2.RegressionModel()
                    
                    # Set model type
                    if hasattr(reg_domain_data, 'model_type'):
                        model.regression_type = reg_domain_data.model_type
                    else:
                        model.regression_type = "Linear"
                    
                    # Debug logging
                    grpc_response.processing_log.append(f"DEBUG: Adding regression model of type: {model.regression_type}")
                    
                    # Set model metrics
                    model.r_squared = reg_domain_data.r_squared
                    model.adjusted_r_squared = reg_domain_data.adjusted_r_squared
                    model.f_statistic = reg_domain_data.f_statistic
                    model.prob_f_statistic = reg_domain_data.f_p_value
                    model.sse = reg_domain_data.sse
                    
                    # Add coefficients
                    for coef_domain in reg_domain_data.coefficients:
                        coef_msg = analysis_pb2.RegressionCoefficient()
                        coef_msg.variable_name = coef_domain.variable_name
                        coef_msg.coefficient = coef_domain.coefficient
                        coef_msg.std_error = coef_domain.standard_error
                        coef_msg.t_statistic = coef_domain.t_statistic
                        coef_msg.p_value = coef_domain.p_value
                        
                        # Вычисляем доверительные интервалы на основе коэффициента и стандартной ошибки
                        t_critical = 1.96
                        coef_msg.confidence_interval_lower = coef_domain.coefficient - t_critical * coef_domain.standard_error
                        coef_msg.confidence_interval_upper = coef_domain.coefficient + t_critical * coef_domain.standard_error
                        
                        model.coefficients.append(coef_msg)
                    
                    # Add the model to the response
                    reg_analysis_response.models.append(model)
                
                # Add the regression analysis to the main response
                grpc_response.regression_analysis.CopyFrom(reg_analysis_response)
            
            # Map domain error if present
            if hasattr(domain_response, 'error') and domain_response.error:
                error_details_msg = analysis_pb2.ErrorDetails()
                error_details_msg.code = domain_response.error.code
                error_details_msg.message = domain_response.error.message
                if domain_response.error.details:
                    error_details_msg.details.extend(domain_response.error.details)
                grpc_response.error.CopyFrom(error_details_msg)

            return grpc_response
        
        except Exception as e:
            import traceback
            error_message = f"Error analyzing data: {e}"
            full_traceback = traceback.format_exc()
            print(f"{error_message}\\n{full_traceback}")
            
            grpc_response.processing_log.append(error_message)
            grpc_response.processing_log.append(full_traceback)

            error_details_msg = analysis_pb2.ErrorDetails()
            error_details_msg.code = "INTERNAL_ERROR" 
            error_details_msg.message = str(e)
            error_details_msg.details.append(full_traceback)
            grpc_response.error.CopyFrom(error_details_msg)
            
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(error_message)
            return grpc_response


class GrpcServer:
    """Класс для управления gRPC сервером"""
    
    def __init__(self, 
                 analysis_service: AnalysisServicePort, 
                 host: str = "[::]:9000", 
                 max_workers: int = 10):
        """
        Инициализирует gRPC сервер.
        
        Args:
            analysis_service: Сервис анализа данных
            host: Адрес и порт в формате "хост:порт"
            max_workers: Максимальное количество рабочих потоков
        """
        self.analysis_service = analysis_service
        self.host = host
        self.max_workers = max_workers
        self.server = None
    
    def start(self):
        """Запускает gRPC сервер"""
        self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=self.max_workers))
        analysis_pb2_grpc.add_AnalysisServiceServicer_to_server(
            AnalysisServiceGrpcAdapter(self.analysis_service), 
            self.server
        )
        self.server.add_insecure_port(self.host)
        self.server.start()
        print(f"--- Server started, listening on {self.host} ---")
        return self.server
    
    def wait(self):
        """Блокирует выполнение до завершения сервера"""
        if self.server:
            self.server.wait_for_termination()
    
    def stop(self):
        """Останавливает gRPC сервер"""
        if self.server:
            self.server.stop(0)
            print("--- Server stopped ---")