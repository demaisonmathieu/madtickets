<template>
  <div>
    <div class="page-header">
      <h2>Tous les Tickets</h2>
      <div class="header-actions">
        <label class="favorite-filter-chip">
          <input type="checkbox" v-model="filterOnlyFavorites" style="width: auto;" />
          <span>⭐ Favoris uniquement</span>
        </label>
        <template v-if="selectedTickets.length > 0">
          <select v-model="bulkStatusChange" style="padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
            <option value="">Changer statut...</option>
            <option value="todo">À faire</option>
            <option value="in-progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
          <button @click="applyBulkStatus" :disabled="!bulkStatusChange" class="btn btn-primary">✓ Statut</button>
          <select v-model="bulkPriorityChange" style="padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
            <option value="">Changer priorité...</option>
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
          <button @click="applyBulkPriority" :disabled="!bulkPriorityChange" class="btn btn-primary">✓ Priorité</button>
          <button @click="deleteSelectedConfirm" class="btn btn-danger">🗑️ Supprimer ({{ selectedTickets.length }})</button>
        </template>
        <button v-if="selectMode" @click="selectAll" class="btn btn-secondary">{{ allSelected ? '☐ Tout désélectionner' : '☑️ Tout sélectionner' }}</button>
        <button @click="toggleSelectMode" class="btn btn-secondary" v-if="filteredTickets.length > 0">{{ selectMode ? '✖ Fermer sélection' : '☑️ Sélection multiple' }}</button>
        <button @click="showForm = true" class="btn btn-primary">+ Nouveau ticket</button>
      </div>
    </div>

    <!-- Formulaire de création -->
    <div v-if="showForm" class="card">
      <h3>Nouveau Ticket</h3>
      <form @submit.prevent="saveTicket">
        <div class="form-group">
          <label>Projet *</label>
          <select v-model="form.projectId" required>
            <option value="">Sélectionner un projet</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Titre *</label>
          <input v-model="form.title" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <RichTextEditor v-model="form.description" placeholder="Description du ticket..." />
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="form.status">
            <option value="todo">À faire</option>
            <option value="in-progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priorité</label>
          <select v-model="form.priority">
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </div>
        <div class="form-group">
          <label>Assigné à</label>
          <select v-model="form.assignedUserId">
            <option :value="null">Non assigné</option>
            <option v-for="user in users" :key="`list-user-${user.id}`" :value="user.id">
              {{ user.displayName }} ({{ user.username }})
            </option>
          </select>
        </div>
        <div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" v-model="formOptions.addToTodo" style="width: auto;" />
            <span>📋 Ajouter aussi à la todo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" v-model="formOptions.addToCurrentSprint" style="width: auto;" />
            <span>
              🏃 Ajouter au sprint en cours
              <small v-if="!currentSprintForSelectedProject" style="color: #999;">(aucun sprint actif pour ce projet)</small>
            </span>
          </label>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="cancelForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Filtres -->
    <div class="card">
      <!-- Barre de recherche -->
      <div class="search-input-wrapper" style="margin-bottom: 1rem;">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher un ticket par titre ou description..." 
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">✕</button>
      </div>
      
      <!-- Filtres existants -->
      <div class="filters">
        <div class="form-group">
          <label>Projet</label>
          <select v-model="filterProject">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="filterStatus">
            <option value="">Masquer terminés (défaut)</option>
            <option value="__all__">Afficher tous</option>
            <option value="todo">À faire</option>
            <option value="in-progress">En cours</option>
            <option value="done">Terminé</option>
          </select>
        </div>
        <div class="form-group">
          <label>Priorité</label>
          <select v-model="filterPriority">
            <option value="">Toutes</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
        <div class="form-group">
          <label>Date de création (du)</label>
          <input type="date" v-model="filterDateFrom" />
        </div>
        <div class="form-group">
          <label>Date de création (au)</label>
          <input type="date" v-model="filterDateTo" />
        </div>
      </div>
      
      <small v-if="searchQuery" style="color: #666; margin-top: 0.5rem; display: block;">
        {{ filteredTickets.length }} résultat(s) trouvé(s)
      </small>
    </div>

    <!-- Liste des tickets -->
    <div v-if="filteredTickets.length === 0" class="card">
      <p style="text-align: center; color: #999;">{{ searchQuery ? 'Aucun ticket ne correspond à votre recherche.' : 'Aucun ticket trouvé.' }}</p>
    </div>

    <div
      v-for="ticket in filteredTickets"
      :key="ticket.id"
      class="card ticket-card"
      :class="{ 'selected': isSelected(ticket.id) }"
      @click="handleTicketCardClick(ticket.id)"
    >
      <div class="ticket-header">
        <div style="display: flex; align-items: start; gap: 1rem; flex: 1;">
          <input v-if="selectMode" type="checkbox" :checked="isSelected(ticket.id)" @change="toggleSelection(ticket.id)" @click.stop class="select-checkbox" />
          <div style="flex: 1; cursor: pointer;">
            <h3>{{ ticket.title }}</h3>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
              <span class="badge" :class="getStatusClass(ticket.status)">{{ getStatusLabel(ticket.status) }}</span>
              <span class="badge" :class="getPriorityClass(ticket.priority)">{{ getPriorityLabel(ticket.priority) }}</span>
              <span class="badge" :class="getRecetteStatusClass(ticket.recetteStatus)">{{ getRecetteStatusLabel(ticket.recetteStatus) }}</span>
              <span class="badge badge-info">👤 {{ getUserDisplayName(ticket.assignedUserId) }}</span>
              <span
                v-if="getProjectName(ticket.projectId)"
                class="badge badge-info clickable-badge"
                @click.stop="viewProject(ticket.projectId)"
              >
                {{ getProjectName(ticket.projectId) }}
              </span>
            </div>
          </div>
        </div>
        <div class="ticket-actions">
          <button @click.stop="viewTicket(ticket.id)" class="btn btn-primary btn-sm">👁️ Voir</button>
          <button @click.stop="viewProject(ticket.projectId)" class="btn btn-secondary btn-sm">Voir le projet</button>
          <button
            v-if="canSyncTicketToOdoo(ticket)"
            @click.stop="syncTicketToOdoo(ticket)"
            class="btn btn-secondary btn-sm"
          >
            🔄 Sync Odoo
          </button>
          <button @click.stop="setTicketRecetteStatus(ticket, 'validated')" class="btn btn-secondary btn-sm">✅ Recette OK</button>
          <button @click.stop="setTicketRecetteStatus(ticket, 'rejected')" class="btn btn-secondary btn-sm">❌ Recette KO</button>
          <button @click.stop="deleteTicketConfirm(ticket)" class="btn btn-danger btn-sm">🗑️ Supprimer</button>
        </div>
      </div>
      <div v-if="ticket.description" class="ticket-description" v-html="truncateHtml(ticket.description)" style="cursor: pointer;"></div>
      <div class="ticket-meta">
        <small>Créé le {{ formatDate(ticket.createdAt) }}</small>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'
