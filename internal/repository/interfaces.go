package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/model"
)

// ClubRepositoryInterface defines the contract for club repository
type ClubRepositoryInterface interface {
	Create(ctx context.Context, club *model.Club) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Club, error)
	GetByOwner(ctx context.Context, ownerID uuid.UUID) ([]model.Club, error)
	Update(ctx context.Context, club *model.Club) error
	Delete(ctx context.Context, id uuid.UUID) error
	IsOwner(ctx context.Context, clubID, userID uuid.UUID) (bool, error)
}

// GroupRepositoryInterface defines the contract for group repository
type GroupRepositoryInterface interface {
	Create(ctx context.Context, group *model.Group) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Group, error)
	GetByClub(ctx context.Context, clubID uuid.UUID) ([]model.Group, error)
	GetByCoach(ctx context.Context, coachID uuid.UUID) ([]model.Group, error)
	GetByClubWithStats(ctx context.Context, clubID uuid.UUID) ([]GroupWithStats, error)
	Update(ctx context.Context, group *model.Group) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// SessionRepositoryInterface defines the contract for session repository
type SessionRepositoryInterface interface {
	Create(ctx context.Context, session *model.Session) error
	CreateBatch(ctx context.Context, sessions []model.Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Session, error)
	GetByGroup(ctx context.Context, groupID uuid.UUID, from, to time.Time) ([]model.Session, error)
	GetUpcoming(ctx context.Context, groupID uuid.UUID, limit int) ([]model.Session, error)
	GetByClubDateRange(ctx context.Context, clubID uuid.UUID, from, to time.Time) ([]model.Session, error)
	Update(ctx context.Context, session *model.Session) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteFutureSessions(ctx context.Context, groupID uuid.UUID, after time.Time) (int64, error)
}

// StudentRepositoryInterface defines the contract for student repository
type StudentRepositoryInterface interface {
	Create(ctx context.Context, student *model.Student) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Student, error)
	GetByClub(ctx context.Context, clubID uuid.UUID, limit, offset int) ([]model.Student, error)
	CountByClub(ctx context.Context, clubID uuid.UUID) (int, error)
	Search(ctx context.Context, clubID uuid.UUID, searchTerm string) ([]model.Student, error)
	Update(ctx context.Context, student *model.Student) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// UserRepositoryInterface defines the contract for user repository
type UserRepositoryInterface interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	EmailExists(ctx context.Context, email string) (bool, error)
}

// Ensure implementations satisfy interfaces
var _ ClubRepositoryInterface = (*ClubRepository)(nil)
var _ GroupRepositoryInterface = (*GroupRepository)(nil)
var _ SessionRepositoryInterface = (*SessionRepository)(nil)
var _ StudentRepositoryInterface = (*StudentRepository)(nil)
var _ UserRepositoryInterface = (*UserRepository)(nil)
