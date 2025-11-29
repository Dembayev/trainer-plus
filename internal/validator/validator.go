package validator

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type Validator struct {
	validate *validator.Validate
}

func New() *Validator {
	v := validator.New()
	
	// Register custom validations if needed
	v.RegisterValidation("currency", validateCurrency)
	
	return &Validator{validate: v}
}

func (v *Validator) Struct(s interface{}) error {
	err := v.validate.Struct(s)
	if err == nil {
		return nil
	}

	// Convert validation errors to readable messages
	var errMessages []string
	for _, err := range err.(validator.ValidationErrors) {
		errMessages = append(errMessages, formatError(err))
	}

	return fmt.Errorf("%s", strings.Join(errMessages, "; "))
}

func formatError(fe validator.FieldError) string {
	field := strings.ToLower(fe.Field())
	
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, fe.Param())
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "uuid4":
		return fmt.Sprintf("%s must be a valid UUID", field)
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, fe.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, fe.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, fe.Param())
	case "currency":
		return fmt.Sprintf("%s must be a valid currency (KZT, USD, EUR, RUB)", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

// Custom validator for currency
func validateCurrency(fl validator.FieldLevel) bool {
	currency := fl.Field().String()
	validCurrencies := map[string]bool{
		"KZT": true,
		"USD": true,
		"EUR": true,
		"RUB": true,
	}
	return validCurrencies[currency]
}
