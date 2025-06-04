from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Iterable as _Iterable, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AnalysisRequest(_message.Message):
    __slots__ = ("file_content", "file_name", "selected_analyses")
    FILE_CONTENT_FIELD_NUMBER: _ClassVar[int]
    FILE_NAME_FIELD_NUMBER: _ClassVar[int]
    SELECTED_ANALYSES_FIELD_NUMBER: _ClassVar[int]
    file_content: bytes
    file_name: str
    selected_analyses: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, file_content: _Optional[bytes] = ..., file_name: _Optional[str] = ..., selected_analyses: _Optional[_Iterable[str]] = ...) -> None: ...

class AnalyzeDataResponse(_message.Message):
    __slots__ = ("descriptive_stats", "normality_tests", "regression_analysis", "processing_log", "error")
    DESCRIPTIVE_STATS_FIELD_NUMBER: _ClassVar[int]
    NORMALITY_TESTS_FIELD_NUMBER: _ClassVar[int]
    REGRESSION_ANALYSIS_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_LOG_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    descriptive_stats: DescriptiveStatisticsResponse
    normality_tests: NormalityTestsResponse
    regression_analysis: RegressionAnalysisResponse
    processing_log: _containers.RepeatedScalarFieldContainer[str]
    error: ErrorDetails
    def __init__(self, descriptive_stats: _Optional[_Union[DescriptiveStatisticsResponse, _Mapping]] = ..., normality_tests: _Optional[_Union[NormalityTestsResponse, _Mapping]] = ..., regression_analysis: _Optional[_Union[RegressionAnalysisResponse, _Mapping]] = ..., processing_log: _Optional[_Iterable[str]] = ..., error: _Optional[_Union[ErrorDetails, _Mapping]] = ...) -> None: ...

class ErrorDetails(_message.Message):
    __slots__ = ("code", "message", "details")
    CODE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    DETAILS_FIELD_NUMBER: _ClassVar[int]
    code: str
    message: str
    details: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, code: _Optional[str] = ..., message: _Optional[str] = ..., details: _Optional[_Iterable[str]] = ...) -> None: ...

class DescriptiveStatisticsResponse(_message.Message):
    __slots__ = ("descriptives", "histograms", "confidence_intervals")
    DESCRIPTIVES_FIELD_NUMBER: _ClassVar[int]
    HISTOGRAMS_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_INTERVALS_FIELD_NUMBER: _ClassVar[int]
    descriptives: _containers.RepeatedCompositeFieldContainer[DescriptiveStatistics]
    histograms: _containers.RepeatedCompositeFieldContainer[HistogramData]
    confidence_intervals: _containers.RepeatedCompositeFieldContainer[ConfidenceInterval]
    def __init__(self, descriptives: _Optional[_Iterable[_Union[DescriptiveStatistics, _Mapping]]] = ..., histograms: _Optional[_Iterable[_Union[HistogramData, _Mapping]]] = ..., confidence_intervals: _Optional[_Iterable[_Union[ConfidenceInterval, _Mapping]]] = ...) -> None: ...

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
    count: str
    mean: float
    median: float
    mode: _containers.RepeatedScalarFieldContainer[str]
    variance: float
    std_dev: float
    variation_coefficient: float
    skewness: float
    kurtosis: float
    min_value: float
    max_value: float
    def __init__(self, variable_name: _Optional[str] = ..., count: _Optional[str] = ..., mean: _Optional[float] = ..., median: _Optional[float] = ..., mode: _Optional[_Iterable[str]] = ..., variance: _Optional[float] = ..., std_dev: _Optional[float] = ..., variation_coefficient: _Optional[float] = ..., skewness: _Optional[float] = ..., kurtosis: _Optional[float] = ..., min_value: _Optional[float] = ..., max_value: _Optional[float] = ...) -> None: ...

class HistogramData(_message.Message):
    __slots__ = ("column_name", "bins", "frequencies")
    COLUMN_NAME_FIELD_NUMBER: _ClassVar[int]
    BINS_FIELD_NUMBER: _ClassVar[int]
    FREQUENCIES_FIELD_NUMBER: _ClassVar[int]
    column_name: str
    bins: _containers.RepeatedScalarFieldContainer[float]
    frequencies: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, column_name: _Optional[str] = ..., bins: _Optional[_Iterable[float]] = ..., frequencies: _Optional[_Iterable[int]] = ...) -> None: ...

