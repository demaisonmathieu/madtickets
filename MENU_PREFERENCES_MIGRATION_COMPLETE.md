# ✅ Migration des préférences de menu vers PostgreSQL - COMPLÈTE

## 📋 Résumé

Migration réussie du système de gestion des préférences de menu de **localStorage** (local par navigateur) vers **PostgreSQL** (centralisé par utilisateur) pour une meilleure persistance multi-device.

## 🎯 Objectif atteint

"Fait en sorte que l'affichage du menu ne soit plus géré en local mais en psql"

**Statut**: ✅ **COMPLÈTE** (code côté frontend et backend implémenté, prêt au déploiement complet)

## 📝 Changements effectués

### 1. ✅ Schéma PostgreSQL (server/schema.sql)
```sql
CREATE TABLE user_menu_preferences (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Impact**: 
- Table créée avec clé étrangère vers `users`
- Stockage JSONB pour flexibilité des structures menu
- Suppression automatique en cascade si utilisateur supprimé
- Timestamp de mise à jour auto

### 2. ✅ Fonctions serveur (server/index.js)

#### Fonctions de service
- `normalizeMenuPreferences(input)` - Valide et normalise les données menu
- `mapUserMenuPreferences(row)` - Mappe les données PostgreSQL vers objet TypeScript
- `getUserMenuPreferences(userId)` - Récupère les préférences utilisateur
- `saveUserMenuPreferences(userId, preferences)` - Sauvegarde avec UPSERT

#### Méthodes RPC exposées
- `case 'getUserMenuPreferences'` - Récupère les prefs d'un utilisateur
- `case 'saveUserMenuPreferences'` - Sauvegarde les prefs d'un utilisateur

#### Intégration data export/import
- `clearAllData()` - Ajoute `TRUNCATE user_menu_preferences`
- `exportDatabaseSnapshot()` - Inclut `menuPreferences` array
- `importDatabaseSnapshot()` - Restaure menuPreferences avec UPSERT
- `ensureProjectExtraColumns()` - Crée la table au démarrage du serveur

### 3. ✅ Modèle TypeScript (src/services/database-new.ts)

#### Interface TypeScript
```typescript
interface MenuPreferences {
  userId: number
  customMainMenuItems: any[]
  menuOrder: string[]
  hiddenMenuItemIds: string[]
  submenuOrder: { [parentId: string]: string[] }
  hiddenSubmenuItemIds: string[]
  menuParentMap: { [itemId: string]: string | null }
  updatedAt?: string
}
```

#### Schéma IndexedDB
- Ajout de store `menuPreferences` avec `keyPath: 'userId'` (DB version 17)
- Permet cache local et sync avec backend

#### Méthodes DatabaseService (local IndexedDB)
- `getUserMenuPreferences(userId: number)` - Récupère du cache local
- `saveUserMenuPreferences(userId: number, preferences)` - Sauvegarde cache local

#### Méthodes RemoteDatabaseService (RPC)
- `getUserMenuPreferences(userId: number)` - Appelle RPC `getUserMenuPreferences`
- `saveUserMenuPreferences(userId: number, preferences)` - Appelle RPC `saveUserMenuPreferences`

### 4. ✅ Composant principal (src/App.vue)

**Avant** (localStorage):
```javascript
mounted() {
  this.loadMenuPreferences()
},
methods: {
  getMenuStorageKey(kind) {
    const userId = this.currentUser?.userId || 'anon'
    return `tickets.menu.${kind}.${userId}`
  },
  loadMenuPreferences() {
    const storedOrder = localStorage.getItem(this.getMenuStorageKey('order'))
    // ...
  },
  saveMenuPreferences() {
    localStorage.setItem(this.getMenuStorageKey('order'), JSON.stringify(this.menuOrder))
    // ...
  }
}
```

**Après** (Database):
```javascript
async mounted() {
  await this.loadMenuPreferences()
},
methods: {
  async loadMenuPreferences() {
    const userId = Number(this.currentUser?.userId)
    if (!Number.isFinite(userId) || userId <= 0) return
    
    const { db } = await import('../services/database-new')
    const stored = await db.getUserMenuPreferences(userId)
    this.menuOrder = Array.isArray(stored?.menuOrder) ? stored.menuOrder : [...]
    // ...
  },
  async saveMenuPreferences() {
    const userId = Number(this.currentUser?.userId)
    const { db } = await import('../services/database-new')
    await db.saveUserMenuPreferences(userId, {
      menuOrder: this.menuOrder,
      // ...
    })
  }
}
```

**Bénéfices**:
- ✅ Removal de tous les appels `localStorage`
- ✅ Conversion en async/await pour les opérations DB
- ✅ Gestion d'erreur robuste avec try/catch
- ✅ Support multi-user avec userId comme clé

### 5. ✅ Composant configuration menu (src/components/MenuConfiguration.vue)

**Changements identiques à App.vue**:
- ❌ Suppression de `getMenuStorageKey(kind)` 
- ✅ Conversion `loadMenuPreferences()` en async
- ✅ Conversion `saveMenuPreferences()` en async
- ✅ Import dynamique de database-new
- ✅ Appels à `db.getUserMenuPreferences()` et `db.saveUserMenuPreferences()`
- ✅ Validation du userId avec Number.isFinite()

## 🏗️ Architecture résultante

```
User Browser
    ↓
Vue Components (App.vue, MenuConfiguration.vue)
    ↓
database-new.ts (DatabaseService / RemoteDatabaseService)
    ↓
  ┌─────────────────────────────────┐
  │ Option 1: Mode Offline         │
  │ IndexedDB (menuPreferences)    │
  │ Cache local avec fallback       │
  └─────────────────────────────────┘
    ↓
  ┌─────────────────────────────────┐
  │ Option 2: Mode Online          │
  │ RPC Call → server/index.js     │
  │ → PostgreSQL user_menu_prefs   │
  └─────────────────────────────────┘
