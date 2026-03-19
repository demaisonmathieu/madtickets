# Instructions Copilot - Gestion Tickets PWA

## 📋 Vue d'ensemble du projet

Application Progressive Web App (PWA) pour la gestion de projets, tickets, sprints et todolist quotidienne avec synchronisation Odoo.

## 🏗️ Architecture

### Technologies principales
- **Vue.js 3** avec Composition API et TypeScript
- **Vue Router** pour la navigation
- **IndexedDB** (via idb) pour le stockage local
- **Vite** comme build tool
- **PWA** avec vite-plugin-pwa et Workbox

### Structure du code
- `src/services/database.ts` - Gestion IndexedDB avec interfaces TypeScript
- `src/services/odoo.ts` - Intégration API Odoo (XML-RPC v18 et JSON-2 v19+)
- `src/components/` - Composants Vue avec Composition API
- `src/main.ts` - Entry point avec router TypeScript

## 📚 Documentation technique

Consulter ces fichiers pour comprendre les fonctionnalités spécifiques :

- **[README.md](../README.md)** - Installation, fonctionnalités, utilisation générale
- **[PWA.md](../PWA.md)** - Configuration PWA, stratégies de cache, mode offline
- **[ODOO_PROXY.md](../ODOO_PROXY.md)** - Proxy Node.js pour Odoo, contournement CORS
- **[KANBAN_CUSTOM_COLUMNS.md](../KANBAN_CUSTOM_COLUMNS.md)** - Configuration des colonnes Kanban personnalisées
- **[GENERATE_ICONS.md](../GENERATE_ICONS.md)** - Génération des icônes PWA

## 🎯 Règles de développement

### TypeScript
- Utiliser le mode strict
- Typer explicitement les interfaces (Project, Ticket, Sprint, Todo, etc.)
- Les méthodes IndexedDB retournent `Promise<IDBValidKey>` pas `Promise<number>`
- Utiliser `RouteRecordRaw` pour les routes Vue Router

### Vue.js
- Préférer la Composition API (`setup`, `ref`, `computed`, `watch`)
- Composants réactifs avec `ref()` et `reactive()`
- Utiliser `onMounted()` pour les appels asynchrones au chargement

### Base de données
- Toutes les données sont stockées en local avec IndexedDB
- Schéma : projects, tickets, todos, sprints, notes, meetingNotes, kanbanColumns
- La synchronisation Odoo est optionnelle et unidirectionnelle (Odoo → App)

### Odoo
- Support dual : XML-RPC (v18-) et JSON-2 (v19+)
- Détection automatique de version via endpoint `/web/webclient/version_info`
- Les tickets Odoo sont liés via `odooId` dans la table locale

### PWA
- Service Worker géré par vite-plugin-pwa
- Stratégies de cache : SWR pour assets, Network First pour API
- Mode offline complet avec IndexedDB

## 🔧 Conventions de code

### Nommage
- Composants Vue : PascalCase (`TicketDetail.vue`)
- Fichiers services : camelCase (`database.ts`, `odoo.ts`)
- Interfaces TypeScript : PascalCase (`Project`, `OdooTicket`)
- Variables/fonctions : camelCase

### Structure des composants
```vue
<template>
  <!-- HTML -->
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'ComponentName',
  setup() {
    // Logic
    return { /* exposed */ }
  }
}
</script>

<style scoped>
/* CSS */
</style>
```

### Gestion d'erreur
- Toujours wrapper les appels async dans try/catch
- Afficher des messages d'erreur clairs à l'utilisateur
- Logger les erreurs pour le débogage

## 📝 Bonnes pratiques

1. **Avant de modifier** : Lire la documentation technique appropriée
2. **IndexedDB** : Utiliser les fonctions de `database.ts`, ne pas accéder directement à idb
3. **Odoo** : Vérifier la version avant d'appeler les méthodes (XML-RPC vs JSON-2)
4. **Routes** : Ajouter les nouvelles routes dans `main.ts` avec le type `RouteRecordRaw`
5. **PWA** : Tester en mode production (`npm run build && npm run preview`)
6. **TypeScript** : Exécuter `npm run build` pour vérifier les erreurs de type

## 🚀 Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build production avec vérification TypeScript
- `npm run preview` - Prévisualiser le build production
- `./dev.sh` - Script exécutable pour lancer le dev

## 🔄 Synchronisation Odoo

La synchronisation avec Odoo est **unidirectionnelle** :
- Récupération des projets et tickets depuis Odoo
- Envoi de messages sur les tickets
- Pas de push automatique des données locales vers Odoo

## ⚠️ Points d'attention

- **CORS** : Odoo nécessite souvent un proxy (voir ODOO_PROXY.md)
- **TypeScript strict** : Tous les types doivent être explicites
- **IndexedDB types** : Utiliser `IDBValidKey` pour les opérations add/put
- **Vite config** : `vite.config.js` reste en JS (tsconfig.node.json avec `allowJs: true`)
- **PWA cache** : Vider le cache en dev si nécessaire (`Clear storage` DevTools)
