<template>
  <div class="recette-share-container">
    <div v-if="loading" class="loading-state">
      ⏳ Chargement des recettes...
    </div>

    <div v-else-if="error" class="error-state">
      ❌ {{ error }}
    </div>

    <div v-else-if="!recette" class="error-state">
      ❌ Recette non trouvée
    </div>

    <div v-else class="recette-share-content">
      <div class="recette-header">
        <h1>🧪 Recette - {{ recette.name }}</h1>
        <p v-if="recette.description" class="project-desc">{{ recette.description }}</p>
        <p v-if="project && project.name" class="project-desc" style="margin-top:0.25rem; font-size:0.92rem;">📁 Projet lié : {{ project.name }}</p>
        <div v-if="recette.preprodUrl || recette.prodUrl" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;">
          <a v-if="recette.preprodUrl" :href="recette.preprodUrl" target="_blank" rel="noopener noreferrer" class="btn-recette btn-recette-secondary">🔗 Préproduction</a>
          <a v-if="recette.prodUrl" :href="recette.prodUrl" target="_blank" rel="noopener noreferrer" class="btn-recette btn-recette-secondary">🔗 Production</a>
        </div>
      </div>

      <!-- Comptes de test -->
      <div v-if="recette.testAccounts && recette.testAccounts.length > 0" class="test-accounts-section">
        <h2>🔑 Comptes de test</h2>
        <div class="test-accounts-list">
          <div
            v-for="account in recette.testAccounts"
            :key="account.id"
            class="test-account-card"
          >
            <div class="test-account-description" v-if="account.description">
              <span class="test-account-role">{{ account.description }}</span>
            </div>
            <div class="test-account-credentials">
              <div class="test-account-field">
                <span class="test-account-label">Login</span>
                <code class="test-account-value">{{ account.login }}</code>
                <button
                  type="button"
                  class="btn-copy"
                  :class="{ copied: copiedKeys[account.id + '_login'] }"
                  @click="copyToClipboard(account.login, account.id + '_login')"
                  :title="'Copier le login : ' + account.login"
                >
                  {{ copiedKeys[account.id + '_login'] ? '✅' : '📋' }}
                </button>
              </div>
              <div class="test-account-field">
                <span class="test-account-label">Mot de passe</span>
                <code class="test-account-value">{{ account.password }}</code>
                <button
                  type="button"
                  class="btn-copy"
                  :class="{ copied: copiedKeys[account.id + '_password'] }"
                  @click="copyToClipboard(account.password, account.id + '_password')"
                  :title="'Copier le mot de passe'"
                >
                  {{ copiedKeys[account.id + '_password'] ? '✅' : '📋' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="recetteTickets.length === 0" class="empty-state">
        Aucun ticket affecté à cette recette.
      </div>

      <div v-else class="recette-list">
        <div v-for="ticket in recetteTickets" :key="ticket.id" class="recette-ticket-card">
          <div class="ticket-header">
            <h3>{{ ticket.title }}</h3>
            <span class="badge" :class="getRecetteStatusClass(ticket.recetteStatus)">
              {{ getRecetteStatusLabel(ticket.recetteStatus) }}
            </span>
          </div>

          <div v-if="ticket.description" class="ticket-description" v-html="truncateHtml(ticket.description, 300)"></div>

          <div class="recette-details">
            <div class="detail-item">
              <strong>Couverture critères :</strong>
              <span>{{ getCoverageStat(ticket) }}</span>
            </div>
            <div v-if="ticket.recetteComment" class="detail-item">
              <strong>Commentaire :</strong>
              <p class="comment-text">{{ ticket.recetteComment }}</p>
            </div>
            <div v-if="ticket.recetteDate" class="detail-item">
              <strong>Date recette :</strong>
              <span>{{ formatDateTime(ticket.recetteDate) }}</span>
            </div>
          </div>

          <div class="user-stories">
            <h4>📚 User Stories</h4>

            <form class="story-item" style="border:1px dashed #cbd5e1;" @submit.prevent="addPublicUserStory(ticket)">
              <div class="public-label">Ajouter une user story</div>
              <input
                class="public-input"
                :value="newStoryByTicketId[ticket.id]?.title || ''"
                @input="onNewStoryFieldInput(ticket.id, 'title', $event.target.value)"
                placeholder="Titre de la user story *"
                required
              />
              <input
                class="public-input"
                :value="newStoryByTicketId[ticket.id]?.phase || 'Phase 1'"
                @input="onNewStoryFieldInput(ticket.id, 'phase', $event.target.value)"
                placeholder="Phase de recette *"
                required
              />
              <textarea
                class="public-textarea"
                rows="2"
                :value="newStoryByTicketId[ticket.id]?.description || ''"
                @input="onNewStoryFieldInput(ticket.id, 'description', $event.target.value)"
                placeholder="Description (optionnel)"
              ></textarea>
              <textarea
                class="public-textarea"
                rows="2"
                :value="newStoryByTicketId[ticket.id]?.comment || ''"
                @input="onNewStoryFieldInput(ticket.id, 'comment', $event.target.value)"
                placeholder="Commentaire de recette (optionnel)"
              ></textarea>
              <textarea
                class="public-textarea"
                rows="3"
                :value="newStoryByTicketId[ticket.id]?.acceptanceCriteria || ''"
                @input="onNewStoryFieldInput(ticket.id, 'acceptanceCriteria', $event.target.value)"
                placeholder="Critères d'acceptation (un par ligne)"
              ></textarea>
              <div style="display:flex; justify-content:flex-end;">
                <button class="btn-recette btn-recette-secondary" type="submit" :disabled="isStorySaving(ticket.id)">
                  {{ isStorySaving(ticket.id) ? '⏳ Ajout...' : '+ Ajouter la user story' }}
                </button>
              </div>
            </form>

            <div v-if="!ticket.userStories || ticket.userStories.length === 0" style="color:#999; font-size:0.9rem;">Aucune user story</div>
            <div v-for="(story, storyIndex) in ticket.userStories" :key="`${ticket.id}-${story?.id ?? 'story'}-${storyIndex}`" class="story-item">
              <div class="story-title">{{ story.title }}</div>
              <div style="font-size:0.85rem; color:#475569; margin-bottom:0.35rem;">
                🧪 Phase : <strong>{{ story.recettePhase || story.phase || 'Phase 1' }}</strong>
              </div>
              <div v-if="getStoryComment(story)" style="font-size:0.9rem; color:#1e3a8a; margin-bottom:0.45rem; white-space:pre-wrap; background:#f8fbff; border:1px solid #dbeafe; border-radius:6px; padding:0.45rem 0.55rem;">
                <strong>💬 Commentaire :</strong>
                <div style="margin-top:0.2rem;">{{ getStoryComment(story) }}</div>
              </div>

              <div style="margin-bottom:0.55rem;">
                <label style="display:block; font-size:0.82rem; color:#64748b; margin-bottom:0.25rem;">Modifier le commentaire de la user story</label>
                <textarea
                  class="public-textarea"
                  rows="2"
                  :value="getStoryCommentDraft(ticket.id, story, storyIndex)"
                  @input="onStoryCommentInput(ticket.id, story, storyIndex, $event.target.value)"
                  placeholder="Ajouter un commentaire sur cette user story..."
                ></textarea>
                <div style="display:flex; justify-content:flex-end; margin-top:0.35rem;">
                  <button
                    type="button"
                    class="btn-recette btn-recette-secondary"
                    :disabled="isStoryCommentSaving(ticket.id, story.id, storyIndex)"
                    @click="saveStoryComment(ticket, story, storyIndex)"
                  >
                    {{ isStoryCommentSaving(ticket.id, story.id, storyIndex) ? '⏳ Enregistrement...' : '💾 Enregistrer le commentaire' }}
                  </button>
                </div>
              </div>

              <div class="criteria-list">
                <label v-for="(criterion, criterionIndex) in getStoryCriteria(story)" :key="`${ticket.id}-${story?.id ?? 'story'}-${storyIndex}-${criterion?.id ?? 'criterion'}-${criterionIndex}`" class="criterion" style="display:flex; flex-direction:column; align-items:stretch; gap:0.35rem;">
                  <div style="display:flex; align-items:center; gap:0.5rem; width:100%;">
                    <span :style="getCriterionResult(criterion) === 'ok' ? 'text-decoration:line-through;color:#666;flex:1;' : (getCriterionResult(criterion) === 'ko' ? 'color:#dc3545;font-weight:600;flex:1;' : 'flex:1;')">{{ criterion.text }}</span>

                    <label style="display:flex;align-items:center;gap:0.25rem;color:#198754;font-size:0.82rem;">
                      <input
                        type="checkbox"
                        :checked="getCriterionResult(criterion) === 'ok'"
                        :disabled="isCriterionSaving(ticket.id, story.id, criterion.id)"
                        @change="setCriterionResult(ticket, story, criterion, $event.target.checked ? 'ok' : null)"
                      >
                      OK
                    </label>

                    <label style="display:flex;align-items:center;gap:0.25rem;color:#dc3545;font-size:0.82rem;">
                      <input
                        type="checkbox"
                        :checked="getCriterionResult(criterion) === 'ko'"
                        :disabled="isCriterionSaving(ticket.id, story.id, criterion.id)"
                        @change="setCriterionResult(ticket, story, criterion, $event.target.checked ? 'ko' : null)"
                      >
                      KO
                    </label>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:0.25rem; width:100%; margin-left:0.25rem;">
                    <div v-if="criterion.attachments && criterion.attachments.length" style="display:flex; flex-wrap:wrap; gap:0.35rem;">
                      <div
                        v-for="(attachment, aIdx) in criterion.attachments"
                        :key="attachment.id || `pub-criterion-att-${aIdx}`"
                        class="attachment-chip"
                        @click="previewAttachment(attachment)"
                      >
                        <span>{{ getFileIcon(attachment.type || '') }}</span>
                        <span class="attachment-chip-name">{{ attachment.name }}</span>
                        <button
                          type="button"
                          class="btn-icon btn-icon-danger"
                          @click.stop="removeCriterionAttachmentPublic(ticket, story, criterion, attachment.id)"
                          title="Supprimer la pièce jointe"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip"
                      @change="handleCriterionAttachmentUploadPublic(ticket, story, criterion, $event)"
                      style="font-size:0.8rem;"
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- Section changement de statut de recette -->
          <div class="recette-actions-section">
            <h4>🔄 Mettre à jour le statut de recette</h4>
            <div style="margin-bottom: 0.75rem;">
              <textarea
                :value="statusCommentByTicketId[ticket.id] || ''"
                @input="statusCommentByTicketId = { ...statusCommentByTicketId, [ticket.id]: $event.target.value }"
                rows="2"
                placeholder="Commentaire (optionnel)..."
                class="public-textarea"
              ></textarea>
            </div>
            <div class="status-buttons-row">
              <button class="btn-recette btn-recette-secondary" @click="updateTicketStatus(ticket, 'ready_for_test')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'ready_for_test' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🧾 Prêt à tester</button>
              <button class="btn-recette btn-recette-secondary" @click="updateTicketStatus(ticket, 'in_test')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'in_test' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🧪 En test</button>
              <button class="btn-recette btn-recette-warning" @click="updateTicketStatus(ticket, 'blocked')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'blocked' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🚧 Bloqué</button>
              <button class="btn-recette btn-recette-success" @click="updateTicketStatus(ticket, 'validated')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'validated' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">✅ Validé</button>
              <button class="btn-recette btn-recette-danger" @click="updateTicketStatus(ticket, 'rejected')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'rejected' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">❌ Rejeté</button>
              <button class="btn-recette btn-recette-secondary" @click="updateTicketStatus(ticket, 'pending')" :disabled="savingStatusKeys[ticket.id]" :style="ticket.recetteStatus === 'pending' ? 'font-weight:bold;box-shadow:inset 0 0 0 2px rgba(0,0,0,0.3)' : ''">🔁 À retester</button>
              <span v-if="savingStatusKeys[ticket.id]" style="color:#6c757d;font-size:0.85rem;">⏳...</span>
              <span v-if="statusSavedKeys[ticket.id]" style="color:#28a745;font-size:0.85rem;font-weight:500;">✓ Enregistré</span>
            </div>
          </div>

          <!-- Historique de recette -->
          <div v-if="ticket.recetteHistory && ticket.recetteHistory.length > 0" class="history-section">
            <h4>🕓 Historique de recette</h4>
            <div v-for="entry in ticket.recetteHistory" :key="entry.id" class="history-entry">
              <div class="history-header">
                <div>
                  <strong>{{ getRecetteStatusLabel(entry.status) }}</strong><br>
                  <small>{{ formatDateTime(entry.createdAt) }}</small>
                </div>
              </div>
              <div v-if="entry.comment" class="history-comment">{{ entry.comment }}</div>
              <small style="color:#999;">Couverture : {{ entry.checkedCriteria || 0 }}/{{ entry.totalCriteria || 0 }}{{ entry.coveragePercent !== undefined ? ` (${entry.coveragePercent}%)` : '' }}</small>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showAttachmentPreview && currentAttachment" class="attachment-modal" @click="closeAttachmentPreview">
        <div class="attachment-modal-content" @click.stop>
          <div class="attachment-modal-header">
            <div>
              <h3>{{ currentAttachment.name }}</h3>
              <small>{{ formatFileSize(currentAttachment.size || 0) }} • {{ formatDateTime(currentAttachment.uploadedAt) }}</small>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button @click="downloadAttachment(currentAttachment)" class="btn-recette btn-recette-secondary">⬇️ Télécharger</button>
              <button @click="closeAttachmentPreview" class="btn-recette btn-recette-secondary">✕</button>
            </div>
          </div>
          <div class="attachment-modal-body">
            <img v-if="isImageFile(currentAttachment.type || '')" :src="currentAttachment.data" :alt="currentAttachment.name" class="preview-image" />
            <iframe v-else-if="isPdfFile(currentAttachment.type || '')" :src="currentAttachment.data" class="preview-pdf"></iframe>
            <div v-else class="preview-download">
              <div style="font-size: 3rem; margin-bottom: 0.75rem;">{{ getFileIcon(currentAttachment.type || '') }}</div>
              <p style="margin-bottom: 0.75rem;">{{ currentAttachment.name }}</p>
              <button @click="downloadAttachment(currentAttachment)" class="btn-recette btn-recette-secondary">⬇️ Télécharger</button>
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <small>Lien d'accès partagé - Modification des critères activée</small>
      </div>
    </div>
  </div>
</template>

<script>
import { getApiBaseUrl } from '../services/api'

export default {
  name: 'RecetteSharePublic',
  data() {
    return {
      recette: null,
      project: null,
      allTickets: [],
      loading: true,
      error: null,
      savingCriteriaKeys: {},
      storySavingKeys: {},
      storyCommentSavingKeys: {},
      storyCommentDrafts: {},
      newStoryByTicketId: {},
      statusCommentByTicketId: {},
      savingStatusKeys: {},
      statusSavedKeys: {},
      showAttachmentPreview: false,
      currentAttachment: null,
      copiedKeys: {}
    }
  },
  computed: {
    recetteTickets() {
      return this.allTickets.filter(t => {
        const inRecette = t.recetteStatus && t.recetteStatus !== 'pending'
        return inRecette || (t.userStories && t.userStories.length > 0)
      }).sort((a, b) => (b.recetteDate || b.updatedAt || b.createdAt) - (a.recetteDate || a.updatedAt || a.createdAt))
    }
  },
  async mounted() {
    await this.loadRecetteData()
  },
  methods: {
    async loadRecetteData() {
      try {
        this.loading = true
        this.error = null

        const token = this.$route.params.token
        if (!token) {
          this.error = 'Token manquant'
          return
        }

        const response = await fetch(`${getApiBaseUrl()}/public/recette/${encodeURIComponent(token)}`)
        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          this.error = body?.error || 'Accès refusé : token invalide'
          return
        }

        this.recette = body.recette || null
        this.project = body.project || null
        this.allTickets = Array.isArray(body.tickets) ? body.tickets : []
        this.storyCommentDrafts = {}
      } catch (err) {
        console.error('Erreur chargement recette share:', err)
        this.error = 'Erreur lors du chargement des données'
      } finally {
        this.loading = false
      }
    },
    getStoryCriteria(story) {
      if (Array.isArray(story?.acceptanceCriteriaItems) && story.acceptanceCriteriaItems.length > 0) {
        return story.acceptanceCriteriaItems
      }
      const legacyLines = String(story?.acceptanceCriteria || '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
      const generated = legacyLines.map((text, idx) => ({
        id: `${String(story?.id || 'story')}-${idx + 1}`,
        text,
        result: null,
        checked: false,
        attachments: []
      }))
      if (story && !Array.isArray(story.acceptanceCriteriaItems)) {
        story.acceptanceCriteriaItems = generated
      }
      return generated
    },
    getStoryComment(story) {
      return String(story?.comment || story?.commentaire || story?.recetteComment || '').trim()
    },
    getStoryRuntimeKey(ticketId, storyId, storyIndex) {
      return `${ticketId}:${storyId ?? storyIndex}`
    },
    isStoryCommentSaving(ticketId, storyId, storyIndex) {
      const key = this.getStoryRuntimeKey(ticketId, storyId, storyIndex)
      return Boolean(this.storyCommentSavingKeys[key])
    },
    getStoryCommentDraft(ticketId, story, storyIndex) {
      const key = this.getStoryRuntimeKey(ticketId, story?.id, storyIndex)
      if (Object.prototype.hasOwnProperty.call(this.storyCommentDrafts, key)) {
        return this.storyCommentDrafts[key]
      }
      return this.getStoryComment(story)
    },
    onStoryCommentInput(ticketId, story, storyIndex, value) {
      const key = this.getStoryRuntimeKey(ticketId, story?.id, storyIndex)
      this.storyCommentDrafts = {
        ...this.storyCommentDrafts,
        [key]: value
      }
    },
    async saveStoryComment(ticket, story, storyIndex) {
      const token = this.$route.params.token
      if (!story?.id) {
        alert('❌ Impossible de sauvegarder : storyId manquant')
        return
      }

      const key = this.getStoryRuntimeKey(ticket.id, story.id, storyIndex)
      const comment = String(this.getStoryCommentDraft(ticket.id, story, storyIndex) || '').trim()
      this.storyCommentSavingKeys = {
        ...this.storyCommentSavingKeys,
        [key]: true
      }

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/stories/comment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storyId: story.id,
              comment
            })
          }
        )

        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Échec de la mise à jour du commentaire')

        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) this.allTickets.splice(idx, 1, body)
      } catch (err) {
        alert(`❌ ${err?.message || 'Erreur lors de la sauvegarde du commentaire'}`)
      } finally {
        const next = { ...this.storyCommentSavingKeys }
        delete next[key]
        this.storyCommentSavingKeys = next
      }
    },
    getCriterionKey(ticketId, storyId, criterionId) {
      return `${ticketId}:${storyId}:${criterionId}`
    },
    isCriterionSaving(ticketId, storyId, criterionId) {
      const key = this.getCriterionKey(ticketId, storyId, criterionId)
      return Boolean(this.savingCriteriaKeys[key])
    },
    isStorySaving(ticketId) {
      return Boolean(this.storySavingKeys[ticketId])
    },
    onNewStoryFieldInput(ticketId, field, value) {
      const current = this.newStoryByTicketId[ticketId] || { title: '', phase: 'Phase 1', description: '', comment: '', acceptanceCriteria: '' }
      this.newStoryByTicketId = {
        ...this.newStoryByTicketId,
        [ticketId]: {
          ...current,
          [field]: value
        }
      }
    },
    getCriterionResult(criterion) {
      if (criterion?.result === 'ok' || criterion?.result === 'ko') return criterion.result
      if (criterion?.checked === true) return 'ok'
      return null
    },
    async addPublicUserStory(ticket) {
      const token = this.$route.params.token
      const form = this.newStoryByTicketId[ticket.id] || { title: '', phase: 'Phase 1', description: '', comment: '', acceptanceCriteria: '' }
      const title = String(form.title || '').trim()
      const phase = String(form.phase || '').trim() || 'Phase 1'
      if (!title) {
        alert('Le titre de la user story est requis')
        return
      }

      this.storySavingKeys = { ...this.storySavingKeys, [ticket.id]: true }
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/stories`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              phase,
              description: String(form.description || '').trim(),
              comment: String(form.comment || '').trim(),
              acceptanceCriteria: String(form.acceptanceCriteria || '').trim()
            })
          }
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Échec de l\'ajout de la user story')
        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) this.allTickets.splice(idx, 1, body)
        this.newStoryByTicketId = {
          ...this.newStoryByTicketId,
          [ticket.id]: { title: '', phase, description: '', comment: '', acceptanceCriteria: '' }
        }
      } catch (err) {
        alert(`❌ ${err?.message || 'Erreur lors de l\'ajout de la user story'}`)
      } finally {
        const next = { ...this.storySavingKeys }
        delete next[ticket.id]
        this.storySavingKeys = next
      }
    },
    async updateCriterionWithPayload(ticket, story, criterion, payload, rollback) {
      const token = this.$route.params.token
      const key = this.getCriterionKey(ticket.id, story.id, criterion.id)

      this.savingCriteriaKeys = {
        ...this.savingCriteriaKeys,
        [key]: true
      }

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/criteria`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              storyId: story.id,
              criterionId: criterion.id,
              ...payload
            })
          }
        )

        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body?.error || 'Échec de la mise à jour du critère')
        }

        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) {
          this.allTickets.splice(idx, 1, body)
        }
      } catch (err) {
        if (typeof rollback === 'function') rollback()
        alert(`❌ ${err?.message || 'Erreur lors de la mise à jour'}`)
      } finally {
        const next = { ...this.savingCriteriaKeys }
        delete next[key]
        this.savingCriteriaKeys = next
      }
    },
    async setCriterionResult(ticket, story, criterion, result) {
      const previousResult = criterion.result
      const previousChecked = criterion.checked
      const normalized = result === 'ok' || result === 'ko' ? result : null
      criterion.result = normalized
      criterion.checked = normalized === 'ok'

      await this.updateCriterionWithPayload(
        ticket,
        story,
        criterion,
        { result: normalized },
        () => {
          criterion.result = previousResult
          criterion.checked = previousChecked
        }
      )
    },
    async handleCriterionAttachmentUploadPublic(ticket, story, criterion, event) {
      const files = Array.from(event?.target?.files || [])
      if (!files.length) return
      const maxSize = 5 * 1024 * 1024

      for (const file of files) {
        if (file.size > maxSize) {
          alert(`❌ Le fichier "${file.name}" dépasse 5MB`)
          continue
        }
        try {
          const data = await this.fileToBase64(file)
          const attachment = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            data,
            uploadedAt: new Date().toISOString()
          }

          await this.updateCriterionWithPayload(ticket, story, criterion, {
            attachmentAdd: attachment
          })
        } catch (err) {
          alert(`❌ ${err?.message || 'Erreur upload fichier'}`)
        }
      }

      if (event?.target) event.target.value = ''
    },
    async removeCriterionAttachmentPublic(ticket, story, criterion, attachmentId) {
      if (!confirm('Supprimer cette pièce jointe ?')) return
      await this.updateCriterionWithPayload(ticket, story, criterion, {
        removeAttachmentId: attachmentId
      })
    },
    async updateTicketStatus(ticket, status) {
      const token = this.$route.params.token
      const comment = this.statusCommentByTicketId[ticket.id] || ''
      this.savingStatusKeys = { ...this.savingStatusKeys, [ticket.id]: true }
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/status`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, comment })
          }
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Échec de la mise à jour du statut')
        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) this.allTickets.splice(idx, 1, body)
        this.statusCommentByTicketId = { ...this.statusCommentByTicketId, [ticket.id]: '' }
        this.statusSavedKeys = { ...this.statusSavedKeys, [ticket.id]: true }
        setTimeout(() => {
          const next = { ...this.statusSavedKeys }
          delete next[ticket.id]
          this.statusSavedKeys = next
        }, 2500)
      } catch (err) {
        alert(`❌ ${err?.message || 'Erreur lors de la mise à jour'}`)
      } finally {
        const next = { ...this.savingStatusKeys }
        delete next[ticket.id]
        this.savingStatusKeys = next
      }
    },
    getCoverageStat(ticket) {
      if (!ticket.userStories || ticket.userStories.length === 0) return 'N/A'
      const allCriteria = ticket.userStories.flatMap(s => this.getStoryCriteria(s))
      const checked = allCriteria.filter(c => this.getCriterionResult(c) === 'ok').length
      const total = allCriteria.length
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0
      return `${checked} / ${total} (${percent}%)`
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
    async copyToClipboard(text, key) {
      try {
        await navigator.clipboard.writeText(text)
        this.copiedKeys = { ...this.copiedKeys, [key]: true }
        setTimeout(() => {
          this.copiedKeys = { ...this.copiedKeys, [key]: false }
        }, 2000)
      } catch (err) {
        // Fallback pour les navigateurs sans clipboard API
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        this.copiedKeys = { ...this.copiedKeys, [key]: true }
        setTimeout(() => {
          this.copiedKeys = { ...this.copiedKeys, [key]: false }
        }, 2000)
      }
    },
    formatDateTime(dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleString('fr-FR')
    },
    async fileToBase64(file) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })
    },
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
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
      return String(type || '').startsWith('image/')
    },
    isPdfFile(type) {
      return String(type || '') === 'application/pdf'
    },
    getFileIcon(type) {
      if (String(type || '').startsWith('image/')) return '🖼️'
      if (String(type || '') === 'application/pdf') return '📄'
      if (String(type || '').includes('word') || String(type || '').includes('document')) return '📝'
      if (String(type || '').includes('excel') || String(type || '').includes('spreadsheet')) return '📊'
      if (String(type || '').includes('zip') || String(type || '').includes('archive')) return '📦'
      return '📎'
    },
    truncateHtml(html, maxLength = 200) {
      if (!html) return ''
      const temp = document.createElement('div')
      temp.innerHTML = html
      const text = temp.textContent || temp.innerText || ''
      if (text.length <= maxLength) return html
      return text.substring(0, maxLength) + '...'
    }
  }
}
</script>

<style scoped>
.recette-share-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-state,
.error-state {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.error-state {
  color: #d32f2f;
  border-left: 4px solid #d32f2f;
}

.recette-share-content {
  max-width: 900px;
  margin: 0 auto;
}

.recette-header {
  background: white;
  padding: 2rem;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.recette-header h1 {
  margin: 0 0 0.5rem 0;
  color: #1976d2;
  font-size: 2rem;
}

.project-desc {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
}

.empty-state {
  background: white;
  padding: 3rem 2rem;
  border-radius: 8px;
  text-align: center;
  color: #999;
  margin-top: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.recette-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.recette-ticket-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #1976d2;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.ticket-header h3 {
  margin: 0;
  color: #333;
  flex: 1;
}

.badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-warning {
  background: #fff3cd;
  color: #856404;
}

.badge-info {
  background: #cfe2ff;
  color: #084298;
}

.badge-success {
  background: #d1e7dd;
  color: #0f5132;
}

.badge-danger {
  background: #f8d7da;
  color: #842029;
}

.ticket-description {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.recette-details {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.detail-item {
  margin-bottom: 0.5rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item strong {
  color: #333;
  display: inline-block;
  min-width: 180px;
}

.comment-text {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-style: italic;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-stories {
  margin-top: 1rem;
}

.user-stories h4 {
  margin: 0 0 0.75rem 0;
  color: #1976d2;
  font-size: 0.95rem;
}

.story-item {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.story-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.criterion {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.9rem;
  cursor: pointer;
}

.criterion input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.footer {
  text-align: center;
  color: #999;
  padding: 1rem;
  background: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Comptes de test */
.test-accounts-section {
  background: white;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #f59e0b;
}

.test-accounts-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #92400e;
}

.test-accounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.test-account-card {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 0.85rem 1rem;
}

.test-account-description {
  margin-bottom: 0.5rem;
}

.test-account-role {
  font-weight: 600;
  color: #78350f;
  font-size: 0.95rem;
}

.test-account-credentials {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.test-account-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
  flex: 1;
  min-width: 180px;
}

.test-account-label {
  font-size: 0.78rem;
  color: #92400e;
  font-weight: 600;
  white-space: nowrap;
  min-width: 80px;
}

.test-account-value {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #1e293b;
  word-break: break-all;
  background: transparent;
}

.btn-copy {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  transition: background 0.15s;
  flex-shrink: 0;
}

.btn-copy:hover {
  background: #fde68a;
}

.btn-copy.copied {
  color: #16a34a;
}

.recette-actions-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e9ecef;
}

.recette-actions-section h4 {
  margin: 0 0 0.75rem 0;
  color: #1976d2;
  font-size: 0.95rem;
}

.status-buttons-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn-recette {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.15s, box-shadow 0.15s;
}

.btn-recette:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-recette-secondary {
  background: #6c757d;
  color: white;
}

.btn-recette-warning {
  background: #ffc107;
  color: #333;
}

.btn-recette-success {
  background: #198754;
  color: white;
}

.btn-recette-danger {
  background: #dc3545;
  color: white;
}

.public-textarea {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.public-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
  margin-bottom: 0.5rem;
}

.public-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
}

.public-label {
  font-size: 0.85rem;
  color: #666;
  display: block;
  margin-bottom: 0.25rem;
}

.history-section {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e9ecef;
}

.history-section h4 {
  margin: 0 0 0.75rem 0;
  color: #555;
  font-size: 0.95rem;
}

.history-entry {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-left: 3px solid #dee2e6;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.4rem;
}

.history-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: #e9ecef;
  border: none;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  transition: background 0.15s;
}

.btn-icon:hover {
  background: #dee2e6;
}

.btn-icon-danger:hover {
  background: #f8d7da;
}

.history-comment {
  color: #555;
  font-size: 0.9rem;
  white-space: pre-wrap;
  margin-bottom: 0.25rem;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  padding: 0.2rem 0.45rem;
  cursor: pointer;
  max-width: 240px;
}

.attachment-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
  font-size: 0.8rem;
}

.attachment-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.attachment-modal-content {
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.attachment-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.attachment-modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.attachment-modal-body {
  padding: 1rem;
  overflow: auto;
  min-height: 200px;
}

.preview-image {
  max-width: 100%;
  max-height: 72vh;
  display: block;
  margin: 0 auto;
  border-radius: 8px;
}

.preview-pdf {
  width: 100%;
  height: 72vh;
  border: none;
  border-radius: 8px;
}

.preview-download {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

</style>
