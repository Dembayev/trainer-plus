package validator_test

import (
	"testing"

	"github.com/neo/trainer-plus/internal/validator"
)

func TestValidator_Struct(t *testing.T) {
	v := validator.New()

	tests := []struct {
		name    string
		input   interface{}
		wantErr bool
	}{
		{
			name: "valid struct",
			input: struct {
				Name     string `validate:"required,min=3"`
				Currency string `validate:"required,currency"`
			}{Name: "Test", Currency: "KZT"},
			wantErr: false,
		},
		{
			name: "missing required field",
			input: struct {
				Name string `validate:"required"`
			}{Name: ""},
			wantErr: true,
		},
		{
			name: "field too short",
			input: struct {
				Name string `validate:"required,min=3"`
			}{Name: "AB"},
			wantErr: true,
		},
		{
			name: "invalid currency",
			input: struct {
				Currency string `validate:"required,currency"`
			}{Currency: "INVALID"},
			wantErr: true,
		},
		{
			name: "valid currencies",
			input: struct {
				C1 string `validate:"currency"`
				C2 string `validate:"currency"`
				C3 string `validate:"currency"`
				C4 string `validate:"currency"`
			}{C1: "KZT", C2: "USD", C3: "EUR", C4: "RUB"},
			wantErr: false,
		},
		{
			name: "valid email",
			input: struct {
				Email string `validate:"required,email"`
			}{Email: "test@example.com"},
			wantErr: false,
		},
		{
			name: "invalid email",
			input: struct {
				Email string `validate:"required,email"`
			}{Email: "not-an-email"},
			wantErr: true,
		},
		{
			name: "valid uuid",
			input: struct {
				ID string `validate:"required,uuid4"`
			}{ID: "550e8400-e29b-41d4-a716-446655440000"},
			wantErr: false,
		},
		{
			name: "invalid uuid",
			input: struct {
				ID string `validate:"required,uuid4"`
			}{ID: "not-a-uuid"},
			wantErr: true,
		},
		{
			name: "gte validation success",
			input: struct {
				Price float64 `validate:"gte=0"`
			}{Price: 100.50},
			wantErr: false,
		},
		{
			name: "gte validation failure",
			input: struct {
				Price float64 `validate:"gte=0"`
			}{Price: -1},
			wantErr: true,
		},
		{
			name: "oneof validation success",
			input: struct {
				Status string `validate:"oneof=active inactive pending"`
			}{Status: "active"},
			wantErr: false,
		},
		{
			name: "oneof validation failure",
			input: struct {
				Status string `validate:"oneof=active inactive pending"`
			}{Status: "unknown"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := v.Struct(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("Struct() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
