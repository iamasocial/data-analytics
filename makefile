PROTO_DIR=proto
GO_OUT=go-server/generated
PYTHON_OUT=python-server

PROTOC=protoc
PROTO_FILE=$(PROTO_DIR)/analysis.proto

GO_GENERATE_CMD=$(PROTOC) --go_out=. --go-grpc_out=. $(PROTO_FILE)
PYTHON_GENERATE_CMD=venv/bin/python -m grpc_tools.protoc -I$(PROTO_DIR) --python_out=$(PYTHON_OUT) --pyi_out=$(PYTHON_OUT) --grpc_python_out=$(PYTHON_OUT) $(PROTO_FILE)

all: generate-go generate-python

generate-go:
	@echo "Generating Go files from proto..."
	@$(GO_GENERATE_CMD)

generate-python:
	@echo "Generating Python files from proto..."
	@$(PYTHON_GENERATE_CMD)

clean-go:
	@echo "Cleaning generated files..."
	@rm -rf $(GO_OUT)/*.pb.go

clean-python:
	@echo "Cleaning python generated files..."
	@rm -rf $(PYTHON_OUT)/*.py

# Database Migrations
DB_URL := postgres://appuser:apppassword@localhost:5432/analysis_app_db?sslmode=disable
MIGRATIONS_PATH := go-server/internal/migrations

.PHONY: migrate-up migrate-down migrate-down-all migrate-create

# Apply all up migrations
migrate-up:
	@echo "Applying migrations up..."
	@migrate -database "$(DB_URL)" -path "$(MIGRATIONS_PATH)" up

# Rollback the last migration
migrate-down:
	@echo "Rolling back last migration..."
	@migrate -database "$(DB_URL)" -path "$(MIGRATIONS_PATH)" down 1

# Rollback all migrations
migrate-down-all:
	@echo "Rolling back all migrations..."
	@migrate -database "$(DB_URL)" -path "$(MIGRATIONS_PATH)" down -all

# Create a new migration with a given name
# Example: make migrate-create NAME=add_new_feature_to_users_table
migrate-create:
	@if [ -z "$(NAME)" ]; then \
		@echo "Error: NAME variable is not set. Usage: make migrate-create NAME=migration_name"; \
		@exit 1; \
	fi
	@echo "Creating migration: $(NAME)..."
	@migrate create -ext sql -dir "$(MIGRATIONS_PATH)" -seq "$(NAME)"