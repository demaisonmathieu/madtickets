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
import DataManagement from './components/DataManagement.vue'
import DocumentsGED from './components/DocumentsGED.vue'
import TimeEntriesList from './components/TimeEntriesList.vue'
import PasswordManager from './components/PasswordManager.vue'
import Login from './components/Login.vue'
import UsersManagement from './components/UsersManagement.vue'
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
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
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
  { path: '/todos', component: TodoList },
  { path: '/todos/:id', component: TodoDetail },
  { path: '/tasks', component: OdooTasksList },
  { path: '/tasks/:odooId', component: OdooTaskDetail },
  { path: '/taches', redirect: '/tasks' },
  { path: '/documents', component: DocumentsGED },
  { path: '/passwords', component: PasswordManager },
  { path: '/users', component: UsersManagement, meta: { adminOnly: true } },
  { path: '/odoo', component: OdooSync },
  { path: '/data', component: DataManagement },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const session = auth.getSession()
  const isPublic = Boolean(to.meta?.public)
  const isAdminOnly = Boolean(to.meta?.adminOnly)

  if (!session && !isPublic) {
    next('/login')
    return
  }

  if (session && to.path === '/login') {
    next('/dashboard')
    return
  }

  if (isAdminOnly && session?.role !== 'admin') {
    next('/dashboard')
    return
  }

  next()
})

// Initialiser la base de données avant de monter l'app
db.init().then(() => {
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})
