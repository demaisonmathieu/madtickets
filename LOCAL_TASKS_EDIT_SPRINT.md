# Modifier une Tâche Locale depuis un Sprint

## 📋 Vue d'ensemble

Vous pouvez maintenant modifier une tâche locale directement depuis la vue de sprint. Les tâches locales affichent l'icône ✅ et offrent plusieurs façons de les éditer.

## 🎯 Comment modifier une tâche locale depuis un sprint

### Méthode 1 : Via la vue liste (recommandée pour la modification rapide)

1. **Ouvrir le détail du sprint** :
   - Allez dans "Sprints" 
   - Cliquez sur le bouton "📋 Détails" d'un sprint

2. **Accéder à la section des tâches locales** :
   - Dans le modal du sprint, cherchez la section "🎫 Tickets associés"
   - Cliquez sur le bouton "📋 Liste" pour activer la vue liste
   - Les tâches locales sont affichées dans une section distincte (✅ Tâches locales)

3. **Modifier la tâche** :
   - Cliquez sur le **titre de la tâche** (affichée en bleu) pour l'ouvrir
   - OU cliquez sur le bouton **✏️ Modifier**
   - Cela ouvrira la page complète de modification de la tâche

### Méthode 2 : Via la vue Kanban (pour le changement de statut rapide)

1. **Ouvrir le détail du sprint**
2. **Accéder à la vue Kanban** :
   - Cliquez sur le bouton "📊 Kanban" 
   - Les tâches locales s'affichent avec l'icône ✅

3. **Modifier la tâche** :
   - Cliquez sur le **titre de la tâche locale** pour ouvrir sa page d'édition complète
   - Vous pouvez aussi **faire glisser la tâche** entre les colonnes pour changer son statut rapidement

## 🔧 Page de modification complète

Une fois dans la page d'édition de la tâche locale (`/local-tasks/:id`), vous pouvez :

- **✏️ Modifier le titre** et la description
- **Changer de projet** 
- **Changer le statut** (colonnes Kanban personnalisées du projet)
- **Définir la priorité** (Basse, Moyenne, Haute)
- **Estimer le temps** (heures)
- **Planifier les dates** (début et fin)
- **Marquer comme chiffrage** (pour l'export de chiffrage)
- **Marquer comme complète** via la checkbox

## ✨ Améliorations apportées

✅ **Clic sur le titre** : Les tâches locales deviennent cliquables dans le sprint  
✅ **Bouton ✏️ Modifier** : Accès rapide à la page d'édition  
✅ **Consistency** : Même expérience que les tickets (les deux affichent un bouton ✏️)  
✅ **Navigation intuitive** : Le bouton "Retour" vous ramène au sprint  
✅ **Drag & drop** : Continuez à utiliser le drag-and-drop pour changer le statut  

## 💡 Cas d'usage

### Exemple 1 : Modifier une tâche du sprint
```
1. Sprint "Q2 2026" → Détails
2. Vue Liste → Tâches locales
3. Cliquer sur "Refactoriser la base de données"
4. Modifier le temps estimé et les dates
5. Enregistrer
```

### Exemple 2 : Rapidement changer de statut + éditer
```
1. Vue Kanban du sprint
2. Glisser la tâche de "À faire" à "En cours" (drag-drop)
3. Cliquer sur la tâche pour l'ouvrir
4. Modifier les détails
5. Enregistrer
```

## 🔗 Routes ajoutées

- `/local-tasks/:id` - Page d'édition complète d'une tâche locale

## 🔐 Sécurité

- Les vérifications d'accès aux projets s'appliquent aussi aux tâches locales
- Vous ne pouvez modifier que les tâches des projets auxquels vous avez accès

## 📝 Notes

- Les tâches locales créées ou liées à un sprint depuis la Todo List peuvent maintenant être éditées depuis le sprint
- Le lien vers le sprint est conservé dans la page d'édition (vous pouvez revenir facilement)
- Tous les champs sont éditables sauf l'ID et les dates de création/modification

