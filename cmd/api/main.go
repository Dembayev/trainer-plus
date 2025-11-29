package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"github.com/neo/trainer-plus/internal/config"
	"github.com/neo/trainer-plus/internal/handler"
	"github.com/neo/trainer-plus/internal/middleware"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/internal/service"
	"github.com/neo/trainer-plus/internal/validator"
	"github.com/neo/trainer-plus/pkg/jwt"
)

func main() {
	// Logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load config
	cfg := config.Load()

	// Database
	db, err := sqlx.Connect("postgres", cfg.Database.URL)
	if err != nil {
		logger.Error("failed to connect to database", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger.Info("connected to database")

	// JWT Manager
	jwtManager := jwt.NewManager(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)

	// Validator
	validate := validator.New()

	// Repositories
	userRepo := repository.NewUserRepository(db)
	clubRepo := repository.NewClubRepository(db)
	groupRepo := repository.NewGroupRepository(db)
	sessionRepo := repository.NewSessionRepository(db)
	studentRepo := repository.NewStudentRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	paymentRepo := repository.NewPaymentRepository(db)
	attendanceRepo := repository.NewAttendanceRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// Services
	authService := service.NewAuthService(userRepo, jwtManager)

	// Handlers
	healthHandler := handler.NewHealthHandler()
	authHandler := handler.NewAuthHandler(authService)
	clubHandler := handler.NewClubHandler(clubRepo, validate)
	groupHandler := handler.NewGroupHandler(groupRepo, clubRepo, validate)
	sessionHandler := handler.NewSessionHandler(sessionRepo, groupRepo, clubRepo, validate)
	studentHandler := handler.NewStudentHandler(studentRepo, clubRepo, validate)
	publicHandler := handler.NewPublicHandler(clubRepo, groupRepo, sessionRepo)
	subscriptionHandler := handler.NewSubscriptionHandler(subscriptionRepo, studentRepo, groupRepo, clubRepo, validate)
	attendanceHandler := handler.NewAttendanceHandler(attendanceRepo, subscriptionRepo, sessionRepo, groupRepo, clubRepo, validate)
	paymentHandler := handler.NewPaymentHandler(paymentRepo, subscriptionRepo, studentRepo, groupRepo, clubRepo, validate, logger)
	reportHandler := handler.NewReportHandler(reportRepo, clubRepo)

	// Router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(middleware.Recover(logger))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.CORSFromConfig(cfg.Server.FrontendURL))
	r.Use(chimw.Compress(5))

	// Rate limiter (100 requests per minute per IP)
	rateLimiter := middleware.NewRateLimiter(100, time.Minute)
	r.Use(rateLimiter.Middleware())

	// Health routes
	r.Get("/health", healthHandler.Health)
	r.Get("/ready", healthHandler.Ready)

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/signup", authHandler.Signup)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
		})

		// Payments - public checkout endpoint
		r.Post("/payments/create-checkout-session", paymentHandler.CreateCheckoutSession)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtManager))

			// Auth
			r.Get("/auth/me", authHandler.Me)

			// Clubs
			r.Route("/clubs", func(r chi.Router) {
				r.Post("/", clubHandler.Create)
				r.Get("/", clubHandler.List)
				r.Get("/{id}", clubHandler.GetByID)
				r.Put("/{id}", clubHandler.Update)
				r.Delete("/{id}", clubHandler.Delete)

				// Nested: groups by club
				r.Get("/{club_id}/groups", groupHandler.ListByClub)

				// Nested: students by club
				r.Get("/{club_id}/students", studentHandler.ListByClub)
				r.Get("/{club_id}/students/search", studentHandler.Search)

				// Nested: subscriptions by club
				r.Get("/{club_id}/subscriptions", subscriptionHandler.ListByClub)

				// Nested: dashboard & reports by club
				r.Get("/{club_id}/dashboard", reportHandler.Dashboard)
				r.Route("/{club_id}/reports", func(r chi.Router) {
					r.Get("/finance", reportHandler.Finance)
					r.Get("/occupancy", reportHandler.Occupancy)
					r.Get("/mrr", reportHandler.MRR)
					r.Get("/students", reportHandler.Students)
					r.Get("/debt", reportHandler.Debt)
				})
			})

			// Groups
			r.Route("/groups", func(r chi.Router) {
				r.Post("/", groupHandler.Create)
				r.Get("/{id}", groupHandler.GetByID)
				r.Put("/{id}", groupHandler.Update)
				r.Delete("/{id}", groupHandler.Delete)

				// Nested: sessions by group
				r.Post("/{group_id}/sessions", sessionHandler.Create)
				r.Post("/{group_id}/sessions/recurring", sessionHandler.CreateRecurring)
				r.Get("/{group_id}/sessions", sessionHandler.ListByGroup)

				// Nested: subscriptions by group
				r.Get("/{group_id}/subscriptions", subscriptionHandler.ListByGroup)

				// Nested: attendance stats
				r.Get("/{group_id}/attendance/stats", attendanceHandler.GetStats)
			})

			// Sessions
			r.Route("/sessions", func(r chi.Router) {
				r.Get("/{id}", sessionHandler.GetByID)
				r.Put("/{id}", sessionHandler.Update)
				r.Delete("/{id}", sessionHandler.Delete)

				// Nested: attendance by session
				r.Get("/{session_id}/attendance", attendanceHandler.GetBySession)
			})

			// Students
			r.Route("/students", func(r chi.Router) {
				r.Post("/", studentHandler.Create)
				r.Get("/{id}", studentHandler.GetByID)
				r.Put("/{id}", studentHandler.Update)
				r.Delete("/{id}", studentHandler.Delete)

				// Nested: subscriptions by student
				r.Get("/{student_id}/subscriptions", subscriptionHandler.ListByStudent)

				// Nested: attendance by student
				r.Get("/{student_id}/attendance", attendanceHandler.GetByStudent)
			})

			// Subscriptions
			r.Route("/subscriptions", func(r chi.Router) {
				r.Post("/", subscriptionHandler.Create)
				r.Get("/{id}", subscriptionHandler.GetByID)
				r.Put("/{id}/cancel", subscriptionHandler.Cancel)

				// Nested: payments by subscription
				r.Get("/{subscription_id}/payments", paymentHandler.GetBySubscription)
			})

			// Attendance
			r.Route("/attendance", func(r chi.Router) {
				r.Post("/", attendanceHandler.Mark)
				r.Post("/bulk", attendanceHandler.BulkMark)
				r.Put("/{id}", attendanceHandler.Update)
				r.Delete("/{id}", attendanceHandler.Delete)
			})

			// Payments
			r.Route("/payments", func(r chi.Router) {
				r.Post("/manual", paymentHandler.CreateManual)
				r.Get("/{id}", paymentHandler.GetByID)
			})
		})
	})

	// Public routes (no auth)
	r.Route("/public", func(r chi.Router) {
		r.Get("/club/{id}/schedule", publicHandler.Schedule)
		r.Get("/club/{id}/groups", publicHandler.Groups)
	})

	// Webhooks (special handling - no CSRF, raw body needed)
	r.Route("/api/v1/webhooks", func(r chi.Router) {
		r.Post("/stripe", paymentHandler.StripeWebhook)
	})

	// Server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("starting server", slog.String("port", cfg.Server.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	<-done
	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", slog.String("error", err.Error()))
	}

	logger.Info("server stopped")
}
