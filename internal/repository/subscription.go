package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/neo/trainer-plus/internal/model"
)

type SubscriptionRepository struct {
	db *sqlx.DB
}

func NewSubscriptionRepository(db *sqlx.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

func (r *SubscriptionRepository) Create(ctx context.Context, sub *model.Subscription) error {
	query := `
		INSERT INTO subscriptions (student_id, group_id, total_sessions, remaining_sessions, price, starts_at, expires_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		sub.StudentID,
		sub.GroupID,
		sub.TotalSessions,
		sub.RemainingSessions,
		sub.Price,
		sub.StartsAt,
		sub.ExpiresAt,
		sub.Status,
	).Scan(&sub.ID, &sub.CreatedAt)
}

func (r *SubscriptionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Subscription, error) {
	var sub model.Subscription
	query := `SELECT * FROM subscriptions WHERE id = $1`

	err := r.db.GetContext(ctx, &sub, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &sub, err
}

func (r *SubscriptionRepository) GetByStudent(ctx context.Context, studentID uuid.UUID) ([]model.Subscription, error) {
	var subs []model.Subscription
	query := `
		SELECT * FROM subscriptions 
		WHERE student_id = $1 
		ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &subs, query, studentID)
	return subs, err
}

func (r *SubscriptionRepository) GetActiveByStudentAndGroup(ctx context.Context, studentID, groupID uuid.UUID) (*model.Subscription, error) {
	var sub model.Subscription
	query := `
		SELECT * FROM subscriptions 
		WHERE student_id = $1 
		  AND group_id = $2 
		  AND status = 'active' 
		  AND remaining_sessions > 0
		ORDER BY starts_at ASC NULLS LAST
		LIMIT 1`

	err := r.db.GetContext(ctx, &sub, query, studentID, groupID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &sub, err
}

// FindActiveForAttendance finds and locks a subscription for attendance marking
// Must be called within a transaction
func (r *SubscriptionRepository) FindActiveForAttendance(ctx context.Context, tx *sqlx.Tx, studentID, groupID uuid.UUID, sessionTime time.Time) (*model.Subscription, error) {
	var sub model.Subscription
	query := `
		SELECT * FROM subscriptions 
		WHERE student_id = $1 
		  AND group_id = $2 
		  AND status = 'active' 
		  AND remaining_sessions > 0
		  AND (starts_at IS NULL OR starts_at <= $3)
		  AND (expires_at IS NULL OR expires_at >= $3)
		ORDER BY starts_at ASC NULLS LAST
		LIMIT 1
		FOR UPDATE`

	err := tx.GetContext(ctx, &sub, query, studentID, groupID, sessionTime)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &sub, err
}

func (r *SubscriptionRepository) Update(ctx context.Context, sub *model.Subscription) error {
	query := `
		UPDATE subscriptions 
		SET total_sessions = $2, remaining_sessions = $3, price = $4, 
		    starts_at = $5, expires_at = $6, status = $7
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		sub.ID,
		sub.TotalSessions,
		sub.RemainingSessions,
		sub.Price,
		sub.StartsAt,
		sub.ExpiresAt,
		sub.Status,
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

// DecrementRemainingSessions atomically decrements remaining sessions and updates status if needed
// Must be called within a transaction
func (r *SubscriptionRepository) DecrementRemainingSessions(ctx context.Context, tx *sqlx.Tx, subID uuid.UUID) error {
	// First decrement
	query := `
		UPDATE subscriptions 
		SET remaining_sessions = remaining_sessions - 1
		WHERE id = $1 AND remaining_sessions > 0
		RETURNING remaining_sessions`

	var remaining int
	err := tx.QueryRowxContext(ctx, query, subID).Scan(&remaining)
	if err != nil {
		return err
	}

	// If remaining is now 0, mark as used
	if remaining == 0 {
		_, err = tx.ExecContext(ctx, `UPDATE subscriptions SET status = 'used' WHERE id = $1`, subID)
		return err
	}

	return nil
}

func (r *SubscriptionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE subscriptions SET status = $2 WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id, status)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SubscriptionRepository) Activate(ctx context.Context, id uuid.UUID, startsAt, expiresAt *time.Time) error {
	query := `
		UPDATE subscriptions 
		SET status = 'active', starts_at = COALESCE($2, starts_at, now()), expires_at = $3
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id, startsAt, expiresAt)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SubscriptionRepository) GetByGroup(ctx context.Context, groupID uuid.UUID, status string) ([]model.Subscription, error) {
	var subs []model.Subscription
	var query string
	var args []interface{}

	if status != "" {
		query = `SELECT * FROM subscriptions WHERE group_id = $1 AND status = $2 ORDER BY created_at DESC`
		args = []interface{}{groupID, status}
	} else {
		query = `SELECT * FROM subscriptions WHERE group_id = $1 ORDER BY created_at DESC`
		args = []interface{}{groupID}
	}

	err := r.db.SelectContext(ctx, &subs, query, args...)
	return subs, err
}

// BeginTx starts a new transaction
func (r *SubscriptionRepository) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	return r.db.BeginTxx(ctx, nil)
}

// SubscriptionWithDetails includes student and group info
type SubscriptionWithDetails struct {
	model.Subscription
	StudentName string `db:"student_name" json:"student_name"`
	GroupTitle  string `db:"group_title" json:"group_title"`
}

func (r *SubscriptionRepository) GetByClubWithDetails(ctx context.Context, clubID uuid.UUID, status string) ([]SubscriptionWithDetails, error) {
	var subs []SubscriptionWithDetails
	query := `
		SELECT s.*, st.name as student_name, g.title as group_title
		FROM subscriptions s
		JOIN students st ON s.student_id = st.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1`

	args := []interface{}{clubID}
	if status != "" {
		query += ` AND s.status = $2`
		args = append(args, status)
	}
	query += ` ORDER BY s.created_at DESC`

	err := r.db.SelectContext(ctx, &subs, query, args...)
	return subs, err
}
