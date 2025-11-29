package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/neo/trainer-plus/internal/model"
)

type PaymentRepository struct {
	db *sqlx.DB
}

func NewPaymentRepository(db *sqlx.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) Create(ctx context.Context, payment *model.Payment) error {
	metadataJSON, _ := json.Marshal(payment.ProviderMetadata)

	query := `
		INSERT INTO payments (subscription_id, amount, currency, method, status, provider_payment_id, provider_metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		payment.SubscriptionID,
		payment.Amount,
		payment.Currency,
		payment.Method,
		payment.Status,
		payment.ProviderPaymentID,
		metadataJSON,
	).Scan(&payment.ID, &payment.CreatedAt)
}

func (r *PaymentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	var p paymentDB
	query := `SELECT * FROM payments WHERE id = $1`

	err := r.db.GetContext(ctx, &p, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return p.toModel(), nil
}

func (r *PaymentRepository) GetByProviderID(ctx context.Context, providerID string) (*model.Payment, error) {
	var p paymentDB
	query := `SELECT * FROM payments WHERE provider_payment_id = $1`

	err := r.db.GetContext(ctx, &p, query, providerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return p.toModel(), nil
}

func (r *PaymentRepository) GetBySubscription(ctx context.Context, subscriptionID uuid.UUID) ([]model.Payment, error) {
	var payments []paymentDB
	query := `SELECT * FROM payments WHERE subscription_id = $1 ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &payments, query, subscriptionID)
	if err != nil {
		return nil, err
	}

	result := make([]model.Payment, len(payments))
	for i, p := range payments {
		result[i] = *p.toModel()
	}
	return result, nil
}

func (r *PaymentRepository) Update(ctx context.Context, payment *model.Payment) error {
	metadataJSON, _ := json.Marshal(payment.ProviderMetadata)

	query := `
		UPDATE payments 
		SET status = $2, paid_at = $3, provider_metadata = $4
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		payment.ID,
		payment.Status,
		payment.PaidAt,
		metadataJSON,
	)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PaymentRepository) MarkSucceeded(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	query := `UPDATE payments SET status = 'succeeded', paid_at = $2 WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id, now)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PaymentRepository) MarkFailed(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE payments SET status = 'failed' WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PaymentRepository) MarkRefunded(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE payments SET status = 'refunded' WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// GetByClub returns payments for all subscriptions in a club
func (r *PaymentRepository) GetByClub(ctx context.Context, clubID uuid.UUID, from, to time.Time, status string) ([]model.Payment, error) {
	var payments []paymentDB
	query := `
		SELECT p.* FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 AND p.created_at BETWEEN $2 AND $3`

	args := []interface{}{clubID, from, to}
	if status != "" {
		query += ` AND p.status = $4`
		args = append(args, status)
	}
	query += ` ORDER BY p.created_at DESC`

	err := r.db.SelectContext(ctx, &payments, query, args...)
	if err != nil {
		return nil, err
	}

	result := make([]model.Payment, len(payments))
	for i, p := range payments {
		result[i] = *p.toModel()
	}
	return result, nil
}

// PaymentStats for reports
type PaymentStats struct {
	TotalAmount    float64 `db:"total_amount" json:"total_amount"`
	PaymentCount   int     `db:"payment_count" json:"payment_count"`
	SucceededCount int     `db:"succeeded_count" json:"succeeded_count"`
	RefundedAmount float64 `db:"refunded_amount" json:"refunded_amount"`
}

func (r *PaymentRepository) GetStats(ctx context.Context, clubID uuid.UUID, from, to time.Time) (*PaymentStats, error) {
	var stats PaymentStats
	query := `
		SELECT 
			COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as total_amount,
			COUNT(*) as payment_count,
			COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as succeeded_count,
			COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as refunded_amount
		FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 AND p.created_at BETWEEN $2 AND $3`

	err := r.db.GetContext(ctx, &stats, query, clubID, from, to)
	return &stats, err
}

// Helper struct for DB scanning with JSONB
type paymentDB struct {
	ID                uuid.UUID  `db:"id"`
	SubscriptionID    uuid.UUID  `db:"subscription_id"`
	Amount            float64    `db:"amount"`
	Currency          string     `db:"currency"`
	Method            string     `db:"method"`
	Status            string     `db:"status"`
	ProviderPaymentID string     `db:"provider_payment_id"`
	ProviderMetadata  []byte     `db:"provider_metadata"`
	PaidAt            *time.Time `db:"paid_at"`
	CreatedAt         time.Time  `db:"created_at"`
}

func (p *paymentDB) toModel() *model.Payment {
	payment := &model.Payment{
		ID:                p.ID,
		SubscriptionID:    p.SubscriptionID,
		Amount:            p.Amount,
		Currency:          p.Currency,
		Method:            p.Method,
		Status:            p.Status,
		ProviderPaymentID: p.ProviderPaymentID,
		PaidAt:            p.PaidAt,
		CreatedAt:         p.CreatedAt,
	}
	if p.ProviderMetadata != nil {
		var metadata map[string]interface{}
		json.Unmarshal(p.ProviderMetadata, &metadata)
		payment.ProviderMetadata = metadata
	}
	return payment
}
