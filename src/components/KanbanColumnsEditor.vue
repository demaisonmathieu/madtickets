<template>
  <div class="kanban-editor">
    <h3>📊 Étapes Kanban du projet</h3>
    <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
      Définissez les étapes de votre workflow (comme <em>project.task.type</em> dans Odoo).
      Une étape peut être partagée entre plusieurs projets.
    </p>

    <!-- Modèles prédéfinis -->
    <div class="templates-section">
      <button class="btn-templates-toggle" @click="showTemplates = !showTemplates">
        🗂️ Modèles prédéfinis <span>{{ showTemplates ? '▲' : '▼' }}</span>
      </button>
      <div v-if="showTemplates" class="templates-grid">
        <div
          v-for="tpl in KANBAN_TEMPLATES"
          :key="tpl.id"
          class="template-card"
          @click="applyTemplate(tpl)"
          :title="'Appliquer le modèle : ' + tpl.name"
        >
          <div class="template-name">{{ tpl.icon }} {{ tpl.name }}</div>
          <div class="template-preview">
            <span
              v-for="stage in tpl.stages"
              :key="stage.name"
              class="template-stage-badge"
              :style="{ background: stage.color }"
            >{{ stage.name }}</span>
          </div>
          <div class="template-apply-hint">Cliquer pour appliquer</div>
        </div>
      </div>
    </div>

    <!-- Confirmation d'application du modèle -->
    <div v-if="templateApplied" class="template-applied-notice">
      ✅ Modèle <strong>{{ templateApplied }}</strong> appliqué — pensez à enregistrer.
    </div>

    <!-- Étapes du projet (relationnelles) -->
    <div class="columns-list">
      <div
        v-for="(stage, index) in projectStages"
        :key="stage.id || index"
        class="column-item"
        draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent
        @dragenter="onDragEnter($event, index)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <div class="column-handle" style="cursor: grab;">☰</div>
        <div class="column-inputs">
          <input
            v-model="stage.name"
            placeholder="Nom de l'étape"
            class="column-label-input"
            @input="markDirty"
          />
          <input
            v-model="stage.color"
            type="color"
            class="column-color-input"
            title="Couleur de l'étape"
            @input="markDirty"
          />
          <label class="fold-label" title="Étape repliée dans le kanban">
            <input v-model="stage.folded" type="checkbox" @change="markDirty" /> Replié
          </label>
        </div>
        <button
          @click="removeStageFromProject(index)"
          class="btn-remove"
          :disabled="projectStages.length <= 1"
          title="Retirer cette étape du projet"
        >🗑️</button>
      </div>
    </div>

    <!-- Ajouter une nouvelle étape -->
    <div class="add-stage-row">
      <button @click="addNewStage" class="btn btn-secondary">+ Nouvelle étape</button>
      <div v-if="availableStages.length > 0" class="add-existing">
        <span style="color: #666; font-size: 0.9rem;">ou réutiliser :</span>
        <select v-model="stageToAdd" @change="addExistingStage" style="max-width: 220px;">
          <option value="">— étape existante —</option>
          <option v-for="s in availableStages" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>

    <!-- Aperçu -->
    <div class="preview-section">
      <h4>Aperçu</h4>
      <div class="preview-columns">
        <div
          v-for="(stage, index) in projectStages"
          :key="index"
          class="preview-column"
          :style="{ backgroundColor: stage.color || '#cfe2ff' }"
        >
          <strong>{{ stage.name || 'Sans nom' }}</strong>
          <small v-if="stage.folded" style="display:block;color:#888;">replié</small>
        </div>
      </div>
    </div>

    <!-- Sauvegarde -->
    <div v-if="isDirty" class="dirty-notice">
      ⚠️ Modifications non enregistrées
    </div>

    <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success-message">{{ successMsg }}</div>
  </div>
</template>

<script>
import { db } from '../services/database-new'

