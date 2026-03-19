# 🚀 Instructions de lancement et utilisation

## Démarrage rapide

### 1. Lancer le serveur de développement

```bash
cd /home/mathieu/dev/tickets
npm run dev
```

L'application démarre sur `http://localhost:5173`

### 2. Accéder à l'application

Ouvrez votre navigateur et allez sur :
- **En développement** : `http://localhost:5173`
- **Production** : Après `npm run build`

## Utilisation de la nouvelle fonctionnalité

### 📍 Accès 1 : Créer ticket + ajouter en même temps

1. Menu → **"Tous les Tickets"**
2. Bouton **"+ Nouveau Ticket"**
3. Remplissez le formulaire
4. **Cochez les options souhaitées** :
   - ☑️ 📋 Ajouter aussi à la todo
   - ☑️ 🏃 Ajouter au sprint en cours
5. Cliquez **"Enregistrer"**

### 📍 Accès 2 : Depuis les détails du projet

1. Menu → **"Projets"**
2. Cliquez sur un projet
3. Section **"Tickets du projet"** → **"+ Nouveau Ticket"**
4. Remplissez + cochez les options
5. Cliquez **"Enregistrer"**

### 📍 Accès 3 : Ajouter un ticket existant

1. Allez dans **"Tous les Tickets"** ou un projet
2. Cliquez **"👁️ Voir"** sur un ticket
3. Utilisez les boutons en haut :
   - 📋 Ajouter à la todo
   - 🏃 Ajouter au sprint en cours

### 📍 Accès 4 : Ajouter une tâche Odoo

1. Menu → **"Tâches Odoo"** ou section projet
2. Cliquez **"👁️ Voir"** sur une tâche
3. Bouton **"🏃 Ajouter au sprint en cours"**
   - Crée automatiquement un ticket lié

### 📍 Accès 5 : Ajouter tâche Odoo à todo

1. **"Tâches Odoo"** → Liste
2. Cliquez **"📋 Todo"** sur une tâche
3. Todo créée automatiquement

## 📋 Vérification des résultats

### Voir les todos créées

1. Menu → **"Todo du jour"**
2. Vous devriez voir :
   - `[TICKET] {titre}` (tickets locaux)
   - `[TICKET ODOO #id] {titre}` (tickets Odoo)
   - `[TÂCHE ODOO #id] {titre}` (tâches Odoo)

### Voir les sprints mis à jour

1. Menu → **"Sprints"**
2. Sélectionnez un sprint
3. Vue **"📊 Kanban"** ou liste
4. Vérifiez les tickets ajoutés

## 🔍 Déboguer en console

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
// Voir toutes les todos
await db.getAllTodos()

// Voir tous les tickets
await db.getAllTickets()

// Voir les sprints d'un projet
await db.getSprintsByProject(1)  // remplacez 1 par l'ID du projet

// Voir un ticket spécifique
await db.getTicket(1)  // remplacez 1 par l'ID du ticket
```

## 🧪 Checklist de test complète

- [ ] Créer ticket + cocher "todo" seule
- [ ] Créer ticket + cocher "sprint" seul
- [ ] Créer ticket + cocher les 2
- [ ] Vérifier confirmation message
- [ ] Vérifier options réinitialisées après enregistrement
- [ ] Ajouter ticket existant à todo
- [ ] Vérifier bouton devient grisé
- [ ] Ajouter ticket existant au sprint
- [ ] Vérifier affichage "Dans le sprint en cours"
- [ ] Ajouter tâche Odoo au sprint (crée ticket)
- [ ] Ajouter tâche Odoo à todo
- [ ] Vérifier todos en "Todo du jour"
- [ ] Vérifier sprints en "Sprints"

## 📚 Documentation complète

Pour plus de détails, consultez :

- **[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)** - Résumé global
- **[TEST_GUIDE.md](TEST_GUIDE.md)** - Guide de test détaillé
- **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)** - Détails techniques
- **[IMPLEMENTATION_DETAILS.md](IMPLEMENTATION_DETAILS.md)** - Architecture
- **[CODE_CHANGES.md](CODE_CHANGES.md)** - Avant/Après du code

## ⚙️ Configuration

Aucune configuration supplémentaire n'est requise. L'application fonctionne "out of the box" avec la nouvelle fonctionnalité.

### Variables d'environnement (optionnel)
```
VITE_ODOO_URL=https://votre-instance-odoo.com
VITE_ODOO_DB=nom_de_votre_base
```

## 🆘 Dépannage

### "Le bouton sprint est grisé"
→ Créez ou activez un sprint pour le projet

### "La todo n'apparaît pas"
→ Vérifiez dans "Todo du jour", elle a peut-être un texte légèrement différent

### "Les options du formulaire ne sauvegardent pas"
→ C'est normal ! Le formulaire se réinitialise après l'enregistrement

### "Je vois une erreur TypeScript au build"
→ Les erreurs peuvent être dans `odoo-new.ts` (pré-existantes)
→ Les composants modifiés n'ont pas d'erreurs

## 📦 Build production

```bash
npm run build
npm run preview
```

## 🎉 Vous êtes prêt !

Profitez de votre nouvelle fonctionnalité ! 🚀

---

**Besoin d'aide ?** Consultez les fichiers de documentation ou ouvrez la console pour déboguer.

