from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Iterable as _Iterable, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AnalysisRequest(_message.Message):
    __slots__ = ("file_content", "file_name")
    FILE_CONTENT_FIELD_NUMBER: _ClassVar[int]
    FILE_NAME_FIELD_NUMBER: _ClassVar[int]
    file_content: bytes
    file_name: str
    def __init__(self, file_content: _Optional[bytes] = ..., file_name: _Optional[str] = ...) -> None: ...

class AnalysisResponse(_message.Message):
    __slots__ = ("descriptives", "normality_tests", "confidence_intervals", "hypothesis_tests", "chi_square_test", "correlation", "regression", "binomial_estimate", "processing_log")
    DESCRIPTIVES_FIELD_NUMBER: _ClassVar[int]
    NORMALITY_TESTS_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_INTERVALS_FIELD_NUMBER: _ClassVar[int]
    HYPOTHESIS_TESTS_FIELD_NUMBER: _ClassVar[int]
    CHI_SQUARE_TEST_FIELD_NUMBER: _ClassVar[int]
    CORRELATION_FIELD_NUMBER: _ClassVar[int]
    REGRESSION_FIELD_NUMBER: _ClassVar[int]
    BINOMIAL_ESTIMATE_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_LOG_FIELD_NUMBER: _ClassVar[int]
    descriptives: _containers.RepeatedCompositeFieldContainer[DescriptiveStatistics]
    normality_tests: _containers.RepeatedCompositeFieldContainer[NormalityTestResult]
    confidence_intervals: _containers.RepeatedCompositeFieldContainer[ConfidenceInterval]
    hypothesis_tests: _containers.RepeatedCompositeFieldContainer[HypothesisTestResult]
    chi_square_test: PearsonChiSquareTestResult
    correlation: CorrelationResult
    regression: RegressionResult
    binomial_estimate: BinomialEstimate
    processing_log: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, descriptives: _Optional[_Iterable[_Union[DescriptiveStatistics, _Mapping]]] = ..., normality_tests: _Optional[_Iterable[_Union[NormalityTestResult, _Mapping]]] = ..., confidence_intervals: _Optional[_Iterable[_Union[ConfidenceInterval, _Mapping]]] = ..., hypothesis_tests: _Optional[_Iterable[_Union[HypothesisTestResult, _Mapping]]] = ..., chi_square_test: _Optional[_Union[PearsonChiSquareTestResult, _Mapping]] = ..., correlation: _Optional[_Union[CorrelationResult, _Mapping]] = ..., regression: _Optional[_Union[RegressionResult, _Mapping]] = ..., binomial_estimate: _Optional[_Union[BinomialEstimate, _Mapping]] = ..., processing_log: _Optional[_Iterable[str]] = ...) -> None: ...

class DescriptiveStatistics(_message.Message):
    __slots__ = ("variable_name", "count", "mean", "median", "mode", "variance", "std_dev", "variation_coefficient", "skewness", "kurtosis", "min_value", "max_value")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    COUNT_FIELD_NUMBER: _ClassVar[int]
    MEAN_FIELD_NUMBER: _ClassVar[int]
    MEDIAN_FIELD_NUMBER: _ClassVar[int]
    MODE_FIELD_NUMBER: _ClassVar[int]
    VARIANCE_FIELD_NUMBER: _ClassVar[int]
    STD_DEV_FIELD_NUMBER: _ClassVar[int]
    VARIATION_COEFFICIENT_FIELD_NUMBER: _ClassVar[int]
    SKEWNESS_FIELD_NUMBER: _ClassVar[int]
    KURTOSIS_FIELD_NUMBER: _ClassVar[int]
    MIN_VALUE_FIELD_NUMBER: _ClassVar[int]
    MAX_VALUE_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    count: int
    mean: float
    median: float
    mode: _containers.RepeatedScalarFieldContainer[float]
    variance: float
    std_dev: float
    variation_coefficient: float
    skewness: float
    kurtosis: float
    min_value: float
    max_value: float
    def __init__(self, variable_name: _Optional[str] = ..., count: _Optional[int] = ..., mean: _Optional[float] = ..., median: _Optional[float] = ..., mode: _Optional[_Iterable[float]] = ..., variance: _Optional[float] = ..., std_dev: _Optional[float] = ..., variation_coefficient: _Optional[float] = ..., skewness: _Optional[float] = ..., kurtosis: _Optional[float] = ..., min_value: _Optional[float] = ..., max_value: _Optional[float] = ...) -> None: ...

