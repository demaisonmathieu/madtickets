# 🆕 Tâches Locales - Documentation

## 🎯 Qu'est-ce que c'est ?

Vous pouvez maintenant créer des **tâches locales** directement dans l'app, sans les synchroniser depuis Odoo. C'est parfait pour :
- Les tâches qui n'existent que localement
- Les tâches de suivi personnelles
- Les tâches à court terme
- Les tâches bloquantes non-Odoo

## 🚀 Comment utiliser

### 1️⃣ Accéder aux tâches locales

1. **Projets** → Sélectionner un projet
2. Cliquer sur l'onglet **"✅ Tâches Locales"**

### 2️⃣ Créer une tâche locale

1. Cliquer **"+ Nouvelle Tâche Locale"**
2. Remplir le formulaire :
   - **Titre** (obligatoire)
   - **Description** (optionnel)
   - **Statut** : À faire, En cours, Terminé
   - **Priorité** : Basse, Moyenne, Haute
3. Cliquer **"Enregistrer"**

### 3️⃣ Gérer une tâche locale

- **Éditer** : Cliquer ✏️
- **Supprimer** : Cliquer 🗑️

## 📊 Données affichées

Pour chaque tâche locale, vous voyez :
- ✅ Badge "Tâche Locale" (vert)
- Status avec couleur
- Priorité avec couleur
- Date de création
- Durée (si enregistrée)

## 💾 Stockage

Les tâches locales sont stockées dans IndexedDB, table `localTasks` avec :
- `id` : ID unique
- `projectId` : Projet parent
- `title` : Titre
- `description` : Description HTML
- `status` : Statut (todo, in-progress, done)
- `priority` : Priorité (low, medium, high)
- `timeTotalMinutes` : Durée totale enregistrée
- `createdAt` : Date de création
- `updatedAt` : Date de mise à jour

## 🔄 Différences avec les tâches Odoo

| Aspect | Tâches Odoo | Tâches Locales |
|--------|-------------|----------------|
| **Source** | Synchronisées depuis Odoo | Créées localement |
| **Modification** | Lecture seule (sauf temps) | Editable |
| **Suppression** | Possible (efface lien) | Supprime la tâche |
| **Badge** | "Tâche Odoo" (bleu) | "Tâche Locale" (vert) |
| **Sync temps** | Vers Odoo | Local uniquement |
| **ID Odoo** | Oui (odooId) | Non |

## 📱 Interface

### Onglets du projet

```
🎫 Tickets | 🧩 Tâches Odoo | ✅ Tâches Locales
```

Sélectionnez **"✅ Tâches Locales"** pour voir vos tâches locales.

### Formulaire de création

```
Titre *        [_______________]
Description    [_______________]
Statut         [À faire ▼]
Priorité       [Moyenne ▼]

[Enregistrer] [Annuler]
```

### Liste des tâches

```
✅ Tâche Locale | À faire | Moyenne
Titre de la tâche
Description...
Créé le 12/03/2026

[✏️ Éditer] [🗑️ Supprimer]
```

## 🎨 Couleurs

- **Badge Tâche Locale** : Vert (badge-success)
- **Status À faire** : Jaune (badge-warning)
- **Status En cours** : Bleu (badge-info)
- **Status Terminé** : Vert (badge-success)
- **Priorité Basse** : Bleu (badge-info)
- **Priorité Moyenne** : Orange (badge-warning)
- **Priorité Haute** : Rouge (badge-danger)

## 💡 Cas d'utilisation

### Planning personnel
- Créer des tâches pour votre to-do personnel
- Non connectée aux projets Odoo

### Tâches bloquantes
- Identifier les blocages
- Suivre les résolutions

### Suivi court terme
- Tâches de sprint local
- Tâches de sprint personnalisées

### Intégration progressive
- Créer les tâches localement d'abord
- Les synchroniser avec Odoo plus tard si besoin

## 🔍 API / Base de données

### Méthodes disponibles

```javascript
// Récupérer toutes les tâches locales
await db.getAllLocalTasks()

// Récupérer les tâches d'un projet
await db.getLocalTasksByProject(projectId)

// Récupérer une tâche
await db.getLocalTask(taskId)

// Ajouter une tâche
await db.addLocalTask({
  projectId: 1,
  title: "Ma tâche",
  description: "Description",
  status: "todo",
  priority: "medium"
})

// Mettre à jour une tâche
await db.updateLocalTask(taskId, {
  status: "done",
  priority: "high"
})

// Supprimer une tâche
await db.deleteLocalTask(taskId)
```

## 📝 Notes

- Les tâches locales ne sont **pas synchronisées** vers Odoo
- Vous pouvez créer/éditer/supprimer localement sans limite
- Elles persistent dans IndexedDB (même hors ligne)
- Compatible avec les filtres et recherches du projet
- Les dates sont au format ISO 8601

## 🐛 Dépannage

### Les tâches n'apparaissent pas
- Vérifiez que vous êtes sur le bon onglet "✅ Tâches Locales"
- Rafraîchissez la page (F5)
- Vérifiez que vous êtes sur le bon projet

### Je n'ai pas de bouton pour créer
- Assurez-vous d'être dans un projet (non en liste)
- Vérifiez l'onglet "✅ Tâches Locales"

### Les modifications ne persistent pas
- Vérifiez que vous avez cliqué "Enregistrer"
- Vérifiez que IndexedDB fonctionne (DevTools → Application → Storage)

---

**Version** : 1.0  
**Date** : 12 mars 2026  
**Statut** : ✅ Operationnel

