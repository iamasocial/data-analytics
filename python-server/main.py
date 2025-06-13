"""
Основной файл для запуска Python gRPC сервера.
"""

import sys
import signal
import time

# Импортируем инфраструктуру
from internal.adapters.grpc_server import GrpcServer
from internal.adapters.data_loader import FileDataLoader
from internal.adapters.descriptive_stats import DescriptiveStatsAdapter
from internal.adapters.normality_test import NormalityTestAdapter
from internal.adapters.confidence_interval import ConfidenceIntervalAdapter
from internal.adapters.goodness_of_fit import GoodnessOfFitAdapter
from internal.adapters.regression import RegressionAdapter
from internal.adapters.residuals_analysis import ResidualsAnalysisAdapter
from internal.adapters.wilcoxon_test import WilcoxonTestAdapter

# Импортируем сервисный слой
from internal.core.services.analysis_service import AnalysisService

def main():
    """Основная функция для запуска сервера."""
    print("--- Starting Python Analysis Server ---")
    
    try:
        # Создаем экземпляры адаптеров (вторичных)
        data_loader = FileDataLoader()
        descriptive_stats = DescriptiveStatsAdapter()
        normality_test = NormalityTestAdapter()
        confidence_interval = ConfidenceIntervalAdapter()
        goodness_of_fit = GoodnessOfFitAdapter()
        regression = RegressionAdapter()
        residuals_analysis = ResidualsAnalysisAdapter()
        wilcoxon_test = WilcoxonTestAdapter()
        
        # Создаем экземпляр сервиса анализа
        analysis_service = AnalysisService(
            data_loader=data_loader,
            descriptive_stats=descriptive_stats,
            normality_test=normality_test,
            confidence_interval=confidence_interval,
            goodness_of_fit=goodness_of_fit,
            regression=regression,
            residuals_analysis=residuals_analysis,
            wilcoxon_test=wilcoxon_test
        )
        
        # Создаем и запускаем gRPC сервер
        server = GrpcServer(analysis_service)
        server.start()
        
        # Настраиваем обработку сигналов для грациозного завершения
        def handle_signal(signum, frame):
            print(f"Received signal {signum}, shutting down...")
            server.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, handle_signal)
        signal.signal(signal.SIGTERM, handle_signal)
        
        # Блокируем основной поток до сигнала завершения
        try:
            while True:
                time.sleep(86400)  # 24 часа или любой другой большой интервал
        except KeyboardInterrupt:
            server.stop()
            print("--- Server stopped by keyboard interrupt ---")
            
    except Exception as e:
        print(f"--- Error starting server: {e} ---")
        sys.exit(1)

if __name__ == "__main__":
    main()