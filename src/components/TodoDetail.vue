<template>
  <div>
    <div class="page-header">
      <div>
        <button @click="$router.back()" class="btn btn-secondary back-btn">← Retour</button>
      </div>
    </div>

    <div v-if="loading" class="card" style="text-align: center; color: #666;">
      Chargement…
    </div>

    <div v-else-if="!todo" class="card" style="text-align: center; color: #c00;">
      Tâche introuvable.
    </div>

    <template v-else>
      <!-- En-tête -->
      <div class="card todo-header-card" :class="{ completed: todo.completed }">
        <div class="todo-header-row">
          <input
            type="checkbox"
            :checked="todo.completed"
            @change="toggleCompleted"
            class="todo-checkbox-big"
            :title="todo.completed ? 'Marquer non terminé' : 'Marquer terminé'"
          />
          <h2 class="todo-title" :class="{ 'completed-text': todo.completed }">
            {{ todo.text }}
          </h2>
          <span class="status-badge" :class="todo.completed ? 'done' : 'pending'">
            {{ todo.completed ? '✅ Terminé' : '⏳ En cours' }}
          </span>
        </div>
      </div>

      <!-- Formulaire d'édition -->
      <div class="card">
        <h3>✏️ Modifier la tâche</h3>
        <form @submit.prevent="saveChanges" class="edit-form">

          <div class="form-group">
            <label>Titre</label>
            <input v-model="form.text" class="form-input" required placeholder="Titre de la tâche" />
          </div>

          <div class="form-group">
            <label>Note / Description</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              rows="10"
              placeholder="Ajoutez une note détaillée, des informations complémentaires, des liens…"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date planifiée</label>
              <select v-model="form.plannedDate" class="form-input">
                <option v-for="day in next7Days" :key="day.date" :value="day.date">
                  {{ day.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Créé le</label>
              <input
                :value="formatDate(todo.createdAt)"
                class="form-input"
                disabled
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : '💾 Enregistrer' }}
            </button>
            <button type="button" @click="$router.back()" class="btn btn-secondary">Annuler</button>
          </div>
        </form>

        <div v-if="savedMessage" class="saved-message">✅ Modifications enregistrées</div>
      </div>

      <!-- Lien vers ticket ou tâche Odoo associée -->
      <div v-if="linkedTicket" class="card linked-card">
        <h3>🎫 Ticket associé</h3>
        <div class="linked-item">
          <span class="linked-title">{{ linkedTicket.title }}</span>
          <span class="priority-badge" :class="linkedTicket.priority">{{ getPriorityLabel(linkedTicket.priority) }}</span>
          <router-link :to="`/tickets/${linkedTicket.id}`" class="btn btn-secondary btn-sm">Ouvrir</router-link>
        </div>
      </div>

      <div v-if="linkedOdooTask" class="card linked-card">
        <h3>🧩 Tâche Odoo associée</h3>
        <div class="linked-item">
          <span class="linked-title">{{ linkedOdooTask.title }}</span>
          <router-link :to="`/tasks/${linkedOdooTask.odooId}`" class="btn btn-secondary btn-sm">Ouvrir</router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'TodoDetail',
  data() {
    return {
      todo: null,
      loading: true,
      saving: false,
      savedMessage: false,
      tickets: [],
      odooTasks: [],
      form: {
        text: '',
        description: '',
        plannedDate: ''
      }
    }
  },
  computed: {
    next7Days() {
      const days = []
      const today = new Date()
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = dayNames[date.getDay()]
        const dayNum = date.getDate()
        const month = date.toLocaleDateString('fr-FR', { month: 'short' })
        days.push({
          date: dateStr,
          label: i === 0 ? "Aujourd'hui" : `${dayName} ${dayNum} ${month}`
        })
      }
      return days
    },
    linkedTicket() {
      if (!this.todo?.text) return null
      const ticketOdooMatch = this.todo.text.match(/^\[TICKET ODOO #(\d+)\]/)
      if (ticketOdooMatch) {
        const odooId = parseInt(ticketOdooMatch[1])
        return this.tickets.find(t => Number(t.odooId) === odooId) || null
      }
      const ticketMatch = this.todo.text.match(/^\[TICKET\]\s*(.+)$/)
      if (ticketMatch) {
        const title = ticketMatch[1]
        return this.tickets.find(t => t.title === title) || null
      }
      return null
    },
    linkedOdooTask() {
      if (!this.todo?.text) return null
      const taskMatch = this.todo.text.match(/^\[TÂCHE ODOO #(\d+)\]/)
      if (!taskMatch) return null
      const odooId = parseInt(taskMatch[1])
      return this.odooTasks.find(t => Number(t.odooId) === odooId) || null
    }
  },
  async mounted() {
    const id = parseInt(this.$route.params.id)
    try {
      const all = await db.getAllTodos()
      this.todo = all.find(t => t.id === id) || null
      if (this.todo) {
        this.form.text = this.todo.text
        this.form.description = this.todo.description || ''
        this.form.plannedDate = this.todo.plannedDate
      }
    } catch (e) {
      console.error(e)
    }
    this.tickets = await db.getAllTickets()
    this.odooTasks = await db.getAllOdooTasks()
    this.loading = false
  },
  methods: {
    async saveChanges() {
      if (!this.todo) return
      this.saving = true
      try {
        await db.updateTodo(this.todo.id, {
          text: this.form.text.trim(),
          description: this.form.description,
          plannedDate: this.form.plannedDate
        })
        this.todo.text = this.form.text.trim()
        this.todo.description = this.form.description
        this.todo.plannedDate = this.form.plannedDate
        this.savedMessage = true
        setTimeout(() => { this.savedMessage = false }, 2500)
      } catch (e) {
        alert('Erreur lors de la sauvegarde.')
        console.error(e)
      }
      this.saving = false
    },
    async toggleCompleted() {
      if (!this.todo) return
      await db.toggleTodo(this.todo.id)
      this.todo.completed = !this.todo.completed
    },
    formatDate(dateStr) {
      if (!dateStr) return '—'
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    getPriorityLabel(priority) {
      const labels = { high: '🔴 Haute', medium: '🟡 Moyenne', low: '🟢 Basse' }
      return labels[priority] || priority
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.back-btn {
  font-size: 0.95rem;
}

.todo-header-card {
  border-left: 5px solid #4DBA87;
  transition: border-color 0.3s;
}

.todo-header-card.completed {
  border-left-color: #aaa;
  opacity: 0.85;
}

.todo-header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.todo-checkbox-big {
  width: 24px;
  height: 24px;
  cursor: pointer;
  flex-shrink: 0;
}

.todo-title {
  flex: 1;
  margin: 0;
  font-size: 1.4rem;
  color: #333;
  word-break: break-word;
}

.todo-title.completed-text {
  text-decoration: line-through;
  color: #999;
}

.status-badge {
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.done {
  background: #d1e7dd;
  color: #0a4a29;
}

.status-badge.pending {
  background: #fff3cd;
  color: #664d03;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #444;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-input {
  padding: 0.6rem 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4DBA87;
}

.form-input:disabled {
  background: #f5f5f5;
  color: #888;
  cursor: not-allowed;
}

.form-textarea {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #4DBA87;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.saved-message {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: #d1e7dd;
  color: #0a4a29;
  border-radius: 6px;
  font-size: 0.9rem;
  animation: fadeout 2.5s forwards;
}

@keyframes fadeout {
  0%   { opacity: 1; }
  70%  { opacity: 1; }
  100% { opacity: 0; }
}

.linked-card h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.linked-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.linked-title {
  flex: 1;
  font-size: 0.95rem;
  color: #333;
}

.priority-badge {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  background: #f0f0f0;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .todo-header-row {
    flex-wrap: wrap;
  }
}
</style>
