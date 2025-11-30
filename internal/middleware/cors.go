package middleware

import (
	"net/http"
	"strings"
)

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			allowed := false
			for _, o := range allowedOrigins {
				if o == "*" || o == origin {
					allowed = true
					break
				}
				// Allow subdomains of vercel.app
				if strings.HasSuffix(origin, ".vercel.app") && strings.Contains(o, "vercel.app") {
					allowed = true
					break
				}
			}

			// Always set the origin header if we have one
			if origin != "" && allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")

			// Handle preflight
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func CORSFromConfig(frontendURL string) func(http.Handler) http.Handler {
	origins := []string{frontendURL}
	
	// Always allow localhost variants for development
	origins = append(origins, 
		"http://localhost:3000",
		"http://localhost:5173",
		"http://127.0.0.1:5173",
	)

	// If it's a vercel app, also allow the base domain pattern
	if strings.Contains(frontendURL, "vercel.app") {
		origins = append(origins, "https://vercel.app")
	}

	return CORS(origins)
}
