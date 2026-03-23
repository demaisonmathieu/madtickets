<template>
  <div>
    <div class="page-header">
      <div>
        <h2>🗓️ Gantt Utilisateur</h2>
        <p style="color: #666; margin-top: 0.5rem;">
          Vue hebdomadaire globale (tickets + tâches locales), indépendante des projets.
        </p>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="toolbar-group">
          <button
            class="btn btn-sm"
            :class="viewMode === 'week' ? 'btn-primary' : 'btn-secondary'"
            @click="viewMode = 'week'"
          >
            📅 Vue semaine
          </button>
          <button
            class="btn btn-sm"
            :class="viewMode === 'day' ? 'btn-primary' : 'btn-secondary'"
            @click="viewMode = 'day'"
          >
            🕐 Vue jour
          </button>
          <button
            class="btn btn-sm"
            :class="viewMode === 'month' ? 'btn-primary' : 'btn-secondary'"
            @click="viewMode = 'month'"
          >
            🗓️ Vue mois
          </button>

          <template v-if="viewMode === 'week'">
            <button class="btn btn-secondary btn-sm" @click="prevWeek">← Semaine -1</button>
            <button class="btn btn-secondary btn-sm" @click="nextWeek">Semaine +1 →</button>
            <small style="color: #666;">
              {{ weekDays[0] }} → {{ weekDays[weekDays.length - 1] }}
            </small>
          </template>

          <template v-else-if="viewMode === 'month'">
            <button class="btn btn-secondary btn-sm" @click="prevMonth">← Mois -1</button>
            <button class="btn btn-secondary btn-sm" @click="nextMonth">Mois +1 →</button>
            <small style="color: #666;">
              {{ monthDays[0] }} → {{ monthDays[monthDays.length - 1] }}
            </small>
          </template>

          <template v-else>
            <button class="btn btn-secondary btn-sm" @click="prevDay">← Jour -1</button>
            <button class="btn btn-secondary btn-sm" @click="nextDay">Jour +1 →</button>
            <input v-model="selectedDay" type="date" class="date-input" />
          </template>
        </div>

        <div class="toolbar-group">
          <label style="font-size: 0.9rem; color: #666;">Projet</label>
          <select v-model="selectedProjectId" style="min-width: 220px;">
            <option value="">Tous les projets</option>
            <option v-for="project in projects" :key="`gantt-project-${project.id}`" :value="String(project.id)">
              {{ project.name }}
            </option>
          </select>
          <label style="font-size: 0.9rem; color: #666;">Sprint</label>
          <select v-model="selectedSprintId" :disabled="!selectedProjectId" style="min-width: 220px;">
            <option value="">{{ selectedProjectId ? 'Tous les sprints' : 'Sélectionnez un projet' }}</option>
            <option value="none">Sans sprint</option>
            <option v-for="sprint in filteredSprints" :key="`gantt-sprint-${sprint.id}`" :value="String(sprint.id)">
              {{ sprint.name }}
            </option>
          </select>
          <button class="btn btn-primary btn-sm" @click="openQuickCreateModal">+ Nouveau ticket/tâche</button>
          <button class="btn btn-secondary btn-sm" @click="loadData">🔄 Rafraîchir</button>
        </div>
      </div>

      <small style="display: block; color: #666; margin-bottom: 0.75rem;">
        <template v-if="viewMode !== 'day'">
          💡 Astuce: glissez une cellule colorée sur un autre jour pour déplacer la date de début.
        </template>
        <template v-else>
          💡 Astuce: glissez une cellule colorée sur une heure pour planifier la journée.
        </template>
      </small>

      <div class="planning-backlog" v-if="planningBacklogSource.length > 0">
        <div class="planning-backlog-header">
          <div style="display: flex; flex-direction: column; gap: 0.35rem;">
            <strong>📥 À planifier</strong>
            <small style="color: #666;">Glisser-déposer sur la grille, ou cliquer “Déposer”.</small>
          </div>
          <label style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #555;">
            <input v-model="showAssignedBacklogItems" type="checkbox" />
            Afficher les tickets / tâches déjà affecté(e)s
          </label>
        </div>
        <div class="planning-backlog-list">
          <div
            v-for="item in planningBacklog"
            :key="`backlog-${item.type}-${item.id}`"
            class="planning-backlog-item"
            :class="{ 'planning-backlog-item-assigned': item.isAlreadyAssigned }"
            draggable="true"
            @dragstart="onBacklogDragStart(item, $event)"
            @dragend="onBacklogDragEnd"
          >
            <div class="planning-backlog-main">
              <span class="badge" :class="item.type === 'ticket' ? 'badge-info' : 'badge-success'">{{ item.typeLabel }}</span>
              <span class="planning-backlog-title">{{ item.title }}</span>
              <span v-if="item.isAlreadyAssigned" class="badge badge-warning">⚠️ Déjà affecté</span>
              <small style="color: #666;">{{ item.projectName }}</small>
            </div>
            <button class="btn btn-secondary btn-sm" @click="startPlanItem(item)">📍 Déposer</button>
          </div>
        </div>
        <div v-if="planningBacklog.length === 0" class="empty-grid-hint" style="margin-top: 0.75rem;">
          Aucun ticket / tâche supplémentaire à afficher avec les filtres actuels.
        </div>
        <div v-if="pendingPlanItem" class="planning-backlog-pending">
          🎯 Élément sélectionné: <strong>{{ pendingPlanItem.title }}</strong>
          <small v-if="pendingPlanItem.duplicateAssignment" style="color: #666;">(nouvelle affectation)</small>
          <button class="btn btn-secondary btn-sm" @click="cancelPendingPlan">Annuler</button>
        </div>
      </div>

      <div v-if="loading" style="text-align: center; color: #666; padding: 2rem;">Chargement...</div>

      <div v-else-if="viewMode !== 'day'" class="gantt-wrapper">
        <div class="gantt-header">
          <div class="gantt-user-col">Utilisateur</div>
          <div class="gantt-timeline-col">
            <div class="gantt-days-grid" :style="{ gridTemplateColumns: `repeat(${timelineDays.length}, 1fr)` }">
              <div v-for="day in timelineDays" :key="`gh-${day}`" class="gantt-day-label">{{ formatTimelineDayLabel(day) }}</div>
            </div>
          </div>
        </div>

        <div v-if="ganttItems.length === 0" class="empty-grid-hint">
          Aucun ticket / tâche assigné(e) non terminé(e) pour cette semaine.
        </div>

        <div v-for="row in ganttUserRows" :key="`gantt-user-${row.userId}`" class="gantt-row">
          <div class="gantt-user-col">
            <div class="gantt-task-title">{{ row.userName }}</div>
            <small style="color: #666;">{{ row.items.length }} élément(s)</small>
          </div>
          <div class="gantt-timeline-col" :style="getRangeTimelineStyle({ minHeight: `${getGanttRowHeight(row)}px` })">
            <div class="gantt-drop-grid" :style="{ gridTemplateColumns: `repeat(${timelineDays.length}, 1fr)` }">
              <div
                v-for="day in timelineDays"
                :key="`drop-${row.userId}-${day}`"
                class="gantt-drop-cell"
                :class="{ 'drop-active': dragState.item && dragState.overDay === day && dragState.overUserId === row.userId }"
                @dragover.prevent="onDragOverDay(row.userId, day)"
                @dragleave="onDragLeaveDay(row.userId, day)"
                @drop.prevent="onDropToDay(row, day)"
                @click="onDropCellClick(row, day)"
              ></div>
            </div>
            <div
              v-for="item in row.items"
              :key="`gantt-item-${row.userId}-${item.type}-${item.id}`"
              class="gantt-bar clickable"
              :class="item.type === 'ticket' ? 'bar-ticket' : 'bar-task'"
              :style="getGanttBarStyle(item)"
              :title="`${item.typeLabel} · ${item.title} (${formatItemDuration(item)})`"
              draggable="true"
              @dragstart="onDragStart(item, $event)"
              @dragend="onDragEnd"
              @click="openItemPopup(item)"
            >
              <span class="bar-text">{{ item.title }} • {{ formatItemDurationShort(item) }}</span>
              <span
                class="gantt-resize-handle"
                title="Redimensionner (jours)"
                @mousedown.stop.prevent="startResize(item, $event)"
              ></span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="gantt-wrapper day-gantt-wrapper">
        <div class="gantt-header day-gantt-header">
          <div class="gantt-user-col">Utilisateur</div>
          <div class="gantt-timeline-col day-timeline-col">
            <div class="gantt-days-grid" :style="{ gridTemplateColumns: `repeat(${dayHours.length}, 1fr)` }">
              <div v-for="hour in dayHours" :key="`dh-${hour}`" class="gantt-day-label hour-label">{{ formatHourLabel(hour) }}</div>
            </div>
          </div>
        </div>

        <div v-if="dayGanttItems.length === 0" class="empty-grid-hint">
          Aucun ticket / tâche assigné(e) non terminé(e) pour cette journée.
        </div>

        <div v-for="row in dayGanttUserRows" :key="`day-gantt-user-${row.userId}`" class="gantt-row day-gantt-row">
          <div class="gantt-user-col">
            <div class="gantt-task-title">{{ row.userName }}</div>
            <small style="color: #666;">{{ row.items.length }} élément(s)</small>
          </div>
          <div class="gantt-timeline-col day-timeline-col" :style="{ minHeight: `${getDayGanttRowHeight(row)}px` }">
            <div class="gantt-drop-grid" :style="{ gridTemplateColumns: `repeat(${dayHours.length}, 1fr)` }">
              <div
                v-for="hour in dayHours"
                :key="`drop-hour-${row.userId}-${hour}`"
                class="gantt-drop-cell"
                :class="{ 'drop-active': dragState.item && dragState.overHour === hour && dragState.overUserId === row.userId }"
                @dragover.prevent="onDragOverHour(row.userId, hour)"
                @dragleave="onDragLeaveHour(row.userId, hour)"
                @drop.prevent="onDropToHour(row, hour)"
                @click="onDropHourCellClick(row, hour)"
              ></div>
            </div>

            <div
              v-for="item in row.items"
              :key="`day-gantt-item-${row.userId}-${item.type}-${item.id}`"
              class="gantt-bar clickable"
              :class="item.type === 'ticket' ? 'bar-ticket' : 'bar-task'"
              :style="getDayGanttBarStyle(item)"
              :title="`${item.typeLabel} · ${item.title} (${item.estimatedTime}h)`"
              draggable="true"
              @dragstart="onDragStart(item, $event)"
              @dragend="onDragEnd"
              @click="openItemPopup(item)"
            >
              <span class="bar-text">{{ item.title }} • {{ Math.max(1, Number(item.estimatedTime || 1)) }}h</span>
              <span
                class="gantt-resize-handle"
                title="Redimensionner (heures)"
                @mousedown.stop.prevent="startResize(item, $event)"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showQuickCreateModal" class="item-modal" @click="closeQuickCreateModal">
      <div class="item-modal-content" @click.stop>
        <div class="item-modal-header">
          <div>
            <h3>➕ Créer et ajouter au Gantt</h3>
            <small style="color: #666;">L'élément sera visible immédiatement dans le planning.</small>
          </div>
          <button class="btn btn-secondary btn-sm" @click="closeQuickCreateModal">✕</button>
        </div>

        <form class="item-modal-body" @submit.prevent="saveQuickCreateItem">
          <div class="form-grid">
            <div class="form-group">
              <label>Type *</label>
              <select v-model="quickCreateForm.type" required>
                <option value="ticket">Ticket</option>
                <option value="localTask">Tâche locale</option>
              </select>
            </div>
            <div class="form-group">
              <label>Projet *</label>
              <select v-model.number="quickCreateForm.projectId" required>
                <option :value="null">Sélectionner un projet</option>
                <option v-for="project in projects" :key="`quick-project-${project.id}`" :value="Number(project.id)">
                  {{ project.name }}
                </option>
              </select>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label>Titre *</label>
              <input v-model.trim="quickCreateForm.title" required placeholder="Ex: Corriger bug planning" />
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label>Description</label>
              <textarea v-model="quickCreateForm.description" rows="3" placeholder="Description (optionnel)"></textarea>
            </div>
            <div class="form-group">
              <label>Assigné à *</label>
              <select v-model.number="quickCreateForm.assignedUserId" required>
                <option :value="null">Sélectionner un utilisateur</option>
                <option v-for="user in users" :key="`quick-user-${user.id}`" :value="Number(user.id)">
                  {{ user.displayName }} ({{ user.username }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="quickCreateForm.priority">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date de début *</label>
              <input v-model="quickCreateForm.startDate" type="date" required />
            </div>
            <div class="form-group">
              <label>Heure de début (vue jour)</label>
              <select v-model.number="quickCreateForm.startHour">
                <option v-for="hour in dayHours" :key="`quick-hour-${hour}`" :value="hour">
                  {{ formatHourLabel(hour) }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Temps estimé (heures) *</label>
              <input v-model.number="quickCreateForm.estimatedTime" type="number" min="1" step="0.5" required />
            </div>
            <div class="form-group">
              <label>Sprint</label>
              <select v-model="quickCreateForm.sprintId">
                <option :value="null">Aucun sprint</option>
                <option v-for="sprint in quickCreateSprints" :key="`quick-sprint-${sprint.id}`" :value="Number(sprint.id)">
                  {{ sprint.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="item-modal-footer" style="padding: 0; border-top: none; margin-top: 0.5rem;">
            <button type="button" class="btn btn-secondary" @click="closeQuickCreateModal">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="savingQuickCreate">
              {{ savingQuickCreate ? '⏳ Création...' : 'Créer et ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showItemModal && selectedItem" class="item-modal" @click="closeItemPopup">
      <div class="item-modal-content" @click.stop>
        <div class="item-modal-header">
          <div>
            <h3>{{ selectedItem.title }}</h3>
            <small style="color: #666;">{{ selectedItem.typeLabel }} • {{ selectedItem.projectName || 'Projet inconnu' }}</small>
          </div>
          <button class="btn btn-secondary btn-sm" @click="closeItemPopup">✕</button>
        </div>

        <div class="item-modal-body">
          <div class="meta-grid">
            <div><strong>Assigné à:</strong> {{ getUserDisplayName(selectedItem.assignedUserId) }}</div>
            <div><strong>Statut:</strong> {{ getStatusLabel(selectedItem.status) }}</div>
            <div><strong>Priorité:</strong> {{ getPriorityLabel(selectedItem.priority) }}</div>
            <div><strong>Début:</strong> {{ selectedItem.ganttStartDate }}</div>
            <div><strong>Fin:</strong> {{ selectedItem.ganttEndDate }}</div>
            <div><strong>Temps estimé:</strong> {{ formatItemDuration(selectedItem) }}</div>
            <div v-if="selectedItem.assignmentIndex != null"><strong>Occurrence:</strong> {{ selectedItem.assignmentIndex + 1 }}</div>
          </div>

          <div v-if="selectedItem.description" class="item-description" v-html="selectedItem.description"></div>
          <p v-else style="color: #999;">Aucune description</p>
        </div>

        <div class="item-modal-footer">
          <button
            class="btn btn-secondary"
            @click="prepareDuplicateAssignment"
          >
            ➕ Ajouter une affectation
          </button>
          <button
            class="btn btn-danger"
            @click="unassignSelectedItem"
          >
            🚫 Désassigner
          </button>
          <button
            v-if="selectedItem.type === 'ticket'"
            class="btn btn-primary"
            @click="openTicketFromPopup(selectedItem.id)"
          >
            🎫 Ouvrir le ticket
          </button>
          <button
            v-else
            class="btn btn-primary"
            @click="openProjectFromPopup(selectedItem.projectId)"
          >
            📁 Ouvrir le projet
          </button>
          <button class="btn btn-secondary" @click="closeItemPopup">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'UserGanttView',
  data() {
    return {
      loading: false,
      users: [],
      projects: [],
      sprints: [],
      tickets: [],
      localTasks: [],
      viewMode: 'week',
      weekStart: '',
      monthStart: '',
      selectedDay: '',
      selectedProjectId: '',
      selectedSprintId: '',
      showAssignedBacklogItems: false,
      pendingPlanItem: null,
      showQuickCreateModal: false,
      savingQuickCreate: false,
      quickCreateForm: {
        type: 'ticket',
        projectId: null,
        title: '',
        description: '',
        priority: 'medium',
        assignedUserId: null,
        startDate: '',
        startHour: 9,
        estimatedTime: 8,
        sprintId: null
      },
      showItemModal: false,
      selectedItem: null,
      dragState: {
        item: null,
        overDay: '',
        overHour: null,
        overUserId: null,
        moving: false
      },
      resizeState: {
        active: false,
        mode: 'range',
        itemId: null,
        assignmentId: null,
        itemType: '',
        timelineRect: null,
        startIndex: 0,
        hoursPerDay: 8,
        previewDays: 1,
        previewHours: 1
      }
    }
  },
  computed: {
    weekDays() {
      const start = this.weekStart || this.getWeekStart(new Date())
      const days = []
      for (let i = 0; i < 7; i++) {
        const day = this.addDaysToDateString(start, i)
        if (!this.isWeekendDate(day)) {
          days.push(day)
        }
      }
      return days
    },
    monthDays() {
      const start = this.monthStart || this.getMonthStart(new Date())
      const end = this.getMonthEnd(start)
      const days = []
      let cursor = start
      while (cursor <= end) {
        if (!this.isWeekendDate(cursor)) {
          days.push(cursor)
        }
        cursor = this.addDaysToDateString(cursor, 1)
      }
      return days
    },
    timelineDays() {
      return this.viewMode === 'month' ? this.monthDays : this.weekDays
    },
    filteredSprints() {
      const selectedProjectId = Number(this.selectedProjectId)
      const hasProjectFilter = Number.isFinite(selectedProjectId) && selectedProjectId > 0
      if (!hasProjectFilter) {
        return []
      }
      return (this.sprints || []).filter(sprint => Number(sprint.projectId) === selectedProjectId)
    },
    quickCreateSprints() {
      const projectId = Number(this.quickCreateForm.projectId)
      if (!Number.isFinite(projectId) || projectId <= 0) return []
      return (this.sprints || []).filter(sprint => Number(sprint.projectId) === projectId)
    },
    ganttItems() {
      const selectedProjectId = Number(this.selectedProjectId)
      const hasProjectFilter = Number.isFinite(selectedProjectId) && selectedProjectId > 0
      const hoursPerDayByProject = new Map((this.projects || []).map(p => [Number(p.id), Number(p.hoursPerDay || 8)]))
      const rangeStart = this.timelineDays[0]
      const rangeEnd = this.timelineDays[this.timelineDays.length - 1]

      const mappedTickets = (this.tickets || [])
        .filter(item => !!item.assignedUserId)
        .filter(item => !this.isCompletedStatus(item.status))
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .flatMap(item => this.expandItemAssignments(item, 'ticket', Number(hoursPerDayByProject.get(Number(item.projectId)) || 8), rangeStart, rangeEnd))

      const mappedLocalTasks = (this.localTasks || [])
        .filter(item => !!item.assignedUserId)
        .filter(item => !this.isCompletedStatus(item.status))
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .flatMap(item => this.expandItemAssignments(item, 'localTask', Number(hoursPerDayByProject.get(Number(item.projectId)) || 8), rangeStart, rangeEnd))

      return [...mappedTickets, ...mappedLocalTasks]
        .filter(item => item.overlapsWeek)
        .sort((a, b) => String(a.ganttStartDate).localeCompare(String(b.ganttStartDate)))
    },
    baseItems() {
      const selectedProjectId = Number(this.selectedProjectId)
      const hasProjectFilter = Number.isFinite(selectedProjectId) && selectedProjectId > 0
      const hoursPerDayByProject = new Map((this.projects || []).map(p => [Number(p.id), Number(p.hoursPerDay || 8)]))

      const mappedTickets = (this.tickets || [])
        .filter(item => !!item.assignedUserId)
        .filter(item => !this.isCompletedStatus(item.status))
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .flatMap(item => this.expandItemAssignments(item, 'ticket', Number(hoursPerDayByProject.get(Number(item.projectId)) || 8), '1900-01-01', '2999-12-31'))

      const mappedLocalTasks = (this.localTasks || [])
        .filter(item => !!item.assignedUserId)
        .filter(item => !this.isCompletedStatus(item.status))
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .flatMap(item => this.expandItemAssignments(item, 'localTask', Number(hoursPerDayByProject.get(Number(item.projectId)) || 8), '1900-01-01', '2999-12-31'))

      return [...mappedTickets, ...mappedLocalTasks]
    },
    dayHours() {
      return Array.from({ length: 24 }, (_, i) => i)
    },
    dayGanttItems() {
      const day = this.selectedDay || this.toDateOnlyString(new Date())
      return this.baseItems
        .filter(item => item.ganttStartDate <= day && item.ganttEndDate >= day)
        .map(item => ({
          ...item,
          dayStartHour: this.getItemStartHourForDay(item, day)
        }))
    },
    planningBacklogSource() {
      const selectedProjectId = Number(this.selectedProjectId)
      const hasProjectFilter = Number.isFinite(selectedProjectId) && selectedProjectId > 0
      const byProjectName = new Map((this.projects || []).map(project => [Number(project.id), project.name]))
      const plannedIds = new Set(this.baseItems.map(item => `${item.type}:${item.id}`))

      const ticketItems = (this.tickets || [])
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .filter(item => !this.isCompletedStatus(item.status))
        .map(item => {
          const key = `ticket:${item.id}`
          const hasCorePlan = !!item.assignedUserId && !!item.startDate && Number(item.estimatedTime || 0) > 0
          const isAlreadyAssigned = hasCorePlan || plannedIds.has(key)
          return {
            ...item,
            type: 'ticket',
            typeLabel: 'Ticket',
            projectName: byProjectName.get(Number(item.projectId)) || 'Projet inconnu',
            isAlreadyAssigned,
            planMode: isAlreadyAssigned ? 'duplicate' : 'new',
            duplicateAssignment: isAlreadyAssigned
          }
        })

      const localTaskItems = (this.localTasks || [])
        .filter(item => !hasProjectFilter || Number(item.projectId) === selectedProjectId)
        .filter(item => this.passesSprintFilter(item))
        .filter(item => !this.isCompletedStatus(item.status))
        .map(item => {
          const key = `localTask:${item.id}`
          const hasCorePlan = !!item.assignedUserId && !!item.startDate && Number(item.estimatedTime || 0) > 0
          const isAlreadyAssigned = hasCorePlan || plannedIds.has(key)
          return {
            ...item,
            type: 'localTask',
            typeLabel: 'Tâche locale',
            projectName: byProjectName.get(Number(item.projectId)) || 'Projet inconnu',
            isAlreadyAssigned,
            planMode: isAlreadyAssigned ? 'duplicate' : 'new',
            duplicateAssignment: isAlreadyAssigned
          }
        })

      return [...ticketItems, ...localTaskItems]
        .sort((a, b) => {
          if (a.isAlreadyAssigned !== b.isAlreadyAssigned) {
            return a.isAlreadyAssigned ? 1 : -1
          }
          return String(a.title || '').localeCompare(String(b.title || ''), 'fr')
        })
    },
    planningBacklog() {
      return this.planningBacklogSource.filter(item => this.showAssignedBacklogItems || !item.isAlreadyAssigned)
    },
    dayGanttUserRows() {
      const rows = (this.users || []).map(user => {
        const userId = Number(user.id)
        return {
          userId,
          userName: this.getUserDisplayName(userId),
          items: this.dayGanttItems.filter(item => Number(item.assignedUserId) === userId)
        }
      })

      rows.forEach(row => {
        row.items.sort((a, b) => Number(a.dayStartHour || 0) - Number(b.dayStartHour || 0))
        this.assignHourLanes(row.items)
      })

      return rows.sort((a, b) => String(a.userName).localeCompare(String(b.userName)))
    },
    ganttUserRows() {
      const rows = (this.users || []).map(user => {
        const userId = Number(user.id)
        return {
          userId,
          userName: this.getUserDisplayName(userId),
          items: this.ganttItems.filter(item => Number(item.assignedUserId) === userId)
        }
      })

      rows.forEach(row => {
        row.items.sort((a, b) => String(a.ganttStartDate).localeCompare(String(b.ganttStartDate)))
        this.assignLanes(row.items)
      })

      return rows.sort((a, b) => String(a.userName).localeCompare(String(b.userName)))
    }
  },
  async mounted() {
    this.weekStart = this.getWeekStart(new Date())
    this.monthStart = this.getMonthStart(new Date())
    this.selectedDay = this.normalizeBusinessDate(new Date().toISOString())
    window.addEventListener('mousemove', this.handleResizeMove)
    window.addEventListener('mouseup', this.finishResize)
    await this.loadData()
  },
  watch: {
    selectedProjectId() {
      const selectedSprintId = String(this.selectedSprintId || '')
      if (!selectedSprintId || selectedSprintId === 'none') return
      const exists = this.filteredSprints.some(s => String(s.id) === selectedSprintId)
      if (!exists) {
        this.selectedSprintId = ''
      }
    },
    'quickCreateForm.projectId'(value) {
      const projectId = Number(value)
      if (!Number.isFinite(projectId) || projectId <= 0) {
        this.quickCreateForm.sprintId = null
        return
      }
      if (this.quickCreateForm.sprintId == null) return
      const exists = this.quickCreateSprints.some(s => Number(s.id) === Number(this.quickCreateForm.sprintId))
      if (!exists) {
        this.quickCreateForm.sprintId = null
      }
    }
  },
  unmounted() {
    window.removeEventListener('mousemove', this.handleResizeMove)
    window.removeEventListener('mouseup', this.finishResize)
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [users, projects, sprints, tickets, localTasks] = await Promise.all([
          db.getActiveUsers(),
          db.getAllProjects(),
          db.getAllSprints(),
          db.getAllTickets(),
          db.getAllLocalTasks()
        ])

        this.users = users
        this.projects = projects
        this.sprints = sprints
        this.tickets = tickets
        this.localTasks = localTasks
      } catch (error) {
        console.error('Erreur chargement Gantt utilisateurs:', error)
        alert(`❌ ${error.message || 'Erreur de chargement du Gantt utilisateurs'}`)
      } finally {
        this.loading = false
      }
    },
    mapItemToGantt(item, type, hoursPerDay, weekStart, weekEnd) {
      const startDate = item.startDate
        ? this.toDateOnlyString(item.startDate)
        : this.toDateOnlyString(item.createdAt || new Date().toISOString())

      const estimatedHours = Math.max(1, Number(item.estimatedTime || 1))
      const ganttDurationDays = Math.max(1, Math.ceil(estimatedHours / (hoursPerDay > 0 ? hoursPerDay : 8)))
      const endDate = this.addDaysToDateString(startDate, ganttDurationDays - 1)

      const project = this.projects.find(p => Number(p.id) === Number(item.projectId))
      const typeLabel = type === 'ticket' ? 'Ticket' : 'Tâche locale'
      const priorityColor = this.getPriorityColor(item.priority, type)

      return {
        ...item,
        type,
        typeLabel,
        projectName: project?.name || 'Projet inconnu',
        ganttStartDate: startDate,
        ganttEndDate: endDate,
        ganttDurationDays,
        hoursPerDay: Math.max(1, Number(hoursPerDay || 8)),
        estimatedTime: estimatedHours,
        priorityColor,
        overlapsWeek: !(endDate < weekStart || startDate > weekEnd),
        lane: 0
      }
    },
    passesSprintFilter(item) {
      const selectedSprintId = String(this.selectedSprintId || '')
      if (!selectedSprintId) return true

      if (selectedSprintId === 'none') {
        return !item.sprintId
      }

      return Number(item.sprintId) === Number(selectedSprintId)
    },
    assignLanes(items) {
      const laneEndDates = []

      for (const item of items) {
        let laneIndex = laneEndDates.findIndex(endDate => endDate < item.ganttStartDate)

        if (laneIndex === -1) {
          laneIndex = laneEndDates.length
          laneEndDates.push(item.ganttEndDate)
        } else {
          laneEndDates[laneIndex] = item.ganttEndDate
        }

        item.lane = laneIndex
      }
    },
    assignHourLanes(items) {
      const laneEndHours = []
      for (const item of items) {
        const startHour = Math.max(0, Number(item.dayStartHour || 0))
        const durationHours = Math.max(1, Number(item.estimatedTime || 1))
        const endHour = Math.min(24, startHour + durationHours)

        let laneIndex = laneEndHours.findIndex(laneEnd => laneEnd <= startHour)
        if (laneIndex === -1) {
          laneIndex = laneEndHours.length
          laneEndHours.push(endHour)
        } else {
          laneEndHours[laneIndex] = endHour
        }

        item.lane = laneIndex
      }
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => Number(u.id) === Number(userId))
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    getProjectName(projectId) {
      const project = this.projects.find(p => Number(p.id) === Number(projectId))
      return project?.name || 'Projet inconnu'
    },
    isWeekendDate(dateStr) {
      const date = new Date(dateStr)
      const day = date.getDay()
      return day === 0 || day === 6
    },
    normalizeBusinessDate(dateStr, direction = 1) {
      let normalized = this.toDateOnlyString(dateStr)
      while (normalized && this.isWeekendDate(normalized)) {
        normalized = this.addDaysToDateString(normalized, direction >= 0 ? 1 : -1)
      }
      return normalized
    },
    addBusinessDaysToDateString(dateStr, businessDaysToAdd) {
      let cursor = this.normalizeBusinessDate(dateStr)
      let remaining = Number(businessDaysToAdd || 0)
      while (remaining > 0) {
        cursor = this.addDaysToDateString(cursor, 1)
        if (!this.isWeekendDate(cursor)) {
          remaining -= 1
        }
      }
      return cursor
    },
    getBusinessDurationDays(hours, hoursPerDay) {
      return Math.max(1, Math.ceil(Number(hours || 1) / Math.max(1, Number(hoursPerDay || 8))))
    },
    getItemAssignments(item) {
      const storedAssignments = Array.isArray(item?.ganttAssignments) ? item.ganttAssignments : []
      const normalizedStored = storedAssignments
        .filter(assignment => assignment && assignment.assignedUserId && assignment.startDate)
        .map((assignment, index) => ({
          id: String(assignment.id || `${item.id}-${index}`),
          assignedUserId: Number(assignment.assignedUserId),
          startDate: this.normalizeBusinessDate(assignment.startDate),
          estimatedTime: Math.max(1, Number(assignment.estimatedTime || 1)),
          startHour: assignment.startHour != null ? Number(assignment.startHour) : null
        }))

      if (normalizedStored.length > 0) {
        return normalizedStored
      }

      if (item?.assignedUserId && item?.startDate && Number(item?.estimatedTime || 0) > 0) {
        return [{
          id: `legacy-${item.id}`,
          assignedUserId: Number(item.assignedUserId),
          startDate: this.normalizeBusinessDate(item.startDate),
          estimatedTime: Math.max(1, Number(item.estimatedTime || 1)),
          startHour: null
        }]
      }

      return []
    },
    buildBaseItemUpdatesFromAssignments(item, assignments) {
      const sortedAssignments = [...assignments].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
      const totalEstimatedTime = sortedAssignments.reduce((sum, assignment) => sum + Math.max(1, Number(assignment.estimatedTime || 1)), 0)
      const uniqueUsers = [...new Set(sortedAssignments.map(assignment => Number(assignment.assignedUserId)).filter(Boolean))]
      return {
        ganttAssignments: sortedAssignments,
        startDate: sortedAssignments[0]?.startDate || null,
        estimatedTime: totalEstimatedTime || null,
        assignedUserId: uniqueUsers.length === 1 ? uniqueUsers[0] : (sortedAssignments[0]?.assignedUserId || null)
      }
    },
    expandItemAssignments(item, type, hoursPerDay, rangeStart, rangeEnd) {
      return this.getItemAssignments(item).map((assignment, index) => {
        const ganttStartDate = this.normalizeBusinessDate(assignment.startDate)
        const estimatedHours = Math.max(1, Number(assignment.estimatedTime || 1))
        const ganttDurationDays = this.getBusinessDurationDays(estimatedHours, hoursPerDay)
        const ganttEndDate = this.addBusinessDaysToDateString(ganttStartDate, ganttDurationDays - 1)
        const project = this.projects.find(p => Number(p.id) === Number(item.projectId))
        const typeLabel = type === 'ticket' ? 'Ticket' : 'Tâche locale'
        const priorityColor = this.getPriorityColor(item.priority, type)
        return {
          ...item,
          type,
          typeLabel,
          projectName: project?.name || 'Projet inconnu',
          ganttStartDate,
          ganttEndDate,
          ganttDurationDays,
          hoursPerDay: Math.max(1, Number(hoursPerDay || 8)),
          estimatedTime: estimatedHours,
          totalEstimatedTime: Number(item.estimatedTime || estimatedHours),
          priorityColor,
          overlapsWeek: !(ganttEndDate < rangeStart || ganttStartDate > rangeEnd),
          lane: 0,
          assignmentId: assignment.id,
          assignmentIndex: index,
          assignedUserId: Number(assignment.assignedUserId),
          sourceStartHour: assignment.startHour ?? null,
          instanceKey: `${type}:${item.id}:${assignment.id}`
        }
      })
    },
    getRangeTimelineStyle(extra = {}) {
      const columnCount = Math.max(1, Number(this.timelineDays.length || 1))
      const ratio = 100 / columnCount
      return {
        ...extra,
        backgroundImage: `repeating-linear-gradient(to right, #fff, #fff calc(${ratio}% - 1px), #f1f3f5 calc(${ratio}% - 1px), #f1f3f5 ${ratio}%)`
      }
    },
    getStatusLabel(status) {
      if (!status) return 'Non défini'

      const normalized = String(status).toLowerCase()
      if (normalized === 'todo') return 'À faire'
      if (normalized === 'in-progress') return 'En cours'
      if (normalized === 'done') return 'Terminé'
      if (normalized === 'completed') return 'Terminé'
      if (normalized === 'closed') return 'Fermé'

      return status
    },
    getPriorityLabel(priority) {
      if (priority === 'high') return 'Haute'
      if (priority === 'medium') return 'Moyenne'
      return 'Basse'
    },
    getPriorityColor(priority, type) {
      if (priority === 'high') return '#dc3545'
      if (priority === 'medium') return '#fd7e14'
      if (type === 'localTask') return '#198754'
      return '#4DBA87'
    },
    isCompletedStatus(status) {
      if (!status) return false
      const normalized = String(status).toLowerCase()
      if (normalized === 'done' || normalized === 'completed' || normalized === 'closed') return true

      return (
        normalized.includes('termin') ||
        normalized.includes('done') ||
        normalized.includes('clos') ||
        normalized.includes('résolu') ||
        normalized.includes('resolu')
      )
    },
    toDateOnlyString(date) {
      if (!date) return ''
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return String(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    addDaysToDateString(dateStr, daysToAdd) {
      const source = this.toDateOnlyString(dateStr)
      const [y, m, d] = source.split('-').map(Number)
      const date = new Date(y, (m || 1) - 1, d || 1)
      date.setDate(date.getDate() + Number(daysToAdd || 0))
      return this.toDateOnlyString(date)
    },
    getWeekStart(dateInput) {
      const date = new Date(dateInput || new Date())
      const day = date.getDay() || 7
      if (day !== 1) {
        date.setDate(date.getDate() - (day - 1))
      }
      return this.toDateOnlyString(date)
    },
    getMonthStart(dateInput) {
      const date = new Date(dateInput || new Date())
      return this.toDateOnlyString(new Date(date.getFullYear(), date.getMonth(), 1))
    },
    getMonthEnd(dateInput) {
      const date = new Date(dateInput || new Date())
      return this.toDateOnlyString(new Date(date.getFullYear(), date.getMonth() + 1, 0))
    },
    prevWeek() {
      const base = this.weekStart || this.getWeekStart(new Date())
      this.weekStart = this.addDaysToDateString(base, -7)
    },
    nextWeek() {
      const base = this.weekStart || this.getWeekStart(new Date())
      this.weekStart = this.addDaysToDateString(base, 7)
    },
    prevMonth() {
      const base = new Date(this.monthStart || this.getMonthStart(new Date()))
      base.setMonth(base.getMonth() - 1)
      this.monthStart = this.getMonthStart(base)
    },
    nextMonth() {
      const base = new Date(this.monthStart || this.getMonthStart(new Date()))
      base.setMonth(base.getMonth() + 1)
      this.monthStart = this.getMonthStart(base)
    },
    prevDay() {
      const base = this.selectedDay || this.toDateOnlyString(new Date())
      this.selectedDay = this.normalizeBusinessDate(this.addDaysToDateString(base, -1), -1)
    },
    nextDay() {
      const base = this.selectedDay || this.toDateOnlyString(new Date())
      this.selectedDay = this.normalizeBusinessDate(this.addDaysToDateString(base, 1), 1)
    },
    buildQuickCreateDefaults() {
      const defaultProjectId = this.selectedProjectId ? Number(this.selectedProjectId) : Number(this.projects?.[0]?.id || null)
      const defaultUserId = Number(this.users?.[0]?.id || null)
      const selectedSprintNumeric = Number(this.selectedSprintId)
      return {
        type: 'ticket',
        projectId: Number.isFinite(defaultProjectId) && defaultProjectId > 0 ? defaultProjectId : null,
        title: '',
        description: '',
        priority: 'medium',
        assignedUserId: Number.isFinite(defaultUserId) && defaultUserId > 0 ? defaultUserId : null,
        startDate: this.viewMode === 'day'
          ? (this.selectedDay || this.normalizeBusinessDate(new Date().toISOString()))
          : (this.viewMode === 'month'
            ? (this.normalizeBusinessDate(this.monthStart || this.getMonthStart(new Date())))
            : (this.normalizeBusinessDate(this.weekStart || this.getWeekStart(new Date())))),
        startHour: 9,
        estimatedTime: 8,
        sprintId: Number.isFinite(selectedSprintNumeric) && selectedSprintNumeric > 0 ? selectedSprintNumeric : null
      }
    },
    formatTimelineDayLabel(day) {
      if (this.viewMode === 'month') {
        const date = new Date(day)
        return String(date.getDate()).padStart(2, '0')
      }
      return day.slice(5)
    },
    openQuickCreateModal() {
      this.quickCreateForm = this.buildQuickCreateDefaults()
      this.showQuickCreateModal = true
    },
    closeQuickCreateModal() {
      this.showQuickCreateModal = false
      this.savingQuickCreate = false
    },
    async saveQuickCreateItem() {
      const payload = {
        ...this.quickCreateForm,
        projectId: Number(this.quickCreateForm.projectId),
        assignedUserId: Number(this.quickCreateForm.assignedUserId),
        estimatedTime: Number(this.quickCreateForm.estimatedTime),
        sprintId: this.quickCreateForm.sprintId != null ? Number(this.quickCreateForm.sprintId) : null,
        startDate: this.toDateOnlyString(this.quickCreateForm.startDate)
      }

      if (!payload.projectId || !payload.assignedUserId || !payload.title || !payload.startDate || payload.estimatedTime <= 0) {
        alert('Merci de renseigner les champs obligatoires (projet, titre, assigné, date, estimation).')
        return
      }

      this.savingQuickCreate = true
      try {
        if (payload.type === 'ticket') {
          await db.addTicket({
            projectId: payload.projectId,
            title: payload.title,
            description: payload.description || '',
            status: 'todo',
            priority: payload.priority || 'medium',
            assignedUserId: payload.assignedUserId,
            startDate: payload.startDate,
            estimatedTime: payload.estimatedTime,
            sprintId: payload.sprintId
          })
        } else {
          await db.addLocalTask({
            projectId: payload.projectId,
            title: payload.title,
            description: payload.description || '',
            status: 'todo',
            priority: payload.priority || 'medium',
            assignedUserId: payload.assignedUserId,
            startDate: payload.startDate,
            estimatedTime: payload.estimatedTime,
            sprintId: payload.sprintId
          })
        }

        await this.loadData()

        const createdType = payload.type === 'ticket' ? 'ticket' : 'localTask'
        const createdCollection = createdType === 'ticket' ? this.tickets : this.localTasks
        const createdItem = [...createdCollection]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]

        if (createdItem?.id) {
          const startHour = Math.max(0, Math.min(23, Number(this.quickCreateForm.startHour || 9)))
          this.setItemStartHourForDay({ type: createdType, id: Number(createdItem.id) }, payload.startDate, startHour)
        }

        this.closeQuickCreateModal()
      } catch (error) {
        console.error('Erreur création rapide Gantt:', error)
        alert(`❌ ${error.message || 'Impossible de créer l\'élément'}`)
      } finally {
        this.savingQuickCreate = false
      }
    },
    formatHourLabel(hour) {
      return `${String(hour).padStart(2, '0')}h`
    },
    getGanttRowHeight(row) {
      const maxLane = Math.max(0, ...row.items.map(item => Number(item.lane || 0)))
      return Math.max(48, (maxLane + 1) * 26 + 12)
    },
    getDayGanttRowHeight(row) {
      const maxLane = Math.max(0, ...row.items.map(item => Number(item.lane || 0)))
      return Math.max(56, (maxLane + 1) * 26 + 14)
    },
    getItemStorageKey(item, day) {
      const assignmentKey = item.assignmentId || 'default'
      return `user-gantt-hour:${item.type}:${item.id}:${assignmentKey}:${day}`
    },
    getItemStartHourForDay(item, day) {
      try {
        const key = this.getItemStorageKey(item, day)
        const raw = localStorage.getItem(key)
        if (raw == null) {
          if (item?.sourceStartHour != null) {
            return Math.max(0, Math.min(23, Math.floor(Number(item.sourceStartHour))))
          }
          return 9
        }
        const value = Number(raw)
        if (!Number.isFinite(value)) return 9
        return Math.max(0, Math.min(23, Math.floor(value)))
      } catch {
        return 9
      }
    },
    setItemStartHourForDay(item, day, hour) {
      const safeHour = Math.max(0, Math.min(23, Math.floor(Number(hour || 0))))
      try {
        localStorage.setItem(this.getItemStorageKey(item, day), String(safeHour))
      } catch {
        // no-op
      }
      return safeHour
    },
    getDayGanttBarStyle(item) {
      const total = 24
      const startHour = Math.max(0, Math.min(23, Number(item.dayStartHour || 0)))
      const durationHours = this.getEffectiveDurationHours(item)
      const leftPct = (startHour / total) * 100
      const widthPct = (durationHours / total) * 100
      const lane = Number(item.lane || 0)

      return {
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 1.5)}%`,
        top: `${8 + (lane * 26)}px`,
        background: item.priorityColor,
        opacity: this.dragState.item && this.dragState.item.id === item.id && this.dragState.item.type === item.type ? 0.65 : 1
      }
    },
    getEffectiveDurationHours(item) {
      const isResizingCurrent =
        this.resizeState.active &&
        this.resizeState.mode === 'day' &&
        Number(this.resizeState.itemId) === Number(item.id) &&
        this.resizeState.itemType === item.type &&
        String(this.resizeState.assignmentId || '') === String(item.assignmentId || '')

      if (!isResizingCurrent) {
        return Math.max(1, Number(item.estimatedTime || 1))
      }

      return Math.max(1, Number(this.resizeState.previewHours || item.estimatedTime || 1))
    },
    getGanttBarStyle(item) {
      if (!item?.ganttStartDate || !this.timelineDays.length) return {}

      const total = this.timelineDays.length
      const rangeStart = this.timelineDays[0]
      const rangeEnd = this.timelineDays[total - 1]
      const effectiveEndDate = this.getEffectiveEndDate(item)
      const clippedStart = item.ganttStartDate < rangeStart ? rangeStart : item.ganttStartDate
      const clippedEnd = effectiveEndDate > rangeEnd ? rangeEnd : effectiveEndDate

      const startIndex = this.timelineDays.findIndex(day => day === clippedStart)
      const endIndex = this.timelineDays.findIndex(day => day === clippedEnd)
      if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return {}

      const duration = (endIndex - startIndex) + 1
      const leftPct = (startIndex / total) * 100
      const widthPct = (duration / total) * 100
      const lane = Number(item.lane || 0)

      return {
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 2)}%`,
        top: `${8 + (lane * 26)}px`,
        background: item.priorityColor,
        opacity: this.dragState.item && this.dragState.item.id === item.id && this.dragState.item.type === item.type ? 0.65 : 1
      }
    },
    getEffectiveEndDate(item) {
      const isResizingCurrent =
        this.resizeState.active &&
        Number(this.resizeState.itemId) === Number(item.id) &&
        this.resizeState.itemType === item.type &&
        String(this.resizeState.assignmentId || '') === String(item.assignmentId || '')

      if (!isResizingCurrent) {
        return item.ganttEndDate
      }

      const previewDays = Math.max(1, Number(this.resizeState.previewDays || item.ganttDurationDays || 1))
      return this.addBusinessDaysToDateString(item.ganttStartDate, previewDays - 1)
    },
    formatItemDuration(item) {
      const hoursPerDay = Math.max(1, Number(item?.hoursPerDay || 8))
      const hours = Math.max(1, Number(item?.estimatedTime || 1))
      const days = Number((hours / hoursPerDay).toFixed(2))
      return `${days}j (${hours}h)`
    },
    formatItemDurationShort(item) {
      const hoursPerDay = Math.max(1, Number(item?.hoursPerDay || 8))
      const hours = Math.max(1, Number(item?.estimatedTime || 1))
      const days = Number((hours / hoursPerDay).toFixed(1))
      return `${days}j`
    },
    startResize(item, event) {
      if (!item || this.dragState.item || this.dragState.moving) return

      const timelineEl = event?.target?.closest('.gantt-timeline-col')
      if (!timelineEl) return

      const timelineRect = timelineEl.getBoundingClientRect()
      const isDayMode = this.viewMode === 'day'
      const startIndex = isDayMode
        ? Math.max(0, Math.min(23, Number(item.dayStartHour ?? this.getItemStartHourForDay(item, this.selectedDay))))
        : this.timelineDays.findIndex(day => day === item.ganttStartDate)
      if (startIndex < 0) return

      this.resizeState.active = true
      this.resizeState.mode = isDayMode ? 'day' : 'range'
      this.resizeState.itemId = Number(item.id)
      this.resizeState.assignmentId = item.assignmentId || null
      this.resizeState.itemType = item.type
      this.resizeState.timelineRect = timelineRect
      this.resizeState.startIndex = startIndex
      this.resizeState.hoursPerDay = Math.max(1, Number(item.hoursPerDay || 8))
      this.resizeState.previewDays = Math.max(1, Number(item.ganttDurationDays || 1))
      this.resizeState.previewHours = Math.max(1, Number(item.estimatedTime || 1))
      document.body.classList.add('gantt-resizing')
    },
    handleResizeMove(event) {
      if (!this.resizeState.active || !this.resizeState.timelineRect) return

      const rect = this.resizeState.timelineRect
      const isDayMode = this.resizeState.mode === 'day'
      const totalUnits = isDayMode ? 24 : this.timelineDays.length
      const unitWidth = rect.width / totalUnits
      const rawIndex = Math.floor((event.clientX - rect.left) / unitWidth)
      const clampedIndex = Math.max(this.resizeState.startIndex, Math.min(totalUnits - 1, rawIndex))
      const previewUnits = (clampedIndex - this.resizeState.startIndex) + 1

      if (isDayMode) {
        this.resizeState.previewHours = Math.max(1, previewUnits)
      } else {
        this.resizeState.previewDays = Math.max(1, previewUnits)
      }
    },
    async finishResize() {
      if (!this.resizeState.active) return

      const resizedItem = this.ganttItems.find(item =>
        Number(item.id) === Number(this.resizeState.itemId) &&
        item.type === this.resizeState.itemType &&
        String(item.assignmentId || '') === String(this.resizeState.assignmentId || '')
      )

      const isDayMode = this.resizeState.mode === 'day'
      const previewDays = Math.max(1, Number(this.resizeState.previewDays || 1))
      const previewHours = Math.max(1, Number(this.resizeState.previewHours || 1))
      const nextEstimatedHours = isDayMode
        ? previewHours
        : previewDays * Math.max(1, Number(this.resizeState.hoursPerDay || 8))

      try {
        if (resizedItem && Number(nextEstimatedHours) !== Number(resizedItem.estimatedTime || 1)) {
          if (resizedItem.assignmentId) {
            await this.updateAssignment(resizedItem, resizedItem.assignmentId, { estimatedTime: nextEstimatedHours })
          } else {
            await this.replaceWithSingleAssignment(resizedItem, {
              id: `assignment-${Date.now()}`,
              assignedUserId: Number(resizedItem.assignedUserId),
              startDate: this.normalizeBusinessDate(resizedItem.ganttStartDate || resizedItem.startDate),
              estimatedTime: nextEstimatedHours,
              startHour: resizedItem.sourceStartHour ?? null
            })
          }
        }
      } catch (error) {
        console.error('Erreur redimensionnement Gantt:', error)
        alert(`❌ ${error.message || 'Impossible de modifier la durée'}`)
      } finally {
        this.resizeState.active = false
        this.resizeState.mode = 'range'
        this.resizeState.itemId = null
        this.resizeState.assignmentId = null
        this.resizeState.itemType = ''
        this.resizeState.timelineRect = null
        this.resizeState.startIndex = 0
        this.resizeState.hoursPerDay = 8
        this.resizeState.previewDays = 1
        this.resizeState.previewHours = 1
        document.body.classList.remove('gantt-resizing')
      }
    },
    onDragStart(item, event) {
      if (this.resizeState.active) return
      this.dragState.item = item
      this.dragState.overDay = ''
      this.dragState.overHour = null
      this.dragState.overUserId = null

      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.dropEffect = 'move'
        event.dataTransfer.setData('text/plain', `${item.type}:${item.id}`)
      }
    },
    onDragEnd() {
      this.dragState.item = null
      this.dragState.overDay = ''
      this.dragState.overHour = null
      this.dragState.overUserId = null
    },
    onDragOverDay(userId, day) {
      if (!this.dragState.item || this.dragState.moving) return
      this.dragState.overUserId = userId
      this.dragState.overDay = day
    },
    onDragLeaveDay(userId, day) {
      if (this.dragState.overUserId === userId && this.dragState.overDay === day) {
        this.dragState.overUserId = null
        this.dragState.overDay = ''
      }
    },
    onDragOverHour(userId, hour) {
      if (!this.dragState.item || this.dragState.moving) return
      this.dragState.overUserId = userId
      this.dragState.overHour = Number(hour)
    },
    onDragLeaveHour(userId, hour) {
      if (this.dragState.overUserId === userId && Number(this.dragState.overHour) === Number(hour)) {
        this.dragState.overUserId = null
        this.dragState.overHour = null
      }
    },
    async onDropToDay(row, day) {
      const item = this.dragState.item || this.pendingPlanItem
      if (!item || this.dragState.moving) return

      const newStartDate = this.toDateOnlyString(day)
      const currentStartDate = this.toDateOnlyString(item.ganttStartDate)
      if (!newStartDate) {
        this.onDragEnd()
        return
      }

      this.dragState.moving = true
      try {
        await this.applyPlanOrMove(item, row, newStartDate, null, currentStartDate !== newStartDate)
      } catch (error) {
        console.error('Erreur déplacement Gantt:', error)
        alert(`❌ ${error.message || 'Impossible de déplacer cet élément'}`)
      } finally {
        this.dragState.moving = false
        this.pendingPlanItem = null
        this.onDragEnd()
      }
    },
    async onDropToHour(row, hour) {
      const item = this.dragState.item || this.pendingPlanItem
      if (!item || this.dragState.moving) return

      const targetHour = Math.max(0, Math.min(23, Number(hour || 0)))
      const targetDay = this.selectedDay || this.toDateOnlyString(new Date())

      this.dragState.moving = true
      try {
        const currentStartDate = this.toDateOnlyString(item.ganttStartDate)
        const plannedItem = await this.applyPlanOrMove(item, row, targetDay, targetHour, currentStartDate !== targetDay)
        this.setItemStartHourForDay(plannedItem || item, targetDay, targetHour)
      } catch (error) {
        console.error('Erreur déplacement horaire Gantt:', error)
        alert(`❌ ${error.message || 'Impossible de déplacer cet élément sur les heures'}`)
      } finally {
        this.dragState.moving = false
        this.pendingPlanItem = null
        this.onDragEnd()
      }
    },
    async applyPlanOrMove(item, row, startDate, hour = null, dateChanged = false) {
      const normalized = this.normalizeItemForPlanning(item)
      if (!normalized) return

      const currentAssigned = Number(item.assignedUserId || normalized.assignedUserId || 0)
      const targetAssigned = Number(row.userId)
      const needsAssign = currentAssigned !== targetAssigned
      const normalizedStartDate = this.normalizeBusinessDate(startDate)
      const assignmentId = item.assignmentId || null
      const isDuplicateAssignment = Boolean(
        (this.pendingPlanItem && this.pendingPlanItem.planMode === 'duplicate') ||
        (this.dragState.item && this.dragState.item.planMode === 'duplicate')
      )

      const currentEstimated = Number(item.estimatedTime || normalized.estimatedTime || 0)
      const needsEstimatePrompt = !currentEstimated || !!this.pendingPlanItem
      const estimatedTime = needsEstimatePrompt
        ? this.promptEstimatedHours(currentEstimated > 0 ? currentEstimated : 8)
        : currentEstimated

      if (!estimatedTime || Number(estimatedTime) <= 0) {
        throw new Error('Estimation invalide')
      }

      const assignmentPayload = {
        id: assignmentId || this.buildAssignmentId(normalized),
        assignedUserId: targetAssigned,
        startDate: normalizedStartDate,
        estimatedTime,
        startHour: hour != null ? Math.max(0, Math.min(23, Number(hour))) : (item.sourceStartHour ?? null)
      }

      let savedAssignment = assignmentPayload
      if (isDuplicateAssignment) {
        savedAssignment = await this.appendAssignment(normalized, {
          ...assignmentPayload,
          id: this.buildAssignmentId(normalized)
        })
      } else if (assignmentId) {
        savedAssignment = await this.updateAssignment(normalized, assignmentId, assignmentPayload)
      } else {
        savedAssignment = await this.replaceWithSingleAssignment(normalized, assignmentPayload)
      }

      if (needsAssign || dateChanged || needsEstimatePrompt) {
        const typeLabel = normalized.type === 'ticket' ? 'Ticket' : 'Tâche locale'
        alert(`✅ ${typeLabel} planifié(e)\n• Assigné à: ${this.getUserDisplayName(targetAssigned)}\n• Début: ${normalizedStartDate}${hour != null ? ` ${String(hour).padStart(2, '0')}h` : ''}\n• Estimation: ${estimatedTime}h`)
      }

      return {
        ...normalized,
        assignmentId: savedAssignment.id,
        assignedUserId: savedAssignment.assignedUserId,
        ganttStartDate: savedAssignment.startDate,
        sourceStartHour: savedAssignment.startHour ?? null,
        estimatedTime: savedAssignment.estimatedTime
      }
    },
    normalizeItemForPlanning(item) {
      if (!item) return null
      if (item.type) return item

      const id = Number(item.id)
      if (!Number.isFinite(id) || id <= 0) return null

      const ticket = this.tickets.find(t => Number(t.id) === id)
      if (ticket) return { ...ticket, type: 'ticket' }

      const task = this.localTasks.find(t => Number(t.id) === id)
      if (task) return { ...task, type: 'localTask' }

      return null
    },
    buildAssignmentId(item) {
      return `assignment-${item.type || 'item'}-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    },
    async updateBaseItem(item, updates) {
      if (item.type === 'ticket') {
        await db.updateTicket(Number(item.id), updates)
        const idx = this.tickets.findIndex(t => Number(t.id) === Number(item.id))
        if (idx !== -1) {
          this.tickets[idx] = {
            ...this.tickets[idx],
            ...updates
          }
        }
      } else {
        await db.updateLocalTask(Number(item.id), updates)
        const idx = this.localTasks.findIndex(t => Number(t.id) === Number(item.id))
        if (idx !== -1) {
          this.localTasks[idx] = {
            ...this.localTasks[idx],
            ...updates
          }
        }
      }
    },
    async replaceWithSingleAssignment(item, assignment) {
      const updates = this.buildBaseItemUpdatesFromAssignments(item, [assignment])
      await this.updateBaseItem(item, updates)
      return assignment
    },
    async appendAssignment(item, assignment) {
      const updates = this.buildBaseItemUpdatesFromAssignments(item, [...this.getItemAssignments(item), assignment])
      await this.updateBaseItem(item, updates)
      return assignment
    },
    async updateAssignment(item, assignmentId, assignmentUpdates) {
      const assignments = this.getItemAssignments(item)
      const existingIndex = assignments.findIndex(assignment => String(assignment.id) === String(assignmentId))

      if (existingIndex === -1) {
        const fallbackAssignment = {
          id: assignmentId || this.buildAssignmentId(item),
          assignedUserId: Number(assignmentUpdates.assignedUserId || item.assignedUserId),
          startDate: this.normalizeBusinessDate(assignmentUpdates.startDate || item.ganttStartDate || item.startDate),
          estimatedTime: Math.max(1, Number(assignmentUpdates.estimatedTime || item.estimatedTime || 1)),
          startHour: assignmentUpdates.startHour != null ? Number(assignmentUpdates.startHour) : (item.sourceStartHour ?? null)
        }
        return this.replaceWithSingleAssignment(item, fallbackAssignment)
      }

      const nextAssignments = assignments.map((assignment, index) => {
        if (index !== existingIndex) return assignment
        return {
          ...assignment,
          ...assignmentUpdates,
          id: assignment.id,
          assignedUserId: Number(assignmentUpdates.assignedUserId || assignment.assignedUserId),
          startDate: this.normalizeBusinessDate(assignmentUpdates.startDate || assignment.startDate),
          estimatedTime: Math.max(1, Number(assignmentUpdates.estimatedTime || assignment.estimatedTime || 1)),
          startHour: assignmentUpdates.startHour != null
            ? Number(assignmentUpdates.startHour)
            : (assignment.startHour ?? null)
        }
      })

      const updates = this.buildBaseItemUpdatesFromAssignments(item, nextAssignments)
      await this.updateBaseItem(item, updates)
      return nextAssignments[existingIndex]
    },
    promptEstimatedHours(defaultValue = 8) {
      const raw = window.prompt('Estimation de temps (heures):', String(defaultValue))
      if (raw == null) return null
      const value = Number(raw)
      if (!Number.isFinite(value) || value <= 0) return null
      return Math.round(value * 100) / 100
    },
    onDropCellClick(row, day) {
      if (!this.pendingPlanItem) return
      this.onDropToDay(row, day)
    },
    onDropHourCellClick(row, hour) {
      if (!this.pendingPlanItem) return
      this.onDropToHour(row, hour)
    },
    onBacklogDragStart(item, event) {
      this.dragState.item = {
        ...item,
        planMode: item.planMode || 'new',
        duplicateAssignment: !!item.duplicateAssignment
      }
      this.dragState.overDay = ''
      this.dragState.overHour = null
      this.dragState.overUserId = null
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
      }
    },
    onBacklogDragEnd() {
      this.onDragEnd()
    },
    startPlanItem(item) {
      this.pendingPlanItem = {
        ...item,
        planMode: item.planMode || 'new',
        duplicateAssignment: !!item.duplicateAssignment
      }
    },
    cancelPendingPlan() {
      this.pendingPlanItem = null
    },
    prepareDuplicateAssignment() {
      if (!this.selectedItem) return
      this.pendingPlanItem = {
        ...this.selectedItem,
        planMode: 'duplicate'
      }
      this.closeItemPopup()
    },
    async unassignSelectedItem() {
      const selectedItem = this.selectedItem
      if (!selectedItem?.id || !selectedItem?.type) return

      const item = this.normalizeItemForPlanning(selectedItem)
      if (!item?.id || !item?.type) return

      const confirmed = window.confirm('Désassigner cet élément ?')
      if (!confirmed) return

      try {
        if (selectedItem.assignmentId) {
          const remainingAssignments = this.getItemAssignments(item)
            .filter(assignment => String(assignment.id) !== String(selectedItem.assignmentId))

          if (remainingAssignments.length > 0) {
            const updates = this.buildBaseItemUpdatesFromAssignments(item, remainingAssignments)
            await this.updateBaseItem(item, updates)
          } else {
            await this.updateBaseItem(item, {
              assignedUserId: null,
              startDate: null,
              estimatedTime: null,
              ganttAssignments: []
            })
          }
        } else {
          await this.updateBaseItem(item, {
            assignedUserId: null,
            startDate: null,
            estimatedTime: null,
            ganttAssignments: []
          })
        }

        this.closeItemPopup()
      } catch (error) {
        console.error('Erreur désassignation:', error)
        alert(`❌ ${error.message || 'Impossible de désassigner cet élément'}`)
      }
    },
    openItemPopup(item) {
      this.selectedItem = item
      this.showItemModal = true
    },
    closeItemPopup() {
      this.showItemModal = false
      this.selectedItem = null
    },
    openTicketFromPopup(ticketId) {
      this.closeItemPopup()
      this.$router.push(`/tickets/${ticketId}`)
    },
    openProjectFromPopup(projectId) {
      this.closeItemPopup()
      this.$router.push(`/projects/${projectId}`)
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.toolbar-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.planning-backlog {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fafbfc;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
}

.planning-backlog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.planning-backlog-list {
  display: grid;
  gap: 0.45rem;
  max-height: 220px;
  overflow-y: auto;
}

.planning-backlog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
}

.planning-backlog-item-assigned {
  border-color: #f0ad4e;
  background: linear-gradient(90deg, rgba(240, 173, 78, 0.12), rgba(255, 255, 255, 0.96));
  box-shadow: inset 3px 0 0 #f0ad4e;
}

.planning-backlog-main {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.planning-backlog-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.planning-backlog-pending {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px dashed #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.date-input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}

.gantt-wrapper {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.empty-grid-hint {
  padding: 0.75rem 1rem;
  color: #6b7280;
  font-size: 0.9rem;
  border-bottom: 1px solid #eef0f2;
  background: #fcfcfd;
}

.gantt-header,
.gantt-row {
  display: grid;
  grid-template-columns: 240px 1fr;
}

.gantt-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
}

.gantt-user-col {
  border-right: 1px solid #e5e7eb;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.gantt-timeline-col {
  position: relative;
  min-height: 52px;
  background:
    repeating-linear-gradient(
      to right,
      #fff,
      #fff calc(14.2857% - 1px),
      #f1f3f5 calc(14.2857% - 1px),
      #f1f3f5 14.2857%
    );
}

.gantt-drop-grid {
  position: absolute;
  inset: 0;
  display: grid;
  z-index: 1;
}

.gantt-drop-cell {
  border-right: 1px dashed transparent;
  transition: background-color 0.15s ease;
}

.gantt-drop-cell:last-child {
  border-right: none;
}

.gantt-drop-cell.drop-active {
  background: rgba(77, 186, 135, 0.18);
}

.gantt-days-grid {
  display: grid;
}

.gantt-day-label {
  text-align: center;
  font-size: 0.85rem;
  color: #666;
  padding: 0.6rem 0;
  border-right: 1px solid #e5e7eb;
}

.hour-label {
  font-size: 0.74rem;
  padding: 0.45rem 0;
}

.gantt-day-label:last-child {
  border-right: none;
}

.gantt-row {
  border-bottom: 1px solid #eef0f2;
}

.day-gantt-wrapper .day-timeline-col {
  background:
    repeating-linear-gradient(
      to right,
      #fff,
      #fff calc(4.1666% - 1px),
      #f1f3f5 calc(4.1666% - 1px),
      #f1f3f5 4.1666%
    );
}

.gantt-row:last-child {
  border-bottom: none;
}

.gantt-task-title {
  font-weight: 600;
}

.gantt-bar {
  position: absolute;
  height: 18px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease;
  display: flex;
  align-items: center;
  padding: 0 0.45rem;
  overflow: hidden;
  z-index: 2;
}

.gantt-resize-handle {
  margin-left: auto;
  width: 8px;
  min-width: 8px;
  height: 100%;
  border-left: 2px solid rgba(255, 255, 255, 0.9);
  cursor: ew-resize;
}

:global(body.gantt-resizing) {
  cursor: ew-resize !important;
  user-select: none;
}

.gantt-bar:hover {
  transform: scaleY(1.05);
}

.gantt-bar.clickable {
  cursor: pointer;
}

.bar-ticket {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.bar-task {
  border: 1px dashed rgba(255, 255, 255, 0.6);
}

.bar-text {
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.item-modal-content {
  background: #fff;
  width: min(760px, 95vw);
  max-height: 90vh;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.item-modal-header {
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.item-modal-body {
  padding: 1rem 1.2rem;
  overflow-y: auto;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(200px, 1fr));
  gap: 0.5rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.92rem;
}

.item-description {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.item-modal-footer {
  padding: 1rem 1.2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 900px) {
  .gantt-header,
  .gantt-row {
    grid-template-columns: 180px 1fr;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
