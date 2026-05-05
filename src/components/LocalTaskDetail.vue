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

    <div v-else-if="!task" class="card" style="text-align: center; color: #c00;">
      Tâche locale introuvable.
    </div>

    <template v-else>
      <!-- En-tête -->
      <div class="card task-header-card" :class="{ completed: task.completed }">
        <div class="task-header-row">
          <input
            type="checkbox"
            :checked="task.completed"
            @change="toggleCompleted"
            class="task-checkbox-big"
            :title="task.completed ? 'Marquer non terminé' : 'Marquer terminé'"
          />
          <h2 class="task-title" :class="{ 'completed-text': task.completed }">
            {{ task.title }}
          </h2>
          <span class="status-badge" :class="task.completed ? 'done' : 'pending'">
            {{ task.completed ? '✅ Terminé' : '⏳ En cours' }}
          </span>
        </div>
      </div>

      <div class="card sync-card">
        <h3>🔄 Synchronisation Odoo</h3>
        <div v-if="isSyncedToOdoo" class="sync-status sync-ok">
          ✅ Cette tâche est synchronisée vers Odoo (ID #{{ task.odooTaskId }}).
          <span v-if="task.syncedAt">Dernière synchro : {{ formatDateTime(task.syncedAt) }}</span>
        </div>
        <div v-else class="sync-status sync-pending">
          Cette tâche est locale uniquement.
        </div>
        <button
          class="btn btn-primary"
          :disabled="!canSyncTaskToOdoo || syncingOdoo"
          @click="syncTaskToOdoo"
        >
          {{ syncingOdoo ? 'Synchronisation…' : '☁️ Synchroniser cette tâche vers Odoo' }}
        </button>
        <div v-if="!canSyncTaskToOdoo && !isSyncedToOdoo" class="sync-help">
          {{ syncBlockerMessage }}
        </div>
      </div>

      <!-- Formulaire d'édition -->
      <div class="card">
        <h3>✏️ Modifier la tâche locale</h3>
        <form @submit.prevent="saveChanges" class="edit-form">

          <div class="form-group">
            <label>Titre *</label>
            <input v-model="form.title" class="form-input" required placeholder="Titre de la tâche" />
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="form.description"
              class="form-textarea"
              rows="6"
              placeholder="Description ou notes…"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Projet</label>
              <select v-model="form.projectId" class="form-input" required>
                <option value="">Sélectionner un projet</option>
                <option v-for="proj in projects" :key="proj.id" :value="proj.id">
                  {{ proj.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Statut</label>
              <select v-model="form.status" class="form-input">
                <option v-for="col in projectColumns" :key="col.id" :value="col.id">
                  {{ col.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="form.priority" class="form-input">
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div class="form-group">
              <label>Temps estimé (h)</label>
              <input v-model.number="form.estimatedTime" type="number" step="0.5" min="0" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date de début</label>
              <input v-model="form.startDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Date de fin</label>
              <input v-model="form.endDate" type="date" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>
              <input v-model="form.isChiffrage" type="checkbox" />
              Inclure dans le chiffrage
            </label>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : '💾 Enregistrer' }}
            </button>
            <button type="button" @click="$router.back()" class="btn btn-secondary">Annuler</button>
            <button type="button" @click="deleteTask" class="btn btn-danger" :disabled="saving">🗑️ Supprimer</button>
          </div>
        </form>

        <div v-if="savedMessage" class="saved-message">✅ Modifications enregistrées</div>
      </div>

      <!-- Information du sprint si associée -->
      <div v-if="task.sprintId" class="card linked-card">
        <h3>🏃 Sprint associé</h3>
        <div class="linked-item">
          <span class="linked-title">{{ sprintName }}</span>
          <button @click="goToSprint" class="btn btn-secondary btn-sm">Ouvrir sprint</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { odooService } from '../services/odoo-new'

const ODOO_ENABLED_KEY = 'app-odoo-enabled'

export default {
  name: 'LocalTaskDetail',
  data() {
    return {
      task: null,
      loading: true,
      saving: false,
      syncingOdoo: false,
      odooEnabled: true,
      savedMessage: false,
      projects: [],
      form: {
        title: '',
        description: '',
        projectId: '',
        status: 'todo',
        priority: 'medium',
        estimatedTime: 0,
        startDate: '',
        endDate: '',
        isChiffrage: false,
        completed: false
      }
    }
  },
  computed: {
    currentProject() {
      const projectId = Number(this.form.projectId || this.task?.projectId)
      if (!projectId) return null
      return this.projects.find(p => Number(p.id) === projectId) || null
    },
    isSyncedToOdoo() {
      return !!this.task?.odooTaskId
    },
    canSyncTaskToOdoo() {
      return !!(
        this.task?.id &&
        !this.task?.odooTaskId &&
        this.odooEnabled &&
        this.currentProject?.odooId &&
        odooService.isConfigured()
      )
    },
    syncBlockerMessage() {
      if (!this.odooEnabled) {
        return 'La synchronisation Odoo est désactivée dans Administration.'
      }
      if (!this.currentProject?.odooId) {
        return 'Le projet de cette tâche n\'est pas lié à un projet Odoo.'
      }
      if (!odooService.isConfigured()) {
        return 'La connexion Odoo n\'est pas configurée.'
      }
      return 'Synchronisation indisponible pour cette tâche.'
    },
    projectColumns() {
      if (!this.form.projectId) return [];
      const project = this.projects.find(p => p.id === Number(this.form.projectId));
      if (!project || !project.kanbanColumns) {
        return [
          { id: 'todo', label: 'À faire' },
          { id: 'in-progress', label: 'En cours' },
          { id: 'done', label: 'Terminé' }
        ];
      }
      return project.kanbanColumns;
    },
    sprintName() {
      if (!this.task?.sprintId) return '';
      return this.$router.currentRoute.value.params.sprintName || `Sprint ${this.task.sprintId}`;
    }
  },
  async mounted() {
    const taskId = Number(this.$route.params.id);
    if (!taskId) {
      this.$router.back();
      return;
    }

    try {
      const odooEnabledRaw = localStorage.getItem(ODOO_ENABLED_KEY)
      this.odooEnabled = odooEnabledRaw === null ? true : odooEnabledRaw === 'true'

      this.task = await db.getLocalTask(taskId);
      if (this.task) {
        this.form = {
          title: this.task.title || '',
          description: this.task.description || '',
          projectId: this.task.projectId || '',
          status: this.task.status || 'todo',
          priority: this.task.priority || 'medium',
          estimatedTime: this.task.estimatedTime || 0,
          startDate: this.task.startDate || '',
          endDate: this.task.endDate || '',
          isChiffrage: this.task.isChiffrage || false,
          completed: this.task.completed || false
        };
      }
      this.projects = await db.getAllProjects();
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async toggleCompleted() {
      try {
        this.saving = true;
        await db.updateLocalTask(this.task.id, { completed: !this.task.completed });
        this.task.completed = !this.task.completed;
        this.form.completed = this.task.completed;
        this.showSavedMessage();
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        this.saving = false;
      }
    },
    async saveChanges() {
      try {
        if (!this.form.title.trim()) {
          alert('Le titre est obligatoire');
          return;
        }

        this.saving = true;
        await db.updateLocalTask(this.task.id, {
          title: this.form.title,
          description: this.form.description,
          projectId: Number(this.form.projectId),
          status: this.form.status,
          priority: this.form.priority,
          estimatedTime: this.form.estimatedTime,
          startDate: this.form.startDate || null,
          endDate: this.form.endDate || null,
          isChiffrage: this.form.isChiffrage,
          completed: this.form.completed
        });

        this.task = await db.getLocalTask(this.task.id);
        this.showSavedMessage();
      } catch (err) {
        console.error('Erreur lors de la sauvegarde:', err);
        alert('Erreur lors de la sauvegarde');
      } finally {
        this.saving = false;
      }
    },
    async deleteTask() {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
        return;
      }

      try {
        this.saving = true;
        await db.deleteLocalTask(this.task.id);
        this.$router.back();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        alert('Erreur lors de la suppression');
      } finally {
        this.saving = false;
      }
    },
    showSavedMessage() {
      this.savedMessage = true;
      setTimeout(() => {
        this.savedMessage = false;
      }, 3000);
    },
    formatDateTime(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleString('fr-FR')
    },
    async syncTaskToOdoo() {
      if (!this.canSyncTaskToOdoo || !this.task) return

      try {
        this.syncingOdoo = true

        const createdOdooTaskId = await odooService.createProjectTask(
          Number(this.currentProject.odooId),
          this.task.title,
          this.task.description || '',
          this.task.priority || 'medium'
        )

        const syncedAt = new Date().toISOString()

        await db.updateLocalTask(this.task.id, {
          syncMode: 'odoo',
          odooTaskId: createdOdooTaskId,
          syncedAt
        })

        await db.upsertOdooTask({
          odooId: createdOdooTaskId,
          projectOdooId: Number(this.currentProject.odooId),
          localProjectId: Number(this.currentProject.id),
          projectName: this.currentProject.name,
          title: this.task.title,
          description: this.task.description || '',
          status: this.task.status || 'todo',
          priority: this.task.priority || 'medium',
          syncedAt
        })

        this.task = await db.getLocalTask(this.task.id)
        alert('✅ Tâche synchronisée vers Odoo.')
      } catch (err) {
        console.error('Erreur de synchronisation tâche locale vers Odoo:', err)
        alert(`❌ ${err?.message || 'Erreur de synchronisation Odoo'}`)
      } finally {
        this.syncingOdoo = false
      }
    },
    goToSprint() {
      if (this.task?.sprintId) {
        this.$router.push({
          name: 'sprints',
          params: { projectId: this.task.projectId },
          query: { sprintId: this.task.sprintId }
        });
      }
    }
  }
}
</script>

<style scoped>
.task-header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1.5rem;
}

.task-header-card.completed {
  opacity: 0.8;
  background: linear-gradient(135deg, #999 0%, #666 100%);
}

.task-header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.task-checkbox-big {
  width: 24px;
  height: 24px;
  cursor: pointer;
  flex-shrink: 0;
}

.task-title {
  margin: 0;
  flex: 1;
  font-size: 1.5rem;
}

.task-title.completed-text {
  text-decoration: line-through;
  opacity: 0.7;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.form-actions button {
  flex: 1;
  min-width: 100px;
}

.saved-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #d1e7dd;
  color: #0f5132;
  border-radius: 4px;
  text-align: center;
}

.linked-card {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
}

.linked-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.linked-title {
  flex: 1;
  font-weight: 500;
}

.sync-card {
  border-left: 4px solid #3b82f6;
}

.sync-status {
  margin-bottom: 0.75rem;
  font-size: 0.92rem;
}

.sync-status span {
  display: block;
  color: #6b7280;
  margin-top: 0.25rem;
}

.sync-ok {
  color: #166534;
}

.sync-pending {
  color: #374151;
}

.sync-help {
  margin-top: 0.65rem;
  font-size: 0.85rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
