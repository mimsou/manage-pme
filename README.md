# Application de Gestion de Magasin

Application complète de gestion de magasin/boutique générique, modulable pour différents secteurs (prêt-à-porter, parfumerie, quincaillerie, téléphonie, etc.).

## 🏗️ Architecture

```
manage-pme/
├── frontend/          # React + TypeScript + TailwindCSS + Zustand
├── backend/           # NestJS + Prisma + PostgreSQL
├── docs/              # Documentation (UML, API, DB)
└── README.md
```

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### Installation complète

```bash
# Installer toutes les dépendances
npm run install:all

# Configurer la base de données
cd backend
cp .env.example .env
# Éditer .env avec vos credentials PostgreSQL

# Lancer les migrations Prisma
npx prisma migrate dev
npx prisma generate

# Seed des données initiales
npx prisma db seed

# Lancer l'application (dev mode)
cd ..
npm run dev
```

L'application sera accessible sur :
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📦 Modules

### ✅ Implémentés (Backend)
- **Authentification** : JWT + Refresh Token + RBAC (ADMIN, MANAGER, VENDEUR)
- **Gestion Produits** : CRUD complet, catégories hiérarchiques, code-barres (EAN-13), variantes, historique prix
- **Gestion Clients** : CRUD, particuliers/entreprises, TVA intracommunautaire, historique achats
- **Gestion Fournisseurs** : CRUD, contacts multiples, conditions de paiement, remises
- **Ventes** : Création de ventes, tickets (B2C) et factures (B2B) avec TVA, calcul automatique de marge
- **Stocks** : Mouvements de stock complets, traçabilité, alertes de stock bas
- **Inventaires** : Création, validation, ajustement automatique du stock
- **Caisse** : Ouverture/fermeture, suivi journalier, calcul d'écarts
- **Dashboard** : Statistiques, KPIs, top produits, produits en rupture

### ✅ Implémentés (Frontend)
- **Authentification** : Page de connexion avec gestion des tokens
- **Layout** : Sidebar navigation, routing protégé
- **Dashboard** : Statistiques et indicateurs
- **POS** : Interface caisse avec scan code-barres
- **Pages** : Produits, Clients, Fournisseurs, Ventes, Entrées, Inventaire, Stock
- **Espace Administration** (`/management`) : Identité de la société (logo, infos), Gestion des utilisateurs

### 🔮 Modules futurs
- Fidélité client (points, cartes)
- Multi-magasin & transfert stock
- Intégration e-commerce
- Module employés & performance vendeurs

## 🧑‍💻 Rôles utilisateurs

- **Admin** : Accès complet
- **Manager** : Gestion produits, stocks, rapports
- **Vendeur** : Ventes, POS, consultation

## 📚 Documentation

Voir le dossier `docs/` pour :
- **API.md** : Documentation complète des endpoints API
- **DATABASE.md** : Modèle de données et relations
- **ARCHITECTURE.md** : Architecture logicielle détaillée
- **INSTALLATION.md** : Guide d'installation pas à pas

La documentation Swagger est disponible à : http://localhost:3000/api/docs

## 🛠️ Technologies

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build ultra-rapide
- **TailwindCSS** pour le styling moderne
- **Zustand** pour la gestion d'état légère
- **React Router** pour la navigation
- **Axios** pour les appels API avec interceptors

### Backend
- **NestJS** framework Node.js modulaire
- **Prisma** ORM pour PostgreSQL
- **PostgreSQL** base de données relationnelle
- **JWT** authentification avec refresh tokens
- **Swagger** documentation API automatique
- **class-validator** validation des données

### Outils
- **ESLint** + **Prettier** pour le code quality
- **TypeScript** pour la sécurité de type
- **Git** pour le versioning

## 📝 Structure du Projet

```
manage-pme/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── auth/           # Authentification JWT + RBAC
│   │   ├── users/          # Gestion utilisateurs
│   │   ├── products/       # Produits + catégories
│   │   ├── clients/        # Clients
│   │   ├── suppliers/      # Fournisseurs
│   │   ├── sales/         # Ventes (tickets + factures)
│   │   ├── stock/         # Mouvements de stock
│   │   ├── inventory/     # Inventaires
│   │   ├── cash-register/ # Caisse
│   │   ├── dashboard/     # Analytics & KPIs
│   │   └── prisma/        # Service Prisma
│   └── prisma/
│       ├── schema.prisma  # Modèle de données complet
│       └── seed.ts        # Données de test
│
├── frontend/                # React + TypeScript
│   ├── src/
│   │   ├── pages/         # Pages de l'application
│   │   ├── components/    # Composants réutilisables
│   │   ├── stores/         # Zustand stores (auth, etc.)
│   │   └── lib/           # Utilitaires
│   └── public/
│
├── docs/                   # Documentation
│   ├── API.md             # Documentation API
│   ├── DATABASE.md        # Modèle de données
│   ├── ARCHITECTURE.md    # Architecture logicielle
│   └── INSTALLATION.md    # Guide d'installation
│
└── README.md
```

## 📝 License

Proprietary

