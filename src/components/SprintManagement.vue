<template>
  <div>
    <div class="page-header">
      <h2>🏃 Sprints - {{ project?.name }}</h2>
      <button @click="showForm = true" class="btn btn-primary">+ Nouveau Sprint</button>
    </div>

    <!-- Formulaire de création/édition -->
    <div v-if="showForm" class="card">
      <h3>{{ editingSprint ? 'Modifier' : 'Nouveau' }} Sprint</h3>
      <form @submit.prevent="saveSprint">
        <div class="form-group">
          <label>Nom du sprint *</label>
          <input v-model="form.name" required placeholder="Sprint 1, Sprint Q1 2026..." />
        </div>
        <div class="form-group">
          <label>Objectif</label>
          <RichTextEditor v-model="form.goal" placeholder="Objectifs de ce sprint..." />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date de début</label>
            <input v-model="form.startDate" type="date" />
          </div>
          <div class="form-group">
            <label>Date de fin</label>
            <input v-model="form.endDate" type="date" />
          </div>
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="form.status">
            <option value="planned">Planifié</option>
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
          </select>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="cancelForm" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Liste des sprints -->
    <div v-for="sprint in sprints" :key="sprint.id" class="card sprint-card">
      <div class="sprint-header">
        <div>
          <h3>{{ sprint.name }}</h3>
          <span class="badge" :class="getStatusClass(sprint.status)">{{ getStatusLabel(sprint.status) }}</span>
          <div v-if="sprint.goal" class="sprint-goal" v-html="sprint.goal"></div>
          <div class="sprint-dates">
            <small v-if="sprint.startDate">📅 {{ formatDate(sprint.startDate) }}</small>
            <small v-if="sprint.endDate"> → {{ formatDate(sprint.endDate) }}</small>
          </div>
        </div>
        <div class="sprint-actions">
          <button @click="viewSprint(sprint)" class="btn btn-primary btn-sm">📋 Détails</button>
          <button @click="viewSprintGantt(sprint)" class="btn btn-secondary btn-sm">🗓️ Gantt</button>
          <button @click="editSprint(sprint)" class="btn btn-secondary btn-sm">✏️ Modifier</button>
          <button @click="deleteSprintConfirm(sprint)" class="btn btn-danger btn-sm">🗑️ Supprimer</button>
        </div>
      </div>

      <!-- Tickets du sprint -->
      <div v-if="getSprintTickets(sprint.id).length > 0" class="sprint-tickets">
        <h4>🎫 Tickets ({{ getSprintTickets(sprint.id).length }})</h4>
        <div class="ticket-chips">
          <span v-for="ticket in getSprintTickets(sprint.id)" :key="ticket.id" class="ticket-chip clickable-ticket-chip" :class="'chip-' + ticket.status" @click="viewTicket(ticket.id)">
            {{ ticket.title }}
          </span>
        </div>
      </div>

      <!-- Comptes rendus -->
      <div v-if="sprint.meetingNotes && sprint.meetingNotes.length > 0" class="meeting-notes">
        <h4>📝 Comptes rendus ({{ sprint.meetingNotes.length }})</h4>
        <div v-for="note in sprint.meetingNotes" :key="note.id" class="note-item">
          <div class="note-header">
            <small>{{ formatDateTime(note.createdAt) }}</small>
            <div>
              <button @click="exportNoteToPDF(note, sprint.name)" class="btn-icon" title="Exporter en PDF">📥</button>
              <button @click="viewSprint(sprint); startEditNote(note)" class="btn-icon" title="Modifier">✏️</button>
              <button @click="deleteNote(sprint.id, note.id)" class="btn-icon" title="Supprimer">🗑️</button>
            </div>
          </div>
          <div class="note-content" v-html="note.content"></div>
        </div>
      </div>
    </div>

    <!-- Modal détails du sprint -->
    <div v-if="selectedSprint" class="modal-overlay" @click.self="selectedSprint = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ selectedSprint.name }}</h2>
          <button @click="selectedSprint = null" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <!-- Informations du sprint -->
          <div class="sprint-info">
            <div v-if="selectedSprint.goal">
              <strong>Objectif :</strong>
              <div class="sprint-goal-content" v-html="selectedSprint.goal"></div>
            </div>
            <p v-else><strong>Objectif :</strong> Non défini</p>
            <p><strong>Statut :</strong> <span class="badge" :class="getStatusClass(selectedSprint.status)">{{ getStatusLabel(selectedSprint.status) }}</span></p>
            <p v-if="selectedSprint.startDate"><strong>Période :</strong> {{ formatDate(selectedSprint.startDate) }} → {{ formatDate(selectedSprint.endDate) }}</p>
          </div>

          <!-- Gestion des tickets -->
          <div class="section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3>🎫 Tickets associés</h3>
              <div class="view-toggle">
                <button @click="ticketView = 'list'" :class="{ active: ticketView === 'list' }" class="btn-toggle">📋 Liste</button>
                <button @click="ticketView = 'kanban'" :class="{ active: ticketView === 'kanban' }" class="btn-toggle">📊 Kanban</button>
                <button @click="ticketView = 'gantt'" :class="{ active: ticketView === 'gantt' }" class="btn-toggle">🗓️ Gantt</button>
              </div>
            </div>
            
            <div class="form-group">
              <label>Ajouter un ticket</label>
              <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555;">
                <input v-model="showTicketsFromOtherSprints" type="checkbox" />
                Afficher les tickets déjà affectés à un autre sprint
              </label>
              <select v-model="ticketToAdd" @change="addTicketToSprint">
                <option value="">Sélectionner un ticket...</option>
                <option v-for="ticket in availableTickets" :key="ticket.id" :value="ticket.id">
                  {{ ticket.isAlreadyAssignedToAnotherSprint ? '⚠️ ' : '' }}{{ ticket.title }} ({{ getStatusLabel(ticket.status) }}){{ ticket.isAlreadyAssignedToAnotherSprint ? ` • déjà dans ${ticket.sprintName}` : '' }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>✅ Ajouter une tâche locale</label>
              <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555;">
                <input v-model="showLocalTasksFromOtherSprints" type="checkbox" />
                Afficher les tâches déjà affectées à un autre sprint
              </label>
              <select v-model="localTaskToAdd" @change="addLocalTaskToSprint">
                <option value="">Sélectionner une tâche locale...</option>
                <option v-for="task in availableLocalTasks" :key="task.id" :value="task.id">
                  {{ task.isAlreadyInAnotherSprint ? '⚠️ ' : '' }}{{ task.title }} ({{ getStatusLabel(task.status) }}){{ task.isAlreadyInAnotherSprint ? ` • déjà dans ${task.sprintName}` : '' }}
                </option>
              </select>
            </div>
            
            <!-- Vue Liste -->
            <div v-if="ticketView === 'list' && getSprintTickets(selectedSprint.id).length > 0" class="ticket-list">
              <div v-for="ticket in getSprintTickets(selectedSprint.id)" :key="ticket.id" class="ticket-row">
                <span class="badge" :class="getStatusClass(ticket.status)">{{ getStatusLabel(ticket.status) }}</span>
                <span class="clickable-ticket-title" @click="viewTicket(ticket.id)">{{ ticket.title }}</span>
                <button @click="removeTicketFromSprint(ticket.id)" class="btn-icon">✕</button>
              </div>
            </div>

            <!-- Tâches locales en vue liste -->
            <div v-if="ticketView === 'list' && getSprintLocalTasks(selectedSprint.id).length > 0" class="ticket-list" style="margin-top: 0.5rem;">
              <div class="section-label" style="font-size: 0.8rem; color: #888; padding: 0.2rem 0;">✅ Tâches locales</div>
              <div v-for="task in getSprintLocalTasks(selectedSprint.id)" :key="'lt-' + task.id" class="ticket-row">
                <span class="badge" :class="getStatusClass(task.status)">{{ getStatusLabel(task.status) }}</span>
                <span class="clickable-ticket-title" @click.stop="editLocalTask(task.id)" style="cursor: pointer; color: #667eea;">✅ {{ task.title }}</span>
                <button @click="editLocalTask(task.id)" class="btn-icon" title="Modifier la tâche">✏️</button>
                <button @click="removeLocalTaskFromSprint(task.id)" class="btn-icon">✕</button>
              </div>
            </div>
            
            <!-- Vue Kanban -->
            <div v-if="ticketView === 'kanban' && (getSprintTickets(selectedSprint.id).length > 0 || getSprintLocalTasks(selectedSprint.id).length > 0)" class="sprint-kanban">
              <!-- Colonnes personnalisées -->
              <div v-for="column in kanbanColumns" :key="column.id" class="kanban-column">
                <div class="column-header" :style="{ backgroundColor: column.color }">
                  <h4>{{ column.label }}</h4>
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
                    :key="(ticket._isLocalTask ? 'lt-' : 'tk-') + ticket.id"
                    class="kanban-card"
                    :class="{ 'kanban-card-local': ticket._isLocalTask }"
                    draggable="true"
                    @dragstart="onDragStart($event, ticket)"
                    @dragend="onDragEnd"
                  >
                    <div class="card-header">
                      <h5
                        class="clickable-ticket-title"
                        @click.stop="ticket._isLocalTask ? editLocalTask(ticket.id) : viewTicket(ticket.id)"
                        :style="ticket._isLocalTask ? 'cursor: pointer; color: #667eea;' : ''"
                      >{{ ticket._isLocalTask ? '✅ ' : '🎫 ' }}{{ ticket.title }}</h5>
                      <button
                        @click.stop="ticket._isLocalTask ? removeLocalTaskFromSprint(ticket.id) : removeTicketFromSprint(ticket.id)"
                        class="btn-icon-small"
                      >✕</button>
                    </div>
                    <div v-if="ticket.description" class="card-description" v-html="ticket.description"></div>
                    <div class="card-footer">
                      <span class="badge" :class="getPriorityClass(ticket.priority)">
                        {{ getPriorityLabel(ticket.priority) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="getTicketsByStatus(column.id).length === 0" class="empty-column">
                    Aucun ticket
                  </div>
                </div>
              </div>
            </div>

            <!-- Vue Gantt (tâches locales du sprint) -->
            <div v-if="ticketView === 'gantt'" class="sprint-gantt-wrapper">
              <div v-if="sprintGanttTasks.length === 0" class="empty-state">
                Aucune tâche/ticket planifiable pour ce sprint.
              </div>
              <template v-else>
                <div class="sprint-gantt-header">
                  <div class="sg-task">Tâche locale</div>
                  <div class="sg-assignee">Assigné</div>
                  <div class="sg-timeline">
                    <div class="sg-days" :style="{ gridTemplateColumns: `repeat(${sprintGanttDays.length}, 1fr)` }">
                      <div v-for="day in sprintGanttDays" :key="`sg-h-${day}`" class="sg-day-label">{{ day.slice(5) }}</div>
                    </div>
                  </div>
                </div>

                <div v-for="task in sprintGanttTasks" :key="`sg-${task.id}`" class="sprint-gantt-row">
                  <div class="sg-task">
                    <strong>{{ task.title }}</strong>
                    <div class="small text-muted">
                      {{ task.sourceType === 'ticket' ? '🎫 Ticket' : '✅ Tâche locale' }} • {{ task.ganttStartDate }} • {{ task.estimatedTime }}h
                      <span v-if="task.sourceType === 'ticket' && task.hasEstimatedTime === false">(auto)</span>
                    </div>
                  </div>
                  <div class="sg-assignee">{{ getUserDisplayName(task.assignedUserId) }}</div>
                  <div class="sg-timeline">
                    <div class="sg-bar" :style="getSprintGanttBarStyle(task)"></div>
                  </div>
                </div>
              </template>
            </div>
            
            <div v-if="getSprintTickets(selectedSprint.id).length === 0 && getSprintLocalTasks(selectedSprint.id).length === 0" class="empty-state">
              Aucun ticket ou tâche locale associé à ce sprint.
            </div>
          </div>

          <!-- Comptes rendus de réunion -->
          <div class="section">
            <h3>📝 Comptes rendus de réunion</h3>
            
            <!-- Formulaire d'ajout -->
            <div class="meeting-form">
              <RichTextEditor 
                v-model="newNote" 
                placeholder="Saisir le compte rendu de réunion..."
              />
              <div class="meeting-actions">
                <button @click="startRecording" :disabled="isRecording" class="btn btn-secondary">
                  {{ isRecording ? '🔴 Enregistrement...' : '🎤 Dicter' }}
                </button>
                <button @click="stopRecording" v-if="isRecording" class="btn btn-danger">⏹️ Arrêter</button>
                <button @click="addNote" :disabled="!newNote" class="btn btn-primary">💾 Enregistrer</button>
              </div>
              <div v-if="speechError" class="error-message">{{ speechError }}</div>
            </div>

            <!-- Liste des comptes rendus -->
            <div v-if="selectedSprint.meetingNotes && selectedSprint.meetingNotes.length > 0" class="notes-list">
              <div v-for="note in selectedSprint.meetingNotes" :key="note.id" class="note-card">
                <div class="note-header">
                  <small>{{ formatDateTime(note.createdAt) }}</small>
                  <div>
                    <button v-if="editingNoteId !== note.id" @click="exportNoteToPDF(note)" class="btn-icon" title="Exporter en PDF">📥</button>
                    <button v-if="editingNoteId !== note.id" @click="startEditNote(note)" class="btn-icon" title="Modifier">✏️</button>
                    <button @click="deleteNote(selectedSprint.id, note.id)" class="btn-icon" title="Supprimer">🗑️</button>
                  </div>
                </div>
                <!-- Mode lecture -->
                <div v-if="editingNoteId !== note.id" class="note-content" v-html="note.content"></div>
                <!-- Mode édition -->
                <div v-else class="note-edit">
                  <RichTextEditor v-model="editingNoteContent" />
                  <div class="note-edit-actions">
                    <button @click="saveEditNote(selectedSprint.id, note.id)" class="btn btn-primary btn-sm">💾 Enregistrer</button>
                    <button @click="cancelEditNote" class="btn btn-secondary btn-sm">Annuler</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import RichTextEditor from './RichTextEditor.vue'

export default {
  name: 'SprintManagement',
  components: {
    RichTextEditor
  },
  props: {
    projectId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      project: null,
      sprints: [],
      tickets: [],
      localTasks: [],
      users: [],
      projectStages: [],
      showForm: false,
      editingSprint: null,
      selectedSprint: null,
      ticketToAdd: '',
      localTaskToAdd: '',
      showTicketsFromOtherSprints: false,
      showLocalTasksFromOtherSprints: false,
      newNote: '',
      editingNoteId: null,
      editingNoteContent: '',
      isRecording: false,
      speechError: null,
      recognition: null,
      ticketView: 'kanban',
      draggedTicket: null,
      draggedItem: null,
      form: {
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
        status: 'planned'
      }
    }
  },
  async mounted() {
    await this.loadData()
    this.initSpeechRecognition()
    
    // Ouvrir automatiquement un sprint si sprintId est dans l'URL
    const sprintId = this.$route.query.sprintId
    if (sprintId) {
      const sprint = this.sprints.find(s => s.id === parseInt(sprintId))
      if (sprint) {
        this.viewSprint(sprint)
      }
    }
  },
  computed: {
    availableTicketsSource() {
      return this.tickets
        .filter(t => !this.isCompletedTicketStatus(t.status))
        .map(ticket => {
          const isAlreadyAssignedToAnotherSprint = !!ticket.sprintId && ticket.sprintId !== this.selectedSprint?.id
          return {
            ...ticket,
            isAlreadyAssignedToAnotherSprint,
            sprintName: isAlreadyAssignedToAnotherSprint ? this.getSprintName(ticket.sprintId) : ''
          }
        })
    },
    availableTickets() {
      return this.availableTicketsSource.filter(ticket => {
        if (this.showTicketsFromOtherSprints) return true
        return !ticket.isAlreadyAssignedToAnotherSprint
      })
    },
    availableLocalTasksSource() {
      return this.localTasks
        .filter(t => !this.isCompletedTicketStatus(t.status))
        .map(task => {
          const isAlreadyInAnotherSprint = !!task.sprintId && task.sprintId !== this.selectedSprint?.id
          return {
            ...task,
            isAlreadyInAnotherSprint,
            sprintName: isAlreadyInAnotherSprint ? this.getSprintName(task.sprintId) : ''
          }
        })
    },
    availableLocalTasks() {
      return this.availableLocalTasksSource.filter(task => {
        if (this.showLocalTasksFromOtherSprints) return true
        return !task.isAlreadyInAnotherSprint
      })
    },
    useRelationalStages() {
      return this.projectStages.length > 0
    },
    kanbanColumns() {
      if (this.useRelationalStages) {
        return this.projectStages.map(s => ({
          id: s.id.toString(),
          label: s.name,
          color: s.color || '#cfe2ff'
        }))
      }
      if (this.project?.kanbanColumns) {
        return this.project.kanbanColumns
      }
      return [
        { id: 'todo', label: 'À faire', color: '#fff3cd' },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
        { id: 'done', label: 'Terminé', color: '#d1e7dd' }
      ]
    },
    sprintGanttTasks() {
      if (!this.selectedSprint?.id) return []
      const hoursPerDay = Number(this.project?.hoursPerDay || 8)
      const localTaskItems = (this.localTasks || [])
        .filter(task => Number(task.sprintId) === Number(this.selectedSprint.id))
        .filter(task => Number(task.estimatedTime || 0) > 0)
        .map(task => {
          const ganttStartDate = this.toDateOnlyString(task.startDate || task.createdAt || new Date().toISOString())
          const estimatedHours = Number(task.estimatedTime || 0)
          const ganttDurationDays = Math.max(1, Math.ceil(estimatedHours / (hoursPerDay > 0 ? hoursPerDay : 8)))
          return {
            ...task,
            sourceType: 'localTask',
            ganttStartDate,
            ganttDurationDays,
            ganttEndDate: this.addDaysToDateString(ganttStartDate, ganttDurationDays - 1)
          }
        })

      const ticketItems = (this.tickets || [])
        .filter(ticket => Number(ticket.sprintId) === Number(this.selectedSprint.id))
        .map(ticket => {
          const ganttStartDate = this.toDateOnlyString(ticket.startDate || ticket.createdAt || new Date().toISOString())
          const estimatedHours = Number(ticket.estimatedTime || 1)
          const ganttDurationDays = Math.max(1, Math.ceil(estimatedHours / (hoursPerDay > 0 ? hoursPerDay : 8)))
          return {
            ...ticket,
            sourceType: 'ticket',
            hasEstimatedTime: Number(ticket.estimatedTime || 0) > 0,
            estimatedTime: estimatedHours,
            ganttStartDate,
            ganttDurationDays,
            ganttEndDate: this.addDaysToDateString(ganttStartDate, ganttDurationDays - 1)
          }
        })

      return [...localTaskItems, ...ticketItems]
        .sort((a, b) => String(a.ganttStartDate).localeCompare(String(b.ganttStartDate)))
    },
    sprintGanttDays() {
      if (!this.sprintGanttTasks.length) return []
      const starts = this.sprintGanttTasks.map(task => task.ganttStartDate)
      const ends = this.sprintGanttTasks.map(task => task.ganttEndDate)
      const minDate = starts.reduce((min, value) => value < min ? value : min, starts[0])
      const maxDate = ends.reduce((max, value) => value > max ? value : max, ends[0])

      const days = []
      let cursor = minDate
      let guard = 0
      while (cursor <= maxDate && guard < 365) {
        days.push(cursor)
        cursor = this.addDaysToDateString(cursor, 1)
        guard += 1
      }
      return days
    }
  },
  methods: {
    toDateOnlyString(date) {
      if (!date) return ''
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return String(date)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    addDaysToDateString(dateStr, daysToAdd) {
      const [y, m, d] = this.toDateOnlyString(dateStr).split('-').map(Number)
      const date = new Date(y, (m || 1) - 1, d || 1)
      date.setDate(date.getDate() + Number(daysToAdd || 0))
      return this.toDateOnlyString(date)
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => Number(u.id) === Number(userId))
      return user ? `${user.displayName} (${user.username})` : `User #${userId}`
    },
    getSprintGanttBarStyle(task) {
      if (!task?.ganttStartDate || !this.sprintGanttDays.length) return {}
      const startIndex = this.sprintGanttDays.findIndex(day => day === task.ganttStartDate)
      if (startIndex < 0) return {}
      const total = this.sprintGanttDays.length
      const leftPct = (startIndex / total) * 100
      const widthPct = (Math.max(1, Number(task.ganttDurationDays || 1)) / total) * 100
      return {
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 2)}%`
      }
    },
    isCompletedTicketStatus(status) {
      if (!status) return false
      if (status === 'done' || status === 'completed' || status === 'closed') return true

      const label = String(this.getStatusLabel(status) || '').toLowerCase()
      return (
        label.includes('termin') ||
        label.includes('done') ||
        label.includes('clos') ||
        label.includes('résolu') ||
        label.includes('resolu')
      )
    },
    async loadData() {
      this.project = await db.getProject(this.projectId)
      this.sprints = await db.getSprintsByProject(this.projectId)
      this.tickets = await db.getTicketsByProject(this.projectId)
      this.localTasks = await db.getLocalTasksByProject(this.projectId)
      this.users = await db.getActiveUsers()
      this.projectStages = await db.getStagesByProject(this.projectId)
    },
    async saveSprint() {
      try {
        console.log('Sauvegarde du sprint...', this.form)
        const sprintData = {
          ...this.form,
          projectId: this.projectId
        }
        
        if (this.editingSprint) {
          await db.updateSprint(this.editingSprint.id, sprintData)
        } else {
          await db.addSprint(sprintData)
        }
        
        await this.loadData()
        this.cancelForm()
        console.log('Sprint sauvegardé avec succès')
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du sprint:', error)
        alert('Erreur lors de la sauvegarde du sprint: ' + error.message)
      }
    },
    editSprint(sprint) {
      this.editingSprint = sprint
      this.form = {
        name: sprint.name,
        goal: sprint.goal || '',
        startDate: sprint.startDate || '',
        endDate: sprint.endDate || '',
        status: sprint.status
      }
      this.showForm = true
    },
    cancelForm() {
      this.showForm = false
      this.editingSprint = null
      this.form = {
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
        status: 'planned'
      }
    },
    async deleteSprintConfirm(sprint) {
      if (confirm(`Supprimer le sprint "${sprint.name}" ?`)) {
        await db.deleteSprint(sprint.id)
        await this.loadData()
      }
    },
    viewSprint(sprint) {
      this.selectedSprint = sprint
      this.ticketView = 'kanban'
      this.newNote = ''
    },
    viewSprintGantt(sprint) {
      this.selectedSprint = sprint
      this.ticketView = 'gantt'
      this.newNote = ''
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    },
    editLocalTask(taskId) {
      this.$router.push(`/local-tasks/${taskId}`)
    },
    getSprintName(sprintId) {
      const sprint = this.sprints.find(s => Number(s.id) === Number(sprintId))
      return sprint?.name || 'un autre sprint'
    },
    getSprintTickets(sprintId) {
      return this.tickets.filter(t => Number(t.sprintId) === Number(sprintId))
    },
    getSprintLocalTasks(sprintId) {
      return this.localTasks.filter(t => Number(t.sprintId) === Number(sprintId))
    },
    getTicketsByStatus(status) {
      if (!this.selectedSprint) return []
      const tickets = this.getSprintTickets(this.selectedSprint.id).filter(t => {
        if (this.useRelationalStages) {
          if (t.stageId != null) return String(t.stageId) === String(status)
          return String(t.status) === String(status)
        }
        return String(t.status) === String(status)
      })
      const localTasks = this.getSprintLocalTasks(this.selectedSprint.id).filter(t => {
        if (this.useRelationalStages) {
          if (t.stageId != null) return String(t.stageId) === String(status)
          return String(t.status) === String(status)
        }
        return String(t.status) === String(status)
      }).map(lt => ({ ...lt, _isLocalTask: true }))
      return [...tickets, ...localTasks]
    },
    onDragStart(event, item) {
      this.draggedItem = item
      this.draggedTicket = item._isLocalTask ? null : item
      event.dataTransfer.effectAllowed = 'move'
      event.target.classList.add('dragging')
    },
    onDragEnd(event) {
      event.target.classList.remove('dragging')
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
      if (this.draggedItem) {
        const updates = { status: newColId }
        if (this.useRelationalStages) updates.stageId = parseInt(newColId)
        if (this.draggedItem._isLocalTask) {
          await db.updateLocalTask(this.draggedItem.id, updates)
        } else if (this.draggedTicket) {
          await db.updateTicket(this.draggedTicket.id, updates)
        }
        await this.loadData()
        if (this.selectedSprint) {
          this.selectedSprint = await db.getSprint(this.selectedSprint.id)
        }
      }
      this.draggedTicket = null
      this.draggedItem = null
    },
    exportNoteToPDF(note, sprintName = null) {
      const title = sprintName || this.selectedSprint?.name || 'Compte rendu'
      const date = this.formatDateTime(note.createdAt)
      
      // Créer une fenêtre d'impression avec le contenu du CR
      const printWindow = window.open('', '', 'height=600,width=800')
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Compte rendu - ${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              padding: 2rem;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
              color: #333;
            }
            h1 {
              color: #4DBA87;
              border-bottom: 3px solid #4DBA87;
              padding-bottom: 0.5rem;
              margin-bottom: 1rem;
            }
            .meta {
              color: #666;
              font-size: 0.9rem;
              margin-bottom: 2rem;
            }
            .content {
              margin-top: 2rem;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>📋 Compte rendu - ${title}</h1>
          <div class="meta">
            <strong>Date :</strong> ${date}
          </div>
          <div class="content">
            ${note.content}
          </div>
        </body>
        </html>
      `)
      
      printWindow.document.close()
      
      // Attendre que le contenu soit chargé avant d'imprimer
      printWindow.onload = () => {
        printWindow.print()
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    },
    async addTicketToSprint() {
      if (this.ticketToAdd && this.selectedSprint) {
        await db.updateTicket(parseInt(this.ticketToAdd), { sprintId: this.selectedSprint.id })
        await this.loadData()
        this.ticketToAdd = ''
        this.selectedSprint = await db.getSprint(this.selectedSprint.id)
      }
    },
    async addLocalTaskToSprint() {
      if (this.localTaskToAdd && this.selectedSprint) {
        await db.updateLocalTask(parseInt(this.localTaskToAdd), { sprintId: this.selectedSprint.id })
        await this.loadData()
        this.localTaskToAdd = ''
      }
    },
    async removeLocalTaskFromSprint(localTaskId) {
      await db.updateLocalTask(localTaskId, { sprintId: null })
      await this.loadData()
    },
    async removeTicketFromSprint(ticketId) {
      await db.updateTicket(ticketId, { sprintId: null })
      await this.loadData()
      this.selectedSprint = await db.getSprint(this.selectedSprint.id)
    },
    async addNote() {
      if (this.newNote && this.selectedSprint) {
        await db.addMeetingNote(this.selectedSprint.id, this.newNote)
        await this.loadData()
        this.selectedSprint = await db.getSprint(this.selectedSprint.id)
        this.newNote = ''
      }
    },
    async deleteNote(sprintId, noteId) {
      if (confirm('Supprimer ce compte rendu ?')) {
        await db.deleteMeetingNote(sprintId, noteId)
        await this.loadData()
        if (this.selectedSprint) {
          this.selectedSprint = await db.getSprint(this.selectedSprint.id)
        }
      }
    },
    startEditNote(note) {
      this.editingNoteId = note.id
      this.editingNoteContent = note.content
    },
    cancelEditNote() {
      this.editingNoteId = null
      this.editingNoteContent = ''
    },
    async saveEditNote(sprintId, noteId) {
      if (this.editingNoteContent) {
        await db.updateMeetingNote(sprintId, noteId, this.editingNoteContent)
        await this.loadData()
        if (this.selectedSprint) {
          this.selectedSprint = await db.getSprint(this.selectedSprint.id)
        }
        this.editingNoteId = null
        this.editingNoteContent = ''
      }
    },
    initSpeechRecognition() {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = 'fr-FR'

        this.recognition.onresult = (event) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            this.newNote += finalTranscript
          }
        }

        this.recognition.onerror = (event) => {
          this.speechError = `Erreur de reconnaissance vocale: ${event.error}`
          this.isRecording = false
        }

        this.recognition.onend = () => {
          this.isRecording = false
        }
      } else {
        this.speechError = 'La reconnaissance vocale n\'est pas supportée par votre navigateur'
      }
    },
    startRecording() {
      if (this.recognition) {
        this.speechError = null
        this.isRecording = true
        this.recognition.start()
      }
    },
    stopRecording() {
      if (this.recognition) {
        this.recognition.stop()
        this.isRecording = false
      }
    },
    getStatusClass(status) {
      const classes = {
        'planned': 'badge-info',
        'active': 'badge-success',
        'completed': 'badge-secondary',
        'todo': 'badge-warning',
        'in-progress': 'badge-info',
        'done': 'badge-success'
      }
      return classes[status] || 'badge-info'
    },
    getStatusLabel(status) {
      // Chercher dans les colonnes kanban du projet
      const col = this.kanbanColumns.find(c => String(c.id) === String(status))
      if (col) return col.label
      const labels = {
        'planned': 'Planifié',
        'active': 'En cours',
        'completed': 'Terminé',
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
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    },
    formatDateTime(dateStr) {
      return new Date(dateStr).toLocaleString('fr-FR')
    }
  },
  beforeUnmount() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop()
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

