package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/response"
)

type SubscriptionHandler struct {
	subRepo     *repository.SubscriptionRepository
	studentRepo *repository.StudentRepository
	groupRepo   *repository.GroupRepository
	clubRepo    *repository.ClubRepository
	validator   *validator.Validator
}

func NewSubscriptionHandler(
	subRepo *repository.SubscriptionRepository,
	studentRepo *repository.StudentRepository,
	groupRepo *repository.GroupRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
) *SubscriptionHandler {
	return &SubscriptionHandler{
		subRepo:     subRepo,
		studentRepo: studentRepo,
		groupRepo:   groupRepo,
		clubRepo:    clubRepo,
		validator:   validator,
	}
}

// POST /api/v1/subscriptions
func (h *SubscriptionHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		response.BadRequest(w, "invalid student_id")
		return
	}

	groupID, err := uuid.Parse(req.GroupID)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	// Verify student exists
	student, err := h.studentRepo.GetByID(r.Context(), studentID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.BadRequest(w, "student not found")
			return
		}
		response.InternalError(w, "failed to verify student")
		return
	}

	// Verify group exists and belongs to the same club
	group, err := h.groupRepo.GetByID(r.Context(), groupID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.BadRequest(w, "group not found")
			return
		}
		response.InternalError(w, "failed to verify group")
		return
	}

	// Verify student and group belong to same club
	if student.ClubID != group.ClubID {
		response.BadRequest(w, "student and group must belong to the same club")
		return
	}

	// Check permission - user must be owner of the club
	userID := middleware.GetUserID(r.Context())
	club, err := h.clubRepo.GetByID(r.Context(), group.ClubID)
	if err != nil {
		response.InternalError(w, "failed to verify club")
		return
	}

	if club.OwnerUserID != userID && (group.CoachUserID == nil || *group.CoachUserID != userID) {
		response.Forbidden(w, "you don't have permission to create subscriptions")
		return
	}

	// Parse dates
	var startsAt, expiresAt *time.Time
	if req.StartsAt != "" {
		t, err := time.Parse("2006-01-02", req.StartsAt)
		if err != nil {
			response.BadRequest(w, "invalid starts_at format, use YYYY-MM-DD")
			return
		}
		startsAt = &t
	}
	if req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", req.ExpiresAt)
		if err != nil {
			response.BadRequest(w, "invalid expires_at format, use YYYY-MM-DD")
			return
		}
		expiresAt = &t
	}

	sub := &model.Subscription{
		StudentID:         studentID,
		GroupID:           groupID,
		TotalSessions:     req.TotalSessions,
		RemainingSessions: req.TotalSessions, // Start with full sessions
		Price:             req.Price,
		StartsAt:          startsAt,
		ExpiresAt:         expiresAt,
		Status:            string(model.SubscriptionActive), // Direct creation = active
	}

	if err := h.subRepo.Create(r.Context(), sub); err != nil {
		response.InternalError(w, "failed to create subscription")
		return
	}

	response.Created(w, sub)
}

// GET /api/v1/subscriptions/:id
func (h *SubscriptionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid subscription id")
		return
	}

	sub, err := h.subRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "subscription not found")
			return
		}
		response.InternalError(w, "failed to get subscription")
		return
	}

	response.OK(w, sub)
}

// GET /api/v1/students/:student_id/subscriptions
func (h *SubscriptionHandler) ListByStudent(w http.ResponseWriter, r *http.Request) {
	studentIDStr := chi.URLParam(r, "student_id")
	studentID, err := uuid.Parse(studentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid student_id")
		return
	}

	subs, err := h.subRepo.GetByStudent(r.Context(), studentID)
	if err != nil {
		response.InternalError(w, "failed to get subscriptions")
		return
	}

	response.OK(w, subs)
}

// GET /api/v1/clubs/:club_id/subscriptions
func (h *SubscriptionHandler) ListByClub(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "club_id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return
	}

	status := r.URL.Query().Get("status")

	subs, err := h.subRepo.GetByClubWithDetails(r.Context(), clubID, status)
	if err != nil {
		response.InternalError(w, "failed to get subscriptions")
		return
	}

	response.OK(w, subs)
}

// PUT /api/v1/subscriptions/:id/cancel
func (h *SubscriptionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid subscription id")
		return
	}

	sub, err := h.subRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "subscription not found")
			return
		}
		response.InternalError(w, "failed to get subscription")
		return
	}

	// Check if already cancelled or used
	if sub.Status == string(model.SubscriptionCancelled) {
		response.BadRequest(w, "subscription already cancelled")
		return
	}
	if sub.Status == string(model.SubscriptionUsed) {
		response.BadRequest(w, "cannot cancel a used subscription")
		return
	}

	// Check permission
	group, err := h.groupRepo.GetByID(r.Context(), sub.GroupID)
	if err != nil {
		response.InternalError(w, "failed to verify group")
		return
	}

	club, err := h.clubRepo.GetByID(r.Context(), group.ClubID)
	if err != nil {
		response.InternalError(w, "failed to verify club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "only club owner can cancel subscriptions")
		return
	}

	if err := h.subRepo.UpdateStatus(r.Context(), id, string(model.SubscriptionCancelled)); err != nil {
		response.InternalError(w, "failed to cancel subscription")
		return
	}

	sub.Status = string(model.SubscriptionCancelled)
	response.OK(w, sub)
}

// GET /api/v1/groups/:group_id/subscriptions
func (h *SubscriptionHandler) ListByGroup(w http.ResponseWriter, r *http.Request) {
	groupIDStr := chi.URLParam(r, "group_id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	status := r.URL.Query().Get("status")

	subs, err := h.subRepo.GetByGroup(r.Context(), groupID, status)
	if err != nil {
		response.InternalError(w, "failed to get subscriptions")
		return
	}

	response.OK(w, subs)
}
