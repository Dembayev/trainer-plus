package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	Email        string     `db:"email" json:"email"`
	PasswordHash string     `db:"password_hash" json:"-"`
	Name         string     `db:"name" json:"name"`
	Role         string     `db:"role" json:"role"`
	Phone        *string    `db:"phone" json:"phone,omitempty"`
	City         *string    `db:"city" json:"city,omitempty"`
	Bio          *string    `db:"bio" json:"bio,omitempty"`
	Company      *string    `db:"company" json:"company,omitempty"`
	Website      *string    `db:"website" json:"website,omitempty"`
	Avatar       *string    `db:"avatar" json:"avatar,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	LastLogin    *time.Time `db:"last_login" json:"last_login,omitempty"`
}

type UserRole string

const (
	RoleOwner UserRole = "owner"
	RoleCoach UserRole = "coach"
	RoleAdmin UserRole = "admin"
)

type Club struct {
	ID          uuid.UUID `db:"id" json:"id"`
	OwnerUserID uuid.UUID `db:"owner_user_id" json:"owner_user_id"`
	Name        string    `db:"name" json:"name"`
	Address     string    `db:"address" json:"address,omitempty"`
	Phone       string    `db:"phone" json:"phone,omitempty"`
	Currency    string    `db:"currency" json:"currency"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type Group struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	ClubID      uuid.UUID  `db:"club_id" json:"club_id"`
	Title       string     `db:"title" json:"title"`
	Sport       string     `db:"sport" json:"sport,omitempty"`
	Capacity    int        `db:"capacity" json:"capacity,omitempty"`
	Price       float64    `db:"price" json:"price"`
	Description string     `db:"description" json:"description,omitempty"`
	CoachUserID *uuid.UUID `db:"coach_user_id" json:"coach_user_id,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
}

type Session struct {
	ID              uuid.UUID `db:"id" json:"id"`
	GroupID         uuid.UUID `db:"group_id" json:"group_id"`
	StartAt         time.Time `db:"start_at" json:"start_at"`
	DurationMinutes int       `db:"duration_minutes" json:"duration_minutes"`
	Location        string    `db:"location" json:"location,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

type Student struct {
	ID            uuid.UUID      `db:"id" json:"id"`
	ClubID        uuid.UUID      `db:"club_id" json:"club_id"`
	Name          string         `db:"name" json:"name"`
	BirthDate     *time.Time     `db:"birth_date" json:"birth_date,omitempty"`
	ParentContact *ParentContact `db:"parent_contact" json:"parent_contact,omitempty"`
	Notes         string         `db:"notes" json:"notes,omitempty"`
	CreatedAt     time.Time      `db:"created_at" json:"created_at"`
}

type ParentContact struct {
	Name  string `json:"name,omitempty"`
	Phone string `json:"phone,omitempty"`
	Email string `json:"email,omitempty"`
}

type Subscription struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	StudentID         uuid.UUID  `db:"student_id" json:"student_id"`
	GroupID           uuid.UUID  `db:"group_id" json:"group_id"`
	TotalSessions     int        `db:"total_sessions" json:"total_sessions"`
	RemainingSessions int        `db:"remaining_sessions" json:"remaining_sessions"`
	Price             float64    `db:"price" json:"price"`
	StartsAt          *time.Time `db:"starts_at" json:"starts_at,omitempty"`
	ExpiresAt         *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	Status            string     `db:"status" json:"status"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
}

type SubscriptionStatus string

const (
	SubscriptionPending   SubscriptionStatus = "pending"
	SubscriptionActive    SubscriptionStatus = "active"
	SubscriptionUsed      SubscriptionStatus = "used"
	SubscriptionExpired   SubscriptionStatus = "expired"
	SubscriptionCancelled SubscriptionStatus = "cancelled"
)

type Attendance struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	SessionID      uuid.UUID  `db:"session_id" json:"session_id"`
	StudentID      uuid.UUID  `db:"student_id" json:"student_id"`
	SubscriptionID *uuid.UUID `db:"subscription_id" json:"subscription_id,omitempty"`
	Status         string     `db:"status" json:"status"`
	NotedBy        uuid.UUID  `db:"noted_by" json:"noted_by,omitempty"`
	NotedAt        time.Time  `db:"noted_at" json:"noted_at"`
}

type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "present"
	AttendanceAbsent  AttendanceStatus = "absent"
	AttendanceExcused AttendanceStatus = "excused"
)

type Payment struct {
	ID                uuid.UUID              `db:"id" json:"id"`
	SubscriptionID    uuid.UUID              `db:"subscription_id" json:"subscription_id"`
	Amount            float64                `db:"amount" json:"amount"`
	Currency          string                 `db:"currency" json:"currency"`
	Method            string                 `db:"method" json:"method"`
	Status            string                 `db:"status" json:"status"`
	ProviderPaymentID string                 `db:"provider_payment_id" json:"provider_payment_id,omitempty"`
	ProviderMetadata  map[string]interface{} `db:"-" json:"provider_metadata,omitempty"`
	PaidAt            *time.Time             `db:"paid_at" json:"paid_at,omitempty"`
	CreatedAt         time.Time              `db:"created_at" json:"created_at"`
}

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "pending"
	PaymentSucceeded PaymentStatus = "succeeded"
	PaymentFailed    PaymentStatus = "failed"
	PaymentRefunded  PaymentStatus = "refunded"
)

type PaymentMethod string

const (
	PaymentStripe PaymentMethod = "stripe"
	PaymentCash   PaymentMethod = "cash"
	PaymentManual PaymentMethod = "manual"
)
