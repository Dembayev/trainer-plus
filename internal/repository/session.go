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

type SessionRepository struct {
	db *sqlx.DB
}

func NewSessionRepository(db *sqlx.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, session *model.Session) error {
	query := `
		INSERT INTO sessions (group_id, start_at, duration_minutes, location)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		session.GroupID,
		session.StartAt,
		session.DurationMinutes,
		session.Location,
	).Scan(&session.ID, &session.CreatedAt)
}

func (r *SessionRepository) CreateBatch(ctx context.Context, sessions []model.Session) error {
	query := `
		INSERT INTO sessions (group_id, start_at, duration_minutes, location)
		VALUES (:group_id, :start_at, :duration_minutes, :location)`

	_, err := r.db.NamedExecContext(ctx, query, sessions)
	return err
}

func (r *SessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error) {
	var session model.Session
	query := `SELECT * FROM sessions WHERE id = $1`

	err := r.db.GetContext(ctx, &session, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &session, err
}

func (r *SessionRepository) GetByGroup(ctx context.Context, groupID uuid.UUID, from, to time.Time) ([]model.Session, error) {
	var sessions []model.Session
	query := `
		SELECT * FROM sessions 
		WHERE group_id = $1 AND start_at BETWEEN $2 AND $3 
		ORDER BY start_at`

	err := r.db.SelectContext(ctx, &sessions, query, groupID, from, to)
	return sessions, err
}

func (r *SessionRepository) GetUpcoming(ctx context.Context, groupID uuid.UUID, limit int) ([]model.Session, error) {
	var sessions []model.Session
	query := `
		SELECT * FROM sessions 
		WHERE group_id = $1 AND start_at > $2 
		ORDER BY start_at
		LIMIT $3`

	err := r.db.SelectContext(ctx, &sessions, query, groupID, time.Now(), limit)
	return sessions, err
}

func (r *SessionRepository) GetByClubDateRange(ctx context.Context, clubID uuid.UUID, from, to time.Time) ([]model.Session, error) {
	var sessions []model.Session
	query := `
		SELECT s.* FROM sessions s
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 AND s.start_at BETWEEN $2 AND $3
		ORDER BY s.start_at`

	err := r.db.SelectContext(ctx, &sessions, query, clubID, from, to)
	return sessions, err
}

func (r *SessionRepository) Update(ctx context.Context, session *model.Session) error {
	query := `
		UPDATE sessions 
		SET start_at = $2, duration_minutes = $3, location = $4
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		session.ID,
		session.StartAt,
		session.DurationMinutes,
		session.Location,
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

func (r *SessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SessionRepository) DeleteFutureSessions(ctx context.Context, groupID uuid.UUID, after time.Time) (int64, error) {
	query := `DELETE FROM sessions WHERE group_id = $1 AND start_at > $2`
	result, err := r.db.ExecContext(ctx, query, groupID, after)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
