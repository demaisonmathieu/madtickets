<template>
  <div>
    <div class="page-header">
      <div>
        <h2>🧪 Recettes</h2>
        <p style="color:#666; margin-top:0.35rem;">Créez des objets recette indépendants, affectez un projet/sprint et rattachez tickets/tâches.</p>
      </div>
    </div>

    <div class="card">
      <h3>Nouvelle recette</h3>
      <div class="form-grid">
        <div>
          <label>Nom *</label>
          <input v-model.trim="form.name" placeholder="Ex: Recette Sprint 12" />
        </div>
        <div>
          <label>Projet (optionnel)</label>
          <select v-model.number="form.projectId">
            <option :value="null">Aucun</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
        <div>
          <label>Sprint (optionnel)</label>
          <select v-model.number="form.sprintId">
            <option :value="null">Aucun</option>
            <option v-for="sprint in filteredSprints" :key="sprint.id" :value="sprint.id">{{ sprint.name }}</option>
          </select>
        </div>
        <div>
          <label>URL préprod</label>
          <input v-model.trim="form.preprodUrl" placeholder="https://preprod..." />
        </div>
        <div>
          <label>URL production</label>
          <input v-model.trim="form.prodUrl" placeholder="https://prod..." />
        </div>
      </div>

      <div style="margin-top:0.8rem;">
        <label>Description</label>
        <textarea v-model.trim="form.description" rows="3" placeholder="Contexte de recette"></textarea>
      </div>

      <div style="margin-top:0.9rem;">
        <label>Comptes de test</label>
        <div v-for="(account, index) in form.testAccounts" :key="`new-account-${index}`" class="account-row">
          <input v-model.trim="account.login" placeholder="Login" />
          <input v-model.trim="account.password" placeholder="Mot de passe" />
          <input v-model.trim="account.description" placeholder="Description" />
          <button class="btn btn-danger btn-xs" @click="removeNewAccount(index)">✕</button>
        </div>
        <button class="btn btn-secondary btn-sm" @click="addNewAccount">+ Ajouter un compte</button>
      </div>

      <div style="margin-top:1rem;">
        <button class="btn btn-primary" :disabled="!form.name || saving" @click="createRecette">
          {{ saving ? '⏳ Création...' : 'Créer la recette' }}
        </button>
      </div>
    </div>

    <div class="card" v-if="recettes.length">
      <h3>Recettes existantes</h3>
      <div v-for="recette in recettes" :key="recette.id" class="recette-row">
        <div>
          <strong>{{ recette.name }}</strong>
          <div style="color:#666; font-size:0.88rem;">
            Projet: {{ projectName(recette.projectId) }} • Sprint: {{ sprintName(recette.sprintId) }}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-primary btn-sm" @click="startEditRecette(recette)">Éditer</button>
          <button class="btn btn-secondary btn-sm" @click="selectRecette(recette)">Affectations</button>
          <button class="btn btn-secondary btn-sm" @click="copyPublicLink(recette)">Copier lien</button>
          <button class="btn btn-danger btn-sm" @click="deleteRecette(recette)">Supprimer</button>
        </div>
      </div>
    </div>

    <div class="card" v-if="editingRecetteId">
      <h3>✏️ Éditer la recette</h3>
      <div class="form-grid">
        <div>
          <label>Nom *</label>
          <input v-model.trim="editForm.name" placeholder="Nom de la recette" />
        </div>
        <div>
          <label>Projet</label>
          <select v-model.number="editForm.projectId">
            <option :value="null">Aucun</option>
            <option v-for="project in projects" :key="`edit-p-${project.id}`" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
        <div>
          <label>Sprint</label>
          <select v-model.number="editForm.sprintId">
            <option :value="null">Aucun</option>
            <option v-for="sprint in editFilteredSprints" :key="`edit-s-${sprint.id}`" :value="sprint.id">{{ sprint.name }}</option>
          </select>
        </div>
        <div>
          <label>URL préprod</label>
          <input v-model.trim="editForm.preprodUrl" placeholder="https://preprod..." />
        </div>
        <div>
          <label>URL production</label>
          <input v-model.trim="editForm.prodUrl" placeholder="https://prod..." />
        </div>
      </div>

      <div style="margin-top:0.8rem;">
        <label>Description</label>
        <textarea v-model.trim="editForm.description" rows="3" placeholder="Contexte de recette"></textarea>
      </div>

      <div style="margin-top:0.9rem;">
        <label>Comptes de test</label>
        <div v-for="(account, index) in editForm.testAccounts" :key="`edit-account-${index}`" class="account-row">
          <input v-model.trim="account.login" placeholder="Login" />
          <input v-model.trim="account.password" placeholder="Mot de passe" />
          <input v-model.trim="account.description" placeholder="Description" />
          <button class="btn btn-danger btn-xs" @click="removeEditAccount(index)">✕</button>
        </div>
        <button class="btn btn-secondary btn-sm" @click="addEditAccount">+ Ajouter un compte</button>
      </div>

      <div class="edit-actions">
        <button class="btn btn-primary" :disabled="!editForm.name || savingEdit" @click="saveRecetteEdits">
          {{ savingEdit ? '⏳ Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
        <button class="btn btn-secondary" @click="cancelEditRecette">Annuler</button>
      </div>
    </div>

    <div class="card" v-if="selectedRecette">
      <h3>Affectations — {{ selectedRecette.name }}</h3>
      <p style="color:#666; margin-bottom:0.8rem;">Sélectionnez les tickets et tâches qui doivent appartenir à cette recette.</p>

      <div class="assignment-columns">
        <div>
          <h4>🎫 Tickets</h4>
          <label v-for="ticket in candidateTickets" :key="`tk-${ticket.id}`" class="checkbox-row">
            <input type="checkbox" :checked="selectedTicketIds.includes(ticket.id)" @change="toggleTicket(ticket.id)" />
            <span>#{{ ticket.id }} — {{ ticket.title }}</span>
          </label>
          <div v-if="candidateTickets.length === 0" class="empty-hint">Aucun ticket disponible.</div>
        </div>

        <div>
          <h4>✅ Tâches locales</h4>
          <label v-for="task in candidateLocalTasks" :key="`lt-${task.id}`" class="checkbox-row">
            <input type="checkbox" :checked="selectedLocalTaskIds.includes(task.id)" @change="toggleLocalTask(task.id)" />
            <span>#{{ task.id }} — {{ task.title }}</span>
          </label>
          <div v-if="candidateLocalTasks.length === 0" class="empty-hint">Aucune tâche locale disponible.</div>
        </div>
      </div>

      <div style="margin-top:1rem; display:flex; gap:0.5rem;">
        <button class="btn btn-primary" :disabled="savingAssignments" @click="saveAssignments">
          {{ savingAssignments ? '⏳ Enregistrement...' : 'Enregistrer les affectations' }}
        </button>
        <button class="btn btn-secondary" @click="selectedRecette = null">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import { auth } from '../services/auth'

export default {
  name: 'RecettesList',
  data() {
    return {
      loading: false,
      saving: false,
      savingAssignments: false,
      currentUser: auth.getSession(),
      projects: [],
      sprints: [],
      tickets: [],
      localTasks: [],
      recettes: [],
      selectedRecette: null,
      editingRecetteId: null,
      savingEdit: false,
      selectedTicketIds: [],
      selectedLocalTaskIds: [],
      form: {
        name: '',
        description: '',
        projectId: null,
        sprintId: null,
        preprodUrl: '',
        prodUrl: '',
        testAccounts: []
      },
      editForm: {
        name: '',
        description: '',
        projectId: null,
        sprintId: null,
        preprodUrl: '',
        prodUrl: '',
        testAccounts: []
      }
    }
  },
  computed: {
    filteredSprints() {
      if (!this.form.projectId) return this.sprints
      return this.sprints.filter(s => Number(s.projectId) === Number(this.form.projectId))
    },
    candidateTickets() {
      if (!this.selectedRecette) return []
      return this.filterItemsByScope(this.tickets, this.selectedRecette)
    },
    candidateLocalTasks() {
      if (!this.selectedRecette) return []
      return this.filterItemsByScope(this.localTasks, this.selectedRecette)
    },
    editFilteredSprints() {
      if (!this.editForm.projectId) return this.sprints
      return this.sprints.filter(s => Number(s.projectId) === Number(this.editForm.projectId))
    }
  },
  async mounted() {
    await this.loadAll()
  },
  methods: {
    async loadAll() {
      this.loading = true
      try {
        const [projects, sprints, tickets, localTasks, recettes] = await Promise.all([
          db.getAllProjects(),
          db.getAllSprints(),
          db.getAllTickets(),
          db.getAllLocalTasks(),
          db.getAllRecettes()
        ])
        this.projects = projects
        this.sprints = sprints
        this.tickets = tickets
        this.localTasks = localTasks
        this.recettes = recettes
      } catch (error) {
        console.error('Erreur chargement recettes:', error)
        alert('Erreur lors du chargement des recettes')
      } finally {
        this.loading = false
      }
    },
    addNewAccount() {
      this.form.testAccounts.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        login: '',
        password: '',
        description: ''
      })
    },
    removeNewAccount(index) {
      this.form.testAccounts.splice(index, 1)
    },
    projectName(projectId) {
      const project = this.projects.find(p => Number(p.id) === Number(projectId))
      return project?.name || 'Aucun'
    },
    sprintName(sprintId) {
      const sprint = this.sprints.find(s => Number(s.id) === Number(sprintId))
      return sprint?.name || 'Aucun'
    },
    buildToken() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
    async createRecette() {
      if (!this.form.name || this.saving) return
      this.saving = true
      try {
        await db.addRecette({
          name: this.form.name,
          description: this.form.description,
          projectId: this.form.projectId || null,
          sprintId: this.form.sprintId || null,
          preprodUrl: this.form.preprodUrl || '',
          prodUrl: this.form.prodUrl || '',
          testAccounts: this.form.testAccounts,
          shareToken: this.buildToken(),
          createdByUserId: this.currentUser?.userId || null
        })

        this.resetCreateForm()

        await this.loadAll()
      } catch (error) {
        console.error('Erreur création recette:', error)
        alert('Impossible de créer la recette')
      } finally {
        this.saving = false
      }
    },
    resetCreateForm() {
      this.form = {
        name: '',
        description: '',
        projectId: null,
        sprintId: null,
        preprodUrl: '',
        prodUrl: '',
        testAccounts: []
      }
    },
    startEditRecette(recette) {
      this.editingRecetteId = Number(recette.id)
      this.editForm = {
        name: recette.name || '',
        description: recette.description || '',
        projectId: recette.projectId || null,
        sprintId: recette.sprintId || null,
        preprodUrl: recette.preprodUrl || '',
        prodUrl: recette.prodUrl || '',
        testAccounts: Array.isArray(recette.testAccounts)
          ? recette.testAccounts.map(account => ({ ...account }))
          : []
      }
    },
    cancelEditRecette() {
      this.editingRecetteId = null
      this.savingEdit = false
      this.editForm = {
        name: '',
        description: '',
        projectId: null,
        sprintId: null,
        preprodUrl: '',
        prodUrl: '',
        testAccounts: []
      }
    },
    addEditAccount() {
      this.editForm.testAccounts.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        login: '',
        password: '',
        description: ''
      })
    },
    removeEditAccount(index) {
      this.editForm.testAccounts.splice(index, 1)
    },
    async saveRecetteEdits() {
      if (!this.editingRecetteId || !this.editForm.name || this.savingEdit) return
      this.savingEdit = true
      try {
        await db.updateRecette(this.editingRecetteId, {
          name: this.editForm.name,
          description: this.editForm.description,
          projectId: this.editForm.projectId || null,
          sprintId: this.editForm.sprintId || null,
          preprodUrl: this.editForm.preprodUrl || '',
          prodUrl: this.editForm.prodUrl || '',
          testAccounts: this.editForm.testAccounts || []
        })

        if (this.selectedRecette && Number(this.selectedRecette.id) === Number(this.editingRecetteId)) {
          this.selectedRecette = {
            ...this.selectedRecette,
            name: this.editForm.name,
            description: this.editForm.description,
            projectId: this.editForm.projectId || null,
            sprintId: this.editForm.sprintId || null,
            preprodUrl: this.editForm.preprodUrl || '',
            prodUrl: this.editForm.prodUrl || '',
            testAccounts: this.editForm.testAccounts || []
          }
        }

        await this.loadAll()
        this.cancelEditRecette()
        alert('✅ Recette mise à jour')
      } catch (error) {
        console.error('Erreur mise à jour recette:', error)
        alert('Impossible de mettre à jour la recette')
      } finally {
        this.savingEdit = false
      }
    },
    filterItemsByScope(items, recette) {
      return items.filter(item => {
        const sameProject = !recette.projectId || Number(item.projectId) === Number(recette.projectId)
        const sameSprint = !recette.sprintId || Number(item.sprintId) === Number(recette.sprintId)
        return sameProject && sameSprint
      })
    },
    async selectRecette(recette) {
      this.selectedRecette = recette
      const [linkedTickets, linkedTasks] = await Promise.all([
        db.getTicketsByRecette(recette.id),
        db.getLocalTasksByRecette(recette.id)
      ])
      this.selectedTicketIds = linkedTickets.map(t => t.id)
      this.selectedLocalTaskIds = linkedTasks.map(t => t.id)
    },
    toggleTicket(ticketId) {
      const set = new Set(this.selectedTicketIds)
      if (set.has(ticketId)) set.delete(ticketId)
      else set.add(ticketId)
      this.selectedTicketIds = [...set]
    },
    toggleLocalTask(taskId) {
      const set = new Set(this.selectedLocalTaskIds)
      if (set.has(taskId)) set.delete(taskId)
      else set.add(taskId)
      this.selectedLocalTaskIds = [...set]
    },
    async saveAssignments() {
      if (!this.selectedRecette || this.savingAssignments) return
      this.savingAssignments = true
      try {
        const recetteId = Number(this.selectedRecette.id)

        const allScopedTickets = this.filterItemsByScope(this.tickets, this.selectedRecette)
        const currentlyLinkedTickets = await db.getTicketsByRecette(recetteId)
        const touchedTicketIds = new Set([
          ...allScopedTickets.map(t => Number(t.id)),
          ...currentlyLinkedTickets.map(t => Number(t.id))
        ])

        for (const ticketId of touchedTicketIds) {
          const shouldLink = this.selectedTicketIds.includes(ticketId)
          await db.updateTicket(ticketId, { recetteId: shouldLink ? recetteId : null })
        }

        const allScopedTasks = this.filterItemsByScope(this.localTasks, this.selectedRecette)
        const currentlyLinkedTasks = await db.getLocalTasksByRecette(recetteId)
        const touchedTaskIds = new Set([
          ...allScopedTasks.map(t => Number(t.id)),
          ...currentlyLinkedTasks.map(t => Number(t.id))
        ])

        for (const taskId of touchedTaskIds) {
          const shouldLink = this.selectedLocalTaskIds.includes(taskId)
          await db.updateLocalTask(taskId, { recetteId: shouldLink ? recetteId : null })
        }

        await this.loadAll()
        alert('✅ Affectations enregistrées')
      } catch (error) {
        console.error('Erreur sauvegarde affectations:', error)
        alert('Erreur lors de la sauvegarde des affectations')
      } finally {
        this.savingAssignments = false
      }
    },
    async copyPublicLink(recette) {
      const link = `${window.location.origin}/recette-share/${recette.shareToken}`
      try {
        await navigator.clipboard.writeText(link)
      } catch {
        // noop fallback
      }
      alert(`Lien copié :\n${link}`)
    },
    async deleteRecette(recette) {
      if (!confirm(`Supprimer la recette « ${recette.name} » ?`)) return
      try {
        await db.deleteRecette(recette.id)
        if (Number(this.editingRecetteId) === Number(recette.id)) {
          this.cancelEditRecette()
        }
        if (this.selectedRecette?.id === recette.id) {
          this.selectedRecette = null
          this.selectedTicketIds = []
          this.selectedLocalTaskIds = []
        }
        await this.loadAll()
      } catch (error) {
        console.error('Erreur suppression recette:', error)
        alert('Impossible de supprimer la recette')
      }
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card {
  margin-bottom: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.form-grid label {
  display: block;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.25rem;
}

.form-grid input,
.form-grid select,
textarea,
.account-row input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.52rem 0.6rem;
  font-size: 0.92rem;
  box-sizing: border-box;
  background: #fff;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.recette-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.7rem;
  margin-bottom: 0.55rem;
  background: #fff;
}

.row-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
}

.account-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr auto;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
  align-items: center;
}

.assignment-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.empty-hint {
  color: #888;
  font-size: 0.85rem;
}

.edit-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.checkbox-row span {
  word-break: break-word;
}

@media (max-width: 900px) {
  .assignment-columns {
    grid-template-columns: 1fr;
  }

  .account-row {
    grid-template-columns: 1fr;
  }

  .recette-row {
    flex-direction: column;
  }

  .row-actions {
    justify-content: flex-start;
  }
}
</style>
