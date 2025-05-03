# python-server/server.py
import grpc
from concurrent import futures
import time
import io
import sys # Добавим sys для вывода ошибок

print("--- Python script started ---") # <<-- Добавлено

# Импортируем сгенерированные классы
try:
    import analysis_pb2
    import analysis_pb2_grpc
    print("--- gRPC modules imported successfully ---") # <<-- Добавлено
except ImportError as e:
    print(f"--- Failed to import gRPC modules: {e} ---", file=sys.stderr) # <<-- Добавлено
    sys.exit(1) # Выходим, если импорт не удался

# Импортируем библиотеки для анализа
try:
    import pandas as pd
    import numpy as np # <<-- Добавлен импорт numpy
    from scipy import stats # <<-- Добавлен импорт scipy.stats
    # <<-- Добавляем импорт нашего модуля
    from analysis_modules.descriptive import calculate_descriptive_stats 
    # <<-- Импортируем тест нормальности
    from analysis_modules.normality import perform_normality_test 
    # <<-- Импортируем доверительные интервалы
    from analysis_modules.confidence_interval import calculate_confidence_intervals 
    # <<-- Импортируем проверку гипотез
    from analysis_modules.hypothesis_testing import perform_one_sample_t_test 
    # <<-- Импортируем критерий согласия Хи-квадрат
    from analysis_modules.goodness_of_fit import perform_chi_square_test 
    # <<-- Импортируем корреляционный анализ
    from analysis_modules.correlation import calculate_correlations 
    # <<-- Импортируем регрессионный анализ
    from analysis_modules.regression import perform_simple_linear_regression
    # <<-- Заменяем импорт оценки на импорт теста
    from analysis_modules.binomial import perform_binomial_analysis
    print("--- Pandas, Numpy, and Scipy imported successfully ---") # <<-- Добавлено
except ImportError as e:
    print(f"--- Failed to import pandas, numpy or scipy: {e} ---", file=sys.stderr) # <<-- Добавлено
    # Не выходим, может быть не критично для базового запуска? Или все же выйти? Пока оставим.
    pass

# Проверка импорта нашего модуля
try:
    if (calculate_descriptive_stats 
        and perform_normality_test 
        and calculate_confidence_intervals 
        and perform_one_sample_t_test 
        and perform_chi_square_test 
        and calculate_correlations
        and perform_simple_linear_regression
        and perform_binomial_analysis): # <<-- Обновлена проверка импорта
        print("--- Analysis modules imported successfully ---")
except NameError:
    print("--- Failed to import analysis modules ---", file=sys.stderr)
    sys.exit(1)

