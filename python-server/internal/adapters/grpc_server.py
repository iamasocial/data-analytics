import grpc
from concurrent import futures
from internal.core.services import AnalysisService
from internal.core.entities import AnalysisRequest
import generated.analysis_pb2_grpc as analysis_grpc
import generated.analysis_pb2 as analysis_pb2

class AnalysisServicer(analysis_grpc.AnalysisServiceServicer):
    def __init__(self, service: AnalysisService):
        self.service = service

    def Analyze(self, request, content):
        try:
            analysis_request = AnalysisRequest(data=list(request.data), method=request.method)
            response = self.service.analyze(analysis_request)
            return analysis_pb2.AnalysisResponse(result=response.result)
        except ValueError as e:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(e))
            return analysis_pb2.AnalysisResponse()

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    analysis_service = AnalysisService()
    analysis_grpc.add_AnalysisServiceServicer_to_server(AnalysisServicer(analysis_service), server)
    server.add_insecure_port("[::]:50052")
    server.start()
    print("Python gRPC server started on port 50052")
    server.wait_for_termination()