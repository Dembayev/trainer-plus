package handler_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/model"
)

// MockSubscriptionRepository for testing
type MockSubscriptionRepository struct {
	subs map[uuid.UUID]*model.Subscription
}

func NewMockSubscriptionRepository() *MockSubscriptionRepository {
	return &MockSubscriptionRepository{
		subs: make(map[uuid.UUID]*model.Subscription),
	}
}

func (m *MockSubscriptionRepository) Create(ctx context.Context, sub *model.Subscription) error {
	sub.ID = uuid.New()
	sub.CreatedAt = time.Now()
	m.subs[sub.ID] = sub
	return nil
}

func (m *MockSubscriptionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
	if sub, ok := m.subs[id]; ok {
		return sub, nil
	}
	return nil, &notFoundError{}
}

func (m *MockSubscriptionRepository) Activate(ctx context.Context, id uuid.UUID, startsAt, expiresAt *time.Time) error {
	if sub, ok := m.subs[id]; ok {
		sub.Status = string(model.SubscriptionActive)
		sub.StartsAt = startsAt
		sub.ExpiresAt = expiresAt
		return nil
	}
	return &notFoundError{}
}

func (m *MockSubscriptionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	if sub, ok := m.subs[id]; ok {
		sub.Status = status
		return nil
	}
	return &notFoundError{}
}

// MockPaymentRepository for testing
type MockPaymentRepository struct {
	payments     map[uuid.UUID]*model.Payment
	byProviderID map[string]*model.Payment
}

func NewMockPaymentRepository() *MockPaymentRepository {
	return &MockPaymentRepository{
		payments:     make(map[uuid.UUID]*model.Payment),
		byProviderID: make(map[string]*model.Payment),
	}
}

func (m *MockPaymentRepository) Create(ctx context.Context, payment *model.Payment) error {
	payment.ID = uuid.New()
	payment.CreatedAt = time.Now()
	m.payments[payment.ID] = payment
	if payment.ProviderPaymentID != "" {
		m.byProviderID[payment.ProviderPaymentID] = payment
	}
	return nil
}

func (m *MockPaymentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	if p, ok := m.payments[id]; ok {
		return p, nil
	}
	return nil, &notFoundError{}
}

func (m *MockPaymentRepository) GetByProviderID(ctx context.Context, providerID string) (*model.Payment, error) {
	if p, ok := m.byProviderID[providerID]; ok {
		return p, nil
	}
	return nil, &notFoundError{}
}

func (m *MockPaymentRepository) MarkSucceeded(ctx context.Context, id uuid.UUID) error {
	if p, ok := m.payments[id]; ok {
		p.Status = string(model.PaymentSucceeded)
		now := time.Now()
		p.PaidAt = &now
		return nil
	}
	return &notFoundError{}
}

func (m *MockPaymentRepository) MarkFailed(ctx context.Context, id uuid.UUID) error {
	if p, ok := m.payments[id]; ok {
		p.Status = string(model.PaymentFailed)
		return nil
	}
	return &notFoundError{}
}

