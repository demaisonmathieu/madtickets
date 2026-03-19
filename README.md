# Gestion de Projets & Tickets - PWA

Application Progressive Web App (PWA) pour gérer vos projets, tickets et todolist quotidienne.

## 🚀 Fonctionnalités

- ✅ **Gestion de projets** : Créez et organisez vos projets avec statuts et descriptions
- 🎫 **Gestion de tickets** : Suivez vos tickets par projet avec priorités et statuts
- 📝 **Todolist quotidienne** : Gérez vos tâches du jour avec statistiques de progression
- 💾 **Stockage local** : Toutes les données sont stockées localement avec IndexedDB (pas besoin de serveur)
- 📱 **PWA** : Installez l'application sur votre appareil et utilisez-la hors ligne

## 🛠️ Technologies

- **Vue.js 3** - Framework JavaScript
- **Vue Router** - Navigation
- **IndexedDB** (via idb) - Base de données locale
- **Vite** - Build tool
- **vite-plugin-pwa** - Configuration PWA

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Compiler pour la production
npm run build

# Prévisualiser la version de production
npm run preview
```

## 🎯 Utilisation

1. **Projets** : Créez vos projets et suivez leur statut (Actif, En pause, Terminé)
2. **Tickets** : Ajoutez des tickets à vos projets avec priorités et descriptions
3. **Todo du jour** : Gérez vos tâches quotidiennes avec suivi de progression

## 📱 Installation PWA

Une fois l'application lancée :
- Sur Chrome/Edge : Cliquez sur l'icône "Installer" dans la barre d'adresse
- Sur mobile : Ajoutez à l'écran d'accueil depuis le menu du navigateur

## 💾 Données

Toutes vos données sont stockées localement dans votre navigateur via IndexedDB. Elles persistent entre les sessions et sont disponibles hors ligne.

## 📝 Structure

```
src/
├── components/          # Composants Vue
│   ├── ProjectsList.vue
│   ├── ProjectDetail.vue
│   ├── TicketsList.vue
│   └── TodoList.vue
├── services/
│   └── database.js      # Service IndexedDB
├── App.vue              # Composant principal
└── main.js              # Point d'entrée
```

## 🔧 Développement

L'application utilise :
- **IndexedDB** pour le stockage persistant
- **Service Worker** pour le mode hors ligne
- **Manifest** pour l'installation PWA

Aucune infrastructure backend n'est nécessaire !
