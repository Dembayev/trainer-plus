package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/neo/trainer-plus/internal/model"
)

type ClubRepository struct {
	db *sqlx.DB
}

func NewClubRepository(db *sqlx.DB) *ClubRepository {
	return &ClubRepository{db: db}
}

func (r *ClubRepository) Create(ctx context.Context, club *model.Club) error {
	query := `
		INSERT INTO clubs (owner_user_id, name, address, phone, currency)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		club.OwnerUserID,
		club.Name,
		club.Address,
		club.Phone,
		club.Currency,
	).Scan(&club.ID, &club.CreatedAt)
}

func (r *ClubRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Club, error) {
	var club model.Club
	query := `SELECT * FROM clubs WHERE id = $1`

	err := r.db.GetContext(ctx, &club, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &club, err
}

func (r *ClubRepository) GetByOwner(ctx context.Context, ownerID uuid.UUID) ([]model.Club, error) {
	var clubs []model.Club
	query := `SELECT * FROM clubs WHERE owner_user_id = $1 ORDER BY created_at DESC`

	err := r.db.SelectContext(ctx, &clubs, query, ownerID)
	return clubs, err
}

func (r *ClubRepository) Update(ctx context.Context, club *model.Club) error {
	query := `
		UPDATE clubs 
		SET name = $2, address = $3, phone = $4, currency = $5
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		club.ID,
		club.Name,
		club.Address,
		club.Phone,
		club.Currency,
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

func (r *ClubRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM clubs WHERE id = $1`
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

func (r *ClubRepository) IsOwner(ctx context.Context, clubID, userID uuid.UUID) (bool, error) {
	var isOwner bool
	query := `SELECT EXISTS(SELECT 1 FROM clubs WHERE id = $1 AND owner_user_id = $2)`
	err := r.db.GetContext(ctx, &isOwner, query, clubID, userID)
	return isOwner, err
}
