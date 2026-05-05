<template>
  <div class="ai-page">
    <div class="page-header">
      <div>
        <h2>🤖 Assistant IA</h2>
        <p class="subtitle">Analyse vos tickets, notes, sprints et planifications pour proposer les prochaines actions.</p>
      </div>
      <button class="btn btn-secondary" @click="$router.back()">← Retour</button>
    </div>

    <div class="card">
      <div class="toolbar">
        <button class="btn btn-primary" @click="analyzeNow" :disabled="loading">
          {{ loading ? 'Analyse en cours…' : '🧠 Générer mes priorités' }}
        </button>
        <span v-if="lastRun" class="last-run">Dernière analyse : {{ formatDateTime(lastRun) }}</span>
      </div>
      <p class="hint">
        {{ scoringInfoText }}
      </p>
    </div>

    <div class="card">
      <h3>💬 Agent IA (KPI / recherche / actions de masse)</h3>
      <p class="hint" style="margin-top: 0.4rem;">
        Exemples : “Donne les KPI tickets par statut”, “Trouve les tickets bloqués du projet 12”, “Passe en done tous les tickets low du sprint 5”.
      </p>

      <textarea
        v-model="agentPrompt"
        class="agent-input"
        rows="4"
        placeholder="Décris ce que tu veux obtenir ou modifier..."
      />

      <div class="agent-options">&
        <label>
          <input type="checkbox" v-model="agentDryRun" />
          Mode simulation (dry-run)
        </label>
        <label>
          <input type="checkbox" v-model="agentAllowMutations" />
          Autoriser les modifications/suppressions
        </label>
        <input
          v-if="agentAllowMutations"
          v-model="agentConfirmText"
          class="agent-confirm"
          placeholder="Tapez CONFIRMER pour autoriser"
        />
      </div>

      <div class="toolbar" style="margin-top: 0.75rem;">
        <button class="btn btn-primary" @click="runAgent" :disabled="agentLoading || !agentPrompt.trim()">
          {{ agentLoading ? 'Traitement…' : '🚀 Exécuter la demande' }}
        </button>
      </div>

      <div v-if="agentError" class="error-box" style="margin-top: 0.75rem;">{{ agentError }}</div>

      <div v-if="agentResult" class="agent-result">
        <div v-if="agentResult.rendering" class="render-card">
          <h4>🧠 Synthèse IA</h4>
          <p v-if="agentResult.rendering.summary" class="render-summary">{{ agentResult.rendering.summary }}</p>

          <div v-if="Array.isArray(agentResult.rendering.highlights) && agentResult.rendering.highlights.length">
            <h5>Points clés</h5>
            <ul>
              <li v-for="(item, idx) in agentResult.rendering.highlights" :key="`hl-${idx}`">{{ item }}</li>
            </ul>
          </div>

          <div v-if="Array.isArray(agentResult.rendering.nextActions) && agentResult.rendering.nextActions.length">
            <h5>Actions recommandées</h5>
            <ul>
              <li v-for="(item, idx) in agentResult.rendering.nextActions" :key="`na-${idx}`">{{ item }}</li>
            </ul>
          </div>

          <div v-if="Array.isArray(agentResult.rendering.warnings) && agentResult.rendering.warnings.length">
            <h5>Points d’attention</h5>
            <ul>
              <li v-for="(item, idx) in agentResult.rendering.warnings" :key="`wr-${idx}`">{{ item }}</li>
            </ul>
          </div>
        </div>

        <p><strong>Réponse brute :</strong> {{ agentResult.answer }}</p>
        <p v-if="agentResult.requiresConfirmation" class="confirm-warning">⚠️ {{ agentResult.confirmationMessage || 'Confirmation requise pour exécuter les mutations.' }}</p>

        <div v-if="Array.isArray(agentResult.kpiResults) && agentResult.kpiResults.length">
          <h4>KPI</h4>
          <div class="kpi-grid">
            <div v-for="(kpi, idx) in agentResult.kpiResults" :key="`kpi-${idx}`" class="kpi-card">
              <div class="kpi-title">{{ formatEntityLabel(kpi.entity) }}</div>
              <div class="kpi-subtitle">{{ kpi.metric === 'count' ? 'Nombre total' : `Somme ${kpi.field || ''}` }}</div>
              <div class="kpi-value">{{ kpi.value }}</div>
            </div>
          </div>
        </div>

        <div v-if="Array.isArray(agentResult.searchResults) && agentResult.searchResults.length">
          <h4>
            Résultats de recherche
            <template v-if="Number(agentResult.searchTotal || 0) > agentResult.searchResults.length">
              ({{ agentResult.searchResults.length }} / {{ agentResult.searchTotal }})
            </template>
            <template v-else>
              ({{ agentResult.searchResults.length }})
            </template>
          </h4>
          <div class="agent-search-meta">
            <span>{{ formatEntityLabel(agentResult?.plan?.search?.entity || '') }}</span>
            <span v-if="agentResult?.searchLimit">Limite: {{ agentResult.searchLimit }}</span>
          </div>
          <div class="agent-table-wrapper">
            <table class="agent-table">
              <thead>
                <tr>
                  <th v-for="col in getSearchColumns(agentResult.searchResults)" :key="`h-${col}`">{{ formatColumnLabel(col) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in agentResult.searchResults" :key="`r-${idx}`">
                  <td v-for="col in getSearchColumns(agentResult.searchResults)" :key="`c-${idx}-${col}`">{{ formatCellValue(row[col], col) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="Array.isArray(agentResult.mutationResults) && agentResult.mutationResults.length">
          <h4>Mutations</h4>
          <ul>
            <li v-for="(m, idx) in agentResult.mutationResults" :key="`mut-${idx}`">
              {{ m.action }} sur {{ m.entity }} • {{ m.affected }} ligne(s) {{ m.dryRun ? '(simulation)' : '(exécuté)' }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="error" class="card error-box">{{ error }}</div>

    <div class="card" v-if="!loading && suggestions.length === 0">
      <h3>✅ Rien de critique</h3>
      <p>Aucune action prioritaire détectée pour le moment.</p>
    </div>

    <div class="card" v-if="suggestions.length > 0">
      <h3>🎯 Actions recommandées</h3>
      <div class="suggestions-list">
        <div v-for="item in suggestions" :key="item.id" class="suggestion-item">
          <div class="suggestion-main">
            <div class="suggestion-title">{{ item.title }}</div>
            <div class="suggestion-meta">
              <span class="badge" :class="`badge-${item.level}`">{{ item.levelLabel }}</span>
              <span>{{ item.source }}</span>
              <span v-if="item.projectName">• {{ item.projectName }}</span>
            </div>
            <p class="suggestion-reason">{{ item.reason }}</p>
          </div>
          <div class="suggestion-actions">
            <button
              v-if="item.ticketId"
              class="btn btn-secondary btn-sm"
              @click="openTicket(item.ticketId)"
            >
              Ouvrir le ticket
            </button>
            <button
              class="btn btn-primary btn-sm"
              @click="createTodoFromSuggestion(item)"
            >
              + Ajouter à ma todo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { apiFetch } from '../services/api'
import GeminiService from '../services/gemini'

const DONE_KEYWORDS = ['done', 'termine', 'terminé', 'closed', 'resolved', 'resolu', 'résolu', 'fini', 'completed', 'valide', 'validé', 'archive', 'archivé']
const HIGH_PRIORITY_KEYWORDS = ['urgent', 'critique', 'bloquant', 'asap', 'priorite haute', 'priorité haute']
const AI_CONFIG_KEY = 'app-ai-assistant-config'
const AI_ASSISTANT_CONVERSATION_KEY = 'app-ai-assistant-conversation-id'

export default {
  name: 'AIAssistant',
  data() {
    return {
      loading: false,
      error: '',
      suggestions: [],
      lastRun: null,
      usedApiScoring: false,
      geminiService: null,
      aiConfig: {
        enabled: true,
        strategy: 'local',
        provider: 'mistral',
        baseUrl: 'https://api.mistral.ai/v1',
        apiKey: '',
        model: 'mistral-small-latest',
        temperature: 0.2,
        systemPrompt: 'Tu es un assistant de priorisation pour une application de gestion de tickets. Réponds en français, de façon concise, actionnable et structurée.'
      },
      agentPrompt: '',
      agentLoading: false,
      agentError: '',
      agentResult: null,
      agentDryRun: true,
      agentAllowMutations: false,
      agentConfirmText: '',
      agentConversationId: ''
    }
  },
  computed: {
    scoringInfoText() {
      if (this.usedApiScoring) {
        const provider = this.aiConfig?.provider === 'mistral'
          ? 'Mistral'
          : this.aiConfig?.provider === 'gemini'
            ? 'Google Gemini'
            : this.aiConfig?.provider === 'github-copilot'
              ? 'GitHub Copilot'
              : 'LLM'
        return `Scoring des priorités via votre agent API (${provider}).`
      }
      return 'Scoring des priorités en mode local (fallback).'
    }
  },
  async mounted() {
    this.loadAiConfig()
    this.agentConversationId = this.getOrCreateConversationId(AI_ASSISTANT_CONVERSATION_KEY)
    await this.analyzeNow()
  },
  methods: {
    getOrCreateConversationId(storageKey) {
      const key = String(storageKey || '').trim()
      if (!key) return ''

      try {
        const existing = localStorage.getItem(key)
        if (existing && String(existing).trim()) return String(existing).trim()

        const generated = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem(key, generated)
        return generated
      } catch {
        return `conv-${Date.now()}`
      }
    },
    loadAiConfig() {
      try {
        const raw = localStorage.getItem(AI_CONFIG_KEY)
        if (!raw) return
        this.aiConfig = { ...this.aiConfig, ...JSON.parse(raw) }
      } catch {
        // ignore config errors
      }
    },
    normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    },
    isDoneStatus(status) {
      const normalized = this.normalizeText(status)
      if (!normalized) return false
      return DONE_KEYWORDS.some(keyword => normalized.includes(keyword))
    },
    getPriorityScore(priority) {
      const p = this.normalizeText(priority)
      if (p.includes('high') || p.includes('haute') || p.includes('urgent') || p.includes('3')) return 40
      if (p.includes('medium') || p.includes('moyenne') || p.includes('2')) return 25
      return 10
    },
    daysDiff(targetDate) {
      if (!targetDate) return null
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const target = new Date(targetDate)
      if (Number.isNaN(target.getTime())) return null
      target.setHours(0, 0, 0, 0)
      const ms = target.getTime() - now.getTime()
      return Math.round(ms / (1000 * 60 * 60 * 24))
    },
    computeLevel(score) {
      if (score >= 80) return { level: 'high', levelLabel: 'Haute priorité' }
      if (score >= 55) return { level: 'medium', levelLabel: 'Priorité moyenne' }
      return { level: 'low', levelLabel: 'À planifier' }
    },
    async analyzeNow() {
      this.loading = true
      this.error = ''
      this.usedApiScoring = false
      try {
        const [projects, tickets, todos, sprints] = await Promise.all([
          db.getAllProjects(),
          db.getAllTickets(),
          db.getAllTodos(),
          db.getAllSprints()
        ])

        const projectById = new Map(projects.map(p => [Number(p.id), p.name]))
        const suggestions = []

        for (const todo of todos) {
          if (todo.completed) continue
          const diff = this.daysDiff(todo.plannedDate)
          if (diff === null) continue

          if (diff < 0) {
            const score = 85 + Math.min(Math.abs(diff), 10)
            const levelInfo = this.computeLevel(score)
            suggestions.push({
              id: `todo-overdue-${todo.id}`,
              title: `Traiter la tâche en retard : ${todo.text}`,
              reason: `Cette tâche était planifiée pour le ${todo.plannedDate}.`,
              source: 'Planification Todo',
              projectName: '',
              score,
              ...levelInfo
            })
          } else if (diff === 0) {
            const score = 62
            const levelInfo = this.computeLevel(score)
            suggestions.push({
              id: `todo-today-${todo.id}`,
              title: `Finaliser la tâche du jour : ${todo.text}`,
              reason: 'Cette tâche est planifiée pour aujourd’hui.',
              source: 'Todo du jour',
              projectName: '',
              score,
              ...levelInfo
            })
          }
        }

        for (const ticket of tickets) {
          if (this.isDoneStatus(ticket.status)) continue

          let score = this.getPriorityScore(ticket.priority) + 15
          const projectName = projectById.get(Number(ticket.projectId)) || ''

          const startDiff = this.daysDiff(ticket.startDate)
          if (startDiff !== null && startDiff < 0) score += 18
          if (startDiff === 0) score += 8

          if (!ticket.sprintId) score += 12

          const notesText = (ticket.notes || [])
            .map(n => n.content)
            .join(' ')
          const combinedText = `${ticket.title || ''} ${ticket.description || ''} ${notesText}`
          const normalizedCombinedText = this.normalizeText(combinedText)
          if (HIGH_PRIORITY_KEYWORDS.some(keyword => normalizedCombinedText.includes(this.normalizeText(keyword)))) {
            score += 20
          }

          const levelInfo = this.computeLevel(score)
          suggestions.push({
            id: `ticket-${ticket.id}`,
            ticketId: ticket.id,
            title: `Avancer sur le ticket : ${ticket.title}`,
            reason: `Statut actuel : ${ticket.status || 'non défini'}${ticket.startDate ? ` • date de début : ${ticket.startDate}` : ''}.`,
            source: 'Ticket',
            projectName,
            score,
            ...levelInfo
          })
        }

        for (const sprint of sprints) {
          const diff = this.daysDiff(sprint.endDate)
          if (diff === null || diff > 3) continue

          const openTickets = tickets.filter(t => Number(t.sprintId) === Number(sprint.id) && !this.isDoneStatus(t.status))
          if (!openTickets.length) continue

          const score = diff < 0 ? 90 : 72 + (3 - diff) * 3
          const levelInfo = this.computeLevel(score)
          suggestions.push({
            id: `sprint-${sprint.id}`,
            title: `Sécuriser la fin du sprint “${sprint.name}”`,
            reason: `${openTickets.length} ticket(s) encore ouverts pour une fin prévue le ${sprint.endDate}.`,
            source: 'Sprint',
            projectName: projectById.get(Number(sprint.projectId)) || '',
            score,
            ...levelInfo
          })

          const urgentMeetingNote = (sprint.meetingNotes || []).find(note => {
            const text = this.normalizeText(note.content)
            return HIGH_PRIORITY_KEYWORDS.some(keyword => text.includes(this.normalizeText(keyword)))
          })

          if (urgentMeetingNote) {
            const noteScore = score + 5
            const noteLevel = this.computeLevel(noteScore)
            suggestions.push({
              id: `sprint-note-${sprint.id}`,
              title: `Revoir les points critiques du sprint “${sprint.name}”`,
              reason: 'Une note de réunion contient des mots-clés urgents (urgent/bloquant/critique).',
              source: 'Notes de réunion',
              projectName: projectById.get(Number(sprint.projectId)) || '',
              score: noteScore,
              ...noteLevel
            })
          }
        }

        let finalSuggestions = suggestions
          .sort((a, b) => b.score - a.score)
          .slice(0, 25)

        const llmConfigured = (
          this.aiConfig.enabled &&
          this.aiConfig.strategy === 'llm' &&
          this.aiConfig.apiKey &&
          this.aiConfig.baseUrl &&
          this.aiConfig.model
        )

        const geminiConfigured = (
          this.aiConfig.enabled &&
          this.aiConfig.provider === 'gemini' &&
          this.aiConfig.apiKey &&
          this.aiConfig.model
        )

        if (geminiConfigured) {
          try {
            this.geminiService = new GeminiService({
              apiKey: this.aiConfig.apiKey,
              model: this.aiConfig.model,
              temperature: this.aiConfig.temperature,
              maxTokens: 2048
            })

            const contextSummary = `
Données actuelles:
- ${projects.length} projets
- ${tickets.length} tickets en total
- ${todos.filter(t => !t.completed).length} todos en cours
- ${sprints.length} sprints

Suggestions locales initiales (top 10):
${finalSuggestions.slice(0, 10).map((s, i) => `${i + 1}. [${s.levelLabel}] ${s.title}`).join('\n')}

Demande: Analyse ces données et propose les 5-7 actions les plus importantes à faire maintenant pour optimiser la productivité et la gestion du projet.`

            const geminiResponse = await this.geminiService.generateContent(
              contextSummary,
              this.aiConfig.systemPrompt
            )

            // Parser la réponse Gemini
            const parsedSuggestions = this.parseGeminiResponse(geminiResponse, finalSuggestions)
            if (parsedSuggestions.length > 0) {
              this.usedApiScoring = true
              finalSuggestions = parsedSuggestions
            }
          } catch (geminiError) {
            this.error = `Gemini API indisponible, fallback local utilisé. Détail: ${geminiError?.message || 'erreur inconnue'}`
          }
        } else if (llmConfigured) {
          try {
            const response = await apiFetch('/ai/suggestions', {
              method: 'POST',
              timeoutMs: 45000,
              body: JSON.stringify({
                config: this.aiConfig,
                context: {
                  projects,
                  tickets,
                  todos,
                  sprints,
                  localSuggestions: finalSuggestions,
                  prompt: 'Propose-moi les actions les plus importantes à faire maintenant.'
                }
              })
            })

            if (Array.isArray(response?.suggestions)) {
              this.usedApiScoring = true
              finalSuggestions = response.suggestions.map((item, index) => ({
                id: item.id || `llm-${index}`,
                title: item.title || 'Action recommandée',
                reason: item.reason || '',
                source: item.source || 'Assistant IA',
                projectName: item.projectName || '',
                ticketId: item.ticketId,
                level: item.level || 'medium',
                levelLabel: item.levelLabel || (item.level === 'high' ? 'Haute priorité' : item.level === 'low' ? 'À planifier' : 'Priorité moyenne'),
                score: Number(item.score || 60)
              }))

              if (finalSuggestions.length === 0) {
                this.error = 'Agent API contacté mais aucune suggestion n’a été renvoyée. Vérifiez le prompt système et le modèle.'
              }
            }
          } catch (apiError) {
            this.error = `Agent API indisponible, fallback local utilisé. Détail: ${apiError?.message || 'erreur inconnue'}`
          }
        } else if (this.aiConfig.enabled && this.aiConfig.strategy === 'llm') {
          this.error = 'Mode LLM activé mais configuration incomplète (API Key, Base URL ou modèle manquant). Fallback local utilisé.'
        }

        this.suggestions = finalSuggestions
        this.lastRun = new Date().toISOString()
      } catch (e) {
        this.error = e?.message || 'Erreur lors de l’analyse IA.'
      } finally {
        this.loading = false
      }
    },
    async runAgent() {
      this.agentError = ''
      this.agentResult = null

      const llmCompatible = (
        this.aiConfig.enabled &&
        this.aiConfig.strategy === 'llm' &&
        this.aiConfig.apiKey &&
        this.aiConfig.baseUrl &&
        this.aiConfig.model
      )

      if (!llmCompatible) {
        this.agentError = 'Configuration IA incomplète. Activez le mode LLM avec provider compatible OpenAI/Mistral.'
        return
      }

      try {
        this.agentLoading = true
        const response = await apiFetch('/ai/agent', {
          method: 'POST',
          timeoutMs: 60000,
          body: JSON.stringify({
            prompt: this.agentPrompt,
            config: this.aiConfig,
            renderMode: 'on',
            conversationId: this.agentConversationId,
            dryRun: this.agentDryRun,
            allowMutations: this.agentAllowMutations,
            confirmText: this.agentConfirmText,
          })
        })

        this.agentResult = response || null
      } catch (error) {
        this.agentError = error?.message || 'Erreur agent IA'
      } finally {
        this.agentLoading = false
      }
    },
    parseGeminiResponse(response, fallbackSuggestions) {
      try {
        const lines = response.split('\n').filter(l => l.trim())
        const suggestions = []

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          // Essayer d'extraire le numéro et le texte
          const match = trimmed.match(/^\d+[\.\)]\s*(.+)$/)
          if (match) {
            const text = match[1].trim()
            suggestions.push({
              id: `gemini-${suggestions.length}`,
              title: text,
              reason: 'Analysé par Google Gemini',
              source: 'Google Gemini',
              projectName: '',
              score: 65 - suggestions.length * 2,
              level: suggestions.length < 2 ? 'high' : suggestions.length < 4 ? 'medium' : 'low',
              levelLabel: suggestions.length < 2 ? 'Haute priorité' : suggestions.length < 4 ? 'Priorité moyenne' : 'À planifier'
            })
          }
        }

        return suggestions.length > 0 ? suggestions : fallbackSuggestions
      } catch {
        return fallbackSuggestions
      }
    },    openTicket(ticketId) {
      this.$router.push(`/tickets/${ticketId}`)
    },
    async createTodoFromSuggestion(item) {
      try {
        await db.addTodo({
          text: item.title,
          description: `${item.reason} (source: ${item.source})`,
          plannedDate: new Date().toISOString().split('T')[0],
          completed: false
        })
        alert('✅ Action ajoutée à votre todo du jour.')
      } catch (e) {
        alert(`❌ Impossible d’ajouter la tâche : ${e?.message || 'erreur inconnue'}`)
      }
    },
    formatDateTime(value) {
      if (!value) return '—'
      return new Date(value).toLocaleString('fr-FR')
    },
    formatEntityLabel(entity) {
      const map = {
        tickets: 'Tickets',
        projects: 'Projets',
        local_tasks: 'Tâches locales',
        todos: 'Todos',
        sprints: 'Sprints',
        time_entries: 'Temps passés'
      }
      return map[String(entity || '').toLowerCase()] || String(entity || 'Données')
    },
    getSearchColumns(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return []

      const priority = [
        'id',
        'project_id',
        'title',
        'name',
        'text',
        'status',
        'priority',
        'assigned_user_id',
        'sprint_id',
        'odoo_id',
        'created_at',
        'updated_at'
      ]

      const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))))
      const ordered = []

      for (const col of priority) {
        if (keys.includes(col)) ordered.push(col)
      }

      for (const col of keys) {
        if (!ordered.includes(col)) ordered.push(col)
      }

      return ordered.slice(0, 10)
    },
    formatColumnLabel(column) {
      return String(column || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, s => s.toUpperCase())
    },
    formatCellValue(value, column = '') {
      if (value === null || value === undefined || value === '') return '—'

      const col = String(column || '').toLowerCase()
      if (col.endsWith('_at') || col.endsWith('_date') || col === 'date') {
        const date = new Date(value)
        if (!Number.isNaN(date.getTime())) {
          return date.toLocaleString('fr-FR')
        }
      }

      if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    }
  }
}
</script>

