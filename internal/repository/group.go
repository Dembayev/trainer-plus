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

type GroupRepository struct {
	db *sqlx.DB
}

func NewGroupRepository(db *sqlx.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) Create(ctx context.Context, group *model.Group) error {
	query := `
		INSERT INTO groups (club_id, title, sport, capacity, price, description, coach_user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		group.ClubID,
		group.Title,
		group.Sport,
		group.Capacity,
		group.Price,
		group.Description,
		group.CoachUserID,
	).Scan(&group.ID, &group.CreatedAt)
}

func (r *GroupRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Group, error) {
	var group model.Group
	query := `SELECT * FROM groups WHERE id = $1`

	err := r.db.GetContext(ctx, &group, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &group, err
}

func (r *GroupRepository) GetByClub(ctx context.Context, clubID uuid.UUID) ([]model.Group, error) {
	var groups []model.Group
	query := `SELECT * FROM groups WHERE club_id = $1 ORDER BY title`

	err := r.db.SelectContext(ctx, &groups, query, clubID)
	return groups, err
}

func (r *GroupRepository) GetByCoach(ctx context.Context, coachID uuid.UUID) ([]model.Group, error) {
	var groups []model.Group
	query := `SELECT * FROM groups WHERE coach_user_id = $1 ORDER BY title`

	err := r.db.SelectContext(ctx, &groups, query, coachID)
	return groups, err
}

func (r *GroupRepository) Update(ctx context.Context, group *model.Group) error {
	query := `
		UPDATE groups 
		SET title = $2, sport = $3, capacity = $4, price = $5, description = $6, coach_user_id = $7
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		group.ID,
		group.Title,
		group.Sport,
		group.Capacity,
		group.Price,
		group.Description,
		group.CoachUserID,
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

func (r *GroupRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM groups WHERE id = $1`
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

// GroupWithStats includes additional computed fields
type GroupWithStats struct {
	model.Group
	StudentCount  int `db:"student_count" json:"student_count"`
	SessionsCount int `db:"sessions_count" json:"sessions_count"`
}

func (r *GroupRepository) GetByClubWithStats(ctx context.Context, clubID uuid.UUID) ([]GroupWithStats, error) {
	var groups []GroupWithStats
	query := `
		SELECT 
			g.*,
			(SELECT COUNT(DISTINCT s.student_id) FROM subscriptions s WHERE s.group_id = g.id AND s.status = 'active') as student_count,
			(SELECT COUNT(*) FROM sessions ses WHERE ses.group_id = g.id AND ses.start_at > $2) as sessions_count
		FROM groups g
		WHERE g.club_id = $1
		ORDER BY g.title`

	err := r.db.SelectContext(ctx, &groups, query, clubID, time.Now())
	return groups, err
}
