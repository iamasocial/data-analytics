from typing import List

class AnalysisRequest:
    def __init__(self, data: List[float], method: str):
        self.data = data
        self.method = method

class AnalysisResponse:
    def __init__(self, result: float):
        self.result = result