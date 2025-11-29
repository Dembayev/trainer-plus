package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/pkg/response"
)

type ReportHandler struct {
	reportRepo *repository.ReportRepository
	clubRepo   *repository.ClubRepository
}

func NewReportHandler(reportRepo *repository.ReportRepository, clubRepo *repository.ClubRepository) *ReportHandler {
	return &ReportHandler{
		reportRepo: reportRepo,
		clubRepo:   clubRepo,
	}
}

// GET /api/v1/clubs/:club_id/reports/finance
func (h *ReportHandler) Finance(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	from, to := h.parseDateRange(r)

	report, err := h.reportRepo.GetFinanceReport(r.Context(), clubID, from, to)
	if err != nil {
		response.InternalError(w, "failed to generate finance report")
		return
	}

	response.OK(w, report)
}

// GET /api/v1/clubs/:club_id/reports/occupancy
func (h *ReportHandler) Occupancy(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	from, to := h.parseDateRange(r)

	report, err := h.reportRepo.GetOccupancyReport(r.Context(), clubID, from, to)
	if err != nil {
		response.InternalError(w, "failed to generate occupancy report")
		return
	}

	response.OK(w, report)
}

// GET /api/v1/clubs/:club_id/reports/mrr
func (h *ReportHandler) MRR(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	// Parse month (default: current month)
	monthStr := r.URL.Query().Get("month")
	var month time.Time
	if monthStr != "" {
		month, err = time.Parse("2006-01", monthStr)
		if err != nil {
			response.BadRequest(w, "invalid month format, use YYYY-MM")
			return
		}
	} else {
		now := time.Now()
		month = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	report, err := h.reportRepo.GetMRRReport(r.Context(), clubID, month)
	if err != nil {
		response.InternalError(w, "failed to generate MRR report")
		return
	}

	response.OK(w, report)
}

// GET /api/v1/clubs/:club_id/reports/students
func (h *ReportHandler) Students(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	from, to := h.parseDateRange(r)

	// Parse limit for top students
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	report, err := h.reportRepo.GetStudentsReport(r.Context(), clubID, from, to, limit)
	if err != nil {
		response.InternalError(w, "failed to generate students report")
		return
	}

	response.OK(w, report)
}

// GET /api/v1/clubs/:club_id/reports/debt
func (h *ReportHandler) Debt(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	// Parse days threshold (default: 7 days)
	days := 7
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	report, err := h.reportRepo.GetDebtReport(r.Context(), clubID, days)
	if err != nil {
		response.InternalError(w, "failed to generate debt report")
		return
	}

	response.OK(w, report)
}

// GET /api/v1/clubs/:club_id/dashboard
func (h *ReportHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	clubID, err := h.parseAndVerifyClubAccess(w, r)
	if err != nil {
		return
	}

	stats, err := h.reportRepo.GetDashboardStats(r.Context(), clubID)
	if err != nil {
		response.InternalError(w, "failed to get dashboard stats")
		return
	}

	response.OK(w, stats)
}

// Helper: parse club_id and verify access
func (h *ReportHandler) parseAndVerifyClubAccess(w http.ResponseWriter, r *http.Request) (uuid.UUID, error) {
	clubIDStr := chi.URLParam(r, "club_id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club_id")
		return uuid.Nil, err
	}

	// Verify club exists and user has access
	club, err := h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		response.NotFound(w, "club not found")
		return uuid.Nil, err
	}

	userID := middleware.GetUserID(r.Context())
	if club.OwnerUserID != userID {
		response.Forbidden(w, "you don't have access to this club's reports")
		return uuid.Nil, err
	}

	return clubID, nil
}

// Helper: parse date range from query params
func (h *ReportHandler) parseDateRange(r *http.Request) (from, to time.Time) {
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	// Default: last 30 days
	to = time.Now().UTC()
	from = to.AddDate(0, 0, -30)

	if fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}

	if toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			// End of day
			to = t.Add(24*time.Hour - time.Second)
		}
	}

	return from, to
}
