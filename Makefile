# =============================================================================
# Office Detective - Development Makefile
# =============================================================================
# Run `make help` to see available commands.

.PHONY: help install env docker-up docker-down migrate seed ingest setup start dev \
        test test-api test-web lint format typecheck clean stop

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

# Default target
help:
	@echo ""
	@echo "$(CYAN)Office Detective$(RESET) - Development Commands"
	@echo ""
	@echo "$(GREEN)Quick Start:$(RESET)"
	@echo "  make start       $(YELLOW)Start everything$(RESET) (docker + backend + frontend + ingest)"
	@echo "  make stop        Stop all services"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@echo "  make install     Install all dependencies (pnpm + uv)"
	@echo "  make setup       Initial setup: install, docker, migrate, seed"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make dev         Start frontend and backend (foreground)"
	@echo "  make docker-up   Start Docker services"
	@echo "  make docker-down Stop Docker services"
	@echo ""
	@echo "$(GREEN)Testing:$(RESET)"
	@echo "  make test        Run all tests"
	@echo "  make test-api    Run backend tests only"
	@echo "  make test-web    Run frontend tests only"
	@echo ""
	@echo "$(GREEN)Code Quality:$(RESET)"
	@echo "  make lint        Run linters (ruff, eslint)"
	@echo "  make format      Format code (ruff, prettier)"
	@echo "  make typecheck   Run type checkers (mypy, tsc)"
	@echo ""
	@echo "$(GREEN)Data:$(RESET)"
	@echo "  make seed        Seed the database with sample case"
	@echo "  make ingest      Process documents (chunking + embeddings)"
	@echo ""
	@echo "$(GREEN)Maintenance:$(RESET)"
	@echo "  make clean       Stop Docker and remove volumes"
	@echo ""

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------

install:
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	pnpm install
	cd apps/api && uv sync --all-extras
	@echo "$(GREEN)Dependencies installed!$(RESET)"

env:
	@test -f .env || (cp .env.example .env && echo "$(YELLOW)Created .env from template$(RESET)")
	@test -f apps/api/.env || (cp .env.example apps/api/.env && echo "$(YELLOW)Created apps/api/.env from template$(RESET)")

docker-up:
	@echo "$(CYAN)Starting Docker services...$(RESET)"
	docker compose -f infra/docker-compose.yml up -d
	@echo "$(YELLOW)Waiting for services to be ready...$(RESET)"
	@sleep 5
	@echo "$(GREEN)Docker services running!$(RESET)"

docker-down:
	@echo "$(CYAN)Stopping Docker services...$(RESET)"
	docker compose -f infra/docker-compose.yml down

migrate:
	@echo "$(CYAN)Running database migrations...$(RESET)"
	cd apps/api && uv run alembic upgrade head
	@echo "$(GREEN)Migrations complete!$(RESET)"

seed:
	@echo "$(CYAN)Seeding database...$(RESET)"
	cd apps/api && uv run python -m src.scripts.seed_mallory
	@echo "$(GREEN)Database seeded!$(RESET)"

# Ingest documents (requires backend running)
ingest:
	@echo "$(CYAN)Ingesting documents (chunking + embeddings)...$(RESET)"
	@echo "$(YELLOW)This requires OPENAI_API_KEY in .env$(RESET)"
	@CASE_ID=$$(curl -s http://localhost:8000/api/cases | python3 -c "import sys,json; cases=json.load(sys.stdin).get('cases',[]); print(cases[0]['case_id'] if cases else '')") && \
	if [ -n "$$CASE_ID" ]; then \
		echo "Ingesting case: $$CASE_ID"; \
		curl -s -X POST "http://localhost:8000/api/cases/$$CASE_ID/ingest" | python3 -c "import sys,json; r=json.load(sys.stdin); print(f\"Chunks: {r.get('total_chunks',0)}, Embeddings: {r.get('total_embeddings',0)}\")"; \
		echo "$(GREEN)Ingestion complete!$(RESET)"; \
	else \
		echo "$(YELLOW)No cases found. Run 'make seed' first.$(RESET)"; \
	fi

setup: install env docker-up migrate seed
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)Base setup complete!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"
	@echo ""
	@echo "$(YELLOW)To complete setup with AI features:$(RESET)"
	@echo ""
	@echo "  1. Add your OpenAI API key:"
	@echo "     $(CYAN)echo 'OPENAI_API_KEY=sk-...' >> .env$(RESET)"
	@echo "     $(CYAN)echo 'OPENAI_API_KEY=sk-...' >> apps/api/.env$(RESET)"
	@echo ""
	@echo "  2. Start backend and ingest documents:"
	@echo "     $(CYAN)make dev$(RESET)          # In terminal 1 (keep running)"
	@echo "     $(CYAN)make ingest$(RESET)       # In terminal 2 (one-time)"
	@echo ""
	@echo "  3. Open $(CYAN)http://localhost:3000$(RESET)"
	@echo ""

