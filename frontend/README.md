# Headsit — Frontend React

Application de gestion commerciale pour petits commerçants.

## Pages incluses
- `/login` — Connexion
- `/register` — Inscription
- `/` — Dashboard (stats, graphique, dernières commandes)
- `/produits` — CRUD produits + alertes stock
- `/commandes` — Liste, filtre par statut, changement de statut
- `/live` — Mode live avec Socket.io
- `/rapports` — Graphiques et analytics

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev
# → http://localhost:5173

# 3. Build production
npm run build
```

## Configuration

Le frontend proxifie `/api` vers `http://localhost:3000` (le backend).
Assure-toi que le backend est démarré avant le frontend.

## Stack
- React 18 + Vite
- React Router v6
- Axios (appels API)
- Recharts (graphiques)
- Socket.io-client (live)
- Lucide React (icônes)