class ConfidenceInterval(_message.Message):
    __slots__ = ("column_name", "confidence_level", "lower_bound", "upper_bound", "mean", "standard_error")
    COLUMN_NAME_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_LEVEL_FIELD_NUMBER: _ClassVar[int]
    LOWER_BOUND_FIELD_NUMBER: _ClassVar[int]
    UPPER_BOUND_FIELD_NUMBER: _ClassVar[int]
    MEAN_FIELD_NUMBER: _ClassVar[int]
    STANDARD_ERROR_FIELD_NUMBER: _ClassVar[int]
    column_name: str
    confidence_level: float
    lower_bound: float
    upper_bound: float
    mean: float
    standard_error: float
    def __init__(self, column_name: _Optional[str] = ..., confidence_level: _Optional[float] = ..., lower_bound: _Optional[float] = ..., upper_bound: _Optional[float] = ..., mean: _Optional[float] = ..., standard_error: _Optional[float] = ...) -> None: ...

class NormalityTestsResponse(_message.Message):
    __slots__ = ("shapiro_wilk_results", "chi_square_results")
    SHAPIRO_WILK_RESULTS_FIELD_NUMBER: _ClassVar[int]
    CHI_SQUARE_RESULTS_FIELD_NUMBER: _ClassVar[int]
    shapiro_wilk_results: _containers.RepeatedCompositeFieldContainer[NormalityTestResult]
    chi_square_results: _containers.RepeatedCompositeFieldContainer[PearsonChiSquareResult]
    def __init__(self, shapiro_wilk_results: _Optional[_Iterable[_Union[NormalityTestResult, _Mapping]]] = ..., chi_square_results: _Optional[_Iterable[_Union[PearsonChiSquareResult, _Mapping]]] = ...) -> None: ...

class NormalityTestResult(_message.Message):
    __slots__ = ("column_name", "test_name", "statistic", "p_value", "is_normal")
    COLUMN_NAME_FIELD_NUMBER: _ClassVar[int]
    TEST_NAME_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    IS_NORMAL_FIELD_NUMBER: _ClassVar[int]
    column_name: str
    test_name: str
    statistic: float
    p_value: float
    is_normal: bool
    def __init__(self, column_name: _Optional[str] = ..., test_name: _Optional[str] = ..., statistic: _Optional[float] = ..., p_value: _Optional[float] = ..., is_normal: bool = ...) -> None: ...

class PearsonChiSquareResult(_message.Message):
    __slots__ = ("column_name", "statistic", "p_value", "degrees_of_freedom", "intervals", "is_normal")
    COLUMN_NAME_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    DEGREES_OF_FREEDOM_FIELD_NUMBER: _ClassVar[int]
    INTERVALS_FIELD_NUMBER: _ClassVar[int]
    IS_NORMAL_FIELD_NUMBER: _ClassVar[int]
    column_name: str
    statistic: float
    p_value: float
    degrees_of_freedom: int
    intervals: int
    is_normal: bool
    def __init__(self, column_name: _Optional[str] = ..., statistic: _Optional[float] = ..., p_value: _Optional[float] = ..., degrees_of_freedom: _Optional[int] = ..., intervals: _Optional[int] = ..., is_normal: bool = ...) -> None: ...

class RegressionAnalysisResponse(_message.Message):
    __slots__ = ("dependent_variable", "independent_variables", "data_points", "models")
    DEPENDENT_VARIABLE_FIELD_NUMBER: _ClassVar[int]
    INDEPENDENT_VARIABLES_FIELD_NUMBER: _ClassVar[int]
    DATA_POINTS_FIELD_NUMBER: _ClassVar[int]
    MODELS_FIELD_NUMBER: _ClassVar[int]
    dependent_variable: str
    independent_variables: _containers.RepeatedScalarFieldContainer[str]
    data_points: _containers.RepeatedCompositeFieldContainer[DataPoint]
    models: _containers.RepeatedCompositeFieldContainer[RegressionModel]
    def __init__(self, dependent_variable: _Optional[str] = ..., independent_variables: _Optional[_Iterable[str]] = ..., data_points: _Optional[_Iterable[_Union[DataPoint, _Mapping]]] = ..., models: _Optional[_Iterable[_Union[RegressionModel, _Mapping]]] = ...) -> None: ...

