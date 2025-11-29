package middleware

import (
	"net/http"
	"runtime/debug"

	"log/slog"

	"github.com/neo/trainer-plus/pkg/response"
)

func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					logger.Error("panic recovered",
						slog.Any("error", err),
						slog.String("stack", string(debug.Stack())),
						slog.String("path", r.URL.Path),
						slog.String("method", r.Method),
					)
					response.InternalError(w, "internal server error")
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
