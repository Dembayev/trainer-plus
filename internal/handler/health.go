package handler

import (
	"net/http"

	"github.com/neo/trainer-plus/pkg/response"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]string{
		"status": "ok",
	})
}

func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	// TODO: Check DB and Redis connections
	response.OK(w, map[string]string{
		"status": "ready",
	})
}
