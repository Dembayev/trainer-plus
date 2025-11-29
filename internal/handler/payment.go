package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/response"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
)

type PaymentHandler struct {
	paymentRepo *repository.PaymentRepository
	subRepo     *repository.SubscriptionRepository
	studentRepo *repository.StudentRepository
	groupRepo   *repository.GroupRepository
	clubRepo    *repository.ClubRepository
	validator   *validator.Validator
	logger      *slog.Logger
}

func NewPaymentHandler(
	paymentRepo *repository.PaymentRepository,
	subRepo *repository.SubscriptionRepository,
	studentRepo *repository.StudentRepository,
	groupRepo *repository.GroupRepository,
	clubRepo *repository.ClubRepository,
	validator *validator.Validator,
	logger *slog.Logger,
) *PaymentHandler {
	return &PaymentHandler{
		paymentRepo: paymentRepo,
		subRepo:     subRepo,
		studentRepo: studentRepo,
		groupRepo:   groupRepo,
		clubRepo:    clubRepo,
		validator:   validator,
		logger:      logger,
	}
}

// CreateCheckoutRequest for public checkout
type CreateCheckoutRequest struct {
	// For new students
	Student *struct {
		Name          string `json:"name" validate:"required_without=StudentID,omitempty,min=2,max=100"`
		ParentContact *struct {
			Name  string `json:"name"`
			Phone string `json:"phone"`
			Email string `json:"email" validate:"omitempty,email"`
		} `json:"parent_contact"`
	} `json:"student"`

	// Or existing student
	StudentID string `json:"student_id" validate:"required_without=Student,omitempty,uuid4"`

	GroupID string `json:"group_id" validate:"required,uuid4"`

	Subscription struct {
		TotalSessions int     `json:"total_sessions" validate:"required,gte=1,lte=100"`
		Price         float64 `json:"price" validate:"required,gte=0"`
	} `json:"subscription" validate:"required"`

	SuccessURL string `json:"success_url" validate:"required,url"`
	CancelURL  string `json:"cancel_url" validate:"required,url"`
}

// POST /api/v1/payments/create-checkout-session (public endpoint)
func (h *PaymentHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	var req CreateCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	// Basic validation
	if req.Student == nil && req.StudentID == "" {
		response.BadRequest(w, "either student or student_id is required")
		return
	}

	groupID, err := uuid.Parse(req.GroupID)
	if err != nil {
		response.BadRequest(w, "invalid group_id")
		return
	}

	// Verify group exists
	group, err := h.groupRepo.GetByID(r.Context(), groupID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.BadRequest(w, "group not found")
			return
		}
		response.InternalError(w, "failed to verify group")
		return
	}

	// Get club for currency
	club, err := h.clubRepo.GetByID(r.Context(), group.ClubID)
	if err != nil {
		response.InternalError(w, "failed to get club")
		return
	}

	// Handle student (create new or use existing)
	var studentID uuid.UUID
	var studentName string

	if req.StudentID != "" {
		studentID, err = uuid.Parse(req.StudentID)
		if err != nil {
			response.BadRequest(w, "invalid student_id")
			return
		}
		student, err := h.studentRepo.GetByID(r.Context(), studentID)
		if err != nil {
			response.BadRequest(w, "student not found")
			return
		}
		studentName = student.Name
	} else {
		// Create new student
		var parentContact *model.ParentContact
		if req.Student.ParentContact != nil {
			parentContact = &model.ParentContact{
				Name:  req.Student.ParentContact.Name,
				Phone: req.Student.ParentContact.Phone,
				Email: req.Student.ParentContact.Email,
			}
		}

		student := &model.Student{
			ClubID:        group.ClubID,
			Name:          req.Student.Name,
			ParentContact: parentContact,
		}

		if err := h.studentRepo.Create(r.Context(), student); err != nil {
			response.InternalError(w, "failed to create student")
			return
		}
		studentID = student.ID
		studentName = student.Name
	}

	// Create pending subscription
	sub := &model.Subscription{
		StudentID:         studentID,
		GroupID:           groupID,
		TotalSessions:     req.Subscription.TotalSessions,
		RemainingSessions: req.Subscription.TotalSessions,
		Price:             req.Subscription.Price,
		Status:            string(model.SubscriptionPending),
	}

	if err := h.subRepo.Create(r.Context(), sub); err != nil {
		response.InternalError(w, "failed to create subscription")
		return
	}

	// Initialize Stripe
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	if stripe.Key == "" {
		response.InternalError(w, "payment system not configured")
		return
	}

	// Determine currency (convert to lowercase for Stripe)
	currency := "kzt"
	if club.Currency != "" {
		currency = club.Currency
	}

	// Convert price to smallest currency unit (cents/tiyn)
	unitAmount := int64(req.Subscription.Price * 100)

	// Create Stripe Checkout Session
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(currency),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(fmt.Sprintf("Абонемент: %s (%d занятий)", group.Title, req.Subscription.TotalSessions)),
						Description: stripe.String(fmt.Sprintf("Ученик: %s", studentName)),
					},
					UnitAmount: stripe.Int64(unitAmount),
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(req.SuccessURL + "?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(req.CancelURL),
		Metadata: map[string]string{
			"subscription_id": sub.ID.String(),
			"student_id":      studentID.String(),
			"group_id":        groupID.String(),
			"club_id":         club.ID.String(),
		},
		CustomerEmail: stripe.String(getCustomerEmail(req)),
	}

	sess, err := session.New(params)
	if err != nil {
		h.logger.Error("stripe session creation failed", slog.String("error", err.Error()))
		response.InternalError(w, "failed to create payment session")
		return
	}

	// Create pending payment record
	payment := &model.Payment{
		SubscriptionID:    sub.ID,
		Amount:            req.Subscription.Price,
		Currency:          currency,
		Method:            string(model.PaymentStripe),
		Status:            string(model.PaymentPending),
		ProviderPaymentID: sess.ID,
		ProviderMetadata: map[string]interface{}{
			"checkout_session_id": sess.ID,
			"student_name":        studentName,
			"group_title":         group.Title,
		},
	}

	if err := h.paymentRepo.Create(r.Context(), payment); err != nil {
		h.logger.Error("failed to create payment record", slog.String("error", err.Error()))
		// Don't fail - payment session is created, webhook will handle it
	}

	response.OK(w, map[string]interface{}{
		"checkout_url":    sess.URL,
		"session_id":      sess.ID,
		"subscription_id": sub.ID,
	})
}

