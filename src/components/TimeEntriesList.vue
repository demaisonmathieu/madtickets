<template>
  <div>
    <div class="page-header">
      <div>
        <h2>⏱️ Feuilles de temps</h2>
        <p style="color: #666; margin-top: 0.5rem;">Vue globale des saisies locales par projet, ticket et utilisateur.</p>
      </div>
    </div>

    <div class="card">
      <div class="filters">
        <div class="form-group">
          <label>Projet</label>
          <select v-model="filterProjectId">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="String(project.id)">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Utilisateur</label>
          <select v-model="filterUserId">
            <option value="">Tous les utilisateurs</option>
            <option value="__none__">Non défini</option>
            <option v-for="user in users" :key="user.id" :value="String(user.id)">
              {{ user.displayName }} ({{ user.username }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Date du</label>
          <input v-model="filterDateFrom" type="date" />
        </div>
        <div class="form-group">
          <label>Date au</label>
          <input v-model="filterDateTo" type="date" />
        </div>
        <div class="form-group">
          <label>Période</label>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" @click="setCurrentWeekRange">Semaine en cours</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="clearDateRange">Tout afficher</button>
          </div>
        </div>
        <div class="form-group">
          <label>Recherche</label>
          <input v-model="searchQuery" type="text" placeholder="Ticket, projet, description..." />
        </div>
      </div>
    </div>

    <div class="card stats-card">
      <div><strong>Total :</strong> {{ formatDuration(totalDuration) }}</div>
      <div><strong>Entrées :</strong> {{ filteredEntries.length }}</div>
    </div>

    <div v-if="filteredEntries.length === 0" class="card empty-state">
      Aucune feuille de temps trouvée.
    </div>

    <div v-else class="entries-list">
      <div v-for="entry in filteredEntries" :key="entry.id" class="card entry-card">
        <div v-if="editingEntryId === entry.id" class="entry-edit-grid">
          <div class="form-group">
            <label>Durée (minutes)</label>
            <input v-model.number="editingEntry.duration" type="number" min="1" />
          </div>
          <div class="form-group">
            <label>Date</label>
            <input v-model="editingEntry.date" type="date" />
          </div>
          <div class="form-group">
            <label>Utilisateur</label>
            <select v-model="editingEntry.userId">
              <option :value="null">Non défini</option>
              <option v-for="user in users" :key="`inline-user-${user.id}`" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="form-group entry-edit-description">
            <label>Description</label>
            <input v-model="editingEntry.description" type="text" placeholder="Travail effectué..." />
          </div>
          <div class="entry-actions">
            <button @click="saveInlineEdit(entry.id)" class="btn btn-primary btn-sm">💾 Enregistrer</button>
            <button @click="cancelInlineEdit" class="btn btn-secondary btn-sm">Annuler</button>
          </div>
        </div>

        <template v-else>
        <div class="entry-header">
          <div>
            <h3>{{ getTicketTitle(entry.ticketId) }}</h3>
            <div class="entry-badges">
              <span class="badge badge-info">📁 {{ getProjectName(entry.ticketId) }}</span>
              <span class="badge badge-secondary">👤 {{ getUserDisplayName(entry.userId) }}</span>
              <span class="badge" :class="entry.synced ? 'badge-success' : 'badge-warning'">
                {{ entry.synced ? 'Synchronisé' : 'Local' }}
              </span>
            </div>
          </div>
          <div class="entry-total">{{ formatDuration(entry.duration) }}</div>
        </div>

        <div class="entry-meta">
          <small>{{ formatDate(entry.date) }}</small>
          <small v-if="entry.createdAt">Créée le {{ formatDateTime(entry.createdAt) }}</small>
        </div>

        <p class="entry-description">{{ entry.description || 'Sans description' }}</p>

        <div class="entry-actions">
          <button @click="startInlineEdit(entry)" class="btn btn-secondary btn-sm">✏️ Modifier</button>
          <button @click="viewTicket(entry.ticketId)" class="btn btn-primary btn-sm">🎫 Voir le ticket</button>
        </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'TimeEntriesList',
  data() {
    return {
      timeEntries: [],
      tickets: [],
      projects: [],
      users: [],
      filterProjectId: '',
      filterUserId: '',
      filterDateFrom: '',
      filterDateTo: '',
      searchQuery: '',
      editingEntryId: null,
      editingEntry: {
        duration: 0,
        date: '',
        userId: null,
        description: ''
      }
    }
  },
  computed: {
    filteredEntries() {
      return [...this.timeEntries]
        .filter(entry => {
          const ticket = this.tickets.find(item => item.id === entry.ticketId)
          const project = ticket ? this.projects.find(item => item.id === ticket.projectId) : null

          if (this.filterProjectId && String(ticket?.projectId || '') !== this.filterProjectId) return false

          if (this.filterUserId === '__none__' && entry.userId != null) return false
          if (this.filterUserId && this.filterUserId !== '__none__' && String(entry.userId || '') !== this.filterUserId) return false

          if (this.filterDateFrom && entry.date < this.filterDateFrom) return false
          if (this.filterDateTo && entry.date > this.filterDateTo) return false

          if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase()
            const ticketTitle = String(ticket?.title || '').toLowerCase()
            const projectName = String(project?.name || '').toLowerCase()
            const description = String(entry.description || '').toLowerCase()
            if (!ticketTitle.includes(query) && !projectName.includes(query) && !description.includes(query)) {
              return false
            }
          }

          return true
        })
        .sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
          if (dateDiff !== 0) return dateDiff
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        })
    },
    totalDuration() {
      return this.filteredEntries.reduce((total, entry) => total + (entry.duration || 0), 0)
    }
  },
  async mounted() {
    this.setCurrentWeekRange()
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.timeEntries = await db.getAllTimeEntries()
      this.tickets = await db.getAllTickets()
      this.projects = await db.getAllProjects()
      this.users = await db.getActiveUsers()
    },
    getTicketTitle(ticketId) {
      return this.tickets.find(ticket => ticket.id === ticketId)?.title || 'Ticket inconnu'
    },
    getProjectName(ticketId) {
      const ticket = this.tickets.find(item => item.id === ticketId)
      return this.projects.find(project => project.id === ticket?.projectId)?.name || 'Projet inconnu'
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non défini'
      const user = this.users.find(item => item.id === userId)
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    setCurrentWeekRange() {
      const now = new Date()
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMonday)
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      this.filterDateFrom = monday.toISOString().split('T')[0]
      this.filterDateTo = sunday.toISOString().split('T')[0]
    },
    clearDateRange() {
      this.filterDateFrom = ''
      this.filterDateTo = ''
    },
    startInlineEdit(entry) {
      this.editingEntryId = entry.id
      this.editingEntry = {
        duration: entry.duration || 0,
        date: entry.date || '',
        userId: entry.userId ?? null,
        description: entry.description || ''
      }
    },
    cancelInlineEdit() {
      this.editingEntryId = null
      this.editingEntry = {
        duration: 0,
        date: '',
        userId: null,
        description: ''
      }
    },
    async saveInlineEdit(entryId) {
      if (!entryId) return
      if (!this.editingEntry.duration || this.editingEntry.duration <= 0) {
        alert('La durée doit être supérieure à 0')
        return
      }
      if (!this.editingEntry.date) {
        alert('La date est obligatoire')
        return
      }

      await db.updateTimeEntry(entryId, {
        duration: this.editingEntry.duration,
        date: this.editingEntry.date,
        userId: this.editingEntry.userId ?? null,
        description: this.editingEntry.description || ''
      })

      await this.loadData()
      this.cancelInlineEdit()
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    },
    formatDateTime(dateStr) {
      return new Date(dateStr).toLocaleString('fr-FR')
    },
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '0h'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins}min`
      if (mins === 0) return `${hours}h`
      return `${hours}h${mins.toString().padStart(2, '0')}`
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stats-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.entry-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entry-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

.entry-edit-description {
  grid-column: span 2;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.entry-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.entry-total {
  font-size: 1.15rem;
  font-weight: 700;
  color: #4DBA87;
  white-space: nowrap;
}

.entry-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: #666;
}

.entry-description {
  color: #333;
}

.entry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  color: #999;
}

@media (max-width: 768px) {
  .entry-edit-description {
    grid-column: span 1;
  }
}
</style>
