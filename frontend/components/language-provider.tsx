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
  mann_whitney_test: {
    ru: "Тест Манна-Уитни (U-тест)",
    en: "Mann-Whitney U Test"
  },
  mann_whitney_description: {
    ru: "Непараметрический тест для сравнения двух независимых выборок",
    en: "Nonparametric test for comparing two independent samples"
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
