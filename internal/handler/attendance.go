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

type AttendanceHandler struct {
	attendanceRepo *repository.AttendanceRepository
	subRepo        *repository.SubscriptionRepository
	sessionRepo    *repository.SessionRepository
	groupRepo      *repository.GroupRepository
	clubRepo       *repository.ClubRepository
	validator      *validator.Validator
}

func NewAttendanceHandler(
	attendanceRepo *repository.AttendanceRepository,
	subRepo *repository.SubscriptionRepository,
	sessionRepo *repository.SessionRepository,
	groupRepo *repository.GroupRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
) *AttendanceHandler {
	return &AttendanceHandler{
		attendanceRepo: attendanceRepo,
		subRepo:        subRepo,
		sessionRepo:    sessionRepo,
		groupRepo:      groupRepo,
		clubRepo:       clubRepo,
		validator:      validator,
	}
}

// POST /api/v1/attendance
func (h *AttendanceHandler) Mark(w http.ResponseWriter, r *http.Request) {
	var req MarkAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	sessionID, err := uuid.Parse(req.SessionID)
	if err != nil {
		response.BadRequest(w, "invalid session_id")
		return
	}

	studentID, err := uuid.Parse(req.StudentID)
	if err != nil {
		response.BadRequest(w, "invalid student_id")
		return
	}

	// Get session to find group
	session, err := h.sessionRepo.GetByID(r.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "session not found")
			return
		}
		response.InternalError(w, "failed to get session")
		return
	}

	// Check if attendance already exists
	exists, err := h.attendanceRepo.Exists(r.Context(), sessionID, studentID)
	if err != nil {
		response.InternalError(w, "failed to check attendance")
		return
	}
	if exists {
		response.Conflict(w, "attendance already marked for this student and session")
		return
	}

	// Check permission
	group, err := h.groupRepo.GetByID(r.Context(), session.GroupID)
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
	if club.OwnerUserID != userID && (group.CoachUserID == nil || *group.CoachUserID != userID) {
		response.Forbidden(w, "you don't have permission to mark attendance")
		return
	}

	// Start transaction
	tx, err := h.attendanceRepo.BeginTx(r.Context())
	if err != nil {
		response.InternalError(w, "failed to start transaction")
		return
	}
	defer tx.Rollback()

	// Only decrement subscription for 'present' status
	var subscriptionID *uuid.UUID
	if req.Status == string(model.AttendancePresent) {
		// Find active subscription
		sub, err := h.subRepo.FindActiveForAttendance(r.Context(), tx, studentID, session.GroupID, session.StartAt)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				response.UnprocessableEntity(w, "no active subscription found for this student and group")
				return
			}
			response.InternalError(w, "failed to find subscription")
			return
		}

		// Decrement remaining sessions
		if err := h.subRepo.DecrementRemainingSessions(r.Context(), tx, sub.ID); err != nil {
			response.InternalError(w, "failed to update subscription")
			return
		}

		subscriptionID = &sub.ID
	}

	// Create attendance record
	attendance := &model.Attendance{
		SessionID:      sessionID,
		StudentID:      studentID,
		SubscriptionID: subscriptionID,
		Status:         req.Status,
		NotedBy:        userID,
	}

	if err := h.attendanceRepo.CreateInTx(r.Context(), tx, attendance); err != nil {
		response.InternalError(w, "failed to create attendance")
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		response.InternalError(w, "failed to commit transaction")
		return
	}

	response.Created(w, attendance)
}

