# Résumé des modifications - Ajouter à Todo/Sprint

## 🎯 Objectif
Permettre aux utilisateurs d'ajouter rapidement des tickets et tâches à la todo liste ou au sprint en cours depuis les différentes vues.

## ✅ Modifications effectuées

### 1. **TicketDetail.vue** - Vue de détail d'un ticket
- ✅ Ajout de 2 boutons d'action dans l'en-tête :
  - 📋 "Ajouter à la todo" (visible si le ticket n'est pas déjà en todo)
  - 🏃 "Ajouter au sprint en cours" (visible si un sprint est actif et le ticket n'y est pas déjà)
- ✅ Nouveaux propriétés data :
  - `todos: []` - liste des todos pour vérifier les doublons
  - `sprints: []` - liste des sprints du projet
- ✅ Nouvelles propriétés computed :
  - `currentSprint` - sprint actif le plus récent du projet
  - `todoItem` - todo du ticket s'il existe
  - `isInCurrentSprint` - vérifie si le ticket est dans le sprint actif
- ✅ Nouvelles méthodes :
  - `loadSprints()` - charge les sprints du projet
  - `loadTodos()` - charge toutes les todos
  - `getTodoText()` - génère le texte standardisé pour la todo
  - `addToTodoList()` - ajoute le ticket à la todo
  - `addToCurrentSprint()` - ajoute le ticket au sprint en cours

### 2. **OdooTaskDetail.vue** - Vue de détail d'une tâche Odoo
- ✅ Ajout d'un bouton d'action :
  - 🏃 "Ajouter au sprint en cours" (avec création automatique du ticket lié si nécessaire)
- ✅ Nouveaux propriétés data :
  - `tickets: []` - tickets existants pour chercher un lien
  - `sprints: []` - sprints du projet
- ✅ Nouvelles propriétés computed :
  - `taskLinkedTicket` - recherche le ticket lié à la tâche
  - `currentSprint` - sprint actif le plus récent
  - `isTaskInCurrentSprint` - vérifie si la tâche/son ticket est dans le sprint
- ✅ Nouvelle méthode :
  - `addTaskToCurrentSprint()` - crée un ticket lié ou met à jour le sprint

### 3. **TicketsList.vue** - Liste globale des tickets avec création de formulaire
- ✅ Ajout de 2 checkboxes dans le formulaire de création :
  - 📋 "Ajouter aussi à la todo"
  - 🏃 "Ajouter au sprint en cours"
- ✅ Nouvelle propriété data :
  - `formOptions: { addToTodo: false, addToCurrentSprint: false }`
  - `sprints: []` - liste des sprints
- ✅ Nouvelle propriété computed :
  - `currentSprintForSelectedProject` - sprint actif du projet sélectionné dans le formulaire
- ✅ Méthode `saveTicket()` améliorée :
  - Applique les options du formulaire lors de la création
  - Ajoute à la todo si demandé
  - Ajoute au sprint en cours si demandé
  - Affiche une confirmation avec les actions effectuées
- ✅ Méthode `cancelForm()` améliorée :
  - Réinitialise aussi les `formOptions`

### 4. **ProjectDetail.vue** - Vue de détail d'un projet
- ✅ Ajout de 2 checkboxes dans le formulaire de création de ticket :
  - 📋 "Ajouter aussi à la todo"
  - 🏃 "Ajouter au sprint en cours"
- ✅ Nouvelle propriété data :
  - `ticketFormOptions: { addToTodo: false, addToCurrentSprint: false }`
- ✅ Nouvelle propriété computed :
  - `currentSprintForSelectedProject` - sprint actif du projet (même logique que TicketsList)
- ✅ Méthode `saveTicket()` améliorée :
  - Applique les options du formulaire lors de la création (identique à TicketsList)
  - Ajoute à la todo si demandé
  - Ajoute au sprint en cours si demandé
  - Affiche une confirmation avec les actions effectuées
- ✅ Méthode `cancelTicketForm()` améliorée :
  - Réinitialise aussi les `ticketFormOptions`

### 5. **OdooTasksList.vue** - Liste des tâches Odoo
- ℹ️ Aucune modification nécessaire (liste en lecture seule, synchronisée depuis Odoo)

## 🔄 Comportements implémentés

### Création de tickets depuis TicketsList.vue ou ProjectDetail.vue
1. Utilisateur remplit le formulaire
2. Coche les options souhaitées :
   - ☑️ Ajouter à la todo → Crée une todo `[TICKET] {titre}`
   - ☑️ Ajouter au sprint en cours → Ajoute le sprintId au ticket
3. Clique sur "Enregistrer"
4. Confirmation avec les actions effectuées : "✅ Ticket créé (todo + sprint en cours)"
5. Formulaire réinitialisé, options décochées

### Actions rapides sur les tickets (TicketDetail.vue)
1. Utilisateur navigue vers les détails d'un ticket
2. Peut cliquer sur les boutons :
   - 📋 "Ajouter à la todo" → Crée una todo si elle n'existe pas
   - 🏃 "Ajouter au sprint en cours" → Ajoute au sprint actif si disponible
3. Affichage de l'état : "Dans le sprint en cours" + "Planifié en todo le [date]"

### Actions rapides sur les tâches Odoo (OdooTaskDetail.vue)
1. Utilisateur navigue vers les détails d'une tâche Odoo
2. Peut cliquer sur 🏃 "Ajouter au sprint en cours"
3. Système crée automatiquement un ticket lié avec le format `[TÂCHE ODOO #id] {titre}`
4. Ajoute ce ticket au sprint actif

## 📝 Détails techniques

### Pattern de todo text
- **Tickets locaux** : `[TICKET] {titre}`
- **Tickets Odoo** : `[TICKET ODOO #{odooId}] {titre}`
- **Tâches Odoo** : `[TÂCHE ODOO #{odooId}] {titre}`

### Déduplication
- Avant d'ajouter à la todo, on vérifie qu'elle n'existe pas déjà
- Cherche dans les todos non-complétées avec le texte exact

### Sélection du sprint
- Filtre les sprints avec `status === 'active'`
- Trie par `startDate` décroissant (le plus récent en premier)
- Retourne `null` si aucun sprint actif

### Gestion des erreurs
- Si aucun sprint actif et l'option "Ajouter au sprint" est cochée : affiche un message
- Les doublons en todo sont détectés et notifiés
- Les boutons d'action ont une visibilité conditionnelle

## 🧪 Points d'entrée à tester

1. **TicketsList.vue** → + Nouveau Ticket
   - Cocher les 2 options → Créer → Vérifier les actions
   - Vérifier que les options se réinitialisent

2. **ProjectDetail.vue** → + Nouveau Ticket (dans la section projet)
   - Cocher les 2 options → Créer → Vérifier les actions

3. **TicketDetail.vue** → Détails d'un ticket
   - Cliquer sur 📋 → Vérifier la todo créée
   - Cliquer sur 🏃 → Vérifier l'ajout au sprint

4. **OdooTaskDetail.vue** → Détails d'une tâche Odoo
   - Cliquer sur 🏃 → Vérifier la création du ticket lié + ajout au sprint

5. **OdooTasksList.vue** → Liste des tâches
   - Vérifier que les tâches montrent 📋 Todo si non en todo
   - Cliquer sur 📋 → Vérifier la todo créée

## 🐛 Débogage

Vérifier dans la console :
- `await db.getAllTodos()` - voir toutes les todos
- `await db.getAllTickets()` - voir tous les tickets
- `await db.getSprintsByProject(projectId)` - voir les sprints d'un projet

## ✨ Améliorations futures possibles

- [ ] Drag & drop des tickets entre sprints/todos
- [ ] Édition rapide des options depuis les listes
- [ ] Raccourcis clavier pour ajouter à todo/sprint
- [ ] Notification quand un ticket est ajouté à une todo/sprint
- [ ] Historique des actions (ajout à todo/sprint avec timestamp)
- [ ] Suppression rapide d'une todo depuis la vue ticket