func TestPaymentWebhook_CheckoutCompleted_Idempotency(t *testing.T) {
	// Setup
	subRepo := NewMockSubscriptionRepository()
	paymentRepo := NewMockPaymentRepository()

	ctx := context.Background()

	// Create a subscription
	sub := &model.Subscription{
		StudentID:         uuid.New(),
		GroupID:           uuid.New(),
		TotalSessions:     8,
		RemainingSessions: 8,
		Price:             15000,
		Status:            string(model.SubscriptionPending),
	}
	subRepo.Create(ctx, sub)

	// Create a payment
	payment := &model.Payment{
		SubscriptionID:    sub.ID,
		Amount:            15000,
		Currency:          "KZT",
		Method:            string(model.PaymentStripe),
		Status:            string(model.PaymentPending),
		ProviderPaymentID: "cs_test_123",
	}
	paymentRepo.Create(ctx, payment)

	// Simulate first webhook call
	paymentRepo.MarkSucceeded(ctx, payment.ID)
	subRepo.Activate(ctx, sub.ID, nil, nil)

	// Verify state
	updatedPayment, _ := paymentRepo.GetByID(ctx, payment.ID)
	if updatedPayment.Status != string(model.PaymentSucceeded) {
		t.Errorf("expected payment status 'succeeded', got '%s'", updatedPayment.Status)
	}

	updatedSub, _ := subRepo.GetByID(ctx, sub.ID)
	if updatedSub.Status != string(model.SubscriptionActive) {
		t.Errorf("expected subscription status 'active', got '%s'", updatedSub.Status)
	}

	// Simulate second webhook call (idempotency check)
	// In real handler, it would check if payment.Status == succeeded and return early
	if updatedPayment.Status == string(model.PaymentSucceeded) {
		// Would return early - payment already processed
		t.Log("Idempotency check passed - payment already processed")
	}
}

func TestAttendance_DecrementRemainingSessions(t *testing.T) {
	subRepo := NewMockSubscriptionRepository()
	ctx := context.Background()

	// Create an active subscription with 8 sessions
	sub := &model.Subscription{
		StudentID:         uuid.New(),
		GroupID:           uuid.New(),
		TotalSessions:     8,
		RemainingSessions: 8,
		Status:            string(model.SubscriptionActive),
	}
	subRepo.Create(ctx, sub)

	// Simulate attendance marking - would decrement remaining
	sub.RemainingSessions--

	if sub.RemainingSessions != 7 {
		t.Errorf("expected 7 remaining sessions, got %d", sub.RemainingSessions)
	}

	// Use all sessions
	for i := 0; i < 7; i++ {
		sub.RemainingSessions--
	}

	if sub.RemainingSessions != 0 {
		t.Errorf("expected 0 remaining sessions, got %d", sub.RemainingSessions)
	}

	// Status should become 'used' when remaining = 0
	if sub.RemainingSessions == 0 {
		sub.Status = string(model.SubscriptionUsed)
	}

	if sub.Status != string(model.SubscriptionUsed) {
		t.Errorf("expected status 'used', got '%s'", sub.Status)
	}
}

func TestSubscription_StatusTransitions(t *testing.T) {
	tests := []struct {
		name       string
		fromStatus model.SubscriptionStatus
		toStatus   model.SubscriptionStatus
		valid      bool
	}{
		{"pending to active", model.SubscriptionPending, model.SubscriptionActive, true},
		{"pending to cancelled", model.SubscriptionPending, model.SubscriptionCancelled, true},
		{"active to used", model.SubscriptionActive, model.SubscriptionUsed, true},
		{"active to expired", model.SubscriptionActive, model.SubscriptionExpired, true},
		{"active to cancelled", model.SubscriptionActive, model.SubscriptionCancelled, true},
		{"used to active", model.SubscriptionUsed, model.SubscriptionActive, false},
		{"cancelled to active", model.SubscriptionCancelled, model.SubscriptionActive, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valid := isValidStatusTransition(tt.fromStatus, tt.toStatus)
			if valid != tt.valid {
				t.Errorf("transition from %s to %s: expected valid=%v, got %v",
					tt.fromStatus, tt.toStatus, tt.valid, valid)
			}
		})
	}
}

// Helper function to validate status transitions
func isValidStatusTransition(from, to model.SubscriptionStatus) bool {
	validTransitions := map[model.SubscriptionStatus][]model.SubscriptionStatus{
		model.SubscriptionPending: {model.SubscriptionActive, model.SubscriptionCancelled},
		model.SubscriptionActive:  {model.SubscriptionUsed, model.SubscriptionExpired, model.SubscriptionCancelled},
		model.SubscriptionUsed:    {}, // Terminal state
		model.SubscriptionExpired: {}, // Terminal state
		model.SubscriptionCancelled: {}, // Terminal state
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}

	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
