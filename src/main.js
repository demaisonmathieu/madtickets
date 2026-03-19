import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { db } from './services/database-new'
import { registerSW } from 'virtual:pwa-register'

// Import des composants
import ProjectsList from './components/ProjectsList.vue'
import ProjectDetail from './components/ProjectDetail.vue'
import TicketsList from './components/TicketsList.vue'
import TicketDetail from './components/TicketDetail.vue'
import KanbanView from './components/KanbanView.vue'
import TodoList from './components/TodoList.vue'
import TodoDetail from './components/TodoDetail.vue'
import OdooSync from './components/OdooSync.vue'
import OdooTasksList from './components/OdooTasksList.vue'
import OdooTaskDetail from './components/OdooTaskDetail.vue'
import SprintManagement from './components/SprintManagement.vue'
import SprintsList from './components/SprintsList.vue'
import DataManagement from './components/DataManagement.vue'

// Enregistrement du Service Worker pour le mode offline
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('🔌 Application prête à fonctionner hors ligne')
  },
  onRegistered(registration) {
    console.log('✅ Service Worker enregistré')
  },
  onRegisterError(error) {
    console.error('❌ Erreur d\'enregistrement du Service Worker:', error)
  }
})

// Configuration du routeur
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/projects' },
    { path: '/projects', component: ProjectsList },
    { path: '/projects/:id', component: ProjectDetail },
    { path: '/projects/:id/sprints', component: SprintManagement, props: route => ({ projectId: parseInt(route.params.id) }) },
    { path: '/sprints', component: SprintsList },
    { path: '/tickets', component: TicketsList },
    { path: '/tickets/:id', component: TicketDetail },
    { path: '/kanban', component: KanbanView },
    { path: '/todos', component: TodoList },
    { path: '/todos/:id', component: TodoDetail },
    { path: '/tasks', component: OdooTasksList },
    { path: '/tasks/:odooId', component: OdooTaskDetail },
    { path: '/taches', redirect: '/tasks' },
    { path: '/odoo', component: OdooSync },
    { path: '/data', component: DataManagement },
    { path: '/:pathMatch(.*)*', redirect: '/projects' }
  ]
})

// Initialiser la base de données avant de monter l'app
db.init().then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})
