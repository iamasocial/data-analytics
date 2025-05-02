package server

import (
	"context"
	"log"
	"net/http"
	"time"
)

// Server представляет наш HTTP сервер.
type Server struct {
	httpServer *http.Server
	addr       string
}

// NewHTTPServer создает новый экземпляр HTTP сервера.
// Он принимает адрес для прослушивания и http.Handler (например, настроенный Gin роутер).
func NewHTTPServer(addr string, handler http.Handler) *Server {
	srv := &http.Server{
		Addr:    addr,
		Handler: handler,
		// Можно добавить таймауты чтения/записи здесь, если нужно
		// ReadTimeout:  5 * time.Second,
		// WriteTimeout: 10 * time.Second,
		// IdleTimeout:  120 * time.Second,
	}
	return &Server{
		httpServer: srv,
		addr:       addr,
	}
}

// Start запускает HTTP сервер в отдельной горутине.
// Возвращает канал ошибок для неблокирующей обработки ошибок запуска.
func (s *Server) Start() <-chan error {
	errChan := make(chan error, 1)
	log.Printf("HTTP server starting on %s", s.addr)
	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("ListenAndServe error: %v", err)
			errChan <- err
		}
		close(errChan) // Закрываем канал при завершении
	}()
	return errChan
}

// Shutdown грациозно останавливает HTTP сервер.
func (s *Server) Shutdown(timeout time.Duration) error {
	log.Println("Shutting down HTTP server...")
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return s.httpServer.Shutdown(ctx)
}
