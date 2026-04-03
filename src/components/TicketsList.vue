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
        <button @click="openEmailImport" class="btn btn-secondary">📥 Importer un email</button>
        <button @click="showForm = true" class="btn btn-primary">+ Nouveau ticket</button>
      </div>
    </div>

    <div v-if="showEmailImport" class="card">
      <h3>📥 Créer un ticket depuis un email</h3>
      <div class="form-group">
        <label>Source</label>
        <select v-model="emailImportMode">
          <option value="raw">Coller un email brut</option>
          <option value="imap">Boîte IMAP</option>
        </select>
      </div>
      <div class="form-group">
        <label>Projet *</label>
        <select v-model="emailImportForm.projectId" required>
          <option value="">Sélectionner un projet</option>
          <option v-for="project in projects" :key="`import-project-${project.id}`" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
      <div v-if="emailImportMode === 'raw'" class="form-group">
        <label>Email brut</label>
        <textarea v-model="emailImportForm.rawEmail" rows="10" placeholder="Collez ici le contenu complet du mail (From/Subject/Date + corps)..."></textarea>
      </div>
      <div v-if="emailImportMode === 'raw'" style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem;">
        <button type="button" class="btn btn-secondary" @click="parseImportedEmail" :disabled="!emailImportForm.rawEmail.trim()">🔎 Analyser l'email</button>
        <button type="button" class="btn btn-secondary" @click="cancelEmailImport">Annuler</button>
      </div>

      <div v-if="emailImportMode === 'imap'" style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem;">
        <button type="button" class="btn btn-secondary" @click="loadImapMessages" :disabled="imapLoadingMessages">{{ imapLoadingMessages ? 'Chargement…' : '📥 Charger les emails IMAP' }}</button>
        <button type="button" class="btn btn-secondary" @click="cancelEmailImport">Annuler</button>
      </div>

      <div v-if="emailImportMode === 'imap' && imapError" class="alert alert-danger" style="margin-bottom:1rem;">
        {{ imapError }}
      </div>

      <div v-if="emailImportMode === 'imap' && imapMessages.length > 0" class="card" style="background:#f8f9fa; border:1px solid #e0e0e0; margin-bottom:1rem;">
        <h4>Emails IMAP disponibles</h4>
        <div v-for="message in imapMessages" :key="message.uid" class="note-card" :style="selectedImapMessage?.uid === message.uid ? 'border:2px solid #4DBA87;' : ''">
          <div style="display:flex; justify-content:space-between; gap:1rem; align-items:flex-start;">
            <div>
              <div><strong>{{ message.subject }}</strong></div>
              <small style="color:#666; display:block; margin-top:0.25rem;">{{ message.from || 'Expéditeur inconnu' }}<span v-if="message.date"> • {{ formatDate(message.date) }}</span></small>
              <div style="margin-top:0.35rem; color:#555; white-space:pre-wrap;">{{ message.preview }}</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" @click="selectImapMessage(message)">Choisir</button>
          </div>
        </div>
      </div>

      <div v-if="emailImportPreview" class="card" style="background:#f8f9fa; border:1px solid #e0e0e0;">
        <h4>Aperçu du ticket généré</h4>
        <div class="form-group">
          <label>Titre</label>
          <input v-model="emailImportPreview.title" />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Expéditeur</label>
            <input v-model="emailImportPreview.from" />
          </div>
          <div class="form-group">
            <label>Date du mail</label>
            <input v-model="emailImportPreview.date" />
          </div>
        </div>
        <div class="form-group">
          <label>Description du ticket</label>
          <textarea v-model="emailImportPreview.description" rows="8"></textarea>
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" @click="createTicketFromImportedEmail" :disabled="!emailImportPreview.title || !emailImportForm.projectId">✅ Créer le ticket</button>
        </div>
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
import { apiFetch } from '../services/api'
import RichTextEditor from './RichTextEditor.vue'

