# Guide de test - Ajouter à Todo/Sprint

## 🎯 Fonctionnalités implémentées

Vous pouvez désormais ajouter facilement des tickets et tâches à votre todo list ou sprint en cours depuis plusieurs endroits.

## 🧪 Plan de test complet

### ✅ Test 1 : Création de ticket avec options (TicketsList.vue)

1. Allez dans **"Tous les Tickets"** → Cliquez sur **"+ Nouveau Ticket"**
2. Remplissez le formulaire :
   - Projet : Sélectionnez un projet avec un sprint actif
   - Titre : "Mon ticket de test"
   - Description : Optionnel
   - Statut et Priorité : Vos choix
3. **Cochez les deux options** :
   - ☑️ "📋 Ajouter aussi à la todo"
   - ☑️ "🏃 Ajouter au sprint en cours"
4. Cliquez sur **"Enregistrer"**

**Résultats attendus** :
- ✅ Confirmation : "✅ Ticket créé (todo + sprint en cours)"
- ✅ Le formulaire se réinitialise avec les options décochées
- ✅ Le ticket apparaît dans la liste
- ✅ Une todo est créée avec le texte `[TICKET] Mon ticket de test`
- ✅ Le ticket est ajouté au sprint actif du projet

### ✅ Test 2 : Création de ticket avec options (ProjectDetail.vue)

1. Allez dans **"Projets"** → Sélectionnez un projet avec un sprint actif
2. Dans la section "Tickets du projet" → Cliquez sur **"+ Nouveau Ticket"**
3. Remplissez le formulaire :
   - Titre : "Ticket du projet"
   - Description : Optionnel
4. **Cochez les deux options** :
   - ☑️ "📋 Ajouter aussi à la todo"
   - ☑️ "🏃 Ajouter au sprint en cours"
5. Cliquez sur **"Enregistrer"**

**Résultats attendus** :
- ✅ Confirmation affichée
- ✅ Ticket créé dans le projet
- ✅ Todo créée
- ✅ Ticket ajouté au sprint

### ✅ Test 3 : Ajouter un ticket existant à la todo

1. Allez dans **"Tous les Tickets"** ou dans les détails d'un **"Projet"**
2. Ouvrez un ticket en cliquant sur **"👁️ Voir"** ou en cliquant sur le titre
3. En haut de la page, vous devriez voir le bouton **"📋 Ajouter à la todo"**
4. Cliquez dessus

**Résultats attendus** :
- ✅ Confirmation : "✅ Ticket ajouté à la todo list !"
- ✅ Le bouton devient grisé (disparaît) car le ticket est maintenant en todo
- ✅ En bas du ticket, affichage : "• Planifié en todo le [date d'aujourd'hui]"
- ✅ Une todo est créée avec le format `[TICKET] {titre du ticket}`

**Cas d'erreur** :
- Si vous cliquez à nouveau : "Ce ticket est déjà présent dans votre todo list."

### ✅ Test 4 : Ajouter un ticket existant au sprint en cours

1. Ouvrez un ticket (même processus que Test 3)
2. En haut de la page, vous devriez voir le bouton **"🏃 Ajouter au sprint en cours"**
   - Si bouton grisé/absent : Aucun sprint actif pour ce projet
3. Cliquez sur le bouton

**Résultats attendus** :
- ✅ Confirmation : "✅ Ticket ajouté au sprint en cours !"
- ✅ Le bouton devient grisé (disparaît)
- ✅ En bas du ticket, affichage : "• Dans le sprint en cours"
- ✅ Le ticket apparaît dans la vue Sprint (si vous avez la page Sprint)

**Cas d'erreur** :
- Si vous cliquez à nouveau : "Ce ticket est déjà ajouté au sprint en cours."

### ✅ Test 5 : Ajouter une tâche Odoo au sprint en cours

**Prérequis** : Odoo doit être configuré avec un projet et ses tâches synchronisées

