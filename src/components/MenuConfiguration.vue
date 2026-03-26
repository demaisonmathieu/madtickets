<template>
  <div>
    <div class="page-header">
      <div>
        <h2>⚙️ Configuration du menu</h2>
        <p style="color: #666; margin-top: 0.4rem;">Personnalisez les menus, sous-menus et leur ordre d'affichage.</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" @click="$router.back()">← Retour</button>
      </div>
    </div>

    <div class="card">
      <h3>Menus principaux</h3>
      <div v-for="(item, index) in editableMenuItems" :key="`main-${item.id}`" class="row">
        <label class="row-label">
          <input
            type="checkbox"
            :checked="!hiddenMenuItemIds.includes(item.id)"
            @change="toggleMenuItemVisibility(item.id)"
          />
          <span>{{ item.label }}</span>
        </label>
        <div class="row-actions">
          <button class="btn btn-secondary btn-xs" :disabled="index === 0" @click="moveMenuItem(item.id, -1)">↑</button>
          <button class="btn btn-secondary btn-xs" :disabled="index === editableMenuItems.length - 1" @click="moveMenuItem(item.id, 1)">↓</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Organisation (principal / sous-menu)</h3>
      <div v-for="item in reparentableMenuItems" :key="`parent-${item.id}`" class="row block-row">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; width: 100%;">
          <span class="row-label">{{ item.label }}</span>
          <select
            :value="getMenuParent(item.id)"
            @change="updateMenuParent(item.id, $event.target.value || null)"
            style="font-size: 0.85rem; padding: 0.35rem 0.45rem; border-radius: 4px; border: 1px solid #d1d5db; min-width: 220px;"
          >
            <option value="">Menu principal</option>
            <option v-for="parent in dropdownParentCandidates" :key="`candidate-${item.id}-${parent.id}`" :value="parent.id">
              Sous {{ parent.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="card" v-if="editableMenuItemsWithChildren.length > 0">
      <h3>Sous-menus</h3>
      <div v-for="item in editableMenuItemsWithChildren" :key="`subgroup-${item.id}`" class="sub-group">
        <div class="sub-group-title">{{ item.label }}</div>
        <div
          v-for="(child, index) in getEditableSubmenuItems(item)"
          :key="`submenu-${item.id}-${child.id}`"
          class="row"
          style="margin-left: 0.9rem;"
        >
          <label class="row-label">
            <input
              type="checkbox"
              :checked="isSubmenuVisible(item.id, child.id)"
              @change="toggleSubmenuItemVisibility(item.id, child.id)"
            />
            <span>{{ child.label }}</span>
          </label>
          <div class="row-actions">
            <button class="btn btn-secondary btn-xs" :disabled="index === 0" @click="moveSubmenuItem(item.id, child.id, -1)">↑</button>
            <button class="btn btn-secondary btn-xs" :disabled="index === getEditableSubmenuItems(item).length - 1" @click="moveSubmenuItem(item.id, child.id, 1)">↓</button>
            <button v-if="child.isCustomSubmenu" class="btn btn-danger btn-xs" @click="removeCustomSubmenuItem(item.id, child.id)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Nouveau menu principal</h3>
      <div class="form-row">
        <input v-model.trim="newMainMenuLabel" placeholder="Ex: Outils" />
        <button class="btn btn-primary" @click="addCustomMainMenu" :disabled="!newMainMenuLabel">+ Ajouter</button>
      </div>

      <div v-if="customMainMenuItems.length > 0" style="margin-top: 0.8rem;">
        <div v-for="menu in customMainMenuItems" :key="`custom-main-${menu.id}`" class="row">
          <span class="row-label">{{ menu.label }}</span>
          <button class="btn btn-danger btn-xs" @click="removeCustomMainMenu(menu.id)">Supprimer</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Nouveau sous-menu</h3>
      <div class="sub-form-grid">
        <select v-model="newSubmenuForm.parentId">
          <option value="">Choisir un menu parent</option>
          <option v-for="parent in dropdownParentCandidates" :key="`sub-parent-${parent.id}`" :value="parent.id">
            {{ parent.label }}
          </option>
        </select>
        <input v-model.trim="newSubmenuForm.label" placeholder="Libellé" />
        <input v-model.trim="newSubmenuForm.to" placeholder="Route (ex: /gantt-users)" />
        <button class="btn btn-primary" @click="addCustomSubmenu" :disabled="!canAddCustomSubmenu">+ Ajouter sous-menu</button>
      </div>
    </div>

    <div class="card">
      <button class="btn btn-secondary" @click="resetMenuPreferences">Réinitialiser la configuration</button>
    </div>
  </div>
</template>

<script>
import { auth } from '../services/auth'

const BASE_MENU_ITEMS = [
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
      { id: 'tasks', label: '✅ Tâches', to: '/tasks' }
    ]
  },
  { id: 'documents', type: 'link', label: '📁 Documents', to: '/documents' },
  { id: 'passwords', type: 'link', label: '🔐 Mots de passe', to: '/passwords' },
  { id: 'users', type: 'link', label: '👥 Utilisateurs', to: '/users', adminOnly: true },
  {
    id: 'sprints',
    type: 'sprints-dropdown',
    label: '🏃 Sprints',
    children: [
      { id: 'all-sprints', label: '📋 Voir tous les sprints', to: '/sprints', highlight: true }
    ]
  },
  { id: 'todos', type: 'link', label: 'Todo du jour', to: '/todos' },
  { id: 'odoo', type: 'link', label: 'Odoo', to: '/odoo', adminOnly: true },
  { id: 'data', type: 'link', label: '💾 Backup', to: '/data', adminOnly: true }
]

