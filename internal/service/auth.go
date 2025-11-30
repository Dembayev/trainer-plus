package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/neo/trainer-plus/internal/model"
	"github.com/neo/trainer-plus/internal/repository"
	"github.com/neo/trainer-plus/pkg/jwt"
	"github.com/neo/trainer-plus/pkg/password"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUserNotFound       = errors.New("user not found")
)

type AuthService struct {
	userRepo   *repository.UserRepository
	jwtManager *jwt.Manager
}

func NewAuthService(userRepo *repository.UserRepository, jwtManager *jwt.Manager) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
		jwtManager: jwtManager,
	}
}

type SignupInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required,min=2"`
}

type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	User         *model.User `json:"user"`
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
}

func (s *AuthService) Signup(ctx context.Context, input SignupInput) (*AuthResponse, error) {
	exists, err := s.userRepo.EmailExists(ctx, input.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailTaken
	}

	hash, err := password.Hash(input.Password)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Email:        input.Email,
		PasswordHash: hash,
		Name:         input.Name,
		Role:         string(model.RoleOwner),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	tokens, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	}, nil
}

func (s *AuthService) Login(ctx context.Context, input LoginInput) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !password.Verify(input.Password, user.PasswordHash) {
		return nil, ErrInvalidCredentials
	}

	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	tokens, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*jwt.TokenPair, error) {
	return s.jwtManager.RefreshTokens(refreshToken)
}

func (s *AuthService) GetUser(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

type UpdateProfileInput struct {
	Name    string
	Phone   string
	City    string
	Bio     string
	Company string
	Website string
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, input UpdateProfileInput) (*model.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if input.Name != "" {
		user.Name = input.Name
	}
	if input.Phone != "" {
		user.Phone = &input.Phone
	}
	if input.City != "" {
		user.City = &input.City
	}
	if input.Bio != "" {
		user.Bio = &input.Bio
	}
	if input.Company != "" {
		user.Company = &input.Company
	}
	if input.Website != "" {
		user.Website = &input.Website
	}

	if err := s.userRepo.UpdateProfile(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
