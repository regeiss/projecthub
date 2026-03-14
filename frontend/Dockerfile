# =============================================================================
# ProjectHub — Frontend Dockerfile
# Node 20 + Vite build
# O build estático é copiado para o volume frontend_build (montado em /app/dist)
# que é servido pelo Nginx separado.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder — instala dependências e faz build do Vite
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de build injetados pelo docker-compose
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

# Copia manifesto e instala (camada cacheável separada do código)
COPY package.json package-lock.json* ./
RUN npm install --prefer-offline

# Copia código-fonte e faz build
COPY . .
RUN npm run build
# Build output: /app/dist

# -----------------------------------------------------------------------------
# Stage 2: Runner — copia build para o volume compartilhado com o nginx
# /app/build-output: arquivos do Vite (não é o mount point do volume)
# CMD copia /app/build-output → /app/dist (volume montado pelo compose)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Copia o build para um caminho que NÃO é o volume (evita shadowing)
COPY --from=builder /app/dist /app/build-output

# Ao iniciar, copia o build para o volume e mantém o container vivo
CMD ["sh", "-c", "rm -rf /app/dist/* && cp -rT /app/build-output /app/dist && echo 'Frontend build pronto em /app/dist' && tail -f /dev/null"]
