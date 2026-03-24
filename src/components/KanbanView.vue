<template>
  <div>
    <div class="page-header">
      <h2>📊 Kanban des Tickets</h2>
      <button @click="showForm = true" class="btn btn-primary">+ Nouveau Ticket</button>
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
          <textarea v-model="form.description"></textarea>
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="form.status">
            <option v-for="col in currentProjectColumns" :key="col.id" :value="col.id">
              {{ col.label }}
            </option>
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
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="cancelForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Filtres -->
    <div class="card">
      <div v-if="!filterProject" class="info-message">
        ℹ️ Sélectionnez un projet pour voir ses colonnes kanban personnalisées
      </div>
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
          <label>Priorité</label>
          <select v-model="filterPriority">
            <option value="">Toutes</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="kanban-board">
      <!-- Grouper par projet ou utiliser les colonnes du projet filtré -->
      <div v-for="column in kanbanColumns" :key="column.id" class="kanban-column">
        <div class="column-header" :style="{ backgroundColor: column.color }">
          <h3>{{ column.label }}</h3>
          <span class="count-badge">{{ getTicketsByStatus(column.id).length }}</span>
        </div>
        <div 
          class="column-content"
          @drop="onDrop($event, column.id)"
          @dragover.prevent
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
        >
          <div
            v-for="ticket in getTicketsByStatus(column.id)"
            :key="ticket.id"
            class="kanban-card"
            draggable="true"
            @dragstart="onDragStart($event, ticket)"
            @dragend="onDragEnd"
          >
            <div class="card-header">
              <h4>{{ ticket.title }}</h4>
              <div style="display: flex; gap: 0.25rem;">
                <button @click.stop="viewTicket(ticket.id)" class="btn-icon-small" title="Voir le détail">👁️</button>
                <button @click.stop="deleteTicketConfirm(ticket)" class="btn-icon-small" title="Supprimer">🗑️</button>
              </div>
            </div>
            <div v-if="ticket.description" class="card-description" v-html="truncateHtml(ticket.description)" @click="viewTicket(ticket.id)" style="cursor: pointer;"></div>
            <div class="card-footer">
              <span class="badge" :class="getPriorityClass(ticket.priority)">
                {{ getPriorityLabel(ticket.priority) }}
              </span>
              <span v-if="getProjectName(ticket.projectId)" class="project-tag clickable-project-tag" @click.stop="viewProject(ticket.projectId)">
                {{ getProjectName(ticket.projectId) }}
              </span>
            </div>
          </div>
          <div v-if="getTicketsByStatus(column.id).length === 0" class="empty-column">
            Aucun ticket
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'KanbanView',
  data() {
    return {
      tickets: [],
      projects: [],
      projectStages: [],
      filterProject: '',
      filterPriority: '',
      showForm: false,
      form: {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium'
      },
      draggedTicket: null
    }
  },
  computed: {
    filteredTickets() {
      return this.tickets.filter(ticket => {
        if (this.filterProject && ticket.projectId !== this.filterProject) return false
        if (this.filterPriority && ticket.priority !== this.filterPriority) return false
        return true
      })
    },
    selectedProject() {
      if (this.filterProject) {
        return this.projects.find(p => p.id === this.filterProject)
      }
      return null
    },
    // Indique si on est en mode étapes relationnelles (projet sélectionné avec stages)
    useRelationalStages() {
      return this.filterProject && this.projectStages.length > 0
    },
    kanbanColumns() {
      // Priorité aux étapes relationnelles si disponibles
      if (this.useRelationalStages) {
        return this.projectStages.map(s => ({
          id: s.id.toString(),
          label: s.name,
          color: s.color || '#cfe2ff',
          folded: s.folded
        }))
      }
      // Sinon : colonnes JSONB du projet
      if (this.selectedProject?.kanbanColumns?.length) {
        return this.selectedProject.kanbanColumns
      }
      // Fallback par défaut
      return [
        { id: 'todo', label: 'À faire', color: '#fff3cd' },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
        { id: 'done', label: 'Terminé', color: '#d1e7dd' }
      ]
    },
    currentProjectColumns() {
      // Pour le formulaire de création
      if (this.form.projectId) {
        const project = this.projects.find(p => p.id === this.form.projectId)
        if (project?.kanbanColumns) {
          return project.kanbanColumns
        }
      }
      return [
        { id: 'todo', label: 'À faire', color: '#fff3cd' },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
        { id: 'done', label: 'Terminé', color: '#d1e7dd' }
      ]
    }
  },
  async mounted() {
    await this.loadData()
  },
  watch: {
    async filterProject(newProjectId) {
      if (newProjectId) {
        this.projectStages = await db.getStagesByProject(newProjectId)
      } else {
        this.projectStages = []
      }
    }
  },
  methods: {
    async loadData() {
      this.tickets = await db.getAllTickets()
      this.projects = await db.getAllProjects()
      if (this.filterProject) {
        this.projectStages = await db.getStagesByProject(this.filterProject)
      }
    },
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
    },
    cancelForm() {
      this.showForm = false
      this.form = {
        projectId: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium'
      }
    },
    onDragStart(event, ticket) {
      this.draggedTicket = ticket
      event.dataTransfer.effectAllowed = 'move'
      event.target.classList.add('dragging')
    },
    onDragEnd(event) {
      event.target.classList.remove('dragging')
      // Retirer la classe drag-over de toutes les colonnes
      document.querySelectorAll('.column-content').forEach(el => {
        el.classList.remove('drag-over')
      })
    },
    onDragEnter(event) {
      event.preventDefault()
      event.currentTarget.classList.add('drag-over')
    },
    onDragLeave(event) {
      event.currentTarget.classList.remove('drag-over')
    },
    async onDrop(event, newColId) {
      event.preventDefault()
      event.currentTarget.classList.remove('drag-over')
      if (this.draggedTicket) {
        const updates = { status: newColId }
        if (this.useRelationalStages) {
          updates.stageId = parseInt(newColId)
        }
        if (this.draggedTicket.status !== newColId || this.draggedTicket.stageId?.toString() !== newColId) {
          await db.updateTicket(this.draggedTicket.id, updates)
          await this.loadData()
        }
      }
      this.draggedTicket = null
    },
    getProjectName(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : ''
    },
    getTicketsByStatus(colId) {
      return this.filteredTickets.filter(t => {
        if (this.useRelationalStages) {
          // Mode stages relationnelles : utiliser stageId en priorité
          if (t.stageId != null) return t.stageId.toString() === colId
          // Fallback : comparer le status avec le colId
          return t.status === colId
        }
        return t.status === colId
      })
    },
    truncateHtml(html, maxLength = 100) {
      if (!html) return ''
      // Créer un élément temporaire pour extraire le texte
      const temp = document.createElement('div')
      temp.innerHTML = html
      const text = temp.textContent || temp.innerText || ''
      // Tronquer le texte
      if (text.length <= maxLength) return html
      return text.substring(0, maxLength) + '...'
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
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
  align-items: center;
  margin-bottom: 2rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-message {
  background: #e7f3ff;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  color: #0066cc;
  font-size: 0.9rem;
}

.kanban-board {
  display: flex;
  gap: 1.5rem;
  margin-top: 2rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.kanban-column {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  width: 280px;
  flex-shrink: 0;
}

.column-header {
  padding: 1rem;
  color: #333;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.count-badge {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: bold;
}

.column-content {
  padding: 1rem;
  min-height: 400px;
  transition: background-color 0.2s;
}

.column-content.drag-over {
  background-color: rgba(0, 0, 0, 0.05);
}

.empty-column {
  text-align: center;
  color: #999;
  padding: 2rem;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kanban-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: move;
  transition: all 0.3s;
}

.kanban-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.kanban-card.dragging {
  opacity: 0.5;
  transform: rotate(5deg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.card-header h4 {
  margin: 0;
  font-size: 1rem;
  flex: 1;
}

.btn-icon-small {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.btn-icon-small:hover {
  opacity: 1;
}

.card-description {
  color: #666;
  font-size: 0.875rem;
  margin: 0.5rem 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.project-tag {
  font-size: 0.75rem;
  color: #666;
  background: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.clickable-project-tag {
  cursor: pointer;
}

.empty-column {
  text-align: center;
  color: #999;
  padding: 2rem;
  border: 2px dashed #ddd;
  border-radius: 8px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.column-content > div:last-child {
  margin-bottom: 0;
}
</style>
