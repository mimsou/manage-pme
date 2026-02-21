# ============================================
# Stage 1: Build frontend (Vite + React)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit

COPY frontend/ ./
# En prod, l'API est sur le même domaine (chemins relatifs /api)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ============================================
# Stage 2: Build backend (NestJS)
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --no-audit

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS production

# OpenSSL pour Prisma (évite le warning et erreurs de connexion)
RUN apk add --no-cache openssl

WORKDIR /app

# Dépendances backend (incl. prisma pour migrate deploy au démarrage)
COPY backend/package*.json ./
RUN npm install --no-audit

# Prisma + schéma (pour migrate et runtime)
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Build backend
COPY --from=backend-builder /app/backend/dist ./dist

# Script de démarrage (vérifie DATABASE_URL, migrations, puis node)
COPY backend/scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

# Frontend statique (servi par Nest en prod)
COPY --from=frontend-builder /app/frontend/dist ./client

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./scripts/start.sh"]