// POST /api/v1/webhooks/stripe
func (h *PaymentHandler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.Error("failed to read webhook body", slog.String("error", err.Error()))
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")

	event, err := webhook.ConstructEvent(payload, sigHeader, endpointSecret)
	if err != nil {
		h.logger.Error("webhook signature verification failed", slog.String("error", err.Error()))
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}

	h.logger.Info("received stripe webhook", slog.String("type", string(event.Type)))

	ctx := r.Context()

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			h.logger.Error("failed to parse checkout session", slog.String("error", err.Error()))
			http.Error(w, "bad payload", http.StatusBadRequest)
			return
		}
		h.handleCheckoutCompleted(ctx, &sess)

	case "checkout.session.expired":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			h.logger.Error("failed to parse checkout session", slog.String("error", err.Error()))
			http.Error(w, "bad payload", http.StatusBadRequest)
			return
		}
		h.handleCheckoutExpired(ctx, &sess)

	case "charge.refunded":
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			h.logger.Error("failed to parse charge", slog.String("error", err.Error()))
			http.Error(w, "bad payload", http.StatusBadRequest)
			return
		}
		h.handleRefund(ctx, &charge)

	default:
		h.logger.Debug("unhandled webhook event", slog.String("type", string(event.Type)))
	}

	w.WriteHeader(http.StatusOK)
}

func (h *PaymentHandler) handleCheckoutCompleted(ctx context.Context, sess *stripe.CheckoutSession) {
	// Find payment by provider_payment_id (checkout session ID)
	payment, err := h.paymentRepo.GetByProviderID(ctx, sess.ID)
	if err != nil {
		h.logger.Error("payment not found for checkout session",
			slog.String("session_id", sess.ID),
			slog.String("error", err.Error()))
		return
	}

	// Idempotency check
	if payment.Status == string(model.PaymentSucceeded) {
		h.logger.Info("payment already processed", slog.String("payment_id", payment.ID.String()))
		return
	}

	// Update payment status
	if err := h.paymentRepo.MarkSucceeded(ctx, payment.ID); err != nil {
		h.logger.Error("failed to mark payment succeeded",
			slog.String("payment_id", payment.ID.String()),
			slog.String("error", err.Error()))
		return
	}

	// Activate subscription
	now := time.Now()
	// Default expiry: 90 days from now (configurable)
	expiresAt := now.AddDate(0, 3, 0)

	if err := h.subRepo.Activate(ctx, payment.SubscriptionID, &now, &expiresAt); err != nil {
		h.logger.Error("failed to activate subscription",
			slog.String("subscription_id", payment.SubscriptionID.String()),
			slog.String("error", err.Error()))
		return
	}

	h.logger.Info("payment completed and subscription activated",
		slog.String("payment_id", payment.ID.String()),
		slog.String("subscription_id", payment.SubscriptionID.String()))

	// TODO: Send email receipt
	// TODO: Notify coach/owner
}

