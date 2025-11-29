package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/neo/trainer-plus/internal/model"
)

type AttendanceRepository struct {
	db *sqlx.DB
}

func NewAttendanceRepository(db *sqlx.DB) *AttendanceRepository {
	return &AttendanceRepository{db: db}
}

func (r *AttendanceRepository) Create(ctx context.Context, att *model.Attendance) error {
	query := `
		INSERT INTO attendances (session_id, student_id, subscription_id, status, noted_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, noted_at`

	return r.db.QueryRowxContext(ctx, query,
		att.SessionID,
		att.StudentID,
		att.SubscriptionID,
		att.Status,
		att.NotedBy,
	).Scan(&att.ID, &att.NotedAt)
}

// CreateInTx creates attendance within a transaction
func (r *AttendanceRepository) CreateInTx(ctx context.Context, tx *sqlx.Tx, att *model.Attendance) error {
	query := `
		INSERT INTO attendances (session_id, student_id, subscription_id, status, noted_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, noted_at`

	return tx.QueryRowxContext(ctx, query,
		att.SessionID,
		att.StudentID,
		att.SubscriptionID,
		att.Status,
		att.NotedBy,
	).Scan(&att.ID, &att.NotedAt)
}

func (r *AttendanceRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Attendance, error) {
	var att model.Attendance
	query := `SELECT * FROM attendances WHERE id = $1`

	err := r.db.GetContext(ctx, &att, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &att, err
}

func (r *AttendanceRepository) GetBySession(ctx context.Context, sessionID uuid.UUID) ([]model.Attendance, error) {
	var attendances []model.Attendance
	query := `SELECT * FROM attendances WHERE session_id = $1 ORDER BY noted_at`

	err := r.db.SelectContext(ctx, &attendances, query, sessionID)
	return attendances, err
}

func (r *AttendanceRepository) GetByStudent(ctx context.Context, studentID uuid.UUID, limit int) ([]model.Attendance, error) {
	var attendances []model.Attendance
	query := `
		SELECT * FROM attendances 
		WHERE student_id = $1 
		ORDER BY noted_at DESC
		LIMIT $2`

	err := r.db.SelectContext(ctx, &attendances, query, studentID, limit)
	return attendances, err
}

func (r *AttendanceRepository) Update(ctx context.Context, att *model.Attendance) error {
	query := `
		UPDATE attendances 
		SET status = $2, noted_by = $3, noted_at = now()
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, att.ID, att.Status, att.NotedBy)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AttendanceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM attendances WHERE id = $1`
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

// Exists checks if attendance already exists for session+student
func (r *AttendanceRepository) Exists(ctx context.Context, sessionID, studentID uuid.UUID) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM attendances WHERE session_id = $1 AND student_id = $2)`
	err := r.db.GetContext(ctx, &exists, query, sessionID, studentID)
	return exists, err
}

// AttendanceWithDetails includes student info
type AttendanceWithDetails struct {
	model.Attendance
	StudentName string `db:"student_name" json:"student_name"`
}

func (r *AttendanceRepository) GetBySessionWithDetails(ctx context.Context, sessionID uuid.UUID) ([]AttendanceWithDetails, error) {
	var attendances []AttendanceWithDetails
	query := `
		SELECT a.*, s.name as student_name
		FROM attendances a
		JOIN students s ON a.student_id = s.id
		WHERE a.session_id = $1
		ORDER BY s.name`

	err := r.db.SelectContext(ctx, &attendances, query, sessionID)
	return attendances, err
}

// AttendanceStats for reports
type AttendanceStats struct {
	TotalSessions   int     `db:"total_sessions" json:"total_sessions"`
	TotalAttendance int     `db:"total_attendance" json:"total_attendance"`
	PresentCount    int     `db:"present_count" json:"present_count"`
	AbsentCount     int     `db:"absent_count" json:"absent_count"`
	ExcusedCount    int     `db:"excused_count" json:"excused_count"`
	AttendanceRate  float64 `json:"attendance_rate"`
}

func (r *AttendanceRepository) GetStatsByGroup(ctx context.Context, groupID uuid.UUID) (*AttendanceStats, error) {
	var stats AttendanceStats
	query := `
		SELECT 
			(SELECT COUNT(*) FROM sessions WHERE group_id = $1) as total_sessions,
			COUNT(*) as total_attendance,
			COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
			COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
			COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
		FROM attendances a
		JOIN sessions s ON a.session_id = s.id
		WHERE s.group_id = $1`

	err := r.db.GetContext(ctx, &stats, query, groupID)
	if err != nil {
		return nil, err
	}

	if stats.TotalAttendance > 0 {
		stats.AttendanceRate = float64(stats.PresentCount) / float64(stats.TotalAttendance) * 100
	}
	return &stats, nil
}

// BeginTx starts a new transaction
func (r *AttendanceRepository) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	return r.db.BeginTxx(ctx, nil)
}