<style scoped>
.ai-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0;
}

.subtitle {
  color: #6b7280;
  margin-top: 0.3rem;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.2rem;
  margin-bottom: 1rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.last-run {
  color: #6b7280;
  font-size: 0.9rem;
}

.hint {
  margin: 0.8rem 0 0;
  color: #6b7280;
}

.agent-input {
  width: 100%;
  margin-top: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.7rem;
  resize: vertical;
  font-family: inherit;
}

.agent-options {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: center;
}

.agent-options label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #374151;
}

.agent-confirm {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
}

.agent-result {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid #e5e7eb;
}

.render-card {
  border: 1px solid #d1fae5;
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.render-summary {
  margin: 0.35rem 0 0.65rem;
  color: #065f46;
}

.render-card h5 {
  margin: 0.45rem 0;
  color: #065f46;
}

.agent-result h4 {
  margin: 0.75rem 0 0.5rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
}

.kpi-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.65rem;
  background: linear-gradient(135deg, #f8fafc, #ffffff);
}

.kpi-title {
  font-weight: 700;
  color: #1f2937;
}

.kpi-subtitle {
  color: #6b7280;
  font-size: 0.8rem;
  margin-top: 0.15rem;
}

.kpi-value {
  margin-top: 0.45rem;
  font-size: 1.35rem;
  font-weight: 800;
  color: #059669;
}

.agent-search-meta {
  display: flex;
  gap: 0.8rem;
  color: #6b7280;
  font-size: 0.86rem;
  margin-bottom: 0.45rem;
}

.agent-table-wrapper {
  max-height: 360px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.agent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}

.agent-table th,
.agent-table td {
  padding: 0.45rem 0.55rem;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  white-space: nowrap;
}

.agent-table thead th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 1;
  color: #374151;
}