const MAIL_CONFIG_KEY = 'app-mail-config'

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
      showEmailImport: false,
      emailImportMode: 'raw',
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
      },
      emailImportForm: {
        projectId: '',
        rawEmail: ''
      },
      emailImportPreview: null,
      imapLoadingMessages: false,
      imapError: '',
      imapMessages: [],
      selectedImapMessage: null
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
    openEmailImport() {
      this.showEmailImport = true
      this.emailImportMode = 'raw'
      this.emailImportPreview = null
      this.imapError = ''
      this.imapMessages = []
      this.selectedImapMessage = null
    },
    cancelEmailImport() {
      this.showEmailImport = false
      this.emailImportMode = 'raw'
      this.emailImportForm = {
        projectId: '',
        rawEmail: ''
      }
      this.emailImportPreview = null
      this.imapLoadingMessages = false
      this.imapError = ''
      this.imapMessages = []
      this.selectedImapMessage = null
    },
    getSavedMailConfig() {
      try {
        const raw = localStorage.getItem(MAIL_CONFIG_KEY)
        if (!raw) return null
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    buildImapConfigFromSavedMail() {
      const config = this.getSavedMailConfig()
      if (!config?.imapEnabled) return null
      return {
        host: config.imapHost,
        port: config.imapPort,
        username: config.imapUsername,
        password: config.imapPassword,
        security: config.imapSecurity,
        mailbox: config.imapMailbox,
        rejectUnauthorized: config.imapRejectUnauthorized,
        maxMessages: 20
      }
    },
    async loadImapMessages() {
      this.imapLoadingMessages = true
      this.imapError = ''
      this.imapMessages = []
      this.selectedImapMessage = null
      this.emailImportPreview = null
      try {
        const config = this.buildImapConfigFromSavedMail()
        if (!config) {
          throw new Error('Configuration IMAP absente ou désactivée dans Administration > Mail')
        }

        const result = await apiFetch('/admin/imap/messages', {
          method: 'POST',
          timeoutMs: 25000,
          body: JSON.stringify({ config })
        })

        this.imapMessages = Array.isArray(result?.messages) ? result.messages : []
        if (result?.usedFallback) {
          this.imapError = `ℹ️ Connexion IMAP établie en mode ${String(result.effectiveSecurity || '').toUpperCase()} / port ${result.effectivePort}. Mettez à jour la config dans Administration > Mail.`
        }
        if (this.imapMessages.length === 0) {
          this.imapError = 'Aucun email trouvé dans la boîte IMAP.'
        }
      } catch (error) {
        this.imapError = error?.message || 'Erreur lors du chargement IMAP'
      } finally {
        this.imapLoadingMessages = false
      }
    },
    selectImapMessage(message) {
      this.selectedImapMessage = message
      const descriptionParts = [
        message.from ? `Email reçu de : ${message.from}` : '',
        message.date ? `Date : ${message.date}` : '',
        '',
        message.body || message.preview || ''
      ].filter(Boolean)

      this.emailImportPreview = {
        from: message.from || '',
        subject: message.subject || '(Sans objet)',
        date: message.date || '',
        title: message.subject || '(Sans objet)',
        description: descriptionParts.join('\n'),
        body: message.body || message.preview || '',
        messageId: message.messageId || null,
        rawEmail: message.body || message.preview || ''
      }
    },
    parseImportedEmail() {
      const raw = String(this.emailImportForm.rawEmail || '').replace(/\r\n/g, '\n')
      if (!raw.trim()) return

      const headers = {}
      const lines = raw.split('\n')
      let bodyStartIndex = lines.findIndex(line => !line.trim())
      if (bodyStartIndex === -1) bodyStartIndex = Math.min(lines.length, 8)

      for (let index = 0; index < bodyStartIndex; index += 1) {
        const line = lines[index]
        const match = line.match(/^([A-Za-zÀ-ÿ-]+)\s*:\s*(.+)$/)
        if (!match) continue
        headers[match[1].toLowerCase()] = match[2].trim()
      }

      const body = lines.slice(bodyStartIndex + 1).join('\n').trim() || raw.trim()
      const from = headers.from || headers.de || ''
      const subject = headers.subject || headers.objet || '(Sans objet)'
      const date = headers.date || ''

      const cleanSender = from.replace(/[<>]/g, '').trim()
      const descriptionParts = [
        cleanSender ? `Email reçu de : ${cleanSender}` : '',
        date ? `Date : ${date}` : '',
        '',
        body
      ].filter(Boolean)

      this.emailImportPreview = {
        from: cleanSender,
        subject,
        date,
        title: subject,
        description: descriptionParts.join('\n'),
        body
      }
    },
    async createTicketFromImportedEmail() {
      if (!this.emailImportPreview || !this.emailImportForm.projectId) return

      const projectId = Number(this.emailImportForm.projectId)
      const preview = this.emailImportPreview
      const createdTicketKey = await db.addTicket({
        projectId,
        title: preview.title,
        description: preview.description,
        status: 'todo',
        priority: 'medium',
        assignedUserId: this.currentUserId,
        emailHistory: [
          {
            id: Date.now(),
            direction: 'incoming',
            from: preview.from,
            to: [],
            subject: preview.subject,
            body: this.emailImportMode === 'imap' ? (preview.rawEmail || preview.body || '') : this.emailImportForm.rawEmail,
            parsedBody: preview.body,
            messageId: preview.messageId || null,
            status: 'received',
            createdAt: preview.date || new Date().toISOString()
          }
        ]
      })

      await this.loadData()
      const ticketId = Number(createdTicketKey)
      this.cancelEmailImport()
      if (Number.isFinite(ticketId) && ticketId > 0) {
        this.$router.push(`/tickets/${ticketId}`)
        return
      }
      alert('✅ Ticket créé depuis l\'email')
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
