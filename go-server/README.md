# Go Server - Серверная часть проекта статистического анализа

Серверная часть проекта реализована на языке Go и выполняет роль промежуточного слоя между фронтендом и вычислительным Python-сервером. Go-сервер обеспечивает авторизацию пользователей, хранение результатов анализа и передачу данных на вычислительный сервер.

## Технологии

- **Go 1.23+** - Современный, производительный язык программирования
- **Gin** - Быстрый HTTP фреймворк для построения REST API
- **gRPC** - Высокопроизводительный RPC фреймворк для межсервисного взаимодействия
- **Protocol Buffers** - Механизм сериализации структурированных данных
- **PostgreSQL** - Реляционная база данных для хранения пользователей и результатов анализа
- **JWT** - Механизм аутентификации и авторизации пользователей

## Архитектура проекта

Серверная часть построена на принципах чистой архитектуры с разделением на слои:

```
go-server/
├── cmd/                  # Точки входа в приложение
│   └── main.go           # Основной файл запуска сервера
├── generated/            # Сгенерированный gRPC код из proto-файлов
├── internal/             # Внутренние пакеты приложения
│   ├── adapter/          # Адаптеры для внешних сервисов (gRPC клиент)
│   ├── common/           # Общие утилиты и константы
│   ├── database/         # Конфигурация и подключение к базе данных
│   ├── handlers/         # HTTP обработчики (контроллеры)
│   ├── middleware/       # Промежуточные обработчики (авторизация)
│   ├── migrations/       # SQL миграции базы данных
│   ├── models/           # Модели данных
│   ├── repository/       # Слой доступа к данным
│   ├── server/           # Конфигурация HTTP сервера
│   └── services/         # Бизнес-логика
```

## Основные функциональные модули

### 1. Аутентификация и авторизация
- Регистрация и авторизация пользователей
- JWT токены для защиты API-эндпоинтов
- Механизм обновления токенов
- Изменение пароля пользователя

### 2. Анализ данных
- Загрузка CSV/Excel файлов
- Передача данных на Python-сервер через gRPC
- Получение списка колонок из загруженного файла
- Хранение и извлечение результатов анализа

### 3. Типы статистического анализа
- Описательная статистика (среднее, медиана, дисперсия и т.д.)
- Тесты на нормальность распределения (Шапиро-Уилка)
- Регрессионный анализ (линейная, квадратичная, экспоненциальная и другие модели)
- Тесты Вилкоксона (знаковых рангов и Манна-Уитни)

### 4. История анализов
- Сохранение метаданных анализа
- Сохранение результатов анализа в формате JSONB
- API для получения истории и детальных результатов анализа
- Удаление результатов анализа

## API-эндпоинты

### Публичные эндпоинты (без авторизации)
- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Авторизация пользователя и получение токенов
- `POST /api/auth/refresh` - Обновление токена доступа

### Защищенные эндпоинты (требуют авторизации)
- `POST /api/analyze` - Отправка файла на анализ
- `POST /api/columns` - Получение списка колонок из файла
- `GET /api/analyses/history` - Получение истории анализов пользователя
- `GET /api/analyses/history/:runId/results` - Получение результатов конкретного анализа
- `DELETE /api/analyses/history/:runId` - Удаление анализа и его результатов
- `POST /api/user/change-password` - Изменение пароля пользователя

## База данных

Структура базы данных состоит из следующих таблиц:

### 1. users - Хранение информации о пользователях
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. analysis_runs - Метаданные запусков анализа
```sql
CREATE TABLE analysis_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    selected_analyses TEXT [],
    dependent_variable VARCHAR(255),
    independent_variable VARCHAR(255)
);
```

### 3. analysis_results_data - Результаты анализа
```sql
CREATE TABLE analysis_results_data (
    id SERIAL PRIMARY KEY,
    analysis_run_id INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    result_type VARCHAR(255) NOT NULL,  -- e.g., 'descriptive_stats', 'normality_tests', 'regression_analysis', 'wilcoxon_tests'
    data JSONB NOT NULL
);
```

## Межсервисное взаимодействие

Go-сервер взаимодействует с Python-сервером через gRPC протокол:

1. **Protocol Buffers** определяют структуру сообщений и сервисов в `proto/analysis.proto`
2. **gRPC клиент** в Go отправляет запросы на анализ данных Python-серверу
3. **Адаптер** преобразует данные между форматами Go и Protocol Buffers
4. **Python-сервер** выполняет статистические вычисления и возвращает результаты
5. **Go-сервер** сохраняет результаты в базе данных и предоставляет их клиенту через REST API

## Запуск проекта

### Предварительные требования
- Go 1.23 или выше
- PostgreSQL 15 или выше
- Docker и Docker Compose (опционально)

### Шаги запуска

1. Запуск базы данных PostgreSQL:
```bash
docker-compose up -d postgres_db
```

2. Применение миграций:
```bash
make migrate-up
```

3. Генерация gRPC кода:
```bash
make generate-go
```

4. Запуск Go-сервера:
```bash
cd go-server
go run cmd/main.go
```

Сервер будет доступен по адресу: `http://localhost:8080`

## Переменные окружения

- `GO_SERVER_PORT` - Порт HTTP сервера (по умолчанию: 8080)
- `PYTHON_SERVER_ADDR` - Адрес Python gRPC сервера (по умолчанию: localhost:9000)
- `JWT_SECRET_KEY` - Секретный ключ для JWT токенов (по умолчанию: "your-super-secret-jwt-key-please-change-it")
- `JWT_TOKEN_TTL_MINUTES` - Время жизни JWT токена в минутах (по умолчанию: 60)
- `DATABASE_URL` - URL подключения к PostgreSQL (по умолчанию: postgres://appuser:apppassword@localhost:5432/analysis_app_db) 