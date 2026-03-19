<template>
  <div>
    <div class="page-header">
      <div>
        <h2>📋 Ma Todo sur 7 jours</h2>
        <div style="color: #666;">{{ currentDate }}</div>
      </div>
      <div style="display: flex; gap: 1rem;">
        <button @click="showTicketForm = 'create'" class="btn btn-secondary">🎫 Créer un ticket</button>
        <button @click="showTicketForm = 'existing'" class="btn btn-secondary">➕ Ajouter un ticket</button>
        <button @click="showTicketForm = 'existing-odoo-task'" class="btn btn-secondary">🧩 Ajouter une tâche Odoo</button>
      </div>
    </div>

    <!-- Formulaire d'ajout avec sélection de date -->
    <div class="card">
      <form @submit.prevent="addTodo" class="add-todo-form">
        <div class="add-todo-row">
          <input 
            v-model="newTodoText" 
            placeholder="Ajouter une tâche..." 
            class="todo-input"
          />
          <select v-model="newTodoDate" class="date-select">
            <option v-for="day in next7Days" :key="day.date" :value="day.date">
              {{ day.label }}
            </option>
          </select>
          <button type="submit" class="btn btn-primary">Ajouter</button>
        </div>
        <textarea
          v-model="newTodoDescription"
          placeholder="Description (optionnelle)..."
          class="todo-desc-input"
          rows="2"
        ></textarea>
      </form>
    </div>

    <!-- Formulaire de création de ticket -->
    <div v-if="showTicketForm === 'create'" class="card">
      <h3>🎫 Nouveau Ticket</h3>
      <form @submit.prevent="saveTicket">
        <div class="form-group">
          <label>Projet *</label>
          <select v-model="ticketForm.projectId" required>
            <option value="">Sélectionner un projet</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Titre *</label>
          <input v-model="ticketForm.title" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="ticketForm.description" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Statut</label>
            <select v-model="ticketForm.status">
              <option v-for="col in currentProjectColumns" :key="col.id" :value="col.id">
                {{ col.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Priorité</label>
            <select v-model="ticketForm.priority">
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="cancelTicketForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Formulaire d'ajout de ticket existant -->
    <div v-if="showTicketForm === 'existing'" class="card">
      <h3>➕ Ajouter un Ticket Existant</h3>
      <form @submit.prevent="addExistingTicket">
        <div class="form-group">
          <label>Projet</label>
          <select v-model="selectedProjectFilter" @change="filterTicketsByProject">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Ticket *</label>
          <select v-model="selectedTicketId" required size="10" style="height: auto;">
            <option value="">Sélectionner un ticket</option>
            <option v-for="ticket in filteredTickets" :key="ticket.id" :value="ticket.id">
              [{{ ticket.priority.toUpperCase() }}] {{ ticket.title }} - {{ getProjectName(ticket.projectId) }}
            </option>
          </select>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary" :disabled="!selectedTicketId">Ajouter</button>
          <button type="button" @click="cancelTicketForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Formulaire d'ajout de tâche Odoo existante -->
    <div v-if="showTicketForm === 'existing-odoo-task'" class="card">
      <h3>🧩 Ajouter une Tâche Odoo</h3>
      <form @submit.prevent="addExistingOdooTask">
        <div class="form-group">
          <label>Projet</label>
          <select v-model="selectedOdooProjectFilter" @change="filterOdooTasksByProject">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Tâche Odoo *</label>
          <select v-model="selectedOdooTaskId" required size="10" style="height: auto;">
            <option value="">Sélectionner une tâche Odoo</option>
            <option v-for="task in filteredOdooTasks" :key="task.odooId" :value="task.odooId">
              [{{ task.priority.toUpperCase() }}] {{ task.title }} - {{ task.projectName || getProjectName(task.localProjectId) }}
            </option>
          </select>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary" :disabled="!selectedOdooTaskId">Ajouter</button>
          <button type="button" @click="cancelTicketForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Vue Kanban 7 jours -->
    <div class="kanban-container">
      <div 
        v-for="day in next7Days" 
        :key="day.date"
        class="kanban-column"
        :class="{ 'is-today': day.isToday }"
        @drop="onDrop($event, day.date)"
        @dragover.prevent
        @dragenter.prevent
      >
        <div class="kanban-header">
          <h3>{{ day.shortLabel }}</h3>
          <div class="date-label">{{ day.dateLabel }}</div>
          <div class="todo-count">{{ getTodosByDate(day.date).length }} tâche(s)</div>
        </div>
        <div class="kanban-content">
          <div 
            v-for="todo in getTodosByDate(day.date)" 
            :key="todo.id"
            class="kanban-todo"
            :class="{ 'completed': todo.completed }"
            draggable="true"
            @dragstart="onDragStart($event, todo)"
          >
            <div class="todo-content">
              <input 
                type="checkbox" 
                :checked="todo.completed"
                @change="toggleTodo(todo.id)"
                class="todo-checkbox"
              />
              <div style="flex: 1; min-width: 0;">
                <span
                  class="todo-text todo-text-link"
                  @click.stop="$router.push(`/todos/${todo.id}`)"
                  :title="'Ouvrir la note'"
                >{{ todo.text }}</span>
                <div v-if="todo.description" class="todo-description-teaser" @click.stop="$router.push(`/todos/${todo.id}`)">
                  {{ todo.description.length > 80 ? todo.description.slice(0, 80) + '…' : todo.description }}
                </div>
              </div>
            </div>
            <div class="todo-actions">
              <button
                v-if="getLinkedTicket(todo)"
                @click="viewLinkedTicket(todo)"
                class="btn-icon"
                title="Ouvrir le ticket"
              >
                🎫
              </button>
              <button
                v-if="getLinkedOdooTask(todo)"
                @click="viewLinkedOdooTask(todo)"
                class="btn-icon"
                title="Ouvrir la tâche Odoo"
              >
                🧩
              </button>
              <button
                @click.stop="$router.push(`/todos/${todo.id}`)"
                class="btn-icon"
                title="Ouvrir / modifier la note"
              >📝</button>
              <button @click="deleteTodoConfirm(todo)" class="btn-icon">🗑️</button>
            </div>
          </div>
          <div v-if="getTodosByDate(day.date).length === 0" class="empty-column">
            Aucune tâche
          </div>
        </div>
      </div>
    </div>

    <!-- Actions en masse -->
    <div v-if="todos.length > 0" class="card bulk-actions">
      <button @click="clearCompleted" class="btn btn-secondary" :disabled="completedCount === 0">
        Supprimer les tâches terminées
      </button>
      <button @click="clearAll" class="btn btn-danger">
        Tout supprimer
      </button>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'TodoList',
  data() {
    return {
      todos: [],
      newTodoText: '',
      newTodoDescription: '',
      newTodoDate: new Date().toISOString().split('T')[0],
      searchQuery: '',
      showTicketForm: false,
      projects: [],
      tickets: [],
      odooTasks: [],
      filteredTickets: [],
      filteredOdooTasks: [],
      selectedProjectFilter: '',
      selectedTicketId: '',
      selectedOdooProjectFilter: '',
      selectedOdooTaskId: '',
      draggedTodo: null,
      ticketForm: {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium'
      }
    }
  },
  computed: {
    currentDate() {
      return new Date().toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    },
    next7Days() {
      const days = []
      const today = new Date()
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = dayNames[date.getDay()]
        const dayNum = date.getDate()
        const month = date.toLocaleDateString('fr-FR', { month: 'short' })
        
        days.push({
          date: dateStr,
          label: i === 0 ? "Aujourd'hui" : `${dayName} ${dayNum} ${month}`,
          shortLabel: i === 0 ? "Aujourd'hui" : dayName,
          dateLabel: `${dayNum} ${month}`,
          isToday: i === 0
        })
      }
      
      return days
    },
    completedCount() {
      return this.todos.filter(t => t.completed).length
    },
    remainingCount() {
      return this.todos.filter(t => !t.completed).length
    },
    currentProjectColumns() {
      if (this.ticketForm.projectId) {
        const project = this.projects.find(p => p.id === this.ticketForm.projectId)
        if (project?.kanbanColumns) {
          return project.kanbanColumns
        }
      }
      return [
        { id: 'todo', label: 'À faire' },
        { id: 'in-progress', label: 'En cours' },
        { id: 'done', label: 'Terminé' }
      ]
    }
  },
  async mounted() {
    await this.rolloverIncompleteTodos()
    await this.loadTodos()
    await this.loadProjects()
    await this.loadTickets()
    await this.loadOdooTasks()
  },
  methods: {
    statusLooksCompleted(status, label = '') {
      const s = String(status || '').toLowerCase()
      const l = String(label || '').toLowerCase()

      return (
        s === 'done' ||
        s === 'completed' ||
        s === 'closed' ||
        s.includes('done') ||
        s.includes('clos') ||
        s.includes('termin') ||
        l.includes('done') ||
        l.includes('clos') ||
        l.includes('termin') ||
        l.includes('résolu') ||
        l.includes('resolu')
      )
    },
    isTicketCompleted(ticket) {
      if (!ticket) return false

      const project = this.projects.find(p => p.id === ticket.projectId)
      const column = project?.kanbanColumns?.find(c => c.id === ticket.status)
      const statusLabel = column?.label || ''

      return this.statusLooksCompleted(ticket.status, statusLabel)
    },
    isOdooTaskCompleted(task) {
      if (!task) return false
      return this.statusLooksCompleted(task.status, task.stageName || '')
    },
    async loadTodos() {
      this.todos = await db.getTodosForNext7Days()
    },
    async rolloverIncompleteTodos() {
      const count = await db.rolloverIncompleteTodos()
      if (count > 0) {
        console.log(`${count} tâche(s) non complétée(s) reportée(s) à aujourd'hui`)
      }
    },
    async rolloverIncompleteTodos() {
      const count = await db.rolloverIncompleteTodos()
      if (count > 0) {
        console.log(`${count} tâche(s) non complétée(s) reportée(s) à aujourd'hui`)
      }
    },
    getTodosByDate(date) {
      return this.todos
        .filter(t => t.plannedDate === date)
        .sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1
          }
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
    },
    onDragStart(event, todo) {
      this.draggedTodo = todo
      event.dataTransfer.effectAllowed = 'move'
    },
    async onDrop(event, targetDate) {
      if (!this.draggedTodo) return
      
      if (this.draggedTodo.plannedDate !== targetDate) {
        await db.updateTodo(this.draggedTodo.id, { plannedDate: targetDate })
        await this.loadTodos()
      }
      
      this.draggedTodo = null
    },
    async loadProjects() {
      this.projects = await db.getAllProjects()
    },
    async loadTickets() {
      this.tickets = await db.getAllTickets()
      this.filteredTickets = this.tickets.filter(t => !this.isTicketCompleted(t))
    },
    async loadOdooTasks() {
      this.odooTasks = await db.getAllOdooTasks()
      this.filteredOdooTasks = this.odooTasks.filter(t => !this.isOdooTaskCompleted(t))
    },
    filterTicketsByProject() {
      const activeTickets = this.tickets.filter(t => !this.isTicketCompleted(t))
      if (this.selectedProjectFilter) {
        this.filteredTickets = activeTickets.filter(t => t.projectId === this.selectedProjectFilter)
      } else {
        this.filteredTickets = activeTickets
      }
      this.selectedTicketId = ''
    },
    filterOdooTasksByProject() {
      const activeOdooTasks = this.odooTasks.filter(t => !this.isOdooTaskCompleted(t))
      if (this.selectedOdooProjectFilter) {
        this.filteredOdooTasks = activeOdooTasks.filter(t => t.localProjectId === this.selectedOdooProjectFilter)
      } else {
        this.filteredOdooTasks = activeOdooTasks
      }
      this.selectedOdooTaskId = ''
    },
    getProjectName(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : 'Inconnu'
    },
    async addExistingTicket() {
      const ticket = this.tickets.find(t => t.id === this.selectedTicketId)
      if (ticket) {
        const todoText = `[TICKET] ${ticket.title}`
        await db.addTodo(todoText)
        await this.loadTodos()
        this.showTicketForm = false
        this.selectedTicketId = ''
        this.selectedProjectFilter = ''
        this.filteredTickets = this.tickets.filter(t => !this.isTicketCompleted(t))
        alert('Ticket ajouté à vos todos !')
      }
    },
    async addExistingOdooTask() {
      const task = this.odooTasks.find(t => t.odooId === this.selectedOdooTaskId)
      if (task) {
        const todoText = `[TÂCHE ODOO #${task.odooId}] ${task.title}`
        await db.addTodo(todoText)
        await this.loadTodos()
        this.showTicketForm = false
        this.selectedOdooTaskId = ''
        this.selectedOdooProjectFilter = ''
        this.filteredOdooTasks = this.odooTasks.filter(t => !this.isOdooTaskCompleted(t))
        alert('Tâche Odoo ajoutée à vos todos !')
      }
    },
    async addTodo() {
      if (!this.newTodoText.trim()) return
      
      await db.addTodo(this.newTodoText.trim(), this.newTodoDate, this.newTodoDescription.trim())
      
      this.newTodoText = ''
      this.newTodoDescription = ''
      this.newTodoDate = new Date().toISOString().split('T')[0]
      await this.loadTodos()
    },
    getLinkedTicket(todo) {
      if (!todo?.text) return null

      // Format: [TICKET ODOO #123] Titre
      const ticketOdooMatch = todo.text.match(/^\[TICKET ODOO #(\d+)\]/)
      if (ticketOdooMatch) {
        const odooId = parseInt(ticketOdooMatch[1])
        return this.tickets.find(t => Number(t.odooId) === odooId) || null
      }

      // Format: [TICKET] Titre
      const ticketMatch = todo.text.match(/^\[TICKET\]\s*(.+)$/)
      if (ticketMatch) {
        const title = ticketMatch[1]
        return this.tickets.find(t => t.title === title) || null
      }

      return null
    },
    getLinkedOdooTask(todo) {
      if (!todo?.text) return null

      // Format: [TÂCHE ODOO #123] Titre
      const taskMatch = todo.text.match(/^\[TÂCHE ODOO #(\d+)\]/)
      if (!taskMatch) return null

      const odooId = parseInt(taskMatch[1])
      return this.odooTasks.find(t => Number(t.odooId) === odooId) || null
    },
    viewLinkedTicket(todo) {
      const ticket = this.getLinkedTicket(todo)
      if (!ticket?.id) {
        alert('Ticket introuvable (non synchronisé localement).')
        return
      }
      this.$router.push(`/tickets/${ticket.id}`)
    },
    viewLinkedOdooTask(todo) {
      const task = this.getLinkedOdooTask(todo)
      if (!task?.odooId) {
        alert('Tâche Odoo introuvable (non synchronisée localement).')
        return
      }
      this.$router.push(`/tasks/${task.odooId}`)
    },
    async toggleTodo(id) {
      await db.toggleTodo(id)
      await this.loadTodos()
    },
    async deleteTodoConfirm(todo) {
      if (confirm(`Supprimer la tâche "${todo.text}" ?`)) {
        await db.deleteTodo(todo.id)
        await this.loadTodos()
      }
    },
    async saveTicket() {
      await db.addTicket({
        projectId: parseInt(this.ticketForm.projectId),
        title: this.ticketForm.title,
        description: this.ticketForm.description,
        status: this.ticketForm.status,
        priority: this.ticketForm.priority
      })
      this.cancelTicketForm()
      alert('✅ Ticket créé avec succès !')
    },
    cancelTicketForm() {
      this.showTicketForm = false
      this.selectedTicketId = ''
      this.selectedProjectFilter = ''
      this.filteredTickets = this.tickets.filter(t => !this.isTicketCompleted(t))
      this.selectedOdooTaskId = ''
      this.selectedOdooProjectFilter = ''
      this.filteredOdooTasks = this.odooTasks.filter(t => !this.isOdooTaskCompleted(t))
      this.ticketForm = {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium'
      }
    },
    async clearCompleted() {
      if (confirm('Supprimer toutes les tâches terminées ?')) {
        const completed = this.todos.filter(t => t.completed)
        for (const todo of completed) {
          await db.deleteTodo(todo.id)
        }
        await this.loadTodos()
      }
    },
    async clearAll() {
      if (confirm('Supprimer toutes les tâches ?')) {
        for (const todo of this.todos) {
          await db.deleteTodo(todo.id)
        }
        await this.loadTodos()
      }
    },
    formatTime(dateStr) {
      return new Date(dateStr).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  margin-bottom: 0.5rem;
}

.add-todo-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-todo-row {
  display: flex;
  gap: 1rem;
}

.todo-desc-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  color: #555;
}

.todo-desc-input:focus {
  outline: none;
  border-color: #4DBA87;
}

.todo-text-link {
  cursor: pointer;
}

.todo-text-link:hover {
  text-decoration: underline;
  color: #2a7a5a;
}

.todo-description-teaser {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.todo-description-teaser:hover {
  color: #555;
  text-decoration: underline;
}

.todo-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.todo-input:focus {
  outline: none;
  border-color: #4DBA87;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  text-align: center;
}

.stat-item {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #4DBA87;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.todos-list {
  margin-top: 1rem;
}

.todo-item {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.todo-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.todo-item.completed {
  opacity: 0.6;
  background: #f9f9f9;
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  font-size: 1.2rem;
  color: #999;
}

.search-input {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 3rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #4DBA87;
}

.clear-search {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s;
}

.clear-search:hover {
  color: #333;
}

.todo-text {
  font-size: 1rem;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.todo-time {
  color: #999;
  font-size: 0.875rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.btn-icon:hover {
  opacity: 1;
}

.bulk-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.bulk-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-select {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  min-width: 180px;
}

.date-select:focus {
  outline: none;
  border-color: #4DBA87;
}

.kanban-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1rem;
  margin-top: 2rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.kanban-column {
  background: #f8f9fa;
  border-radius: 8px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}

.kanban-column.is-today {
  background: #e8f5e9;
  border-color: #4DBA87;
}

.kanban-header {
  background: white;
  padding: 1rem;
  border-radius: 8px 8px 0 0;
  border-bottom: 2px solid #e0e0e0;
  text-align: center;
}

.kanban-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
}

.date-label {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.todo-count {
  font-size: 0.75rem;
  color: #999;
  font-weight: bold;
}

.kanban-content {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
  min-height: 400px;
}

.kanban-todo {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  cursor: move;
  transition: all 0.3s;
}

.kanban-todo:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.kanban-todo.completed {
  opacity: 0.6;
  background: #f9f9f9;
}

.kanban-todo .todo-content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.kanban-todo .todo-text {
  font-size: 0.875rem;
  line-height: 1.4;
  flex: 1;
  word-break: break-word;
}

.kanban-todo.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.kanban-todo .todo-actions {
  display: flex;
  justify-content: flex-end;
}

.kanban-todo .btn-icon {
  font-size: 1rem;
  padding: 0.25rem;
}

.empty-column {
  text-align: center;
  color: #999;
  padding: 2rem 1rem;
  font-size: 0.875rem;
}

@media (max-width: 1400px) {
  .kanban-container {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}
</style>
