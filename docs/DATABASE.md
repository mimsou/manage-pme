# Modèle de Données

## Schéma Prisma

Le schéma de base de données est défini dans `backend/prisma/schema.prisma`.

## Modèles Principaux

### User
- Gestion des utilisateurs avec rôles (ADMIN, MANAGER, VENDEUR)
- Authentification JWT avec refresh tokens

### Category
- Catégories hiérarchiques (parent/enfant)
- Relation avec produits

### Product
- Produits avec code-barres, SKU, prix d'achat/vente
- Gestion du stock (actuel, minimum)
- Historique des prix
- Variantes de produits

### Client
- Clients particuliers ou entreprises
- TVA intracommunautaire pour B2B
- Points de fidélité

### Supplier
- Fournisseurs avec contacts
- Conditions de paiement
- Remises

### Sale
- Ventes (tickets ou factures)
- Calcul automatique de marge
- Paiements (cash, carte, mixte)
- Association avec caisse

### StockMovement
- Traçabilité complète des mouvements
- Types: ENTRY, EXIT, SALE, INVENTORY, ADJUSTMENT, etc.

### Inventory
- Inventaires avec validation
- Calcul automatique des écarts
- Ajustement automatique du stock

### CashRegister
- Ouverture/fermeture de caisse
- Suivi journalier
- Calcul des écarts

## Relations Clés

- Product → Category (many-to-one)
- Product → SupplierProduct (many-to-many)
- Sale → Client (many-to-one)
- Sale → User (many-to-one)
- Sale → CashRegister (many-to-one)
- SaleItem → Product (many-to-one)
- StockMovement → Product (many-to-one)
- InventoryItem → Product (many-to-one)

## Index

Les index sont définis sur :
- `barcode` et `sku` des produits
- `email` et `phone` des clients
- `createdAt` des ventes
- `referenceId` des mouvements de stock