import { odooService } from '../services/odoo-new'
import RichTextEditor from './RichTextEditor.vue'

export default {
  name: 'TicketsList',
  components: {
    RichTextEditor
  },
  data() {
    return {
      tickets: [],
      projects: [],
      users: [],
      currentUserId: null,
      sprints: [],
      filterProject: '',
      filterStatus: '',
      filterPriority: '',
      filterDateFrom: '',
      filterDateTo: '',
      filterOnlyFavorites: true,
      searchQuery: '',
      showForm: false,
      selectMode: false,
      selectedTickets: [],
      bulkStatusChange: '',
      bulkPriorityChange: '',
      form: {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedUserId: null
      },
      formOptions: {
        addToTodo: false,
        addToCurrentSprint: false
      }
    }
  },
  computed: {
    filteredTickets() {
      return this.tickets.filter(ticket => {
        if (this.filterOnlyFavorites) {
          const project = this.projects.find(p => p.id === ticket.projectId)
          if (!project || !project.isFavorite) return false
        }

        if (this.filterProject && ticket.projectId !== this.filterProject) return false
        if (this.filterStatus === '') {
          if (ticket.status === 'done') return false
        } else if (this.filterStatus !== '__all__' && ticket.status !== this.filterStatus) {
          return false
        }
        if (this.filterPriority && ticket.priority !== this.filterPriority) return false

        if (this.filterDateFrom) {
          const ticketDate = new Date(ticket.createdAt).setHours(0, 0, 0, 0)
          const fromDate = new Date(this.filterDateFrom).setHours(0, 0, 0, 0)
          if (ticketDate < fromDate) return false
        }

        if (this.filterDateTo) {
          const ticketDate = new Date(ticket.createdAt).setHours(0, 0, 0, 0)
          const toDate = new Date(this.filterDateTo).setHours(0, 0, 0, 0)
          if (ticketDate > toDate) return false
        }

        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase()
          const titleMatch = ticket.title.toLowerCase().includes(query)
          const descMatch = ticket.description?.toLowerCase().includes(query)
          if (!titleMatch && !descMatch) return false
        }

        return true
      })
    },
    allSelected() {
      return this.filteredTickets.length > 0 && this.selectedTickets.length === this.filteredTickets.length
    },
    currentSprintForSelectedProject() {
      if (!this.form.projectId) return null
      const projectId = Number(this.form.projectId)
      const activeSprints = this.sprints.filter(s => Number(s.projectId) === projectId && s.status === 'active')
      if (activeSprints.length === 0) return null

      return activeSprints.sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
        return bDate - aDate
      })[0]
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.currentUserId = auth.getSession()?.userId || null
      this.tickets = await db.getAllTickets()
      this.projects = await db.getAllProjects()
      this.users = await db.getActiveUsers()
      this.sprints = await db.getAllSprints()
      if (this.form.assignedUserId === null) this.form.assignedUserId = this.currentUserId
    },
    async saveTicket() {
      const projectId = parseInt(this.form.projectId)
      const sprintId = this.formOptions.addToCurrentSprint ? (this.currentSprintForSelectedProject?.id || null) : null

      if (this.formOptions.addToCurrentSprint && !sprintId) {
        alert('Aucun sprint actif trouvé pour ce projet.')
      }

      const createdTicketKey = await db.addTicket({
        projectId,
        title: this.form.title,
        description: this.form.description,
        status: this.form.status,
        priority: this.form.priority,
        assignedUserId: this.form.assignedUserId ?? this.currentUserId,
        sprintId
      })

      let odooSyncMessage = ''
      const selectedProject = this.projects.find(p => p.id === projectId)

      if (selectedProject?.odooId && odooService.isConfigured()) {
        try {
          const createdOdooId = await odooService.createHelpdeskTicketForProject(
            selectedProject.odooId,
            this.form.title,
            this.form.description || '',
            this.form.priority
          )

          const localTicketId = Number(createdTicketKey)
          if (Number.isFinite(localTicketId) && localTicketId > 0) {
            await db.updateTicket(localTicketId, { odooId: createdOdooId })
          }

          odooSyncMessage = ' + Odoo'
        } catch (syncError) {
          console.error('Erreur de synchronisation ticket vers Odoo:', syncError)
          odooSyncMessage = ' (⚠️ Odoo non synchronisé)'
        }
      }

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
        alert(`✅ Ticket ajouté (${actions.join(' + ')})${odooSyncMessage}`)
      } else if (odooSyncMessage) {
        alert(`✅ Ticket ajouté${odooSyncMessage}`)
      }

      await this.loadData()
      this.cancelForm()
    },
    cancelForm() {
      this.showForm = false
      this.form = {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignedUserId: this.currentUserId
      }
      this.formOptions = {
        addToTodo: false,
        addToCurrentSprint: false
      }
    },
    getProjectName(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : ''
    },
    getProjectById(projectId) {
      return this.projects.find(p => p.id === projectId) || null
    },
    canSyncTicketToOdoo(ticket) {
      if (!ticket || ticket.odooId) return false
      const project = this.getProjectById(ticket.projectId)
      return !!(project?.odooId && odooService.isConfigured())
    },
    async syncTicketToOdoo(ticket) {
      if (!this.canSyncTicketToOdoo(ticket)) return

      try {
        const project = this.getProjectById(ticket.projectId)
        const createdOdooId = await odooService.createHelpdeskTicketForProject(
          project.odooId,
          ticket.title,
          ticket.description || '',
          ticket.priority
        )

        await db.updateTicket(ticket.id, { odooId: createdOdooId })
        await this.loadData()
        alert('✅ Ticket synchronisé vers Odoo')
      } catch (error) {
        console.error('Erreur de synchronisation ticket vers Odoo:', error)
        alert(`❌ ${error.message || 'Erreur de synchronisation Odoo'}`)
      }
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => u.id === userId)
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    },
    handleTicketCardClick(ticketId) {
      if (this.selectMode) {
        this.toggleSelection(ticketId)
        return
      }
      this.viewTicket(ticketId)
    },
    viewProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    async deleteTicketConfirm(ticket) {
      if (confirm(`Supprimer le ticket "${ticket.title}" ?`)) {
        await db.deleteTicket(ticket.id)
        await this.loadData()
      }
    },
    toggleSelectMode() {
      this.selectMode = !this.selectMode
      if (!this.selectMode) {
        this.selectedTickets = []
        this.bulkStatusChange = ''
        this.bulkPriorityChange = ''
      }
    },
    toggleSelection(ticketId) {
      const index = this.selectedTickets.indexOf(ticketId)
      if (index > -1) {
        this.selectedTickets.splice(index, 1)
      } else {
        this.selectedTickets.push(ticketId)
      }
    },
    isSelected(ticketId) {
      return this.selectedTickets.includes(ticketId)
    },
    selectAll() {
      if (this.allSelected) {
        this.selectedTickets = []
      } else {
        this.selectedTickets = this.filteredTickets.map(t => t.id)
      }
    },
    truncateHtml(html, maxLength = 100) {
      if (!html) return ''
      const temp = document.createElement('div')
      temp.innerHTML = html
      const text = temp.textContent || temp.innerText || ''

      if (text.length <= maxLength) {
        return html
      }

      return text.substring(0, maxLength) + '...'
    },
    async deleteSelectedConfirm() {
      const count = this.selectedTickets.length
      if (confirm(`Supprimer ${count} ticket(s) sélectionné(s) ?`)) {
        for (const ticketId of this.selectedTickets) {
          await db.deleteTicket(ticketId)
        }
        this.selectedTickets = []
        this.selectMode = false
        await this.loadData()
      }
    },
    async applyBulkStatus() {
      if (!this.bulkStatusChange || this.selectedTickets.length === 0) return
      for (const ticketId of this.selectedTickets) {
        await db.updateTicket(ticketId, { status: this.bulkStatusChange })
      }
      this.bulkStatusChange = ''
      await this.loadData()
    },
    async applyBulkPriority() {
      if (!this.bulkPriorityChange || this.selectedTickets.length === 0) return
      for (const ticketId of this.selectedTickets) {
        await db.updateTicket(ticketId, { priority: this.bulkPriorityChange })
      }
      this.bulkPriorityChange = ''
      await this.loadData()
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
      // Rechercher dans les colonnes kanban de tous les projets
      for (const project of this.projects) {
        if (project.kanbanColumns) {
          const col = project.kanbanColumns.find(c => c.id === status)
          if (col) return col.label
        }
      }
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
    getRecetteStatusClass(status) {
      const classes = {
        'pending': 'badge-warning',
        'ready_for_test': 'badge-info',
        'in_test': 'badge-info',
        'blocked': 'badge-danger',
        'validated': 'badge-success',
        'rejected': 'badge-danger'
      }
      return classes[status] || 'badge-warning'
    },
    getRecetteStatusLabel(status) {
      const labels = {
        'pending': '🧪 À recetter',
        'ready_for_test': '🧾 Prêt à tester',
        'in_test': '🧪 En test',
        'blocked': '🚧 Bloqué',
        'validated': '✅ Recette validée',
        'rejected': '❌ Recette KO'
      }
      return labels[status] || '🧪 À recetter'
    },
    async setTicketRecetteStatus(ticket, status) {
      if (!ticket?.id) return

      await db.updateTicket(ticket.id, {
        recetteStatus: status,
        recetteDate: new Date().toISOString(),
        recetteByUserId: this.currentUserId || null
      })

      await this.loadData()
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.favorite-filter-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
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
  color: #666;
}

.ticket-card {
  transition: transform 0.2s;
  cursor: pointer;
}

.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.ticket-card.selected {
  border: 2px solid #007bff;
  background-color: #f0f8ff;
}

.select-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-top: 0.25rem;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.ticket-header h3 {
  margin-bottom: 0.5rem;
}

.ticket-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
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
}

.clickable-badge {
  cursor: pointer;
}

@media (max-width: 900px) {
  .page-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .header-actions {
    align-items: stretch;
  }

  .header-actions > * {
    width: 100%;
  }

  .ticket-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .ticket-actions {
    width: 100%;
  }

  .ticket-actions .btn {
    flex: 1 1 calc(50% - 0.5rem);
  }
}

@media (max-width: 520px) {
  .ticket-actions .btn {
    flex-basis: 100%;
  }
}
</style>
