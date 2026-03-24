<template>
  <div>
    <div v-if="!project" class="card">
      <p>Chargement...</p>
    </div>

    <div v-else>
      <div class="page-header">
        <div>
          <button @click="$router.push('/projects')" class="btn btn-secondary">← Retour</button>
          <div style="display: flex; align-items: center; gap: 1rem; margin-top: 1rem;">
            <h2 style="margin: 0;">{{ project.name }}</h2>
            <button @click="toggleFavorite" class="btn-favorite" :class="{ active: project.isFavorite }" title="Ajouter aux favoris">
              {{ project.isFavorite ? '⭐' : '☆' }}
            </button>
          </div>
          <span class="badge" :class="getStatusClass(project.status)">{{ getStatusLabel(project.status) }}</span>
        </div>
      </div>

      <div class="card">
        <h3>Détails du projet</h3>
        <div v-if="project.description" v-html="project.description"></div>
        <p v-else style="color: #999;">Aucune description</p>
        
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button @click="$router.push(`/projects/${project.id}/sprints`)" class="btn btn-primary">🏃 Gérer les Sprints</button>
          <button @click="showKanbanEditor = !showKanbanEditor" class="btn btn-secondary">
            📊 {{ showKanbanEditor ? 'Masquer' : 'Configurer' }} le Kanban
          </button>
          <button @click="showChiffrageConfig = !showChiffrageConfig" class="btn btn-secondary">
            💰 {{ showChiffrageConfig ? 'Masquer' : 'Configurer' }} le Chiffrage
          </button>
          <button v-if="project.chiffrageEnabled" @click="exportChiffrage" class="btn btn-primary">
            📊 Exporter le Chiffrage
          </button>
        </div>

        <div style="margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px;">
          <label style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" v-model="project.useDefaultKanbanTemplate" style="width:auto;" />
            Utiliser le modèle d'étapes Kanban par défaut
          </label>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.6rem;">
            <button class="btn btn-secondary btn-sm" @click="saveDefaultKanbanTemplatePreference">💾 Enregistrer la préférence</button>
            <button class="btn btn-primary btn-sm" @click="applyDefaultKanbanTemplateNow">📊 Appliquer maintenant</button>
          </div>
        </div>

        <!-- Configuration du Chiffrage -->
        <div v-if="showChiffrageConfig" style="margin-top: 1.5rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
          <h4>💰 Configuration du Chiffrage</h4>
          <p style="color: #666; margin-bottom: 1rem;">
            Activez le chiffrage pour ce projet afin de suivre les estimations et coûts des tâches.
          </p>
          
          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" v-model="chiffrageConfig.enabled" />
              <strong>Activer le chiffrage sur ce projet</strong>
            </label>
          </div>

          <div v-if="chiffrageConfig.enabled" class="form-group">
            <label>Taux Journalier Moyen (TJM) en €</label>
            <input v-model.number="chiffrageConfig.tjm" type="number" min="0" step="50" placeholder="Ex: 500" />
            <small style="color: #666; display: block; margin-top: 0.25rem;">
              Ce TJM sera utilisé pour calculer automatiquement les coûts estimés des tâches.
            </small>
          </div>

          <div v-if="chiffrageConfig.enabled" class="form-group">
            <label>Heures par jour</label>
            <input v-model.number="chiffrageConfig.hoursPerDay" type="number" min="1" max="24" step="0.5" placeholder="Ex: 8" />
            <small style="color: #666; display: block; margin-top: 0.25rem;">
              Nombre d'heures de travail par jour (utilisé pour convertir les heures en jours).
            </small>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button @click="saveChiffrageConfig" class="btn btn-primary">💾 Enregistrer</button>
            <button @click="showChiffrageConfig = false" class="btn btn-secondary">Annuler</button>
          </div>
        </div>

        <!-- Éditeur de colonnes Kanban -->
        <div v-if="showKanbanEditor" style="margin-top: 1.5rem;">
          <KanbanColumnsEditor 
            ref="kanbanEditor"
            :projectId="project.id"
            :columns="effectiveColumns" 
            @update="updateKanbanColumns"
            @saved="onKanbanSaved"
          />
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <button @click="saveKanbanColumns" class="btn btn-primary">💾 Enregistrer</button>
            <button @click="showKanbanEditor = false" class="btn btn-secondary">Annuler</button>
          </div>
        </div>
      </div>

      <!-- Section tickets -->
      <div class="card">
        <div class="view-toggle" style="margin-bottom: 1rem;">
          <button
            @click="projectContentView = 'tickets'"
            :class="['btn', projectContentView === 'tickets' ? 'btn-primary' : 'btn-secondary']"
          >
            🎫 Tickets
          </button>
          <button
            @click="projectContentView = 'odooTasks'"
            :class="['btn', projectContentView === 'odooTasks' ? 'btn-primary' : 'btn-secondary']"
          >
            🧩 Tâches Odoo
          </button>
          <button
            @click="projectContentView = 'localTasks'"
            :class="['btn', projectContentView === 'localTasks' ? 'btn-primary' : 'btn-secondary']"
          >
            ✅ Tâches Locales
          </button>
          <button
            @click="projectContentView = 'gantt'"
            :class="['btn', projectContentView === 'gantt' ? 'btn-primary' : 'btn-secondary']"
          >
            🗓️ Gantt
          </button>
          <button
            @click="projectContentView = 'attachments'"
            :class="['btn', projectContentView === 'attachments' ? 'btn-primary' : 'btn-secondary']"
          >
            📎 Pièces jointes
          </button>
        </div>

        <template v-if="projectContentView === 'tickets'">
        <div class="section-header">
          <h3>Tickets du projet</h3>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button
              v-if="project?.odooId && odooConfigured"
              @click="syncTicketStatusesForProject"
              class="btn btn-secondary btn-sm"
              :disabled="syncingTicketStatuses"
            >
              {{ syncingTicketStatuses ? '⏳ Sync états...' : '🔄 Sync états tickets (projet)' }}
            </button>
            <div class="inline-toggle">
              <button
                @click="ticketDisplayMode = 'kanban'"
                :class="['btn', 'btn-sm', ticketDisplayMode === 'kanban' ? 'btn-primary' : 'btn-secondary']"
              >
                📊 Kanban
              </button>
              <button
                @click="ticketDisplayMode = 'list'"
                :class="['btn', 'btn-sm', ticketDisplayMode === 'list' ? 'btn-primary' : 'btn-secondary']"
              >
                📄 Liste
              </button>
            </div>
            <label style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.875rem;">
              <input type="checkbox" v-model="showCompletedTickets" style="width: auto;" />
              <span>Afficher terminés</span>
            </label>
            <template v-if="ticketDisplayMode === 'list' && ticketSelectMode && selectedTicketIds.length > 0">
              <select v-model="bulkTicketStatus" style="padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
                <option value="">Changer statut...</option>
                <option v-for="col in effectiveColumns" :key="col.id" :value="col.id">{{ col.label }}</option>
              </select>
              <button @click="applyBulkTicketStatus" :disabled="!bulkTicketStatus" class="btn btn-primary btn-sm">✓ Statut</button>
              <select v-model="bulkTicketPriority" style="padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
                <option value="">Changer priorité...</option>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
              <button @click="applyBulkTicketPriority" :disabled="!bulkTicketPriority" class="btn btn-primary btn-sm">✓ Priorité</button>
            </template>
            <button v-if="ticketDisplayMode === 'list' && ticketSelectMode" @click="selectAllTickets" class="btn btn-secondary btn-sm">{{ allTicketsSelected ? '☐ Tout désélectionner' : '☑️ Tout sélectionner' }}</button>
            <button v-if="ticketDisplayMode === 'list' && filteredTickets.length > 0" @click="toggleTicketSelectMode" class="btn btn-secondary btn-sm">{{ ticketSelectMode ? '✖ Fermer sélection' : '☑️ Sélection multiple' }}</button>
            <button @click="openTicketForm" class="btn btn-primary">+ Nouveau ticket</button>
          </div>
        </div>

        <div v-if="currentSprint" class="sprint-info-banner">
          🏃 Sprint en cours : <strong>{{ currentSprint.name }}</strong>
        </div>

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

        <small v-if="searchQuery" style="color: #666; margin-bottom: 1rem; display: block;">
          {{ filteredTickets.length }} résultat(s) trouvé(s)
        </small>

        <div v-if="ticketStatusSyncMessage" class="alert-inline" :class="ticketStatusSyncMessage.type === 'error' ? 'alert-error' : ''">
          {{ ticketStatusSyncMessage.message }}
        </div>

        <!-- Formulaire de création de ticket -->
        <div v-if="showTicketForm" style="margin-top: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 4px;">
          <form @submit.prevent="saveTicket">
            <div class="form-group">
              <label>Titre *</label>
              <input v-model="ticketForm.title" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <RichTextEditor v-model="ticketForm.description" placeholder="Description du ticket..." />
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select v-model="ticketForm.status">
                <option v-for="col in effectiveColumns" :key="col.id" :value="col.id">
                  {{ col.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="ticketForm.priority">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assigné à</label>
              <select v-model="ticketForm.assignedUserId">
                <option :value="null">Non assigné</option>
                <option v-for="user in users" :key="`ticket-user-${user.id}`" :value="user.id">
                  {{ user.displayName }} ({{ user.username }})
                </option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date de début</label>
                <input v-model="ticketForm.startDate" type="date" />
              </div>
              <div class="form-group">
                <label>Temps estimé (heures)</label>
                <input v-model.number="ticketForm.estimatedTime" type="number" min="0" step="0.5" placeholder="Ex: 16" />
              </div>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" v-model="ticketFormOptions.addToTodo" style="width: auto;" />
                <span>📋 Ajouter aussi à la todo</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" v-model="ticketFormOptions.addToCurrentSprint" style="width: auto;" />
                <span>
                  🏃 Ajouter au sprint en cours
                  <small v-if="!currentSprint" style="color: #999;">(aucun sprint actif)</small>
                </span>
              </label>
            </div>
            
            <!-- Upload de fichiers pour tickets -->
            <div class="form-group">
              <label>📎 Pièces jointes</label>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip" @change="handleTicketFileUpload" style="margin-top: 0.5rem;" />
              <small style="color: #666; display: block; margin-top: 0.25rem;">Max 5MB par fichier</small>
              
              <div v-if="ticketForm.attachments && ticketForm.attachments.length > 0" class="uploaded-files">
                <div v-for="(file, index) in ticketForm.attachments" :key="`ticket-file-${index}`" class="uploaded-file-item">
                  <span>{{ getFileIcon(file.type) }}</span>
                  <span class="attachment-name">{{ file.name }}</span>
                  <span class="attachment-size">{{ formatFileSize(file.size) }}</span>
                  <button type="button" @click="removeTicketAttachment(index)">🗑️</button>
                </div>
              </div>
            </div>
            
            <div style="display: flex; gap: 1rem;">
              <button type="submit" class="btn btn-primary">Enregistrer</button>
              <button type="button" @click="cancelTicketForm" class="btn btn-secondary">Annuler</button>
            </div>
          </form>
        </div>

        <!-- Liste des tickets -->
        <div v-if="filteredTickets.length === 0 && !showTicketForm" style="margin-top: 1rem;">
          <p style="text-align: center; color: #999;">{{ searchQuery ? 'Aucun ticket ne correspond à votre recherche.' : 'Aucun ticket pour ce projet.' }}</p>
        </div>

        <template v-if="ticketDisplayMode === 'list'">
        <div v-for="ticket in filteredTickets" :key="ticket.id" class="card ticket-card" :class="{ 'selected': isTicketSelected(ticket.id) }">
          <div class="ticket-header">
            <div style="display: flex; align-items: start; gap: 0.75rem; flex: 1;">
              <input v-if="ticketSelectMode" type="checkbox" :checked="isTicketSelected(ticket.id)" @change="toggleTicketSelection(ticket.id)" class="select-checkbox" />
              <div style="flex: 1; cursor: pointer;" @click="viewTicket(ticket.id)">
                <h3>{{ ticket.title }}</h3>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                  <span class="badge" :class="getTicketStatusClass(ticket.status)">{{ getTicketStatusLabel(ticket.status) }}</span>
                  <span class="badge" :class="getPriorityClass(ticket.priority)">{{ getPriorityLabel(ticket.priority) }}</span>
                  <span class="badge" :class="getRecetteStatusClass(ticket.recetteStatus)">{{ getRecetteStatusLabel(ticket.recetteStatus) }}</span>
                  <span class="badge badge-info">👤 {{ getUserDisplayName(ticket.assignedUserId) }}</span>
                </div>
              </div>
            </div>
            <div class="ticket-actions">
              <button @click="viewTicket(ticket.id)" class="btn btn-primary btn-sm">👁️ Voir</button>
              <button
                v-if="canSyncTicketToOdoo(ticket)"
                @click="syncTicketToOdoo(ticket)"
                class="btn btn-secondary btn-sm"
              >
                🔄 Sync Odoo
              </button>
              <button
                v-if="!getTodoForTicket(ticket)"
                @click="addToTodoList(ticket)"
                class="btn btn-secondary btn-sm"
              >
                📋 Todo
              </button>
              <button
                v-if="effectiveCurrentSprint && ticket.sprintId !== effectiveCurrentSprint.id"
                @click="addToCurrentSprint(ticket)"
                class="btn btn-secondary btn-sm"
              >
                🏃 Ajouter au sprint
              </button>
              <button @click="setTicketRecetteStatus(ticket, 'validated')" class="btn btn-secondary btn-sm">✅ Recette OK</button>
              <button @click="setTicketRecetteStatus(ticket, 'rejected')" class="btn btn-secondary btn-sm">❌ Recette KO</button>
              <button @click="deleteTicketConfirm(ticket)" class="btn btn-danger btn-sm">🗑️ Supprimer</button>
            </div>
          </div>
          <div
            v-if="ticket.description"
            class="ticket-description"
            v-html="truncateHtml(ticket.description)"
            @click="viewTicket(ticket.id)"
            style="cursor: pointer;"
          ></div>
          
          <!-- Pièces jointes pour tickets -->
          <div v-if="ticket.attachments && ticket.attachments.length > 0" class="attachments-preview">
            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #666;">📎 Fichiers ({{ ticket.attachments.length }})</div>
            <div class="attachments-list">
              <div v-for="(attachment, idx) in ticket.attachments" :key="`att-ticket-${ticket.id}-${idx}`" class="attachment-item" @click="previewAttachment(attachment)">
                <span>{{ getFileIcon(attachment.type) }}</span>
                <span class="attachment-name">{{ attachment.name }}</span>
                <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
              </div>
            </div>
          </div>
          
          <div class="ticket-meta">
            <small>Créé le {{ formatDate(ticket.createdAt) }}</small>
            <small v-if="ticket.sprintId === currentSprint?.id" class="sprint-tag">• Dans le sprint en cours</small>
            <small v-if="getTodoForTicket(ticket)" class="todo-tag">
              • Planifié en todo le {{ formatDate(getTodoForTicket(ticket).plannedDate) }}
            </small>
          </div>
        </div>
        </template>

        <template v-else>
          <div class="project-ticket-kanban">
            <div
              v-for="column in ticketKanbanColumns"
              :key="`project-ticket-col-${column.id}`"
              class="project-ticket-kanban-column"
              :class="{ 'is-folded': column.folded }"
              @dragover.prevent
              @drop="onTicketDrop(column.id)"
            >
              <div class="project-ticket-kanban-header" :style="{ backgroundColor: column.color || '#f1f3f5' }">
                <h4>{{ column.folded ? '▸ ' : '' }}{{ column.label }}</h4>
                <span class="count-badge">{{ getTicketsByKanbanStatus(column.id).length }}</span>
              </div>

              <div v-if="!column.folded" class="project-ticket-kanban-body">
                <div
                  v-for="ticket in getTicketsByKanbanStatus(column.id)"
                  :key="`project-ticket-card-${ticket.id}`"
                  class="project-ticket-kanban-card"
                  draggable="true"
                  @dragstart="onTicketDragStart(ticket.id)"
                  @dragend="onTicketDragEnd"
                >
                  <div class="project-ticket-kanban-card-title" @click="viewTicket(ticket.id)">
                    {{ ticket.title }}
                  </div>
                  <div class="project-ticket-kanban-card-meta">
                    <span class="badge" :class="getPriorityClass(ticket.priority)">{{ getPriorityLabel(ticket.priority) }}</span>
                    <span class="badge badge-info">👤 {{ getUserDisplayName(ticket.assignedUserId) }}</span>
                  </div>
                </div>

                <div v-if="getTicketsByKanbanStatus(column.id).length === 0" class="project-ticket-kanban-empty">
                  Aucun ticket
                </div>
              </div>
              <div v-else class="project-ticket-kanban-folded">Étape repliée</div>
            </div>
          </div>
        </template>
        </template>

        <template v-else-if="projectContentView === 'odooTasks'">
          <div class="section-header">
            <h3>🧩 Tâches Odoo liées au projet</h3>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <label style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.875rem;">
                <input type="checkbox" v-model="showCompletedOdooTasks" style="width: auto;" />
                <span>Afficher terminés</span>
              </label>
              <button
                v-if="project?.odooId && odooConfigured"
                @click="syncOdooTasksForProject"
                class="btn btn-secondary"
                :disabled="loadingOdooTasks"
              >
                {{ loadingOdooTasks ? '⏳ Synchronisation...' : '🔄 Synchroniser depuis Odoo' }}
              </button>
            </div>
          </div>

          <div class="search-input-wrapper" style="margin-bottom: 1rem;">
            <span class="search-icon">🔍</span>
            <input
              v-model="tasksSearchQuery"
              type="text"
              placeholder="Rechercher une tâche Odoo par titre ou description..."
              class="search-input"
            />
            <button v-if="tasksSearchQuery" @click="tasksSearchQuery = ''" class="clear-search">✕</button>
          </div>

          <small v-if="tasksSearchQuery" style="color: #666; margin-bottom: 1rem; display: block;">
            {{ filteredOdooTasks.length }} résultat(s) trouvé(s)
          </small>

          <div v-if="!project?.odooId" class="alert-inline">
            ℹ️ Ce projet n'est pas lié à Odoo. Synchronisez les projets pour afficher les tâches Odoo.
          </div>

          <div v-else-if="!odooConfigured" class="alert-inline">
            ⚠️ Odoo n'est pas configuré.
          </div>

          <div v-else-if="odooTasksError" class="alert-inline alert-error">
            ❌ {{ odooTasksError }}
          </div>

          <div v-else-if="!odooTasksLoaded" class="alert-inline">
            Cliquez sur <strong>🔄 Rafraîchir</strong> pour charger les tâches Odoo de ce projet.
          </div>

          <div v-else-if="filteredOdooTasks.length === 0" style="color: #999; text-align: center; padding: 1rem;">
            {{ tasksSearchQuery ? 'Aucune tâche Odoo ne correspond à votre recherche.' : 'Aucune tâche Odoo trouvée pour ce projet.' }}
          </div>

          <div v-else>
            <div v-for="task in filteredOdooTasks" :key="`odoo-task-${task.odooId}`" class="card task-card">
              <div class="ticket-header">
                <div style="flex: 1;">
                  <h3 class="clickable-title" @click="viewOdooTask(task.odooId)">{{ task.title }}</h3>
                  <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    <span class="badge badge-info">Tâche Odoo</span>
                    <span class="badge" :class="getTicketStatusClass(task.status)">{{ getTicketStatusLabel(task.status) }}</span>
                    <span class="badge" :class="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
                  </div>
                </div>
                <div class="ticket-actions">
                  <button @click="viewOdooTask(task.odooId)" class="btn btn-primary btn-sm">👁️ Voir</button>
                  <button
                    v-if="!getTodoForOdooTask(task)"
                    @click="addOdooTaskToTodoList(task)"
                    class="btn btn-secondary btn-sm"
                  >
                    📋 Todo
                  </button>
                </div>
              </div>

              <div
                v-if="task.description"
                class="ticket-description"
                v-html="truncateHtml(task.description)"
              ></div>

              <div class="ticket-meta">
                <small>ID Odoo: {{ task.odooId }}</small>
                <small>Créé le {{ formatDate(task.createdAt) }}</small>
                <small class="time-tag">• Temps total: {{ formatDuration(taskTimeTotals[task.odooId] || 0) }}</small>
                <small v-if="getTodoForOdooTask(task)" class="todo-tag">
                  • Planifié en todo le {{ formatDate(getTodoForOdooTask(task).plannedDate) }}
                </small>
              </div>

              <form @submit.prevent="addTimeToOdooTask(task)" class="task-time-form">
                <div class="task-time-grid">
                  <div class="form-group" style="margin: 0;">
                    <label>Durée</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                      <input v-model.number="getTaskTimeForm(task.odooId).hours" type="number" min="0" style="width: 60px;" />
                      <span>h</span>
                      <input v-model.number="getTaskTimeForm(task.odooId).minutes" type="number" min="0" max="59" style="width: 60px;" />
                      <span>min</span>
                    </div>
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label>Date</label>
                    <input v-model="getTaskTimeForm(task.odooId).date" type="date" required />
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label>Description</label>
                    <input v-model="getTaskTimeForm(task.odooId).description" type="text" placeholder="Travail effectué..." />
                  </div>
                  <button type="submit" class="btn btn-primary btn-sm" :disabled="syncingTaskTime || !isTaskTimeValid(task.odooId)">
                    {{ syncingTaskTime ? '⏳ Envoi...' : '⏱️ Saisir le temps' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </template>

        <template v-else-if="projectContentView === 'localTasks'">
          <div class="section-header">
            <h3>✅ Tâches Locales du projet</h3>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
              <div class="view-toggle" style="margin-right: 0.25rem;">
                <button
                  @click="localTaskDisplayMode = 'list'"
                  :class="['btn', 'btn-sm', localTaskDisplayMode === 'list' ? 'btn-primary' : 'btn-secondary']"
                >
                  📋 Liste
                </button>
                <button
                  @click="localTaskDisplayMode = 'kanban'"
                  :class="['btn', 'btn-sm', localTaskDisplayMode === 'kanban' ? 'btn-primary' : 'btn-secondary']"
                >
                  📊 Kanban
                </button>
              </div>
              <label style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.875rem;">
                <input type="checkbox" v-model="showCompletedLocalTasks" style="width: auto;" />
                <span>Afficher terminés</span>
              </label>
              <template v-if="localTaskSelectMode && selectedLocalTaskIds.length > 0">
                <select v-model="bulkLocalTaskStatus" style="padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
                  <option value="">À faire ou...</option>
                  <option value="todo">À faire</option>
                  <option value="in-progress">En cours</option>
                  <option value="done">Terminé</option>
                </select>
                <button @click="applyBulkLocalTaskStatus" :disabled="!bulkLocalTaskStatus" class="btn btn-primary btn-sm">✓ Statut</button>
                <select v-model="bulkLocalTaskPriority" style="padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid #ccc; font-size: 0.875rem;">
                  <option value="">Changer priorité...</option>
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
                <button @click="applyBulkLocalTaskPriority" :disabled="!bulkLocalTaskPriority" class="btn btn-primary btn-sm">✓ Priorité</button>
              </template>
              <button v-if="localTaskSelectMode" @click="selectAllLocalTasks" class="btn btn-secondary btn-sm">{{ allLocalTasksSelected ? '☐ Tout désélectionner' : '☑️ Tout sélectionner' }}</button>
              <button v-if="filteredLocalTasks.length > 0" @click="toggleLocalTaskSelectMode" class="btn btn-secondary btn-sm">{{ localTaskSelectMode ? '✖ Fermer sélection' : '☑️ Sélection multiple' }}</button>
              <button @click="showAiTaskGenerator = !showAiTaskGenerator" class="btn btn-secondary">🤖 {{ showAiTaskGenerator ? 'Masquer' : 'Générer' }} avec IA</button>
              <button @click="openLocalTaskForm" class="btn btn-primary">+ Nouvelle tâche locale</button>
            </div>
          </div>

          <!-- Générateur IA de tâches -->
          <div v-if="showAiTaskGenerator" style="margin-top: 1rem; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h4 style="color: white; margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
              🤖 Générateur de tâches IA
            </h4>
            
            <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
              <!-- Configuration API -->
              <div v-if="!aiApiKey && aiProvider !== 'ollama'" style="margin-bottom: 1.5rem; padding: 1rem; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                <div class="form-group" style="margin-bottom: 1rem;">
                  <label style="font-weight: 600;">🤖 Provider IA</label>
                  <select v-model="aiProvider" style="margin-top: 0.5rem;">
                    <option value="openai">OpenAI (GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic (Claude Sonnet)</option>
                    <option value="google">Google (Gemini Pro)</option>
                    <option value="grok">🤖 Grok (xAI)</option>
                    <option value="ollama">🚀 Ollama (Local - Gratuit)</option>
                  </select>
                </div>
                <div class="form-group" style="margin: 0;">
                  <label style="font-weight: 600;">🔑 Clé API {{ getProviderName() }}</label>
                  <input 
                    v-model="aiApiKeyInput" 
                    type="password" 
                    :placeholder="getApiKeyPlaceholder()" 
                    style="margin-bottom: 0.5rem;"
                  />
                  <button @click="saveApiKey" class="btn btn-primary btn-sm">💾 Enregistrer</button>
                  <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
                    Votre clé est stockée localement et jamais envoyée ailleurs qu'au provider choisi
                  </p>
                  <p v-if="aiProvider === 'openai'" style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #dc3545;">
                    ⚠️ Si quota dépassé, utilisez Anthropic Claude ou Google Gemini
                  </p>
                </div>
              </div>

              <div v-else-if="aiProvider !== 'ollama'" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #d4edda; border-radius: 6px; border-left: 4px solid #28a745;">
                  <span style="color: #155724; font-weight: 500;">✓ {{ getProviderName() }} configuré</span>
                  <button @click="removeApiKey" class="btn btn-secondary btn-sm">🗑️ Supprimer</button>
                </div>
              </div>

              <!-- Message Ollama -->
              <div v-if="aiProvider === 'ollama'" style="margin-bottom: 1.5rem; padding: 1rem; background: #d1ecf1; border-radius: 6px; border-left: 4px solid #17a2b8;">
                <div style="margin-bottom: 0.5rem;">
                  <strong>🚀 Ollama - IA Locale</strong>
                </div>
                <div style="font-size: 0.875rem; color: #0c5460; margin-bottom: 0.5rem;">
                  ✓ 100% gratuit et privé<br>
                  ✓ Pas de quota<br>
                  ✓ Très performant
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                  <label style="font-size: 0.875rem;">Modèle à utiliser</label>
                  <select v-model="ollamaModel" style="font-size: 0.875rem;">
                    <option value="llama3.1:8b">Llama 3.1 8B (rapide)</option>
                    <option value="llama3.1:70b">Llama 3.1 70B (meilleur)</option>
                    <option value="qwen2.5:14b">Qwen 2.5 14B</option>
                    <option value="mistral:latest">Mistral Latest</option>
                  </select>
                </div>
                <div style="font-size: 0.75rem; color: #0c5460; padding: 0.5rem; background: rgba(23,162,184,0.1); border-radius: 4px;">
                  💡 <strong>Installation :</strong><br>
                  1. Téléchargez Ollama : <a href="https://ollama.com" target="_blank" style="color: #17a2b8;">ollama.com</a><br>
                  2. Lancez : <code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 2px;">ollama run {{ ollamaModel }}</code><br>
                  3. Cliquez sur "Générer les tâches"
                </div>
              </div>

              <!-- Méthode de génération -->
              <div class="form-group">
                <label style="font-weight: 600;">📝 Méthode de génération</label>
                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px; flex: 1;">
                    <input type="radio" v-model="aiGenerationMethod" value="prompt" style="width: auto;" />
                    <div>
                      <div style="font-weight: 500;">💬 Description textuelle</div>
                      <div style="font-size: 0.875rem; color: #666;">Décrivez votre projet</div>
                    </div>
                  </label>
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.75rem; border: 2px solid #ddd; border-radius: 6px; flex: 1;">
                    <input type="radio" v-model="aiGenerationMethod" value="file" style="width: auto;" />
                    <div>
                      <div style="font-weight: 500;">📄 Cahier des charges</div>
                      <div style="font-size: 0.875rem; color: #666;">Importez un document</div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Description textuelle -->
              <div v-if="aiGenerationMethod === 'prompt'" class="form-group">
                <label style="font-weight: 600;">💬 Décrivez votre projet</label>
                <textarea 
                  v-model="aiPrompt" 
                  rows="6" 
                  placeholder="Exemple : Créer une application de gestion de stock avec authentification, CRUD des produits, gestion des catégories, export Excel, et tableau de bord avec statistiques."
                  style="resize: vertical;"
                ></textarea>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
                  Plus vous êtes précis, meilleures seront les tâches générées
                </p>
              </div>

              <!-- Import fichier -->
              <div v-if="aiGenerationMethod === 'file'" class="form-group">
                <label style="font-weight: 600;">📄 Importer un cahier des charges</label>
                <input 
                  type="file" 
                  @change="handleFileUpload" 
                  accept=".txt,.md,.pdf,.doc,.docx"
                  style="padding: 0.75rem; border: 2px dashed #ddd; border-radius: 6px; width: 100%; cursor: pointer;"
                />
                <div v-if="uploadedFileName" style="margin-top: 0.5rem; padding: 0.5rem; background: #e7f3ff; border-radius: 4px; font-size: 0.875rem;">
                  📎 {{ uploadedFileName }} ({{ uploadedFileSize }})
                </div>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #666;">
                  Formats supportés : TXT, Markdown, PDF, Word
                </p>
              </div>

              <!-- Options de génération -->
              <div style="margin-top: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                <label style="font-weight: 600; display: block; margin-bottom: 0.75rem;">⚙️ Options de génération</label>
                
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
                  <input type="checkbox" v-model="aiOptions.includeChiffrage" :disabled="!project?.chiffrageEnabled" style="width: auto;" />
                  <span>💰 Inclure le chiffrage automatique {{ !project?.chiffrageEnabled ? '(activer le chiffrage d\'abord)' : '' }}</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 0.5rem;">
                  <input type="checkbox" v-model="aiOptions.assignLots" style="width: auto;" />
                  <span>📦 Organiser en lots</span>
                </label>
                
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="checkbox" v-model="aiOptions.estimateDifficulty" style="width: auto;" />
                  <span>📊 Estimer la difficulté</span>
                </label>
              </div>

              <!-- Bouton de génération -->
              <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                <button 
                  @click="generateTasksWithAI" 
                  :disabled="aiGenerating || !canGenerateAi"
                  class="btn btn-primary"
                  style="flex: 1; padding: 0.875rem; font-size: 1rem; font-weight: 600;"
                >
                  {{ aiGenerating ? '🔄 Génération en cours...' : '✨ Générer les tâches' }}
                </button>
                <button 
                  @click="showAiTaskGenerator = false" 
                  class="btn btn-secondary"
                  :disabled="aiGenerating"
                >
                  Annuler
                </button>
              </div>
            </div>

            <!-- Tâches générées (prévisualisation) -->
            <div v-if="generatedTasks.length > 0" style="margin-top: 1.5rem; background: white; padding: 1.5rem; border-radius: 8px;">
              <h4 style="margin-top: 0; display: flex; justify-content: space-between; align-items: center;">
                <span>📋 Tâches générées ({{ generatedTasks.length }})</span>
                <div style="display: flex; gap: 0.5rem;">
                  <button @click="saveGeneratedTasks" class="btn btn-primary">💾 Enregistrer toutes</button>
                  <button @click="generatedTasks = []" class="btn btn-secondary">🗑️ Effacer</button>
                </div>
              </h4>
              
              <div style="max-height: 400px; overflow-y: auto;">
                <div 
                  v-for="(task, index) in generatedTasks" 
                  :key="index"
                  style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;"
                >
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div style="flex: 1;">
                      <input 
                        v-model="task.title" 
                        style="font-weight: 600; font-size: 1rem; margin-bottom: 0.5rem; width: 100%;"
                        placeholder="Titre de la tâche"
                      />
                      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                        <span v-if="task.lotNumber" class="badge" style="background: #ffc107; color: #000;">📦 {{ task.lotNumber }}</span>
                        <span v-if="task.difficulty" class="badge" :style="getDifficultyBadgeStyle(task.difficulty)">{{ getDifficultyLabel(task.difficulty) }}</span>
                        <span v-if="task.estimatedTime" class="badge" style="background: #28a745; color: white;">⏱️ {{ task.estimatedTime }}h</span>
                        <span v-if="task.estimatedTime && project.tjm" class="badge" style="background: #dc3545; color: white;">
                          💰 {{ ((task.estimatedTime / (project.hoursPerDay || 8)) * project.tjm).toFixed(0) }}€
                        </span>
                      </div>
                    </div>
                    <button @click="generatedTasks.splice(index, 1)" class="btn btn-secondary btn-sm">🗑️</button>
                  </div>
                  <textarea 
                    v-model="task.description" 
                    rows="2" 
                    style="width: 100%; resize: vertical; font-size: 0.875rem;"
                    placeholder="Description..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Formulaire création tâche locale -->
          <div v-if="showLocalTaskForm" style="margin-top: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 4px;">
            <form @submit.prevent="saveLocalTask">
              <div class="form-group">
                <label>Titre *</label>
                <input v-model="localTaskForm.title" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <RichTextEditor v-model="localTaskForm.description" placeholder="Description de la tâche..." />
              </div>
              <div class="form-group">
                <label>Statut</label>
                <select v-model="localTaskForm.status">
                  <option v-for="col in effectiveColumns" :key="col.id" :value="col.id">{{ col.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Priorité</label>
                <select v-model="localTaskForm.priority">
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div class="form-group">
                <label>Date de début</label>
                <input v-model="localTaskForm.startDate" type="date" />
              </div>
              <div class="form-group">
                <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555;">
                  <input
                    type="checkbox"
                    v-model="localTaskFormOptions.addToCurrentSprint"
                    :disabled="!currentSprintForSelectedProject"
                    @change="handleLocalTaskCurrentSprintToggle"
                    style="width: auto;"
                  />
                  🏃 Ajouter au sprint en cours
                  <span v-if="currentSprintForSelectedProject" style="color: #777;">({{ currentSprintForSelectedProject.name }})</span>
                  <span v-else style="color: #999;">(aucun sprint actif)</span>
                </label>
              </div>
              <div class="form-group">
                <label>Sprint</label>
                <select v-model="localTaskForm.sprintId" :disabled="localTaskFormOptions.addToCurrentSprint">
                  <option :value="null">Aucun sprint</option>
                  <option v-for="sprint in sprints" :key="`lt-sprint-${sprint.id}`" :value="sprint.id">
                    {{ sprint.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Temps estimé (heures)</label>
                <input v-model.number="localTaskForm.estimatedTime" type="number" min="0" step="0.5" placeholder="Ex: 8" />
              </div>
              <div class="form-group">
                <label>Assigné à</label>
                <select v-model="localTaskForm.assignedUserId">
                  <option :value="null">Non assigné</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.displayName }} ({{ user.username }})
                  </option>
                </select>
              </div>

              <!-- Champs de chiffrage (seulement si activé sur le projet) -->
              <div v-if="project?.chiffrageEnabled" style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #ddd;">
                <div class="form-group">
                  <label style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" v-model="localTaskForm.isChiffrage" style="width: auto;" />
                    <strong>💰 Activer le chiffrage pour cette tâche</strong>
                  </label>
                </div>

                <template v-if="localTaskForm.isChiffrage">
                  <div class="form-group">
                    <label>Numéro de lot</label>
                    <input v-model="localTaskForm.lotNumber" placeholder="Ex: LOT-001" />
                  </div>
                  <div class="form-group">
                    <label>Difficulté</label>
                    <select v-model="localTaskForm.difficulty">
                      <option value="">Sélectionner...</option>
                      <option value="easy">Facile</option>
                      <option value="medium">Moyen</option>
                      <option value="hard">Difficile</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div v-if="project.tjm && localTaskForm.estimatedTime" class="form-group">
                    <label>Coût estimé</label>
                    <div style="padding: 0.5rem; background: #f0f8ff; border: 1px solid #4DBA87; border-radius: 4px;">
                      <strong>{{ ((localTaskForm.estimatedTime / (project.hoursPerDay || 8)) * project.tjm).toFixed(2) }} €</strong>
                      <small style="color: #666; margin-left: 0.5rem;">
                        ({{ localTaskForm.estimatedTime }}h ÷ {{ project.hoursPerDay || 8 }}h/j × {{ project.tjm }}€ TJM)
                      </small>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Upload de fichiers -->
              <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #ddd;">
                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">📎 Fichiers joints</label>
                <input 
                  type="file" 
                  @change="handleLocalTaskFileUpload" 
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip"
                  style="margin-bottom: 0.5rem;"
                />
                <p style="font-size: 0.75rem; color: #666; margin: 0;">
                  Images, PDF, documents Office, ZIP (max 5 MB par fichier)
                </p>
                
                <!-- Fichiers déjà attachés -->
                <div v-if="localTaskForm.attachments && localTaskForm.attachments.length > 0" style="margin-top: 1rem;">
                  <div v-for="(file, index) in localTaskForm.attachments" :key="index" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; margin-bottom: 0.5rem;">
                    <span v-if="file.type.startsWith('image/')">🖼️</span>
                    <span v-else-if="file.type.includes('pdf')">📄</span>
                    <span v-else>📎</span>
                    <span style="flex: 1; font-size: 0.875rem;">{{ file.name }} ({{ formatFileSize(file.size) }})</span>
                    <button type="button" @click="removeLocalTaskAttachment(index)" class="btn btn-secondary btn-sm">🗑️</button>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="submit" class="btn btn-primary">Enregistrer</button>
                <button type="button" @click="cancelLocalTaskForm" class="btn btn-secondary">Annuler</button>
              </div>
            </form>
          </div>

          <!-- Liste tâches locales -->
          <div v-if="filteredLocalTasks.length === 0 && !showLocalTaskForm" style="margin-top: 1rem;">
            <p style="text-align: center; color: #999;">Aucune tâche locale pour ce projet.</p>
          </div>

          <template v-if="localTaskDisplayMode === 'list'">
          <div v-for="task in filteredLocalTasks" :key="`local-task-${task.id}`" class="card task-card" :class="{ 'selected': isLocalTaskSelected(task.id) }">
            <div class="ticket-header">
              <div style="display: flex; align-items: start; gap: 0.75rem; flex: 1;">
                <input v-if="localTaskSelectMode" type="checkbox" :checked="isLocalTaskSelected(task.id)" @change="toggleLocalTaskSelection(task.id)" class="select-checkbox" />
                <div style="flex: 1;">
                  <h3 class="clickable-title">{{ task.title }}</h3>
                  <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                    <span class="badge badge-success">Tâche Locale</span>
                    <span class="badge" :class="getTicketStatusClass(task.status)">{{ getTicketStatusLabel(task.status) }}</span>
                    <span class="badge" :class="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
                    <span class="badge badge-info">👤 {{ getUserDisplayName(task.assignedUserId) }}</span>
                    <span v-if="task.sprintId" class="badge badge-info">🏃 {{ getSprintName(task.sprintId) }}</span>
                    <span v-if="task.startDate" class="badge badge-info">📅 Début: {{ task.startDate }}</span>
                    <span v-if="task.estimatedTime" class="badge badge-success">⏱️ {{ task.estimatedTime }}h</span>
                    <span v-if="task.isChiffrage" class="badge" style="background: #4DBA87; color: white;">💰 Chiffrage</span>
                  </div>
                  <!-- Infos de chiffrage -->
                  <div v-if="task.isChiffrage" style="margin-top: 0.5rem; padding: 0.5rem; background: #f0f8ff; border-radius: 4px; font-size: 0.875rem;">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                      <span v-if="task.lotNumber"><strong>Lot:</strong> {{ task.lotNumber }}</span>
                      <span v-if="task.difficulty"><strong>Difficulté:</strong> {{ getDifficultyLabel(task.difficulty) }}</span>
                      <span v-if="task.estimatedTime"><strong>Estimé:</strong> {{ task.estimatedTime }}h</span>
                      <span v-if="project.tjm && task.estimatedTime" style="color: #4DBA87; font-weight: 600;">
                        <strong>Coût:</strong> {{ ((task.estimatedTime / (project.hoursPerDay || 8)) * project.tjm).toFixed(2) }}€
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="ticket-actions">
                <button
                  v-if="effectiveCurrentSprint && task.sprintId !== effectiveCurrentSprint.id"
                  @click="addLocalTaskToCurrentSprint(task)"
                  class="btn btn-secondary btn-sm"
                >
                  🏃 Ajouter au sprint
                </button>
                <button @click="editLocalTask(task)" class="btn btn-secondary btn-sm">✏️ Éditer</button>
                <button @click="deleteLocalTaskConfirm(task)" class="btn btn-danger btn-sm">🗑️ Supprimer</button>
              </div>
            </div>

            <div v-if="task.description" class="ticket-description" v-html="truncateHtml(task.description)"></div>

            <!-- Pièces jointes -->
            <div v-if="task.attachments && task.attachments.length > 0" class="attachments-preview">
              <div style="font-weight: 600; margin-bottom: 0.5rem; color: #666;">📎 Fichiers ({{ task.attachments.length }})</div>
              <div class="attachments-list">
                <div v-for="(attachment, idx) in task.attachments" :key="`att-${task.id}-${idx}`" class="attachment-item" @click="previewAttachment(attachment)">
                  <span>{{ getFileIcon(attachment.type) }}</span>
                  <span class="attachment-name">{{ attachment.name }}</span>
                  <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
                </div>
              </div>
            </div>

            <div class="ticket-meta">
              <small>Créé le {{ formatDate(task.createdAt) }}</small>
              <small v-if="task.timeTotalMinutes" class="time-tag">• Temps: {{ formatDuration(task.timeTotalMinutes) }}</small>
            </div>
          </div>
          </template>

          <template v-else>
            <div class="project-ticket-kanban">
              <div
                v-for="column in localTaskKanbanColumns"
                :key="`project-local-col-${column.id}`"
                class="project-ticket-kanban-column"
                :class="{ 'is-folded': column.folded }"
                @dragover.prevent
                @drop="onLocalTaskDrop(column.id)"
              >
                <div class="project-ticket-kanban-header" :style="{ backgroundColor: column.color || '#f1f3f5' }">
                  <h4>{{ column.folded ? '▸ ' : '' }}{{ column.label }}</h4>
                  <span class="count-badge">{{ getLocalTasksByKanbanStatus(column.id).length }}</span>
                </div>

                <div v-if="!column.folded" class="project-ticket-kanban-body">
                  <div
                    v-for="task in getLocalTasksByKanbanStatus(column.id)"
                    :key="`project-local-card-${task.id}`"
                    class="project-ticket-kanban-card"
                    draggable="true"
                    @dragstart="onLocalTaskDragStart(task.id)"
                    @dragend="onLocalTaskDragEnd"
                  >
                    <div class="project-ticket-kanban-card-title">
                      ✅ {{ task.title }}
                    </div>
                    <div class="project-ticket-kanban-card-meta">
                      <span class="badge" :class="getPriorityClass(task.priority)">{{ getPriorityLabel(task.priority) }}</span>
                      <span class="badge badge-info">👤 {{ getUserDisplayName(task.assignedUserId) }}</span>
                    </div>
                    <div style="display:flex; gap:0.35rem; margin-top:0.5rem;">
                      <button @click.stop="editLocalTask(task)" class="btn btn-secondary btn-sm">✏️</button>
                      <button @click.stop="deleteLocalTaskConfirm(task)" class="btn btn-danger btn-sm">🗑️</button>
                    </div>
                  </div>

                  <div v-if="getLocalTasksByKanbanStatus(column.id).length === 0" class="project-ticket-kanban-empty">
                    Aucune tâche locale
                  </div>
                </div>
                <div v-else class="project-ticket-kanban-folded">Étape repliée</div>
              </div>
            </div>
          </template>
        </template>

        <template v-else-if="projectContentView === 'gantt'">
          <div class="section-header">
            <h3>🗓️ Pipeline hebdomadaire par utilisateur</h3>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <label style="font-size: 0.9rem; color: #666;">Sprint</label>
              <select v-model="selectedGanttSprintId" style="min-width: 220px;">
                <option value="">Tous les sprints</option>
                <option v-for="sprint in sprints" :key="`gantt-sprint-${sprint.id}`" :value="String(sprint.id)">
                  {{ sprint.name }}
                </option>
              </select>
              <button class="btn btn-secondary btn-sm" @click="prevGanttWeek">← Semaine -1</button>
              <button class="btn btn-secondary btn-sm" @click="nextGanttWeek">Semaine +1 →</button>
              <small style="color: #666;">{{ ganttWeekDays[0] }} → {{ ganttWeekDays[ganttWeekDays.length - 1] }}</small>
            </div>
          </div>

          <div v-if="ganttUserRows.length === 0" style="text-align: center; color: #999; padding: 2rem;">
            Aucun ticket assigné non terminé pour cette semaine.
          </div>

          <div v-else class="gantt-wrapper">
            <div class="gantt-header">
              <div class="gantt-user-col">Utilisateur</div>
              <div class="gantt-timeline-col">
                <div class="gantt-days-grid" :style="{ gridTemplateColumns: `repeat(${ganttWeekDays.length}, 1fr)` }">
                  <div v-for="day in ganttWeekDays" :key="`gh-${day}`" class="gantt-day-label">{{ day.slice(5) }}</div>
                </div>
              </div>
            </div>

            <div v-for="row in ganttUserRows" :key="`gantt-user-${row.userId}`" class="gantt-row">
              <div class="gantt-user-col">
                <div class="gantt-task-title">{{ row.userName }}</div>
                <small style="color: #666;">{{ row.items.length }} ticket(s)</small>
              </div>
              <div class="gantt-timeline-col" :style="{ minHeight: `${getGanttRowHeight(row)}px` }">
                <div
                  v-for="(item, itemIndex) in row.items"
                  :key="`gantt-item-${row.userId}-${item.id}`"
                  class="gantt-bar clickable"
                  :style="getGanttBarStyle(item, itemIndex)"
                  :title="`${item.title} (${item.estimatedTime}h)`"
                  @click="viewTicket(item.id)"
                ></div>
              </div>
            </div>
          </div>
        </template>

        <!-- Vue Pièces jointes -->
        <template v-else-if="projectContentView === 'attachments'">
          <div class="section-header">
            <h3>📎 Toutes les pièces jointes du projet</h3>
          </div>

          <div v-if="allAttachments.length === 0" style="text-align: center; color: #999; padding: 2rem;">
            Aucune pièce jointe dans ce projet
          </div>

          <div v-else>
            <!-- Statistiques -->
            <div class="attachments-stats">
              <div class="stat-card">
                <div class="stat-value">{{ allAttachments.length }}</div>
                <div class="stat-label">Fichiers</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ formatFileSize(totalAttachmentsSize) }}</div>
                <div class="stat-label">Taille totale</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ attachmentsByType.images }}</div>
                <div class="stat-label">Images</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ attachmentsByType.pdfs }}</div>
                <div class="stat-label">PDFs</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ attachmentsByType.others }}</div>
                <div class="stat-label">Autres</div>
              </div>
            </div>

            <!-- Grille de pièces jointes -->
            <div class="attachments-grid">
              <div v-for="item in allAttachments" :key="item.key" class="attachment-grid-item" @click="previewAttachment(item.attachment)">
                <div class="attachment-grid-preview">
                  <img v-if="isImageFile(item.attachment.type)" :src="item.attachment.data" :alt="item.attachment.name" />
                  <div v-else class="attachment-grid-icon">
                    {{ getFileIcon(item.attachment.type) }}
                  </div>
                </div>
                <div class="attachment-grid-info">
                  <div class="attachment-grid-name" :title="item.attachment.name">{{ item.attachment.name }}</div>
                  <div class="attachment-grid-meta">
                    <span class="attachment-grid-source">{{ item.sourceName }}</span>
                    <span>•</span>
                    <span>{{ formatFileSize(item.attachment.size) }}</span>
                  </div>
                  <div class="attachment-grid-date">{{ formatDate(item.attachment.uploadedAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modale de prévisualisation des pièces jointes -->
    <div v-if="showAttachmentPreview && currentAttachment" class="attachment-modal" @click="closeAttachmentPreview">
      <div class="attachment-modal-content" @click.stop>
        <div class="attachment-modal-header">
          <div>
            <h3>{{ currentAttachment.name }}</h3>
            <small>{{ formatFileSize(currentAttachment.size) }} • {{ formatDate(currentAttachment.uploadedAt) }}</small>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button @click="downloadAttachment(currentAttachment)" class="btn btn-secondary btn-sm">⬇️ Télécharger</button>
            <button @click="closeAttachmentPreview" class="btn btn-secondary btn-sm">✕</button>
          </div>
        </div>
        <div class="attachment-modal-body">
          <!-- Image -->
          <img v-if="isImageFile(currentAttachment.type)" :src="currentAttachment.data" :alt="currentAttachment.name" class="preview-image" />
          
          <!-- PDF -->
          <iframe v-else-if="isPdfFile(currentAttachment.type)" :src="currentAttachment.data" class="preview-pdf"></iframe>
          
          <!-- Autre type -->
          <div v-else class="preview-download">
            <div style="font-size: 4rem; margin-bottom: 1rem;">{{ getFileIcon(currentAttachment.type) }}</div>
            <p style="font-size: 1.25rem; margin-bottom: 1rem;">{{ currentAttachment.name }}</p>
            <button @click="downloadAttachment(currentAttachment)" class="btn btn-primary">⬇️ Télécharger le fichier</button>
            <p style="margin-top: 1rem; color: #666;">Prévisualisation non disponible pour ce type de fichier</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import * as XLSX from 'xlsx'
import { odooService } from '../services/odoo-new'
import { auth } from '../services/auth'
import RichTextEditor from './RichTextEditor.vue'
import KanbanColumnsEditor from './KanbanColumnsEditor.vue'

export default {
  name: 'ProjectDetail',
  components: {
    RichTextEditor,
    KanbanColumnsEditor
  },
  data() {
    return {
      project: null,
      users: [],
      currentUserId: null,
      tickets: [],
      sprints: [],
      todos: [],
      odooTasks: [],
      localTasks: [],
      taskTimeTotals: {},
      loadingOdooTasks: false,
      odooTasksError: null,
      odooTasksLoaded: false,
      syncingTaskTime: false,
      syncingTicketStatuses: false,
      ticketStatusSyncMessage: null,
      taskTimeForm: {},
      projectContentView: 'tickets',
      selectedGanttSprintId: '',
      ganttWeekStart: '',
      searchQuery: '',
      tasksSearchQuery: '',
      showTicketForm: false,
      showLocalTaskForm: false,
      showKanbanEditor: false,
      showChiffrageConfig: false,
      showAiTaskGenerator: false,
      ticketDisplayMode: 'kanban',
      localTaskDisplayMode: 'list',
      draggedTicketId: null,
      draggedLocalTaskId: null,
      ticketSelectMode: false,
      selectedTicketIds: [],
      bulkTicketStatus: '',
      bulkTicketPriority: '',
      localTaskSelectMode: false,
      selectedLocalTaskIds: [],
      bulkLocalTaskStatus: '',
      bulkLocalTaskPriority: '',
      // Prévisualisation des pièces jointes
      showAttachmentPreview: false,
      currentAttachment: null,
      pendingKanbanColumns: null,
      chiffrageConfig: {
        enabled: false,
        tjm: 0,
        hoursPerDay: 8
      },
      // Générateur IA
      aiApiKey: localStorage.getItem('openai_api_key') || '',
      aiApiKeyInput: '',
      aiProvider: localStorage.getItem('ai_provider') || 'openai',
      ollamaModel: localStorage.getItem('ollama_model') || 'llama3.1:8b',
      aiGenerationMethod: 'prompt',
      aiPrompt: '',
      aiOptions: {
        includeChiffrage: true,
        assignLots: true,
        estimateDifficulty: true
      },
      aiGenerating: false,
      generatedTasks: [],
      uploadedFile: null,
      uploadedFileName: '',
      uploadedFileSize: '',
      uploadedFileContent: '',
      defaultColumns: [
        { id: 'todo', label: 'À faire', color: '#fff3cd', folded: false },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff', folded: false },
        { id: 'done', label: 'Terminé', color: '#d1e7dd', folded: false }
      ],
      projectStages: [], // étapes relationnelles (kanban_stages) du projet courant
      ticketForm: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        estimatedTime: 0,
        assignedUserId: null,
        attachments: []
      },
      localTaskForm: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        sprintId: null,
        startDate: new Date().toISOString().split('T')[0],
        assignedUserId: null,
        isChiffrage: false,
        lotNumber: '',
        difficulty: '',
        estimatedTime: 0,
        attachments: []
      },
      localTaskFormOptions: {
        addToCurrentSprint: false
      },
      ticketFormOptions: {
        addToTodo: false,
        addToCurrentSprint: false
      },
      showCompletedTickets: false,
      showCompletedOdooTasks: false,
      showCompletedLocalTasks: false
    }
  },
  computed: {
    // Colonnes Kanban effectives : priorité aux étapes relationnelles (kanban_stages),
    // puis aux colonnes JSON du projet, puis aux colonnes par défaut
    effectiveColumns() {
      if (this.projectStages && this.projectStages.length > 0) {
        return this.projectStages.map(col => ({ ...col, folded: Boolean(col.folded) }))
      }
      if (this.project?.kanbanColumns?.length) {
        return this.project.kanbanColumns.map(col => ({ ...col, folded: Boolean(col.folded) }))
      }
      return this.defaultColumns.map(col => ({ ...col, folded: Boolean(col.folded) }))
    },
    filteredTickets() {
      const baseTickets = this.showCompletedTickets
        ? this.tickets
        : this.tickets.filter(ticket => !this.isCompletedStatus(ticket.status))

      if (!this.searchQuery) return baseTickets

      const query = this.searchQuery.toLowerCase()
      return baseTickets.filter(ticket => {
        const titleMatch = ticket.title?.toLowerCase().includes(query)
        const descText = this.extractText(ticket.description || '').toLowerCase()
        const descMatch = descText.includes(query)
        return titleMatch || descMatch
      })
    },
    ticketKanbanColumns() {
      const baseColumns = this.effectiveColumns

      const hasUnknownStatus = this.filteredTickets.some(ticket => {
        return !baseColumns.some(col => String(col.id) === String(ticket.status))
      })

      if (hasUnknownStatus) {
        return [...baseColumns, { id: '__other__', label: 'Autres', color: '#f1f3f5' }]
      }

      return baseColumns
    },
    filteredOdooTasks() {
      const baseTasks = this.showCompletedOdooTasks
        ? this.odooTasks
        : this.odooTasks.filter(task => !this.isCompletedStatus(task.status))

      if (!this.tasksSearchQuery) return baseTasks

      const query = this.tasksSearchQuery.toLowerCase()
      return baseTasks.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(query)
        const descText = this.extractText(task.description || '').toLowerCase()
        const descMatch = descText.includes(query)
        return titleMatch || descMatch
      })
    },
    filteredLocalTasks() {
      return this.showCompletedLocalTasks
        ? this.localTasks
        : this.localTasks.filter(task => !this.isCompletedStatus(task.status))
    },
    localTaskKanbanColumns() {
      // Colonnes effectives : priorité aux étapes relationnelles, puis JSON, puis défaut
      const baseColumns = this.effectiveColumns

      const hasUnknownStatus = this.filteredLocalTasks.some(task => {
        return !baseColumns.some(col => String(col.id) === String(task.status))
      })

      if (hasUnknownStatus) {
        return [...baseColumns, { id: '__other__', label: 'Autres', color: '#f1f3f5' }]
      }

      return baseColumns
    },
    todoByText() {
      const map = new Map()
      for (const todo of this.todos) {
        if (todo.completed) continue
        if (!map.has(todo.text)) {
          map.set(todo.text, todo)
        }
      }
      return map
    },
    effectiveCurrentSprint() {
      const now = new Date()

      const sortByStartDateDesc = list => {
        return [...list].sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
          return bDate - aDate
        })
      }

      const activeSprints = this.sprints.filter(s => s.status === 'active')
      if (activeSprints.length > 0) {
        return sortByStartDateDesc(activeSprints)[0]
      }

      const inDateRange = this.sprints.filter(s => {
        if (s.status === 'completed') return false
        if (!s.startDate || !s.endDate) return false
        const start = new Date(s.startDate)
        const end = new Date(s.endDate)
        return start <= now && now <= end
      })
      if (inDateRange.length > 0) {
        return sortByStartDateDesc(inDateRange)[0]
      }

      const nonCompleted = this.sprints.filter(s => s.status !== 'completed')
      if (nonCompleted.length > 0) {
        return sortByStartDateDesc(nonCompleted)[0]
      }

      return null
    },
    currentSprint() {
      return this.effectiveCurrentSprint
    },
    currentSprintForSelectedProject() {
      if (!this.project) return null
      return this.effectiveCurrentSprint
    },
    odooConfigured() {
      return odooService.isConfigured()
    },
    allTicketsSelected() {
      return this.filteredTickets.length > 0 && this.selectedTicketIds.length === this.filteredTickets.length
    },
    allLocalTasksSelected() {
      return this.filteredLocalTasks.length > 0 && this.selectedLocalTaskIds.length === this.filteredLocalTasks.length
    },
    canGenerateAi() {
      if (this.aiProvider === 'ollama') {
        if (this.aiGenerationMethod === 'prompt') return this.aiPrompt.trim().length > 10
        if (this.aiGenerationMethod === 'file') return this.uploadedFileContent.length > 0
        return false
      }
      if (!this.aiApiKey) return false
      if (this.aiGenerationMethod === 'prompt') return this.aiPrompt.trim().length > 10
      if (this.aiGenerationMethod === 'file') return this.uploadedFileContent.length > 0
      return false
    },
    allAttachments() {
      const attachments = []
      
      // Pièces jointes des tickets
      this.tickets.forEach(ticket => {
        if (ticket.attachments && ticket.attachments.length > 0) {
          ticket.attachments.forEach((attachment, index) => {
            attachments.push({
              key: `ticket-${ticket.id}-${index}`,
              attachment,
              sourceType: 'ticket',
              sourceName: `Ticket: ${ticket.title}`,
              sourceId: ticket.id
            })
          })
        }
      })
      
      // Pièces jointes des tâches locales
      this.localTasks.forEach(task => {
        if (task.attachments && task.attachments.length > 0) {
          task.attachments.forEach((attachment, index) => {
            attachments.push({
              key: `task-${task.id}-${index}`,
              attachment,
              sourceType: 'localTask',
              sourceName: `Tâche: ${task.title}`,
              sourceId: task.id
            })
          })
        }
      })
      
      // Trier par date (plus récent en premier)
      return attachments.sort((a, b) => {
        return new Date(b.attachment.uploadedAt) - new Date(a.attachment.uploadedAt)
      })
    },
    totalAttachmentsSize() {
      return this.allAttachments.reduce((total, item) => total + (item.attachment.size || 0), 0)
    },
    attachmentsByType() {
      const types = { images: 0, pdfs: 0, others: 0 }
      this.allAttachments.forEach(item => {
        if (item.attachment.type.startsWith('image/')) {
          types.images++
        } else if (item.attachment.type === 'application/pdf') {
          types.pdfs++
        } else {
          types.others++
        }
      })
      return types
    },
    ganttWeekDays() {
      const start = this.ganttWeekStart || this.getWeekStart(new Date())
      const days = []
      for (let i = 0; i < 7; i++) {
        days.push(this.addDaysToDateString(start, i))
      }
      return days
    },
    ganttTicketItems() {
      const hoursPerDay = Number(this.project?.hoursPerDay || 8)
      const selectedSprintId = Number(this.selectedGanttSprintId)
      const hasSprintFilter = Number.isFinite(selectedSprintId) && selectedSprintId > 0
      const weekStart = this.ganttWeekDays[0]
      const weekEnd = this.ganttWeekDays[this.ganttWeekDays.length - 1]

      return (this.tickets || [])
        .filter(ticket => !hasSprintFilter || Number(ticket.sprintId) === selectedSprintId)
        .filter(ticket => !!ticket.assignedUserId)
        .filter(ticket => !this.isCompletedStatus(ticket.status))
        .map(ticket => {
          const ganttStartDate = ticket.startDate
            ? this.toDateOnlyString(ticket.startDate)
            : this.toDateOnlyString(ticket.createdAt || new Date().toISOString())
          const estimatedHours = Number(ticket.estimatedTime || 1)
          const ganttDurationDays = Math.max(1, Math.ceil(estimatedHours / (hoursPerDay > 0 ? hoursPerDay : 8)))
          const ganttEndDate = this.addDaysToDateString(ganttStartDate, ganttDurationDays - 1)
          return {
            ...ticket,
            estimatedTime: estimatedHours,
            ganttStartDate,
            ganttDurationDays,
            ganttEndDate,
            overlapsWeek: !(ganttEndDate < weekStart || ganttStartDate > weekEnd)
          }
        })
        .filter(item => item.overlapsWeek)
    },
    ganttUserRows() {
      const groups = new Map()
      for (const item of this.ganttTicketItems) {
        const userId = Number(item.assignedUserId)
        if (!groups.has(userId)) {
          groups.set(userId, {
            userId,
            userName: this.getUserDisplayName(userId),
            items: []
          })
        }
        groups.get(userId).items.push(item)
      }

      const rows = Array.from(groups.values())
      rows.forEach(row => {
        row.items.sort((a, b) => String(a.ganttStartDate).localeCompare(String(b.ganttStartDate)))
      })

      return rows.sort((a, b) => String(a.userName).localeCompare(String(b.userName)))
    }
  },
  async mounted() {
    this.currentUserId = auth.getSession()?.userId || null
    this.ganttWeekStart = this.getWeekStart(new Date())
    await this.loadUsers()
    await this.loadProject()
    await this.loadSprints()
    await this.loadTodos()
    await this.loadTickets()
    await this.loadLocalOdooTasksForProject()
    await this.loadLocalTasks()
  },
  methods: {
    async loadUsers() {
      this.users = await db.getActiveUsers()
    },
    getUserDisplayName(userId) {
      if (!userId) return 'Non assigné'
      const user = this.users.find(u => u.id === userId)
      return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
    },
    getSprintName(sprintId) {
      if (!sprintId) return 'Sprint inconnu'
      const sprint = this.sprints.find(s => Number(s.id) === Number(sprintId))
      return sprint?.name || 'Sprint inconnu'
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
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    getWeekStart(dateInput) {
      const date = new Date(dateInput || new Date())
      const day = date.getDay() || 7
      if (day !== 1) date.setDate(date.getDate() - (day - 1))
      return this.toDateOnlyString(date)
    },
    prevGanttWeek() {
      const base = this.ganttWeekStart || this.getWeekStart(new Date())
      this.ganttWeekStart = this.addDaysToDateString(base, -7)
    },
    nextGanttWeek() {
      const base = this.ganttWeekStart || this.getWeekStart(new Date())
      this.ganttWeekStart = this.addDaysToDateString(base, 7)
    },
    getPriorityColor(priority) {
      if (priority === 'high') return '#dc3545'
      if (priority === 'medium') return '#fd7e14'
      return '#4DBA87'
    },
    getGanttRowHeight(row) {
      const count = Math.max(1, Number(row?.items?.length || 1))
      return Math.max(48, (count * 24) + 12)
    },
    getGanttBarStyle(task, itemIndex = 0) {
      if (!task?.ganttStartDate || !this.ganttWeekDays.length) return {}

      const total = this.ganttWeekDays.length
      const weekStart = this.ganttWeekDays[0]
      const weekEnd = this.ganttWeekDays[total - 1]
      const clippedStart = task.ganttStartDate < weekStart ? weekStart : task.ganttStartDate
      const clippedEnd = task.ganttEndDate > weekEnd ? weekEnd : task.ganttEndDate

      const startIndex = this.ganttWeekDays.findIndex(day => day === clippedStart)
      const endIndex = this.ganttWeekDays.findIndex(day => day === clippedEnd)
      if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return {}

      const duration = (endIndex - startIndex) + 1
      const leftPct = (startIndex / total) * 100
      const widthPct = (duration / total) * 100

      return {
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 1.8)}%`,
        top: `${8 + (Number(itemIndex) * 24)}px`,
        transform: 'none',
        background: this.getPriorityColor(task.priority)
      }
    },
    isCompletedStatus(status) {
      if (!status) return false
      if (status === 'done' || status === 'completed' || status === 'closed') return true

      const label = (this.getTicketStatusLabel(status) || '').toString().toLowerCase()
      return (
        label.includes('termin') ||
        label.includes('done') ||
        label.includes('clos') ||
        label.includes('résolu') ||
        label.includes('resolu')
      )
    },
    async loadProject() {
      const id = parseInt(this.$route.params.id)
      this.project = await db.getProject(id)
      
      // Charger la config de chiffrage
      if (this.project) {
        this.chiffrageConfig = {
          enabled: this.project.chiffrageEnabled || false,
          tjm: this.project.tjm || 0,
          hoursPerDay: this.project.hoursPerDay || 8
        }
      }

      // Charger les étapes Kanban relationnelles du projet
      try {
        const stages = await db.getStagesByProject(id)
        this.projectStages = (stages || []).map(s => ({
          id: String(s.id),
          label: s.name || '',
          color: s.color || '#cfe2ff',
          folded: Boolean(s.folded)
        }))
      } catch (e) {
        this.projectStages = []
      }
    },
    async loadTickets() {
      const id = parseInt(this.$route.params.id)
      this.tickets = await db.getTicketsByProject(id)
    },
    async loadSprints() {
      const id = parseInt(this.$route.params.id)
      this.sprints = await db.getSprintsByProject(id)
    },
    async loadTodos() {
      this.todos = await db.getAllTodos()
    },
    async loadLocalOdooTasksForProject() {
      this.odooTasksError = null

      if (!this.project?.odooId) {
        this.odooTasks = []
        this.taskTimeTotals = {}
        this.odooTasksLoaded = true
        return
      }

      try {
        this.odooTasks = await db.getOdooTasksByProjectOdooId(this.project.odooId)
        const totals = {}
        for (const task of this.odooTasks) {
          totals[task.odooId] = task.timeTotalMinutes || 0
        }
        this.taskTimeTotals = totals
        this.odooTasksLoaded = true
      } catch (error) {
        console.error('Erreur chargement cache local tâches Odoo:', error)
        this.odooTasksError = error.message || 'Erreur lors du chargement local des tâches Odoo'
        this.odooTasks = []
        this.taskTimeTotals = {}
        this.odooTasksLoaded = true
      }
    },

    async syncOdooTasksForProject() {
      this.odooTasksError = null

      if (!this.project?.odooId || !this.odooConfigured) {
        return
      }

      this.loadingOdooTasks = true
      try {
        const tasks = await odooService.getProjectTasks(this.project.odooId)

        const mappedTasks = []
        for (const task of tasks) {
          let timeTotalMinutes = 0
          try {
            const entries = await odooService.getTaskTimeEntries(task.odooId)
            timeTotalMinutes = entries.reduce((sum, e) => sum + Math.round((e.unit_amount || 0) * 60), 0)
          } catch {
            timeTotalMinutes = 0
          }

          mappedTasks.push({
            ...task,
            projectName: this.project.name,
            localProjectId: this.project.id,
            projectIsFavorite: !!this.project.isFavorite,
            timeTotalMinutes,
            projectOdooId: this.project.odooId
          })
        }

        await db.replaceOdooTasksForProject(this.project.odooId, mappedTasks)
        await this.loadLocalOdooTasksForProject()
        this.odooTasksLoaded = true
      } catch (error) {
        console.error('Erreur chargement tâches Odoo:', error)
        this.odooTasksError = error.message || 'Erreur lors du chargement des tâches Odoo'
        this.odooTasks = []
        this.odooTasksLoaded = true
      } finally {
        this.loadingOdooTasks = false
      }
    },
    isDoneLikeStageName(stageName) {
      const n = String(stageName || '').toLowerCase()
      return (
        n.includes('done') ||
        n.includes('ferm') ||
        n.includes('clos') ||
        n.includes('termin') ||
        n.includes('résolu') ||
        n.includes('resolu')
      )
    },
    mapImportedOdooTicketStatusToProjectColumn(odooTask) {
      const columns = this.effectiveColumns
      const stageName = String(odooTask.stageName || '').toLowerCase()
      const kanbanState = String(odooTask.rawKanbanState || '').toLowerCase()
      const remoteStageId = Number(odooTask.stageOdooId)
      const isDone =
        odooTask.status === 'done' ||
        odooTask.stageIsClosed === true ||
        odooTask.active === false ||
        kanbanState === 'done' ||
        kanbanState === 'closed' ||
        kanbanState === 'solved' ||
        kanbanState === 'resolved' ||
        this.isDoneLikeStageName(stageName)

      if (isDone) {
        if (Number.isFinite(remoteStageId) && remoteStageId > 0) {
          const exactDone = columns.find(c => Number(c.odooStageId) === remoteStageId)
          if (exactDone) return exactDone.id
        }

        const doneColumn = columns.find(c => {
          const id = String(c.id || '').toLowerCase()
          const label = String(c.label || '').toLowerCase()
          return (
            id.includes('done') ||
            id.includes('close') ||
            id.includes('term') ||
            label.includes('done') ||
            label.includes('ferm') ||
            label.includes('clos') ||
            label.includes('termin') ||
            label.includes('résolu') ||
            label.includes('resolu')
          )
        })

        if (doneColumn?.id) return doneColumn.id

        // Fallback UX: dernière colonne = fin de flux
        if (columns.length > 0) {
          return columns[columns.length - 1].id
        }

        return 'done'
      }

      if (Number.isFinite(remoteStageId) && remoteStageId > 0) {
        const byStageId = columns.find(c => Number(c.odooStageId) === remoteStageId)
        if (byStageId) return byStageId.id
      }

      if (odooTask.stageName) {
        const normalized = String(odooTask.stageName).trim().toLowerCase()
        const byLabel = columns.find(c => String(c.label || '').trim().toLowerCase() === normalized)
        if (byLabel) return byLabel.id
      }

      return odooTask.status || 'todo'
    },
    async syncTicketStatusesForProject() {
      this.ticketStatusSyncMessage = null

      if (!this.project?.odooId || !this.odooConfigured) {
        this.ticketStatusSyncMessage = {
          type: 'error',
          message: '❌ Projet non lié à Odoo ou Odoo non configuré.'
        }
        return
      }

      this.syncingTicketStatuses = true
      try {
        const localTickets = (await db.getTicketsByProject(this.project.id)).filter(t => t.odooId)
        if (localTickets.length === 0) {
          this.ticketStatusSyncMessage = {
            type: 'success',
            message: 'ℹ️ Aucun ticket Odoo local à mettre à jour sur ce projet.'
          }
          return
        }

        let remoteTickets = await odooService.getTicketsByIds(
          localTickets.map(t => Number(t.odooId)).filter(id => Number.isFinite(id) && id > 0)
        )

        const initiallyMissingIds = localTickets
          .map(t => Number(t.odooId))
          .filter(id => Number.isFinite(id) && id > 0)
          .filter(id => !remoteTickets.some(rt => Number(rt.odooId) === id))

        if (initiallyMissingIds.length > 0) {
          const fallbackProjectTasks = await odooService.getProjectTasksByIds(initiallyMissingIds)
          if (fallbackProjectTasks.length > 0) {
            remoteTickets = [...remoteTickets, ...fallbackProjectTasks]
          }
        }

        // Fallback si la lecture directe retourne vide selon version/modules Odoo
        if (!remoteTickets.length) {
          remoteTickets = await odooService.getTasks([this.project.odooId])
        }

        const remoteByOdooId = new Map(
          remoteTickets.map(t => [Number(t.odooId), t]).filter(([id]) => Number.isFinite(id) && id > 0)
        )
        let updated = 0
        let unchanged = 0
        let missing = 0
        let doneDetected = 0

        for (const ticket of localTickets) {
          const remote = remoteByOdooId.get(Number(ticket.odooId))
          if (!remote) {
            missing++
            continue
          }

          const mappedStatus = this.mapImportedOdooTicketStatusToProjectColumn(remote)
          if (mappedStatus === 'done' || this.isCompletedStatus(mappedStatus)) {
            doneDetected++
          }

          if (mappedStatus !== ticket.status) {
            await db.updateTicket(ticket.id, { status: mappedStatus })
            updated++
          } else {
            unchanged++
          }
        }

        await this.loadTickets()

        this.ticketStatusSyncMessage = {
          type: 'success',
          message: `✅ États synchronisés : ${updated} modifié(s), ${unchanged} inchangé(s), ${missing} introuvable(s) côté Odoo, ${doneDetected} classé(s) terminé(s).`
        }
      } catch (error) {
        this.ticketStatusSyncMessage = {
          type: 'error',
          message: `❌ Erreur synchro états tickets : ${error.message || error}`
        }
      } finally {
        this.syncingTicketStatuses = false
      }
    },
    openTicketForm() {
      this.showTicketForm = true
      this.ticketForm = {
        ...this.ticketForm,
        assignedUserId: this.ticketForm.assignedUserId ?? this.currentUserId
      }
    },
    async saveTicket() {
      const sprintId = this.ticketFormOptions.addToCurrentSprint ? (this.currentSprintForSelectedProject?.id || null) : null

      const createdTicketKey = await db.addTicket({
        ...this.ticketForm,
        projectId: this.project.id,
        assignedUserId: this.ticketForm.assignedUserId ?? this.currentUserId,
        sprintId: sprintId
      })

      let odooSyncMessage = ''

      if (this.project?.odooId && odooService.isConfigured()) {
        try {
          const createdOdooId = await odooService.createHelpdeskTicketForProject(
            this.project.odooId,
            this.ticketForm.title,
            this.ticketForm.description || '',
            this.ticketForm.priority
          )

          const localTicketId = Number(createdTicketKey)
          if (Number.isFinite(localTicketId) && localTicketId > 0) {
            await db.updateTicket(localTicketId, { odooId: createdOdooId })
          }

          odooSyncMessage = ' • 🔄 synchronisé sur Odoo'
        } catch (syncError) {
          console.error('Erreur de synchronisation ticket vers Odoo:', syncError)
          odooSyncMessage = ' • ⚠️ non synchronisé sur Odoo'
        }
      }

      // Ajouter à la todo si demandé
      if (this.ticketFormOptions.addToTodo) {
        const todoText = `[TICKET] ${this.ticketForm.title}`
        const todos = await db.getAllTodos()
        const exists = todos.some(todo => !todo.completed && todo.text === todoText)
        if (!exists) {
          await db.addTodo(todoText)
        }
      }

      await this.loadTickets()
      await this.loadTodos()

      // Afficher confirmation avec actions effectuées
      const actions = []
      if (sprintId) actions.push('🏃 Ajouté au sprint en cours')
      if (this.ticketFormOptions.addToTodo) actions.push('📋 Ajouté à la todo')
      const message = actions.length > 0
        ? `✅ Ticket créé et ${actions.join(', ')}`
        : '✅ Ticket créé'
      alert(`${message}${odooSyncMessage}`)

      this.cancelTicketForm()
    },
    cancelTicketForm() {
      this.showTicketForm = false
      this.ticketForm = {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        estimatedTime: 0,
        assignedUserId: this.currentUserId,
        attachments: []
      }
      this.ticketFormOptions = {
        addToTodo: false,
        addToCurrentSprint: false
      }
    },
    async deleteTicketConfirm(ticket) {
      if (confirm(`Supprimer le ticket "${ticket.title}" ?`)) {
        await db.deleteTicket(ticket.id)
        await this.loadTickets()
      }
    },
    canSyncTicketToOdoo(ticket) {
      return !!(ticket && !ticket.odooId && this.project?.odooId && this.odooConfigured)
    },
    async syncTicketToOdoo(ticket) {
      if (!this.canSyncTicketToOdoo(ticket)) return

      try {
        const createdOdooId = await odooService.createHelpdeskTicketForProject(
          this.project.odooId,
          ticket.title,
          ticket.description || '',
          ticket.priority
        )

        await db.updateTicket(ticket.id, { odooId: createdOdooId })
        await this.loadTickets()
        alert('✅ Ticket synchronisé vers Odoo')
      } catch (error) {
        console.error('Erreur de synchronisation ticket vers Odoo:', error)
        alert(`❌ ${error.message || 'Erreur de synchronisation Odoo'}`)
      }
    },
    async addToCurrentSprint(ticket) {
      if (!this.effectiveCurrentSprint || !ticket?.id) return

      await db.updateTicket(ticket.id, { sprintId: this.effectiveCurrentSprint.id })
      await this.loadTickets()
    },
    async addLocalTaskToCurrentSprint(task) {
      if (!this.effectiveCurrentSprint || !task?.id) return

      await db.updateLocalTask(task.id, { sprintId: this.effectiveCurrentSprint.id })
      await this.loadLocalTasks()
    },
    async saveDefaultKanbanTemplatePreference() {
      if (!this.project?.id) return
      await db.updateProject(this.project.id, {
        useDefaultKanbanTemplate: this.project.useDefaultKanbanTemplate !== false
      })
      await this.loadProject()
      alert('✅ Préférence Kanban enregistrée')
    },
    async applyDefaultKanbanTemplateNow() {
      if (!this.project?.id) return
      await this.applyDefaultKanbanTemplateToProject(this.project.id, true)
      await this.loadProject()
      alert('✅ Étapes Kanban par défaut appliquées')
    },
    async applyDefaultKanbanTemplateToProject(projectId, force = false) {
      const defaultStages = [
        { name: 'À faire', sequence: 10, color: '#fff3cd', folded: false },
        { name: 'En cours', sequence: 20, color: '#cfe2ff', folded: false },
        { name: 'Terminé', sequence: 30, color: '#d1e7dd', folded: false }
      ]

      if (!force) {
        const existing = await db.getStagesByProject(projectId)
        if ((existing || []).length > 0) return
      }

      const allStages = await db.getAllKanbanStages()
      const stageItems = []
      const compatColumns = []

      for (const stageDef of defaultStages) {
        const existing = (allStages || []).find(s => String(s.name || '').trim().toLowerCase() === stageDef.name.toLowerCase())
        const stageId = existing?.id ? Number(existing.id) : Number(await db.addKanbanStage(stageDef))
        stageItems.push({ stageId, sequence: stageDef.sequence })
        compatColumns.push({ id: String(stageId), label: stageDef.name, color: stageDef.color })
      }

      await db.setProjectStages(projectId, stageItems)
      await db.updateProject(projectId, {
        useDefaultKanbanTemplate: true,
        kanbanColumns: compatColumns
      })
    },
    async addToTodoList(ticket) {
      if (!ticket?.title) return

      const todoText = this.getTodoText(ticket)
      const alreadyExists = !!this.todoByText.get(todoText)

      if (alreadyExists) {
        alert('Ce ticket est déjà présent dans votre todo list.')
        return
      }

      await db.addTodo(todoText)
      await this.loadTodos()
      alert('✅ Ticket ajouté à la todo list !')
    },
    async addOdooTaskToTodoList(task) {
      if (!task?.title) return

      const todoText = this.getTodoTextForOdooTask(task)
      const alreadyExists = !!this.todoByText.get(todoText)

      if (alreadyExists) {
        alert('Cette tâche Odoo est déjà présente dans votre todo list.')
        return
      }

      await db.addTodo(todoText)
      await this.loadTodos()
      alert('✅ Tâche Odoo ajoutée à la todo list !')
    },
    getTodoText(ticket) {
      if (ticket?.odooId) {
        return `[TICKET ODOO #${ticket.odooId}] ${ticket.title}`
      }
      return `[TICKET] ${ticket.title}`
    },
    getTodoForTicket(ticket) {
      const primaryKey = this.getTodoText(ticket)
      const foundPrimary = this.todoByText.get(primaryKey)
      if (foundPrimary) return foundPrimary

      // Compatibilité anciens todos (avant clé dédiée Odoo)
      const legacyKey = `[TICKET] ${ticket.title}`
      return this.todoByText.get(legacyKey) || null
    },
    getTodoTextForOdooTask(task) {
      return `[TÂCHE ODOO #${task.odooId}] ${task.title}`
    },
    getTodoForOdooTask(task) {
      return this.todoByText.get(this.getTodoTextForOdooTask(task)) || null
    },
    getTaskTimeForm(taskId) {
      if (!this.taskTimeForm[taskId]) {
        this.taskTimeForm[taskId] = {
          hours: 0,
          minutes: 0,
          date: new Date().toISOString().split('T')[0],
          description: ''
        }
      }
      return this.taskTimeForm[taskId]
    },
    isTaskTimeValid(taskId) {
      const form = this.getTaskTimeForm(taskId)
      return (form.hours > 0 || form.minutes > 0) && form.date
    },
    async addTimeToOdooTask(task) {
      const form = this.getTaskTimeForm(task.odooId)
      const duration = (form.hours * 60) + form.minutes

      if (duration <= 0) {
        alert('La durée doit être supérieure à 0')
        return
      }

      this.syncingTaskTime = true
      try {
        await odooService.createTaskTimeEntry(task.odooId, duration, form.date, form.description || '')
        this.taskTimeTotals[task.odooId] = (this.taskTimeTotals[task.odooId] || 0) + duration
        await db.updateOdooTaskByOdooId(task.odooId, { timeTotalMinutes: this.taskTimeTotals[task.odooId] })
        this.taskTimeForm[task.odooId] = {
          hours: 0,
          minutes: 0,
          date: new Date().toISOString().split('T')[0],
          description: ''
        }
        alert('✅ Temps saisi sur la tâche Odoo')
      } catch (error) {
        console.error('Erreur saisie temps tâche Odoo:', error)
        alert(`❌ ${error.message || 'Erreur de saisie de temps Odoo'}`)
      } finally {
        this.syncingTaskTime = false
      }
    },
    viewTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    },
    viewOdooTask(odooId) {
      this.$router.push(`/tasks/${odooId}`)
    },
    async toggleFavorite() {
      await db.toggleFavorite(this.project.id)
      await this.loadProject()
    },
    updateKanbanColumns(columns) {
      this.pendingKanbanColumns = columns
    },
    onKanbanSaved(stages) {
      // Synchroniser aussi le JSONB pour la compat descendante
      const cols = stages.map((s, i) => ({
        id: s.id ? s.id.toString() : `stage-${i}`,
        label: s.name || '',
        color: s.color || '#cfe2ff'
      }))
      this.pendingKanbanColumns = cols
    },
    async saveKanbanColumns() {
      // Appeler la méthode save() du composant relationnelle
      if (this.$refs.kanbanEditor) {
        await this.$refs.kanbanEditor.save()
        // Synchroniser aussi le JSONB pour la compat descendante
        if (this.pendingKanbanColumns) {
          const serializableColumns = JSON.parse(JSON.stringify(this.pendingKanbanColumns))
          await db.updateProject(this.project.id, { kanbanColumns: serializableColumns })
        }
        await this.loadProject()
        this.showKanbanEditor = false
        this.pendingKanbanColumns = null
      } else if (this.pendingKanbanColumns) {
        const serializableColumns = JSON.parse(JSON.stringify(this.pendingKanbanColumns))
        await db.updateProject(this.project.id, { kanbanColumns: serializableColumns })
        await this.loadProject()
        this.showKanbanEditor = false
        this.pendingKanbanColumns = null
      }
    },
    async saveChiffrageConfig() {
      await db.updateProject(this.project.id, {
        chiffrageEnabled: this.chiffrageConfig.enabled,
        tjm: this.chiffrageConfig.tjm,
        hoursPerDay: this.chiffrageConfig.hoursPerDay
      })
      await this.loadProject()
      this.showChiffrageConfig = false
      alert('✅ Configuration du chiffrage enregistrée')
    },
    async exportChiffrage() {
      if (!this.project) return

      const data = await db.exportChiffrage(this.project.id)
      
      if (data.tasks.length === 0) {
        alert('Aucune tâche locale avec chiffrage à exporter.')
        return
      }

      const hoursPerDay = data.project.hoursPerDay || 8
      const tjm = data.project.tjm || 0
      const now = new Date()
      const dateStr = now.toLocaleDateString('fr-FR')
      const timeStr = now.toLocaleTimeString('fr-FR')
      
      // Statistiques par lot
      const lotStats = {}
      data.tasks.forEach(task => {
        const lot = task.lotNumber || 'Sans lot'
        if (!lotStats[lot]) {
          lotStats[lot] = { count: 0, hours: 0, cost: 0 }
        }
        lotStats[lot].count++
        lotStats[lot].hours += task.estimatedTime || 0
        lotStats[lot].cost += ((task.estimatedTime || 0) / hoursPerDay) * tjm
      })
      
      // Statistiques par difficulté
      const difficultyStats = { easy: 0, medium: 0, hard: 0, expert: 0 }
      data.tasks.forEach(task => {
        const diff = task.difficulty || 'medium'
        difficultyStats[diff] = (difficultyStats[diff] || 0) + 1
      })
      
      // Statistiques par statut
      const statusStats = {}
      data.tasks.forEach(task => {
        const status = task.status || 'todo'
        statusStats[status] = (statusStats[status] || 0) + 1
      })

      // Créer le workbook
      const wb = XLSX.utils.book_new()

      // ==================== FEUILLE 1 : SYNTHÈSE GLOBALE ====================
      const synthese = [
        ['CHIFFRAGE PROJET', data.project.name.toUpperCase()],
        [],
        ['Date d\'export', `${dateStr} à ${timeStr}`],
        ['Chef de projet', ''],
        ['TJM configuré', `${tjm}€`],
        ['Heures par jour', `${hoursPerDay}h`],
        ['Nombre de tâches', data.tasks.length],
        [],
        ['TOTAUX'],
        ['Total heures estimées', `${data.totalEstimatedTime}h`],
        ['Total jours estimés', `${(data.totalEstimatedTime / hoursPerDay).toFixed(2)}j`],
        ['Coût total estimé', `${data.totalCost.toFixed(2)}€`],
        ['Coût moyen par tâche', `${(data.totalCost / data.tasks.length).toFixed(2)}€`],
        [],
        ['MARGE DE SÉCURITÉ'],
        ['Coût avec marge 15%', `${(data.totalCost * 1.15).toFixed(2)}€`],
        ['Durée avec marge 15%', `${(data.totalEstimatedTime * 1.15 / hoursPerDay).toFixed(2)}j`],
        ['Coût avec marge 20%', `${(data.totalCost * 1.20).toFixed(2)}€`],
        ['Durée avec marge 20%', `${(data.totalEstimatedTime * 1.20 / hoursPerDay).toFixed(2)}j`],
      ]
      const wsSynthese = XLSX.utils.aoa_to_sheet(synthese)
      wsSynthese['!cols'] = [{ wch: 25 }, { wch: 30 }]
      
      // Styles pour la synthèse
      if (wsSynthese['A1']) {
        wsSynthese['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } }, alignment: { horizontal: 'center' } }
      }
      if (wsSynthese['B1']) {
        wsSynthese['B1'].s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      if (wsSynthese['A9']) {
        wsSynthese['A9'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2E5C8A" } } }
      }
      if (wsSynthese['A15']) {
        wsSynthese['A15'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2E5C8A" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, wsSynthese, '📊 Synthèse')

      // ==================== FEUILLE 2 : PAR DIFFICULTÉ ====================
      const parDifficulte = [
        ['RÉPARTITION PAR DIFFICULTÉ'],
        [],
        ['Difficulté', 'Nombre de tâches', 'Pourcentage'],
        ['🟢 Facile', difficultyStats.easy || 0, `${((difficultyStats.easy || 0) / data.tasks.length * 100).toFixed(1)}%`],
        ['🟡 Moyen', difficultyStats.medium || 0, `${((difficultyStats.medium || 0) / data.tasks.length * 100).toFixed(1)}%`],
        ['🟠 Difficile', difficultyStats.hard || 0, `${((difficultyStats.hard || 0) / data.tasks.length * 100).toFixed(1)}%`],
        ['🔴 Expert', difficultyStats.expert || 0, `${((difficultyStats.expert || 0) / data.tasks.length * 100).toFixed(1)}%`],
        [],
        ['TOTAL', data.tasks.length, '100%']
      ]
      const wsDifficulte = XLSX.utils.aoa_to_sheet(parDifficulte)
      wsDifficulte['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }]
      
      if (wsDifficulte['A1']) {
        wsDifficulte['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      if (wsDifficulte['A3']) {
        wsDifficulte['A3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } } }
      }
      if (wsDifficulte['B3']) {
        wsDifficulte['B3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } } }
      }
      if (wsDifficulte['C3']) {
        wsDifficulte['C3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4472C4" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, wsDifficulte, '📈 Par Difficulté')

      // ==================== FEUILLE 3 : PAR STATUT ====================
      const parStatut = [
        ['RÉPARTITION PAR STATUT'],
        [],
        ['Statut', 'Nombre de tâches', 'Pourcentage']
      ]
      Object.entries(statusStats).forEach(([status, count]) => {
        const label = this.getTicketStatusLabel(status)
        parStatut.push([label, count, `${(count / data.tasks.length * 100).toFixed(1)}%`])
      })
      parStatut.push([])
      parStatut.push(['TOTAL', data.tasks.length, '100%'])
      
      const wsStatut = XLSX.utils.aoa_to_sheet(parStatut)
      wsStatut['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }]
      
      if (wsStatut['A1']) {
        wsStatut['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      if (wsStatut['A3']) {
        wsStatut['A3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "70AD47" } } }
      }
      if (wsStatut['B3']) {
        wsStatut['B3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "70AD47" } } }
      }
      if (wsStatut['C3']) {
        wsStatut['C3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "70AD47" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, wsStatut, '📊 Par Statut')

      // ==================== FEUILLE 4 : PAR LOT ====================
      const parLot = [
        ['SYNTHÈSE PAR LOT'],
        [],
        ['Lot', 'Nb tâches', 'Heures', 'Jours', 'Coût (€)', '% du total']
      ]
      Object.entries(lotStats).forEach(([lot, stats]) => {
        const days = (stats.hours / hoursPerDay).toFixed(2)
        const percent = (stats.cost / data.totalCost * 100).toFixed(1)
        parLot.push([lot, stats.count, `${stats.hours}h`, `${days}j`, `${stats.cost.toFixed(2)}€`, `${percent}%`])
      })
      parLot.push([])
      parLot.push(['TOTAL', data.tasks.length, `${data.totalEstimatedTime}h`, `${(data.totalEstimatedTime / hoursPerDay).toFixed(2)}j`, `${data.totalCost.toFixed(2)}€`, '100%'])
      
      const wsLot = XLSX.utils.aoa_to_sheet(parLot)
      wsLot['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
      
      if (wsLot['A1']) {
        wsLot['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      if (wsLot['A3']) {
        wsLot['A3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      if (wsLot['B3']) {
        wsLot['B3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      if (wsLot['C3']) {
        wsLot['C3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      if (wsLot['D3']) {
        wsLot['D3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      if (wsLot['E3']) {
        wsLot['E3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      if (wsLot['F3']) {
        wsLot['F3'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "FFC000" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, wsLot, '📦 Par Lot')

      // ==================== FEUILLE 5 : DÉTAIL DES TÂCHES ====================
      const detailTaches = [
        ['DÉTAIL DES TÂCHES'],
        [],
        ['N°', 'Lot', 'Titre', 'Difficulté', 'Priorité', 'Heures', 'Jours', 'Coût (€)', 'Statut', 'Description']
      ]
      
      // Trier par lot puis par difficulté
      const sortedTasks = [...data.tasks].sort((a, b) => {
        const lotA = a.lotNumber || 'ZZZ'
        const lotB = b.lotNumber || 'ZZZ'
        if (lotA !== lotB) return lotA.localeCompare(lotB)
        
        const diffOrder = { expert: 0, hard: 1, medium: 2, easy: 3 }
        return diffOrder[a.difficulty || 'medium'] - diffOrder[b.difficulty || 'medium']
      })
      
      sortedTasks.forEach((task, index) => {
        const lotNumber = task.lotNumber || 'Sans lot'
        const title = task.title || ''
        const difficulty = this.getDifficultyLabel(task.difficulty || 'medium')
        const priority = this.getPriorityLabel(task.priority || 'medium')
        const estimatedTime = task.estimatedTime || 0
        const days = (estimatedTime / hoursPerDay).toFixed(2)
        const cost = ((estimatedTime / hoursPerDay) * tjm).toFixed(2)
        const status = this.getTicketStatusLabel(task.status || 'todo')
        const description = this.extractText(task.description || '').substring(0, 200)
        
        detailTaches.push([index + 1, lotNumber, title, difficulty, priority, estimatedTime, days, cost, status, description])
      })
      
      detailTaches.push([])
      detailTaches.push(['', 'TOTAL', `${data.tasks.length} tâches`, '', '', data.totalEstimatedTime, (data.totalEstimatedTime / hoursPerDay).toFixed(2), data.totalCost.toFixed(2), '', ''])
      
      const wsDetail = XLSX.utils.aoa_to_sheet(detailTaches)
      wsDetail['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 50 }]
      
      if (wsDetail['A1']) {
        wsDetail['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      const headerCells = ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3', 'J3']
      headerCells.forEach(cell => {
        if (wsDetail[cell]) {
          wsDetail[cell].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "C00000" } }, alignment: { horizontal: 'center' } }
        }
      })
      
      XLSX.utils.book_append_sheet(wb, wsDetail, '📋 Détail Tâches')

      // ==================== FEUILLE 6 : RECOMMANDATIONS ====================
      const recommandations = [
        ['NOTES ET RECOMMANDATIONS'],
        [],
        ['💡 Ce chiffrage est une estimation basée sur les informations disponibles'],
        ['⚠️ Prévoir une marge de 15-20% pour les imprévus et ajustements'],
        [],
        ['ESTIMATIONS AVEC MARGES'],
        [],
        ['Marge', 'Coût estimé', 'Durée estimée (jours)'],
        ['Sans marge (baseline)', `${data.totalCost.toFixed(2)}€`, (data.totalEstimatedTime / hoursPerDay).toFixed(2)],
        ['Marge 10%', `${(data.totalCost * 1.10).toFixed(2)}€`, (data.totalEstimatedTime * 1.10 / hoursPerDay).toFixed(2)],
        ['Marge 15% (recommandée)', `${(data.totalCost * 1.15).toFixed(2)}€`, (data.totalEstimatedTime * 1.15 / hoursPerDay).toFixed(2)],
        ['Marge 20%', `${(data.totalCost * 1.20).toFixed(2)}€`, (data.totalEstimatedTime * 1.20 / hoursPerDay).toFixed(2)],
        ['Marge 25%', `${(data.totalCost * 1.25).toFixed(2)}€`, (data.totalEstimatedTime * 1.25 / hoursPerDay).toFixed(2)],
        [],
        ['FACTEURS DE RISQUE À CONSIDÉRER'],
        ['• Complexité technique imprévue'],
        ['• Dépendances externes'],
        ['• Disponibilité des ressources'],
        ['• Changements de périmètre'],
        ['• Formation et montée en compétence'],
        [],
        [`Document généré le ${dateStr} à ${timeStr}`]
      ]
      
      const wsReco = XLSX.utils.aoa_to_sheet(recommandations)
      wsReco['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 25 }]
      
      if (wsReco['A1']) {
        wsReco['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F4788" } } }
      }
      if (wsReco['A6']) {
        wsReco['A6'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7030A0" } } }
      }
      if (wsReco['A8']) {
        wsReco['A8'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7030A0" } } }
      }
      if (wsReco['B8']) {
        wsReco['B8'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7030A0" } } }
      }
      if (wsReco['C8']) {
        wsReco['C8'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7030A0" } } }
      }
      if (wsReco['A15']) {
        wsReco['A15'].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "C00000" } } }
      }
      
      XLSX.utils.book_append_sheet(wb, wsReco, '💡 Recommandations')

      // Générer et télécharger le fichier
      const withMargin = data.totalCost * 1.15
      XLSX.writeFile(wb, `CHIFFRAGE_${this.project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`)
      
      alert(`✅ Export Excel professionnel généré avec 6 feuilles\n\n📊 ${data.tasks.length} tâches\n⏱️ ${data.totalEstimatedTime}h (${(data.totalEstimatedTime / hoursPerDay).toFixed(1)}j)\n💰 ${data.totalCost.toFixed(2)}€\n📈 Avec marge 15% : ${withMargin.toFixed(2)}€`)
    },
    getDifficultyLabel(difficulty) {
      const labels = {
        'easy': 'Facile',
        'medium': 'Moyen',
        'hard': 'Difficile',
        'expert': 'Expert'
      }
      return labels[difficulty] || difficulty
    },
    getDifficultyBadgeStyle(difficulty) {
      const styles = {
        'easy': { background: '#28a745', color: 'white' },
        'medium': { background: '#ffc107', color: '#000' },
        'hard': { background: '#fd7e14', color: 'white' },
        'expert': { background: '#dc3545', color: 'white' }
      }
      return styles[difficulty] || { background: '#6c757d', color: 'white' }
    },
    // === GESTION IA ===
    getProviderName() {
      const names = {
        openai: 'OpenAI',
        anthropic: 'Anthropic Claude',
        google: 'Google Gemini',
        grok: 'Grok (xAI)',
        ollama: 'Ollama (Local)'
      }
      return names[this.aiProvider] || 'OpenAI'
    },
    getApiKeyPlaceholder() {
      const placeholders = {
        openai: 'sk-...',
        anthropic: 'sk-ant-...',
        google: 'AIza...',
        grok: 'xai-...'
      }
      return placeholders[this.aiProvider] || 'Clé API'
    },
    saveApiKey() {
      if (!this.aiApiKeyInput.trim()) {
        alert('❌ Veuillez entrer une clé API')
        return
      }
      localStorage.setItem('openai_api_key', this.aiApiKeyInput.trim())
      localStorage.setItem('ai_provider', this.aiProvider)
      this.aiApiKey = this.aiApiKeyInput.trim()
      this.aiApiKeyInput = ''
      alert(`✅ Clé API ${this.getProviderName()} enregistrée localement`)
    },
    removeApiKey() {
      if (!confirm('Supprimer la clé API ?')) return
      localStorage.removeItem('openai_api_key')
      localStorage.removeItem('ai_provider')
      this.aiApiKey = ''
      alert('✅ Clé API supprimée')
    },
    handleFileUpload(event) {
      const file = event.target.files[0]
      if (!file) return

      this.uploadedFile = file
      this.uploadedFileName = file.name
      this.uploadedFileSize = `${(file.size / 1024).toFixed(1)} Ko`

      const reader = new FileReader()
      reader.onload = (e) => {
        this.uploadedFileContent = e.target.result
      }
      reader.readAsText(file)
    },
    async generateTasksWithAI() {
      if (!this.canGenerateAi) return

      this.aiGenerating = true
      this.generatedTasks = []

      try {
        const content = this.aiGenerationMethod === 'prompt' 
          ? this.aiPrompt 
          : `Voici le cahier des charges :\n\n${this.uploadedFileContent}`

        const systemPrompt = `Tu es un expert en gestion de projet. Tu dois analyser une description de projet ou un cahier des charges et générer une liste de tâches détaillées au format JSON.

Pour chaque tâche, tu dois fournir :
- title: titre clair et concis de la tâche
- description: description détaillée en HTML (avec balises <p>, <ul>, <li>, <strong>, etc.)
${this.aiOptions.assignLots ? '- lotNumber: numéro de lot logique (ex: LOT-001, LOT-002...)' : ''}
${this.aiOptions.estimateDifficulty ? '- difficulty: "easy", "medium", "hard" ou "expert"' : ''}
${this.aiOptions.includeChiffrage && this.project?.chiffrageEnabled ? '- estimatedTime: temps estimé en heures (nombre décimal)' : ''}
- priority: "low", "medium" ou "high"

Les tâches doivent être :
- Spécifiques et actionnables
- Organisées de manière logique
${this.aiOptions.assignLots ? '- Groupées en lots fonctionnels cohérents' : ''}
- Avec des estimations réalistes

Retourne UNIQUEMENT un tableau JSON valide sans texte additionnel.`

        let response, data, tasksText

        // Vérifier si le proxy est accessible (sauf pour Ollama qui est local)
        if (this.aiProvider !== 'ollama') {
          try {
            const proxyCheck = await fetch('http://localhost:3001/api/ai/anthropic', { method: 'HEAD' })
          } catch (e) {
            throw new Error('❌ Proxy non accessible. Lancez "node proxy.js" dans un terminal séparé ou "npm run dev:full"')
          }
        }

        // Appel selon le provider
        if (this.aiProvider === 'openai') {
          response = await fetch('http://localhost:3001/api/ai/openai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.aiApiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
              ],
              temperature: 0.7
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error?.message || 'Erreur API OpenAI')
          }

          data = await response.json()
          console.log('Réponse OpenAI:', data)
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Structure de réponse invalide:', data)
            throw new Error(`Structure de réponse invalide. Réponse: ${JSON.stringify(data).substring(0, 200)}`)
          }
          
          tasksText = data.choices[0].message.content.trim()

        } else if (this.aiProvider === 'grok') {
          response = await fetch('http://localhost:3001/api/ai/grok', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.aiApiKey}`
            },
            body: JSON.stringify({
              model: 'grok-beta',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content }
              ],
              temperature: 0.7
            })
          })

          if (!response.ok) {
            const text = await response.text()
            let errorMsg = 'Erreur API Grok'
            try {
              const error = JSON.parse(text)
              errorMsg = error.error?.message || errorMsg
            } catch (e) {
              errorMsg = text.substring(0, 200)
            }
            throw new Error(errorMsg)
          }

          data = await response.json()
          console.log('Réponse Grok:', data)
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Structure de réponse invalide:', data)
            throw new Error(`Structure de réponse invalide. Réponse: ${JSON.stringify(data).substring(0, 200)}`)
          }
          
          tasksText = data.choices[0].message.content.trim()

        } else if (this.aiProvider === 'anthropic') {
          response = await fetch('http://localhost:3001/api/ai/anthropic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.aiApiKey}`
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 8000,
              messages: [
                {
                  role: 'user',
                  content: `${systemPrompt}\n\n${content}`
                }
              ]
            })
          })

          if (!response.ok) {
            const text = await response.text()
            let errorMsg = 'Erreur API Anthropic'
            try {
              const error = JSON.parse(text)
              errorMsg = error.error?.message || errorMsg
            } catch (e) {
              errorMsg = text.substring(0, 200)
            }
            throw new Error(errorMsg)
          }

          data = await response.json()
          console.log('Réponse Anthropic:', data)
          
          if (!data.content || !data.content[0] || !data.content[0].text) {
            console.error('Structure de réponse invalide:', data)
            throw new Error(`Structure de réponse invalide. Réponse: ${JSON.stringify(data).substring(0, 200)}`)
          }
          
          tasksText = data.content[0].text.trim()

        } else if (this.aiProvider === 'google') {
          response = await fetch(`http://localhost:3001/api/ai/google?key=${this.aiApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\n${content}`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096
              }
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error?.message || 'Erreur API Google')
          }

          data = await response.json()
          tasksText = data.candidates[0].content.parts[0].text.trim()

        } else if (this.aiProvider === 'ollama') {
          localStorage.setItem('ollama_model', this.ollamaModel)
          
          response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.ollamaModel,
              prompt: `${systemPrompt}\n\n${content}`,
              stream: false,
              options: {
                temperature: 0.7
              }
            })
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Ollama non accessible. Vérifiez que Ollama est lancé et que le modèle ${this.ollamaModel} est téléchargé. Erreur: ${errorText}`)
          }

          data = await response.json()
          console.log('Réponse Ollama:', data)
          
          if (!data.response) {
            throw new Error('Pas de réponse du modèle Ollama')
          }
          
          tasksText = data.response.trim()
        }
        
        // Parser le JSON (enlever les markdown code blocks si présents)
        const jsonMatch = tasksText.match(/```json\s*([\s\S]*?)\s*```/) || tasksText.match(/```\s*([\s\S]*?)\s*```/)
        const jsonText = jsonMatch ? jsonMatch[1] : tasksText
        const tasks = JSON.parse(jsonText)

        if (!Array.isArray(tasks)) {
          throw new Error('Le format de réponse n\'est pas un tableau')
        }

        // Formater les tâches
        this.generatedTasks = tasks.map(task => ({
          title: task.title || '',
          description: task.description || '',
          status: 'todo',
          priority: task.priority || 'medium',
          isChiffrage: this.aiOptions.includeChiffrage && this.project?.chiffrageEnabled,
          lotNumber: task.lotNumber || '',
          difficulty: task.difficulty || 'medium',
          estimatedTime: task.estimatedTime || 0
        }))

        alert(`✨ ${this.generatedTasks.length} tâche(s) générée(s) avec succès !`)

      } catch (error) {
        console.error('Erreur génération IA:', error)
        alert(`${error.message}`)
      } finally {
        this.aiGenerating = false
      }
    },
    async saveGeneratedTasks() {
      if (this.generatedTasks.length === 0) return

      try {
        for (const task of this.generatedTasks) {
          await db.addLocalTask({
            projectId: this.project.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            startDate: new Date().toISOString().split('T')[0],
            isChiffrage: task.isChiffrage,
            lotNumber: task.lotNumber,
            difficulty: task.difficulty,
            estimatedTime: task.estimatedTime
          })
        }

        await this.loadLocalTasks()
        this.generatedTasks = []
        this.showAiTaskGenerator = false
        this.aiPrompt = ''
        this.uploadedFile = null
        this.uploadedFileName = ''
        this.uploadedFileContent = ''

        alert(`✅ ${this.generatedTasks.length} tâche(s) enregistrée(s) !`)
      } catch (error) {
        console.error('Erreur sauvegarde:', error)
        alert(`❌ Erreur lors de la sauvegarde: ${error.message}`)
      }
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
    getTicketStatusClass(status) {
      const classes = {
        'todo': 'badge-warning',
        'in-progress': 'badge-info',
        'done': 'badge-success'
      }
      return classes[status] || 'badge-info'
    },
    getTicketStatusLabel(status) {
      // Chercher dans les colonnes effectives du projet
      const col = this.effectiveColumns.find(c => String(c.id) === String(status))
      if (col) return col.label
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

      await this.loadTickets()
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    },
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '0h'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins}min`
      if (mins === 0) return `${hours}h`
      return `${hours}h${mins.toString().padStart(2, '0')}`
    },
    extractText(html) {
      if (!html) return ''
      const temp = document.createElement('div')
      temp.innerHTML = html
      return temp.textContent || temp.innerText || ''
    },
    truncateHtml(html, maxLength = 100) {
      if (!html) return ''
      const text = this.extractText(html)

      if (text.length <= maxLength) {
        return html
      }

      return text.substring(0, maxLength) + '...'
    },
    getTicketsByKanbanStatus(status) {
      if (status === '__other__') {
        const baseColumns = this.effectiveColumns

        return this.filteredTickets.filter(ticket => {
          return !baseColumns.some(col => String(col.id) === String(ticket.status))
        })
      }

      return this.filteredTickets.filter(ticket => String(ticket.status) === String(status))
    },
    onTicketDragStart(ticketId) {
      this.draggedTicketId = ticketId
    },
    onTicketDragEnd() {
      this.draggedTicketId = null
    },
    async onTicketDrop(newStatus) {
      if (!this.draggedTicketId || newStatus === '__other__') {
        this.draggedTicketId = null
        return
      }

      const ticket = this.tickets.find(t => t.id === this.draggedTicketId)
      if (!ticket || ticket.status === newStatus) {
        this.draggedTicketId = null
        return
      }

      await db.updateTicket(this.draggedTicketId, { status: newStatus })
      await this.loadTickets()
      this.draggedTicketId = null
    },
    getLocalTasksByKanbanStatus(status) {
      const baseColumns = this.effectiveColumns

      if (status === '__other__') {
        return this.filteredLocalTasks.filter(task => {
          return !baseColumns.some(col => String(col.id) === String(task.status))
        })
      }

      return this.filteredLocalTasks.filter(task => String(task.status) === String(status))
    },
    onLocalTaskDragStart(taskId) {
      this.draggedLocalTaskId = taskId
    },
    onLocalTaskDragEnd() {
      this.draggedLocalTaskId = null
    },
    async onLocalTaskDrop(newStatus) {
      if (!this.draggedLocalTaskId || newStatus === '__other__') {
        this.draggedLocalTaskId = null
        return
      }

      const task = this.localTasks.find(t => t.id === this.draggedLocalTaskId)
      if (!task || task.status === newStatus) {
        this.draggedLocalTaskId = null
        return
      }

      const updates = { status: newStatus }
      const parsedStageId = Number.parseInt(newStatus, 10)
      if (Number.isFinite(parsedStageId)) {
        updates.stageId = parsedStageId
      }

      await db.updateLocalTask(this.draggedLocalTaskId, updates)
      await this.loadLocalTasks()
      this.draggedLocalTaskId = null
    },
    // ===== SELECTION MULTIPLE TICKETS =====
    toggleTicketSelectMode() {
      this.ticketSelectMode = !this.ticketSelectMode
      if (!this.ticketSelectMode) {
        this.selectedTicketIds = []
        this.bulkTicketStatus = ''
        this.bulkTicketPriority = ''
      }
    },
    toggleTicketSelection(ticketId) {
      const index = this.selectedTicketIds.indexOf(ticketId)
      if (index > -1) {
        this.selectedTicketIds.splice(index, 1)
      } else {
        this.selectedTicketIds.push(ticketId)
      }
    },
    isTicketSelected(ticketId) {
      return this.selectedTicketIds.includes(ticketId)
    },
    selectAllTickets() {
      if (this.allTicketsSelected) {
        this.selectedTicketIds = []
      } else {
        this.selectedTicketIds = this.filteredTickets.map(t => t.id)
      }
    },
    async applyBulkTicketStatus() {
      if (!this.bulkTicketStatus || this.selectedTicketIds.length === 0) return
      for (const ticketId of this.selectedTicketIds) {
        await db.updateTicket(ticketId, { status: this.bulkTicketStatus })
      }
      this.bulkTicketStatus = ''
      await this.loadTickets()
    },
    async applyBulkTicketPriority() {
      if (!this.bulkTicketPriority || this.selectedTicketIds.length === 0) return
      for (const ticketId of this.selectedTicketIds) {
        await db.updateTicket(ticketId, { priority: this.bulkTicketPriority })
      }
      this.bulkTicketPriority = ''
      await this.loadTickets()
    },
    // ===== SELECTION MULTIPLE TACHES LOCALES =====
    toggleLocalTaskSelectMode() {
      this.localTaskSelectMode = !this.localTaskSelectMode
      if (!this.localTaskSelectMode) {
        this.selectedLocalTaskIds = []
        this.bulkLocalTaskStatus = ''
        this.bulkLocalTaskPriority = ''
      }
    },
    toggleLocalTaskSelection(taskId) {
      const index = this.selectedLocalTaskIds.indexOf(taskId)
      if (index > -1) {
        this.selectedLocalTaskIds.splice(index, 1)
      } else {
        this.selectedLocalTaskIds.push(taskId)
      }
    },
    isLocalTaskSelected(taskId) {
      return this.selectedLocalTaskIds.includes(taskId)
    },
    selectAllLocalTasks() {
      if (this.allLocalTasksSelected) {
        this.selectedLocalTaskIds = []
      } else {
        this.selectedLocalTaskIds = this.filteredLocalTasks.map(t => t.id)
      }
    },
    async applyBulkLocalTaskStatus() {
      if (!this.bulkLocalTaskStatus || this.selectedLocalTaskIds.length === 0) return
      for (const taskId of this.selectedLocalTaskIds) {
        await db.updateLocalTask(taskId, { status: this.bulkLocalTaskStatus })
      }
      this.bulkLocalTaskStatus = ''
      await this.loadLocalTasks()
    },
    async applyBulkLocalTaskPriority() {
      if (!this.bulkLocalTaskPriority || this.selectedLocalTaskIds.length === 0) return
      for (const taskId of this.selectedLocalTaskIds) {
        await db.updateLocalTask(taskId, { priority: this.bulkLocalTaskPriority })
      }
      this.bulkLocalTaskPriority = ''
      await this.loadLocalTasks()
    },
    // ===== LOCAL TASKS =====
    async loadLocalTasks() {
      const id = parseInt(this.$route.params.id)
      const tasks = await db.getLocalTasksByProject(id)
      this.localTasks = (tasks || []).map(task => ({
        ...task,
        startDate: task.startDate ? this.toDateOnlyString(task.startDate) : null
      }))
    },
    async saveLocalTask() {
      const activeSprintId = this.currentSprintForSelectedProject?.id || null
      const sprintId = this.localTaskFormOptions.addToCurrentSprint
        ? activeSprintId
        : (this.localTaskForm.sprintId || null)

      if (this.localTaskFormOptions.addToCurrentSprint && !activeSprintId) {
        alert('Aucun sprint actif sur ce projet.')
        return
      }

      const payload = {
        ...this.localTaskForm,
        sprintId,
        startDate: this.localTaskForm.startDate ? this.toDateOnlyString(this.localTaskForm.startDate) : null
      }

      if (this.localTaskForm.id) {
        // Mise à jour d'une tâche existante
        await db.updateLocalTask(this.localTaskForm.id, payload)
      } else {
        // Création d'une nouvelle tâche
        await db.addLocalTask({
          ...payload,
          assignedUserId: this.localTaskForm.assignedUserId ?? this.currentUserId,
          projectId: this.project.id
        })
      }
      await this.loadLocalTasks()
      this.cancelLocalTaskForm()
    },
    openLocalTaskForm() {
      const activeSprint = this.currentSprintForSelectedProject
      const columns = this.effectiveColumns
      const defaultStatus = columns[0]?.id || 'todo'
      this.showLocalTaskForm = true
      this.localTaskFormOptions = {
        addToCurrentSprint: !!activeSprint
      }
      this.localTaskForm = {
        ...this.localTaskForm,
        status: defaultStatus,
        sprintId: this.localTaskForm.sprintId ?? (activeSprint?.id || null),
        startDate: this.localTaskForm.startDate || new Date().toISOString().split('T')[0],
        assignedUserId: this.localTaskForm.assignedUserId ?? this.currentUserId
      }
    },
    cancelLocalTaskForm() {
      const activeSprint = this.currentSprintForSelectedProject
      const columns = this.effectiveColumns
      const defaultStatus = columns[0]?.id || 'todo'
      this.showLocalTaskForm = false
      this.localTaskFormOptions = {
        addToCurrentSprint: false
      }
      this.localTaskForm = {
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        sprintId: activeSprint?.id || null,
        startDate: new Date().toISOString().split('T')[0],
        assignedUserId: this.currentUserId,
        isChiffrage: false,
        lotNumber: '',
        difficulty: '',
        estimatedTime: 0,
        attachments: []
      }
    },
    async editLocalTask(task) {
      this.localTaskFormOptions = {
        addToCurrentSprint: false
      }
      const columns = this.effectiveColumns
      // Si le statut actuel de la tâche ne correspond à aucune colonne du projet,
      // on le normalise vers la première colonne disponible
      const statusExists = columns.some(col => String(col.id) === String(task.status))
      const normalizedStatus = statusExists ? task.status : (columns[0]?.id || 'todo')
      this.localTaskForm = {
        ...task,
        status: normalizedStatus,
        startDate: task.startDate || new Date().toISOString().split('T')[0],
        assignedUserId: task.assignedUserId ?? null
      }
      this.showLocalTaskForm = true
    },
    handleLocalTaskCurrentSprintToggle() {
      if (this.localTaskFormOptions.addToCurrentSprint) {
        this.localTaskForm.sprintId = this.currentSprintForSelectedProject?.id || null
      }
    },
    async deleteLocalTaskConfirm(task) {
      if (confirm(`Supprimer la tâche "${task.title}" ?`)) {
        if (task.id) {
          await db.deleteLocalTask(task.id)
          await this.loadLocalTasks()
        }
      }
    },
    // ===== GESTION FICHIERS =====
    async handleLocalTaskFileUpload(event) {
      const files = Array.from(event.target.files)
      if (!files.length) return

      const maxSize = 5 * 1024 * 1024 // 5MB
      
      for (const file of files) {
        if (file.size > maxSize) {
          alert(`❌ Le fichier "${file.name}" dépasse 5MB`)
          continue
        }

        try {
          const base64 = await this.fileToBase64(file)
          const attachment = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedAt: new Date().toISOString()
          }
          
          if (!this.localTaskForm.attachments) {
            this.localTaskForm.attachments = []
          }
          
          this.localTaskForm.attachments.push(attachment)
        } catch (error) {
          console.error('Erreur lecture fichier:', error)
          alert(`❌ Erreur lors de l'upload de "${file.name}"`)
        }
      }
      
      // Réinitialiser l'input pour permettre de re-sélectionner le même fichier
      event.target.value = ''
    },
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
        reader.readAsDataURL(file)
      })
    },
    removeLocalTaskAttachment(index) {
      if (confirm('Supprimer ce fichier ?')) {
        this.localTaskForm.attachments.splice(index, 1)
      }
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
    },
    previewAttachment(attachment) {
      this.currentAttachment = attachment
      this.showAttachmentPreview = true
    },
    closeAttachmentPreview() {
      this.showAttachmentPreview = false
      this.currentAttachment = null
    },
    downloadAttachment(attachment) {
      const link = document.createElement('a')
      link.href = attachment.data
      link.download = attachment.name
      link.click()
    },
    isImageFile(type) {
      return type.startsWith('image/')
    },
    isPdfFile(type) {
      return type === 'application/pdf'
    },
    getFileIcon(type) {
      if (type.startsWith('image/')) return '🖼️'
      if (type === 'application/pdf') return '📄'
      if (type.includes('word') || type.includes('document')) return '📝'
      if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
      if (type.includes('zip') || type.includes('archive')) return '📦'
      return '📎'
    },
    async handleTicketFileUpload(event) {
      const files = Array.from(event.target.files)
      if (!files.length) return

      const maxSize = 5 * 1024 * 1024 // 5MB
      
      for (const file of files) {
        if (file.size > maxSize) {
          alert(`❌ Le fichier "${file.name}" dépasse 5MB`)
          continue
        }

        try {
          const base64 = await this.fileToBase64(file)
          const attachment = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
            uploadedAt: new Date().toISOString()
          }
          
          if (!this.ticketForm.attachments) {
            this.ticketForm.attachments = []
          }
          
          this.ticketForm.attachments.push(attachment)
        } catch (error) {
          console.error('Erreur lecture fichier:', error)
          alert(`❌ Erreur lors de l'upload de "${file.name}"`)
        }
      }
      
      event.target.value = ''
    },
    removeTicketAttachment(index) {
      if (confirm('Supprimer ce fichier ?')) {
        this.ticketForm.attachments.splice(index, 1)
      }
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

.btn-favorite {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
  color: #ccc;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sprint-info-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #e8f5e9;
  border-left: 4px solid #4DBA87;
  border-radius: 6px;
  color: #2e7d32;
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

.ticket-card.selected,
.task-card.selected {
  border: 2px solid #007bff;
  background-color: #f0f8ff;
}

.select-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.ticket-card {
  transition: transform 0.2s;
}

.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.ticket-header h3 {
  margin: 0 0 0.5rem 0;
}

.clickable-title {
  cursor: pointer;
}

.ticket-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.view-toggle {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
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
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sprint-tag {
  color: #2e7d32;
  font-weight: 600;
}

.todo-tag {
  color: #0d6efd;
  font-weight: 600;
}

.odoo-tasks-section {
  border-left: 4px solid #ff9800;
}

.task-card {
  border: 1px solid #ffe0b2;
  background: #fffaf3;
}

.alert-inline {
  padding: 0.75rem 1rem;
  background: #f5f5f5;
  border-radius: 6px;
  color: #555;
}

.alert-inline.alert-error {
  background: #fdecea;
  color: #b71c1c;
}

.task-time-form {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eee;
}

.task-time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr auto;
  gap: 0.75rem;
  align-items: end;
}

.time-tag {
  color: #ef6c00;
  font-weight: 600;
}

/* Styles pour les pièces jointes */
.attachments-preview {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.attachment-item:hover {
  background: #e9ecef;
  border-color: #4DBA87;
}

.attachment-name {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  font-size: 0.75rem;
  color: #6c757d;
}

.uploaded-files {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.uploaded-file-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.uploaded-file-item span {
  font-size: 0.875rem;
}

.uploaded-file-item .attachment-name {
  flex: 1;
}

.uploaded-file-item button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.uploaded-file-item button:hover {
  background: #c82333;
}

/* Modale de prévisualisation */
.attachment-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.attachment-modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.attachment-modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.attachment-modal-header h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-modal-header small {
  color: #6c757d;
}

.attachment-modal-body {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-pdf {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 8px;
}

.preview-download {
  text-align: center;
  padding: 2rem;
}

/* Vue pièces jointes */
.attachments-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.attachment-grid-item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.attachment-grid-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-color: #4DBA87;
}

.attachment-grid-preview {
  width: 100%;
  height: 180px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.attachment-grid-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-grid-icon {
  font-size: 4rem;
}

.attachment-grid-info {
  padding: 1rem;
}

.attachment-grid-name {
  font-weight: 600;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-grid-meta {
  font-size: 0.875rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.attachment-grid-source {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.attachment-grid-date {
  font-size: 0.75rem;
  color: #adb5bd;
}

.inline-toggle {
  display: inline-flex;
  gap: 0.35rem;
  margin-right: 0.25rem;
}

.project-ticket-kanban {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.project-ticket-kanban-column {
  min-width: 280px;
  max-width: 320px;
  flex: 1;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.project-ticket-kanban-column.is-folded {
  min-width: 150px;
  max-width: 150px;
  flex: 0 0 150px;
}

.project-ticket-kanban-header {
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-ticket-kanban-header h4 {
  margin: 0;
}

.project-ticket-kanban-body {
  min-height: 220px;
  padding: 0.75rem;
}

.project-ticket-kanban-folded {
  min-height: 90px;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 0.85rem;
}

.project-ticket-kanban-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  cursor: grab;
}

.project-ticket-kanban-card-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.project-ticket-kanban-card-meta {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.project-ticket-kanban-empty {
  text-align: center;
  color: #999;
  padding: 1rem 0.5rem;
}

.gantt-wrapper {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.gantt-header,
.gantt-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(560px, 4fr);
  align-items: center;
}

.gantt-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
}

.gantt-row {
  border-bottom: 1px solid #f0f0f0;
}

.gantt-row:last-child {
  border-bottom: none;
}

.gantt-task-col,
.gantt-user-col,
.gantt-timeline-col {
  padding: 0.75rem;
}

.gantt-task-title {
  font-weight: 600;
}

.gantt-timeline-col {
  position: relative;
  min-height: 48px;
  background-image: repeating-linear-gradient(
    to right,
    #f4f4f4 0,
    #f4f4f4 1px,
    transparent 1px,
    transparent calc(100% / 30)
  );
}

.gantt-days-grid {
  display: grid;
  gap: 0;
}

.gantt-day-label {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  padding: 0.2rem 0;
  border-left: 1px solid #f0f0f0;
}

.gantt-day-label:first-child {
  border-left: none;
}

.gantt-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 22px;
  border-radius: 999px;
  opacity: 0.9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.gantt-bar.clickable {
  cursor: pointer;
}

@media (max-width: 1100px) {
  .gantt-wrapper {
    overflow-x: auto;
  }

  .gantt-header,
  .gantt-row {
    min-width: 980px;
  }
}
</style>
