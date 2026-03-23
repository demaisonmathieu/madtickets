<template>
  <div>
    <div class="page-header">
      <h2>Mes Projets</h2>
      <div style="display: flex; gap: 1rem;">
        <button v-if="selectedProjects.length > 0" @click="deleteSelectedConfirm" class="btn btn-danger">🗑️ Supprimer ({{ selectedProjects.length }})</button>
        <button v-if="selectMode" @click="selectAll" class="btn btn-secondary">{{ allSelected ? '☐ Tout désélectionner' : '☑️ Tout sélectionner' }}</button>
        <button @click="toggleSelectMode" class="btn btn-secondary" v-if="sortedProjects.length > 0">{{ selectMode ? 'Annuler sélection' : '☑️ Sélectionner' }}</button>
        <button @click="showFavoritesOnly = !showFavoritesOnly" class="btn btn-secondary" v-if="sortedProjects.length > 0">
          {{ showFavoritesOnly ? '📋 Tous' : '⭐ Favoris' }}
        </button>
        <button @click="showForm = true" class="btn btn-primary">+ Nouveau Projet</button>
      </div>
    </div>

    <!-- Barre de recherche -->
    <div v-if="projects.length > 0" class="card search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Rechercher un projet par nom ou description..." 
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">✕</button>
      </div>
      <small v-if="searchQuery" style="color: #666; margin-top: 0.5rem; display: block;">
        {{ filteredProjects.length }} résultat(s) trouvé(s)
      </small>
    </div>

    <!-- Formulaire de création/édition -->
    <div v-if="showForm" class="card">
      <h3>{{ editingProject ? 'Modifier' : 'Nouveau' }} Projet</h3>
      <form @submit.prevent="saveProject">
        <div class="form-group">
          <label>Nom du projet *</label>
          <input v-model="form.name" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <RichTextEditor v-model="form.description" placeholder="Description du projet..." />
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="form.status">
            <option value="active">Actif</option>
            <option value="on-hold">En pause</option>
            <option value="completed">Terminé</option>
          </select>
        </div>
        <div class="form-group">
          <label>Assigné à</label>
          <select v-model="form.assignedUserId">
            <option :value="null">Non assigné</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.displayName }} ({{ user.username }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Followers du projet</label>
          <div class="followers-picker">
            <label v-for="user in users" :key="`follower-${user.id}`" class="follower-option">
              <input
                type="checkbox"
                :value="user.id"
                v-model="form.followerUserIds"
              />
              <span>{{ user.displayName }} ({{ user.username }})</span>
            </label>
          </div>
          <small style="color: #666; display: block; margin-top: 0.35rem;">
            Un utilisateur standard voit ce projet uniquement s'il est follower.
          </small>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="cancelForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Liste des projets -->
    <div v-if="filteredProjects.length === 0 && !showForm" class="card">
      <p style="text-align: center; color: #999;">
        {{ searchQuery ? 'Aucun projet ne correspond à votre recherche.' : showFavoritesOnly ? 'Aucun projet favori. Cliquez sur l\'étoile pour ajouter un projet aux favoris.' : 'Aucun projet. Créez-en un pour commencer !' }}
      </p>
    </div>

    <div class="projects-grid">
      <div v-for="project in filteredProjects" :key="project.id" class="card project-card" :class="{ 'selected': isSelected(project.id), 'favorite': project.isFavorite }">
        <!-- Header avec checkbox, favori et titre -->
        <div class="project-header">
          <div class="header-left">
            <input v-if="selectMode" type="checkbox" :checked="isSelected(project.id)" @change="toggleSelection(project.id)" class="select-checkbox" />
            <button @click="toggleFavorite(project.id)" class="btn-favorite" :class="{ active: project.isFavorite }" title="Ajouter aux favoris">
              {{ project.isFavorite ? '⭐' : '☆' }}
            </button>
            <div class="header-info">
              <h3>{{ project.name }}</h3>
              <small style="color: #666; display: block; margin-top: 0.25rem;">👤 {{ getUserDisplayName(project.assignedUserId) }}</small>
              <small style="color: #666; display: block; margin-top: 0.15rem;">👥 {{ getFollowerSummary(project) }}</small>
            </div>
          </div>
        </div>
        
        <!-- Footer avec actions et date -->
        <div class="project-footer">
          <small class="project-date">Créé le {{ formatDate(project.createdAt) }}</small>
          <div class="project-actions">
            <button @click="editProject(project)" class="btn btn-secondary btn-sm">✏️</button>
            <button @click="viewProject(project.id)" class="btn btn-primary btn-sm">👁️</button>
            <button @click="deleteProjectConfirm(project)" class="btn btn-danger btn-sm">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import RichTextEditor from './RichTextEditor.vue'
import { auth } from '../services/auth'

export default {
  name: 'ProjectsList',
  components: {
    RichTextEditor
  },
  data() {
    return {
      projects: [],
      users: [],
      currentUserId: null,
      showForm: false,
      editingProject: null,
      selectMode: false,
      selectedProjects: [],
      showFavoritesOnly: false,
      searchQuery: '',
      form: {
        name: '',
        description: '',
        status: 'active',
        assignedUserId: null,
        followerUserIds: []
      }
    }
  },
  computed: {
    allSelected() {
      return this.projects.length > 0 && this.selectedProjects.length === this.projects.length
    },
    sortedProjects() {
      let filtered = this.showFavoritesOnly 
        ? this.projects.filter(p => p.isFavorite)
        : this.projects
      
      // Trier : favoris en premier, puis par date de création
      return filtered.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
    },
    filteredProjects() {
      if (!this.searchQuery) {
        return this.sortedProjects
      }
      
      const query = this.searchQuery.toLowerCase()
      return this.sortedProjects.filter(project => {
        const nameMatch = project.name.toLowerCase().includes(query)
        const descMatch = project.description?.toLowerCase().includes(query)
        return nameMatch || descMatch
      })
    }
  },
  async mounted() {
    this.currentUserId = auth.getSession()?.userId || null
    this.users = await db.getActiveUsers()
    await this.loadProjects()
  },
  methods: {
    async loadProjects() {
      this.projects = await db.getAllProjects()
    },
    async saveProject() {
      const followerUserIds = this.normalizeFollowerUserIds(this.form.followerUserIds, this.form.assignedUserId)

      if (this.editingProject) {
        await db.updateProject(this.editingProject.id, {
          ...this.form,
          followerUserIds
        })
      } else {
        await db.addProject({
          ...this.form,
          assignedUserId: this.form.assignedUserId ?? this.currentUserId,
          followerUserIds
        })
      }
      await this.loadProjects()
      this.cancelForm()
    },
    editProject(project) {
      this.editingProject = project
      this.form = {
        name: project.name,
        description: project.description || '',
        status: project.status,
        assignedUserId: project.assignedUserId ?? null,
        followerUserIds: this.normalizeFollowerUserIds(project.followerUserIds, project.assignedUserId)
      }
      this.showForm = true
    },
    cancelForm() {
      this.showForm = false
      this.editingProject = null
      this.form = {
        name: '',
        description: '',
        status: 'active',
        assignedUserId: this.currentUserId,
        followerUserIds: this.currentUserId ? [this.currentUserId] : []
      }
    },
    normalizeFollowerUserIds(followerUserIds, assignedUserId = null) {
      const ids = new Set()
      const addId = value => {
        const numericValue = Number(value)
        if (Number.isFinite(numericValue) && numericValue > 0) {
          ids.add(numericValue)
        }
      }

      if (Array.isArray(followerUserIds)) {
        followerUserIds.forEach(addId)
      }

      addId(assignedUserId)
      addId(this.currentUserId)

      return Array.from(ids)
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => u.id === userId)
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    getFollowerSummary(project) {
      const followerIds = this.normalizeFollowerUserIds(project.followerUserIds, project.assignedUserId)
      if (followerIds.length === 0) return 'Aucun follower'

      const followerNames = followerIds
        .map(userId => this.users.find(user => user.id === userId))
        .filter(Boolean)
        .map(user => user.displayName)

      if (followerNames.length === 0) {
        return `${followerIds.length} follower(s)`
      }

      return followerNames.join(', ')
    },
    async deleteProjectConfirm(project) {
      if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project.name}" ? Tous les tickets associés seront également supprimés.`)) {
        await db.deleteProject(project.id)
        await this.loadProjects()
      }
    },
    async toggleFavorite(projectId) {
      await db.toggleFavorite(projectId)
      await this.loadProjects()
    },
    toggleSelectMode() {
      this.selectMode = !this.selectMode
      if (!this.selectMode) {
        this.selectedProjects = []
      }
    },
    toggleSelection(projectId) {
      const index = this.selectedProjects.indexOf(projectId)
      if (index > -1) {
        this.selectedProjects.splice(index, 1)
      } else {
        this.selectedProjects.push(projectId)
      }
    },
    isSelected(projectId) {
      return this.selectedProjects.includes(projectId)
    },
    selectAll() {
      if (this.allSelected) {
        this.selectedProjects = []
      } else {
        this.selectedProjects = this.projects.map(p => p.id)
      }
    },
    async deleteSelectedConfirm() {
      const count = this.selectedProjects.length
      if (confirm(`Supprimer ${count} projet(s) sélectionné(s) ? Tous les tickets associés seront également supprimés.`)) {
        for (const projectId of this.selectedProjects) {
          await db.deleteProject(projectId)
        }
        this.selectedProjects = []
        this.selectMode = false
        await this.loadProjects()
      }
    },
    viewProject(id) {
      this.$router.push(`/projects/${id}`)
    },
    getStatusClass(status) {
      const classes = {
        'active': 'badge-success',
        'on-hold': 'badge-warning',
        'completed': 'badge-info'
      }
      return classes[status] || 'badge-info'
    },
    getStatusLabel(status) {
      const labels = {
        'active': 'Actif',
        'on-hold': 'En pause',
        'completed': 'Terminé'
      }
      return labels[status] || status
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
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

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.project-card {
  transition: all 0.2s;
  height: fit-content;
  display: flex;
  flex-direction: column;
  position: relative;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.project-card.selected {
  border: 2px solid #007bff;
  background-color: #f0f8ff;
}

.project-card.favorite {
  border-left: 4px solid #ffd700;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.followers-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 180px;
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.follower-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.follower-option input {
  width: auto;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
}

.header-info {
  flex: 1;
}

.header-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  line-height: 1.2;
}

.btn-favorite {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
  color: #ccc;
  line-height: 1;
  flex-shrink: 0;
}

.btn-favorite:hover {
  transform: scale(1.2);
}

.btn-favorite.active {
  color: #ffd700;
  animation: starPulse 0.3s ease-out;
}

@keyframes starPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.search-bar {
  margin-bottom: 1rem;
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

.select-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.project-description {
  color: #666;
  margin: 1rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.project-date {
  color: #999;
  font-size: 0.85rem;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
}

.project-actions .btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 1rem;
  min-width: 40px;
}

@media (max-width: 1200px) {
  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>
