package common

// ContextKey определяет тип для ключей контекста во избежание коллизий.
type ContextKey string

const (
	// UserIDKey - ключ для хранения ID пользователя в контексте.
	UserIDKey = ContextKey("userId")
)
