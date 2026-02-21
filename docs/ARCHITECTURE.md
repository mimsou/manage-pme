# Architecture Logicielle

## Structure du Projet

```
manage-pme/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── auth/        # Authentification JWT
│   │   ├── users/       # Gestion utilisateurs
│   │   ├── products/    # Gestion produits
│   │   ├── categories/  # Catégories
│   │   ├── clients/     # Clients
│   │   ├── suppliers/   # Fournisseurs
│   │   ├── sales/       # Ventes
│   │   ├── stock/       # Gestion stock
│   │   ├── inventory/   # Inventaires
│   │   ├── cash-register/ # Caisse
│   │   ├── dashboard/   # Dashboard
│   │   └── prisma/      # Prisma service
│   └── prisma/
│       └── schema.prisma # Modèle de données
│
├── frontend/             # React + TypeScript
│   ├── src/
│   │   ├── pages/       # Pages de l'application
│   │   ├── components/  # Composants réutilisables
│   │   ├── stores/      # Zustand stores
│   │   ├── lib/         # Utilitaires
│   │   └── App.tsx      # Point d'entrée
│
└── docs/                 # Documentation
```

## Backend (NestJS)

### Architecture Modulaire

- **Modules** : Chaque domaine métier est un module NestJS
- **Services** : Logique métier dans les services
- **Controllers** : Endpoints REST API
- **DTOs** : Validation des données avec class-validator
- **Guards** : Protection des routes avec JWT et RBAC

### Authentification

- JWT avec access token (1h) et refresh token (7j)
- Refresh tokens stockés en base de données
- RBAC avec rôles: ADMIN, MANAGER, VENDEUR

### Base de Données

- Prisma ORM pour PostgreSQL
- Migrations versionnées
- Seed data pour développement

## Frontend (React)

### Stack Technique

- **React 18** avec TypeScript
- **Vite** pour le build
- **TailwindCSS** pour le styling
- **Zustand** pour la gestion d'état
- **React Router** pour la navigation
- **Axios** pour les appels API

### Architecture

- **Pages** : Composants de page
- **Components** : Composants réutilisables
- **Stores** : État global avec Zustand
- **Routing** : Navigation avec React Router
- **API Client** : Axios avec interceptors pour refresh token

## Sécurité

- JWT avec expiration
- Refresh tokens rotatifs
- RBAC au niveau backend
- Validation des données avec DTOs
- CORS configuré

## Performance

- Index sur les champs fréquemment recherchés
- Pagination sur les listes
- Lazy loading des relations Prisma
- Optimisations React (memoization si nécessaire)

## Extensibilité

- Modules prêts pour :
  - Fidélité client
  - Multi-magasin
  - E-commerce
  - Module employés

