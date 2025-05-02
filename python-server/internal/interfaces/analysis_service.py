from abc import ABC, abstractmethod
from internal.core.entities import AnalysisRequest, AnalysisResponse

class IAnalysisService(ABC):
    @abstractmethod
    def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        pass