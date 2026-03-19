<template>
  <div class="kanban-editor">
    <h3>📊 Configurer les colonnes Kanban</h3>
    <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">
      Définissez les étapes de votre workflow. Les tickets utiliseront ces colonnes dans la vue Kanban.
    </p>

    <!-- Liste des colonnes -->
    <div class="columns-list">
      <div
        v-for="(column, index) in localColumns"
        :key="index"
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
            v-model="column.label"
            placeholder="Nom de la colonne"
            class="column-label-input"
            @input="emitUpdate"
          />
          <input
            v-model="column.color"
            type="color"
            class="column-color-input"
            title="Couleur de la colonne"
            @input="emitUpdate"
          />
        </div>
        <button
          @click="removeColumn(index)"
          class="btn-remove"
          :disabled="localColumns.length <= 1"
          title="Supprimer cette colonne"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- Bouton ajouter -->
    <button @click="addColumn" class="btn btn-secondary" style="margin-top: 1rem;">
      + Ajouter une colonne
    </button>

    <!-- Aperçu -->
    <div class="preview-section">
      <h4>Aperçu</h4>
      <div class="preview-columns">
        <div
          v-for="(column, index) in localColumns"
          :key="index"
          class="preview-column"
          :style="{ backgroundColor: column.color }"
        >
          <strong>{{ column.label || 'Sans nom' }}</strong>
        </div>
      </div>
    </div>

    <!-- Info -->
    <div class="info-box">
      <strong>💡 Conseil :</strong> Les tickets existants conserveront leur statut. 
      Si vous supprimez une colonne, les tickets avec ce statut seront toujours visibles 
      mais n'apparaîtront plus dans le Kanban.
    </div>
  </div>
</template>

<script>
export default {
  name: 'KanbanColumnsEditor',
  props: {
    columns: {
      type: Array,
      default: () => [
        { id: 'todo', label: 'À faire', color: '#fff3cd' },
        { id: 'in-progress', label: 'En cours', color: '#cfe2ff' },
        { id: 'done', label: 'Terminé', color: '#d1e7dd' }
      ]
    }
  },
  emits: ['update'],
  data() {
    return {
      localColumns: [],
      draggedIndex: null
    }
  },
  watch: {
    columns: {
      immediate: true,
      handler(newColumns) {
        this.localColumns = JSON.parse(JSON.stringify(newColumns))
      }
    }
  },
  methods: {
    addColumn() {
      const newId = 'status-' + Date.now()
      this.localColumns.push({
        id: newId,
        label: '',
        color: '#e0e0e0'
      })
      this.emitUpdate()
    },
    removeColumn(index) {
      if (this.localColumns.length > 1) {
        this.localColumns.splice(index, 1)
        this.emitUpdate()
      }
    },
    emitUpdate() {
      this.$emit('update', this.localColumns)
    },
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
        // Réorganiser les colonnes
        const draggedColumn = this.localColumns[this.draggedIndex]
        const newColumns = [...this.localColumns]
        newColumns.splice(this.draggedIndex, 1)
        newColumns.splice(dropIndex, 0, draggedColumn)
        this.localColumns = newColumns
        this.emitUpdate()
      }
    },
    onDragEnd(event) {
      event.target.classList.remove('dragging')
      document.querySelectorAll('.column-item').forEach(el => {
        el.classList.remove('drag-over')
      })
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

.column-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.column-item.drag-over {
  border: 2px solid #007bff;
  background-color: #e7f3ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,123,255,0.2);
}

.column-handle {
  cursor: grab;
  color: #999;
  font-size: 1.2rem;
  user-select: none;
}

.column-inputs {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}

.column-label-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.column-label-input:focus {
  outline: none;
  border-color: #4DBA87;
}

.column-color-input {
  width: 60px;
  height: 38px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-remove:hover:not(:disabled) {
  opacity: 1;
}

.btn-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.preview-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #ddd;
}

.preview-section h4 {
  margin-bottom: 0.75rem;
  color: #666;
}

.preview-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.preview-column {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  border: 1px solid rgba(0,0,0,0.1);
}

.info-box {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #e7f3ff;
  border-left: 4px solid #0066cc;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #333;
}
</style>
