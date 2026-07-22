# 🛍️ Headsit — Application de gestion commerciale

Application tout-en-un pour petits commerces : stock, commandes, live commerce, dashboard.

## 🏗️ Structure du projet

```
headsit/
├── backend/    → API Node.js + Express + PostgreSQL + Socket.io
└── frontend/   → Interface React + Vite
```

---

## ⚡ Démarrage rapide (5 étapes)

### Prérequis
- Node.js 18+ → https://nodejs.org
- PostgreSQL 14+ → https://postgresql.org
- VS Code → https://code.visualstudio.com

---

### Étape 1 — Ouvrir dans VS Code
```bash
# Ouvrir le dossier headsit dans VS Code
code .
```

### Étape 2 — Installer PostgreSQL et créer la base
```bash
# Sur Ubuntu/Mac
createdb headsit

# Créer les tables
psql -d headsit -f backend/schema.sql
```

### Étape 3 — Configurer le backend
```bash
cd backend
cp .env.example .env
```
Éditer `.env` :
```
PORT=3000
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/headsit
JWT_SECRET=headsit_secret_super_long_2026
JWT_EXPIRES_IN=7d
NODE_ENV=development
FB_VERIFY_TOKEN=headsit_verify_2026
```

### Étape 4 — Lancer le backend
```bash
cd backend
npm install
npm run dev
# ✅ API disponible sur http://localhost:3000
# Tester : http://localhost:3000/api/health
```

### Étape 5 — Lancer le frontend
```bash
# Nouveau terminal
cd frontend
npm install
npm run dev
# ✅ App disponible sur http://localhost:5173
```

---

## 🧪 Tester l'application

1. Ouvrir http://localhost:5173
2. Créer un compte → "Amina", "amina@test.com", "password123", "Boutique Amina"
3. Ajouter des produits dans l'onglet Produits
4. Créer des commandes
5. Tester le live avec le simulateur de commentaires intégré

---

## 📡 Routes API disponibles

| Méthode | Route | Description |
|---|---|---|
| POST | /api/auth/register | Créer un compte |
| POST | /api/auth/login | Connexion |
| GET | /api/produits | Lister les produits |
| POST | /api/produits | Créer un produit |
| PUT | /api/produits/:id | Modifier un produit |
| DELETE | /api/produits/:id | Supprimer un produit |
| GET | /api/commandes | Lister les commandes |
| POST | /api/commandes | Créer une commande |
| PATCH | /api/commandes/:id/statut | Changer le statut |
| GET | /api/dashboard | Stats du dashboard |
| POST | /api/live/demarrer | Démarrer un live |
| POST | /api/live/:id/terminer | Terminer un live |
| GET | /api/live/historique | Historique des lives |
| POST | /api/webhooks/simuler | Simuler un commentaire |

---

## 🔧 Extensions VS Code recommandées

Installer ces extensions pour le développement :
- **ESLint** — Vérification du code
- **Prettier** — Formatage automatique
- **Thunder Client** — Tester les API (comme Postman)
- **GitLens** — Gestion Git avancée
- **PostgreSQL** (par Chris Kolkman) — Voir la base de données

---

## 📋 Ce qui reste à faire (pour l'associé)

- [ ] Export PDF et Excel des rapports
- [ ] Intégration Mobile Money (Orange Money, MTN, Wave)
- [ ] Connexion réelle Facebook/Instagram (OAuth)
- [ ] Notifications SMS/WhatsApp aux clients
- [ ] Mode hors-ligne (PWA)
- [ ] Application mobile React Native
- [ ] Multi-boutiques par utilisateur

---

## 🏛️ Architecture

```
Frontend React (port 5173)
        ↓ proxy /api
Backend Express (port 3000)
        ↓
PostgreSQL (port 5432)
        +
Socket.io (temps réel live)
```

Développé avec ❤️ — Stack: React, Node.js, Express, PostgreSQL, Socket.io
