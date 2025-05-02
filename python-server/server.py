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
    print("--- Pandas imported successfully ---") # <<-- Добавлено
except ImportError as e:
    print(f"--- Failed to import pandas: {e} ---", file=sys.stderr) # <<-- Добавлено
    # Не выходим, может быть не критично для базового запуска? Или все же выйти? Пока оставим.
    pass


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
            # На данном этапе просто логируем, что данные прочитаны
            print(f"Data loaded successfully. Shape: {df.shape}")
            response.processing_log.append("Placeholder: Analysis logic not yet implemented.")
            # -------------------------------------------

            # Заполняем пример ответа (пока пустыми значениями или плейсхолдерами)
            # Например, добавим пустую описательную статистику для примера
            response.descriptives.add(variable_name="ExampleVar", count=df.shape[0])


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