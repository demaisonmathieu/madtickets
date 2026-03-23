# Migration PostgreSQL

## Objectif

Faire évoluer l'application d'un stockage local IndexedDB vers un backend PostgreSQL afin de permettre un déploiement distant multi-utilisateur.

## Ce qui est déjà en place

- Backend Express : `server/index.js`
- Connexion PostgreSQL : `server/db.js`
- Schéma SQL initial : `server/schema.sql`
- Initialisation BDD : `server/init-db.js`
- Config frontend API : `src/services/api.ts`
- Variables d'environnement exemple : `.env.example`

## Démarrage local

1. Copier l'environnement :

```bash
cp .env.example .env
```

2. Démarrer PostgreSQL localement et créer la base `madtickets`

3. Initialiser le schéma :

```bash
npm run db:init
```

4. Lancer l'API :

```bash
npm run start:api
```

5. Lancer le frontend :

```bash
npm run dev
```

## Endpoints disponibles

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/tickets?projectId=`
- `POST /api/tickets`
- `PATCH /api/tickets/:id`
- `GET /api/time-entries?ticketId=&projectId=&userId=`
- `POST /api/time-entries`
- `PATCH /api/time-entries/:id`

## Stratégie de migration recommandée

### Phase 1 — Backend en parallèle
- Conserver IndexedDB comme fallback local
- Déployer l'API PostgreSQL
- Valider le schéma et les endpoints principaux

### Phase 2 — Lecture distante
- Remplacer progressivement `database-new.ts` par des appels HTTP pour :
  - projets
  - tickets
  - feuilles de temps
  - utilisateurs

### Phase 3 — Écriture distante
- Basculer la création / édition / suppression vers l'API
- Garder IndexedDB uniquement pour le mode offline cache si nécessaire

### Phase 4 — Auth distante
- Sortir l'authentification de `localStorage` / IndexedDB
- Ajouter sessions JWT ou cookies sécurisés côté serveur

## Point important

La migration PostgreSQL n'est pas seulement un changement de SGBD :
elle implique un passage d'une architecture PWA locale à une architecture client + API + base distante.

Le socle backend fourni ici permet d'amorcer cette transition sans casser immédiatement l'application existante.