# -----------------------------------------------------------------------------
# Quick Start (single command)
# -----------------------------------------------------------------------------

# Start everything: docker, backend, ingest, frontend
start: docker-up migrate seed
	@echo ""
	@echo "$(CYAN)Starting backend server...$(RESET)"
	@cd apps/api && export $$(grep -v '^#' .env | xargs) && uv run uvicorn src.main:app --port 8000 & \
	echo $$! > /tmp/office_detective_api.pid
	@echo "$(YELLOW)Waiting for backend to be ready...$(RESET)"
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if curl -s http://localhost:8000/health > /dev/null 2>&1; then \
			echo "$(GREEN)Backend ready!$(RESET)"; \
			break; \
		fi; \
		sleep 1; \
	done
	@echo ""
	@echo "$(CYAN)Running document ingestion...$(RESET)"
	@CASE_ID=$$(curl -s http://localhost:8000/api/cases | python3 -c "import sys,json; cases=json.load(sys.stdin).get('cases',[]); print(cases[0]['case_id'] if cases else '')") && \
	if [ -n "$$CASE_ID" ]; then \
		RESULT=$$(curl -s -X POST "http://localhost:8000/api/cases/$$CASE_ID/ingest"); \
		CHUNKS=$$(echo $$RESULT | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_chunks',0))"); \
		echo "$(GREEN)Ingested $$CHUNKS chunks$(RESET)"; \
	fi
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)Office Detective is running!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"
	@echo ""
	@echo "  Frontend: $(CYAN)http://localhost:3000$(RESET)"
	@echo "  Backend:  $(CYAN)http://localhost:8000$(RESET)"
	@echo "  API Docs: $(CYAN)http://localhost:8000/docs$(RESET)"
	@echo ""
	@echo "Press $(YELLOW)Ctrl+C$(RESET) to stop"
	@echo ""
	@cd apps/web && pnpm dev

# Stop all services
stop:
	@echo "$(CYAN)Stopping services...$(RESET)"
	@-pkill -f "uvicorn src.main:app" 2>/dev/null || true
	@-pkill -f "next dev" 2>/dev/null || true
	@-test -f /tmp/office_detective_api.pid && kill $$(cat /tmp/office_detective_api.pid) 2>/dev/null && rm /tmp/office_detective_api.pid || true
	@docker compose -f infra/docker-compose.yml stop 2>/dev/null || true
	@echo "$(GREEN)All services stopped$(RESET)"

# -----------------------------------------------------------------------------
# Development (manual control)
# -----------------------------------------------------------------------------

dev:
	@echo "$(CYAN)Starting development servers...$(RESET)"
	@echo "  Frontend: $(CYAN)http://localhost:3000$(RESET)"
	@echo "  Backend:  $(CYAN)http://localhost:8000$(RESET)"
	@echo "  API Docs: $(CYAN)http://localhost:8000/docs$(RESET)"
	@echo ""
	@echo "Press $(YELLOW)Ctrl+C$(RESET) to stop all servers"
	@echo ""
	@trap 'kill 0' INT; \
	(cd apps/web && pnpm dev) & \
	(cd apps/api && export $$(grep -v '^#' .env | xargs) && uv run uvicorn src.main:app --reload --port 8000) & \
	wait

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------

test: test-api test-web
	@echo "$(GREEN)All tests passed!$(RESET)"

test-api:
	@echo "$(CYAN)Running backend tests...$(RESET)"
	cd apps/api && uv run pytest

test-web:
	@echo "$(CYAN)Running frontend tests...$(RESET)"
	cd apps/web && pnpm test

# -----------------------------------------------------------------------------
# Code Quality
# -----------------------------------------------------------------------------

lint:
	@echo "$(CYAN)Running linters...$(RESET)"
	cd apps/api && uv run ruff check .
	cd apps/api && uv run ruff format --check .
	cd apps/web && pnpm lint
	@echo "$(GREEN)Linting passed!$(RESET)"

format:
	@echo "$(CYAN)Formatting code...$(RESET)"
	cd apps/api && uv run ruff format .
	pnpm format
	@echo "$(GREEN)Formatting complete!$(RESET)"

typecheck:
	@echo "$(CYAN)Running type checkers...$(RESET)"
	cd apps/api && uv run mypy .
	cd apps/web && pnpm typecheck
	@echo "$(GREEN)Type checking passed!$(RESET)"

# -----------------------------------------------------------------------------
# Maintenance
# -----------------------------------------------------------------------------

clean:
	@echo "$(YELLOW)Stopping Docker and removing volumes...$(RESET)"
	docker compose -f infra/docker-compose.yml down -v
	rm -rf apps/web/.next
	rm -rf apps/api/.pytest_cache apps/api/.ruff_cache apps/api/.mypy_cache
	rm -rf apps/api/htmlcov apps/api/.coverage
	@echo "$(GREEN)Cleanup complete!$(RESET)"
