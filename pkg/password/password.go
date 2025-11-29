package password

import (
	"golang.org/x/crypto/bcrypt"
)

const cost = 12

// Hash generates a bcrypt hash from a plain password
func Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	return string(bytes), err
}

// Verify compares a plain password with a hash
func Verify(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
