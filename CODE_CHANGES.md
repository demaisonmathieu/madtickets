# Changements de code - Avant/Après

## ProjectDetail.vue - Formulaire de création de ticket

### ➕ Ajout dans le template (lignes ~117-123)

```vue
<!-- Avant : Aucune option -->
<!-- (pas de code) -->

<!-- Après : Options de formulaire -->
<div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
    <input type="checkbox" v-model="ticketFormOptions.addToTodo" style="width: auto;" />
    <span>📋 Ajouter aussi à la todo</span>
  </label>
  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
    <input type="checkbox" v-model="ticketFormOptions.addToCurrentSprint" style="width: auto;" />
    <span>
      🏃 Ajouter au sprint en cours
      <small v-if="!currentSprint" style="color: #999;">(aucun sprint actif)</small>
    </span>
  </label>
</div>
```

### ➕ Ajout dans data() (lignes ~343-346)

```javascript
// Avant
data() {
  return {
    ticketForm: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium'
    }
  }
}

// Après
data() {
  return {
    ticketForm: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium'
    },
    ticketFormOptions: {
      addToTodo: false,
      addToCurrentSprint: false
    }
  }
}
```

### ➕ Ajout dans computed (lignes ~367-381)

```javascript
// Avant
computed: {
  currentSprint() {
    const activeSprints = this.sprints.filter(s => s.status === 'active')
    if (activeSprints.length === 0) return null
    return activeSprints.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
      return bDate - aDate
    })[0]
  },
  odooConfigured() {
    return odooService.isConfigured()
  }
}

// Après
computed: {
  currentSprint() {
    // ... même code ...
  },
  currentSprintForSelectedProject() {
    if (!this.project) return null
    const activeSprints = this.sprints.filter(s => s.status === 'active')
    if (activeSprints.length === 0) return null
    return activeSprints.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
      return bDate - aDate
    })[0]
  },
  odooConfigured() {
    return odooService.isConfigured()
  }
}
```

### 🔄 Modification saveTicket() (lignes ~487-515)

```javascript
// Avant
async saveTicket() {
  await db.addTicket({
    ...this.ticketForm,
    projectId: this.project.id
  })
  await this.loadTickets()
  this.cancelTicketForm()
}

// Après
async saveTicket() {
  const sprintId = this.ticketFormOptions.addToCurrentSprint ? (this.currentSprintForSelectedProject?.id || null) : null
  
  await db.addTicket({
    ...this.ticketForm,
    projectId: this.project.id,
    sprintId: sprintId
  })

  // Ajouter à la todo si demandé
  if (this.ticketFormOptions.addToTodo) {
    const todoText = `[TICKET] ${this.ticketForm.title}`
    const todos = await db.getAllTodos()
    const exists = todos.some(todo => !todo.completed && todo.text === todoText)
    if (!exists) {
      await db.addTodo(todoText)
    }
  }

  await this.loadTickets()
  await this.loadTodos()

  // Afficher confirmation avec actions effectuées
  const actions = []
  if (sprintId) actions.push('🏃 Ajouté au sprint en cours')
  if (this.ticketFormOptions.addToTodo) actions.push('📋 Ajouté à la todo')
  const message = actions.length > 0
    ? `✅ Ticket créé et ${actions.join(', ')}`
    : '✅ Ticket créé'
  alert(message)

  this.cancelTicketForm()
}
```

### 🔄 Modification cancelTicketForm() (lignes ~517-527)

```javascript
// Avant
cancelTicketForm() {
  this.showTicketForm = false
  this.ticketForm = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium'
  }
}

// Après
cancelTicketForm() {
  this.showTicketForm = false
  this.ticketForm = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium'
  }
  this.ticketFormOptions = {
    addToTodo: false,
    addToCurrentSprint: false
  }
}
```

---

## TicketDetail.vue - Boutons d'action rapide

### ➕ Ajout dans le template (lignes ~14-18)

```vue
<!-- Avant : Aucun bouton d'action rapide -->
<!-- (rien) -->

<!-- Après : Boutons d'action -->
<button v-if="!todoItem" @click="addToTodoList" class="btn btn-secondary">
  📋 Ajouter à la todo
</button>
<button v-if="currentSprint && !isInCurrentSprint" @click="addToCurrentSprint" class="btn btn-secondary">
  🏃 Ajouter au sprint en cours
</button>
```

### ➕ Ajout dans data() 

```javascript
// Avant
data() {
  return {
    // ... autres propriétés
  }
}

// Après
data() {
  return {
    // ... autres propriétés
    todos: [],
    sprints: []
  }
}
```

### ➕ Ajout dans computed

```javascript
computed: {
  // ... avant
  currentSprint() {
    const activeSprints = this.sprints.filter(s => s.status === 'active')
    if (activeSprints.length === 0) return null
    return activeSprints.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
      return bDate - aDate
    })[0]
  },
  todoItem() {
    return this.todos.find(todo => 
      !todo.completed && todo.text === this.getTodoText(this.ticket)
    ) || null
  },
  isInCurrentSprint() {
    return this.currentSprint && this.ticket?.sprintId === this.currentSprint.id
  }
}
```

