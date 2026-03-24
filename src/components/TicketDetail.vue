<template>
  <div v-if="ticket">
    <div class="page-header">
      <div>
        <button @click="$router.back()" class="btn btn-secondary">← Retour</button>
        <h2 style="margin-top: 1rem;">{{ ticket.title }}</h2>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <span class="badge" :class="getStatusClass(ticket.status)">{{ getStatusLabel(ticket.status) }}</span>
          <span class="badge" :class="getPriorityClass(ticket.priority)">{{ getPriorityLabel(ticket.priority) }}</span>
          <span class="badge" :class="getRecetteStatusClass(ticket.recetteStatus)">{{ getRecetteStatusLabel(ticket.recetteStatus) }}</span>
          <span v-if="project" class="badge badge-info">{{ project.name }}</span>
            <span v-if="ticket.assignedUserId" class="badge badge-secondary">👤 {{ getUserDisplayName(ticket.assignedUserId) }}</span>
            <span v-if="ticket.startDate" class="badge badge-info">📅 {{ ticket.startDate }}</span>
            <span v-if="ticket.estimatedTime" class="badge badge-success">⏱️ {{ ticket.estimatedTime }}h</span>
        </div>
      </div>
      <div style="display: flex; gap: 1rem;">
        <button v-if="!todoItem" @click="addToTodoList" class="btn btn-secondary">
          📋 Ajouter à la todo
        </button>
        <button
          v-if="!ticket.odooId && project?.odooId && odooConfigured"
          @click="syncTicketToOdoo"
          class="btn btn-secondary"
          :disabled="syncingTicketToOdoo"
        >
          {{ syncingTicketToOdoo ? '⏳ Sync...' : '🔄 Sync Odoo' }}
        </button>
        <button v-if="currentSprint && !isInCurrentSprint" @click="addToCurrentSprint" class="btn btn-secondary">
          🏃 Ajouter au sprint en cours
        </button>
        <button @click="showEditForm = !showEditForm" class="btn btn-primary">
          {{ showEditForm ? 'Annuler' : '✏️ Éditer' }}
        </button>
        <button @click="deleteTicketConfirm" class="btn btn-danger">🗑️ Supprimer</button>
      </div>
    </div>

    <!-- Formulaire d'édition -->
    <div v-if="showEditForm" class="card">
      <h3>Éditer le ticket</h3>
      <form @submit.prevent="saveTicket">
        <div class="form-group">
          <label>Titre *</label>
          <input v-model="editForm.title" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <RichTextEditor v-model="editForm.description" placeholder="Description du ticket..." />
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select v-model="editForm.status">
            <option v-for="col in (project?.kanbanColumns || [{id:'todo',label:'À faire'},{id:'in-progress',label:'En cours'},{id:'done',label:'Terminé'}])" :key="col.id" :value="col.id">
              {{ col.label }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Priorité</label>
          <select v-model="editForm.priority">
            <option value="low">Basse</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Date de début</label>
            <input v-model="editForm.startDate" type="date" />
          </div>
          <div class="form-group">
            <label>Temps estimé (heures)</label>
            <input v-model.number="editForm.estimatedTime" type="number" min="0" step="0.5" placeholder="Ex: 12" />
          </div>
        </div>

        <!-- Upload de fichiers -->
          <div class="form-group">
            <label>👤 Assigné à</label>
            <select v-model="editForm.assignedUserId">
              <option :value="null">— Non assigné —</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.username }})
              </option>
            </select>
          </div>

          <!-- Upload de fichiers -->
        <div class="form-group">
          <label>📎 Pièces jointes</label>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip" @change="handleFileUpload" style="margin-top: 0.5rem;" />
          <small style="color: #666; display: block; margin-top: 0.25rem;">Max 5MB par fichier</small>
          
          <div v-if="editForm.attachments && editForm.attachments.length > 0" class="uploaded-files">
            <div v-for="(file, index) in editForm.attachments" :key="`file-${index}`" class="uploaded-file-item">
              <span>{{ getFileIcon(file.type) }}</span>
              <span class="attachment-name">{{ file.name }}</span>
              <span class="attachment-size">{{ formatFileSize(file.size) }}</span>
              <button type="button" @click="removeAttachment(index)">🗑️</button>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
          <button type="submit" class="btn btn-primary">Enregistrer</button>
          <button type="button" @click="showEditForm = false" class="btn btn-secondary">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Onglets -->
    <div class="card">
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Onglet Détails -->
      <div v-if="activeTab === 'details'" class="tab-content">
        <div class="detail-section">
          <h3>Description</h3>
          <div v-if="ticket.description" class="ticket-description" v-html="ticket.description"></div>
          <p v-else style="color: #999; font-style: italic;">Aucune description</p>
        </div>

        <!-- Pièces jointes -->
        <div v-if="ticket.attachments && ticket.attachments.length > 0" class="detail-section">
          <h3>📎 Pièces jointes ({{ ticket.attachments.length }})</h3>
          <div class="attachments-list">
            <div v-for="(attachment, idx) in ticket.attachments" :key="`att-${idx}`" class="attachment-item" @click="previewAttachment(attachment)">
              <span>{{ getFileIcon(attachment.type) }}</span>
              <span class="attachment-name">{{ attachment.name }}</span>
              <span class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
              <span class="attachment-date">{{ formatDate(attachment.uploadedAt) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Informations</h3>
          <div class="info-grid">
            <div class="info-item">
              <strong>Créé le :</strong>
              <span>{{ formatDate(ticket.createdAt) }}</span>
            </div>
            <div class="info-item">
              <strong>Mis à jour le :</strong>
              <span>{{ formatDate(ticket.updatedAt) }}</span>
            </div>
            <div class="info-item" v-if="ticket.odooId">
              <strong>ID Odoo :</strong>
              <span>{{ ticket.odooId }}</span>
            </div>
            <div class="info-item" v-if="currentSprint">
              <strong>Sprint en cours :</strong>
              <span>
                {{ currentSprint.name }}
                <template v-if="isInCurrentSprint">(ticket déjà planifié)</template>
              </span>
            </div>
            <div class="info-item" v-if="todoItem">
              <strong>Todo planifiée :</strong>
              <span>{{ formatDate(todoItem.plannedDate) }}</span>
            </div>
            <div class="info-item">
              <strong>Temps total :</strong>
              <span class="time-badge">{{ formatDuration(totalTime) }}</span>
            </div>
            <div class="info-item">
              <strong>Date de début :</strong>
              <span>{{ ticket.startDate || 'Non renseignée' }}</span>
            </div>
            <div class="info-item">
              <strong>Temps estimé :</strong>
              <span>{{ ticket.estimatedTime ? `${ticket.estimatedTime}h` : 'Non renseigné' }}</span>
            </div>
              <div class="info-item">
                <strong>Assigné à :</strong>
                <span>{{ getUserDisplayName(ticket.assignedUserId) }}</span>
              </div>
          </div>
        </div>
      </div>

      <!-- Onglet Temps -->
      <div v-if="activeTab === 'time'" class="tab-content">
        <div class="detail-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Feuilles de temps</h3>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div class="time-total">
                <strong>Total :</strong> {{ formatDuration(totalTime) }}
              </div>
              <button 
                v-if="ticket.odooId && odooConfigured"
                @click="syncFromOdoo" 
                class="btn btn-secondary"
                :disabled="syncing"
              >
                {{ syncing ? '⏳ Import...' : '📥 Importer d\'Odoo' }}
              </button>
              <button 
                v-if="ticket.odooId && odooConfigured && unsyncedCount > 0"
                @click="syncTimeEntries" 
                class="btn btn-primary"
                :disabled="syncing"
              >
                {{ syncing ? '⏳ Synchro...' : `📤 Envoyer (${unsyncedCount})` }}
              </button>
            </div>
          </div>

          <div v-if="!ticket.odooId" class="alert alert-info" style="margin-bottom: 1rem;">
            ℹ️ Ce ticket n'est pas synchronisé avec Odoo. La synchronisation des temps n'est pas disponible.
          </div>

          <div v-if="syncError" class="alert alert-danger" style="margin-bottom: 1rem;">
            ❌ {{ syncError }}
          </div>

          <div v-if="syncSuccess" class="alert alert-success" style="margin-bottom: 1rem;">
            ✅ {{ syncSuccess }}
          </div>

          <!-- Formulaire d'ajout de temps -->
          <form @submit.prevent="addTimeEntry" class="time-form">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1.25fr 2fr auto; gap: 1rem; align-items: end;">
              <div class="form-group" style="margin: 0;">
                <label>Durée *</label>
                <div style="display: flex; gap: 0.5rem;">
                  <input 
                    v-model.number="newTimeEntry.hours" 
                    type="number" 
                    min="0" 
                    placeholder="h"
                    style="width: 60px;"
                  />
                  <span style="align-self: center;">h</span>
                  <input 
                    v-model.number="newTimeEntry.minutes" 
                    type="number" 
                    min="0" 
                    max="59"
                    placeholder="min"
                    style="width: 60px;"
                  />
                  <span style="align-self: center;">min</span>
                </div>
              </div>
              <div class="form-group" style="margin: 0;">
                <label>Date *</label>
                <input v-model="newTimeEntry.date" type="date" required />
              </div>
              <div class="form-group" style="margin: 0;">
                <label>Utilisateur</label>
                <select v-model="newTimeEntry.userId">
                  <option :value="null">Non défini</option>
                  <option v-for="user in users" :key="`time-new-user-${user.id}`" :value="user.id">
                    {{ user.displayName }} ({{ user.username }})
                  </option>
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label>Description</label>
                <input v-model="newTimeEntry.description" type="text" placeholder="Travail effectué..." />
              </div>
              <button type="submit" class="btn btn-primary" :disabled="!isTimeEntryValid">
                + Ajouter
              </button>
            </div>
          </form>

          <!-- Liste des entrées de temps -->
          <div v-if="timeEntries.length === 0" style="text-align: center; color: #999; padding: 2rem; margin-top: 1rem;">
            Aucune entrée de temps
          </div>
          <div v-else class="time-entries-list">
            <div v-for="entry in sortedTimeEntries" :key="entry.id" class="time-entry-card" :class="{ 'synced': entry.synced }">
              <div v-if="editingTimeId === entry.id" class="time-entry-edit">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1.25fr 2fr auto; gap: 1rem; align-items: end;">
                  <div class="form-group" style="margin: 0;">
                    <label>Durée</label>
                    <div style="display: flex; gap: 0.5rem;">
                      <input 
                        v-model.number="editingTimeEntry.hours" 
                        type="number" 
                        min="0"
                        style="width: 60px;"
                      />
                      <span>h</span>
                      <input 
                        v-model.number="editingTimeEntry.minutes" 
                        type="number" 
                        min="0" 
                        max="59"
                        style="width: 60px;"
                      />
                      <span>min</span>
                    </div>
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label>Date</label>
                    <input v-model="editingTimeEntry.date" type="date" />
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label>Utilisateur</label>
                    <select v-model="editingTimeEntry.userId">
                      <option :value="null">Non défini</option>
                      <option v-for="user in users" :key="`time-edit-user-${user.id}`" :value="user.id">
                        {{ user.displayName }} ({{ user.username }})
                      </option>
                    </select>
                  </div>
                  <div class="form-group" style="margin: 0;">
                    <label>Description</label>
                    <input v-model="editingTimeEntry.description" type="text" />
                  </div>
                  <div style="display: flex; gap: 0.5rem;">
                    <button @click="saveTimeEdit" class="btn btn-primary btn-sm">✓</button>
                    <button @click="cancelTimeEdit" class="btn btn-secondary btn-sm">✗</button>
                  </div>
                </div>
              </div>
              <div v-else class="time-entry-content">
                <div class="time-entry-main">
                  <div class="time-duration">
                    {{ formatDuration(entry.duration) }}
                    <span v-if="entry.synced" class="sync-badge" title="Synchronisé avec Odoo">✓</span>
                  </div>
                  <div class="time-date">{{ formatDate(entry.date) }}</div>
                  <div class="time-description">{{ entry.description || 'Sans description' }}</div>
                  <div class="time-user">👤 {{ getUserDisplayName(entry.userId) }}</div>
                </div>
                <div class="time-entry-actions">
                  <button @click="editTimeEntry(entry)" class="btn btn-secondary btn-sm">✏️</button>
                  <button @click="deleteTimeEntryConfirm(entry)" class="btn btn-danger btn-sm">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Notes -->
      <div v-if="activeTab === 'notes'" class="tab-content">
        <div class="detail-section">
          <h3>Notes internes</h3>
          
          <!-- Formulaire d'ajout de note -->
          <form @submit.prevent="addNote" style="margin-bottom: 1.5rem;">
            <div class="form-group">
              <RichTextEditor v-model="newNote" placeholder="Ajouter une note..." />
            </div>
            <button type="submit" class="btn btn-primary" :disabled="!newNote.trim()">
              + Ajouter une note
            </button>
          </form>

          <!-- Liste des notes -->
          <div v-if="notes.length === 0" style="text-align: center; color: #999; padding: 2rem;">
            Aucune note pour ce ticket
          </div>
          <div v-for="note in notes" :key="note.id" class="note-card">
            <div v-if="editingNoteId === note.id">
              <RichTextEditor v-model="editingNoteContent" />
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                <button @click="saveNoteEdit(note.id)" class="btn btn-primary btn-sm">Enregistrer</button>
                <button @click="cancelNoteEdit" class="btn btn-secondary btn-sm">Annuler</button>
              </div>
            </div>
            <div v-else>
              <div class="note-content" v-html="note.content"></div>
              <div class="note-meta">
                <small>{{ formatDate(note.createdAt) }}</small>
                <div style="display: flex; gap: 0.5rem;">
                  <button @click="editNote(note)" class="btn btn-secondary btn-sm">✏️</button>
                  <button @click="deleteNoteConfirm(note.id)" class="btn btn-danger btn-sm">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglet Recette -->
      <div v-if="activeTab === 'recette'" class="tab-content">
        <div class="detail-section">
          <h3>🧪 Recette (évolution / bug)</h3>
          <div class="card" style="background: #f8f9fa; border: 1px solid #e0e0e0;">
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm" @click="exportRecetteToXls">
                📊 Exporter le cahier de recette (.xls)
              </button>
              <button type="button" class="btn btn-primary btn-sm" @click="shareRecette" title="Générer un lien de partage publique pour cette recette">
                📤 Partager la recette
              </button>
            </div>
            <div class="info-grid" style="margin-bottom: 0.75rem;">
              <div class="info-item">
                <strong>Couverture critères :</strong>
                <span>{{ recetteCoverage.checked }} / {{ recetteCoverage.total }} ({{ recetteCoverage.percent }}%)</span>
              </div>
              <div class="info-item">
                <strong>User stories terminées :</strong>
                <span>{{ recetteCoverage.storiesDone }} / {{ recetteCoverage.storiesTotal }}</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <span class="badge" :class="getRecetteStatusClass(ticket.recetteStatus)">{{ getRecetteStatusLabel(ticket.recetteStatus) }}</span>
              <small v-if="ticket.recetteDate" style="color: #666;">
                Le {{ formatDateTime(ticket.recetteDate) }}
                <span v-if="ticket.recetteByUserId">par {{ getUserDisplayName(ticket.recetteByUserId) }}</span>
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label>Commentaire de recette</label>
              <textarea
                v-model="recetteForm.comment"
                rows="3"
                placeholder="Ex: testé en recette, corrigé / restant à corriger..."
              ></textarea>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <button type="button" class="btn btn-secondary btn-sm" @click="setRecetteStatus('pending')" :disabled="savingRecette" :style="ticket.recetteStatus === 'pending' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🔁 À retester</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="setRecetteStatus('ready_for_test')" :disabled="savingRecette" :style="ticket.recetteStatus === 'ready_for_test' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🧾 Prêt à tester</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="setRecetteStatus('in_test')" :disabled="savingRecette" :style="ticket.recetteStatus === 'in_test' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🧪 En test</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="setRecetteStatus('blocked')" :disabled="savingRecette" :style="ticket.recetteStatus === 'blocked' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🚧 Bloqué</button>
              <button type="button" class="btn btn-primary btn-sm" @click="setRecetteStatus('validated')" :disabled="savingRecette" :style="ticket.recetteStatus === 'validated' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.4)' : ''">✅ Validé</button>
              <button type="button" class="btn btn-danger btn-sm" @click="setRecetteStatus('rejected')" :disabled="savingRecette" :style="ticket.recetteStatus === 'rejected' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.4)' : ''">❌ Rejeté</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="saveComment" :disabled="savingRecette" title="Sauvegarder le commentaire sans changer le statut">💾 Commentaire</button>
              <span v-if="savingRecette" style="color:#6c757d;font-size:0.8rem;">⏳...</span>
              <span v-if="recetteSaved" style="color:#28a745;font-size:0.85rem;font-weight:500;">✓ Enregistré</span>
            </div>

            <small v-if="recetteForm.status === 'validated' && !canValidateRecette" style="display:block; color:#856404; margin-top:0.5rem;">
              ⚠️ Pour valider: terminer toutes les user stories et mettre tous les critères en OK.
            </small>
          </div>
        </div>

        <div class="detail-section" v-if="ticket.recetteHistory && ticket.recetteHistory.length > 0">
          <h3>🕓 Historique de recette</h3>
          <div v-for="entry in ticket.recetteHistory" :key="entry.id" class="note-card">
            <!-- Mode visualisation -->
            <template v-if="editingHistoryId !== entry.id">
              <div class="note-meta" style="border-top: none; padding-top: 0; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong>{{ getRecetteStatusLabel(entry.status) }}</strong>
                  <small>
                    {{ formatDateTime(entry.createdAt) }}
                    <span v-if="entry.byUserId"> • {{ getUserDisplayName(entry.byUserId) }}</span>
                  </small>
                </div>
                <div style="display: flex; gap: 0.25rem; flex-shrink: 0; margin-left: 0.5rem;">
                  <button type="button" class="btn btn-secondary btn-sm" @click="startEditHistory(entry)" title="Modifier">✏️</button>
                  <button type="button" class="btn btn-danger btn-sm" @click="deleteHistoryEntry(entry.id)" title="Supprimer">🗑️</button>
                </div>
              </div>
              <div v-if="entry.comment" class="note-content" style="white-space: pre-wrap;">{{ entry.comment }}</div>
              <small style="color: #666;">
                Couverture: {{ entry.checkedCriteria || 0 }}/{{ entry.totalCriteria || 0 }}
                <span v-if="entry.coveragePercent !== undefined"> ({{ entry.coveragePercent }}%)</span>
              </small>
            </template>
            <!-- Mode édition inline -->
            <template v-else>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:0.25rem;">Statut</label>
                <select v-model="editingHistoryForm.status" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #ced4da;border-radius:4px;">
                  <option value="pending">🔁 À retester</option>
                  <option value="ready_for_test">🧾 Prêt à tester</option>
                  <option value="in_test">🧪 En test</option>
                  <option value="blocked">🚧 Bloqué</option>
                  <option value="validated">✅ Validé</option>
                  <option value="rejected">❌ Rejeté</option>
                </select>
              </div>
              <div style="margin-bottom: 0.5rem;">
                <label style="font-size:0.85rem;color:#666;display:block;margin-bottom:0.25rem;">Commentaire</label>
                <textarea v-model="editingHistoryForm.comment" rows="2" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #ced4da;border-radius:4px;"></textarea>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-primary btn-sm" @click="saveHistoryEntry(entry.id)">💾 Enregistrer</button>
                <button type="button" class="btn btn-secondary btn-sm" @click="cancelEditHistory">Annuler</button>
              </div>
            </template>
          </div>
        </div>

        <div class="detail-section">
          <h3>📚 User stories</h3>

          <form @submit.prevent="addUserStory" class="card" style="background: #f8f9fa; border: 1px solid #e0e0e0; margin-bottom: 1rem;">
            <div class="form-group">
              <label>Titre *</label>
              <input v-model="userStoryForm.title" required placeholder="Ex: En tant qu'utilisateur, je veux..." />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea v-model="userStoryForm.description" rows="2" placeholder="Détails de la user story..."></textarea>
            </div>
            <div class="form-group">
              <label>Critères d'acceptation</label>
              <textarea v-model="userStoryForm.acceptanceCriteria" rows="3" placeholder="Given/When/Then... ou checklist de validation"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" :disabled="!userStoryForm.title.trim()">+ Ajouter la user story</button>
          </form>

          <div v-if="userStories.length === 0" style="text-align: center; color: #999; padding: 1rem;">
            Aucune user story sur ce ticket
          </div>

          <div v-for="story in userStories" :key="story.id" class="note-card">
            <div style="display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.5rem;">
              <strong>{{ story.title }}</strong>
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <select :value="story.status || 'todo'" @change="updateUserStoryStatus(story.id, $event.target.value)">
                  <option value="todo">À faire</option>
                  <option value="in-progress">En cours</option>
                  <option value="done">Terminée</option>
                </select>
                <button type="button" class="btn btn-danger btn-sm" @click="deleteUserStoryConfirm(story.id)">🗑️</button>
              </div>
            </div>

            <div v-if="story.description" class="note-content" style="margin-bottom: 0.5rem;">{{ story.description }}</div>
            <div class="note-content" style="margin-bottom: 0.5rem;">
              <strong>Critères d'acceptation</strong>
              <div v-if="getStoryCriteria(story).length === 0" style="color:#999; margin-top: 0.25rem;">Aucun critère</div>
              <div v-else style="margin-top: 0.35rem; display:flex; flex-direction:column; gap:0.35rem;">
                <label v-for="criterion in getStoryCriteria(story)" :key="criterion.id" style="display:flex; flex-direction:column; align-items:stretch; gap:0.45rem;">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span
                      :style="getCriterionResult(criterion) === 'ok' ? 'text-decoration: line-through; color: #666; flex:1;' : (getCriterionResult(criterion) === 'ko' ? 'color:#dc3545; font-weight:600; flex:1;' : 'flex:1;')"
                    >
                      {{ criterion.text }}
                    </span>

                    <label style="display:flex; align-items:center; gap:0.25rem; margin:0; font-size:0.85rem; color:#198754;">
                      <input
                        type="checkbox"
                        :checked="getCriterionResult(criterion) === 'ok'"
                        @change="setStoryCriterionResult(story.id, criterion.id, $event.target.checked ? 'ok' : null)"
                        style="width:auto;"
                      />
                      OK
                    </label>

                    <label style="display:flex; align-items:center; gap:0.25rem; margin:0; font-size:0.85rem; color:#dc3545;">
                      <input
                        type="checkbox"
                        :checked="getCriterionResult(criterion) === 'ko'"
                        @change="setStoryCriterionResult(story.id, criterion.id, $event.target.checked ? 'ko' : null)"
                        style="width:auto;"
                      />
                      KO
                    </label>

                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      @click="deleteStoryCriterion(story.id, criterion.id)"
                      style="margin-left:auto;"
                    >
                      ✕
                    </button>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:0.35rem; margin-left:0.25rem;">
                    <div v-if="criterion.attachments && criterion.attachments.length > 0" style="display:flex; flex-wrap:wrap; gap:0.35rem;">
                      <div
                        v-for="(attachment, aIdx) in criterion.attachments"
                        :key="attachment.id || `criterion-att-${aIdx}`"
                        class="attachment-item"
                        style="cursor:pointer; padding:0.25rem 0.5rem;"
                        @click="previewAttachment(attachment)"
                      >
                        <span>{{ getFileIcon(attachment.type || '') }}</span>
                        <span class="attachment-name" style="max-width:160px;">{{ attachment.name }}</span>
                        <button
                          type="button"
                          class="btn btn-danger btn-sm"
                          style="margin-left:0.35rem;"
                          @click.stop="removeCriterionAttachment(story.id, criterion.id, attachment.id)"
                          title="Supprimer la pièce jointe"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip"
                      @change="handleCriterionAttachmentUpload(story.id, criterion.id, $event)"
                      style="font-size:0.82rem;"
                    />
                  </div>
                </label>
              </div>

              <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                <input
                  v-model="newCriterionByStoryId[story.id]"
                  type="text"
                  placeholder="Ajouter un critère d'acceptation..."
                />
                <button type="button" class="btn btn-secondary btn-sm" @click="addCriterionToStory(story.id)">+ Critère</button>
              </div>
            </div>
            <small style="color: #999;">Créée le {{ formatDateTime(story.createdAt) }}</small>
          </div>
        </div>
      </div>

      <!-- Onglet Messages Odoo -->
      <div v-if="activeTab === 'messages'" class="tab-content">
        <div class="detail-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Messages Odoo</h3>
            <button @click="loadOdooMessages" class="btn btn-secondary" :disabled="loadingMessages">
              {{ loadingMessages ? '⏳ Chargement...' : '🔄 Actualiser' }}
            </button>
          </div>

          <div v-if="!ticket.odooId" class="alert alert-info">
            Ce ticket n'est pas synchronisé avec Odoo.
          </div>

          <div v-else-if="!odooConfigured" class="alert alert-warning">
            Odoo n'est pas configuré. Veuillez configurer Odoo dans les paramètres.
          </div>

          <template v-else>
            <!-- Formulaire d'envoi de message -->
            <div class="message-form" v-if="!showMessageForm">
              <button @click="showMessageForm = true" class="btn btn-primary">
                ✉️ Envoyer un message
              </button>
            </div>

            <div v-else class="card" style="margin-bottom: 1.5rem; background: #f8f9fa;">
              <h4>Nouveau message</h4>
              <form @submit.prevent="sendMessage">
                <div class="form-group">
                  <label>Destinataires (optionnel)</label>
                  <input 
                    v-model="recipientSearch" 
                    @input="searchRecipients"
                    type="text" 
                    placeholder="Rechercher un contact par nom ou email..."
                  />
                  <div v-if="searchingRecipients" style="color: #999; font-size: 0.875rem;">
                    Recherche en cours...
                  </div>
                  <div v-if="availableRecipients.length > 0" class="recipients-list">
                    <div 
                      v-for="recipient in availableRecipients" 
                      :key="recipient.id"
                      @click="addRecipient(recipient)"
                      class="recipient-item"
                    >
                      <strong>{{ recipient.name }}</strong>
                      <span v-if="recipient.email">{{ recipient.email }}</span>
                    </div>
                  </div>
                  <div v-if="selectedRecipients.length > 0" class="selected-recipients">
                    <div v-for="recipient in selectedRecipients" :key="recipient.id" class="recipient-tag">
                      {{ recipient.name }}
                      <button type="button" @click="removeRecipient(recipient.id)" class="remove-recipient">×</button>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>Sujet (optionnel)</label>
                  <input v-model="messageForm.subject" type="text" placeholder="Sujet du message..." />
                </div>

                <div class="form-group">
                  <label>Message *</label>
                  <RichTextEditor v-model="messageForm.body" placeholder="Votre message..." />
                </div>

                <div style="display: flex; gap: 0.5rem;">
                  <button type="submit" class="btn btn-primary" :disabled="sendingMessage || !messageForm.body.trim()">
                    {{ sendingMessage ? '⏳ Envoi...' : '📨 Envoyer' }}
                  </button>
                  <button type="button" @click="cancelMessageForm" class="btn btn-secondary">
                    Annuler
                  </button>
                </div>

                <div v-if="messageSendError" class="alert alert-danger" style="margin-top: 1rem;">
                  {{ messageSendError }}
                </div>
              </form>
            </div>

            <!-- Liste des messages -->
            <div v-if="loadingMessages" style="text-align: center; color: #999; padding: 2rem;">
              Chargement des messages...
            </div>

            <div v-else-if="messagesError" class="alert alert-danger">
              {{ messagesError }}
            </div>

            <div v-else-if="odooMessages.length === 0" style="text-align: center; color: #999; padding: 2rem;">
              Aucun message trouvé dans Odoo
            </div>

            <div v-else>
              <div v-for="message in odooMessages" :key="message.id" class="message-card">
                <div class="message-header">
                  <strong>{{ message.author }}</strong>
                  <small>{{ formatDateTime(message.date) }}</small>
                </div>
                <div class="message-body" v-html="message.bodyHtml"></div>
                <div v-if="message.subtype" class="message-meta">
                  <small>{{ message.subtype }}</small>
                </div>
              </div>
            </div>
          </template>
        </div>
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
  <div v-else class="card">
    <p style="text-align: center; color: #999;">Ticket non trouvé</p>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { odooService } from '../services/odoo-new'
import RichTextEditor from './RichTextEditor.vue'
import { auth } from '../services/auth'
import * as XLSX from 'xlsx'

export default {
  name: 'TicketDetail',
  components: {
    RichTextEditor
  },
  data() {
    return {
      ticket: null,
      project: null,
      showEditForm: false,
      activeTab: 'details',
      tabs: [
        { id: 'details', label: 'Détails' },
        { id: 'time', label: '⏱️ Temps' },
        { id: 'messages', label: 'Messages Odoo' },
        { id: 'recette', label: '🧪 Recette' },
        { id: 'notes', label: 'Notes' }
      ],
      editForm: {
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
          startDate: '',
          estimatedTime: 0,
          attachments: [],
          assignedUserId: null
      },
      newNote: '',
      editingNoteId: null,
      editingNoteContent: '',
      odooMessages: [],
      loadingMessages: false,
      messagesError: null,
      showMessageForm: false,
      messageForm: {
        subject: '',
        body: ''
      },
      // Prévisualisation des pièces jointes
      showAttachmentPreview: false,
      currentAttachment: null,
      recipientSearch: '',
      availableRecipients: [],
      selectedRecipients: [],
      searchingRecipients: false,
      sendingMessage: false,
      messageSendError: null,
      recipientSearchTimeout: null,
      // Feuilles de temps
      timeEntries: [],
      totalTime: 0,
      newTimeEntry: {
        hours: 0,
        minutes: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        userId: null
      },
      editingTimeId: null,
      editingTimeEntry: {
        hours: 0,
        minutes: 0,
        date: '',
        description: '',
        userId: null
      },
      // Synchronisation Odoo
      syncing: false,
      syncingTicketToOdoo: false,
      syncError: null,
      syncSuccess: null,
      unsyncedCount: 0,
      recetteForm: {
        status: 'pending',
        comment: ''
      },
      savingRecette: false,
      recetteSaved: false,
      editingHistoryId: null,
      editingHistoryForm: { comment: '', status: '' },
      userStoryForm: {
        title: '',
        description: '',
        acceptanceCriteria: ''
      },
      newCriterionByStoryId: {},
      todos: [],
      sprints: []
      ,
      users: [],
      currentUserId: null
    }
  },
  computed: {
    notes() {
      return (this.ticket?.notes || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
    },
    userStories() {
      return (this.ticket?.userStories || []).sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      )
    },
    recetteCoverage() {
      const allCriteria = this.userStories.flatMap(story => this.getStoryCriteria(story))
      const total = allCriteria.length
      const checked = allCriteria.filter(c => this.getCriterionResult(c) === 'ok').length
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0
      const doneStories = this.userStories.filter(story => (story.status || 'todo') === 'done').length

      return {
        total,
        checked,
        percent,
        storiesTotal: this.userStories.length,
        storiesDone: doneStories
      }
    },
    canValidateRecette() {
      // Pas de stories → on peut valider
      if (this.recetteCoverage.storiesTotal === 0) return true
      // Stories présentes : toutes doivent être en "done"
      if (this.recetteCoverage.storiesDone < this.recetteCoverage.storiesTotal) return false
      // Pas de critères → OK
      if (this.recetteCoverage.total === 0) return true
      // Critères présents : tous doivent être en OK
      return this.recetteCoverage.checked === this.recetteCoverage.total
    },
    odooConfigured() {
      return odooService.isConfigured()
    },
    sortedTimeEntries() {
      return [...this.timeEntries].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )
    },
    isTimeEntryValid() {
      return (this.newTimeEntry.hours > 0 || this.newTimeEntry.minutes > 0) && this.newTimeEntry.date
    },
    currentSprint() {
      if (!this.ticket?.projectId || this.sprints.length === 0) return null

      const activeSprints = this.sprints.filter(s => s.status === 'active')
      if (activeSprints.length === 0) return null

      return activeSprints.sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
        return bDate - aDate
      })[0]
    },
    todoItem() {
      if (!this.ticket?.title) return null
      const todoText = this.getTodoText(this.ticket)
      const found = this.todos.find(todo => !todo.completed && todo.text === todoText)
      if (found) return found

      // Compatibilité anciens todos (avant clé dédiée Odoo)
      return this.todos.find(todo => !todo.completed && todo.text === `[TICKET] ${this.ticket.title}`) || null
    },
    isInCurrentSprint() {
      return !!(this.currentSprint && this.ticket?.sprintId === this.currentSprint.id)
    }
  },
  async mounted() {
    await this.loadTicket()
    await this.loadSprints()
    await this.loadTodos()
    await this.loadTimeEntries()
      await this.loadUsers()
  },
  watch: {
    '$route.params.id': async function() {
      await this.loadTicket()
      await this.loadSprints()
      await this.loadTodos()
      await this.loadTimeEntries()
    },
    activeTab(newTab) {
      if (newTab === 'messages' && this.ticket?.odooId && this.odooConfigured) {
        this.loadOdooMessages()
      } else if (newTab === 'time') {
        this.loadTimeEntries()
      }
    }
  },
  methods: {
    async loadTicket() {
      const id = parseInt(this.$route.params.id)
      this.ticket = await db.getTicket(id)

      if (this.ticket) {
        this.project = await db.getProject(this.ticket.projectId)
        this.editForm = {
          title: this.ticket.title,
          description: this.ticket.description || '',
          status: this.ticket.status,
          priority: this.ticket.priority,
            startDate: this.ticket.startDate || '',
            estimatedTime: Number(this.ticket.estimatedTime || 0),
            attachments: this.ticket.attachments || [],
            assignedUserId: this.ticket.assignedUserId || null
        }
        this.recetteForm = {
          status: this.ticket.recetteStatus || 'pending',
          comment: this.ticket.recetteComment || ''
        }
      }
    },
      async loadUsers() {
        this.currentUserId = auth.getSession()?.userId || null
        this.users = await db.getActiveUsers()
        if (this.newTimeEntry.userId === null) {
          this.newTimeEntry.userId = this.currentUserId
        }
      },
      getUserDisplayName(userId) {
        if (!userId) return 'Non assigné'
        const user = this.users.find(u => u.id === userId)
        return user ? `${user.displayName} (${user.username})` : 'Utilisateur inconnu'
      },
    async loadSprints() {
      if (!this.ticket?.projectId) {
        this.sprints = []
        return
      }
      this.sprints = await db.getSprintsByProject(this.ticket.projectId)
    },
    async loadTodos() {
      this.todos = await db.getAllTodos()
    },
    getTodoText(ticket) {
      if (ticket?.odooId) {
        return `[TICKET ODOO #${ticket.odooId}] ${ticket.title}`
      }
      return `[TICKET] ${ticket.title}`
    },
    async addToTodoList() {
      if (!this.ticket?.title) return

      if (this.todoItem) {
        alert('Ce ticket est déjà présent dans votre todo list.')
        return
      }

      await db.addTodo(this.getTodoText(this.ticket))
      await this.loadTodos()
      alert('✅ Ticket ajouté à la todo list !')
    },
    async addToCurrentSprint() {
      if (!this.ticket?.id || !this.currentSprint) return

      await db.updateTicket(this.ticket.id, { sprintId: this.currentSprint.id })
      await this.loadTicket()
      alert('✅ Ticket ajouté au sprint en cours !')
    },
    async syncTicketToOdoo() {
      if (!this.ticket || this.ticket.odooId || !this.project?.odooId || !this.odooConfigured) return

      this.syncingTicketToOdoo = true
      try {
        const createdOdooId = await odooService.createHelpdeskTicketForProject(
          this.project.odooId,
          this.ticket.title,
          this.ticket.description || '',
          this.ticket.priority
        )

        await db.updateTicket(this.ticket.id, { odooId: createdOdooId })
        await this.loadTicket()
        alert('✅ Ticket synchronisé vers Odoo')
      } catch (error) {
        console.error('Erreur de synchronisation ticket vers Odoo:', error)
        alert(`❌ ${error.message || 'Erreur de synchronisation Odoo'}`)
      } finally {
        this.syncingTicketToOdoo = false
      }
    },
    async saveTicket() {
      const estimatedTime = Number(this.editForm.estimatedTime || 0)
      await db.updateTicket(this.ticket.id, {
        title: this.editForm.title,
        description: this.editForm.description,
        status: this.editForm.status,
        priority: this.editForm.priority,
          startDate: this.editForm.startDate || null,
          estimatedTime: estimatedTime > 0 ? estimatedTime : null,
          attachments: this.editForm.attachments,
          assignedUserId: this.editForm.assignedUserId
      })
      await this.loadTicket()
      this.showEditForm = false
    },
    async deleteTicketConfirm() {
      if (confirm(`Supprimer le ticket "${this.ticket.title}" ?`)) {
        await db.deleteTicket(this.ticket.id)
        this.$router.push('/tickets')
      }
    },
    async addNote() {
      if (!this.newNote.trim()) return
      
      await db.addTicketNote(this.ticket.id, this.newNote)
      this.newNote = ''
      await this.loadTicket()
    },
    editNote(note) {
      this.editingNoteId = note.id
      this.editingNoteContent = note.content
    },
    async saveNoteEdit(noteId) {
      await db.updateTicketNote(this.ticket.id, noteId, this.editingNoteContent)
      this.editingNoteId = null
      this.editingNoteContent = ''
      await this.loadTicket()
    },
    cancelNoteEdit() {
      this.editingNoteId = null
      this.editingNoteContent = ''
    },
    async deleteNoteConfirm(noteId) {
      if (confirm('Supprimer cette note ?')) {
        await db.deleteTicketNote(this.ticket.id, noteId)
        await this.loadTicket()
      }
    },
    async loadOdooMessages() {
      if (!this.ticket?.odooId || !this.odooConfigured) return
      
      this.loadingMessages = true
      this.messagesError = null
      
      try {
        this.odooMessages = await odooService.getTicketMessages(this.ticket.odooId)
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error)
        this.messagesError = error.message || 'Erreur lors du chargement des messages'
      } finally {
        this.loadingMessages = false
      }
    },
    async searchRecipients() {
      clearTimeout(this.recipientSearchTimeout)
      
      if (!this.recipientSearch.trim()) {
        this.availableRecipients = []
        return
      }

      this.recipientSearchTimeout = setTimeout(async () => {
        this.searchingRecipients = true
        try {
          const recipients = await odooService.searchPartners(this.recipientSearch)
          // Filtrer ceux déjà sélectionnés
          this.availableRecipients = recipients.filter(r => 
            !this.selectedRecipients.find(sr => sr.id === r.id)
          )
        } catch (error) {
          console.error('Erreur lors de la recherche de destinataires:', error)
        } finally {
          this.searchingRecipients = false
        }
      }, 300)
    },
    addRecipient(recipient) {
      if (!this.selectedRecipients.find(r => r.id === recipient.id)) {
        this.selectedRecipients.push(recipient)
      }
      this.recipientSearch = ''
      this.availableRecipients = []
    },
    removeRecipient(recipientId) {
      this.selectedRecipients = this.selectedRecipients.filter(r => r.id !== recipientId)
    },
    async sendMessage() {
      if (!this.messageForm.body.trim()) return
      
      this.sendingMessage = true
      this.messageSendError = null
      
      try {
        await odooService.sendTicketMessage(this.ticket.odooId, {
          subject: this.messageForm.subject,
          body: this.messageForm.body,
          partnerIds: this.selectedRecipients.map(r => r.id)
        })
        
        // Réinitialiser le formulaire
        this.cancelMessageForm()
        
        // Recharger les messages
        await this.loadOdooMessages()
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error)
        this.messageSendError = error.message || 'Erreur lors de l\'envoi du message'
      } finally {
        this.sendingMessage = false
      }
    },
    cancelMessageForm() {
      this.showMessageForm = false
      this.messageForm = {
        subject: '',
        body: ''
      }
      this.recipientSearch = ''
      this.availableRecipients = []
      this.selectedRecipients = []
      this.messageSendError = null
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
      // Chercher dans les colonnes kanban du projet
      if (this.project?.kanbanColumns) {
        const col = this.project.kanbanColumns.find(c => c.id === status)
        if (col) return col.label
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
    exportRecetteToXls() {
      if (!this.ticket?.id) return

      const criteriaRows = this.userStories.flatMap(story => {
        const criteria = this.getStoryCriteria(story)
        if (criteria.length === 0) {
          return [{
            'User story ID': story.id || '',
            'User story': story.title || '',
            'Statut story': story.status || 'todo',
            'Critère ID': '',
            'Critère': '',
            'Validé': 'Non',
            'Date validation': '',
            'Validé par': ''
          }]
        }

        return criteria.map(criterion => ({
          'User story ID': story.id || '',
          'User story': story.title || '',
          'Statut story': story.status || 'todo',
          'Critère ID': criterion.id || '',
          'Critère': criterion.text || '',
          'Résultat': this.getCriterionResult(criterion) === 'ok' ? 'OK' : (this.getCriterionResult(criterion) === 'ko' ? 'KO' : 'Non évalué'),
          'Date validation': criterion.checkedAt ? this.formatDateTime(criterion.checkedAt) : '',
          'Validé par': criterion.checkedByUserId ? this.getUserDisplayName(criterion.checkedByUserId) : ''
        }))
      })

      const historyRows = (this.ticket.recetteHistory || []).map(entry => ({
        'Date': entry.createdAt ? this.formatDateTime(entry.createdAt) : '',
        'Statut': this.getRecetteStatusLabel(entry.status),
        'Commentaire': entry.comment || '',
        'Couverture': `${entry.checkedCriteria || 0}/${entry.totalCriteria || 0}`,
        'Couverture %': entry.coveragePercent ?? '',
        'Auteur': entry.byUserId ? this.getUserDisplayName(entry.byUserId) : ''
      }))

      const summaryRows = [
        { Champ: 'Projet', Valeur: this.project?.name || '' },
        { Champ: 'Ticket ID', Valeur: this.ticket.id },
        { Champ: 'Titre du ticket', Valeur: this.ticket.title || '' },
        { Champ: 'Statut ticket', Valeur: this.getStatusLabel(this.ticket.status) },
        { Champ: 'Priorité', Valeur: this.getPriorityLabel(this.ticket.priority) },
        { Champ: 'Statut recette', Valeur: this.getRecetteStatusLabel(this.ticket.recetteStatus) },
        { Champ: 'Commentaire recette', Valeur: this.ticket.recetteComment || this.recetteForm.comment || '' },
        { Champ: 'Date recette', Valeur: this.ticket.recetteDate ? this.formatDateTime(this.ticket.recetteDate) : '' },
        { Champ: 'Recette par', Valeur: this.ticket.recetteByUserId ? this.getUserDisplayName(this.ticket.recetteByUserId) : '' },
        { Champ: 'Couverture critères', Valeur: `${this.recetteCoverage.checked} / ${this.recetteCoverage.total} (${this.recetteCoverage.percent}%)` },
        { Champ: 'Stories terminées', Valeur: `${this.recetteCoverage.storiesDone} / ${this.recetteCoverage.storiesTotal}` },
        { Champ: 'Description ticket', Valeur: this.extractText(this.ticket.description || '') }
      ]

      const storiesRows = this.userStories.map(story => ({
        'ID': story.id || '',
        'Titre': story.title || '',
        'Description': this.extractText(story.description || ''),
        'Statut': story.status || 'todo',
        'Créée le': story.createdAt ? this.formatDateTime(story.createdAt) : '',
        'Critères total': this.getStoryCriteria(story).length,
        'Critères OK': this.getStoryCriteria(story).filter(c => this.getCriterionResult(c) === 'ok').length
      }))

      const workbook = XLSX.utils.book_new()

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
      const storiesSheet = XLSX.utils.json_to_sheet(storiesRows)
      const criteriaSheet = XLSX.utils.json_to_sheet(criteriaRows)
      const historySheet = XLSX.utils.json_to_sheet(historyRows.length ? historyRows : [{ Date: '', Statut: '', Commentaire: '', 'Couverture': '', 'Couverture %': '', Auteur: '' }])

      summarySheet['!cols'] = [{ wch: 24 }, { wch: 90 }]
      storiesSheet['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 60 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 16 }]
      criteriaSheet['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 14 }, { wch: 60 }, { wch: 10 }, { wch: 22 }, { wch: 24 }]
      historySheet['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 60 }, { wch: 14 }, { wch: 14 }, { wch: 24 }]

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Synthese')
      XLSX.utils.book_append_sheet(workbook, storiesSheet, 'UserStories')
      XLSX.utils.book_append_sheet(workbook, criteriaSheet, 'Criteres')
      XLSX.utils.book_append_sheet(workbook, historySheet, 'Historique')

      const safeTitle = String(this.ticket.title || `ticket-${this.ticket.id}`)
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 80)

      XLSX.writeFile(workbook, `cahier-recette-${safeTitle}.xls`, { bookType: 'xls' })
    },
    async shareRecette() {
      try {
        const project = this.project
        if (!project) {
          alert('Erreur : projet non trouvé')
          return
        }

        // Générer un token si nécessaire
        let token = project.recetteShareToken
        if (!token) {
          token = this.generateUUID()
          project.recetteShareToken = token
          await db.updateProject(project.id, { recetteShareToken: token })
        }

        // Créer le lien de partage
        const origin = window.location.origin
        const shareUrl = `${origin}/recette-share/${token}`

        // Copier dans le presse-papiers
        await navigator.clipboard.writeText(shareUrl)
        alert('✅ Lien de partage copié dans le presse-papiers !\n\n' + shareUrl)
      } catch (err) {
        console.error('Erreur partage recette:', err)
        alert('❌ Erreur lors de la génération du lien : ' + err.message)
      }
    },
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
    setRecetteStatus(status) {
      this.recetteForm.status = status
      this.saveRecette()
    },
    async saveRecette() {
      if (!this.ticket?.id) return

      if (this.recetteForm.status === 'validated' && !this.canValidateRecette) {
        const proceed = confirm(
          'Attention : toutes les user stories ne sont pas terminées ou tous les critères ne sont pas cochés.\n\nVoulez-vous quand même valider la recette ?'
        )
        if (!proceed) return
      }

      if (this.recetteForm.status === 'rejected' && !this.recetteForm.comment?.trim()) {
        alert('Merci d\'ajouter un commentaire de rejet pour la traçabilité.')
        return
      }

      this.savingRecette = true
      try {
        const history = [...(this.ticket.recetteHistory || [])]
        history.unshift({
          id: Date.now(),
          status: this.recetteForm.status || 'pending',
          comment: this.recetteForm.comment || '',
          createdAt: new Date().toISOString(),
          byUserId: this.currentUserId || null,
          coveragePercent: this.recetteCoverage.percent,
          checkedCriteria: this.recetteCoverage.checked,
          totalCriteria: this.recetteCoverage.total
        })

        await db.updateTicket(this.ticket.id, {
          recetteStatus: this.recetteForm.status || 'pending',
          recetteComment: this.recetteForm.comment || '',
          recetteDate: new Date().toISOString(),
          recetteByUserId: this.currentUserId || null,
          recetteHistory: history
        })

        await this.loadTicket()
        this.recetteSaved = true
        setTimeout(() => { this.recetteSaved = false }, 2500)
      } catch (error) {
        console.error('Erreur enregistrement recette:', error)
        alert(`❌ ${error.message || 'Erreur lors de l\'enregistrement de la recette'}`)
      } finally {
        this.savingRecette = false
      }
    },
    async saveComment() {
      if (!this.ticket?.id) return
      this.savingRecette = true
      try {
        await db.updateTicket(this.ticket.id, {
          recetteComment: this.recetteForm.comment || ''
        })
        await this.loadTicket()
        this.recetteSaved = true
        setTimeout(() => { this.recetteSaved = false }, 2500)
      } catch (error) {
        console.error('Erreur sauvegarde commentaire:', error)
        alert(`❌ ${error.message || 'Erreur lors de la sauvegarde du commentaire'}`)
      } finally {
        this.savingRecette = false
      }
    },
    startEditHistory(entry) {
      this.editingHistoryId = entry.id
      this.editingHistoryForm = {
        comment: entry.comment || '',
        status: entry.status || 'pending'
      }
    },
    cancelEditHistory() {
      this.editingHistoryId = null
      this.editingHistoryForm = { comment: '', status: '' }
    },
    async saveHistoryEntry(entryId) {
      if (!this.ticket?.id) return
      const history = (this.ticket.recetteHistory || []).map(entry => {
        if (Number(entry.id) === Number(entryId)) {
          return {
            ...entry,
            status: this.editingHistoryForm.status || entry.status,
            comment: this.editingHistoryForm.comment,
            updatedAt: new Date().toISOString()
          }
        }
        return entry
      })
      try {
        await db.updateTicket(this.ticket.id, { recetteHistory: history })
        await this.loadTicket()
        this.cancelEditHistory()
      } catch (error) {
        alert(`❌ ${error.message || 'Erreur lors de la modification'}`)
      }
    },
    async deleteHistoryEntry(entryId) {
      if (!confirm('Supprimer cette entrée de l\'historique ?')) return
      if (!this.ticket?.id) return
      const history = (this.ticket.recetteHistory || []).filter(entry => Number(entry.id) !== Number(entryId))
      try {
        await db.updateTicket(this.ticket.id, { recetteHistory: history })
        await this.loadTicket()
      } catch (error) {
        alert(`❌ ${error.message || 'Erreur lors de la suppression'}`)
      }
    },
    async addUserStory() {
      if (!this.ticket?.id || !this.userStoryForm.title.trim()) return

      const criteriaItems = (this.userStoryForm.acceptanceCriteria || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((text, index) => ({
          id: Date.now() + index,
          text,
          result: null,
          checked: false,
          checkedAt: null,
          checkedByUserId: null,
          attachments: []
        }))

      const stories = [...(this.ticket.userStories || [])]
      stories.push({
        id: Date.now(),
        title: this.userStoryForm.title.trim(),
        description: (this.userStoryForm.description || '').trim(),
        acceptanceCriteria: (this.userStoryForm.acceptanceCriteria || '').trim(),
        acceptanceCriteriaItems: criteriaItems,
        status: 'todo',
        createdAt: new Date().toISOString()
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      this.userStoryForm = {
        title: '',
        description: '',
        acceptanceCriteria: ''
      }
      await this.loadTicket()
    },
    async updateUserStoryStatus(storyId, status) {
      if (!this.ticket?.id) return

      const stories = (this.ticket.userStories || []).map(story => {
        if (story.id === storyId) {
          return {
            ...story,
            status,
            updatedAt: new Date().toISOString()
          }
        }
        return story
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
    },
    extractText(html) {
      if (!html) return ''
      const temp = document.createElement('div')
      temp.innerHTML = html
      return temp.textContent || temp.innerText || ''
    },
    getStoryCriteria(story) {
      if (Array.isArray(story?.acceptanceCriteriaItems) && story.acceptanceCriteriaItems.length > 0) {
        return story.acceptanceCriteriaItems
      }

      const legacyLines = String(story?.acceptanceCriteria || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

      return legacyLines.map((text, idx) => ({
        id: Number(`${story.id || Date.now()}${idx}`),
        text,
        result: null,
        checked: false,
        checkedAt: null,
        checkedByUserId: null,
        attachments: []
      }))
    },
    getCriterionResult(criterion) {
      if (criterion?.result === 'ok' || criterion?.result === 'ko') return criterion.result
      if (criterion?.checked === true) return 'ok'
      return null
    },
    async setStoryCriterionResult(storyId, criterionId, result) {
      if (!this.ticket?.id) return

      const stories = (this.ticket.userStories || []).map(story => {
        if (story.id !== storyId) return story

        const currentCriteria = this.getStoryCriteria(story)
        const nextCriteria = currentCriteria.map(criterion => {
          if (criterion.id !== criterionId) return criterion
          const normalizedResult = result === 'ok' || result === 'ko' ? result : null
          return {
            ...criterion,
            result: normalizedResult,
            checked: normalizedResult === 'ok',
            checkedAt: normalizedResult === 'ok' ? new Date().toISOString() : null,
            checkedByUserId: normalizedResult === 'ok' ? (this.currentUserId || null) : null
          }
        })

        return {
          ...story,
          acceptanceCriteriaItems: nextCriteria,
          updatedAt: new Date().toISOString()
        }
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
    },
    async handleCriterionAttachmentUpload(storyId, criterionId, event) {
      if (!this.ticket?.id) return
      const files = Array.from(event?.target?.files || [])
      if (!files.length) return

      const maxSize = 5 * 1024 * 1024
      let stories = [...(this.ticket.userStories || [])]

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

          stories = stories.map(story => {
            if (story.id !== storyId) return story
            const currentCriteria = this.getStoryCriteria(story)
            return {
              ...story,
              acceptanceCriteriaItems: currentCriteria.map(criterion => {
                if (criterion.id !== criterionId) return criterion
                return {
                  ...criterion,
                  attachments: [...(criterion.attachments || []), attachment]
                }
              }),
              updatedAt: new Date().toISOString()
            }
          })
        } catch (error) {
          console.error('Erreur upload pièce jointe critère:', error)
          alert(`❌ Erreur lors de l'upload de "${file.name}"`)
        }
      }

      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
      if (event?.target) event.target.value = ''
    },
    async removeCriterionAttachment(storyId, criterionId, attachmentId) {
      if (!this.ticket?.id) return
      if (!confirm('Supprimer cette pièce jointe ?')) return

      const stories = (this.ticket.userStories || []).map(story => {
        if (story.id !== storyId) return story
        const currentCriteria = this.getStoryCriteria(story)
        return {
          ...story,
          acceptanceCriteriaItems: currentCriteria.map(criterion => {
            if (criterion.id !== criterionId) return criterion
            return {
              ...criterion,
              attachments: (criterion.attachments || []).filter(att => att.id !== attachmentId)
            }
          }),
          updatedAt: new Date().toISOString()
        }
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
    },
    async addCriterionToStory(storyId) {
      if (!this.ticket?.id) return

      const newText = (this.newCriterionByStoryId[storyId] || '').trim()
      if (!newText) return

      const stories = (this.ticket.userStories || []).map(story => {
        if (story.id !== storyId) return story

        const currentCriteria = this.getStoryCriteria(story)
        return {
          ...story,
          acceptanceCriteriaItems: [
            ...currentCriteria,
            {
              id: Date.now(),
              text: newText,
              result: null,
              checked: false,
              checkedAt: null,
              checkedByUserId: null,
              attachments: []
            }
          ],
          updatedAt: new Date().toISOString()
        }
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      this.newCriterionByStoryId = {
        ...this.newCriterionByStoryId,
        [storyId]: ''
      }
      await this.loadTicket()
    },
    async deleteStoryCriterion(storyId, criterionId) {
      if (!this.ticket?.id) return

      const stories = (this.ticket.userStories || []).map(story => {
        if (story.id !== storyId) return story

        const currentCriteria = this.getStoryCriteria(story)
        return {
          ...story,
          acceptanceCriteriaItems: currentCriteria.filter(criterion => criterion.id !== criterionId),
          updatedAt: new Date().toISOString()
        }
      })

      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
    },
    async deleteUserStoryConfirm(storyId) {
      if (!this.ticket?.id) return
      if (!confirm('Supprimer cette user story ?')) return

      const stories = (this.ticket.userStories || []).filter(story => story.id !== storyId)
      await db.updateTicket(this.ticket.id, { userStories: stories })
      await this.loadTicket()
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
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    },
    formatDateTime(dateStr) {
      return new Date(dateStr).toLocaleString('fr-FR')
    },
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '0h'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (hours === 0) return `${mins}min`
      if (mins === 0) return `${hours}h`
      return `${hours}h${mins.toString().padStart(2, '0')}`
    },
    // Gestion des fichiers
    async handleFileUpload(event) {
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
          
          if (!this.editForm.attachments) {
            this.editForm.attachments = []
          }
          
          this.editForm.attachments.push(attachment)
        } catch (error) {
          console.error('Erreur lecture fichier:', error)
          alert(`❌ Erreur lors de l'upload de "${file.name}"`)
        }
      }
      
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
    removeAttachment(index) {
      if (confirm('Supprimer ce fichier ?')) {
        this.editForm.attachments.splice(index, 1)
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
    async loadTimeEntries() {
      if (!this.ticket?.id) return
      this.timeEntries = await db.getTimeEntriesByTicket(this.ticket.id)
      this.totalTime = await db.getTotalTimeForTicket(this.ticket.id)
      this.unsyncedCount = this.timeEntries.filter(e => !e.synced).length
    },
    async addTimeEntry() {
      if (!this.ticket || !this.ticket.id) {
        alert('Ticket non chargé')
        return
      }

      const duration = (this.newTimeEntry.hours * 60) + this.newTimeEntry.minutes
      if (duration <= 0) {
        alert('La durée doit être supérieure à 0')
        return
      }

      try {
        let createdOdooId = null

        // Si ticket lié à Odoo, tenter un envoi immédiat
        if (this.ticket.odooId && this.odooConfigured) {
          try {
            createdOdooId = await odooService.createTimeEntry(
              this.ticket.odooId,
              duration,
              this.newTimeEntry.date,
              this.newTimeEntry.description || ''
            )
            this.syncSuccess = 'Entrée de temps créée et synchronisée avec Odoo'
            this.syncError = null
          } catch (syncErr) {
            console.error('Erreur synchro immédiate Odoo, sauvegarde locale uniquement:', syncErr)
            this.syncError = 'Entrée enregistrée localement. Synchronisation Odoo en attente.'
            this.syncSuccess = null
          }
        }

        await db.addTimeEntry({
          ticketId: this.ticket.id,
          duration,
          date: this.newTimeEntry.date,
          description: this.newTimeEntry.description,
          userId: this.newTimeEntry.userId ?? this.currentUserId,
          synced: !!createdOdooId,
          odooId: createdOdooId || undefined
        })
      } catch (error) {
        console.error('Erreur lors de l\'ajout de temps:', error)
        alert('Erreur lors de l\'ajout de temps: ' + error.message)
        return
      }

      // Réinitialiser le formulaire
      this.newTimeEntry = {
        hours: 0,
        minutes: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        userId: this.currentUserId
      }

      await this.loadTimeEntries()
    },
    editTimeEntry(entry) {
      this.editingTimeId = entry.id
      this.editingTimeEntry = {
        hours: Math.floor(entry.duration / 60),
        minutes: entry.duration % 60,
        date: entry.date,
        description: entry.description || '',
        userId: entry.userId ?? null
      }
    },
    async saveTimeEdit() {
      const duration = (this.editingTimeEntry.hours * 60) + this.editingTimeEntry.minutes
      if (duration <= 0) {
        alert('La durée doit être supérieure à 0')
        return
      }

      // Récupérer l'entrée avant modification pour avoir l'odooId
      const entry = this.timeEntries.find(e => e.id === this.editingTimeId)

      await db.updateTimeEntry(this.editingTimeId, {
        duration,
        date: this.editingTimeEntry.date,
        description: this.editingTimeEntry.description,
        userId: this.editingTimeEntry.userId ?? null
      })

      // Si l'entrée était synchronisée, mettre à jour dans Odoo
      if (entry?.odooId && this.ticket?.odooId && this.odooConfigured) {
        try {
          await odooService.updateTimeEntry(
            entry.odooId,
            duration,
            this.editingTimeEntry.date,
            this.editingTimeEntry.description
          )
          this.syncSuccess = 'Feuille de temps mise à jour dans Odoo'
          this.syncError = null
        } catch (error) {
          console.error('Erreur lors de la mise à jour dans Odoo:', error)
          // Désynchroniser l'entrée locale si elle n'existe plus dans Odoo
          await db.updateTimeEntry(this.editingTimeId, { synced: false, odooId: undefined })
          alert('L\'entrée a été modifiée localement mais n\'a pas pu être synchronisée avec Odoo. Elle sera envoyée lors de la prochaine synchronisation.')
        }
      } else if (!entry?.odooId && this.ticket?.odooId && this.odooConfigured) {
        // Entrée locale non synchronisée : tenter une création côté Odoo lors de l'édition
        try {
          const newOdooId = await odooService.createTimeEntry(
            this.ticket.odooId,
            duration,
            this.editingTimeEntry.date,
            this.editingTimeEntry.description || ''
          )

          await db.updateTimeEntry(this.editingTimeId, { synced: true, odooId: newOdooId })
          this.syncSuccess = 'Feuille de temps synchronisée avec Odoo'
          this.syncError = null
        } catch (error) {
          console.error('Erreur de synchro Odoo après édition:', error)
          this.syncError = 'Entrée modifiée localement. Synchronisation Odoo en attente.'
          this.syncSuccess = null
        }
      }

      this.editingTimeId = null
      await this.loadTimeEntries()
    },
    cancelTimeEdit() {
      this.editingTimeId = null
      this.editingTimeEntry = {
        hours: 0,
        minutes: 0,
        date: '',
        description: '',
        userId: null
      }
    },
    async deleteTimeEntryConfirm(entry) {
      if (!confirm('Voulez-vous vraiment supprimer cette entrée de temps ?')) return
      
      // Si l'entrée est synchronisée, supprimer aussi dans Odoo
      if (entry.odooId && this.ticket?.odooId && this.odooConfigured) {
        try {
          await odooService.deleteTimeEntry(entry.odooId)
        } catch (error) {
          console.error('Erreur lors de la suppression dans Odoo:', error)
          if (!confirm('L\'entrée n\'a pas pu être supprimée dans Odoo (elle n\'existe peut-être plus). Voulez-vous quand même la supprimer localement ?')) {
            return
          }
        }
      }
      
      await db.deleteTimeEntry(entry.id)
      await this.loadTimeEntries()
    },
    async syncTimeEntries() {
      if (!this.ticket?.odooId) {
        this.syncError = 'Ce ticket n\'est pas synchronisé avec Odoo'
        return
      }

      this.syncing = true
      this.syncError = null
      this.syncSuccess = null

      try {
        const unsyncedEntries = await db.getUnsyncedTimeEntries(this.ticket.id)
        
        if (unsyncedEntries.length === 0) {
          this.syncSuccess = 'Aucune entrée à synchroniser'
          this.syncing = false
          return
        }

        let successCount = 0
        let errorCount = 0
        let lastError = null

        for (const entry of unsyncedEntries) {
          try {
            console.log('Sync entry:', entry)
            const odooId = await odooService.createTimeEntry(
              this.ticket.odooId,
              entry.duration,
              entry.date,
              entry.description || ''
            )

            // Marquer l'entrée comme synchronisée
            await db.markTimeEntrySynced(entry.id, odooId)
            successCount++
          } catch (error) {
            console.error(`Erreur sync entry ${entry.id}:`, error)
            lastError = error
            errorCount++
          }
        }

        if (errorCount === 0) {
          this.syncSuccess = `${successCount} entrée(s) synchronisée(s) avec succès`
        } else {
          const errorMsg = lastError?.message || lastError?.toString() || 'Erreur inconnue'
          this.syncError = `${successCount} entrée(s) synchronisée(s), ${errorCount} erreur(s). Dernière erreur: ${errorMsg}`
        }

        await this.loadTimeEntries()
      } catch (error) {
        console.error('Erreur lors de la synchronisation:', error)
        this.syncError = error.message || 'Erreur lors de la synchronisation avec Odoo'
      } finally {
        this.syncing = false
      }
    },
    async syncFromOdoo() {
      if (!this.ticket?.odooId) {
        this.syncError = 'Ce ticket n\'est pas synchronisé avec Odoo'
        return
      }

      this.syncing = true
      this.syncError = null
      this.syncSuccess = null

      try {
        // Récupérer les temps depuis Odoo
        const odooTimes = await odooService.getTicketTimeEntries(this.ticket.odooId)
        
        let importedCount = 0

        for (const odooTime of odooTimes) {
          // Vérifier si cette entrée n'existe pas déjà (par odooId)
          const existingEntries = await db.getTimeEntriesByTicket(this.ticket.id)
          const alreadyExists = existingEntries.some(e => e.odooId === odooTime.id)
          
          if (!alreadyExists) {
            // Importer l'entrée
            const entryId = await db.addTimeEntry({
              ticketId: this.ticket.id,
              duration: Math.round(odooTime.unit_amount * 60), // heures -> minutes
              date: odooTime.date,
              description: odooTime.name || '',
              userId: null,
              synced: true,
              odooId: odooTime.id
            })
            importedCount++
          }
        }

        if (importedCount > 0) {
          this.syncSuccess = `${importedCount} entrée(s) importée(s) depuis Odoo`
        } else {
          this.syncSuccess = 'Aucune nouvelle entrée à importer'
        }

        await this.loadTimeEntries()
      } catch (error) {
        console.error('Erreur lors de la synchronisation depuis Odoo:', error)
        this.syncError = error.message || 'Erreur lors de la synchronisation depuis Odoo'
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 1.5rem;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #333;
  background: #f5f5f5;
}

.tab-button.active {
  color: #4DBA87;
  border-bottom-color: #4DBA87;
  font-weight: 600;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.ticket-description {
  color: #666;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item strong {
  color: #666;
  font-size: 0.875rem;
}

.info-item span {
  color: #333;
  font-size: 1rem;
}

.note-card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.note-content {
  color: #333;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.note-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid #e0e0e0;
  color: #999;
}

.message-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #4DBA87;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.message-header strong {
  color: #333;
}

.message-header small {
  color: #999;
}

.message-body {
  color: #666;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.message-meta {
  color: #999;
  font-size: 0.875rem;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-info {
  background: #cfe2ff;
  color: #084298;
  border: 1px solid #b6d4fe;
}

.alert-warning {
  background: #fff3cd;
  color: #664d03;
  border: 1px solid #ffecb5;
}

.alert-danger {
  background: #f8d7da;
  color: #842029;
  border: 1px solid #f5c2c7;
}

.recipients-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.recipient-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.recipient-item:hover {
  background: #f8f9fa;
}

.recipient-item:last-child {
  border-bottom: none;
}

.recipient-item strong {
  display: block;
  color: #333;
  margin-bottom: 0.25rem;
}

.recipient-item span {
  color: #666;
  font-size: 0.875rem;
}

.selected-recipients {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.recipient-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #4DBA87;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
}

.remove-recipient {
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: transform 0.2s;
}

.remove-recipient:hover {
  transform: scale(1.2);
}

.message-form {
  margin-bottom: 1.5rem;
}

.time-total {
  font-size: 1.25rem;
  color: #4DBA87;
  font-weight: bold;
}

.time-badge {
  background: #4DBA87;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
}

.time-form {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.time-entries-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.time-entry-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #4DBA87;
}

.time-entry-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.time-entry-main {
  display: grid;
  grid-template-columns: 100px 150px 1fr 220px;
  gap: 1.5rem;
  align-items: center;
  flex: 1;
}

.time-duration {
  font-size: 1.5rem;
  font-weight: bold;
  color: #4DBA87;
}

.time-date {
  color: #666;
  font-size: 0.95rem;
}

.time-description {
  color: #333;
  font-style: italic;
}

.time-user {
  color: #666;
  font-size: 0.9rem;
}

.time-entry-actions {
  display: flex;
  gap: 0.5rem;
}

.time-entry-edit {
  background: white;
  padding: 1rem;
  border-radius: 8px;
}

.time-entry-card.synced {
  border-left-color: #28a745;
  background: #f1f9f3;
}

.sync-badge {
  display: inline-block;
  background: #28a745;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  font-weight: bold;
}

.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-info {
  background: #d1ecf1;
  border-left: 4px solid #0c5460;
  color: #0c5460;
}

.alert-danger {
  background: #f8d7da;
  border-left: 4px solid #721c24;
  color: #721c24;
}

.alert-success {
  background: #d4edda;
  border-left: 4px solid #155724;
  color: #155724;
}

/* Styles pour les pièces jointes */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.attachment-item:hover {
  background: #e9ecef;
  border-color: #4DBA87;
  transform: translateX(4px);
}

.attachment-name {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.attachment-size {
  font-size: 0.75rem;
  color: #6c757d;
  min-width: 60px;
}

.attachment-date {
  font-size: 0.75rem;
  color: #6c757d;
  min-width: 90px;
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
</style>
