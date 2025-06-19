"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "ru" | "en"

type Translations = {
  [key: string]: {
    ru: string
    en: string
  }
}

const translations: Translations = {
  login: {
    ru: "Войти",
    en: "Login",
  },
  register: {
    ru: "Регистрация",
    en: "Register",
  },
  email: {
    ru: "Электронная почта",
    en: "Email",
  },
  password: {
    ru: "Пароль",
    en: "Password",
  },
  confirmPassword: {
    ru: "Подтвердите пароль",
    en: "Confirm Password",
  },
  forgotPassword: {
    ru: "Забыли пароль?",
    en: "Forgot Password?",
  },
  uploadData: {
    ru: "Загрузить данные",
    en: "Upload Data",
  },
  analysisHistory: {
    ru: "История анализов",
    en: "Analysis History",
  },
  profileSettings: {
    ru: "Настройки профиля",
    en: "Profile Settings",
  },
  dragAndDrop: {
    ru: "Перетащите файлы сюда или нажмите для выбора",
    en: "Drag and drop files here or click to select",
  },
  supportedFormats: {
    ru: "Поддерживаемые форматы: CSV, XLSX, JSON",
    en: "Supported formats: CSV, XLSX, JSON",
  },
  maxFileSize: {
    ru: "Максимальный размер файла: 4 МБ",
    en: "Maximum file size: 4 MB",
  },
  uploadSuccess: {
    ru: "Загрузка прошла успешно",
    en: "Upload Successful",
  },
  uploadError: {
    ru: "Ошибка при загрузке файла",
    en: "Upload Error",
  },
  exportResults: {
    ru: "Экспорт результатов",
    en: "Export Results",
  },
  rerunAnalysis: {
    ru: "Перезапустить анализ",
    en: "Rerun Analysis",
  },
  dashboard: {
    ru: "Панель управления",
    en: "Dashboard",
  },
  logout: {
    ru: "Выйти",
    en: "Logout",
  },
  changePassword: {
    ru: "Изменить пароль",
    en: "Change Password",
  },
  changeEmail: {
    ru: "Изменить email",
    en: "Change Email",
  },
  date: {
    ru: "Дата",
    en: "Date",
  },
  fileType: {
    ru: "Тип файла",
    en: "File Type",
  },
  status: {
    ru: "Статус",
    en: "Status",
  },
  actions: {
    ru: "Действия",
    en: "Actions",
  },
  view: {
    ru: "Просмотр",
    en: "View",
  },
  delete: {
    ru: "Удалить",
    en: "Delete",
  },
  processing: {
    ru: "Обработка",
    en: "Processing",
  },
  completed: {
    ru: "Завершено",
    en: "Completed",
  },
  failed: {
    ru: "Ошибка",
    en: "Failed",
  },
  metrics: {
    ru: "Основные метрики",
    en: "Key Metrics",
  },
  correlation: {
    ru: "Корреляция",
    en: "Correlation",
  },
  hypothesis: {
    ru: "Гипотезы",
    en: "Hypotheses",
  },
  exportPDF: {
    ru: "Экспорт в PDF",
    en: "Export to PDF",
  },
  exportExcel: {
    ru: "Экспорт в Excel",
    en: "Export to Excel",
  },
  submit: {
    ru: "Отправить",
    en: "Submit",
  },
  cancel: {
    ru: "Отмена",
    en: "Cancel",
  },
  save: {
    ru: "Сохранить",
    en: "Save",
  },
  currentPassword: {
    ru: "Текущий пароль",
    en: "Current Password",
  },
  newPassword: {
    ru: "Новый пароль",
    en: "New Password",
  },
  confirmNewPassword: {
    ru: "Подтвердите новый пароль",
    en: "Confirm New Password",
  },
  newEmail: {
    ru: "Новый email",
    en: "New Email",
  },
  resetPassword: {
    ru: "Сбросить пароль",
    en: "Reset Password",
  },
  sendResetLink: {
    ru: "Отправить ссылку для сброса",
    en: "Send Reset Link",
  },
  "results.tabs.descriptiveStats": {
    ru: "Описательная статистика",
    en: "Descriptive Statistics"
  },
  "results.tabs.normalityTest": {
    ru: "Проверка нормальности",
    en: "Normality Test"
  },
  "results.tabs.regression": {
    ru: "Модели регрессии",
    en: "Regression Models"
  },
  descriptive_stats: {
    ru: "Описательная статистика",
    en: "Descriptive Statistics"
  },
  normality_test: {
    ru: "Проверка нормальности",
    en: "Normality Test"
  },
  regression: {
    ru: "Регрессионный анализ",
    en: "Regression Analysis"
  },
  deleteConfirmTitle: {
    ru: "Вы уверены?",
    en: "Are you sure?"
  },
  deleteConfirmDescription: {
    ru: "Это действие нельзя отменить. Результаты анализа будут удалены навсегда.",
    en: "This action cannot be undone. Analysis results will be permanently deleted."
  },
  deleteSuccess: {
    ru: "Анализ успешно удален",
    en: "Analysis successfully deleted"
  },
  deleteError: {
    ru: "Ошибка при удалении анализа",
    en: "Error deleting analysis"
  },
  // Анализ остатков
  residuals_analysis: {
    ru: "Анализ остатков",
    en: "Residuals Analysis"
  },
  residuals_normality_test: {
    ru: "Тест нормальности остатков",
    en: "Residuals Normality Test"
  },
  residuals_histogram: {
    ru: "Гистограмма остатков",
    en: "Residuals Histogram"
  },
  qq_plot: {
    ru: "QQ-график",
    en: "QQ Plot"
  },

  // Тесты Вилкоксона
  wilcoxon_tests: {
    ru: "Тесты Вилкоксона",
    en: "Wilcoxon Tests"
  },
  wilcoxon_signed_rank_test: {
    ru: "Тест знаковых рангов Вилкоксона",
    en: "Wilcoxon Signed Rank Test"
  },
  wilcoxon_signed_rank_description: {
    ru: "Непараметрический тест для сравнения парных выборок",
    en: "Nonparametric test for comparing paired samples"
  },
  wilcoxon_signed_rank: {
    ru: "Тест знаковых рангов Вилкоксона",
    en: "Wilcoxon Signed Rank Test"
  },
  mann_whitney_test: {
    ru: "Тест Манна-Уитни (U-тест)",
    en: "Mann-Whitney U Test"
  },
  mann_whitney_description: {
    ru: "Непараметрический тест для сравнения двух независимых выборок",
    en: "Nonparametric test for comparing two independent samples"
  },
  mann_whitney: {
    ru: "Тест Манна-Уитни (U-тест)",
    en: "Mann-Whitney U Test"
  },
  no_wilcoxon_signed_rank_results: {
    ru: "Результаты теста знаковых рангов Вилкоксона отсутствуют",
    en: "Wilcoxon Signed Rank Test results are missing"
  },
  no_mann_whitney_results: {
    ru: "Результаты теста Манна-Уитни отсутствуют",
    en: "Mann-Whitney U Test results are missing"
  },
  no_wilcoxon_tests_performed: {
    ru: "Тесты Вилкоксона не выполнялись",
    en: "Wilcoxon Tests were not performed"
  },
  variable1: {
    ru: "Переменная 1",
    en: "Variable 1"
  },
  variable2: {
    ru: "Переменная 2",
    en: "Variable 2"
  },
  sample_size: {
    ru: "Размер выборки",
    en: "Sample Size"
  },
  group_column: {
    ru: "Группирующая переменная",
    en: "Grouping Variable"
  },
  value_column: {
    ru: "Тестируемая переменная",
    en: "Test Variable"
  },
  group1: {
    ru: "Группа 1",
    en: "Group 1"
  },
  group2: {
    ru: "Группа 2",
    en: "Group 2"
  },
  group_sizes: {
    ru: "Размеры групп",
    en: "Group Sizes"
  },
  group_medians: {
    ru: "Медианы групп",
    en: "Group Medians"
  },
  statistic: {
    ru: "Статистика",
    en: "Statistic"
  },
  p_value: {
    ru: "P-значение",
    en: "P-value"
  },
  conclusion: {
    ru: "Вывод",
    en: "Conclusion"
  },
  statistic_header: {
    ru: "Статистика",
    en: "Statistic"
  },
  p_value_header: {
    ru: "P-значение",
    en: "P-value"
  },
  variable: {
    ru: "Переменная",
    en: "Variable"
  },
  count: {
    ru: "Количество",
    en: "Count"
  },
  mean: {
    ru: "Среднее",
    en: "Mean"
  },
  median: {
    ru: "Медиана",
    en: "Median"
  },
  mode: {
    ru: "Мода",
    en: "Mode"
  },
  stdDev: {
    ru: "Стд. откл.",
    en: "Std. Dev."
  },
  min: {
    ru: "Мин.",
    en: "Min"
  },
  max: {
    ru: "Макс.",
    en: "Max"
  },
  q1: {
    ru: "Q1",
    en: "Q1"
  },
  q3: {
    ru: "Q3",
    en: "Q3"
  },
  iqr: {
    ru: "IQR",
    en: "IQR"
  },
  variationCoefficient: {
    ru: "Коэф. вариации",
    en: "Coeff. of Variation"
  },
  skewness: {
    ru: "Асимметрия",
    en: "Skewness"
  },
  kurtosis: {
    ru: "Эксцесс",
    en: "Kurtosis"
  },
  unique: {
    ru: "Уникальные",
    en: "Unique"
  },
  multiple: {
    ru: "Несколько мод",
    en: "Multiple modes"
  },
  histograms: {
    ru: "Гистограммы",
    en: "Histograms"
  },
  confidenceIntervals: {
    ru: "Доверительные интервалы",
    en: "Confidence Intervals"
  },
  confidenceLevel: {
    ru: "Уровень доверия",
    en: "Confidence Level"
  },
  interval: {
    ru: "Интервал",
    en: "Interval"
  },
  standardError: {
    ru: "Стандартная ошибка",
    en: "Standard Error"
  },
  normalityTests: {
    ru: "Тесты на нормальность",
    en: "Normality Tests"
  },
  shapiroWilkTest: {
    ru: "Тест Шапиро-Уилка",
    en: "Shapiro-Wilk Test"
  },
  nonNormalDistribution: {
    ru: "Распределение отличается от нормального",
    en: "Distribution is not normal"
  },
  normalDistribution: {
    ru: "Нормальное распределение",
    en: "Normal distribution"
  },
  chiSquareTest: {
    ru: "Тест Хи-квадрат",
    en: "Chi-Square Test"
  },
  degreesOfFreedom: {
    ru: "Степени свободы",
    en: "Degrees of Freedom"
  },
  intervals: {
    ru: "Интервалы",
    en: "Intervals"
  },
  histogramsWithNormalCurve: {
    ru: "Гистограммы с кривой нормального распределения",
    en: "Histograms with Normal Curve"
  },
  noData: {
    ru: "Нет данных",
    en: "No data"
  },
  noDataForHistogram: {
    ru: "Нет данных для гистограммы",
    en: "No data for histogram"
  },
  noDataForHistograms: {
    ru: "Нет данных для гистограмм",
    en: "No data for histograms"
  },
  noDataForConfidenceIntervals: {
    ru: "Нет данных для доверительных интервалов",
    en: "No data for confidence intervals"
  },
  selectFiles: {
    ru: "Выбрать файлы",
    en: "Select Files"
  },
  selectedFiles: {
    ru: "Выбранные файлы",
    en: "Selected Files"
  },
  clearAll: {
    ru: "Очистить все",
    en: "Clear All"
  },
  selectAnalyses: {
    ru: "Выберите анализы",
    en: "Select Analyses"
  },
  descriptiveStats: {
    ru: "Описательная статистика",
    en: "Descriptive Statistics"
  },
  normalityTest: {
    ru: "Проверка нормальности",
    en: "Normality Test"
  },
  wilcoxonSignedRankTest: {
    ru: "Тест знаковых рангов Вилкоксона",
    en: "Wilcoxon Signed Rank Test"
  },
  mannWhitneyTest: {
    ru: "Тест Манна-Уитни",
    en: "Mann-Whitney U Test"
  },
  regressionVariables: {
    ru: "Переменные для регрессии",
    en: "Regression Variables"
  },
  dependentVariableY: {
    ru: "Зависимая переменная (Y)",
    en: "Dependent Variable (Y)"
  },
  independentVariableX: {
    ru: "Независимая переменная (X)",
    en: "Independent Variable (X)"
  },
  uploadComplete: {
    ru: "Загрузка завершена",
    en: "Upload Complete"
  },
  uploadSuccessMessage: {
    ru: "Файлы успешно загружены и отправлены на анализ",
    en: "Files successfully uploaded and sent for analysis"
  },
  uploadAndAnalyze: {
    ru: "Загрузить и анализировать",
    en: "Upload and Analyze"
  },
  "results.title": {
    ru: "Результаты анализа",
    en: "Analysis Results"
  },
  regressionAnalysis: {
    ru: "Регрессионный анализ",
    en: "Regression Analysis"
  },
  residualsAnalysis: {
    ru: "Анализ остатков",
    en: "Residuals Analysis"
  },
  regressionEquation: {
    ru: "Уравнение регрессии",
    en: "Regression Equation"
  },
  // Regression Table Translations
  modelSummary: {
    ru: "Сводка по модели",
    en: "Model Summary"
  },
  parameter: {
    ru: "Параметр",
    en: "Parameter"
  },
  value: {
    ru: "Значение",
    en: "Value"
  },
  stdError: {
    ru: "Станд. ошибка",
    en: "Std. Error"
  },
  tStatistic: {
    ru: "t-статистика",
    en: "t-statistic"
  },
  pValue: {
    ru: "P-значение",
    en: "P-value"
  },
  confidenceInterval: {
    ru: "95% довер. интервал",
    en: "95% Conf. Interval"
  },
  na: {
    ru: "Неприменимо",
    en: "N/A"
  },
  intercept: {
    ru: "Константа (intercept)",
    en: "Intercept"
  },
  fStatisticAndPValue: {
    ru: "F-статистика (и p-значение)",
    en: "F-statistic (and p-value)"
  },
  modelComparison: {
    ru: "Сравнение моделей",
    en: "Model Comparison"
  },
  modelType: {
    ru: "Тип модели",
    en: "Model Type"
  },
  rSquared: {
    ru: "R²",
    en: "R²"
  },
  adjustedRSquared: {
    ru: "Скорр. R²",
    en: "Adj. R²"
  },
  fStatistic: {
    ru: "F-статистика",
    en: "F-statistic"
  },
  sse: {
    ru: "SSE",
    en: "SSE"
  },
  uploadSubtitle: {
    ru: "Загрузите файл для выполнения статистического анализа.",
    en: "Upload a file to perform statistical analysis."
  },
  dropFilesHere: {
    ru: "Отпустите файлы для загрузки",
    en: "Drop files here to upload"
  },
  removeFile: {
    ru: "Удалить файл",
    en: "Remove file"
  },
  selectVariable: {
    ru: "Выберите переменную",
    en: "Select a variable"
  },
  wilcoxonSignedRankVariables: {
    ru: "Переменные для теста знаковых рангов Вилкоксона",
    en: "Variables for Wilcoxon Signed Rank Test"
  },
  firstVariable: {
    ru: "Первая переменная (до)",
    en: "First Variable (before)"
  },
  secondVariable: {
    ru: "Вторая переменная (после)",
    en: "Second Variable (after)"
  },
  wilcoxonSignedRankHint: {
    ru: "Выберите две связанные переменные (например, измерения до и после).",
    en: "Select two related variables (e.g., before and after measurements)."
  },
  mannWhitneyVariables: {
    ru: "Переменные для теста Манна-Уитни",
    en: "Variables for Mann-Whitney Test"
  },
  valuesToCompare: {
    ru: "Переменная со значениями",
    en: "Variable with values"
  },
  mannWhitneyHint: {
    ru: "Выберите колонку с двумя группами и колонку со значениями для сравнения.",
    en: "Select a column with two groups and a column with values to compare."
  },
  uploading: {
    ru: "Загрузка",
    en: "Uploading"
  },
  uploadFailedMessage: {
    ru: "Не удалось загрузить файл. Пожалуйста, попробуйте еще раз.",
    en: "Failed to upload file. Please try again."
  },
  noWilcoxonTestsPerformed: {
    ru: "Тесты не выполнялись или не дали результатов",
    en: "Tests were not performed or yielded no results"
  },
  variableToCompare: {
    ru: "Переменная для сравнения",
    en: "Variable to Compare"
  }
}

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ru")

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language]
    }
    return key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}
