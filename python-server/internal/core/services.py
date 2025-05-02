import numpy as np
from internal.core.entities import AnalysisRequest, AnalysisResponse
from internal.interfaces.analysis_service import IAnalysisService

class AnalysisService(IAnalysisService):
    def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        data = request.data
        method = request.method.lower()

        if method == "mean":
            result = float(np.mean(data))
        elif method == "median":
            result = float(np.median(data))
        elif method == "std_dev":
            result = float(np.std(data, ddof=1))
        else:
            raise ValueError("Unsupported method")

        return AnalysisResponse(result)