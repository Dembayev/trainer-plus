package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ReportRepository struct {
	db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// FinanceReport represents financial summary
type FinanceReport struct {
	TotalPaid       float64              `json:"total_paid"`
	TotalRefunded   float64              `json:"total_refunded"`
	NetRevenue      float64              `json:"net_revenue"`
	PaymentCount    int                  `json:"payment_count"`
	AvgPayment      float64              `json:"avg_payment"`
	PaymentsByMethod []PaymentByMethod   `json:"payments_by_method"`
	PaymentsByGroup  []PaymentByGroup    `json:"payments_by_group"`
	DailyRevenue     []DailyRevenue      `json:"daily_revenue"`
}

type PaymentByMethod struct {
	Method string  `db:"method" json:"method"`
	Amount float64 `db:"amount" json:"amount"`
	Count  int     `db:"count" json:"count"`
}

type PaymentByGroup struct {
	GroupID    uuid.UUID `db:"group_id" json:"group_id"`
	GroupTitle string    `db:"group_title" json:"group_title"`
	Amount     float64   `db:"amount" json:"amount"`
	Count      int       `db:"count" json:"count"`
}

type DailyRevenue struct {
	Date   string  `db:"date" json:"date"`
	Amount float64 `db:"amount" json:"amount"`
	Count  int     `db:"count" json:"count"`
}

func (r *ReportRepository) GetFinanceReport(ctx context.Context, clubID uuid.UUID, from, to time.Time) (*FinanceReport, error) {
	report := &FinanceReport{}

	// Main summary
	summaryQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0) as total_paid,
			COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END), 0) as total_refunded,
			COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as payment_count
		FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND p.created_at BETWEEN $2 AND $3`

	var summary struct {
		TotalPaid    float64 `db:"total_paid"`
		TotalRefunded float64 `db:"total_refunded"`
		PaymentCount int     `db:"payment_count"`
	}
	if err := r.db.GetContext(ctx, &summary, summaryQuery, clubID, from, to); err != nil {
		return nil, err
	}

	report.TotalPaid = summary.TotalPaid
	report.TotalRefunded = summary.TotalRefunded
	report.NetRevenue = summary.TotalPaid - summary.TotalRefunded
	report.PaymentCount = summary.PaymentCount
	if summary.PaymentCount > 0 {
		report.AvgPayment = summary.TotalPaid / float64(summary.PaymentCount)
	}

	// By method
	methodQuery := `
		SELECT 
			COALESCE(p.method, 'unknown') as method,
			SUM(p.amount) as amount,
			COUNT(*) as count
		FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND p.status = 'succeeded'
		  AND p.created_at BETWEEN $2 AND $3
		GROUP BY p.method`

	if err := r.db.SelectContext(ctx, &report.PaymentsByMethod, methodQuery, clubID, from, to); err != nil {
		return nil, err
	}

	// By group
	groupQuery := `
		SELECT 
			g.id as group_id,
			g.title as group_title,
			COALESCE(SUM(p.amount), 0) as amount,
			COUNT(p.id) as count
		FROM groups g
		LEFT JOIN subscriptions s ON s.group_id = g.id
		LEFT JOIN payments p ON p.subscription_id = s.id 
		  AND p.status = 'succeeded'
		  AND p.created_at BETWEEN $2 AND $3
		WHERE g.club_id = $1
		GROUP BY g.id, g.title
		ORDER BY amount DESC`

	if err := r.db.SelectContext(ctx, &report.PaymentsByGroup, groupQuery, clubID, from, to); err != nil {
		return nil, err
	}

	// Daily revenue
	dailyQuery := `
		SELECT 
			TO_CHAR(p.paid_at, 'YYYY-MM-DD') as date,
			SUM(p.amount) as amount,
			COUNT(*) as count
		FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND p.status = 'succeeded'
		  AND p.paid_at BETWEEN $2 AND $3
		GROUP BY TO_CHAR(p.paid_at, 'YYYY-MM-DD')
		ORDER BY date`

	if err := r.db.SelectContext(ctx, &report.DailyRevenue, dailyQuery, clubID, from, to); err != nil {
		return nil, err
	}

	return report, nil
}

// OccupancyReport represents group fill rates
type OccupancyReport struct {
	AvgFillRate    float64              `json:"avg_fill_rate"`
	TotalSessions  int                  `json:"total_sessions"`
	TotalAttendees int                  `json:"total_attendees"`
	GroupStats     []GroupOccupancy     `json:"group_stats"`
}

type GroupOccupancy struct {
	GroupID       uuid.UUID `db:"group_id" json:"group_id"`
	GroupTitle    string    `db:"group_title" json:"group_title"`
	Capacity      int       `db:"capacity" json:"capacity"`
	SessionCount  int       `db:"session_count" json:"session_count"`
	TotalPresent  int       `db:"total_present" json:"total_present"`
	AvgFillRate   float64   `db:"avg_fill_rate" json:"avg_fill_rate"`
}

func (r *ReportRepository) GetOccupancyReport(ctx context.Context, clubID uuid.UUID, from, to time.Time) (*OccupancyReport, error) {
	report := &OccupancyReport{}

	query := `
		WITH session_attendance AS (
			SELECT 
				s.group_id,
				s.id as session_id,
				COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count
			FROM sessions s
			LEFT JOIN attendances a ON a.session_id = s.id
			WHERE s.start_at BETWEEN $2 AND $3
			GROUP BY s.group_id, s.id
		)
		SELECT 
			g.id as group_id,
			g.title as group_title,
			COALESCE(g.capacity, 1) as capacity,
			COUNT(sa.session_id) as session_count,
			COALESCE(SUM(sa.present_count), 0)::int as total_present,
			CASE 
				WHEN COUNT(sa.session_id) > 0 AND g.capacity > 0 
				THEN AVG(sa.present_count::float / g.capacity) * 100
				ELSE 0 
			END as avg_fill_rate
		FROM groups g
		LEFT JOIN session_attendance sa ON sa.group_id = g.id
		WHERE g.club_id = $1
		GROUP BY g.id, g.title, g.capacity
		ORDER BY avg_fill_rate DESC`

	if err := r.db.SelectContext(ctx, &report.GroupStats, query, clubID, from, to); err != nil {
		return nil, err
	}

	// Calculate totals
	var totalFillRate float64
	for _, gs := range report.GroupStats {
		report.TotalSessions += gs.SessionCount
		report.TotalAttendees += gs.TotalPresent
		totalFillRate += gs.AvgFillRate
	}
	if len(report.GroupStats) > 0 {
		report.AvgFillRate = totalFillRate / float64(len(report.GroupStats))
	}

	return report, nil
}

// MRRReport represents monthly recurring revenue
type MRRReport struct {
	Month           string  `json:"month"`
	Revenue         float64 `json:"revenue"`
	NewSubscriptions int    `json:"new_subscriptions"`
	ChurnedSubscriptions int `json:"churned_subscriptions"`
	ActiveSubscriptions int `json:"active_subscriptions"`
}

func (r *ReportRepository) GetMRRReport(ctx context.Context, clubID uuid.UUID, month time.Time) (*MRRReport, error) {
	report := &MRRReport{
		Month: month.Format("2006-01"),
	}

	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	// Revenue for month
	revenueQuery := `
		SELECT COALESCE(SUM(p.amount), 0)
		FROM payments p
		JOIN subscriptions s ON p.subscription_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND p.status = 'succeeded'
		  AND p.paid_at BETWEEN $2 AND $3`

	if err := r.db.GetContext(ctx, &report.Revenue, revenueQuery, clubID, startOfMonth, endOfMonth); err != nil {
		return nil, err
	}

	// New subscriptions
	newSubsQuery := `
		SELECT COUNT(*)
		FROM subscriptions s
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND s.created_at BETWEEN $2 AND $3`

	if err := r.db.GetContext(ctx, &report.NewSubscriptions, newSubsQuery, clubID, startOfMonth, endOfMonth); err != nil {
		return nil, err
	}

	// Churned (cancelled or expired) this month
	churnedQuery := `
		SELECT COUNT(*)
		FROM subscriptions s
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND s.status IN ('cancelled', 'expired', 'used')
		  AND s.expires_at BETWEEN $2 AND $3`

	if err := r.db.GetContext(ctx, &report.ChurnedSubscriptions, churnedQuery, clubID, startOfMonth, endOfMonth); err != nil {
		return nil, err
	}

	// Active subscriptions at end of month
	activeQuery := `
		SELECT COUNT(*)
		FROM subscriptions s
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND s.status = 'active'`

	if err := r.db.GetContext(ctx, &report.ActiveSubscriptions, activeQuery, clubID); err != nil {
		return nil, err
	}

	return report, nil
}

// StudentsReport represents student activity
type StudentsReport struct {
	TotalStudents       int             `json:"total_students"`
	ActiveStudents      int             `json:"active_students"`
	AvgSessionsPerStudent float64       `json:"avg_sessions_per_student"`
	TopStudents         []TopStudent    `json:"top_students"`
}

type TopStudent struct {
	StudentID    uuid.UUID `db:"student_id" json:"student_id"`
	StudentName  string    `db:"student_name" json:"student_name"`
	SessionCount int       `db:"session_count" json:"session_count"`
	PresentCount int       `db:"present_count" json:"present_count"`
	AttendanceRate float64 `db:"attendance_rate" json:"attendance_rate"`
}

func (r *ReportRepository) GetStudentsReport(ctx context.Context, clubID uuid.UUID, from, to time.Time, limit int) (*StudentsReport, error) {
	report := &StudentsReport{}

	// Total students
	totalQuery := `SELECT COUNT(*) FROM students WHERE club_id = $1`
	if err := r.db.GetContext(ctx, &report.TotalStudents, totalQuery, clubID); err != nil {
		return nil, err
	}

	// Active students (with attendance in period)
	activeQuery := `
		SELECT COUNT(DISTINCT a.student_id)
		FROM attendances a
		JOIN sessions s ON a.session_id = s.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 AND s.start_at BETWEEN $2 AND $3`

	if err := r.db.GetContext(ctx, &report.ActiveStudents, activeQuery, clubID, from, to); err != nil {
		return nil, err
	}

	// Avg sessions per student
	if report.ActiveStudents > 0 {
		avgQuery := `
			SELECT AVG(cnt)::float
			FROM (
				SELECT COUNT(*) as cnt
				FROM attendances a
				JOIN sessions s ON a.session_id = s.id
				JOIN groups g ON s.group_id = g.id
				WHERE g.club_id = $1 
				  AND s.start_at BETWEEN $2 AND $3
				  AND a.status = 'present'
				GROUP BY a.student_id
			) sub`

		if err := r.db.GetContext(ctx, &report.AvgSessionsPerStudent, avgQuery, clubID, from, to); err != nil {
			return nil, err
		}
	}

	// Top students by attendance
	topQuery := `
		SELECT 
			st.id as student_id,
			st.name as student_name,
			COUNT(a.id) as session_count,
			COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
			CASE 
				WHEN COUNT(a.id) > 0 
				THEN COUNT(CASE WHEN a.status = 'present' THEN 1 END)::float / COUNT(a.id) * 100
				ELSE 0 
			END as attendance_rate
		FROM students st
		LEFT JOIN attendances a ON a.student_id = st.id
		LEFT JOIN sessions s ON a.session_id = s.id AND s.start_at BETWEEN $2 AND $3
		WHERE st.club_id = $1
		GROUP BY st.id, st.name
		HAVING COUNT(a.id) > 0
		ORDER BY present_count DESC
		LIMIT $4`

	if err := r.db.SelectContext(ctx, &report.TopStudents, topQuery, clubID, from, to, limit); err != nil {
		return nil, err
	}

	return report, nil
}

// DebtReport represents unpaid/pending subscriptions
type DebtReport struct {
	TotalPendingAmount float64      `json:"total_pending_amount"`
	PendingCount       int          `json:"pending_count"`
	Debtors            []DebtorInfo `json:"debtors"`
}

type DebtorInfo struct {
	StudentID     uuid.UUID  `db:"student_id" json:"student_id"`
	StudentName   string     `db:"student_name" json:"student_name"`
	ParentPhone   string     `db:"parent_phone" json:"parent_phone,omitempty"`
	ParentEmail   string     `db:"parent_email" json:"parent_email,omitempty"`
	SubscriptionID uuid.UUID `db:"subscription_id" json:"subscription_id"`
	GroupTitle    string     `db:"group_title" json:"group_title"`
	Amount        float64    `db:"amount" json:"amount"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	DaysOverdue   int        `db:"days_overdue" json:"days_overdue"`
}

