package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/neo/trainer-plus/internal/model"
)

type StudentRepository struct {
	db *sqlx.DB
}

func NewStudentRepository(db *sqlx.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func (r *StudentRepository) Create(ctx context.Context, student *model.Student) error {
	parentContactJSON, _ := json.Marshal(student.ParentContact)

	query := `
		INSERT INTO students (club_id, name, birth_date, parent_contact, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	return r.db.QueryRowxContext(ctx, query,
		student.ClubID,
		student.Name,
		student.BirthDate,
		parentContactJSON,
		student.Notes,
	).Scan(&student.ID, &student.CreatedAt)
}

func (r *StudentRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Student, error) {
	var student studentDB
	query := `SELECT * FROM students WHERE id = $1`

	err := r.db.GetContext(ctx, &student, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return student.toModel(), nil
}

func (r *StudentRepository) GetByClub(ctx context.Context, clubID uuid.UUID, limit, offset int) ([]model.Student, error) {
	var students []studentDB
	query := `
		SELECT * FROM students 
		WHERE club_id = $1 
		ORDER BY name
		LIMIT $2 OFFSET $3`

	err := r.db.SelectContext(ctx, &students, query, clubID, limit, offset)
	if err != nil {
		return nil, err
	}

	result := make([]model.Student, len(students))
	for i, s := range students {
		result[i] = *s.toModel()
	}
	return result, nil
}

func (r *StudentRepository) CountByClub(ctx context.Context, clubID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM students WHERE club_id = $1`
	err := r.db.GetContext(ctx, &count, query, clubID)
	return count, err
}

func (r *StudentRepository) Search(ctx context.Context, clubID uuid.UUID, searchTerm string) ([]model.Student, error) {
	var students []studentDB
	query := `
		SELECT * FROM students 
		WHERE club_id = $1 AND name ILIKE $2
		ORDER BY name
		LIMIT 50`

	err := r.db.SelectContext(ctx, &students, query, clubID, "%"+searchTerm+"%")
	if err != nil {
		return nil, err
	}

	result := make([]model.Student, len(students))
	for i, s := range students {
		result[i] = *s.toModel()
	}
	return result, nil
}

func (r *StudentRepository) Update(ctx context.Context, student *model.Student) error {
	parentContactJSON, _ := json.Marshal(student.ParentContact)

	query := `
		UPDATE students 
		SET name = $2, birth_date = $3, parent_contact = $4, notes = $5
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query,
		student.ID,
		student.Name,
		student.BirthDate,
		parentContactJSON,
		student.Notes,
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

func (r *StudentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM students WHERE id = $1`
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

// Helper struct for DB scanning with JSONB
type studentDB struct {
	model.Student
	ParentContactRaw []byte `db:"parent_contact"`
}

func (s *studentDB) toModel() *model.Student {
	if s.ParentContactRaw != nil {
		var pc model.ParentContact
		json.Unmarshal(s.ParentContactRaw, &pc)
		s.Student.ParentContact = &pc
	}
	return &s.Student
}
