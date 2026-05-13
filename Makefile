.PHONY: install dev test lint help \
        backend.install backend.dev backend.test backend.lint backend.db backend.db.stop \
        frontend.install frontend.dev frontend.test frontend.lint frontend.check

help: ## Show this help
	@grep -E '^[a-zA-Z_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-22s %s\n", $$1, $$2}'

install: backend.install frontend.install ## Install both apps

dev: ## Start backend + frontend in parallel (Ctrl-C kills both)
	@$(MAKE) -j2 backend.dev frontend.dev

test: ## Run backend and frontend tests in parallel
	@$(MAKE) -j2 backend.test frontend.test

lint: ## Lint both apps in parallel
	@$(MAKE) -j2 backend.lint frontend.lint

# ---------- backend (delegates to backend/Makefile) ----------

backend.install: ## Install backend deps
	$(MAKE) -C backend setup

backend.dev: ## Start backend dev server
	$(MAKE) -C backend dev

backend.test: ## Run backend tests
	$(MAKE) -C backend test

backend.lint: ## Lint backend
	$(MAKE) -C backend lint

backend.db: ## Start postgres
	$(MAKE) -C backend db

backend.db.stop: ## Stop postgres
	$(MAKE) -C backend db-stop

# ---------- frontend ----------

frontend.install: ## Install frontend deps
	cd frontend && bun install

frontend.dev: ## Start frontend dev server
	cd frontend && bun run dev

frontend.test: ## Run frontend tests
	cd frontend && bun run test

frontend.lint: ## Lint frontend
	cd frontend && bun run lint:ci

frontend.check: ## Type-check frontend
	cd frontend && bun run check
