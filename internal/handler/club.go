package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/response"
)

type ClubHandler struct {
	clubRepo  *repository.ClubRepository
	validator *validator.Validator
}

func NewClubHandler(clubRepo *repository.ClubRepository, validator *validator.Validator) *ClubHandler {
	return &ClubHandler{
		clubRepo:  clubRepo,
		validator: validator,
	}
}

// POST /api/v1/clubs
func (h *ClubHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateClubRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		response.Unauthorized(w, "authentication required")
		return
	}

	club := &model.Club{
		OwnerUserID: userID,
		Name:        req.Name,
		Address:     req.Address,
		Phone:       req.Phone,
		Currency:    req.Currency,
	}

	if err := h.clubRepo.Create(r.Context(), club); err != nil {
		response.InternalError(w, "failed to create club")
		return
	}

	response.Created(w, club)
}

// GET /api/v1/clubs/:id
func (h *ClubHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid club id")
		return
	}

	club, err := h.clubRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "club not found")
			return
		}
		response.InternalError(w, "failed to get club")
		return
	}

	response.OK(w, club)
}

// GET /api/v1/clubs
func (h *ClubHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		response.Unauthorized(w, "authentication required")
		return
	}

	clubs, err := h.clubRepo.GetByOwner(r.Context(), userID)
	if err != nil {
		response.InternalError(w, "failed to get clubs")
		return
	}

	response.OK(w, clubs)
}

// PUT /api/v1/clubs/:id
func (h *ClubHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid club id")
		return
	}

	var req UpdateClubRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	// Get existing club
	club, err := h.clubRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "club not found")
			return
		}
		response.InternalError(w, "failed to get club")
		return
	}

	// Check ownership
	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have permission to update this club")
		return
	}

	// Apply updates
	if req.Name != nil {
		club.Name = *req.Name
	}
	if req.Address != nil {
		club.Address = *req.Address
	}
	if req.Phone != nil {
		club.Phone = *req.Phone
	}
	if req.Currency != nil {
		club.Currency = *req.Currency
	}

	if err := h.clubRepo.Update(r.Context(), club); err != nil {
		response.InternalError(w, "failed to update club")
		return
	}

	response.OK(w, club)
}

// DELETE /api/v1/clubs/:id
func (h *ClubHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid club id")
		return
	}

	// Check ownership
	club, err := h.clubRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "club not found")
			return
		}
		response.InternalError(w, "failed to get club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have permission to delete this club")
		return
	}

	if err := h.clubRepo.Delete(r.Context(), id); err != nil {
		response.InternalError(w, "failed to delete club")
		return
	}

	response.NoContent(w)
}