.agent-result pre {
  max-height: 280px;
  overflow: auto;
  background: #111827;
  color: #f9fafb;
  padding: 0.7rem;
  border-radius: 8px;
  font-size: 0.82rem;
}

.confirm-warning {
  color: #92400e;
  background: #fef3c7;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
}

.suggestions-list {
  display: grid;
  gap: 0.85rem;
}

.suggestion-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.9rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.suggestion-title {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.35rem;
}

.suggestion-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 0.45rem;
  flex-wrap: wrap;
}

.suggestion-reason {
  margin: 0;
  color: #374151;
  font-size: 0.92rem;
}

.suggestion-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 160px;
}

.badge {
  font-size: 0.75rem;
  border-radius: 999px;
  padding: 0.16rem 0.55rem;
  font-weight: 600;
}

.badge-high {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-medium {
  background: #fef3c7;
  color: #92400e;
}

.badge-low {
  background: #dbeafe;
  color: #1e40af;
}

.error-box {
  border-color: #fecaca;
  color: #b91c1c;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
}

.btn-primary {
  background: #4DBA87;
  color: white;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
}

.btn-sm {
  padding: 0.45rem 0.7rem;
  font-size: 0.85rem;
}

@media (max-width: 780px) {
  .suggestion-item {
    flex-direction: column;
  }

  .suggestion-actions {
    min-width: 0;
    flex-direction: row;
  }
}
</style>
