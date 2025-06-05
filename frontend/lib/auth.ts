/**
 * Утилиты для работы с авторизацией и сессией пользователя
 */

// Константа для контроля версии сессии 
// Помогает предотвратить восстановление токена между перезагрузками
const STORAGE_VERSION_KEY = 'auth_session_version';

/**
 * Увеличивает версию сессии, чтобы предотвратить восстановление токена после выхода
 */
const incrementSessionVersion = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Получаем текущую версию
    const currentVersion = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '0');
    // Увеличиваем и сохраняем новую версию
    localStorage.setItem(STORAGE_VERSION_KEY, (currentVersion + 1).toString());
  } catch (e) {
    console.error('Ошибка при обновлении версии сессии:', e);
  }
};

/**
 * Полностью очищает localStorage от данных аутентификации
 */
export const clearAllAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Увеличиваем версию сессии
    incrementSessionVersion();
    
    // Список ключей для удаления
    const keysToRemove = [
      'authToken', 
      'refreshToken', 
      'userProfile', 
      'lastAuthenticated',
      'sessionData'
    ];
    
    // Удаляем все связанные с авторизацией данные
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      // Также устанавливаем пустое значение
      localStorage.setItem(key, '');
      // И снова удаляем для надежности
      localStorage.removeItem(key);
    });
    
    // Проверка, что authToken действительно удален
    if (localStorage.getItem('authToken')) {
      console.error('Не удалось удалить authToken! Принудительно устанавливаем undefined');
      // Особые случаи - пробуем другие варианты
      localStorage.setItem('authToken', 'undefined');
      localStorage.setItem('authToken', 'null');
      localStorage.setItem('authToken', '');
      localStorage.removeItem('authToken');
    }
    
    console.log('Все данные аутентификации очищены');
  } catch (e) {
    console.error('Ошибка при полной очистке данных авторизации:', e);
  }
};

/**
 * Проверяет валидность токена авторизации
 * @returns true, если токен валидный, false в противном случае
 */
export const checkTokenValidity = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('authToken');
  if (!token || token === 'undefined') {
    return false;
  }
  
  try {
    // Простейшая проверка на то, что токен это JWT
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Токен не в формате JWT, пропускаем проверку
    
    const payload = JSON.parse(atob(parts[1]));
    const expiry = payload.exp * 1000; // exp в JWT хранится в секундах, переводим в миллисекунды
    
    if (Date.now() >= expiry) {
      // Токен истек
      return false;
    }
  } catch (e) {
    console.error('Ошибка при проверке токена:', e);
  }
  
  return true;
};

/**
 * Сохраняет текущий путь для перенаправления после логина
 */
export const saveRedirectPath = (): void => {
  if (typeof window === 'undefined') return;
  
  if (window.location.pathname) {
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
  }
};

/**
 * Удаляет токены авторизации из хранилища
 * @returns true если токены были успешно удалены
 */
export const clearAuthTokens = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Вызываем полную очистку данных аутентификации
    clearAllAuthData();
    
    // Проверяем, что токены действительно удалены
    const authToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    console.log("После удаления: authToken =", authToken, "refreshToken =", refreshToken);
    
    return (!authToken || authToken === '' || authToken === 'null' || authToken === 'undefined') &&
           (!refreshToken || refreshToken === '' || refreshToken === 'null' || refreshToken === 'undefined');
  } catch (e) {
    console.error("Ошибка при удалении токенов:", e);
    return false;
  }
};

/**
 * Выполняет выход пользователя из системы и перенаправляет на страницу логина
 */
export const logout = (): void => {
  console.log("Начало выхода из системы");
  
  // Полная очистка всех данных авторизации
  clearAllAuthData();
  
  console.log("Токены удалены, проверка:", localStorage.getItem('authToken'));
  
  // Устанавливаем специальный флаг для блокировки автоматического восстановления токена
  localStorage.setItem('loggedOut', 'true');
  
  // Добавим небольшую задержку перед редиректом, чтобы localStorage успел обновиться
  setTimeout(() => {
    console.log("Выполняем редирект после logout");
    redirectToLogin();
  }, 100);
};

/**
 * Перенаправляет пользователя на страницу логина
 */
export const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  
  saveRedirectPath();
  window.location.href = 'http://localhost:3000/auth/login';
};

/**
 * Обрабатывает 401 ошибку от API
 */
export const handleUnauthorized = (): void => {
  console.log("Обработка 401 ошибки");
  
  // Полная очистка всех данных авторизации
  clearAllAuthData();
  
  console.log("Токены очищены (401):", localStorage.getItem('authToken'));
  saveRedirectPath();
  
  // Используем прямой редирект вместо функции, чтобы быть уверенными
  if (typeof window !== 'undefined') {
    console.log("Перенаправляем на страницу входа после 401");
    window.location.href = 'http://localhost:3000/auth/login';
  }
}; 