# Класс, реализующий логику нашего сервиса
class AnalysisServiceImpl(analysis_pb2_grpc.AnalysisServiceServicer):

    def AnalyzeData(self, request, context):
        print(f"Received request to analyze file: {request.file_name}")

        # Создаем объект ответа
        response = analysis_pb2.AnalysisResponse()

        try:
            # Получаем байты файла из запроса
            file_content = request.file_content
            file_name = request.file_name
            print(f"--- Received file content (first 100 bytes): {file_content[:100]} ---") # <<-- Добавлено

            # Определяем тип файла (очень упрощенно)
            file_type = "unknown"
            if file_name.lower().endswith(".csv"):
                file_type = "csv"
            elif file_name.lower().endswith(".xlsx"):
                file_type = "xlsx"

            response.processing_log.append(f"Detected file type: {file_type}")

            # Пытаемся прочитать данные с помощью pandas
            df = None
            if file_type == "csv":
                # Оборачиваем байты в BytesIO, чтобы pandas мог их прочитать как файл
                file_like_object = io.BytesIO(file_content)
                df = pd.read_csv(file_like_object)
                response.processing_log.append(f"Successfully parsed CSV data. Shape: {df.shape}")
            elif file_type == "xlsx":
                # Проверим, установлен ли openpyxl
                try:
                    import openpyxl
                except ImportError:
                    msg = "openpyxl is required to read Excel files (.xlsx)"
                    print(f"Error: {msg}")
                    response.processing_log.append(f"Error: {msg}")
                    context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
                    context.set_details(msg)
                    return response

                file_like_object = io.BytesIO(file_content)
                df = pd.read_excel(file_like_object, engine='openpyxl')
                response.processing_log.append(f"Successfully parsed Excel data. Shape: {df.shape}")
            else:
                message = f"Unsupported file type for file: {file_name}"
                response.processing_log.append(f"Error: {message}")
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details(message)
                print(message)
                return response

            # --- Здесь будет основная логика анализа ---
            print(f"Data loaded successfully. Shape: {df.shape}")
            response.processing_log.append("Calculating descriptive statistics...")

            # --- Вызываем расчет описательных статистик --- 
            descriptive_results, desc_logs = calculate_descriptive_stats(df)
            response.processing_log.extend(desc_logs)
            
            # --- Вызываем тест на нормальность --- 
            normality_results, norm_logs = perform_normality_test(df)
            response.processing_log.extend(norm_logs)
            
            # --- Доверительные интервалы --- 
            ci_results, ci_logs = calculate_confidence_intervals(df)
            response.processing_log.extend(ci_logs)
            
            # --- Проверка гипотез (одновыборочный t-тест) --- 
            hyp_results, hyp_logs = perform_one_sample_t_test(df) # Вызываем новую функцию (popmean=0 по умолчанию)
            response.processing_log.extend(hyp_logs)
            
            # --- Критерий согласия Хи-квадрат Пирсона --- 
            chi2_results, chi2_logs = perform_chi_square_test(df) # По умолчанию проверка нормальности
            response.processing_log.extend(chi2_logs)
            
            # --- Корреляционный анализ --- 
            correlation_results_dict, corr_logs = calculate_correlations(df)
            response.processing_log.extend(corr_logs)
            
            if correlation_results_dict:
                correlation_msg = analysis_pb2.CorrelationResult()
                
                if correlation_results_dict.get("pearson"):
                    for pearson_dict in correlation_results_dict["pearson"]:
                        p_corr_msg = analysis_pb2.CorrelationResult.PearsonCorrelation()
                        p_corr_msg.variable1 = pearson_dict["variable1"]
                        p_corr_msg.variable2 = pearson_dict["variable2"]
                        p_corr_msg.coefficient = pearson_dict["coefficient"] if pd.notna(pearson_dict["coefficient"]) else 0.0
                        p_corr_msg.p_value = pearson_dict["p_value"] if pd.notna(pearson_dict["p_value"]) else 0.0
                        correlation_msg.pearson.append(p_corr_msg)
                
                if correlation_results_dict.get("spearman"):
                    for spearman_dict in correlation_results_dict["spearman"]:
                        s_corr_msg = analysis_pb2.CorrelationResult.SpearmanCorrelation()
                        s_corr_msg.variable1 = spearman_dict["variable1"]
                        s_corr_msg.variable2 = spearman_dict["variable2"]
                        s_corr_msg.coefficient = spearman_dict["coefficient"] if pd.notna(spearman_dict["coefficient"]) else 0.0
                        s_corr_msg.p_value = spearman_dict["p_value"] if pd.notna(spearman_dict["p_value"]) else 0.0
                        correlation_msg.spearman.append(s_corr_msg)
                
                response.correlation.CopyFrom(correlation_msg) # Присваиваем результат полю correlation
            
            # --- Регрессионный анализ (простая линейная) --- 
            regression_results_list, reg_logs = perform_simple_linear_regression(df)
            response.processing_log.extend(reg_logs)
            
            if regression_results_list:
                for reg_dict in regression_results_list:
                    reg_msg = analysis_pb2.RegressionResult()
                    reg_msg.model_type = reg_dict.get("model_type", "N/A")
                    reg_msg.dependent_variable = reg_dict.get("dependent_variable", "N/A")
                    # Убедимся, что independent_variables это список строк
                    indep_vars = reg_dict.get("independent_variables", [])
                    if isinstance(indep_vars, list):
                        reg_msg.independent_variables.extend([str(v) for v in indep_vars])
                    
                    reg_msg.r_squared = reg_dict.get("r_squared", np.nan) if pd.notna(reg_dict.get("r_squared", np.nan)) else 0.0
                    reg_msg.adjusted_r_squared = reg_dict.get("adjusted_r_squared", np.nan) if pd.notna(reg_dict.get("adjusted_r_squared", np.nan)) else 0.0
                    reg_msg.f_statistic = reg_dict.get("f_statistic", np.nan) if pd.notna(reg_dict.get("f_statistic", np.nan)) else 0.0
                    reg_msg.f_p_value = reg_dict.get("f_p_value", np.nan) if pd.notna(reg_dict.get("f_p_value", np.nan)) else 0.0
                    
                    coefficients_list = reg_dict.get("coefficients", [])
                    if coefficients_list:
                        for coef_dict in coefficients_list:
                            coef_msg = analysis_pb2.RegressionResult.Coefficient()
                            coef_msg.variable_name = coef_dict.get("variable_name", "N/A")
                            coef_msg.estimate = coef_dict.get("estimate", np.nan) if pd.notna(coef_dict.get("estimate", np.nan)) else 0.0
                            coef_msg.std_error = coef_dict.get("std_error", np.nan) if pd.notna(coef_dict.get("std_error", np.nan)) else 0.0
                            coef_msg.t_statistic = coef_dict.get("t_statistic", np.nan) if pd.notna(coef_dict.get("t_statistic", np.nan)) else 0.0
                            coef_msg.p_value = coef_dict.get("p_value", np.nan) if pd.notna(coef_dict.get("p_value", np.nan)) else 0.0
                            reg_msg.coefficients.append(coef_msg)
                    
                    response.regressions.append(reg_msg) # Используем поле regressions (repeated)
            # --- Конец регрессионного анализа --- 

            # --- Биномиальный анализ (автоматический поиск столбцов) ---
            response.processing_log.append("Attempting binomial analysis on suitable columns (inferring n, estimating p, GoF test)...")
            found_suitable_binomial_column = False
            for col_name in df.columns:
                # Проверяем, подходит ли столбец (целочисленный, неотрицательный)
                col_data = df[col_name].dropna()
                if col_data.empty:
                    continue

                is_int_type = pd.api.types.is_integer_dtype(col_data)
                is_float_with_int_values = False
                if pd.api.types.is_float_dtype(col_data):
                    try:
                        if np.all(col_data == col_data.astype(int)):
                             is_float_with_int_values = True
                             df[col_name] = col_data.astype(int)
                             col_data = df[col_name]
                             is_int_type = True
                             response.processing_log.append(f"Column '{col_name}' converted from float to integer for binomial analysis.")
                    except Exception:
                        pass

                if is_int_type and not (col_data < 0).any():
                    response.processing_log.append(f"Column '{col_name}' identified as potentially suitable for binomial analysis.")
                    # Вызываем новую функцию анализа
                    binomial_analysis_result_dict, binom_logs = perform_binomial_analysis(
                        df,
                        column_name=col_name
                        # confidence_level будет взят по умолчанию
                    )
                    response.processing_log.extend(binom_logs)
                    # Флаг found_suitable_binomial_column теперь не так важен, так как мы всегда пытаемся
                    # found_suitable_binomial_column = True # Можно убрать

                    if binomial_analysis_result_dict:
                        # Используем новое имя сообщения Protobuf
                        binom_msg = analysis_pb2.BinomialAnalysisResult()
                        
                        # --- Correct mapping from dict keys to proto fields --- 
                        binom_msg.variable_name = binomial_analysis_result_dict.get("variable_name", "N/A")
                        binom_msg.total_experiments = binomial_analysis_result_dict.get("total_experiments", 0)
                        binom_msg.inferred_n = binomial_analysis_result_dict.get("inferred_n", 0)
                        binom_msg.total_successes = binomial_analysis_result_dict.get("total_successes", 0)
                        binom_msg.estimated_prob = binomial_analysis_result_dict.get("estimated_prob", np.nan)
                        binom_msg.ci_lower = binomial_analysis_result_dict.get("ci_lower", np.nan)
                        binom_msg.ci_upper = binomial_analysis_result_dict.get("ci_upper", np.nan)
                        binom_msg.confidence_level = binomial_analysis_result_dict.get("confidence_level", 0.0)
                        binom_msg.gof_statistic = binomial_analysis_result_dict.get("gof_statistic", np.nan)
                        binom_msg.gof_p_value = binomial_analysis_result_dict.get("gof_p_value", np.nan)
                        binom_msg.gof_conclusion = binomial_analysis_result_dict.get("gof_conclusion", "N/A")
                        binom_msg.gof_warning = binomial_analysis_result_dict.get("gof_warning", False)
                        # --- End of correct mapping ---

                        # Обработка NaN перед присвоением (Protobuf не любит NaN)
                        if pd.isna(binom_msg.estimated_prob): binom_msg.estimated_prob = 0.0
                        if pd.isna(binom_msg.ci_lower): binom_msg.ci_lower = 0.0
                        if pd.isna(binom_msg.ci_upper): binom_msg.ci_upper = 0.0
                        if pd.isna(binom_msg.gof_statistic): binom_msg.gof_statistic = 0.0
                        if pd.isna(binom_msg.gof_p_value): binom_msg.gof_p_value = 0.0

                        # Используем обновленное имя поля и метод append
                        response.binomial_analysis_results.append(binom_msg)
                # Эту ветку можно убрать, т.к. сама функция analysis вернет None и запишет лог
                # else:
                #     response.processing_log.append(f"Column '{col_name}' skipped for binomial analysis (not integer or contains negative values).")

            # Лог о том, что не найдено подходящих столбцов, теперь менее актуален
            # if not found_suitable_binomial_column:
            #     response.processing_log.append("No suitable columns found for binomial analysis.")
            # --- Конец биномиального анализа ---

            # Конвертируем результаты в Protobuf сообщения
            if descriptive_results:
                for stats_dict in descriptive_results:
                    stats_msg = analysis_pb2.DescriptiveStatistics()
                    stats_msg.variable_name = stats_dict["variable_name"]
                    stats_msg.count = stats_dict["count"]
                    # Обработка NaN перед присвоением float/double полям Protobuf
                    stats_msg.mean = stats_dict["mean"] if pd.notna(stats_dict["mean"]) else 0.0
                    stats_msg.median = stats_dict["median"] if pd.notna(stats_dict["median"]) else 0.0
                    stats_msg.mode.extend(stats_dict["mode"]) # mode уже list of float
                    stats_msg.variance = stats_dict["variance"] if pd.notna(stats_dict["variance"]) else 0.0
                    stats_msg.std_dev = stats_dict["std_dev"] if pd.notna(stats_dict["std_dev"]) else 0.0
                    stats_msg.variation_coefficient = stats_dict["variation_coefficient"] if pd.notna(stats_dict["variation_coefficient"]) else 0.0
                    stats_msg.skewness = stats_dict["skewness"] if pd.notna(stats_dict["skewness"]) else 0.0
                    stats_msg.kurtosis = stats_dict["kurtosis"] if pd.notna(stats_dict["kurtosis"]) else 0.0
                    stats_msg.min_value = stats_dict["min_value"]
                    stats_msg.max_value = stats_dict["max_value"]
                    response.descriptives.append(stats_msg)
            # --- Конец обработки описательных статистик --- 

            # Конвертируем результаты теста на нормальность в Protobuf сообщения
            if normality_results:
                for test_dict in normality_results:
                    test_msg = analysis_pb2.NormalityTestResult()
                    test_msg.variable_name = test_dict["variable_name"]
                    test_msg.test_name = test_dict["test_name"]
                    test_msg.statistic = test_dict["statistic"] if pd.notna(test_dict["statistic"]) else 0.0 # Заменяем NaN на 0.0 для protobuf
                    test_msg.p_value = test_dict["p_value"] if pd.notna(test_dict["p_value"]) else 0.0       # Заменяем NaN на 0.0 для protobuf
                    test_msg.conclusion = test_dict["conclusion"]
                    response.normality_tests.append(test_msg)
            # --- Конец обработки теста на нормальность --- 
            
            # Конвертируем результаты доверительных интервалов в Protobuf сообщения
            if ci_results:
                for ci_dict in ci_results:
                    ci_msg = analysis_pb2.ConfidenceInterval()
                    ci_msg.variable_name = ci_dict["variable_name"]
                    ci_msg.parameter_name = ci_dict["parameter_name"]
                    ci_msg.confidence_level = ci_dict["confidence_level"]
                    # Заменяем NaN на 0.0 или какое-то другое значение, если нужно
                    ci_msg.lower_bound = ci_dict["lower_bound"] if pd.notna(ci_dict["lower_bound"]) else 0.0 
                    ci_msg.upper_bound = ci_dict["upper_bound"] if pd.notna(ci_dict["upper_bound"]) else 0.0
                    response.confidence_intervals.append(ci_msg)
            # --- Конец обработки доверительных интервалов --- 
            
            # Конвертируем результаты проверки гипотез в Protobuf сообщения
            if hyp_results:
                for hyp_dict in hyp_results:
                    hyp_msg = analysis_pb2.HypothesisTestResult()
                    hyp_msg.test_name = hyp_dict["test_name"]
                    # Добавляем имя переменной в описание для ясности
                    hyp_msg.description = f'{hyp_dict["variable_name"]}: {hyp_dict["description"]}'
                    hyp_msg.statistic = hyp_dict["statistic"] if pd.notna(hyp_dict["statistic"]) else 0.0
                    hyp_msg.p_value = hyp_dict["p_value"] if pd.notna(hyp_dict["p_value"]) else 0.0
                    hyp_msg.conclusion = hyp_dict["conclusion"]
                    response.hypothesis_tests.append(hyp_msg)
            # --- Конец проверки гипотез --- 
            
            # Конвертируем результаты Хи-квадрат теста в Protobuf сообщения
            if chi2_results:
                for chi2_dict in chi2_results:
                    chi2_msg = analysis_pb2.PearsonChiSquareTestResult() # Используем правильное имя сообщения
                    chi2_msg.variable_name = chi2_dict["variable_name"]
                    chi2_msg.test_name = chi2_dict["test_name"]
                    chi2_msg.distribution = chi2_dict["distribution"]
                    chi2_msg.statistic = chi2_dict["statistic"] if pd.notna(chi2_dict["statistic"]) else 0.0
                    chi2_msg.p_value = chi2_dict["p_value"] if pd.notna(chi2_dict["p_value"]) else 0.0
                    chi2_msg.degrees_of_freedom = chi2_dict["degrees_of_freedom"] if pd.notna(chi2_dict["degrees_of_freedom"]) else 0 # Используем int, NaN не должно быть
                    chi2_msg.conclusion = chi2_dict["conclusion"]
                    response.pearson_chi_square_results.append(chi2_msg) # Предполагаемое имя поля
            # --- Конец Хи-квадрат теста --- 
            
            # Заменяем плейсхолдер
            response.processing_log.append("Core statistical analysis completed.") 

        except pd.errors.ParserError as e: # Оставляем обработку ошибок парсинга
            message = f"Error parsing file {file_name}: {e}"
            response.processing_log.append(f"Error: {message}")
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(message)
            print(message, file=sys.stderr)

        except pd.errors.EmptyDataError as e: # <<-- Новый блок
            message = f"The provided file '{file_name}' is empty or contains no data."
            response.processing_log.append(f"Error: {message}")
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT) # Используем INVALID_ARGUMENT (ошибка пользователя)
            context.set_details(message)
            print(message, file=sys.stderr)

        except Exception as e: # Общая ошибка остается последней
            import traceback
            error_type = type(e).__name__
            error_traceback = traceback.format_exc()
            message = f"An unexpected error occurred ({error_type}): {e}"
            detailed_log = f"Error: {message}\nTraceback:\n{error_traceback}"
            print(detailed_log, file=sys.stderr) # <<-- Выводим в stderr

            response.processing_log.append(f"Error: {message}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(message) # Не отправляем traceback клиенту
            # print(f"Error: {message}") # Старый print заменен на detailed_log

        print("Sending response")
        return response

# Функция для запуска сервера
def serve():
    print("--- serve() function called ---") # <<-- Добавлено
    server = None # Инициализируем заранее
    try:
        print("--- Creating gRPC server instance ---") # <<-- Добавлено
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        print("--- gRPC server instance created ---") # <<-- Добавлено

        print("--- Registering AnalysisService ---") # <<-- Добавлено
        analysis_pb2_grpc.add_AnalysisServiceServicer_to_server(AnalysisServiceImpl(), server)
        print("--- AnalysisService registered ---") # <<-- Добавлено

        port = "50051"
        address = f'[::]:{port}'
        print(f"--- Adding insecure port: {address} ---") # <<-- Добавлено
        server.add_insecure_port(address)
        print(f"--- Insecure port {address} added ---") # <<-- Добавлено

        print("--- Starting server ---") # <<-- Добавлено
        server.start()
        print(f"--- Python Analysis Server started successfully on port {port} ---") # <<-- Изменено

        # Бесконечный цикл, чтобы сервер работал
        print("--- Entering wait loop ---") # <<-- Добавлено
        server.wait_for_termination() # Используем wait_for_termination вместо sleep loop

    except Exception as e: # <<-- Добавлен блок except для ошибок при запуске
        print(f"--- FATAL ERROR during server startup: {e} ---", file=sys.stderr)
        if server:
            server.stop(0) # Пытаемся остановить сервер, если он был создан
        sys.exit(1) # Выходим с ошибкой

if __name__ == '__main__':
    print("--- Script entry point (__main__) ---") # <<-- Добавлено
    serve()
    print("--- serve() function finished (should not happen unless server stopped) ---") # <<-- Добавлено 