<template>
  <div id="app">
    <nav class="navbar" v-if="!isLoginPage">
      <div class="nav-container">
        <div class="brand-area">
          <h1>📋 Gestion Tickets</h1>
          <PWAStatus @update="handleUpdate" />
        </div>
        <div class="nav-right">
          <div class="nav-links">
            <router-link to="/dashboard">📊 Dashboard</router-link>
            <div class="dropdown">
              <button class="dropdown-toggle">
                📁 Projets
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-menu">
                <router-link to="/projects" class="dropdown-item dropdown-item-all">
                  📁 Voir tous les projets
                </router-link>
                <router-link to="/tickets" class="dropdown-item">
                  🎫 Tickets
                </router-link>
                <router-link to="/time-entries" class="dropdown-item">
                  ⏱️ Feuilles de temps
                </router-link>
                <router-link to="/tasks" class="dropdown-item">
                  ✅ Tâches
                </router-link>
              </div>
            </div>
            <router-link to="/documents">📁 Documents</router-link>
            <router-link to="/passwords">🔐 Mots de passe</router-link>
            <router-link v-if="isAdmin" to="/users">👥 Utilisateurs</router-link>
            <div class="dropdown">
              <button class="dropdown-toggle">
                🏃 Sprints
                <span class="dropdown-arrow">▼</span>
              </button>
              <div class="dropdown-menu">
                <router-link to="/sprints" class="dropdown-item dropdown-item-all">
                  📋 Voir tous les sprints
                </router-link>
                <div class="dropdown-divider"></div>
                <div v-if="loading" class="dropdown-item-loading">Chargement...</div>
                <template v-else>
                  <div v-if="sprints.length === 0" class="dropdown-item-empty">Aucun sprint</div>
                  <router-link
                    v-for="sprint in sprints"
                    :key="sprint.id"
                    :to="`/projects/${sprint.projectId}/sprints?sprintId=${sprint.id}`"
                    class="dropdown-item"
                  >
                    <span class="sprint-badge" :class="'badge-' + sprint.status">●</span>
                    {{ sprint.name }}
                  </router-link>
                </template>
              </div>
            </div>
            <router-link to="/todos">Todo du jour</router-link>
            <router-link to="/odoo">Odoo</router-link>
            <router-link to="/data">💾 Backup</router-link>
          </div>

          <div class="nav-user" v-if="currentUser">
            <span class="user-pill">👤 {{ currentUser.displayName }}</span>
            <button class="logout-btn" @click="logout">Déconnexion</button>
          </div>
        </div>
      </div>
    </nav>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script>
import PWAStatus from './components/PWAStatus.vue'
import { db } from './services/database-new'
import { auth } from './services/auth'

export default {
  name: 'App',
  components: {
    PWAStatus
  },
  data() {
    return {
      sprints: [],
      loading: false,
      currentUser: auth.getSession()
    }
  },
  computed: {
    isLoginPage() {
      return this.$route.path === '/login'
    },
    isAdmin() {
      return this.currentUser?.role === 'admin'
    }
  },
  async mounted() {
    if (!this.isLoginPage && this.currentUser) {
      await this.loadSprints()
    }
  },
  methods: {
    logout() {
      auth.logout()
      this.currentUser = null
      this.$router.push('/login')
    },
    handleUpdate() {
      window.location.reload()
    },
    async loadSprints() {
      this.loading = true
      try {
        const allSprints = await db.db.getAll('sprints')
        // Trier par statut (actif en premier) puis par date
        this.sprints = allSprints.sort((a, b) => {
          const statusOrder = { active: 0, planned: 1, completed: 2 }
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status]
          }
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
      } catch (error) {
        console.error('Erreur lors du chargement des sprints:', error)
      } finally {
        this.loading = false
      }
    }
  },
  watch: {
    '$route'() {
      this.currentUser = auth.getSession()
      if (this.isLoginPage || !this.currentUser) return
      // Recharger les sprints quand on change de route
      this.loadSprints()
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
  color: #333;
  margin: 0;
  padding: 0;
  width: 100vw;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
}

.navbar {
  background: #4DBA87;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  padding: 1rem 2rem;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 1rem 1.5rem;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-container h1 {
  font-size: 1.5rem;
}

.nav-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.7rem;
  min-width: 0;
}

.nav-links {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  row-gap: 0.6rem;
  justify-content: flex-end;
  align-items: center;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-pill {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.8rem;
  border-radius: 14px;
  font-size: 0.9rem;
}

.logout-btn {
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: white;
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.45rem 0.75rem;
  border-radius: 4px;
  transition: background 0.3s;
  white-space: nowrap;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: rgba(255, 255, 255, 0.2);
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  color: white;
  background: none;
  border: none;
  padding: 0.45rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.dropdown-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.dropdown-arrow {
  font-size: 0.7rem;
  transition: transform 0.3s;
}

.dropdown:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  margin-top: 0.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 250px;
  max-height: 400px;
  overflow-y: auto;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  z-index: 1000;
}

.dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: #333 !important;
  text-decoration: none;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f8f9fa;
  color: #000 !important;
}

.dropdown-item-all {
  font-weight: 600;
  color: #4DBA87 !important;
}

.dropdown-item-all:hover {
  background: #e8f5f0;
  color: #3da876 !important;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 0.5rem 0;
}

.dropdown-item-loading,
.dropdown-item-empty {
  padding: 0.75rem 1rem;
  color: #999;
  font-size: 0.9rem;
  text-align: center;
}

.sprint-badge {
  font-size: 0.8rem;
}

.badge-planned {
  color: #ffc107;
}

.badge-active {
  color: #28a745;
}

.badge-completed {
  color: #6c757d;
}

.container {
  padding: 2rem;
  width: 100%;
}

@media (max-width: 1180px) {
  .nav-container {
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }

  .nav-right {
    align-items: flex-start;
  }

  .nav-links,
  .nav-user {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0.8rem 1rem;
  }

  .nav-container h1 {
    font-size: 1.2rem;
  }

  .nav-links {
    gap: 0.4rem;
  }

  .nav-links a,
  .dropdown-toggle {
    font-size: 0.88rem;
    padding: 0.4rem 0.6rem;
  }
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-primary {
  background: #4DBA87;
  color: white;
}

.btn-primary:hover {
  background: #3da876;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-success {
  background: #27ae60;
  color: white;
}

.badge-warning {
  background: #f39c12;
  color: white;
}

.badge-info {
  background: #3498db;
  color: white;
}

.badge-danger {
  background: #e74c3c;
  color: white;
}
</style>
