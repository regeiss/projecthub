# =============================================================================
# ProjectHub — Backend Dockerfile
# Python 3.12 + Django + Daphne (ASGI) + Celery
# Multi-stage build: builder → production
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder — instala dependências e compila pacotes
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Evita prompts interativos e garante saída imediata nos logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Dependências de sistema para compilar pacotes Python (psycopg2, Pillow etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    libpng-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala requirements em camada separada (cache de build)
COPY requirements/base.txt requirements/base.txt
COPY requirements/production.txt requirements/production.txt

RUN pip install --upgrade pip \
    && pip install --prefix=/install -r requirements/production.txt


# -----------------------------------------------------------------------------
# Stage 2: Production — imagem final enxuta
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production \
    APP_HOME=/app

WORKDIR $APP_HOME

# Apenas dependências de runtime (sem compiladores)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    libpng16-16 \
    curl \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copia pacotes instalados no builder
COPY --from=builder /install /usr/local

# Copia código da aplicação
COPY . $APP_HOME

# Script utilitário: aguarda o banco ficar disponível antes de iniciar
COPY scripts/wait_for_db.sh /usr/local/bin/wait_for_db.sh
RUN chmod +x /usr/local/bin/wait_for_db.sh

# Usuário não-root por segurança
RUN groupadd -r projecthub && useradd -r -g projecthub projecthub \
    && mkdir -p $APP_HOME/staticfiles $APP_HOME/media \
    && chown -R projecthub:projecthub $APP_HOME

USER projecthub

# Porta do Daphne (ASGI)
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Comando padrão — pode ser sobrescrito no docker-compose
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