### ➕ Nouvelles méthodes

```javascript
async loadSprints() {
  const projectId = this.ticket?.projectId
  if (projectId) {
    this.sprints = await db.getSprintsByProject(projectId)
  }
}

async loadTodos() {
  this.todos = await db.getAllTodos()
}

getTodoText(ticket) {
  if (ticket?.odooId) {
    return `[TICKET ODOO #${ticket.odooId}] ${ticket.title}`
  }
  return `[TICKET] ${ticket.title}`
}

async addToTodoList() {
  if (!this.ticket?.title) return
  const todoText = this.getTodoText(this.ticket)
  const alreadyExists = !!this.todoItem
  if (alreadyExists) {
    alert('Ce ticket est déjà présent dans votre todo list.')
    return
  }
  await db.addTodo(todoText)
  await this.loadTodos()
  alert('✅ Ticket ajouté à la todo list !')
}

async addToCurrentSprint() {
  if (!this.currentSprint || !this.ticket?.id) return
  await db.updateTicket(this.ticket.id, { sprintId: this.currentSprint.id })
  await this.$parent.loadTickets() // Recharger depuis parent
}
```

---

## TicketsList.vue - Logique de formulaire

### 🔄 Modification saveTicket()

```javascript
// Avant
async saveTicket() {
  await db.addTicket({
    projectId: parseInt(this.form.projectId),
    title: this.form.title,
    description: this.form.description,
    status: this.form.status,
    priority: this.form.priority
  })
  await this.loadData()
  this.cancelForm()
}

// Après
async saveTicket() {
  const projectId = parseInt(this.form.projectId)
  const sprintId = this.formOptions.addToCurrentSprint ? (this.currentSprintForSelectedProject?.id || null) : null

  if (this.formOptions.addToCurrentSprint && !sprintId) {
    alert('Aucun sprint actif trouvé pour ce projet.')
  }

  await db.addTicket({
    projectId,
    title: this.form.title,
    description: this.form.description,
    status: this.form.status,
    priority: this.form.priority,
    sprintId
  })

  if (this.formOptions.addToTodo) {
    const todoText = `[TICKET] ${this.form.title}`
    const todos = await db.getAllTodos()
    const exists = todos.some(todo => !todo.completed && todo.text === todoText)
    if (!exists) {
      await db.addTodo(todoText)
    }
  }

  if (this.formOptions.addToTodo || (this.formOptions.addToCurrentSprint && sprintId)) {
    const actions = []
    if (this.formOptions.addToTodo) actions.push('todo')
    if (this.formOptions.addToCurrentSprint && sprintId) actions.push('sprint en cours')
    alert(`✅ Ticket ajouté (${actions.join(' + ')})`)
  }

  await this.loadData()
  this.cancelForm()
}
```

---

## OdooTaskDetail.vue - Action sprint

### ➕ Ajout dans le template

```vue
<!-- Avant : Aucun bouton -->

<!-- Après : Bouton sprint -->
<button v-if="currentSprint && !isTaskInCurrentSprint" @click="addTaskToCurrentSprint" class="btn btn-secondary">
  🏃 Ajouter au sprint en cours
</button>
```

### ➕ Nouvelle méthode

```javascript
async addTaskToCurrentSprint() {
  if (!this.currentSprint) return

  // Chercher un ticket lié
  let linkedTicket = this.taskLinkedTicket
  
  if (!linkedTicket) {
    // Créer un nouveau ticket lié
    linkedTicket = await db.addTicket({
      projectId: this.task.localProjectId,
      title: `[TÂCHE ODOO #${this.task.odooId}] ${this.task.title}`,
      description: this.task.description || '',
      status: 'todo',
      priority: this.task.priority || 'medium',
      sprintId: this.currentSprint.id
    })
  } else {
    // Mettre à jour le ticket existant
    await db.updateTicket(linkedTicket.id, { sprintId: this.currentSprint.id })
  }

  alert('✅ Tâche ajoutée au sprint en cours !')
  await this.$parent.loadOdooTasks() // Recharger depuis parent
}
```

---

## 📊 Résumé des modifications

| Fichier | Lignes ajoutées | Lignes modifiées | Nouvelles méthodes |
|---------|-----------------|-----------------|-------------------|
| ProjectDetail.vue | ~50 | 2 (saveTicket, cancelTicketForm) | 1 (computed) |
| TicketDetail.vue | ~60 | 0 | 4 (loadSprints, loadTodos, getTodoText, addToTodo, addToSprint) |
| TicketsList.vue | ~20 | 2 (saveTicket, cancelForm) | 1 (computed) |
| OdooTaskDetail.vue | ~30 | 0 | 1 (addTaskToCurrentSprint) |
| **Total** | **~160** | **4** | **7** |