class RegressionModel(_message.Message):
    __slots__ = ("regression_type", "r_squared", "adjusted_r_squared", "f_statistic", "prob_f_statistic", "sse", "coefficients", "residuals", "residuals_analysis")
    REGRESSION_TYPE_FIELD_NUMBER: _ClassVar[int]
    R_SQUARED_FIELD_NUMBER: _ClassVar[int]
    ADJUSTED_R_SQUARED_FIELD_NUMBER: _ClassVar[int]
    F_STATISTIC_FIELD_NUMBER: _ClassVar[int]
    PROB_F_STATISTIC_FIELD_NUMBER: _ClassVar[int]
    SSE_FIELD_NUMBER: _ClassVar[int]
    COEFFICIENTS_FIELD_NUMBER: _ClassVar[int]
    RESIDUALS_FIELD_NUMBER: _ClassVar[int]
    RESIDUALS_ANALYSIS_FIELD_NUMBER: _ClassVar[int]
    regression_type: str
    r_squared: float
    adjusted_r_squared: float
    f_statistic: float
    prob_f_statistic: float
    sse: float
    coefficients: _containers.RepeatedCompositeFieldContainer[RegressionCoefficient]
    residuals: _containers.RepeatedScalarFieldContainer[float]
    residuals_analysis: ResidualsAnalysisResult
    def __init__(self, regression_type: _Optional[str] = ..., r_squared: _Optional[float] = ..., adjusted_r_squared: _Optional[float] = ..., f_statistic: _Optional[float] = ..., prob_f_statistic: _Optional[float] = ..., sse: _Optional[float] = ..., coefficients: _Optional[_Iterable[_Union[RegressionCoefficient, _Mapping]]] = ..., residuals: _Optional[_Iterable[float]] = ..., residuals_analysis: _Optional[_Union[ResidualsAnalysisResult, _Mapping]] = ...) -> None: ...

class RegressionCoefficient(_message.Message):
    __slots__ = ("variable_name", "coefficient", "std_error", "t_statistic", "p_value", "confidence_interval_lower", "confidence_interval_upper")
    VARIABLE_NAME_FIELD_NUMBER: _ClassVar[int]
    COEFFICIENT_FIELD_NUMBER: _ClassVar[int]
    STD_ERROR_FIELD_NUMBER: _ClassVar[int]
    T_STATISTIC_FIELD_NUMBER: _ClassVar[int]
    P_VALUE_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_INTERVAL_LOWER_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_INTERVAL_UPPER_FIELD_NUMBER: _ClassVar[int]
    variable_name: str
    coefficient: float
    std_error: float
    t_statistic: float
    p_value: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    def __init__(self, variable_name: _Optional[str] = ..., coefficient: _Optional[float] = ..., std_error: _Optional[float] = ..., t_statistic: _Optional[float] = ..., p_value: _Optional[float] = ..., confidence_interval_lower: _Optional[float] = ..., confidence_interval_upper: _Optional[float] = ...) -> None: ...

class DataPoint(_message.Message):
    __slots__ = ("x", "y")
    X_FIELD_NUMBER: _ClassVar[int]
    Y_FIELD_NUMBER: _ClassVar[int]
    x: float
    y: float
    def __init__(self, x: _Optional[float] = ..., y: _Optional[float] = ...) -> None: ...

class ResidualsAnalysisResult(_message.Message):
    __slots__ = ("shapiro_test", "histogram", "qq_plot")
    SHAPIRO_TEST_FIELD_NUMBER: _ClassVar[int]
    HISTOGRAM_FIELD_NUMBER: _ClassVar[int]
    QQ_PLOT_FIELD_NUMBER: _ClassVar[int]
    shapiro_test: NormalityTestResult
    histogram: HistogramData
    qq_plot: QQPlotData
    def __init__(self, shapiro_test: _Optional[_Union[NormalityTestResult, _Mapping]] = ..., histogram: _Optional[_Union[HistogramData, _Mapping]] = ..., qq_plot: _Optional[_Union[QQPlotData, _Mapping]] = ...) -> None: ...

class QQPlotData(_message.Message):
    __slots__ = ("theoretical_quantiles", "sample_quantiles")
    THEORETICAL_QUANTILES_FIELD_NUMBER: _ClassVar[int]
    SAMPLE_QUANTILES_FIELD_NUMBER: _ClassVar[int]
    theoretical_quantiles: _containers.RepeatedScalarFieldContainer[float]
    sample_quantiles: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, theoretical_quantiles: _Optional[_Iterable[float]] = ..., sample_quantiles: _Optional[_Iterable[float]] = ...) -> None: ...