```

**Avantages**:
- ✅ Offline-first: données en cache local IndexedDB
- ✅ Sync multi-device: via PostgreSQL centralisé
- ✅ Multi-user: isolation par userId
- ✅ Persistant: survit au crash navigateur et redémarrage serveur
- ✅ Fallback: utilise defaults si données corrompues

## 📋 Checklist de déploiement

### Frontend ✅
- [x] Refactoriser App.vue
- [x] Refactoriser MenuConfiguration.vue
- [x] Ajouter MenuPreferences interface à database-new.ts
- [x] Implementer DatabaseService.getUserMenuPreferences/saveMenuPreferences
- [x] Implementer RemoteDatabaseService avec RPC delegation
- [x] Incrementer DB_VERSION à 17
- [x] Compiler avec `npm run build` (SUCCESS)
- [x] Déployer dist/ vers VPS

### Backend ✅
- [x] Ajouter table user_menu_preferences au schéma
- [x] Implementer normalizeMenuPreferences()
- [x] Implementer mapUserMenuPreferences()
- [x] Implementer getUserMenuPreferences(userId)
- [x] Implementer saveUserMenuPreferences(userId, prefs)
- [x] Ajouter RPC cases pour les deux méthodes
- [x] Mettre à jour clearAllData()
- [x] Mettre à jour exportDatabaseSnapshot()
- [x] Mettre à jour importDatabaseSnapshot()
- [x] Mettre à jour ensureProjectExtraColumns() pour créer la table

### Déploiement 
- [ ] Redémarrer le serveur Node.js (systemctl restart tickets-api)
- [ ] Vérifier que la table est créée (ensureProjectExtraColumns() au startup)
- [ ] Tester avec curl: `{"method":"getUserMenuPreferences","params":[1]}`

### Tests
- [ ] Se connecter et modifier les préférences menu
- [ ] Recharger la page → vérifier persistence
- [ ] Ouvrir un autre navigateur → vérifier sync multi-device
- [ ] Déconnecter/reconnecter → vérifier offline cache
- [ ] Ajouter/enlever un utilisateur → vérifier isolation

## 🔄 Flux de synchronisation

### Lors du chargement (mounted)
1. App.vue appelle `loadMenuPreferences()`
2. `await db.getUserMenuPreferences(userId)` 
   - Option A (offline): Retourne IndexedDB si disponible
   - Option B (online): Appelle RPC → PostgreSQL
3. Normalise les données avec fallback aux defaults
4. Met à jour l'état Vue

### Lors d'une modification
1. Utilisateur change un paramètre menu (ordre, visibilité, etc)
2. `saveMenuPreferences()` appelé
3. Validation du userId
4. `await db.saveUserMenuPreferences(userId, {menuOrder, ...})`
   - Option A (offline): Stocke dans IndexedDB
   - Option B (online): Appelle RPC → PostgreSQL UPSERT
5. Retour avec succès/erreur

## ⚠️ Points d'attention

1. **Pas de localStorage** - Complètement supprimé, utiliser db service
2. **Async/await** - Toutes les méthodes save/load sont async
3. **userId validation** - Vérifier que userId est un nombre valide > 0
4. **Fallback robuste** - Si userId invalide, utiliser defaults au lieu de crasher
5. **Table PostgreSQL** - Crée automatiquement au startup via ensureProjectExtraColumns()
6. **Suppression en cascade** - Si utilisateur supprimé, ses prefs menu sont aussi supprimées

## 📊 Impact sur utilisateurs

### ✅ Avant (localStorage)
- Prefs menu stockées dans le navigateur
- Données perdues si cache vidé ou autre navigateur
- Per-browser, per-device

### ✅ Après (PostgreSQL)
- Prefs menu stockées sur le serveur
- Persistant à travers sessions
- Accessibles depuis tous les appareils
- Multi-user isolation
- Sync automatique

## 🚀 Prochaines étapes

1. **Redémarrer le serveur** sur VPS pour charger nouveau index.js
2. **Tester les RPC methods** avec curl
3. **Vérifier la table PostgreSQL** existe
4. **Navigateur test**: Modifier menu → Recharger → Vérifier persistence
5. **Multi-device**: Ouvrir sur 2e appareil → Vérifier sync
6. **Admin**: Vérifier isolation multi-user dans DB

## 📚 Fichiers modifiés

```
✅ server/schema.sql - Table user_menu_preferences
✅ server/index.js - 8 modifications (CRUD + RPC + export/import)
✅ src/services/database-new.ts - 6 modifications (version, interface, store, methods)
✅ src/App.vue - 5 modifications (removed getMenuStorageKey, async methods)
✅ src/components/MenuConfiguration.vue - 3 modifications (removed getMenuStorageKey, async methods)
✅ Frontend build - npm run build SUCCESS
✅ Frontend deployed - dist/ → VPS /var/www/tickets-app/dist/
```

## 🔗 Références

- [Index.js server RPC handlers](server/index.js) - Voir `case 'getUserMenuPreferences'` et `case 'saveUserMenuPreferences'`
- [Database service layer](src/services/database-new.ts) - Voir interface MenuPreferences et méthodes
- [App.vue async loading](src/App.vue) - Voir `async mounted()` et `async loadMenuPreferences()`
- [MenuConfiguration.vue](src/components/MenuConfiguration.vue) - Voir refactorisation identique

---

**Date**: 2024-12-20  
**Statut**: ✅ Code complet, prêt à redémarrer serveur et tester
