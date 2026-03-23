<template>
  <div>
    <div class="page-header">
      <h2>🏃 Tous les Sprints</h2>
    </div>

    <!-- Filtres -->
    <div class="card filters-card">
      <div class="filters">
        <div class="form-group">
          <label>Statut</label>
          <select v-model="filterStatus">
            <option value="">Tous</option>
            <option value="planned">Planifié</option>
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
          </select>
        </div>
        <div class="form-group">
          <label>Projet</label>
          <select v-model="filterProject">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Liste des sprints -->
    <div v-if="filteredSprints.length === 0" class="card">
      <p style="text-align: center; color: #999;">Aucun sprint trouvé.</p>
    </div>

    <div class="sprints-grid">
      <div v-for="sprint in filteredSprints" :key="sprint.id" class="card sprint-card">
        <div class="sprint-header">
          <div>
            <h3>{{ sprint.name }}</h3>
            <span class="badge" :class="getStatusClass(sprint.status)">{{ getStatusLabel(sprint.status) }}</span>
            <p class="project-name clickable-project-name" @click="viewProject(sprint.projectId)">📁 {{ getProjectName(sprint.projectId) }}</p>
          </div>
        </div>

        <div v-if="sprint.goal" class="sprint-goal" v-html="sprint.goal"></div>

        <div class="sprint-dates">
          <small v-if="sprint.startDate">📅 {{ formatDate(sprint.startDate) }}</small>
          <small v-if="sprint.endDate"> → {{ formatDate(sprint.endDate) }}</small>
        </div>

        <div class="sprint-stats">
          <span class="stat">🎫 {{ getSprintTicketsCount(sprint.id) }} tickets</span>
          <span class="stat">📝 {{ (sprint.meetingNotes || []).length }} CR</span>
        </div>

        <div class="sprint-actions">
          <router-link :to="`/projects/${sprint.projectId}/sprints?sprintId=${sprint.id}`" class="btn btn-primary btn-sm">
            📋 Ouvrir
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'SprintsList',
  data() {
    return {
      sprints: [],
      projects: [],
      tickets: [],
      filterStatus: '',
      filterProject: ''
    }
  },
  async mounted() {
    await this.loadData()
  },
  computed: {
    filteredSprints() {
      return this.sprints.filter(sprint => {
        if (this.filterStatus && sprint.status !== this.filterStatus) return false
        if (this.filterProject && sprint.projectId !== this.filterProject) return false
        return true
      }).sort((a, b) => {
        // Trier par statut puis par date
        const statusOrder = { active: 0, planned: 1, completed: 2 }
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    }
  },
  methods: {
    async loadData() {
      this.sprints = await db.getAllSprints()
      this.projects = await db.getAllProjects()
      this.tickets = await db.getAllTickets()
    },
    getProjectName(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : 'Projet inconnu'
    },
    viewProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    getSprintTicketsCount(sprintId) {
      return this.tickets.filter(t => t.sprintId === sprintId).length
    },
    getStatusClass(status) {
      const classes = {
        'planned': 'badge-warning',
        'active': 'badge-success',
        'completed': 'badge-info'
      }
      return classes[status] || 'badge-info'
    },
    getStatusLabel(status) {
      const labels = {
        'planned': 'Planifié',
        'active': 'En cours',
        'completed': 'Terminé'
      }
      return labels[status] || status
    },
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

.filters-card {
  margin-bottom: 2rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.sprints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.sprint-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s;
}

.sprint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.sprint-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.project-name {
  margin: 0.5rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.clickable-project-name {
  cursor: pointer;
}

.sprint-goal {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sprint-dates {
  display: flex;
  gap: 0.5rem;
  color: #999;
  font-size: 0.85rem;
}

.sprint-stats {
  display: flex;
  gap: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

.stat {
  font-size: 0.9rem;
  color: #666;
}

.sprint-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .sprints-grid {
    grid-template-columns: 1fr;
  }
}
</style>
