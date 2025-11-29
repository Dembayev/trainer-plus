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

type StudentHandler struct {
	studentRepo *repository.StudentRepository
	clubRepo    *repository.ClubRepository
	validator   *validator.Validator
}

func NewStudentHandler(
	studentRepo *repository.StudentRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
) *StudentHandler {
	return &StudentHandler{
		studentRepo: studentRepo,
		clubRepo:    clubRepo,
		validator:   validator,
	}
}

// POST /api/v1/students
func (h *StudentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateStudentRequest
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
		response.Forbidden(w, "you don't have permission to add students to this club")
		return
	}

	student := &model.Student{
		ClubID: clubID,
		Name:   req.Name,
		Notes:  req.Notes,
	}

	// Parse birth date if provided
	if req.BirthDate != "" {
		birthDate, err := time.Parse("2006-01-02", req.BirthDate)
		if err != nil {
			response.BadRequest(w, "invalid birth_date format, use YYYY-MM-DD")
			return
		}
		student.BirthDate = &birthDate
	}

	// Parse parent contact if provided
	if req.ParentContact != nil {
		student.ParentContact = &model.ParentContact{
			Name:  req.ParentContact.Name,
			Phone: req.ParentContact.Phone,
			Email: req.ParentContact.Email,
		}
	}

	if err := h.studentRepo.Create(r.Context(), student); err != nil {
		response.InternalError(w, "failed to create student")
		return
	}

	response.Created(w, student)
}

// GET /api/v1/students/:id
func (h *StudentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid student id")
		return
	}

	student, err := h.studentRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "student not found")
			return
		}
		response.InternalError(w, "failed to get student")
		return
	}

	response.OK(w, student)
}

// GET /api/v1/clubs/:club_id/students
func (h *StudentHandler) ListByClub(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "club_id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return
	}

	pagination := parsePagination(r)

	students, err := h.studentRepo.GetByClub(r.Context(), clubID, pagination.GetLimit(), pagination.GetOffset())
	if err != nil {
		response.InternalError(w, "failed to get students")
		return
	}

	// Get total count for pagination
	total, err := h.studentRepo.CountByClub(r.Context(), clubID)
	if err != nil {
		response.InternalError(w, "failed to count students")
		return
	}

	response.WithMeta(w, http.StatusOK, students, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.GetLimit(),
		Total:      total,
		TotalPages: (total + pagination.GetLimit() - 1) / pagination.GetLimit(),
	})
}

// GET /api/v1/clubs/:club_id/students/search
func (h *StudentHandler) Search(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "club_id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		response.BadRequest(w, "search query (q) is required")
		return
	}

	students, err := h.studentRepo.Search(r.Context(), clubID, query)
	if err != nil {
		response.InternalError(w, "failed to search students")
		return
	}

	response.OK(w, students)
}

// PUT /api/v1/students/:id
func (h *StudentHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid student id")
		return
	}

	var req UpdateStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.validator.Struct(req); err != nil {
		response.UnprocessableEntity(w, err.Error())
		return
	}

	student, err := h.studentRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "student not found")
			return
		}
		response.InternalError(w, "failed to get student")
		return
	}

	// Check permission
	club, err := h.clubRepo.GetByID(r.Context(), student.ClubID)
	if err != nil {
		response.InternalError(w, "failed to verify club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have permission to update this student")
		return
	}

	// Apply updates
	if req.Name != nil {
		student.Name = *req.Name
	}
	if req.Notes != nil {
		student.Notes = *req.Notes
	}
	if req.BirthDate != nil {
		birthDate, err := time.Parse("2006-01-02", *req.BirthDate)
		if err != nil {
			response.BadRequest(w, "invalid birth_date format")
			return
		}
		student.BirthDate = &birthDate
	}
	if req.ParentContact != nil {
		student.ParentContact = &model.ParentContact{
			Name:  req.ParentContact.Name,
			Phone: req.ParentContact.Phone,
			Email: req.ParentContact.Email,
		}
	}

	if err := h.studentRepo.Update(r.Context(), student); err != nil {
		response.InternalError(w, "failed to update student")
		return
	}

	response.OK(w, student)
}

// DELETE /api/v1/students/:id
func (h *StudentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid student id")
		return
	}

	student, err := h.studentRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "student not found")
			return
		}
		response.InternalError(w, "failed to get student")
		return
	}

	club, err := h.clubRepo.GetByID(r.Context(), student.ClubID)
	if err != nil {
		response.InternalError(w, "failed to verify club")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have permission to delete this student")
		return
	}

	if err := h.studentRepo.Delete(r.Context(), id); err != nil {
		response.InternalError(w, "failed to delete student")
		return
	}

	response.NoContent(w)
}
