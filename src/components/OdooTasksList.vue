<template>
  <div>
    <div class="page-header">
      <h2>🧩 Tâches Odoo</h2>
      <button @click="syncAllOdooTasks" class="btn btn-secondary" :disabled="loading">
        {{ loading ? '⏳ Synchronisation...' : '🔄 Synchroniser depuis Odoo' }}
      </button>
    </div>

    <div class="card" style="margin-bottom: 1rem;">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une tâche Odoo par titre ou description..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">✕</button>
      </div>
      <small v-if="searchQuery" style="color: #666; margin-top: 0.5rem; display: block;">
        {{ filteredTasks.length }} résultat(s) trouvé(s)
      </small>

      <div class="filters" style="margin-top: 1rem;">
        <div class="form-group" style="margin: 0;">
          <label>Projet</label>
          <select v-model="filterProject">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label>Statut</label>
          <select v-model="filterStatus">
            <option value="">Masquer terminés (défaut)</option>
            <option value="__all__">Afficher tous</option>
            <option value="todo">À faire</option>
            <option value="in-progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label>Priorité</label>
          <select v-model="filterPriority">
            <option value="">Toutes</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label>Date de création (du)</label>
          <input type="date" v-model="filterDateFrom" />
        </div>

        <div class="form-group" style="margin: 0;">
          <label>Date de création (au)</label>
          <input type="date" v-model="filterDateTo" />
        </div>
      </div>

      <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; cursor: pointer;">
        <input type="checkbox" v-model="filterOnlyFavorites" style="width: auto;" />
        <span>⭐ Favoris uniquement</span>
      </label>
    </div>

    <div v-if="!odooConfigured" class="card">
      <p style="color: #999;">Odoo n'est pas configuré.</p>
    </div>

    <div v-else-if="!loaded" class="card">
      <p style="color: #666;">Cliquez sur <strong>🔄 Rafraîchir</strong> pour charger les tâches Odoo.</p>
    </div>

    <div v-else-if="error" class="card">
      <p style="color: #b71c1c;">{{ error }}</p>
    </div>

    <div v-else-if="filteredTasks.length === 0" class="card">
      <p style="text-align: center; color: #999;">Aucune tâche Odoo trouvée.</p>
    </div>

    <div v-else>
      <div v-for="task in filteredTasks" :key="`odoo-task-root-${task.odooId}`" class="card task-card">
        <div class="ticket-header">
          <div style="flex: 1;">
            <h3 class="clickable-title" @click="viewTask(task.odooId)">{{ task.title }}</h3>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
              <span v-if="task.localProjectId" class="badge badge-info clickable-badge" @click="viewProject(task.localProjectId)">{{ task.projectName || 'Projet inconnu' }}</span>
              <span v-else class="badge badge-info">{{ task.projectName || 'Projet inconnu' }}</span>
              <span class="badge" :class="getTicketStatusClass(task.status)">{{ getTicketStatusLabel(task.status) }}</span>
              <span class="badge" :class="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
            </div>
          </div>
          <div class="ticket-actions">
            <button @click="viewTask(task.odooId)" class="btn btn-primary btn-sm">👁️ Voir</button>
            <button v-if="!getTodoForOdooTask(task)" @click="addOdooTaskToTodoList(task)" class="btn btn-secondary btn-sm">
              📋 Todo
            </button>
          </div>
        </div>

        <div v-if="task.description" class="ticket-description" v-html="truncateHtml(task.description)"></div>

        <div class="ticket-meta">
          <small>ID Odoo: {{ task.odooId }}</small>
          <small>Créé le {{ formatDate(task.createdAt) }}</small>
          <small class="time-tag">• Temps total: {{ formatDuration(taskTimeTotals[task.odooId] || 0) }}</small>
          <small v-if="getTodoForOdooTask(task)" class="todo-tag">
            • Planifié en todo le {{ formatDate(getTodoForOdooTask(task).plannedDate) }}
          </small>
        </div>

        <form @submit.prevent="addTimeToOdooTask(task)" class="task-time-form">
          <div class="task-time-grid">
            <div class="form-group" style="margin: 0;">
              <label>Durée</label>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input v-model.number="getTaskTimeForm(task.odooId).hours" type="number" min="0" style="width: 60px;" />
                <span>h</span>
                <input v-model.number="getTaskTimeForm(task.odooId).minutes" type="number" min="0" max="59" style="width: 60px;" />
                <span>min</span>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label>Date</label>
              <input v-model="getTaskTimeForm(task.odooId).date" type="date" required />
            </div>
            <div class="form-group" style="margin: 0;">
              <label>Description</label>
              <input v-model="getTaskTimeForm(task.odooId).description" type="text" placeholder="Travail effectué..." />
            </div>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="syncingTaskTime || !isTaskTimeValid(task.odooId)">
              {{ syncingTaskTime ? '⏳ Envoi...' : '⏱️ Saisir le temps' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { odooService } from '../services/odoo-new'

export default {
  name: 'OdooTasksList',
  data() {
    return {
      tasks: [],
      projects: [],
      todos: [],
      taskTimeTotals: {},
      taskTimeForm: {},
      loading: false,
      syncingTaskTime: false,
      error: null,
      loaded: false,
      searchQuery: '',
      filterProject: '',
      filterStatus: '',
      filterPriority: '',
      filterDateFrom: '',
      filterDateTo: '',
      filterOnlyFavorites: true
    }
  },
  computed: {
    odooConfigured() {
      return odooService.isConfigured()
    },
    filteredTasks() {
      return this.tasks.filter(task => {
        if (this.filterOnlyFavorites) {
          const project = this.projects.find(p => Number(p.id) === Number(task.localProjectId))
          const isFavorite = project ? !!project.isFavorite : !!task.projectIsFavorite
          if (!isFavorite) return false
        }

        if (this.filterProject && Number(task.localProjectId) !== Number(this.filterProject)) return false
        if (this.filterStatus === '') {
          if (task.status === 'done') return false
        } else if (this.filterStatus !== '__all__' && task.status !== this.filterStatus) {
          return false
        }
        if (this.filterPriority && task.priority !== this.filterPriority) return false

        if (this.filterDateFrom) {
          const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
          const fromDate = new Date(this.filterDateFrom).setHours(0, 0, 0, 0)
          if (taskDate < fromDate) return false
        }

        if (this.filterDateTo) {
          const taskDate = new Date(task.createdAt).setHours(0, 0, 0, 0)
          const toDate = new Date(this.filterDateTo).setHours(0, 0, 0, 0)
          if (taskDate > toDate) return false
        }

        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase()
          const titleMatch = task.title?.toLowerCase().includes(query)
          const descMatch = this.extractText(task.description || '').toLowerCase().includes(query)
          if (!titleMatch && !descMatch) return false
        }

        return true
      })
    },
    todoByText() {
      const map = new Map()
      for (const todo of this.todos) {
        if (todo.completed) continue
        if (!map.has(todo.text)) map.set(todo.text, todo)
      }
      return map
    }
  },
  async mounted() {
    await this.loadLocalData()

    // Première utilisation : importer depuis Odoo si le cache local est vide
    if (this.odooConfigured && this.tasks.length === 0) {
      await this.syncAllOdooTasks()
    }
  },
  methods: {
    async loadLocalData() {
      this.projects = await db.getAllProjects()
      this.todos = await db.getAllTodos()
      this.tasks = await db.getAllOdooTasks()
      this.loaded = true
    },
    async syncAllOdooTasks() {
      this.error = null
      if (!this.odooConfigured) return

      this.loading = true
      try {
        this.projects = await db.getAllProjects()
        this.todos = await db.getAllTodos()

        const odooProjects = this.projects.filter(p => p.odooId)
        const allTasks = []

        for (const project of odooProjects) {
          const projectTasks = await odooService.getProjectTasks(project.odooId)
          for (const task of projectTasks) {
            let timeTotalMinutes = 0
            try {
              const entries = await odooService.getTaskTimeEntries(task.odooId)
              timeTotalMinutes = entries.reduce((sum, e) => sum + Math.round((e.unit_amount || 0) * 60), 0)
            } catch {
              timeTotalMinutes = 0
            }

            allTasks.push({
              ...task,
              projectName: project.name,
              localProjectId: project.id,
              projectIsFavorite: !!project.isFavorite,
              timeTotalMinutes
            })
          }
        }

        const tasksByProject = new Map()
        for (const task of allTasks) {
          const projectTasks = tasksByProject.get(task.projectOdooId) || []
          projectTasks.push(task)
          tasksByProject.set(task.projectOdooId, projectTasks)
        }

        for (const [projectOdooId, projectTasks] of tasksByProject.entries()) {
          await db.replaceOdooTasksForProject(projectOdooId, projectTasks)
        }

        await this.loadLocalData()

        const totals = {}
        for (const task of this.tasks) {
          totals[task.odooId] = task.timeTotalMinutes || 0
        }
        this.taskTimeTotals = totals
      } catch (error) {
        this.error = error.message || 'Erreur de chargement des tâches Odoo'
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    getTaskTimeForm(taskId) {
      if (!this.taskTimeForm[taskId]) {
        this.taskTimeForm[taskId] = {
          hours: 0,
          minutes: 0,
          date: new Date().toISOString().split('T')[0],
          description: ''
        }
      }
      return this.taskTimeForm[taskId]
    },
    isTaskTimeValid(taskId) {
      const form = this.getTaskTimeForm(taskId)
      return (form.hours > 0 || form.minutes > 0) && form.date
    },
    async addTimeToOdooTask(task) {
      const form = this.getTaskTimeForm(task.odooId)
      const duration = (form.hours * 60) + form.minutes
      if (duration <= 0) return

      this.syncingTaskTime = true
      try {
        await odooService.createTaskTimeEntry(task.odooId, duration, form.date, form.description || '')
        this.taskTimeTotals[task.odooId] = (this.taskTimeTotals[task.odooId] || 0) + duration
        await db.updateOdooTaskByOdooId(task.odooId, { timeTotalMinutes: this.taskTimeTotals[task.odooId] })
        this.taskTimeForm[task.odooId] = {
          hours: 0,
          minutes: 0,
          date: new Date().toISOString().split('T')[0],
          description: ''
        }
      } catch (error) {
        alert(`❌ ${error.message || 'Erreur de saisie de temps Odoo'}`)
      } finally {
        this.syncingTaskTime = false
      }
    },
    getTodoTextForOdooTask(task) {
      return `[TÂCHE ODOO #${task.odooId}] ${task.title}`
    },
    getTodoForOdooTask(task) {
      return this.todoByText.get(this.getTodoTextForOdooTask(task)) || null
    },
    async addOdooTaskToTodoList(task) {
      const todoText = this.getTodoTextForOdooTask(task)
      if (this.todoByText.get(todoText)) {
        alert('Cette tâche Odoo est déjà présente dans votre todo list.')
        return
      }
      await db.addTodo(todoText)
      this.todos = await db.getAllTodos()
      alert('✅ Tâche Odoo ajoutée à la todo list !')
    },
    viewProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    viewTask(odooId) {
      this.$router.push(`/tasks/${odooId}`)
    },
    getTicketStatusClass(status) {
      const classes = {
        'todo': 'badge-warning',
        'in-progress': 'badge-info',
        'done': 'badge-success'
      }
      return classes[status] || 'badge-info'
    },
    getTicketStatusLabel(status) {
      const labels = {
        'todo': 'À faire',
        'in-progress': 'En cours',
        'done': 'Terminé'
      }
      return labels[status] || status
    },
    getPriorityClass(priority) {
      const classes = {
        'low': 'badge-info',
        'medium': 'badge-warning',
        'high': 'badge-danger'
      }
      return classes[priority] || 'badge-info'
    },
    getPriorityLabel(priority) {
      const labels = {
        'low': 'Basse',
        'medium': 'Moyenne',
        'high': 'Haute'
      }
      return labels[priority] || priority
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    },
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '0h'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins}min`
      if (mins === 0) return `${hours}h`
      return `${hours}h${mins.toString().padStart(2, '0')}`
    },
    extractText(html) {
      if (!html) return ''
      const temp = document.createElement('div')
      temp.innerHTML = html
      return temp.textContent || temp.innerText || ''
    },
    truncateHtml(html, maxLength = 100) {
      if (!html) return ''
      const text = this.extractText(html)
      if (text.length <= maxLength) return html
      return text.substring(0, maxLength) + '...'
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.clear-search {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
}

.task-card {
  border: 1px solid #ffe0b2;
  background: #fffaf3;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.ticket-header h3 {
  margin: 0 0 0.5rem 0;
}

.clickable-title {
  cursor: pointer;
}

.clickable-badge {
  cursor: pointer;
}

.ticket-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ticket-description {
  color: #666;
  margin-bottom: 1rem;
}

.ticket-meta {
  color: #999;
  font-size: 0.875rem;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.task-time-form {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eee;
}

.task-time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr auto;
  gap: 0.75rem;
  align-items: end;
}

.time-tag {
  color: #ef6c00;
  font-weight: 600;
}

.todo-tag {
  color: #0d6efd;
  font-weight: 600;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}
</style>