.sprint-card {
  margin-bottom: 1.5rem;
}

.sprint-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.sprint-goal {
  color: #666;
  margin: 0.5rem 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.sprint-goal-content {
  margin-top: 0.5rem;
  color: #666;
  line-height: 1.6;
}

.sprint-dates {
  color: #999;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.sprint-actions {
  display: flex;
  gap: 0.5rem;
}

.sprint-tickets {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.ticket-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.ticket-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  background: #f0f0f0;
}

.clickable-ticket-chip,
.clickable-ticket-title {
  cursor: pointer;
}

.chip-todo { background: #fff3cd; }
.chip-in-progress { background: #cfe2ff; }
.chip-done { background: #d1e7dd; }

.meeting-notes {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.note-item {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.note-content {
  margin: 0;
  line-height: 1.6;
  color: #333;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 1400px;
  max-height: 90vh;
  overflow-y: auto;
  width: 95%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 1.5rem;
}

.section {
  margin-top: 2rem;
}

.section h3 {
  margin-bottom: 1rem;
}

.sprint-info p {
  margin: 0.5rem 0;
}

.ticket-list {
  margin-top: 1rem;
}

.ticket-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.ticket-row span:nth-child(2) {
  flex: 1;
}

.meeting-form {
  margin-bottom: 1.5rem;
}

.meeting-form textarea {
  width: 100%;
  margin-bottom: 0.5rem;
}

.meeting-actions {
  display: flex;
  gap: 0.5rem;
}

.notes-list {
  margin-top: 1rem;
}

.note-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.note-header > div {
  display: flex;
  gap: 0.5rem;
}

.note-edit {
  margin-top: 1rem;
}

.note-edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.btn-icon:hover {
  opacity: 0.7;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.btn-toggle {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 0.875rem;
}

.btn-toggle:hover {
  border-color: #4DBA87;
}

.btn-toggle.active {
  background: #4DBA87;
  color: white;
  border-color: #4DBA87;
}

.sprint-kanban {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  min-height: 400px;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.sprint-gantt-wrapper {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 1rem;
}

.sprint-gantt-header,
.sprint-gantt-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) minmax(180px, 1fr) minmax(460px, 3fr);
  align-items: center;
}

.sprint-gantt-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
}

.sprint-gantt-row {
  border-bottom: 1px solid #f0f0f0;
}

.sprint-gantt-row:last-child {
  border-bottom: none;
}

.sg-task,
.sg-assignee,
.sg-timeline {
  padding: 0.75rem;
}

.sg-timeline {
  position: relative;
  min-height: 48px;
}

.sg-days {
  display: grid;
  gap: 0;
}

.sg-day-label {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  padding: 0.2rem 0;
  border-left: 1px solid #f0f0f0;
}

.sg-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 22px;
  border-radius: 999px;
  background: #4DBA87;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.kanban-column {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
}

.column-header {
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.column-header h4 {
  margin: 0;
  font-size: 0.95rem;
}

.count-badge {
  background: rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
}

.column-content {
  flex: 1;
  min-height: 300px;
  padding: 0.5rem;
  transition: background-color 0.2s;
}

.column-content.drag-over {
  background-color: rgba(0, 0, 0, 0.05);
}

.kanban-card {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: move;
  transition: all 0.2s;
}

.kanban-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.kanban-card.dragging {
  opacity: 0.5;
  transform: rotate(3deg);

.kanban-card-local {
  border-left: 3px solid #198754;
  background: #f0fff4;
}

.kanban-card-local:hover {
  background: #e6ffed;
}
}

.kanban-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.kanban-card h5 {
  margin: 0;
  font-size: 0.9rem;
  flex: 1;
}

.btn-icon-small {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  opacity: 0.6;
}

.btn-icon-small:hover {
  opacity: 1;
}

.card-description {
  font-size: 0.85rem;
  color: #666;
  margin: 0.5rem 0;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.empty-column {
  text-align: center;
  color: #999;
  padding: 2rem 0.5rem;
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 1rem;
}
</style>