func (r *ReportRepository) GetDebtReport(ctx context.Context, clubID uuid.UUID, olderThanDays int) (*DebtReport, error) {
	report := &DebtReport{}

	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)

	query := `
		SELECT 
			st.id as student_id,
			st.name as student_name,
			COALESCE(st.parent_contact->>'phone', '') as parent_phone,
			COALESCE(st.parent_contact->>'email', '') as parent_email,
			s.id as subscription_id,
			g.title as group_title,
			s.price as amount,
			s.created_at,
			EXTRACT(DAY FROM NOW() - s.created_at)::int as days_overdue
		FROM subscriptions s
		JOIN students st ON s.student_id = st.id
		JOIN groups g ON s.group_id = g.id
		WHERE g.club_id = $1 
		  AND s.status = 'pending'
		  AND s.created_at < $2
		ORDER BY s.created_at ASC`

	if err := r.db.SelectContext(ctx, &report.Debtors, query, clubID, cutoffDate); err != nil {
		return nil, err
	}

	report.PendingCount = len(report.Debtors)
	for _, d := range report.Debtors {
		report.TotalPendingAmount += d.Amount
	}

	return report, nil
}

// DashboardStats for quick overview
type DashboardStats struct {
	TotalStudents       int     `json:"total_students"`
	ActiveSubscriptions int     `json:"active_subscriptions"`
	UpcomingSessions    int     `json:"upcoming_sessions"`
	TodaySessions       int     `json:"today_sessions"`
	MonthRevenue        float64 `json:"month_revenue"`
	PendingPayments     int     `json:"pending_payments"`
}

