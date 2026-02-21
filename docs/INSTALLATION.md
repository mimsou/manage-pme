# Guide d'Installation

## Prérequis

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

## Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd manage-pme
```

### 2. Installer les dépendances

```bash
# À la racine
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configuration de la base de données

```bash
cd backend

# Créer le fichier .env
cp .env.example .env

# Éditer .env avec vos credentials PostgreSQL
# DATABASE_URL="postgresql://user:password@localhost:5432/manage_pme?schema=public"
```

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Créer les migrations
npx prisma migrate dev --name init

# Seed des données initiales
npx prisma db seed
```

### 5. Lancer l'application

#### En développement

```bash
# À la racine
npm run dev

# Ou séparément :
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Accès

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs

## Comptes par défaut

Après le seed :

- **Admin** : admin@example.com / password123
- **Manager** : manager@example.com / password123
- **Vendeur** : vendeur@example.com / password123

## Production

### Build

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Servir le dossier dist/ avec un serveur web (nginx, etc.)
```

### Variables d'environnement

Assurez-vous de configurer :

- `DATABASE_URL` : URL PostgreSQL
- `JWT_SECRET` : Secret pour JWT (changez en production)
- `JWT_REFRESH_SECRET` : Secret pour refresh token
- `FRONTEND_URL` : URL du frontend pour CORS

## Dépannage

### Erreur de connexion à la base de données

Vérifiez que PostgreSQL est démarré et que les credentials dans `.env` sont corrects.

### Erreur Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate reset  # Attention : supprime toutes les données
```

### Erreur CORS

Vérifiez que `FRONTEND_URL` dans `.env` correspond à l'URL du frontend.

