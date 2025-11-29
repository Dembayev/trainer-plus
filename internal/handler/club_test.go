package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/handler"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/response"
)

// MockClubRepository implements repository methods for testing
type MockClubRepository struct {
	clubs    map[uuid.UUID]*model.Club
	createFn func(ctx context.Context, club *model.Club) error
}

func NewMockClubRepository() *MockClubRepository {
	return &MockClubRepository{
		clubs: make(map[uuid.UUID]*model.Club),
	}
}

func (m *MockClubRepository) Create(ctx context.Context, club *model.Club) error {
	if m.createFn != nil {
		return m.createFn(ctx, club)
	}
	club.ID = uuid.New()
	club.CreatedAt = time.Now()
	m.clubs[club.ID] = club
	return nil
}

func (m *MockClubRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Club, error) {
	club, ok := m.clubs[id]
	if !ok {
		return nil, &notFoundError{}
	}
	return club, nil
}

func (m *MockClubRepository) GetByOwner(ctx context.Context, ownerID uuid.UUID) ([]model.Club, error) {
	var result []model.Club
	for _, club := range m.clubs {
		if club.OwnerUserID == ownerID {
			result = append(result, *club)
		}
	}
	return result, nil
}

func (m *MockClubRepository) Update(ctx context.Context, club *model.Club) error {
	if _, ok := m.clubs[club.ID]; !ok {
		return &notFoundError{}
	}
	m.clubs[club.ID] = club
	return nil
}

func (m *MockClubRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if _, ok := m.clubs[id]; !ok {
		return &notFoundError{}
	}
	delete(m.clubs, id)
	return nil
}

func (m *MockClubRepository) IsOwner(ctx context.Context, clubID, userID uuid.UUID) (bool, error) {
	club, ok := m.clubs[clubID]
	if !ok {
		return false, nil
	}
	return club.OwnerUserID == userID, nil
}

type notFoundError struct{}

func (e *notFoundError) Error() string { return "not found" }

// Helper to create request with user context
func requestWithUser(method, path string, body []byte, userID uuid.UUID) *http.Request {
	req := httptest.NewRequest(method, path, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	return req.WithContext(ctx)
}

// Helper to parse response
func parseResponse(t *testing.T, rr *httptest.ResponseRecorder) response.Response {
	var resp response.Response
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	return resp
}

func TestClubHandler_Create_Success(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	userID := uuid.New()
	body := `{"name":"Test Club","currency":"KZT","address":"Test Address"}`
	req := requestWithUser(http.MethodPost, "/api/v1/clubs", []byte(body), userID)
	rr := httptest.NewRecorder()

	h.Create(rr, req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, rr.Code)
	}

	resp := parseResponse(t, rr)
	if !resp.Success {
		t.Errorf("expected success=true, got false")
	}

	// Check club was created in mock
	if len(mockRepo.clubs) != 1 {
		t.Errorf("expected 1 club, got %d", len(mockRepo.clubs))
	}
}

func TestClubHandler_Create_ValidationError(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	userID := uuid.New()

	tests := []struct {
		name string
		body string
	}{
		{"missing name", `{"currency":"KZT"}`},
		{"name too short", `{"name":"AB","currency":"KZT"}`},
		{"invalid currency", `{"name":"Test Club","currency":"INVALID"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := requestWithUser(http.MethodPost, "/api/v1/clubs", []byte(tt.body), userID)
			rr := httptest.NewRecorder()

			h.Create(rr, req)

			if rr.Code != http.StatusUnprocessableEntity {
				t.Errorf("expected status %d, got %d", http.StatusUnprocessableEntity, rr.Code)
			}
		})
	}
}

func TestClubHandler_Create_Unauthorized(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	body := `{"name":"Test Club","currency":"KZT"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/clubs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	// No user in context
	rr := httptest.NewRecorder()

	h.Create(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestClubHandler_GetByID_Success(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	// Create a club first
	clubID := uuid.New()
	userID := uuid.New()
	mockRepo.clubs[clubID] = &model.Club{
		ID:          clubID,
		OwnerUserID: userID,
		Name:        "Test Club",
		Currency:    "KZT",
		CreatedAt:   time.Now(),
	}

	// Setup chi router context for URL params
	req := requestWithUser(http.MethodGet, "/api/v1/clubs/"+clubID.String(), nil, userID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", clubID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.GetByID(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestClubHandler_GetByID_NotFound(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	userID := uuid.New()
	nonExistentID := uuid.New()

	req := requestWithUser(http.MethodGet, "/api/v1/clubs/"+nonExistentID.String(), nil, userID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", nonExistentID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.GetByID(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status %d, got %d", http.StatusNotFound, rr.Code)
	}
}

func TestClubHandler_Update_Success(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	clubID := uuid.New()
	userID := uuid.New()
	mockRepo.clubs[clubID] = &model.Club{
		ID:          clubID,
		OwnerUserID: userID,
		Name:        "Old Name",
		Currency:    "KZT",
		CreatedAt:   time.Now(),
	}

	body := `{"name":"New Name"}`
	req := requestWithUser(http.MethodPut, "/api/v1/clubs/"+clubID.String(), []byte(body), userID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", clubID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.Update(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	// Verify update
	if mockRepo.clubs[clubID].Name != "New Name" {
		t.Errorf("expected name 'New Name', got '%s'", mockRepo.clubs[clubID].Name)
	}
}

func TestClubHandler_Update_Forbidden(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	clubID := uuid.New()
	ownerID := uuid.New()
	otherUserID := uuid.New()

	mockRepo.clubs[clubID] = &model.Club{
		ID:          clubID,
		OwnerUserID: ownerID,
		Name:        "Test Club",
		Currency:    "KZT",
		CreatedAt:   time.Now(),
	}

	body := `{"name":"Hacked Name"}`
	req := requestWithUser(http.MethodPut, "/api/v1/clubs/"+clubID.String(), []byte(body), otherUserID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", clubID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.Update(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rr.Code)
	}
}

func TestClubHandler_Delete_Success(t *testing.T) {
	mockRepo := NewMockClubRepository()
	validate := validator.New()
	h := handler.NewClubHandler(mockRepo, validate)

	clubID := uuid.New()
	userID := uuid.New()
	mockRepo.clubs[clubID] = &model.Club{
		ID:          clubID,
		OwnerUserID: userID,
		Name:        "To Delete",
		Currency:    "KZT",
		CreatedAt:   time.Now(),
	}

	req := requestWithUser(http.MethodDelete, "/api/v1/clubs/"+clubID.String(), nil, userID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", clubID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.Delete(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("expected status %d, got %d", http.StatusNoContent, rr.Code)
	}

	if len(mockRepo.clubs) != 0 {
		t.Errorf("expected 0 clubs, got %d", len(mockRepo.clubs))
	}
}
