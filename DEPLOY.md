# Déploiement Manage PME (Docker + Render)

## Prérequis

- Compte [Render](https://render.com)
- Repo GitHub/GitLab avec ce projet

---

## Déployer sur Render avec le Blueprint

1. **Pousser le code sur GitHub**
   - Créez un repo et poussez le projet (avec `Dockerfile`, `render.yaml`, `docker-compose.yml`).

2. **Connecter Render**
   - Allez sur [dashboard.render.com](https://dashboard.render.com)
   - **New +** → **Blueprint**
   - Connectez votre repo GitHub et sélectionnez le repo contenant `render.yaml`

3. **Appliquer le Blueprint**
   - **Important** : laissez **Root Directory** vide (ou `.`) pour que Render utilise le `Dockerfile` à la racine du repo et inclue le frontend dans l’image.
   - Render détecte `render.yaml` et crée :
     - une base **PostgreSQL** (`manage-pme-db`)
     - un **Web Service** Docker (`manage-pme`) qui build l’image et exécute les migrations au démarrage
   - La variable `DATABASE_URL` est injectée automatiquement depuis la base.

4. **Variables optionnelles**
   - Dans le service **manage-pme** → **Environment** vous pouvez ajouter :
     - `FRONTEND_URL` : si vous utilisez un domaine personnalisé pour le front (CORS).
   - `JWT_SECRET` est généré automatiquement par le Blueprint.

5. **URL de l’application**
   - Après le déploiement : `https://manage-pme-xxxx.onrender.com`
   - L’API est sous `/api`, le front est servi à la racine (SPA).

---

## Docker en local

### Option A : tout en Docker (backend + DB)

```bash
# À la racine du projet
docker compose up --build
```

- Backend + front (build intégré) : **http://localhost:3000**
- PostgreSQL : `localhost:5432` (user: `postgres`, password: `postgres`, db: `manage_pme`)

Pour le dev frontend en hot-reload, lancez en plus :

```bash
npm run dev:frontend
```

et utilisez **http://localhost:5173** (proxy vers l’API sur le port 3000).

### Option B : DB en Docker, backend + front en local

```bash
docker compose up db -d
cd backend && npm run start:dev
# autre terminal
cd frontend && npm run dev
```

Créez un fichier `backend/.env` avec :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manage_pme
```

---

## Build manuel de l’image Docker

```bash
docker build -t manage-pme .
docker run --rm -p 3000:3000 -e DATABASE_URL=postgresql://... manage-pme
```

---

## Fichiers concernés

| Fichier            | Rôle |
|--------------------|------|
| `Dockerfile`       | Build front (Vite) + backend (Nest), image de prod avec client servi par Nest |
| `docker-compose.yml` | Dev local : service `backend` (Docker) + PostgreSQL |
| `render.yaml`     | Blueprint Render : PostgreSQL + Web Service Docker |
| `.dockerignore`   | Réduire le contexte Docker (exclut `node_modules`, etc.) |
