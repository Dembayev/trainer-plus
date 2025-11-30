package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/service"
	"github.com/neo/trainer-plus/pkg/response"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var input service.SignupInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	// Basic validation
	if input.Email == "" || input.Password == "" || input.Name == "" {
		response.BadRequest(w, "email, password, and name are required")
		return
	}

	if len(input.Password) < 8 {
		response.BadRequest(w, "password must be at least 8 characters")
		return
	}

	result, err := h.authService.Signup(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			response.Conflict(w, "email already registered")
			return
		}
		response.InternalError(w, "failed to create user")
		return
	}

	response.Created(w, result)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input service.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if input.Email == "" || input.Password == "" {
		response.BadRequest(w, "email and password are required")
		return
	}

	result, err := h.authService.Login(r.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			response.Unauthorized(w, "invalid email or password")
			return
		}
		response.InternalError(w, "login failed")
		return
	}

	response.OK(w, result)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if input.RefreshToken == "" {
		response.BadRequest(w, "refresh_token is required")
		return
	}

	tokens, err := h.authService.RefreshToken(r.Context(), input.RefreshToken)
	if err != nil {
		response.Unauthorized(w, "invalid or expired refresh token")
		return
	}

	response.OK(w, tokens)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.authService.GetUser(r.Context(), userID)
	if err != nil {
		response.NotFound(w, "user not found")
		return
	}

	response.OK(w, user)
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var input struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		City    string `json:"city"`
		Bio     string `json:"bio"`
		Company string `json:"company"`
		Website string `json:"website"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	user, err := h.authService.UpdateProfile(r.Context(), userID, service.UpdateProfileInput{
		Name:    input.Name,
		Phone:   input.Phone,
		City:    input.City,
		Bio:     input.Bio,
		Company: input.Company,
		Website: input.Website,
	})
	if err != nil {
		response.InternalError(w, "failed to update profile")
		return
	}

	response.OK(w, user)
}