class NormalityTestResult(_message.Message):
    __slots__ = ("variable_name", "test_name", "statistic", "p_value", "conclusion")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    TEST_NAME_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    CONCLUSION_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    test_name: str
    statistic: float
    p_value: float
    conclusion: str
    def __init__(self, variable_name: _Optional[str] = ..., test_name: _Optional[str] = ..., statistic: _Optional[float] = ..., p_value: _Optional[float] = ..., conclusion: _Optional[str] = ...) -> None: ...

class ConfidenceInterval(_message.Message):
    __slots__ = ("variable_name", "parameter_name", "lower_bound", "upper_bound", "confidence_level")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    PARAMETER_NAME_FIELD_NUMBER: _ClassVar[int]
    LOWER_BOUND_FIELD_NUMBER: _ClassVar[int]
    UPPER_BOUND_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_LEVEL_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    parameter_name: str
    lower_bound: float
    upper_bound: float
    confidence_level: float
    def __init__(self, variable_name: _Optional[str] = ..., parameter_name: _Optional[str] = ..., lower_bound: _Optional[float] = ..., upper_bound: _Optional[float] = ..., confidence_level: _Optional[float] = ...) -> None: ...

class HypothesisTestResult(_message.Message):
    __slots__ = ("test_name", "description", "statistic", "p_value", "conclusion")
    TEST_NAME_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    CONCLUSION_FIELD_NUMBER: _ClassVar[int]
    test_name: str
    description: str
    statistic: float
    p_value: float
    conclusion: str
    def __init__(self, test_name: _Optional[str] = ..., description: _Optional[str] = ..., statistic: _Optional[float] = ..., p_value: _Optional[float] = ..., conclusion: _Optional[str] = ...) -> None: ...

class PearsonChiSquareTestResult(_message.Message):
    __slots__ = ("description", "statistic", "degrees_of_freedom", "p_value", "conclusion")
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    DEGREES_OF_FREEDOM_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    CONCLUSION_FIELD_NUMBER: _ClassVar[int]
    description: str
    statistic: float
    degrees_of_freedom: int
    p_value: float
    conclusion: str
    def __init__(self, description: _Optional[str] = ..., statistic: _Optional[float] = ..., degrees_of_freedom: _Optional[int] = ..., p_value: _Optional[float] = ..., conclusion: _Optional[str] = ...) -> None: ...

class CorrelationResult(_message.Message):
    __slots__ = ("pearson", "spearman")
    class PearsonCorrelation(_message.Message):
        __slots__ = ("variable1", "variable2", "coefficient", "p_value")
        VARIABLE1_FIELD_NUMBER: _ClassVar[int]
        VARIABLE2_FIELD_NUMBER: _ClassVar[int]
        COEFFICIENT_FIELD_NUMBER: _ClassVar[int]
        P_VALUE_FIELD_NUMBER: _ClassVar[int]
        variable1: str
        variable2: str
        coefficient: float
        p_value: float
        def __init__(self, variable1: _Optional[str] = ..., variable2: _Optional[str] = ..., coefficient: _Optional[float] = ..., p_value: _Optional[float] = ...) -> None: ...
    class SpearmanCorrelation(_message.Message):
        __slots__ = ("variable1", "variable2", "coefficient", "p_value")
        VARIABLE1_FIELD_NUMBER: _ClassVar[int]
        VARIABLE2_FIELD_NUMBER: _ClassVar[int]
        COEFFICIENT_FIELD_NUMBER: _ClassVar[int]
        P_VALUE_FIELD_NUMBER: _ClassVar[int]
        variable1: str
        variable2: str
        coefficient: float
        p_value: float
        def __init__(self, variable1: _Optional[str] = ..., variable2: _Optional[str] = ..., coefficient: _Optional[float] = ..., p_value: _Optional[float] = ...) -> None: ...
    PEARSON_FIELD_NUMBER: _ClassVar[int]
    SPEARMAN_FIELD_NUMBER: _ClassVar[int]
    pearson: _containers.RepeatedCompositeFieldContainer[CorrelationResult.PearsonCorrelation]
    spearman: _containers.RepeatedCompositeFieldContainer[CorrelationResult.SpearmanCorrelation]
    def __init__(self, pearson: _Optional[_Iterable[_Union[CorrelationResult.PearsonCorrelation, _Mapping]]] = ..., spearman: _Optional[_Iterable[_Union[CorrelationResult.SpearmanCorrelation, _Mapping]]] = ...) -> None: ...