func (r *ReportRepository) GetDashboardStats(ctx context.Context, clubID uuid.UUID) (*DashboardStats, error) {
	stats := &DashboardStats{}

	// Total students
	r.db.GetContext(ctx, &stats.TotalStudents, 
		`SELECT COUNT(*) FROM students WHERE club_id = $1`, clubID)

	// Active subscriptions
	r.db.GetContext(ctx, &stats.ActiveSubscriptions,
		`SELECT COUNT(*) FROM subscriptions s 
		 JOIN groups g ON s.group_id = g.id 
		 WHERE g.club_id = $1 AND s.status = 'active'`, clubID)

	// Upcoming sessions (next 7 days)
	r.db.GetContext(ctx, &stats.UpcomingSessions,
		`SELECT COUNT(*) FROM sessions s 
		 JOIN groups g ON s.group_id = g.id 
		 WHERE g.club_id = $1 AND s.start_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'`, clubID)

	// Today's sessions
	r.db.GetContext(ctx, &stats.TodaySessions,
		`SELECT COUNT(*) FROM sessions s 
		 JOIN groups g ON s.group_id = g.id 
		 WHERE g.club_id = $1 AND DATE(s.start_at) = CURRENT_DATE`, clubID)

	// This month revenue
	startOfMonth := time.Now().UTC().Truncate(24 * time.Hour)
	startOfMonth = time.Date(startOfMonth.Year(), startOfMonth.Month(), 1, 0, 0, 0, 0, time.UTC)
	r.db.GetContext(ctx, &stats.MonthRevenue,
		`SELECT COALESCE(SUM(p.amount), 0) FROM payments p
		 JOIN subscriptions s ON p.subscription_id = s.id
		 JOIN groups g ON s.group_id = g.id
		 WHERE g.club_id = $1 AND p.status = 'succeeded' AND p.paid_at >= $2`, 
		clubID, startOfMonth)

	// Pending payments
	r.db.GetContext(ctx, &stats.PendingPayments,
		`SELECT COUNT(*) FROM payments p
		 JOIN subscriptions s ON p.subscription_id = s.id
		 JOIN groups g ON s.group_id = g.id
		 WHERE g.club_id = $1 AND p.status = 'pending'`, clubID)

	return stats, nil
}
