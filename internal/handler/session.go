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

type SessionHandler struct {
	sessionRepo *repository.SessionRepository
	groupRepo   *repository.GroupRepository
	clubRepo    *repository.ClubRepository
	validator   *validator.Validator
}

func NewSessionHandler(
	sessionRepo *repository.SessionRepository,
	groupRepo *repository.GroupRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
) *SessionHandler {
	return &SessionHandler{
		sessionRepo: sessionRepo,
		groupRepo:   groupRepo,
		clubRepo:    clubRepo,
		validator:   validator,
	}
}

// POST /api/v1/groups/:group_id/sessions
func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	groupIDStr := chi.URLParam(r, "group_id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	// Check group exists and user has permission
	group, err := h.groupRepo.GetByID(r.Context(), groupID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "group not found")
			return
		}
		response.InternalError(w, "failed to verify group")
		return
	}

	// Check permission
	userID := middleware.GetUserID(r.Context())
	hasPermission, err := h.checkPermission(r, group.ClubID, group.CoachUserID, userID)
	if err != nil || !hasPermission {
		response.Forbidden(w, "you don't have permission to create sessions")
		return
	}

	// Parse start time
	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		response.BadRequest(w, "invalid start_at format, use RFC3339")
		return
	}

	session := &model.Session{
		GroupID:         groupID,
		StartAt:         startAt,
		DurationMinutes: req.DurationMinutes,
		Location:        req.Location,
	}

	if err := h.sessionRepo.Create(r.Context(), session); err != nil {
		response.InternalError(w, "failed to create session")
		return
	}

	response.Created(w, session)
}

// POST /api/v1/groups/:group_id/sessions/recurring
func (h *SessionHandler) CreateRecurring(w http.ResponseWriter, r *http.Request) {
	groupIDStr := chi.URLParam(r, "group_id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	var req CreateRecurringSessionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	// Check group exists and user has permission
	group, err := h.groupRepo.GetByID(r.Context(), groupID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "group not found")
			return
		}
		response.InternalError(w, "failed to verify group")
		return
	}

	userID := middleware.GetUserID(r.Context())
	hasPermission, err := h.checkPermission(r, group.ClubID, group.CoachUserID, userID)
	if err != nil || !hasPermission {
		response.Forbidden(w, "you don't have permission to create sessions")
		return
	}

	// Parse dates
	fromDate, err := time.Parse("2006-01-02", req.FromDate)
	if err != nil {
		response.BadRequest(w, "invalid from_date format, use YYYY-MM-DD")
		return
	}

	toDate, err := time.Parse("2006-01-02", req.ToDate)
	if err != nil {
		response.BadRequest(w, "invalid to_date format, use YYYY-MM-DD")
		return
	}

	if toDate.Before(fromDate) {
		response.BadRequest(w, "to_date must be after from_date")
		return
	}

	// Parse start time
	startTimeParts, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		response.BadRequest(w, "invalid start_time format, use HH:MM")
		return
	}

	// Generate sessions
	var sessions []model.Session
	weekdayMap := make(map[int]bool)
	for _, wd := range req.Weekdays {
		if wd < 0 || wd > 6 {
			response.BadRequest(w, "weekdays must be 0-6 (Sunday=0, Monday=1, etc.)")
			return
		}
		weekdayMap[wd] = true
	}

	// Iterate through date range
	for d := fromDate; !d.After(toDate); d = d.AddDate(0, 0, 1) {
		weekday := int(d.Weekday())
		if weekdayMap[weekday] {
			startAt := time.Date(
				d.Year(), d.Month(), d.Day(),
				startTimeParts.Hour(), startTimeParts.Minute(), 0, 0,
				time.Local,
			)
			sessions = append(sessions, model.Session{
				GroupID:         groupID,
				StartAt:         startAt,
				DurationMinutes: req.DurationMinutes,
				Location:        req.Location,
			})
		}
	}

	if len(sessions) == 0 {
		response.BadRequest(w, "no sessions generated for the given parameters")
		return
	}

	// Limit to reasonable number
	if len(sessions) > 365 {
		response.BadRequest(w, "too many sessions, maximum 365 at once")
		return
	}

	if err := h.sessionRepo.CreateBatch(r.Context(), sessions); err != nil {
		response.InternalError(w, "failed to create sessions")
		return
	}

	response.Created(w, map[string]interface{}{
		"created_count": len(sessions),
		"message":       "recurring sessions created successfully",
	})
}