class RegressionResult(_message.Message):
    __slots__ = ("model_type", "dependent_variable", "independent_variables", "r_squared", "adjusted_r_squared", "f_statistic", "f_p_value", "coefficients")
    class Coefficient(_message.Message):
        __slots__ = ("variable_name", "estimate", "std_error", "t_statistic", "p_value")
        VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
        ESTIMATE_FIELD_NUMBER: _ClassVar[int]
        STD_ERROR_FIELD_NUMBER: _ClassVar[int]
        T_STATISTIC_FIELD_NUMBER: _ClassVar[int]
        P_VALUE_FIELD_NUMBER: _ClassVar[int]
        variable_name: str
        estimate: float
        std_error: float
        t_statistic: float
        p_value: float
        def __init__(self, variable_name: _Optional[str] = ..., estimate: _Optional[float] = ..., std_error: _Optional[float] = ..., t_statistic: _Optional[float] = ..., p_value: _Optional[float] = ...) -> None: ...
    MODEL_TYPE_FIELD_NUMBER: _ClassVar[int]
    DEPENDENT_VARIABLE_FIELD_NUMBER: _ClassVar[int]
    INDEPENDENT_VARIABLES_FIELD_NUMBER: _ClassVar[int]
    R_SQUARED_FIELD_NUMBER: _ClassVar[int]
    ADJUSTED_R_SQUARED_FIELD_NUMBER: _ClassVar[int]
    F_STATISTIC_FIELD_NUMBER: _ClassVar[int]
    F_P_VALUE_FIELD_NUMBER: _ClassVar[int]
    COEFFICIENTS_FIELD_NUMBER: _ClassVar[int]
    model_type: str
    dependent_variable: str
    independent_variables: _containers.RepeatedScalarFieldContainer[str]
    r_squared: float
    adjusted_r_squared: float
    f_statistic: float
    f_p_value: float
    coefficients: _containers.RepeatedCompositeFieldContainer[RegressionResult.Coefficient]
    def __init__(self, model_type: _Optional[str] = ..., dependent_variable: _Optional[str] = ..., independent_variables: _Optional[_Iterable[str]] = ..., r_squared: _Optional[float] = ..., adjusted_r_squared: _Optional[float] = ..., f_statistic: _Optional[float] = ..., f_p_value: _Optional[float] = ..., coefficients: _Optional[_Iterable[_Union[RegressionResult.Coefficient, _Mapping]]] = ...) -> None: ...

class BinomialEstimate(_message.Message):
    __slots__ = ("variable_name", "total_trials", "successes", "probability_estimate")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    TOTAL_TRIALS_FIELD_NUMBER: _ClassVar[int]
    SUCCESSES_FIELD_NUMBER: _ClassVar[int]
    PROBABILITY_ESTIMATE_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    total_trials: int
    successes: int
    probability_estimate: float
    def __init__(self, variable_name: _Optional[str] = ..., total_trials: _Optional[int] = ..., successes: _Optional[int] = ..., probability_estimate: _Optional[float] = ...) -> None: ...