export default {
  name: 'MenuConfiguration',
  data() {
    return {
      currentUser: auth.getSession(),
      menuItems: JSON.parse(JSON.stringify(BASE_MENU_ITEMS)),
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
      }
    }
  },
  computed: {
    isAdmin() {
      return this.currentUser?.role === 'admin'
    },
    sortedMenuItems() {
      if (!this.menuOrder.length) return [...this.menuItems]
      const map = new Map(this.menuItems.map(item => [item.id, item]))
      const ordered = this.menuOrder.map(id => map.get(id)).filter(Boolean)
      for (const item of this.menuItems) {
        if (!ordered.some(orderedItem => orderedItem.id === item.id)) {
          ordered.push(item)
        }
      }
      return ordered
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
    }
  },
  mounted() {
    this.loadMenuPreferences()
  },
  methods: {
    isDropdownItem(item) {
      if (!item) return false
      return item.type === 'projects-dropdown' || item.type === 'sprints-dropdown' || item.type === 'custom-dropdown' || this.getVisibleSubmenuItems(item).length > 0
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
    getMenuParent(itemId) {
      return this.menuParentMap?.[itemId] || null
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

      const combined = [...children, ...nestedLinks]
      if (!combined.length) return []

      const order = this.submenuOrder[parentItem.id] || combined.map(child => child.id)
      const byId = new Map(combined.map(child => [child.id, child]))
      const ordered = order.map(id => byId.get(id)).filter(Boolean)

      for (const child of combined) {
        if (!ordered.some(orderedChild => orderedChild.id === child.id)) {
          ordered.push(child)
        }
      }

      return ordered.filter(child => !child.adminOnly || this.isAdmin)
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
          this.menuItems = JSON.parse(JSON.stringify(BASE_MENU_ITEMS))
          this.menuOrder = this.menuItems.map(item => item.id)
          this.hiddenMenuItemIds = []
          this.submenuOrder = this.buildDefaultSubmenuOrder()
          this.hiddenSubmenuItemIds = []
          this.menuParentMap = {}
          return
        }

        const { db } = await import('../services/database-new')
        const stored = await db.getUserMenuPreferences(userId)
        this.customMainMenuItems = Array.isArray(stored?.customMainMenuItems) ? stored.customMainMenuItems : []
        this.menuItems = [...JSON.parse(JSON.stringify(BASE_MENU_ITEMS)), ...this.customMainMenuItems]

        this.menuOrder = Array.isArray(stored?.menuOrder) && stored.menuOrder.length
          ? stored.menuOrder
          : this.menuItems.map(item => item.id)
        this.hiddenMenuItemIds = Array.isArray(stored?.hiddenMenuItemIds) ? stored.hiddenMenuItemIds : []
        this.submenuOrder = stored?.submenuOrder && typeof stored.submenuOrder === 'object'
          ? stored.submenuOrder
          : this.buildDefaultSubmenuOrder()
        this.hiddenSubmenuItemIds = Array.isArray(stored?.hiddenSubmenuItemIds) ? stored.hiddenSubmenuItemIds : []
        this.menuParentMap = stored?.menuParentMap && typeof stored.menuParentMap === 'object' ? stored.menuParentMap : {}
      } catch (error) {
        console.error('Erreur lors du chargement des préférences menu:', error)
        this.menuItems = JSON.parse(JSON.stringify(BASE_MENU_ITEMS))
        this.menuOrder = this.menuItems.map(item => item.id)
        this.hiddenMenuItemIds = []
        this.submenuOrder = this.buildDefaultSubmenuOrder()
        this.hiddenSubmenuItemIds = []
        this.menuParentMap = {}
        this.customMainMenuItems = []
      }
    },
    async saveMenuPreferences() {
      const userId = Number(this.currentUser?.userId)
      if (!Number.isFinite(userId) || userId <= 0) return

      try {
        const { db } = await import('../services/database-new')
        await db.saveUserMenuPreferences(userId, {
          customMainMenuItems: this.customMainMenuItems,
          menuOrder: this.menuOrder,
          hiddenMenuItemIds: this.hiddenMenuItemIds,
          submenuOrder: this.submenuOrder,
          hiddenSubmenuItemIds: this.hiddenSubmenuItemIds,
          menuParentMap: this.menuParentMap
        })
      } catch (error) {
        console.error('Erreur sauvegarde préférences menu:', error)
      }
    },
    moveMenuItem(itemId, direction) {
      const list = [...this.editableMenuItems]
      const index = list.findIndex(item => item.id === itemId)
      if (index < 0) return
      const target = index + direction
      if (target < 0 || target >= list.length) return
      ;[list[index], list[target]] = [list[target], list[index]]

      const allKnown = this.menuItems.map(item => item.id)
      const editedIds = list.map(item => item.id)
      const untouched = allKnown.filter(id => !editedIds.includes(id))
      this.menuOrder = [...editedIds, ...untouched]
      this.saveMenuPreferences()
    },
    toggleMenuItemVisibility(itemId) {
      const set = new Set(this.hiddenMenuItemIds)
      if (set.has(itemId)) set.delete(itemId)
      else set.add(itemId)
      this.hiddenMenuItemIds = [...set]
      this.saveMenuPreferences()
    },
    moveSubmenuItem(parentId, childId, direction) {
      const parentItem = this.menuItems.find(item => item.id === parentId)
      if (!parentItem) return

      const list = this.getEditableSubmenuItems(parentItem)
      const index = list.findIndex(child => child.id === childId)
      if (index < 0) return
      const target = index + direction
      if (target < 0 || target >= list.length) return
      ;[list[index], list[target]] = [list[target], list[index]]

      const allChildren = this.getEditableSubmenuItems(parentItem).map(child => child.id)
      const editedIds = list.map(child => child.id)
      const untouched = allChildren.filter(id => !editedIds.includes(id))

      this.submenuOrder = {
        ...this.submenuOrder,
        [parentId]: [...editedIds, ...untouched]
      }
      this.saveMenuPreferences()
    },
    toggleSubmenuItemVisibility(parentId, childId) {
      const key = this.getSubmenuStorageKey(parentId, childId)
      const set = new Set(this.hiddenSubmenuItemIds)
      if (set.has(key)) set.delete(key)
      else set.add(key)
      this.hiddenSubmenuItemIds = [...set]
      this.saveMenuPreferences()
    },
    addCustomMainMenu() {
      const label = String(this.newMainMenuLabel || '').trim()
      if (!label) return
      const id = `custom-menu-${Date.now()}`
      const menu = { id, type: 'custom-dropdown', label, children: [] }
      this.customMainMenuItems = [...this.customMainMenuItems, menu]
      this.menuItems = [...this.menuItems, menu]
      this.menuOrder = [...this.menuOrder, id]
      this.submenuOrder = { ...this.submenuOrder, [id]: [] }
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
      this.customMainMenuItems = []
      this.menuItems = JSON.parse(JSON.stringify(BASE_MENU_ITEMS))
      this.menuOrder = this.menuItems.map(item => item.id)
      this.hiddenMenuItemIds = []
      this.submenuOrder = this.buildDefaultSubmenuOrder()
      this.hiddenSubmenuItemIds = []
      this.menuParentMap = {}
      this.saveMenuPreferences()
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.45rem;
  border-radius: 6px;
}

.row:hover {
  background: #f8fafc;
}

.block-row {
  display: block;
}

.row-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.row-actions {
  display: inline-flex;
  gap: 0.35rem;
}

.btn-xs {
  padding: 0.2rem 0.45rem;
  font-size: 0.78rem;
}

.form-row {
  display: flex;
  gap: 0.5rem;
}

.form-row input {
  flex: 1;
}

.sub-group {
  margin-bottom: 0.45rem;
}

.sub-group-title {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 600;
  padding: 0.3rem 0.4rem;
}

.sub-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 980px) {
  .sub-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
