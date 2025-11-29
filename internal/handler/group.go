package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/response"
)

type GroupHandler struct {
	groupRepo *repository.GroupRepository
	clubRepo  *repository.ClubRepository
	validator *validator.Validator
}

func NewGroupHandler(
	groupRepo *repository.GroupRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
) *GroupHandler {
	return &GroupHandler{
		groupRepo: groupRepo,
		clubRepo:  clubRepo,
		validator: validator,
	}
}

// POST /api/v1/groups
func (h *GroupHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	clubID, err := uuid.Parse(req.ClubID)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return
	}

	// Check club exists and user has permission
	club, err := h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.BadRequest(w, "club not found")
			return
		}
		response.InternalError(w, "failed to verify club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have permission to create groups in this club")
		return
	}

	// Parse coach_user_id if provided (nullable)
	var coachUserID *uuid.UUID
	if req.CoachUserID != "" {
		parsed, err := uuid.Parse(req.CoachUserID)
		if err != nil {
			response.BadRequest(w, "invalid coach_user_id")
			return
		}
		coachUserID = &parsed
	}

	group := &model.Group{
		ClubID:      clubID,
		Title:       req.Title,
		Sport:       req.Sport,
		Capacity:    req.Capacity,
		Price:       req.Price,
		Description: req.Description,
		CoachUserID: coachUserID,
	}

	if err := h.groupRepo.Create(r.Context(), group); err != nil {
		response.InternalError(w, "failed to create group")
		return
	}

	response.Created(w, group)
}

// GET /api/v1/groups/:id
func (h *GroupHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid group id")
		return
	}

	group, err := h.groupRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "group not found")
			return
		}
		response.InternalError(w, "failed to get group")
		return
	}

	response.OK(w, group)
}

// GET /api/v1/clubs/:club_id/groups
func (h *GroupHandler) ListByClub(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "club_id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return
	}

	// Check club exists
	_, err = h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "club not found")
			return
		}
		response.InternalError(w, "failed to verify club")
		return
	}

	// Check if we want stats (query param)
	withStats := r.URL.Query().Get("with_stats") == "true"

	if withStats {
		groups, err := h.groupRepo.GetByClubWithStats(r.Context(), clubID)
		if err != nil {
			response.InternalError(w, "failed to get groups")
			return
		}
		response.OK(w, groups)
		return
	}

	groups, err := h.groupRepo.GetByClub(r.Context(), clubID)
	if err != nil {
		response.InternalError(w, "failed to get groups")
		return
	}

	response.OK(w, groups)
}

// PUT /api/v1/groups/:id
func (h *GroupHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid group id")
		return
	}

	var req UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	// Get existing group
	group, err := h.groupRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "group not found")
			return
		}
		response.InternalError(w, "failed to get group")
		return
	}

	// Check permission (owner of club or assigned coach)
	userID := middleware.GetUserID(r.Context())
	hasPermission, err := h.checkGroupPermission(r, group.ClubID, group.CoachUserID, userID)
	if err != nil {
		response.InternalError(w, "failed to verify permissions")
		return
	}
	if !hasPermission {
		response.Forbidden(w, "you don't have permission to update this group")
		return
	}

	// Apply updates
	if req.Title != nil {
		group.Title = *req.Title
	}
	if req.Sport != nil {
		group.Sport = *req.Sport
	}
	if req.Capacity != nil {
		group.Capacity = *req.Capacity
	}
	if req.Price != nil {
		group.Price = *req.Price
	}
	if req.Description != nil {
		group.Description = *req.Description
	}
	if req.CoachUserID != nil {
		coachID, err := uuid.Parse(*req.CoachUserID)
		if err != nil {
			response.BadRequest(w, "invalid coach_user_id")
			return
		}
		group.CoachUserID = &coachID
	}

	if err := h.groupRepo.Update(r.Context(), group); err != nil {
		response.InternalError(w, "failed to update group")
		return
	}

	response.OK(w, group)
}

// DELETE /api/v1/groups/:id
func (h *GroupHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid group id")
		return
	}

	// Get existing group
	group, err := h.groupRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "group not found")
			return
		}
		response.InternalError(w, "failed to get group")
		return
	}

	// Only owner can delete
	club, err := h.clubRepo.GetByID(r.Context(), group.ClubID)
	if err != nil {
		response.InternalError(w, "failed to verify club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "only club owner can delete groups")
		return
	}

	if err := h.groupRepo.Delete(r.Context(), id); err != nil {
		response.InternalError(w, "failed to delete group")
		return
	}

	response.NoContent(w)
}

// Helper to check if user can modify group
func (h *GroupHandler) checkGroupPermission(r *http.Request, clubID uuid.UUID, coachID *uuid.UUID, userID uuid.UUID) (bool, error) {
	// Check if user is club owner
	club, err := h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		return false, err
	}
	if club.OwnerUserID == userID {
		return true, nil
	}

	// Check if user is assigned coach
	if coachID != nil && *coachID == userID {
		return true, nil
	}

	return false, nil
}

// Helper to parse pagination from query params
func parsePagination(r *http.Request) PaginationParams {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))

	return PaginationParams{
		Page:    page,
		PerPage: perPage,
	}
}