// GET /api/v1/groups/:group_id/sessions
func (h *SessionHandler) ListByGroup(w http.ResponseWriter, r *http.Request) {
	groupIDStr := chi.URLParam(r, "group_id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	// Parse date range from query params
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var from, to time.Time
	if fromStr != "" {
		from, err = time.Parse("2006-01-02", fromStr)
		if err != nil {
			response.BadRequest(w, "invalid from date format, use YYYY-MM-DD")
			return
		}
	} else {
		from = time.Now().AddDate(0, 0, -7) // Default: last week
	}

	if toStr != "" {
		to, err = time.Parse("2006-01-02", toStr)
		if err != nil {
			response.BadRequest(w, "invalid to date format, use YYYY-MM-DD")
			return
		}
	} else {
		to = time.Now().AddDate(0, 1, 0) // Default: next month
	}

	sessions, err := h.sessionRepo.GetByGroup(r.Context(), groupID, from, to)
	if err != nil {
		response.InternalError(w, "failed to get sessions")
		return
	}

	response.OK(w, sessions)
}

// GET /api/v1/sessions/:id
func (h *SessionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid session id")
		return
	}

	session, err := h.sessionRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "session not found")
			return
		}
		response.InternalError(w, "failed to get session")
		return
	}

	response.OK(w, session)
}

// PUT /api/v1/sessions/:id
func (h *SessionHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid session id")
		return
	}

	var req CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	// Get existing session
	session, err := h.sessionRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "session not found")
			return
		}
		response.InternalError(w, "failed to get session")
		return
	}

	// Check permission via group
	group, err := h.groupRepo.GetByID(r.Context(), session.GroupID)
	if err != nil {
		response.InternalError(w, "failed to verify group")
		return
	}

	userID := middleware.GetUserID(r.Context())
	hasPermission, err := h.checkPermission(r, group.ClubID, group.CoachUserID, userID)
	if err != nil || !hasPermission {
		response.Forbidden(w, "you don't have permission to update this session")
		return
	}

	// Parse and apply updates
	if req.StartAt != "" {
		startAt, err := time.Parse(time.RFC3339, req.StartAt)
		if err != nil {
			response.BadRequest(w, "invalid start_at format")
			return
		}
		session.StartAt = startAt
	}
	if req.DurationMinutes > 0 {
		session.DurationMinutes = req.DurationMinutes
	}
	if req.Location != "" {
		session.Location = req.Location
	}

	if err := h.sessionRepo.Update(r.Context(), session); err != nil {
		response.InternalError(w, "failed to update session")
		return
	}

	response.OK(w, session)
}

// DELETE /api/v1/sessions/:id
func (h *SessionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid session id")
		return
	}

	session, err := h.sessionRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "session not found")
			return
		}
		response.InternalError(w, "failed to get session")
		return
	}

	group, err := h.groupRepo.GetByID(r.Context(), session.GroupID)
	if err != nil {
		response.InternalError(w, "failed to verify group")
		return
	}

	userID := middleware.GetUserID(r.Context())
	hasPermission, err := h.checkPermission(r, group.ClubID, group.CoachUserID, userID)
	if err != nil || !hasPermission {
		response.Forbidden(w, "you don't have permission to delete this session")
		return
	}

	if err := h.sessionRepo.Delete(r.Context(), id); err != nil {
		response.InternalError(w, "failed to delete session")
		return
	}

	response.NoContent(w)
}

func (h *SessionHandler) checkPermission(r *http.Request, clubID uuid.UUID, coachID *uuid.UUID, userID uuid.UUID) (bool, error) {
	club, err := h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		return false, err
	}
	if club.OwnerUserID == userID {
		return true, nil
	}
	if coachID != nil && *coachID == userID {
		return true, nil
	}
	return false, nil
}
