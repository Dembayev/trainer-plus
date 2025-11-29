package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/pkg/response"
)

type PublicHandler struct {
	clubRepo    *repository.ClubRepository
	groupRepo   *repository.GroupRepository
	sessionRepo *repository.SessionRepository
}

func NewPublicHandler(
	clubRepo *repository.ClubRepository,
	groupRepo *repository.GroupRepository,
	sessionRepo *repository.SessionRepository,
) *PublicHandler {
	return &PublicHandler{
		clubRepo:    clubRepo,
		groupRepo:   groupRepo,
		sessionRepo: sessionRepo,
	}
}

// PublicScheduleResponse represents the public schedule data
type PublicScheduleResponse struct {
	Club     PublicClubInfo     `json:"club"`
	Groups   []PublicGroupInfo  `json:"groups"`
	Sessions []PublicSessionInfo `json:"sessions"`
}

type PublicClubInfo struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Address  string    `json:"address,omitempty"`
	Phone    string    `json:"phone,omitempty"`
	Currency string    `json:"currency"`
}

type PublicGroupInfo struct {
	ID          uuid.UUID `json:"id"`
	Title       string    `json:"title"`
	Sport       string    `json:"sport,omitempty"`
	Capacity    int       `json:"capacity,omitempty"`
	Price       float64   `json:"price"`
	Description string    `json:"description,omitempty"`
}

type PublicSessionInfo struct {
	ID              uuid.UUID `json:"id"`
	GroupID         uuid.UUID `json:"group_id"`
	GroupTitle      string    `json:"group_title"`
	StartAt         time.Time `json:"start_at"`
	DurationMinutes int       `json:"duration_minutes"`
	Location        string    `json:"location,omitempty"`
}

// GET /public/club/:id/schedule
func (h *PublicHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club id")
		return
	}

	// Get club
	club, err := h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		response.NotFound(w, "club not found")
		return
	}

	// Get groups
	groups, err := h.groupRepo.GetByClub(r.Context(), clubID)
	if err != nil {
		response.InternalError(w, "failed to get groups")
		return
	}

	// Parse date range from query (default: next 30 days)
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var from, to time.Time
	if fromStr != "" {
		from, _ = time.Parse("2006-01-02", fromStr)
	} else {
		from = time.Now()
	}

	if toStr != "" {
		to, _ = time.Parse("2006-01-02", toStr)
	} else {
		to = time.Now().AddDate(0, 0, 30)
	}

	// Get sessions for all groups
	sessions, err := h.sessionRepo.GetByClubDateRange(r.Context(), clubID, from, to)
	if err != nil {
		response.InternalError(w, "failed to get sessions")
		return
	}

	// Build group map for quick lookup
	groupMap := make(map[uuid.UUID]string)
	publicGroups := make([]PublicGroupInfo, len(groups))
	for i, g := range groups {
		groupMap[g.ID] = g.Title
		publicGroups[i] = PublicGroupInfo{
			ID:          g.ID,
			Title:       g.Title,
			Sport:       g.Sport,
			Capacity:    g.Capacity,
			Price:       g.Price,
			Description: g.Description,
		}
	}

	// Build session response
	publicSessions := make([]PublicSessionInfo, len(sessions))
	for i, s := range sessions {
		publicSessions[i] = PublicSessionInfo{
			ID:              s.ID,
			GroupID:         s.GroupID,
			GroupTitle:      groupMap[s.GroupID],
			StartAt:         s.StartAt,
			DurationMinutes: s.DurationMinutes,
			Location:        s.Location,
		}
	}

	resp := PublicScheduleResponse{
		Club: PublicClubInfo{
			ID:       club.ID,
			Name:     club.Name,
			Address:  club.Address,
			Phone:    club.Phone,
			Currency: club.Currency,
		},
		Groups:   publicGroups,
		Sessions: publicSessions,
	}

	response.OK(w, resp)
}

// GET /public/club/:id/groups
func (h *PublicHandler) Groups(w http.ResponseWriter, r *http.Request) {
	clubIDStr := chi.URLParam(r, "id")
	clubID, err := uuid.Parse(clubIDStr)
	if err != nil {
		response.BadRequest(w, "invalid club id")
		return
	}

	// Check club exists
	_, err = h.clubRepo.GetByID(r.Context(), clubID)
	if err != nil {
		response.NotFound(w, "club not found")
		return
	}

	groups, err := h.groupRepo.GetByClub(r.Context(), clubID)
	if err != nil {
		response.InternalError(w, "failed to get groups")
		return
	}

	publicGroups := make([]PublicGroupInfo, len(groups))
	for i, g := range groups {
		publicGroups[i] = PublicGroupInfo{
			ID:          g.ID,
			Title:       g.Title,
			Sport:       g.Sport,
			Capacity:    g.Capacity,
			Price:       g.Price,
			Description: g.Description,
		}
	}

	response.OK(w, publicGroups)
}
