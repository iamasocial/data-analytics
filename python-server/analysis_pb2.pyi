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
    __slots__ = ("descriptives", "normality_tests", "confidence_intervals", "hypothesis_tests", "pearson_chi_square_results", "correlation", "regressions", "binomial_analysis_results", "processing_log")
    DESCRIPTIVES_FIELD_NUMBER: _ClassVar[int]
    NORMALITY_TESTS_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_INTERVALS_FIELD_NUMBER: _ClassVar[int]
    HYPOTHESIS_TESTS_FIELD_NUMBER: _ClassVar[int]
    PEARSON_CHI_SQUARE_RESULTS_FIELD_NUMBER: _ClassVar[int]
    CORRELATION_FIELD_NUMBER: _ClassVar[int]
    REGRESSIONS_FIELD_NUMBER: _ClassVar[int]
    BINOMIAL_ANALYSIS_RESULTS_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_LOG_FIELD_NUMBER: _ClassVar[int]
    descriptives: _containers.RepeatedCompositeFieldContainer[DescriptiveStatistics]
    normality_tests: _containers.RepeatedCompositeFieldContainer[NormalityTestResult]
    confidence_intervals: _containers.RepeatedCompositeFieldContainer[ConfidenceInterval]
    hypothesis_tests: _containers.RepeatedCompositeFieldContainer[HypothesisTestResult]
    pearson_chi_square_results: _containers.RepeatedCompositeFieldContainer[PearsonChiSquareTestResult]
    correlation: CorrelationResult
    regressions: _containers.RepeatedCompositeFieldContainer[RegressionResult]
    binomial_analysis_results: _containers.RepeatedCompositeFieldContainer[BinomialAnalysisResult]
    processing_log: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, descriptives: _Optional[_Iterable[_Union[DescriptiveStatistics, _Mapping]]] = ..., normality_tests: _Optional[_Iterable[_Union[NormalityTestResult, _Mapping]]] = ..., confidence_intervals: _Optional[_Iterable[_Union[ConfidenceInterval, _Mapping]]] = ..., hypothesis_tests: _Optional[_Iterable[_Union[HypothesisTestResult, _Mapping]]] = ..., pearson_chi_square_results: _Optional[_Iterable[_Union[PearsonChiSquareTestResult, _Mapping]]] = ..., correlation: _Optional[_Union[CorrelationResult, _Mapping]] = ..., regressions: _Optional[_Iterable[_Union[RegressionResult, _Mapping]]] = ..., binomial_analysis_results: _Optional[_Iterable[_Union[BinomialAnalysisResult, _Mapping]]] = ..., processing_log: _Optional[_Iterable[str]] = ...) -> None: ...

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
    __slots__ = ("variable_name", "statistic", "degrees_of_freedom", "p_value", "conclusion", "test_name", "distribution")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    DEGREES_OF_FREEDOM_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    CONCLUSION_FIELD_NUMBER: _ClassVar[int]
    TEST_NAME_FIELD_NUMBER: _ClassVar[int]
    DISTRIBUTION_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    statistic: float
    degrees_of_freedom: int
    p_value: float
    conclusion: str
    test_name: str
    distribution: str
    def __init__(self, variable_name: _Optional[str] = ..., statistic: _Optional[float] = ..., degrees_of_freedom: _Optional[int] = ..., p_value: _Optional[float] = ..., conclusion: _Optional[str] = ..., test_name: _Optional[str] = ..., distribution: _Optional[str] = ...) -> None: ...

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

class BinomialAnalysisResult(_message.Message):
    __slots__ = ("variable_name", "total_experiments", "inferred_n", "total_successes", "estimated_prob", "ci_lower", "ci_upper", "confidence_level", "gof_statistic", "gof_p_value", "gof_conclusion", "gof_warning")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    TOTAL_EXPERIMENTS_FIELD_NUMBER: _ClassVar[int]
    INFERRED_N_FIELD_NUMBER: _ClassVar[int]
    TOTAL_SUCCESSES_FIELD_NUMBER: _ClassVar[int]
    ESTIMATED_PROB_FIELD_NUMBER: _ClassVar[int]
    CI_LOWER_FIELD_NUMBER: _ClassVar[int]
    CI_UPPER_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_LEVEL_FIELD_NUMBER: _ClassVar[int]
    GOF_STATISTIC_FIELD_NUMBER: _ClassVar[int]
    GOF_P_VALUE_FIELD_NUMBER: _ClassVar[int]
    GOF_CONCLUSION_FIELD_NUMBER: _ClassVar[int]
    GOF_WARNING_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    total_experiments: int
    inferred_n: int
    total_successes: int
    estimated_prob: float
    ci_lower: float
    ci_upper: float
    confidence_level: float
    gof_statistic: float
    gof_p_value: float
    gof_conclusion: str
    gof_warning: bool
    def __init__(self, variable_name: _Optional[str] = ..., total_experiments: _Optional[int] = ..., inferred_n: _Optional[int] = ..., total_successes: _Optional[int] = ..., estimated_prob: _Optional[float] = ..., ci_lower: _Optional[float] = ..., ci_upper: _Optional[float] = ..., confidence_level: _Optional[float] = ..., gof_statistic: _Optional[float] = ..., gof_p_value: _Optional[float] = ..., gof_conclusion: _Optional[str] = ..., gof_warning: bool = ...) -> None: ...
