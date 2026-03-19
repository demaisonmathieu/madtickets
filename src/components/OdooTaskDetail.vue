<template>
  <div>
    <div v-if="!task" class="card">
      <p style="text-align: center; color: #999;">Tâche Odoo non trouvée</p>
    </div>

    <div v-else>
      <div class="page-header">
        <div>
          <button @click="$router.back()" class="btn btn-secondary">← Retour</button>
          <h2 style="margin-top: 1rem;">{{ task.title }}</h2>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
            <router-link v-if="project" :to="`/projects/${project.id}`" class="badge badge-info clickable-badge">
              {{ project.name }}
            </router-link>
            <span class="badge" :class="getStatusClass(task.status)">{{ getStatusLabel(task.status) }}</span>
            <span class="badge" :class="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
            <span class="badge badge-warning">Tâche Odoo</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end;">
          <button v-if="!todoItem" @click="addToTodoList" class="btn btn-secondary">📋 Ajouter à la todo</button>
          <button
            v-if="project && currentSprint && !isTaskInCurrentSprint"
            @click="addTaskToCurrentSprint"
            class="btn btn-secondary"
          >
            🏃 Ajouter au sprint en cours
          </button>
          <router-link v-if="project" :to="`/projects/${project.id}`" class="btn btn-primary">📁 Voir le projet</router-link>
        </div>
      </div>

      <div class="card">
        <h3>Description</h3>
        <div v-if="task.description" class="task-description" v-html="task.description"></div>
        <p v-else style="color: #999; font-style: italic;">Aucune description</p>
      </div>

      <div class="card">
        <h3>Informations</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>ID Odoo :</strong>
            <span>{{ task.odooId }}</span>
          </div>
          <div class="info-item">
            <strong>Créé le :</strong>
            <span>{{ formatDate(task.createdAt) }}</span>
          </div>
          <div class="info-item">
            <strong>Mis à jour le :</strong>
            <span>{{ formatDate(task.updatedAt) }}</span>
          </div>
          <div class="info-item">
            <strong>Temps total :</strong>
            <span class="time-badge">{{ formatDuration(task.timeTotalMinutes || 0) }}</span>
          </div>
          <div v-if="todoItem" class="info-item">
            <strong>Todo planifiée :</strong>
            <span>{{ formatDate(todoItem.plannedDate) }}</span>
          </div>
          <div v-if="currentSprint" class="info-item">
            <strong>Sprint en cours :</strong>
            <span>
              {{ currentSprint.name }}
              <template v-if="isTaskInCurrentSprint">(déjà planifiée)</template>
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Saisir du temps</h3>
        <form @submit.prevent="addTime" class="task-time-form">
          <div class="task-time-grid">
            <div class="form-group" style="margin: 0;">
              <label>Durée</label>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <input v-model.number="timeForm.hours" type="number" min="0" style="width: 60px;" />
                <span>h</span>
                <input v-model.number="timeForm.minutes" type="number" min="0" max="59" style="width: 60px;" />
                <span>min</span>
              </div>
            </div>
            <div class="form-group" style="margin: 0;">
              <label>Date</label>
              <input v-model="timeForm.date" type="date" required />
            </div>
            <div class="form-group" style="margin: 0;">
              <label>Description</label>
              <input v-model="timeForm.description" type="text" placeholder="Travail effectué..." />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="syncing || !isTimeValid">
              {{ syncing ? '⏳ Envoi...' : '⏱️ Enregistrer le temps' }}
            </button>
          </div>
        </form>

        <div class="task-time-header-row" style="margin-top: 1rem;">
          <h4 style="margin: 0;">Feuilles de temps</h4>
          <button @click="loadTaskTimeEntries" class="btn btn-secondary btn-sm" :disabled="loadingTimeEntries || syncing">
            {{ loadingTimeEntries ? '⏳ Chargement...' : '🔄 Actualiser' }}
          </button>
        </div>

        <div v-if="timeSyncError" class="alert alert-danger" style="margin-top: 0.75rem;">
          ❌ {{ timeSyncError }}
        </div>

        <div v-if="loadingTimeEntries" style="color: #666; margin-top: 0.75rem;">Chargement des feuilles de temps...</div>

        <div v-else-if="taskTimeEntries.length === 0" style="color: #999; margin-top: 0.75rem;">Aucune feuille de temps.</div>

        <div v-else class="time-entries-list" style="margin-top: 0.75rem;">
          <div v-for="entry in taskTimeEntries" :key="entry.id" class="time-entry-card">
            <div v-if="editingTimeEntryId === entry.id" class="time-entry-edit">
              <div class="task-time-grid">
                <div class="form-group" style="margin: 0;">
                  <label>Durée</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input v-model.number="editingTimeEntry.hours" type="number" min="0" style="width: 60px;" />
                    <span>h</span>
                    <input v-model.number="editingTimeEntry.minutes" type="number" min="0" max="59" style="width: 60px;" />
                    <span>min</span>
                  </div>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Date</label>
                  <input v-model="editingTimeEntry.date" type="date" required />
                </div>
                <div class="form-group" style="margin: 0;">
                  <label>Description</label>
                  <input v-model="editingTimeEntry.description" type="text" placeholder="Travail effectué..." />
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: end;">
                  <button @click="saveTaskTimeEdit" class="btn btn-primary btn-sm" :disabled="syncing">✓</button>
                  <button @click="cancelTaskTimeEdit" class="btn btn-secondary btn-sm" :disabled="syncing">✕</button>
                </div>
              </div>
            </div>

            <div v-else class="time-entry-content">
              <div class="time-entry-main">
                <div class="time-duration">{{ formatDuration(entry.duration) }}</div>
                <div class="time-date">{{ formatDate(entry.date) }}</div>
                <div class="time-description">{{ entry.description || 'Sans description' }}</div>
              </div>
              <div class="time-entry-actions">
                <button @click="startTaskTimeEdit(entry)" class="btn btn-secondary btn-sm" :disabled="syncing">✏️</button>
                <button @click="deleteTaskTimeEntry(entry)" class="btn btn-danger btn-sm" :disabled="syncing">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { odooService } from '../services/odoo-new'

