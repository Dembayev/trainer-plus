package handler

// ==================== Club DTOs ====================

type CreateClubRequest struct {
	Name     string `json:"name" validate:"required,min=3,max=100"`
	Address  string `json:"address" validate:"omitempty,max=255"`
	Phone    string `json:"phone" validate:"omitempty,max=20"`
	Currency string `json:"currency" validate:"required,currency"`
}

type UpdateClubRequest struct {
	Name     *string `json:"name" validate:"omitempty,min=3,max=100"`
	Address  *string `json:"address" validate:"omitempty,max=255"`
	Phone    *string `json:"phone" validate:"omitempty,max=20"`
	Currency *string `json:"currency" validate:"omitempty,currency"`
}

// ==================== Group DTOs ====================

type CreateGroupRequest struct {
	ClubID      string  `json:"club_id" validate:"required,uuid4"`
	Title       string  `json:"title" validate:"required,min=2,max=100"`
	Sport       string  `json:"sport" validate:"omitempty,max=50"`
	Capacity    int     `json:"capacity" validate:"omitempty,gte=1,lte=1000"`
	Price       float64 `json:"price" validate:"omitempty,gte=0"`
	Description string  `json:"description" validate:"omitempty,max=500"`
	CoachUserID string  `json:"coach_user_id" validate:"omitempty,uuid4"`
}

type UpdateGroupRequest struct {
	Title       *string  `json:"title" validate:"omitempty,min=2,max=100"`
	Sport       *string  `json:"sport" validate:"omitempty,max=50"`
	Capacity    *int     `json:"capacity" validate:"omitempty,gte=1,lte=1000"`
	Price       *float64 `json:"price" validate:"omitempty,gte=0"`
	Description *string  `json:"description" validate:"omitempty,max=500"`
	CoachUserID *string  `json:"coach_user_id" validate:"omitempty,uuid4"`
}

// ==================== Session DTOs ====================

type CreateSessionRequest struct {
	StartAt         string `json:"start_at" validate:"required"`
	DurationMinutes int    `json:"duration_minutes" validate:"required,gte=15,lte=480"`
	Location        string `json:"location" validate:"omitempty,max=255"`
}

type CreateRecurringSessionsRequest struct {
	StartTime       string `json:"start_time" validate:"required"`         // "18:00"
	Weekdays        []int  `json:"weekdays" validate:"required,min=1"`     // [1,3,5] = Mon,Wed,Fri
	FromDate        string `json:"from_date" validate:"required"`          // "2025-12-01"
	ToDate          string `json:"to_date" validate:"required"`            // "2026-02-28"
	DurationMinutes int    `json:"duration_minutes" validate:"required,gte=15,lte=480"`
	Location        string `json:"location" validate:"omitempty,max=255"`
}

// ==================== Student DTOs ====================

type CreateStudentRequest struct {
	ClubID        string                `json:"club_id" validate:"required,uuid4"`
	Name          string                `json:"name" validate:"required,min=2,max=100"`
	BirthDate     string                `json:"birth_date" validate:"omitempty"`
	ParentContact *ParentContactRequest `json:"parent_contact" validate:"omitempty"`
	Notes         string                `json:"notes" validate:"omitempty,max=1000"`
}

type UpdateStudentRequest struct {
	Name          *string               `json:"name" validate:"omitempty,min=2,max=100"`
	BirthDate     *string               `json:"birth_date" validate:"omitempty"`
	ParentContact *ParentContactRequest `json:"parent_contact" validate:"omitempty"`
	Notes         *string               `json:"notes" validate:"omitempty,max=1000"`
}

type ParentContactRequest struct {
	Name  string `json:"name" validate:"omitempty,max=100"`
	Phone string `json:"phone" validate:"omitempty,max=20"`
	Email string `json:"email" validate:"omitempty,email"`
}

// ==================== Subscription DTOs ====================

type CreateSubscriptionRequest struct {
	StudentID     string  `json:"student_id" validate:"required,uuid4"`
	GroupID       string  `json:"group_id" validate:"required,uuid4"`
	TotalSessions int     `json:"total_sessions" validate:"required,gte=1,lte=100"`
	Price         float64 `json:"price" validate:"required,gte=0"`
	StartsAt      string  `json:"starts_at" validate:"omitempty"`
	ExpiresAt     string  `json:"expires_at" validate:"omitempty"`
}

// ==================== Attendance DTOs ====================

type MarkAttendanceRequest struct {
	SessionID string `json:"session_id" validate:"required,uuid4"`
	StudentID string `json:"student_id" validate:"required,uuid4"`
	Status    string `json:"status" validate:"required,oneof=present absent excused"`
}

type BulkAttendanceRequest struct {
	SessionID   string                     `json:"session_id" validate:"required,uuid4"`
	Attendances []BulkAttendanceItemRequest `json:"attendances" validate:"required,min=1"`
}

type BulkAttendanceItemRequest struct {
	StudentID string `json:"student_id" validate:"required,uuid4"`
	Status    string `json:"status" validate:"required,oneof=present absent excused"`
}

// ==================== Pagination ====================

type PaginationParams struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}

func (p *PaginationParams) GetOffset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	return (p.Page - 1) * p.GetLimit()
}

func (p *PaginationParams) GetLimit() int {
	if p.PerPage < 1 {
		p.PerPage = 20
	}
	if p.PerPage > 100 {
		p.PerPage = 100
	}
	return p.PerPage
}
