# =============================================================================
# ProjectHub — Makefile
# Atalhos para os comandos mais usados no dia a dia
# Uso: make <comando>
# =============================================================================

# Remote server
REMOTE_HOST := 10.13.65.37
REMOTE_USER := robertogeiss
REMOTE_PASS := (*3Lv1nh0*)
REMOTE_DIR  := /opt/projecthub

_SSH   := sshpass -p '$(REMOTE_PASS)' ssh -o StrictHostKeyChecking=no $(REMOTE_USER)@$(REMOTE_HOST)
_RSYNC := sshpass -p '$(REMOTE_PASS)' rsync -avz --no-perms --no-group \
            -e "ssh -o StrictHostKeyChecking=no" \
            --exclude='node_modules' --exclude='.git' --exclude='__pycache__' \
            --exclude='*.pyc' --exclude='staticfiles' --exclude='.env'

.PHONY: help up down build logs shell migrate seed test lint sync-backend sync-frontend sync-remote

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
	@echo "  make sync-backend Sincroniza backend → remoto e reinicia containers"
	@echo "  make sync-frontend Sincroniza frontend/src → remoto"
	@echo "  make sync-remote  Sincroniza projeto inteiro → remoto"
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

# Sincroniza só o backend → remoto e reinicia os containers via SSH
sync-backend:
	@echo "Sincronizando backend → $(REMOTE_USER)@$(REMOTE_HOST)..."
	$(_RSYNC) /mnt/d/projecthub/backend/ $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)/backend/
	$(_SSH) "cd $(REMOTE_DIR) && docker compose restart api celery_worker celery_beat"
	@echo "Done."

# Sincroniza só frontend/src → remoto (Vite recarrega automaticamente)
sync-frontend:
	@echo "Sincronizando frontend/src → $(REMOTE_USER)@$(REMOTE_HOST)..."
	sshpass -p '$(REMOTE_PASS)' rsync -avz \
		-e "ssh -o StrictHostKeyChecking=no" \
		/mnt/d/projecthub/frontend/src/ \
		$(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)/frontend/src/
	@echo "Done. Vite irá recarregar automaticamente."

# Sincroniza o projeto inteiro → remoto
sync-remote:
	@echo "Sincronizando projeto → $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)..."
	$(_RSYNC) /mnt/d/projecthub/ $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DIR)/
	@echo "Done."

# Frontend
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