export default {
  name: 'OdooTaskDetail',
  data() {
    return {
      task: null,
      project: null,
      todos: [],
      tickets: [],
      sprints: [],
      syncing: false,
      loadingTimeEntries: false,
      timeSyncError: null,
      taskTimeEntries: [],
      editingTimeEntryId: null,
      editingTimeEntry: {
        hours: 0,
        minutes: 0,
        date: '',
        description: ''
      },
      timeForm: {
        hours: 0,
        minutes: 0,
        date: new Date().toISOString().split('T')[0],
        description: ''
      }
    }
  },
  computed: {
    todoItem() {
      if (!this.task) return null
      const key = `[TÂCHE ODOO #${this.task.odooId}] ${this.task.title}`
      return this.todos.find(todo => !todo.completed && todo.text === key) || null
    },
    taskLinkedTicket() {
      if (!this.task) return null
      const key = `[TÂCHE ODOO #${this.task.odooId}] ${this.task.title}`
      return this.tickets.find(ticket => ticket.title === key) || null
    },
    currentSprint() {
      const activeSprints = this.sprints.filter(s => s.status === 'active')
      if (activeSprints.length === 0) return null

      return activeSprints.sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
        return bDate - aDate
      })[0]
    },
    isTaskInCurrentSprint() {
      return !!(this.taskLinkedTicket && this.currentSprint && this.taskLinkedTicket.sprintId === this.currentSprint.id)
    },
    isTimeValid() {
      return (this.timeForm.hours > 0 || this.timeForm.minutes > 0) && this.timeForm.date
    }
  },
  async mounted() {
    await this.loadTask()
  },
  watch: {
    '$route.params.odooId': async function() {
      await this.loadTask()
    }
  },
  methods: {
    async loadTask() {
      const odooId = parseInt(this.$route.params.odooId)
      this.task = await db.getOdooTaskByOdooId(odooId)
      this.todos = await db.getAllTodos()
      this.tickets = []
      this.sprints = []

      if (this.task?.localProjectId) {
        this.project = await db.getProject(this.task.localProjectId)
        this.tickets = await db.getTicketsByProject(this.task.localProjectId)
        this.sprints = await db.getSprintsByProject(this.task.localProjectId)
      } else {
        this.project = null
      }

      await this.loadTaskTimeEntries()
    },
    async loadTaskTimeEntries() {
      if (!this.task?.odooId) return
      this.loadingTimeEntries = true
      this.timeSyncError = null
      try {
        const entries = await odooService.getTaskTimeEntries(this.task.odooId)
        this.taskTimeEntries = (entries || [])
          .map(e => ({
            id: e.id,
            duration: Math.round((e.unit_amount || 0) * 60),
            date: e.date,
            description: e.name || ''
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        await this.refreshTaskTotalMinutes()
      } catch (error) {
        this.timeSyncError = error?.message || 'Erreur lors du chargement des feuilles de temps'
      } finally {
        this.loadingTimeEntries = false
      }
    },
    async refreshTaskTotalMinutes() {
      if (!this.task?.odooId) return
      const total = this.taskTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      this.task.timeTotalMinutes = total
      await db.updateOdooTaskByOdooId(this.task.odooId, { timeTotalMinutes: total })
    },
    async addToTodoList() {
      if (!this.task) return
      const todoText = `[TÂCHE ODOO #${this.task.odooId}] ${this.task.title}`
      await db.addTodo(todoText)
      this.todos = await db.getAllTodos()
    },
    async addTaskToCurrentSprint() {
      if (!this.task || !this.project || !this.currentSprint) return

      const ticketTitle = `[TÂCHE ODOO #${this.task.odooId}] ${this.task.title}`
      let targetTicket = this.taskLinkedTicket

      if (!targetTicket) {
        const ticketId = await db.addTicket({
          projectId: this.project.id,
          title: ticketTitle,
          description: this.task.description || '',
          status: 'todo',
          priority: 'medium',
          sprintId: this.currentSprint.id
        })
        targetTicket = await db.getTicket(Number(ticketId))
      } else {
        await db.updateTicket(targetTicket.id, { sprintId: this.currentSprint.id })
      }

      await this.loadTask()
      alert('✅ Tâche ajoutée au sprint en cours via un ticket local.')

      if (targetTicket?.id) {
        this.$router.push(`/tickets/${targetTicket.id}`)
      }
    },
    async addTime() {
      if (!this.task) return
      const duration = (this.timeForm.hours * 60) + this.timeForm.minutes
      if (duration <= 0) return

      this.syncing = true
      this.timeSyncError = null
      try {
        await odooService.createTaskTimeEntry(this.task.odooId, duration, this.timeForm.date, this.timeForm.description || '')
        this.timeForm = {
          hours: 0,
          minutes: 0,
          date: new Date().toISOString().split('T')[0],
          description: ''
        }
        await this.loadTaskTimeEntries()
      } catch (error) {
        this.timeSyncError = error?.message || 'Erreur de saisie de temps Odoo'
      } finally {
        this.syncing = false
      }
    },
    startTaskTimeEdit(entry) {
      this.timeSyncError = null
      this.editingTimeEntryId = entry.id
      this.editingTimeEntry = {
        hours: Math.floor((entry.duration || 0) / 60),
        minutes: (entry.duration || 0) % 60,
        date: entry.date,
        description: entry.description || ''
      }
    },
    cancelTaskTimeEdit() {
      this.editingTimeEntryId = null
      this.editingTimeEntry = {
        hours: 0,
        minutes: 0,
        date: '',
        description: ''
      }
    },
    async saveTaskTimeEdit() {
      if (!this.editingTimeEntryId) return
      const duration = (this.editingTimeEntry.hours * 60) + this.editingTimeEntry.minutes
      if (duration <= 0) {
        this.timeSyncError = 'La durée doit être supérieure à 0'
        return
      }

      this.syncing = true
      this.timeSyncError = null
      try {
        await odooService.updateTimeEntry(
          this.editingTimeEntryId,
          duration,
          this.editingTimeEntry.date,
          this.editingTimeEntry.description || ''
        )

        const idx = this.taskTimeEntries.findIndex(e => e.id === this.editingTimeEntryId)
        if (idx !== -1) {
          this.taskTimeEntries[idx] = {
            ...this.taskTimeEntries[idx],
            duration,
            date: this.editingTimeEntry.date,
            description: this.editingTimeEntry.description || ''
          }
        }

        this.taskTimeEntries = [...this.taskTimeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        await this.refreshTaskTotalMinutes()
        this.cancelTaskTimeEdit()
      } catch (error) {
        this.timeSyncError = error?.message || 'Erreur lors de la mise à jour de la feuille de temps'
      } finally {
        this.syncing = false
      }
    },
    async deleteTaskTimeEntry(entry) {
      if (!confirm('Supprimer cette feuille de temps ?')) return

      this.syncing = true
      this.timeSyncError = null
      try {
        await odooService.deleteTimeEntry(entry.id)
        this.taskTimeEntries = this.taskTimeEntries.filter(e => e.id !== entry.id)
        await this.refreshTaskTotalMinutes()
      } catch (error) {
        this.timeSyncError = error?.message || 'Erreur lors de la suppression de la feuille de temps'
      } finally {
        this.syncing = false
      }
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
    getStatusClass(status) {
      const classes = {
        'todo': 'badge-warning',
        'in-progress': 'badge-info',
        'done': 'badge-success'
      }
      return classes[status] || 'badge-info'
    },
    getStatusLabel(status) {
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
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.clickable-badge {
  text-decoration: none;
}

.task-description {
  color: #666;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item strong {
  color: #666;
  font-size: 0.875rem;
}

.time-badge {
  background: #ef6c00;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  width: fit-content;
}

.task-time-form {
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
</style>