export default {
  name: 'KanbanColumnsEditor',
  props: {
    projectId: {
      type: Number,
      default: null
    },
    // Compat descendante : colonnes JSONB (ignorées si projectId est fourni)
    columns: {
      type: Array,
      default: () => [
        { id: 'todo', label: 'À faire', color: '#fff3cd' },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
        { id: 'done', label: 'Terminé', color: '#d1e7dd' }
      ]
    }
  },
  emits: ['update', 'saved'],
  data() {
    return {
      projectStages: [],   // étapes associées au projet (relationnelles)
      allStages: [],       // toutes les étapes existantes en base
      stageToAdd: '',
      isDirty: false,
      draggedIndex: null,
      errorMsg: '',
      successMsg: '',
      showTemplates: false,
      templateApplied: '',
      KANBAN_TEMPLATES: [
        {
          id: 'simple',
          icon: '✅',
          name: 'Simple',
          stages: [
            { name: 'À faire', color: '#fff3cd', folded: false },
            { name: 'En cours', color: '#cfe2ff', folded: false },
            { name: 'Terminé', color: '#d1e7dd', folded: false }
          ]
        },
        {
          id: 'scrum',
          icon: '🏃',
          name: 'Scrum',
          stages: [
            { name: 'Backlog', color: '#e9ecef', folded: true },
            { name: 'À faire', color: '#fff3cd', folded: false },
            { name: 'En cours', color: '#cfe2ff', folded: false },
            { name: 'En revue', color: '#f5c6ff', folded: false },
            { name: 'Terminé', color: '#d1e7dd', folded: false }
          ]
        },
        {
          id: 'dev',
          icon: '💻',
          name: 'Développement',
          stages: [
            { name: 'À faire', color: '#fff3cd', folded: false },
            { name: 'En cours', color: '#cfe2ff', folded: false },
            { name: 'Code review', color: '#f0d8ff', folded: false },
            { name: 'En test', color: '#ffe4b5', folded: false },
            { name: 'En recette', color: '#ffd7aa', folded: false },
            { name: 'Terminé', color: '#d1e7dd', folded: false }
          ]
        },
        {
          id: 'support',
          icon: '🎧',
          name: 'Support client',
          stages: [
            { name: 'Nouveau', color: '#f8d7da', folded: false },
            { name: 'En traitement', color: '#fff3cd', folded: false },
            { name: 'Attente client', color: '#cfe2ff', folded: false },
            { name: 'Résolu', color: '#d1e7dd', folded: false },
            { name: 'Fermé', color: '#e9ecef', folded: true }
          ]
        },
        {
          id: 'marketing',
          icon: '📣',
          name: 'Marketing',
          stages: [
            { name: 'Idée', color: '#fff3cd', folded: false },
            { name: 'Planification', color: '#ffe4b5', folded: false },
            { name: 'En production', color: '#cfe2ff', folded: false },
            { name: 'En validation', color: '#f0d8ff', folded: false },
            { name: 'Publié', color: '#d1e7dd', folded: false }
          ]
        },
        {
          id: 'kanban',
          icon: '📊',
          name: 'Kanban classique',
          stages: [
            { name: 'À faire', color: '#fff3cd', folded: false },
            { name: 'Analyse', color: '#e0cffc', folded: false },
            { name: 'En cours', color: '#cfe2ff', folded: false },
            { name: 'Bloqué', color: '#f8d7da', folded: false },
            { name: 'Terminé', color: '#d1e7dd', folded: false }
          ]
        }
      ]
    }
  },
  computed: {
    availableStages() {
      const projectStageIds = new Set(this.projectStages.map(s => s.id).filter(Boolean))
      return this.allStages.filter(s => !projectStageIds.has(s.id))
    }
  },
  watch: {
    projectId: {
      immediate: true,
      async handler(newId) {
        if (newId) {
          await this.loadStages()
        } else {
          // Compat descendante : convertir les colonnes JSONB en stages visuelles (sans persistance)
          this.projectStages = (this.columns || []).map(c => ({
            id: null,
            name: c.label || c.name || '',
            color: c.color || '#cfe2ff',
            folded: false,
            _jsonId: c.id  // conserver l'ancien id pour l'emit compat
          }))
        }
      }
    }
  },
  methods: {
    async loadStages() {
      try {
        this.allStages = await db.getAllKanbanStages()
        if (this.projectId) {
          const stages = await db.getStagesByProject(this.projectId)
          this.projectStages = stages.map(s => ({ ...s }))
        }
        this.isDirty = false
        this.errorMsg = ''
      } catch (e) {
        this.errorMsg = 'Erreur chargement des étapes : ' + e.message
      }
    },
    markDirty() {
      this.isDirty = true
      this.emitUpdate()
    },
    selectTemplate(tpl) {
      this.pendingTemplate = tpl
    },
    applyTemplate() {
      if (!this.pendingTemplate) return
      this.projectStages = this.pendingTemplate.stages.map((s, i) => ({
        id: null,
        name: s.name,
        color: s.color,
        folded: s.folded || false,
        sequence: (i + 1) * 10,
        _isNew: true
      }))
      this.isDirty = true
      this.pendingTemplate = null
      this.showTemplates = false
      this.emitUpdate()
    },
    emitUpdate() {
      // Compat descendante : émettre dans le format kanbanColumns JSONB
      const cols = this.projectStages.map((s, i) => ({
        id: s._jsonId || (s.id ? s.id.toString() : `stage-${i}`),
        label: s.name || '',
        color: s.color || '#cfe2ff'
      }))
      this.$emit('update', cols)
    },
    addNewStage() {
      this.projectStages.push({
        id: null,
        name: '',
        color: '#e0e0e0',
        folded: false,
        sequence: (this.projectStages.length + 1) * 10,
        _isNew: true
      })
      this.isDirty = true
    },
    async addExistingStage() {
      if (!this.stageToAdd) return
      const stage = this.allStages.find(s => s.id === Number(this.stageToAdd))
      if (stage) {
        this.projectStages.push({ ...stage })
        this.isDirty = true
        this.emitUpdate()
      }
      this.stageToAdd = ''
    },
    removeStageFromProject(index) {
      if (this.projectStages.length <= 1) return
      this.projectStages.splice(index, 1)
      this.isDirty = true
      this.emitUpdate()
    },
    // Sauvegarde relationnelle (appelée par le parent via ref ou depuis ce composant)
    async save() {
      if (!this.projectId) {
        // Compat descendante : juste émettre
        this.emitUpdate()
        return
      }
      try {
        this.errorMsg = ''
        // 1. Créer ou mettre à jour les stages nouvelles/modifiées
        for (const stage of this.projectStages) {
          if (stage._isNew || !stage.id) {
            // Créer une nouvelle stage globale
            const created = await db.addKanbanStage({
              name: stage.name || 'Nouvelle étape',
              sequence: stage.sequence || 10,
              color: stage.color || '#cfe2ff',
              folded: stage.folded || false
            })
            stage.id = Number(created)
            delete stage._isNew
          } else {
            // Mettre à jour la stage existante
            await db.updateKanbanStage(stage.id, {
              name: stage.name,
              color: stage.color,
              folded: stage.folded
            })
          }
        }
        // 2. Mettre à jour la relation projet <-> étapes
        const stageItems = this.projectStages.map((s, i) => ({
          stageId: s.id,
          sequence: (i + 1) * 10
        }))
        await db.setProjectStages(this.projectId, stageItems)
        // 3. Recharger depuis la BDD
        await this.loadStages()
        this.isDirty = false
        this.successMsg = '✅ Étapes enregistrées'
        setTimeout(() => { this.successMsg = '' }, 3000)
        this.$emit('saved', this.projectStages)
        this.emitUpdate()
      } catch (e) {
        this.errorMsg = 'Erreur lors de la sauvegarde : ' + e.message
      }
    },
    // === Modèles prédéfinis ===
    applyTemplate(tpl) {
      if (!confirm(`Appliquer le modèle "${tpl.name}" ? Les étapes actuelles seront remplacées.`)) return
      this.projectStages = tpl.stages.map((s, i) => ({
        id: null,
        name: s.name,
        color: s.color,
        folded: s.folded || false,
        sequence: (i + 1) * 10,
        _isNew: true
      }))
      this.isDirty = true
      this.templateApplied = tpl.name
      this.showTemplates = false
      setTimeout(() => { this.templateApplied = '' }, 4000)
      this.emitUpdate()
    },
    // === Drag & drop ===
    onDragStart(event, index) {
      this.draggedIndex = index
      event.dataTransfer.effectAllowed = 'move'
      event.target.classList.add('dragging')
    },
    onDragEnter(event, index) {
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        event.currentTarget.classList.add('drag-over')
      }
    },
    onDragLeave(event) {
      event.currentTarget.classList.remove('drag-over')
    },
    onDrop(event, dropIndex) {
      event.preventDefault()
      event.currentTarget.classList.remove('drag-over')
      if (this.draggedIndex !== null && this.draggedIndex !== dropIndex) {
        const dragged = this.projectStages[this.draggedIndex]
        const newList = [...this.projectStages]
        newList.splice(this.draggedIndex, 1)
        newList.splice(dropIndex, 0, dragged)
        this.projectStages = newList
        this.isDirty = true
        this.emitUpdate()
      }
    },
    onDragEnd(event) {
      event.target.classList.remove('dragging')
      document.querySelectorAll('.column-item').forEach(el => el.classList.remove('drag-over'))
      this.draggedIndex = null
    }
  }
}
</script>

