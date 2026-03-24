import { createApp } from 'vue'
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import App from './App.vue'
import { db } from './services/database-new'
// import { registerSW } from 'virtual:pwa-register'

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
import Dashboard from './components/Dashboard.vue'
import UserGanttView from './components/UserGanttView.vue'
import DataManagement from './components/DataManagement.vue'
import DocumentsGED from './components/DocumentsGED.vue'
import TimeEntriesList from './components/TimeEntriesList.vue'
import PasswordManager from './components/PasswordManager.vue'
import Login from './components/Login.vue'
import UsersManagement from './components/UsersManagement.vue'
import MenuConfiguration from './components/MenuConfiguration.vue'
import KanbanStagesConfig from './components/KanbanStagesConfig.vue'
import LocalTaskDetail from './components/LocalTaskDetail.vue'
import RecetteSharePublic from './components/RecetteSharePublic.vue'
import { auth } from './services/auth'

// Enregistrement du Service Worker désactivé en dev
// const updateSW = registerSW({
//   onNeedRefresh() {
//     if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
//       updateSW(true)
//     }
//   },
//   onOfflineReady() {
//     console.log('🔌 Application prête à fonctionner hors ligne')
//   },
//   onRegistered(_registration: ServiceWorkerRegistration | undefined) {
//     console.log('✅ Service Worker enregistré')
//   },
//   onRegisterError(error: any) {
//     console.error('❌ Erreur d\'enregistrement du Service Worker:', error)
//   }
// })

// Configuration du routeur
const routes: RouteRecordRaw[] = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/recette-share/:token', component: RecetteSharePublic, meta: { public: true } },
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/gantt-users', component: UserGanttView },
  { path: '/menu-config', component: MenuConfiguration },
  { path: '/projects', component: ProjectsList },
  { path: '/projects/:id', component: ProjectDetail },
  { 
    path: '/projects/:id/sprints', 
    component: SprintManagement, 
    props: route => ({ projectId: parseInt(route.params.id as string) }) 
  },
  { path: '/sprints', component: SprintsList },
  { path: '/tickets', component: TicketsList },
  { path: '/tickets/:id', component: TicketDetail },
  { path: '/time-entries', component: TimeEntriesList },
  { path: '/kanban', component: KanbanView },
  { path: '/kanban-stages', component: KanbanStagesConfig },
  { path: '/todos', component: TodoList },
  { path: '/todos/:id', component: TodoDetail },
  { path: '/local-tasks/:id', component: LocalTaskDetail },
  { path: '/tasks', component: OdooTasksList },
  { path: '/tasks/:odooId', component: OdooTaskDetail },
  { path: '/taches', redirect: '/tasks' },
  { path: '/documents', component: DocumentsGED },
  { path: '/passwords', component: PasswordManager },
  { path: '/users', component: UsersManagement, meta: { adminOnly: true } },
  { path: '/odoo', component: OdooSync, meta: { adminOnly: true } },
  { path: '/data', component: DataManagement, meta: { adminOnly: true } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async to => {
  const session = auth.getSession()
  const isPublic = Boolean(to.meta?.public)
  const isAdminOnly = Boolean(to.meta?.adminOnly)

  if (!session && !isPublic) {
    return '/login'
  }

  if (session && to.path === '/login') {
    return '/dashboard'
  }

  if (isAdminOnly && session?.role !== 'admin') {
    return '/dashboard'
  }

  if (session?.role === 'admin') {
    return true
  }

  const projectId = Number(to.params.id)
  const ticketId = Number(to.params.id)
  const odooTaskId = Number(to.params.odooId)

  if (to.path.startsWith('/projects/') && Number.isFinite(projectId) && projectId > 0) {
    return (await db.canAccessProject(projectId)) ? true : '/projects'
  }

  if (to.path.startsWith('/tickets/') && Number.isFinite(ticketId) && ticketId > 0) {
    return (await db.canAccessTicket(ticketId)) ? true : '/tickets'
  }

  if (to.path.startsWith('/tasks/') && Number.isFinite(odooTaskId) && odooTaskId > 0) {
    return (await db.canAccessOdooTask(odooTaskId)) ? true : '/tasks'
  }

  return true
})

// Initialiser la base de données avant de monter l'app
db.init().then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})
