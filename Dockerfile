# ============================================
# Stage 1: Build frontend (Vite + React)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

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
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Dépendances backend (incl. prisma pour migrate deploy au démarrage)
COPY backend/package*.json ./
RUN npm install

# Prisma + schéma (pour migrate et runtime)
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Build backend
COPY --from=backend-builder /app/backend/dist ./dist

# Frontend statique (servi par Nest en prod)
COPY --from=frontend-builder /app/frontend/dist ./client

ENV NODE_ENV=production
EXPOSE 3000

# Migrations au démarrage puis lancement du serveur
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
