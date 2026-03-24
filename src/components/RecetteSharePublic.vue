<template>
  <div class="recette-share-container">
    <div v-if="loading" class="loading-state">
      ⏳ Chargement des recettes...
    </div>

    <div v-else-if="error" class="error-state">
      ❌ {{ error }}
    </div>

    <div v-else-if="!project" class="error-state">
      ❌ Projet non trouvé
    </div>

    <div v-else class="recette-share-content">
      <div class="recette-header">
        <h1>🧪 Recette - {{ project.name }}</h1>
        <p v-if="project.description" class="project-desc">{{ project.description }}</p>
      </div>

      <div v-if="recetteTickets.length === 0" class="empty-state">
        Aucun ticket en recette pour ce projet.
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

          <div v-if="ticket.userStories && ticket.userStories.length > 0" class="user-stories">
            <h4>📚 User Stories</h4>
            <div v-for="story in ticket.userStories" :key="story.id" class="story-item">
              <div class="story-title">{{ story.title }}</div>
              <div class="criteria-list">
                <label v-for="criterion in getStoryCriteria(story)" :key="criterion.id" class="criterion">
                  <input
                    type="checkbox"
                    :checked="Boolean(criterion.checked)"
                    :disabled="isCriterionSaving(ticket.id, story.id, criterion.id)"
                    @change="toggleCriterion(ticket, story, criterion, $event.target.checked)"
                  >
                  <span>{{ criterion.text }}</span>
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
              <template v-if="!isEditingHistoryPublic(ticket.id, entry.id)">
                <div class="history-header">
                  <div>
                    <strong>{{ getRecetteStatusLabel(entry.status) }}</strong><br>
                    <small>{{ formatDateTime(entry.createdAt) }}</small>
                  </div>
                  <div class="history-actions">
                    <button class="btn-icon" @click="startEditHistoryPublic(ticket, entry)" title="Modifier">✏️</button>
                    <button class="btn-icon btn-icon-danger" @click="deleteHistoryPublic(ticket, entry.id)" title="Supprimer">🗑️</button>
                  </div>
                </div>
                <div v-if="entry.comment" class="history-comment">{{ entry.comment }}</div>
                <small style="color:#999;">Couverture : {{ entry.checkedCriteria || 0 }}/{{ entry.totalCriteria || 0 }}{{ entry.coveragePercent !== undefined ? ` (${entry.coveragePercent}%)` : '' }}</small>
              </template>
              <template v-else>
                <div style="margin-bottom:0.5rem;">
                  <label class="public-label">Statut</label>
                  <select v-model="editingPublicHistoryForm.status" class="public-select">
                    <option value="pending">🔁 À retester</option>
                    <option value="ready_for_test">🧾 Prêt à tester</option>
                    <option value="in_test">🧪 En test</option>
                    <option value="blocked">🚧 Bloqué</option>
                    <option value="validated">✅ Validé</option>
                    <option value="rejected">❌ Rejeté</option>
                  </select>
                </div>
                <div style="margin-bottom:0.5rem;">
                  <label class="public-label">Commentaire</label>
                  <textarea v-model="editingPublicHistoryForm.comment" rows="2" class="public-textarea" placeholder="Commentaire..."></textarea>
                </div>
                <div style="display:flex;gap:0.5rem;">
                  <button class="btn-recette btn-recette-success" @click="saveHistoryPublic(ticket, entry.id)">💾 Enregistrer</button>
                  <button class="btn-recette btn-recette-secondary" @click="cancelEditHistoryPublic">Annuler</button>
                </div>
              </template>
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
      project: null,
      allTickets: [],
      loading: true,
      error: null,
      savingCriteriaKeys: {},
      statusCommentByTicketId: {},
      savingStatusKeys: {},
      statusSavedKeys: {},
      editingPublicHistoryKey: null,
      editingPublicHistoryForm: { comment: '', status: '' }
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

        this.project = body.project || null
        this.allTickets = Array.isArray(body.tickets) ? body.tickets : []
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
        checked: false
      }))
      if (story && !Array.isArray(story.acceptanceCriteriaItems)) {
        story.acceptanceCriteriaItems = generated
      }
      return generated
    },
    getCriterionKey(ticketId, storyId, criterionId) {
      return `${ticketId}:${storyId}:${criterionId}`
    },
    isCriterionSaving(ticketId, storyId, criterionId) {
      const key = this.getCriterionKey(ticketId, storyId, criterionId)
      return Boolean(this.savingCriteriaKeys[key])
    },
    async toggleCriterion(ticket, story, criterion, checked) {
      const token = this.$route.params.token
      const key = this.getCriterionKey(ticket.id, story.id, criterion.id)
      const previous = Boolean(criterion.checked)

      criterion.checked = Boolean(checked)
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
              checked: Boolean(checked)
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
        criterion.checked = previous
        alert(`❌ ${err?.message || 'Erreur lors de la mise à jour'}`)
      } finally {
        const next = { ...this.savingCriteriaKeys }
        delete next[key]
        this.savingCriteriaKeys = next
      }
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
    isEditingHistoryPublic(ticketId, entryId) {
      return this.editingPublicHistoryKey === (ticketId + ':' + entryId)
    },
    startEditHistoryPublic(ticket, entry) {
      this.editingPublicHistoryKey = ticket.id + ':' + entry.id
      this.editingPublicHistoryForm = {
        comment: entry.comment || '',
        status: entry.status || 'pending'
      }
    },
    cancelEditHistoryPublic() {
      this.editingPublicHistoryKey = null
      this.editingPublicHistoryForm = { comment: '', status: '' }
    },
    async saveHistoryPublic(ticket, historyId) {
      const token = this.$route.params.token
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/history/${historyId}/update`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: this.editingPublicHistoryForm.status,
              comment: this.editingPublicHistoryForm.comment
            })
          }
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Échec de la modification')
        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) this.allTickets.splice(idx, 1, body)
        this.cancelEditHistoryPublic()
      } catch (err) {
        alert(`❌ ${err?.message || 'Erreur lors de la modification'}`)
      }
    },
    async deleteHistoryPublic(ticket, historyId) {
      if (!confirm('Supprimer cette entrée de l\'historique ?')) return
      const token = this.$route.params.token
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/public/recette/${encodeURIComponent(String(token || ''))}/tickets/${ticket.id}/history/${historyId}/delete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || 'Échec de la suppression')
        const idx = this.allTickets.findIndex(t => Number(t.id) === Number(ticket.id))
        if (idx >= 0) this.allTickets.splice(idx, 1, body)
      } catch (err) {
        alert(`❌ ${err?.message || 'Erreur lors de la suppression'}`)
      }
    },
    getCoverageStat(ticket) {
      if (!ticket.userStories || ticket.userStories.length === 0) return 'N/A'
      const allCriteria = ticket.userStories.flatMap(s => this.getStoryCriteria(s))
      const checked = allCriteria.filter(c => c.checked).length
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
    formatDateTime(dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleString('fr-FR')
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

</style>
