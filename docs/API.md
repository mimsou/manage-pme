# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Toutes les routes (sauf `/auth/login`, `/auth/register`, `/auth/refresh`) nécessitent une authentification JWT.

### Headers

```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth

- `POST /auth/login` - Connexion
- `POST /auth/register` - Inscription
- `POST /auth/refresh` - Rafraîchir le token
- `POST /auth/logout` - Déconnexion
- `GET /auth/me` - Utilisateur actuel

### Products

- `GET /products` - Liste des produits
- `GET /products/:id` - Détails d'un produit
- `GET /products/barcode/:barcode` - Produit par code-barres
- `POST /products` - Créer un produit (Admin/Manager)
- `PUT /products/:id` - Modifier un produit (Admin/Manager)
- `DELETE /products/:id` - Supprimer un produit (Admin)

### Categories

- `GET /categories` - Liste des catégories
- `GET /categories/:id` - Détails d'une catégorie
- `POST /categories` - Créer une catégorie (Admin/Manager)
- `PUT /categories/:id` - Modifier une catégorie (Admin/Manager)
- `DELETE /categories/:id` - Supprimer une catégorie (Admin/Manager)

### Clients

- `GET /clients` - Liste des clients
- `GET /clients/:id` - Détails d'un client
- `POST /clients` - Créer un client
- `PUT /clients/:id` - Modifier un client
- `DELETE /clients/:id` - Supprimer un client

### Suppliers

- `GET /suppliers` - Liste des fournisseurs
- `GET /suppliers/:id` - Détails d'un fournisseur
- `POST /suppliers` - Créer un fournisseur (Admin/Manager)
- `PUT /suppliers/:id` - Modifier un fournisseur (Admin/Manager)
- `DELETE /suppliers/:id` - Supprimer un fournisseur (Admin)

### Sales

- `GET /sales` - Liste des ventes
- `GET /sales/:id` - Détails d'une vente
- `POST /sales` - Créer une vente
- `PUT /sales/:id/cancel` - Annuler une vente

### Stock

- `GET /stock/movements` - Mouvements de stock
- `GET /stock/low-stock` - Produits en rupture
- `GET /stock/product/:id/history` - Historique d'un produit

### Inventory

- `GET /inventory` - Liste des inventaires
- `GET /inventory/:id` - Détails d'un inventaire
- `POST /inventory` - Créer un inventaire
- `POST /inventory/:id/items` - Ajouter un article
- `PUT /inventory/:id/start` - Démarrer un inventaire
- `PUT /inventory/:id/complete` - Terminer un inventaire
- `PUT /inventory/:id/validate` - Valider un inventaire

### Cash Register

- `GET /cash-register` - Liste des caisses
- `GET /cash-register/current` - Caisse ouverte actuelle
- `GET /cash-register/:id` - Détails d'une caisse
- `POST /cash-register/open` - Ouvrir une caisse
- `PUT /cash-register/:id/close` - Fermer une caisse

### Dashboard

- `GET /dashboard/stats` - Statistiques générales
- `GET /dashboard/sales-chart` - Données graphiques ventes

## Swagger Documentation

La documentation Swagger est disponible à :

```
http://localhost:3000/api/docs
```