<style scoped>
.kanban-editor {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.columns-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.75rem;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: move;
  transition: all 0.2s;
}

.column-item.dragging { opacity: 0.5; transform: scale(0.95); }
.column-item.drag-over {
  border: 2px solid #007bff;
  background-color: #e7f3ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,123,255,0.2);
}

.column-inputs {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.column-label-input {
  flex: 1;
  min-width: 120px;
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.column-color-input {
  width: 40px;
  height: 34px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.fold-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
  cursor: pointer;
}

.btn-remove {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  color: #dc3545;
  transition: all 0.2s;
}
.btn-remove:hover:not(:disabled) { background: #dc3545; color: white; }
.btn-remove:disabled { opacity: 0.3; cursor: not-allowed; }

.add-stage-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.add-existing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-existing select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.preview-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.preview-columns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.preview-column {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  min-width: 80px;
  text-align: center;
  font-size: 0.85rem;
}

.dirty-notice {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #856404;
}

.template-section {
  margin-bottom: 1.5rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.template-header {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  user-select: none;
  border-bottom: 1px solid #dee2e6;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: white;
}

.template-card {
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.template-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 2px 8px rgba(13,110,253,0.15);
  transform: translateY(-1px);
}
.template-card.template-selected {
  border-color: #0d6efd;
  background: #e7f1ff;
}

.template-icon {
  font-size: 1.6rem;
  margin-bottom: 0.3rem;
}

.template-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.template-stages {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
}

.template-stage-chip {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.template-confirm {
  padding: 0.75rem 1rem;
  background: #fff3cd;
  border-top: 1px solid #ffc107;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.25rem 0.65rem;
  font-size: 0.82rem;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.success-message {
  color: #198754;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* ── Modèles prédéfinis ── */
.templates-section {
  margin-bottom: 1.25rem;
}

.btn-templates-toggle {
  background: #fff;
  border: 1px solid #6c757d;
  border-radius: 6px;
  padding: 0.45rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #444;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
}
.btn-templates-toggle:hover { background: #f0f0f0; }

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.template-card {
  background: #fff;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.template-card:hover {
  border-color: #0d6efd;
  box-shadow: 0 2px 8px rgba(13,110,253,0.15);
}

.template-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.template-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.4rem;
}

.template-stage-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.72rem;
  color: #333;
  border: 1px solid rgba(0,0,0,0.08);
}

.template-apply-hint {
  font-size: 0.75rem;
  color: #888;
  margin-top: 0.25rem;
}

.template-applied-notice {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: #d1e7dd;
  border: 1px solid #a3cfbb;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #0a4c2f;
}
</style>

