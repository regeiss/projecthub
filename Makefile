# =============================================================================
# ProjectHub — Makefile
# Atalhos para os comandos mais usados no dia a dia
# Uso: make <comando>
# =============================================================================

.PHONY: help up down build logs shell migrate seed test lint sync-backend sync-wsl

# Exibe ajuda
help:
	@echo ""
	@echo "  ProjectHub — Comandos disponíveis"
	@echo "  ─────────────────────────────────────────────────────────"
	@echo "  make up           Sobe todos os serviços"
	@echo "  make up-dev       Sobe apenas db, redis e api (sem nginx)"
	@echo "  make down         Para e remove os containers"
	@echo "  make build        Reconstrói as imagens"
	@echo "  make logs         Exibe logs de todos os serviços"
	@echo "  make logs-api     Exibe logs apenas da API"
	@echo "  make shell        Abre shell Django (shell_plus)"
	@echo "  make migrate      Roda as migrations"
	@echo "  make makemigrations  Gera novas migrations"
	@echo "  make seed         Popula o banco com dados iniciais"
	@echo "  make test         Roda os testes"
	@echo "  make lint         Roda o linter (ruff)"
	@echo "  make format       Formata o código (ruff + prettier)"
	@echo "  make monitoring   Sobe com o Flower (monitoramento Celery)"
	@echo "  make keycloak     Sobe com o Keycloak local"
	@echo "  make psql         Abre o psql no container do banco"
	@echo "  make redis-cli    Abre o redis-cli no container"
	@echo "  make sync-backend Copia backend/ para o container (fix volume Windows)"
	@echo "  make sync-wsl     Sincroniza projeto inteiro para WSL"
	@echo "  ─────────────────────────────────────────────────────────"
	@echo ""

# Serviços
up:
	docker compose up -d

up-dev:
	docker compose up -d db redis api celery_worker celery_beat

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

monitoring:
	docker compose --profile monitoring up -d

keycloak:
	docker compose --profile keycloak up -d

# Django
shell:
	docker compose exec api python manage.py shell_plus

migrate:
	docker compose exec api python manage.py migrate --noinput

makemigrations:
	docker compose exec api python manage.py makemigrations

collectstatic:
	docker compose exec api python manage.py collectstatic --noinput

seed:
	docker compose exec api python manage.py loaddata fixtures/initial_data.json

createsuperuser:
	docker compose exec api python manage.py createsuperuser

# Testes
test:
	docker compose exec api pytest --cov=apps --cov-report=term-missing

test-fast:
	docker compose exec api pytest -x -q

# Qualidade de código
lint:
	docker compose exec api ruff check apps/ config/ core/

format:
	docker compose exec api ruff format apps/ config/ core/
	cd frontend && npm run format

typecheck:
	docker compose exec api mypy apps/ config/ core/

# Banco de dados
psql:
	docker compose exec db psql -U projecthub -d projecthub

redis-cli:
	docker compose exec redis redis-cli

db-backup:
	docker compose exec db pg_dump -U projecthub projecthub > backups/projecthub_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup salvo em backups/"

db-restore:
	@read -p "Arquivo de backup (ex: backups/projecthub_20250101.sql): " f; \
	docker compose exec -T db psql -U projecthub projecthub < $$f

# Sync backend (workaround para volume mount lento no Docker Desktop/Windows)
# Copia todo o backend para o container e reinicia a API
sync-backend:
	@echo "Sincronizando backend → container..."
	docker cp backend/. projecthub_api://app/
	docker compose restart api
	@echo "Done."

# Sync project to WSL (exclui node_modules, .git, arquivos gerados)
sync-wsl:
	@echo "Sincronizando projeto → WSL (/home/robertogeiss/projecthub)..."
	rsync -av --no-perms --no-group \
		--exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
		--exclude='*.pyc' --exclude='staticfiles' --exclude='.env' \
		/mnt/d/projecthub/ /home/robertogeiss/projecthub/
	@echo "Done."

# Sync só o frontend/src para WSL (mais rápido que sync-wsl completo)
sync-frontend:
	@echo "Sincronizando frontend/src → WSL..."
	rsync -av /mnt/d/projecthub/frontend/src/ /home/robertogeiss/projecthub/frontend/src/
	@echo "Done. Vite irá recarregar automaticamente."

# Frontend
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
