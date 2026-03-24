<template>
  <div>
    <div class="page-header">
      <div>
        <h2>📊 Configuration des étapes Kanban</h2>
        <p style="color: #666; margin-top: 0.4rem;">Choisissez un projet puis configurez ses étapes relationnelles.</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" @click="$router.back()">← Retour</button>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1rem;">
      <div class="form-group">
        <label>Projet</label>
        <select v-model.number="selectedProjectId">
          <option :value="null">Sélectionnez un projet…</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>

      <button class="btn btn-primary" :disabled="!selectedProjectId" @click="saveStages">
        💾 Enregistrer les étapes
      </button>
    </div>

    <KanbanColumnsEditor
      v-if="selectedProjectId"
      ref="kanbanEditor"
      :projectId="selectedProjectId"
      @saved="onSaved"
    />

    <div v-else class="card" style="color:#666;">
      Sélectionnez un projet pour afficher ses étapes Kanban.
    </div>
  </div>
</template>

<script>
import KanbanColumnsEditor from './KanbanColumnsEditor.vue'
import { db } from '../services/database-new'

export default {
  name: 'KanbanStagesConfig',
  components: {
    KanbanColumnsEditor
  },
  data() {
    return {
      projects: [],
      selectedProjectId: null
    }
  },
  async mounted() {
    this.projects = await db.getAllProjects()
    if (this.projects.length > 0) {
      this.selectedProjectId = this.projects[0].id
    }
  },
  methods: {
    async saveStages() {
      if (!this.selectedProjectId || !this.$refs.kanbanEditor) return
      await this.$refs.kanbanEditor.save()
    },
    onSaved() {
      // rien à faire ici, le composant enfant affiche déjà le succès
    }
  }
}
</script>