func (h *PaymentHandler) handleCheckoutExpired(ctx context.Context, sess *stripe.CheckoutSession) {
	payment, err := h.paymentRepo.GetByProviderID(ctx, sess.ID)
	if err != nil {
		return
	}

	if payment.Status != string(model.PaymentPending) {
		return
	}

	// Mark payment as failed
	if err := h.paymentRepo.MarkFailed(ctx, payment.ID); err != nil {
		h.logger.Error("failed to mark payment failed", slog.String("error", err.Error()))
	}

	// Cancel subscription
	if err := h.subRepo.UpdateStatus(ctx, payment.SubscriptionID, string(model.SubscriptionCancelled)); err != nil {
		h.logger.Error("failed to cancel subscription", slog.String("error", err.Error()))
	}

	h.logger.Info("checkout expired, subscription cancelled",
		slog.String("payment_id", payment.ID.String()))
}

func (h *PaymentHandler) handleRefund(ctx context.Context, charge *stripe.Charge) {
	// Find payment by payment intent ID
	if charge.PaymentIntent == nil {
		return
	}

	// Note: We store checkout session ID, not payment intent
	// In production, you might want to store both or look up differently
	h.logger.Info("refund received",
		slog.String("charge_id", charge.ID),
		slog.Int64("amount_refunded", charge.AmountRefunded))

	// TODO: Implement refund handling
	// - Find payment by payment intent
	// - Mark as refunded
	// - Optionally cancel/update subscription
	// - Notify admin
}

// GET /api/v1/payments/:id
func (h *PaymentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid payment id")
		return
	}

	payment, err := h.paymentRepo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "payment not found")
			return
		}
		response.InternalError(w, "failed to get payment")
		return
	}

	response.OK(w, payment)
}

// GET /api/v1/subscriptions/:subscription_id/payments
func (h *PaymentHandler) GetBySubscription(w http.ResponseWriter, r *http.Request) {
	subIDStr := chi.URLParam(r, "subscription_id")
	subID, err := uuid.Parse(subIDStr)
	if err != nil {
		response.BadRequest(w, "invalid subscription_id")
		return
	}

	payments, err := h.paymentRepo.GetBySubscription(r.Context(), subID)
	if err != nil {
		response.InternalError(w, "failed to get payments")
		return
	}

	response.OK(w, payments)
}

// POST /api/v1/payments/manual - Create manual/cash payment
func (h *PaymentHandler) CreateManual(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SubscriptionID string  `json:"subscription_id" validate:"required,uuid4"`
		Amount         float64 `json:"amount" validate:"required,gte=0"`
		Method         string  `json:"method" validate:"required,oneof=cash manual"`
		Notes          string  `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	subID, err := uuid.Parse(req.SubscriptionID)
	if err != nil {
		response.BadRequest(w, "invalid subscription_id")
		return
	}

	// Verify subscription exists
	sub, err := h.subRepo.GetByID(r.Context(), subID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			response.NotFound(w, "subscription not found")
			return
		}
		response.InternalError(w, "failed to get subscription")
		return
	}

	// Get club for currency
	group, err := h.groupRepo.GetByID(r.Context(), sub.GroupID)
	if err != nil {
		response.InternalError(w, "failed to get group")
		return
	}

	club, err := h.clubRepo.GetByID(r.Context(), group.ClubID)
	if err != nil {
		response.InternalError(w, "failed to get club")
		return
	}

	now := time.Now()
	payment := &model.Payment{
		SubscriptionID: subID,
		Amount:         req.Amount,
		Currency:       club.Currency,
		Method:         req.Method,
		Status:         string(model.PaymentSucceeded),
		PaidAt:         &now,
		ProviderMetadata: map[string]interface{}{
			"notes": req.Notes,
		},
	}

	if err := h.paymentRepo.Create(r.Context(), payment); err != nil {
		response.InternalError(w, "failed to create payment")
		return
	}

	// Activate subscription if pending
	if sub.Status == string(model.SubscriptionPending) {
		expiresAt := now.AddDate(0, 3, 0)
		if err := h.subRepo.Activate(r.Context(), subID, &now, &expiresAt); err != nil {
			h.logger.Error("failed to activate subscription", slog.String("error", err.Error()))
		}
	}

	response.Created(w, payment)
}

// Helper to get customer email from request
func getCustomerEmail(req CreateCheckoutRequest) string {
	if req.Student != nil && req.Student.ParentContact != nil {
		return req.Student.ParentContact.Email
	}
	return ""
}
