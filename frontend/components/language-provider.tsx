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