1. Allez dans **"Tâches Odoo"** (globales) ou dans la section **"Tâches Odoo"** d'un projet
2. Cliquez sur **"👁️ Voir"** pour ouvrir les détails d'une tâche
3. En haut de la page, vous devriez voir le bouton **"🏃 Ajouter au sprint en cours"**
4. Cliquez dessus

**Résultats attendus** :
- ✅ Un ticket est créé automatiquement avec le titre : `[TÂCHE ODOO #${odooId}] ${taskTitle}`
- ✅ Ce ticket est ajouté au sprint en cours
- ✅ Confirmation affichée
- ✅ Le ticket apparaît maintenant dans la liste des tickets du projet

**Détail important** : Si vous cliquez à nouveau, le système utilisera le ticket déjà créé au lieu d'en créer un nouveau.

### ✅ Test 6 : Ajouter une tâche Odoo à la todo (Liste Odoo)

1. Allez dans **"Tâches Odoo"** → Trouvez une tâche sans todo
2. Cliquez sur le bouton **"📋 Todo"**

**Résultats attendus** :
- ✅ Confirmation : "✅ Tâche Odoo ajoutée à la todo list !"
- ✅ Le bouton disparaît
- ✅ La todo est créée avec le format `[TÂCHE ODOO #${odooId}] ${title}`

### ✅ Test 7 : Réinitialisation des formulaires

1. Ouvrez le formulaire de création de ticket (TicketsList ou ProjectDetail)
2. Cochez les deux options
3. Cliquez sur **"Annuler"**

**Résultats attendus** :
- ✅ Le formulaire se ferme
- ✅ Les options sont décochées quand vous rouvrez le formulaire

## 🔍 Vérifications supplémentaires

### Vérifier les todos créées

1. Allez dans **"Todo du jour"**
2. Vous devriez voir les todos créées avec les formats :
   - `[TICKET] {titre}`
   - `[TICKET ODOO #id] {titre}`
   - `[TÂCHE ODOO #id] {titre}`

### Vérifier les sprints mis à jour

1. Allez dans **"Sprints"** → Sélectionnez un sprint actif
2. Basculez en vue **"📊 Kanban"**
3. Vous devriez voir les tickets dans la première colonne (À faire)
4. Les tickets ajoutés doivent y apparaître

### Vérifier la base de données

Ouvrez la console et exécutez :
```javascript
// Voir toutes les todos
await db.getAllTodos()

// Voir tous les tickets
await db.getAllTickets()

// Voir les sprints d'un projet
await db.getSprintsByProject(projectId)

// Voir un ticket spécifique
await db.getTicket(ticketId)
```

## 🐛 Dépannage

### Le bouton "Ajouter au sprint" est grisé
- **Cause** : Aucun sprint actif pour le projet
- **Solution** : Créez ou activez un sprint dans le projet

### Les options du formulaire ne sauvegardent pas
- **Cause** : Le formulaire se réinitialise après l'enregistrement (comportement normal)
- **Solution** : Aucune action requise

### La todo n'est pas créée
- **Cause** : Peut-être qu'elle existe déjà (même texte)
- **Solution** : Vérifiez dans "Todo du jour" si elle existe

### Impossible de cliquer deux fois sur le même ticket
- **Cause** : Comportement normal, les boutons deviennent grisés une fois l'action effectuée
- **Solution** : Rechargez la page pour voir la mise à jour

## ✨ Cas d'usage typiques

### Cas 1 : Créer rapidement un ticket et l'ajouter au sprint + todo
1. TicketsList → Nouveau Ticket
2. Cocher les deux options
3. Créer
→ Gain de temps : 1 action au lieu de 3

### Cas 2 : Convertir une tâche Odoo en ticket local sprint
1. OdooTaskDetail → Ajouter au sprint en cours
2. Le ticket est créé et ajouté automatiquement
→ Gain de temps : Le lien est automatique

### Cas 3 : Planifier les tâches du jour
1. Vue tickets
2. Cliquer sur "📋 Ajouter à la todo" pour les tâches prioritaires
→ Gain de productivité : Planning rapide

## 📱 Support mobile

Les checkboxes et boutons sont responsifs et accessibles sur mobile.

---

**Bon usage ! 🚀**

