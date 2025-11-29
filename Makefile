.PHONY: help build run test lint migrate-up migrate-down docker-up docker-down clean

# Variables
BINARY_NAME=trainer-plus
MAIN_PATH=./cmd/api
MIGRATIONS_PATH=./migrations
DATABASE_URL?=postgres://trainer:trainer@localhost:5432/trainerplus?sslmode=disable

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the binary
	go build -o bin/$(BINARY_NAME) $(MAIN_PATH)

run: ## Run the API server
	go run $(MAIN_PATH)/main.go

dev: ## Run with hot reload (requires air)
	air

test: ## Run tests
	go test -v -race -cover ./...

test-coverage: ## Run tests with coverage report
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint: ## Run linter
	golangci-lint run ./...

fmt: ## Format code
	go fmt ./...
	goimports -w .

migrate-up: ## Run migrations up
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" up

migrate-down: ## Run migrations down (1 step)
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" down 1

migrate-create: ## Create new migration (usage: make migrate-create name=create_users)
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(name)

migrate-force: ## Force migration version (usage: make migrate-force version=1)
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" force $(version)

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-build: ## Build Docker image
	docker build -t $(BINARY_NAME):latest .

clean: ## Clean build artifacts
	rm -rf bin/ coverage.out coverage.html tmp/

deps: ## Download dependencies
	go mod download
	go mod tidy

swagger: ## Generate Swagger docs (requires swag)
	swag init -g $(MAIN_PATH)/main.go -o ./docs

seed: ## Seed database with test data
	go run ./scripts/seed/main.go
