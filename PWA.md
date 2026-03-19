# Mode Offline & PWA

## 🚀 Fonctionnalités

Cette application est une **Progressive Web App (PWA)** avec support du mode offline complet.

### ✨ Avantages

- **📱 Installable** : Installez l'application sur votre ordinateur ou smartphone comme une app native
- **🔌 Mode offline** : Continuez à travailler sans connexion Internet
- **⚡ Performances** : Chargement ultra-rapide grâce au cache intelligent
- **🔄 Synchronisation** : Vos données locales (IndexedDB) sont toujours disponibles
- **📦 Mises à jour automatiques** : L'app se met à jour automatiquement

### 🎯 Stratégies de cache

L'application utilise différentes stratégies de mise en cache selon le type de ressource :

#### Stale While Revalidate (SWR)
- **Fichiers CSS/JS** : Affiche immédiatement depuis le cache, puis met à jour en arrière-plan
- **Pages HTML** : Toujours disponibles, même hors ligne
- Meilleur compromis entre rapidité et fraîcheur des données

#### Cache First
- **Images et assets** : Mise en cache longue durée (30 jours)
- **Polices Google Fonts** : Cache permanent (1 an)
- Optimisation maximale pour les ressources statiques

#### Network First
- **API Odoo** : Essaie d'abord le réseau, puis utilise le cache si hors ligne
- Timeout de 10 secondes avant de basculer sur le cache
- Cache de 5 minutes pour les réponses API

### 🔧 Installation

#### Sur ordinateur (Chrome, Edge)
1. Cliquez sur l'icône "Installer" dans la barre d'adresse
2. Ou utilisez le menu : Menu → Installer "Gestion Tickets"

#### Sur Android
1. Menu → Ajouter à l'écran d'accueil
2. L'application apparaîtra comme une app native

#### Sur iOS (Safari)
1. Bouton Partager (⬆️)
2. "Sur l'écran d'accueil"

### 📊 Indicateurs

L'application affiche en permanence :
- **🟢 En ligne** : Connexion Internet active
- **🔴 Hors ligne** : Mode offline activé, les données locales sont utilisées

### 💾 Données locales

Toutes vos données sont stockées localement dans IndexedDB :
- ✅ Projets
- ✅ Tickets
- ✅ Sprints
- ✅ Comptes rendus de réunion
- ✅ Todolist

**Ces données sont disponibles même sans connexion Internet !**

### 🔄 Synchronisation Odoo

⚠️ **Important** : La synchronisation avec Odoo nécessite une connexion Internet.

En mode offline :
- Vous pouvez consulter tous les projets et tickets déjà synchronisés
- Vous pouvez créer de nouveaux tickets localement
- La synchronisation reprendra automatiquement quand la connexion sera rétablie

### 🛠️ Développement

Pour activer le mode PWA en développement :

```bash
npm run dev
```

Le Service Worker est activé même en mode développement (`devOptions.enabled: true`).

### 🏗️ Build pour production

```bash
npm run build
npm run preview
```

Le build de production génère automatiquement :
- Le manifest PWA (`manifest.webmanifest`)
- Le Service Worker optimisé
- Les fichiers avec cache-busting

### 📝 Configuration

La configuration PWA se trouve dans `vite.config.js` :

```javascript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      // Configuration des stratégies de cache
    ]
  }
})
```

### 🔍 Debugging

Pour inspecter le Service Worker :
1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet "Application" (Chrome) ou "Stockage" (Firefox)
3. Section "Service Workers" pour voir le statut
4. Section "Cache Storage" pour voir le contenu du cache

### 🔐 HTTPS

En production, la PWA nécessite HTTPS (ou localhost en développement).

### 📱 Notifications

L'application peut afficher des notifications pour :
- ✨ Nouvelle version disponible
- 📱 Proposition d'installation
- ✅ Installation réussie
- 🔌 Passage en mode offline/online

### 🎨 Personnalisation

Vous pouvez personnaliser :
- Les icônes dans `public/`
- Les couleurs dans `vite.config.js` (theme_color, background_color)
- Le nom de l'app dans le manifest

## 🆘 Dépannage

### L'app ne propose pas l'installation
- Vérifiez que vous êtes en HTTPS
- Vérifiez que les icônes sont présentes
- Consultez la console pour les erreurs

### Le mode offline ne fonctionne pas
- Vérifiez que le Service Worker est enregistré (DevTools → Application)
- Vérifiez le cache dans DevTools → Application → Cache Storage
- Essayez de recharger la page (Ctrl+Shift+R)

### Les mises à jour ne s'appliquent pas
- L'application se met à jour automatiquement au rechargement
- Si nécessaire, désinstallez et réinstallez le Service Worker

## 📚 Ressources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
