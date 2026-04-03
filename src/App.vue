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
            <template v-for="item in visibleMenuItems" :key="item.id">
              <router-link v-if="item.type === 'link'" :to="item.to">{{ item.label }}</router-link>

              <div v-else-if="isDropdownItem(item)" class="dropdown">
                <button class="dropdown-toggle">
                  {{ item.label }}
                  <span class="dropdown-arrow">▼</span>
                </button>
                <div class="dropdown-menu">
                  <router-link
                    v-for="child in getVisibleSubmenuItems(item)"
                    :key="`submenu-child-${item.id}-${child.id}`"
                    :to="child.to"
                    class="dropdown-item"
                    :class="{ 'dropdown-item-all': child.highlight }"
                  >
                    {{ child.label }}
                  </router-link>

                  <template v-if="item.id === 'sprints'">
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
                  </template>
                </div>
              </div>
            </template>

            <router-link to="/menu-config">⚙️ Menu</router-link>
            <router-link v-if="isAdmin" to="/admin" class="admin-nav-link">🔧 Administration</router-link>
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
      currentUser: auth.getSession(),
      odooEnabled: localStorage.getItem('app-odoo-enabled') !== 'false',
      menuOrder: [],
      hiddenMenuItemIds: [],
      submenuOrder: {},
      hiddenSubmenuItemIds: [],
      menuParentMap: {},
      customMainMenuItems: [],
      newMainMenuLabel: '',
      newSubmenuForm: {
        parentId: '',
        label: '',
        to: ''
      },
      menuItems: [
        { id: 'dashboard', type: 'link', label: '📊 Dashboard', to: '/dashboard' },
        { id: 'gantt-users', type: 'link', label: '🗓️ Gantt Utilisateurs', to: '/gantt-users' },
        {
          id: 'projects',
          type: 'projects-dropdown',
          label: '📁 Projets',
          children: [
            { id: 'all-projects', label: '📁 Voir tous les projets', to: '/projects', highlight: true },
            { id: 'tickets', label: '🎫 Tickets', to: '/tickets' },
            { id: 'kanban-stages', label: '📊 Étapes Kanban', to: '/kanban-stages' },
            { id: 'time-entries', label: '⏱️ Feuilles de temps', to: '/time-entries' },
            { id: 'tasks', label: '✅ Tâches Odoo', to: '/tasks', odooOnly: true }
          ]
        },
        { id: 'recettes', type: 'link', label: '🧪 Recettes', to: '/recettes' },
        { id: 'documents', type: 'link', label: '📁 Documents', to: '/documents' },
        { id: 'passwords', type: 'link', label: '🔐 Mots de passe', to: '/passwords' },
        {
          id: 'sprints',
          type: 'sprints-dropdown',
          label: '🏃 Sprints',
          children: [
            { id: 'all-sprints', label: '📋 Voir tous les sprints', to: '/sprints', highlight: true }
          ]
        },
        { id: 'todos', type: 'link', label: 'Todo du jour', to: '/todos' },
        { id: 'odoo', type: 'link', label: '🔄 Odoo', to: '/odoo', adminOnly: true, odooOnly: true },
        { id: 'data', type: 'link', label: '💾 Backup', to: '/data', adminOnly: true }
      ]
    }
  },
  computed: {
    isLoginPage() {
      return this.$route.path === '/login' || this.$route.path.startsWith('/recette-share/')
    },
    isAdmin() {
      return this.currentUser?.role === 'admin'
    },
    editableMenuItems() {
      return this.sortedMenuItems.filter(item => !item.adminOnly || this.isAdmin)
    },
    reparentableMenuItems() {
      return this.editableMenuItems.filter(item => item.type === 'link')
    },
    dropdownParentCandidates() {
      return this.sortedMenuItems
        .filter(item => this.isDropdownItem(item))
        .filter(item => !item.adminOnly || this.isAdmin)
    },
    editableMenuItemsWithChildren() {
      return this.editableMenuItems.filter(item => this.getEditableSubmenuItems(item).length > 0 || this.isDropdownItem(item))
    },
    canAddCustomSubmenu() {
      return Boolean(this.newSubmenuForm.parentId && this.newSubmenuForm.label && this.newSubmenuForm.to)
    },
    sortedMenuItems() {
      if (!this.menuOrder.length) return [...this.menuItems]

      const menuMap = new Map(this.menuItems.map(item => [item.id, item]))
      const ordered = this.menuOrder
        .map(id => menuMap.get(id))
        .filter(Boolean)

      for (const item of this.menuItems) {
        if (!ordered.some(orderedItem => orderedItem.id === item.id)) {
          ordered.push(item)
        }
      }

      return ordered
    },
    visibleMenuItems() {
      return this.sortedMenuItems
        .filter(item => !item.adminOnly || this.isAdmin)
        .filter(item => !item.odooOnly || this.odooEnabled)
        .filter(item => !this.getMenuParent(item.id))
        .filter(item => !this.hiddenMenuItemIds.includes(item.id))
    }
  },
  async mounted() {
    await this.loadMenuPreferences()
    this.odooEnabled = localStorage.getItem('app-odoo-enabled') !== 'false'
    window.addEventListener('odoo-enabled-changed', (e) => {
      this.odooEnabled = e.detail
    })
    if (!this.isLoginPage && this.currentUser) {
      await this.loadSprints()
    }
  },
  methods: {
    isDropdownItem(item) {
      if (!item) return false
      if (item.type === 'projects-dropdown' || item.type === 'sprints-dropdown' || item.type === 'custom-dropdown') {
        return true
      }
      const hasVisibleChildren = this.getVisibleSubmenuItems(item).length > 0
      return hasVisibleChildren
    },
    getMenuParent(itemId) {
      const value = this.menuParentMap?.[itemId]
      return value || null
    },
    updateMenuParent(itemId, parentId) {
      if (itemId === parentId) return

      const safeParent = parentId || null
      const parentItem = safeParent ? this.menuItems.find(item => item.id === safeParent) : null
      if (safeParent && !parentItem) return
      if (safeParent && !this.isDropdownItem(parentItem)) return

      this.menuParentMap = {
        ...this.menuParentMap,
        [itemId]: safeParent
      }
      this.saveMenuPreferences()
    },
    buildDefaultSubmenuOrder() {
      const defaults = {}
      for (const item of this.menuItems) {
        if (Array.isArray(item.children) && item.children.length > 0) {
          defaults[item.id] = item.children.map(child => child.id)
        }
      }
      return defaults
    },
    getSubmenuStorageKey(parentId, childId) {
      return `${parentId}:${childId}`
    },
    getEditableSubmenuItems(parentItem) {
      const children = Array.isArray(parentItem?.children) ? [...parentItem.children] : []
      const nestedLinks = this.sortedMenuItems
        .filter(item => item.type === 'link')
        .filter(item => this.getMenuParent(item.id) === parentItem.id)
        .map(item => ({
          id: item.id,
          label: item.label,
          to: item.to,
          adminOnly: item.adminOnly,
          isLinkedMenuItem: true
        }))

      const combinedChildren = [...children, ...nestedLinks]
      if (!combinedChildren.length) return []

      const parentOrder = this.submenuOrder[parentItem.id] || combinedChildren.map(child => child.id)
      const childById = new Map(combinedChildren.map(child => [child.id, child]))
      const ordered = parentOrder
        .map(id => childById.get(id))
        .filter(Boolean)

      for (const child of combinedChildren) {
        if (!ordered.some(orderedChild => orderedChild.id === child.id)) {
          ordered.push(child)
        }
      }

      return ordered.filter(child => (!child.adminOnly || this.isAdmin) && (!child.odooOnly || this.odooEnabled))
    },
    getVisibleSubmenuItems(parentItem) {
      return this.getEditableSubmenuItems(parentItem)
        .filter(child => this.isSubmenuVisible(parentItem.id, child.id))
    },
    isSubmenuVisible(parentId, childId) {
      return !this.hiddenSubmenuItemIds.includes(this.getSubmenuStorageKey(parentId, childId))
    },
    async loadMenuPreferences() {
      try {
        const userId = Number(this.currentUser?.userId)

        if (!Number.isFinite(userId) || userId <= 0) {
          this.customMainMenuItems = []
          this.menuItems = this.menuItems.filter(item => !String(item.id).startsWith('custom-menu-'))
          this.menuOrder = this.menuItems.map(item => item.id)
          this.hiddenMenuItemIds = []
          this.submenuOrder = this.buildDefaultSubmenuOrder()
          this.hiddenSubmenuItemIds = []
          this.menuParentMap = {}
          return
        }

        const stored = await db.getUserMenuPreferences(userId)
        this.customMainMenuItems = Array.isArray(stored?.customMainMenuItems) ? stored.customMainMenuItems : []

        this.menuItems = [...this.menuItems.filter(item => !String(item.id).startsWith('custom-menu-')), ...this.customMainMenuItems]

        this.menuOrder = Array.isArray(stored?.menuOrder) && stored.menuOrder.length
          ? stored.menuOrder
          : this.menuItems.map(item => item.id)
        this.hiddenMenuItemIds = Array.isArray(stored?.hiddenMenuItemIds) ? stored.hiddenMenuItemIds : []
        this.submenuOrder = stored?.submenuOrder && typeof stored.submenuOrder === 'object'
          ? stored.submenuOrder
          : this.buildDefaultSubmenuOrder()
        this.hiddenSubmenuItemIds = Array.isArray(stored?.hiddenSubmenuItemIds) ? stored.hiddenSubmenuItemIds : []
        this.menuParentMap = stored?.menuParentMap && typeof stored.menuParentMap === 'object' ? stored.menuParentMap : {}
      } catch {
        this.menuOrder = this.menuItems.map(item => item.id)
        this.hiddenMenuItemIds = []
        this.submenuOrder = this.buildDefaultSubmenuOrder()
        this.hiddenSubmenuItemIds = []
        this.menuParentMap = {}
        this.customMainMenuItems = []
      }
    },
    saveMenuPreferences() {
      const userId = Number(this.currentUser?.userId)
      if (!Number.isFinite(userId) || userId <= 0) return

      db.saveUserMenuPreferences(userId, {
        customMainMenuItems: this.customMainMenuItems,
        menuOrder: this.menuOrder,
        hiddenMenuItemIds: this.hiddenMenuItemIds,
        submenuOrder: this.submenuOrder,
        hiddenSubmenuItemIds: this.hiddenSubmenuItemIds,
        menuParentMap: this.menuParentMap
      }).catch(error => {
        console.error('Erreur sauvegarde préférences menu:', error)
      })
    },
    moveMenuItem(itemId, direction) {
      const list = [...this.editableMenuItems]
      const index = list.findIndex(item => item.id === itemId)
      if (index < 0) return

      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= list.length) return

      const temp = list[index]
      list[index] = list[targetIndex]
      list[targetIndex] = temp

      const hiddenById = new Set(this.hiddenMenuItemIds)
      const allKnown = this.menuItems.map(item => item.id)
      const editedIds = list.map(item => item.id)
      const untouched = allKnown.filter(id => !editedIds.includes(id))
      this.menuOrder = [...editedIds, ...untouched]
      this.hiddenMenuItemIds = this.hiddenMenuItemIds.filter(id => hiddenById.has(id))
      this.saveMenuPreferences()
    },
    toggleMenuItemVisibility(itemId) {
      const set = new Set(this.hiddenMenuItemIds)
      if (set.has(itemId)) {
        set.delete(itemId)
      } else {
        set.add(itemId)
      }
      this.hiddenMenuItemIds = [...set]
      this.saveMenuPreferences()
    },
    moveSubmenuItem(parentId, childId, direction) {
      const parentItem = this.menuItems.find(item => item.id === parentId)
      if (!parentItem) return

      const list = this.getEditableSubmenuItems(parentItem)
      const index = list.findIndex(child => child.id === childId)
      if (index < 0) return

      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= list.length) return

      const temp = list[index]
      list[index] = list[targetIndex]
      list[targetIndex] = temp

      const allChildren = Array.isArray(parentItem.children) ? parentItem.children.map(child => child.id) : []
      const editedIds = list.map(child => child.id)
      const untouched = allChildren.filter(id => !editedIds.includes(id))

      this.submenuOrder = {
        ...this.submenuOrder,
        [parentId]: [...editedIds, ...untouched]
      }
      this.saveMenuPreferences()
    },
    toggleSubmenuItemVisibility(parentId, childId) {
      const storageKey = this.getSubmenuStorageKey(parentId, childId)
      const set = new Set(this.hiddenSubmenuItemIds)
      if (set.has(storageKey)) {
        set.delete(storageKey)
      } else {
        set.add(storageKey)
      }
      this.hiddenSubmenuItemIds = [...set]
      this.saveMenuPreferences()
    },
    addCustomMainMenu() {
      const label = String(this.newMainMenuLabel || '').trim()
      if (!label) return

      const id = `custom-menu-${Date.now()}`
      const item = {
        id,
        type: 'custom-dropdown',
        label,
        children: []
      }

      this.customMainMenuItems = [...this.customMainMenuItems, item]
      this.menuItems = [...this.menuItems, item]
      this.menuOrder = [...this.menuOrder, id]
      this.submenuOrder = {
        ...this.submenuOrder,
        [id]: []
      }
      this.newMainMenuLabel = ''
      this.saveMenuPreferences()
    },
    removeCustomMainMenu(menuId) {
      this.customMainMenuItems = this.customMainMenuItems.filter(item => item.id !== menuId)
      this.menuItems = this.menuItems.filter(item => item.id !== menuId)
      this.menuOrder = this.menuOrder.filter(id => id !== menuId)

      const nextParentMap = {}
      for (const [itemId, parentId] of Object.entries(this.menuParentMap || {})) {
        nextParentMap[itemId] = parentId === menuId ? null : parentId
      }
      this.menuParentMap = nextParentMap

      const { [menuId]: removedOrder, ...restOrder } = this.submenuOrder
      const _ = removedOrder
      this.submenuOrder = restOrder
      this.hiddenSubmenuItemIds = this.hiddenSubmenuItemIds.filter(key => !key.startsWith(`${menuId}:`))
      this.saveMenuPreferences()
    },
    addCustomSubmenu() {
      if (!this.canAddCustomSubmenu) return

      const parentId = this.newSubmenuForm.parentId
      const parentItem = this.menuItems.find(item => item.id === parentId)
      if (!parentItem) return

      const to = this.newSubmenuForm.to.startsWith('/') ? this.newSubmenuForm.to : `/${this.newSubmenuForm.to}`
      const child = {
        id: `custom-submenu-${Date.now()}`,
        label: this.newSubmenuForm.label,
        to,
        isCustomSubmenu: true
      }

      parentItem.children = [...(parentItem.children || []), child]
      this.submenuOrder = {
        ...this.submenuOrder,
        [parentId]: [...(this.submenuOrder[parentId] || []), child.id]
      }

      if (String(parentItem.id).startsWith('custom-menu-')) {
        this.customMainMenuItems = this.customMainMenuItems.map(item => item.id === parentItem.id ? { ...item, children: [...(parentItem.children || [])] } : item)
      }

      this.newSubmenuForm = { parentId: '', label: '', to: '' }
      this.saveMenuPreferences()
    },
    removeCustomSubmenuItem(parentId, childId) {
      const parentItem = this.menuItems.find(item => item.id === parentId)
      if (!parentItem || !Array.isArray(parentItem.children)) return

      parentItem.children = parentItem.children.filter(child => child.id !== childId)
      this.submenuOrder = {
        ...this.submenuOrder,
        [parentId]: (this.submenuOrder[parentId] || []).filter(id => id !== childId)
      }
      this.hiddenSubmenuItemIds = this.hiddenSubmenuItemIds.filter(key => key !== this.getSubmenuStorageKey(parentId, childId))

      if (String(parentItem.id).startsWith('custom-menu-')) {
        this.customMainMenuItems = this.customMainMenuItems.map(item => item.id === parentItem.id ? { ...item, children: [...(parentItem.children || [])] } : item)
      }

      this.saveMenuPreferences()
    },
    resetMenuPreferences() {
      this.menuOrder = this.menuItems.map(item => item.id)
      this.hiddenMenuItemIds = []
      this.submenuOrder = this.buildDefaultSubmenuOrder()
      this.hiddenSubmenuItemIds = []
      this.menuParentMap = {}
      this.customMainMenuItems = []
      this.menuItems = this.menuItems.filter(item => !String(item.id).startsWith('custom-menu-'))
      this.saveMenuPreferences()
    },
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
        const allSprints = await db.getAllSprints()
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
    async '$route'() {
      this.currentUser = auth.getSession()
      await this.loadMenuPreferences()
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
  position: sticky;
  top: 0;
  z-index: 100;
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

.admin-nav-link {
  border: 1px solid rgba(255, 255, 255, 0.5) !important;
  font-weight: 500;
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

.menu-editor-dropdown {
  min-width: 320px;
  padding: 0.5rem;
}

.menu-editor-title {
  font-weight: 600;
  color: #4b5563;
  padding: 0.4rem 0.5rem 0.6rem;
}

.menu-editor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.45rem;
  border-radius: 6px;
}

.menu-editor-item:hover {
  background: #f8fafc;
}

.menu-editor-item-sub {
  margin-left: 0.85rem;
}

.submenu-editor-group {
  margin-bottom: 0.35rem;
}

.submenu-editor-group-title {
  font-size: 0.82rem;
  color: #6b7280;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
}

.menu-editor-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #111827;
  font-size: 0.9rem;
}

.menu-editor-actions {
  display: inline-flex;
  gap: 0.3rem;
}

.btn-xs {
  padding: 0.2rem 0.45rem;
  font-size: 0.78rem;
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