// POST /api/v1/attendance/bulk
func (h *AttendanceHandler) BulkMark(w http.ResponseWriter, r *http.Request) {
	var req BulkAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	sessionID, err := uuid.Parse(req.SessionID)
	if err != nil {
		response.BadRequest(w, "invalid session_id")
		return
	}

	// Get session
	session, err := h.sessionRepo.GetByID(r.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "session not found")
			return
		}
		response.InternalError(w, "failed to get session")
		return
	}

	// Check permission
	group, err := h.groupRepo.GetByID(r.Context(), session.GroupID)
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
	if club.OwnerUserID != userID && (group.CoachUserID == nil || *group.CoachUserID != userID) {
		response.Forbidden(w, "you don't have permission to mark attendance")
		return
	}

	// Start transaction
	tx, err := h.attendanceRepo.BeginTx(r.Context())
	if err != nil {
		response.InternalError(w, "failed to start transaction")
		return
	}
	defer tx.Rollback()

	var results []map[string]interface{}

	for _, item := range req.Attendances {
		studentID, err := uuid.Parse(item.StudentID)
		if err != nil {
			results = append(results, map[string]interface{}{
				"student_id": item.StudentID,
				"success":    false,
				"error":      "invalid student_id",
			})
			continue
		}

		// Check if already exists
		exists, _ := h.attendanceRepo.Exists(r.Context(), sessionID, studentID)
		if exists {
			results = append(results, map[string]interface{}{
				"student_id": item.StudentID,
				"success":    false,
				"error":      "already marked",
			})
			continue
		}

		var subscriptionID *uuid.UUID
		if item.Status == string(model.AttendancePresent) {
			sub, err := h.subRepo.FindActiveForAttendance(r.Context(), tx, studentID, session.GroupID, session.StartAt)
			if err != nil {
				results = append(results, map[string]interface{}{
					"student_id": item.StudentID,
					"success":    false,
					"error":      "no active subscription",
				})
				continue
			}

			if err := h.subRepo.DecrementRemainingSessions(r.Context(), tx, sub.ID); err != nil {
				results = append(results, map[string]interface{}{
					"student_id": item.StudentID,
					"success":    false,
					"error":      "failed to update subscription",
				})
				continue
			}
			subscriptionID = &sub.ID
		}

		attendance := &model.Attendance{
			SessionID:      sessionID,
			StudentID:      studentID,
			SubscriptionID: subscriptionID,
			Status:         item.Status,
			NotedBy:        userID,
		}

		if err := h.attendanceRepo.CreateInTx(r.Context(), tx, attendance); err != nil {
			results = append(results, map[string]interface{}{
				"student_id": item.StudentID,
				"success":    false,
				"error":      "failed to create",
			})
			continue
		}

		results = append(results, map[string]interface{}{
			"student_id":    item.StudentID,
			"success":       true,
			"attendance_id": attendance.ID,
		})
	}

	if err := tx.Commit(); err != nil {
		response.InternalError(w, "failed to commit transaction")
		return
	}

	response.OK(w, map[string]interface{}{
		"results": results,
	})
}

// GET /api/v1/sessions/:session_id/attendance
func (h *AttendanceHandler) GetBySession(w http.ResponseWriter, r *http.Request) {
	sessionIDStr := chi.URLParam(r, "session_id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		response.BadRequest(w, "invalid session_id")
		return
	}

	attendances, err := h.attendanceRepo.GetBySessionWithDetails(r.Context(), sessionID)
	if err != nil {
		response.InternalError(w, "failed to get attendance")
		return
	}

	response.OK(w, attendances)
}

// GET /api/v1/students/:student_id/attendance
func (h *AttendanceHandler) GetByStudent(w http.ResponseWriter, r *http.Request) {
	studentIDStr := chi.URLParam(r, "student_id")
	studentID, err := uuid.Parse(studentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid student_id")
		return
	}

	limit := 50 // Default limit
	attendances, err := h.attendanceRepo.GetByStudent(r.Context(), studentID, limit)
	if err != nil {
		response.InternalError(w, "failed to get attendance")
		return
	}

	response.OK(w, attendances)
}

// PUT /api/v1/attendance/:id
func (h *AttendanceHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid attendance id")
		return
	}

	var req struct {
		Status string `json:"status" validate:"required,oneof=present absent excused"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	attendance, err := h.attendanceRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "attendance not found")
			return
		}
		response.InternalError(w, "failed to get attendance")
		return
	}

	userID := middleware.GetUserID(r.Context())
	attendance.Status = req.Status
	attendance.NotedBy = userID

	if err := h.attendanceRepo.Update(r.Context(), attendance); err != nil {
		response.InternalError(w, "failed to update attendance")
		return
	}

	response.OK(w, attendance)
}

// DELETE /api/v1/attendance/:id
func (h *AttendanceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid attendance id")
		return
	}

	// TODO: Consider restoring subscription session if was 'present'
	// For MVP, just delete without restoring

	if err := h.attendanceRepo.Delete(r.Context(), id); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "attendance not found")
			return
		}
		response.InternalError(w, "failed to delete attendance")
		return
	}

	response.NoContent(w)
}

// GET /api/v1/groups/:group_id/attendance/stats
func (h *AttendanceHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	groupIDStr := chi.URLParam(r, "group_id")
	groupID, err := uuid.Parse(groupIDStr)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	stats, err := h.attendanceRepo.GetStatsByGroup(r.Context(), groupID)
	if err != nil {
		response.InternalError(w, "failed to get stats")
		return
	}

	response.OK(w, stats)
}
