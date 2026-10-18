# SupplyGuard: backend (FastAPI + agents) and UI (React + React Flow)
PY      := poc/.venv/bin/python
UVICORN := poc/.venv/bin/uvicorn
API_PORT ?= 8000

.PHONY: help install data check-keys api web dev build serve docker-build docker-up docker-down docker-logs deploy

help:          ## Show targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install:       ## Create Python venv + install npm packages
	test -d poc/.venv || python3 -m venv poc/.venv
	poc/.venv/bin/pip install -q -r poc/requirements.txt
	cd web && npm install

data:          ## Regenerate SIMULATED enrichment + demo documents
	cd poc && .venv/bin/python scripts/make_demo_data.py

check-keys:    ## Verify Nebius / NVIDIA / Tavily keys and models
	cd poc && .venv/bin/python scripts/check_keys.py

api:           ## Run backend with auto-reload on :8000
	cd poc && .venv/bin/uvicorn api:app --reload --port $(API_PORT)

web:           ## Run UI dev server on :5173 (proxies /api to :8000)
	cd web && npm run dev

dev:           ## Run backend + UI together (Ctrl+C stops both)
	@trap 'kill 0' INT TERM; $(MAKE) -s api & $(MAKE) -s web & wait

build:         ## Production build of the UI into web/dist
	cd web && npm run build

serve: build   ## Single process: API serves the built UI on :8000
	cd poc && .venv/bin/uvicorn api:app --host 0.0.0.0 --port $(API_PORT)

docker-build:  ## Build images supplyguard-api and supplyguard-web
	docker compose build

docker-up:     ## Start both containers (UI on http://localhost:8090)
	docker compose up -d --build
	@echo "UI: http://localhost:$${WEB_PORT:-8090}"

docker-down:   ## Stop containers
	docker compose down

docker-logs:   ## Follow container logs
	docker compose logs -f

deploy:        ## Deploy to the Nebius VM: make deploy VM=user@ip
	@test -n "$(VM)" || (echo "usage: make deploy VM=user@ip" && exit 1)
	./poc/deploy/deploy.sh $(VM)
