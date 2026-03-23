<template>
  <div class="ged-container">
    <div class="page-header">
      <h2>📁 Gestion des Documents</h2>
      <div class="header-stats">
        <span class="stat-badge">{{ totalDocuments }} documents</span>
        <span class="stat-badge">{{ formatFileSize(totalSize) }}</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="filters-card">
      <div class="filters-grid">
        <div class="filter-group">
          <label>🔍 Recherche</label>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Rechercher un fichier..."
            class="filter-input"
          />
        </div>

        <div class="filter-group">
          <label>📁 Projet</label>
          <select v-model="filters.projectId" class="filter-select">
            <option :value="null">Tous les projets</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>📋 Type de source</label>
          <select v-model="filters.sourceType" class="filter-select">
            <option value="all">Tous</option>
            <option value="ticket">🎫 Tickets</option>
            <option value="localTask">✅ Tâches locales</option>
          </select>
        </div>

        <div class="filter-group">
          <label>📄 Type de fichier</label>
          <select v-model="filters.fileType" class="filter-select">
            <option value="all">Tous</option>
            <option value="image">🖼️ Images</option>
            <option value="pdf">📕 PDF</option>
            <option value="document">📄 Documents</option>
            <option value="other">📎 Autres</option>
          </select>
        </div>
      </div>

      <button v-if="hasActiveFilters" @click="resetFilters" class="btn-reset">
        <span>✕</span> Réinitialiser
      </button>
    </div>

    <!-- Vue par projet -->
    <div v-if="groupByProject" class="projects-view">
      <div v-for="group in groupedDocuments" :key="group.projectId" class="project-group">
        <div class="project-group-header">
          <h3>
            <span class="project-icon">📁</span>
            {{ group.projectName }}
            <span class="count-badge">{{ group.documents.length }} documents</span>
          </h3>
          <button @click="group.collapsed = !group.collapsed" class="btn-collapse">
            {{ group.collapsed ? '▶' : '▼' }}
          </button>
        </div>

        <div v-if="!group.collapsed" class="documents-grid">
          <div 
            v-for="doc in group.documents" 
            :key="doc.id" 
            class="document-card"
            @click="previewDocument(doc)"
          >
            <div class="document-preview">
              <div v-if="isImage(doc.attachment.type)" class="image-preview">
                <img :src="doc.attachment.data" :alt="doc.attachment.name" />
              </div>
              <div v-else class="file-icon">
                {{ getFileIcon(doc.attachment.type) }}
              </div>
            </div>
            
            <div class="document-info">
              <div class="document-name" :title="doc.attachment.name">
                {{ doc.attachment.name }}
              </div>
              <div class="document-meta">
                <span class="source-badge" :class="doc.sourceType">
                  {{ doc.sourceType === 'ticket' ? '🎫' : '✅' }}
                  {{ doc.sourceName }}
                </span>
                <span class="size-badge">{{ formatFileSize(doc.attachment.size) }}</span>
              </div>
              <div class="document-date">
                {{ formatDate(doc.attachment.uploadedAt) }}
              </div>
            </div>

            <div class="document-actions" @click.stop>
              <button @click="downloadDocument(doc.attachment)" class="btn-icon" title="Télécharger">
                📥
              </button>
              <button @click="deleteDocument(doc)" class="btn-icon btn-danger" title="Supprimer">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vue en grille simple -->
    <div v-else class="documents-grid">
      <div 
        v-for="doc in filteredDocuments" 
        :key="doc.id" 
        class="document-card"
        @click="previewDocument(doc)"
      >
        <div class="document-preview">
          <div v-if="isImage(doc.attachment.type)" class="image-preview">
            <img :src="doc.attachment.data" :alt="doc.attachment.name" />
          </div>
          <div v-else class="file-icon">
            {{ getFileIcon(doc.attachment.type) }}
          </div>
        </div>
        
        <div class="document-info">
          <div class="document-name" :title="doc.attachment.name">
            {{ doc.attachment.name }}
          </div>
          <div class="document-meta">
            <span class="source-badge" :class="doc.sourceType">
              {{ doc.sourceType === 'ticket' ? '🎫' : '✅' }}
              {{ doc.sourceName }}
            </span>
            <span class="project-badge">📁 {{ doc.projectName }}</span>
          </div>
          <div class="document-meta">
            <span class="size-badge">{{ formatFileSize(doc.attachment.size) }}</span>
            <span class="date-badge">{{ formatDate(doc.attachment.uploadedAt) }}</span>
          </div>
        </div>

        <div class="document-actions" @click.stop>
          <button @click="downloadDocument(doc.attachment)" class="btn-icon" title="Télécharger">
            📥
          </button>
          <button @click="deleteDocument(doc)" class="btn-icon btn-danger" title="Supprimer">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Message si aucun document -->
    <div v-if="filteredDocuments.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Aucun document trouvé</h3>
      <p>{{ hasActiveFilters ? 'Essayez de modifier les filtres' : 'Aucun document n\'a été ajouté' }}</p>
    </div>

    <!-- Modal de prévisualisation -->
    <div v-if="previewDoc" class="modal-overlay" @click.self="closePreview">
      <div class="modal-content modal-preview">
        <div class="modal-header">
          <h3>{{ previewDoc.attachment.name }}</h3>
          <button @click="closePreview" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="isImage(previewDoc.attachment.type)" class="preview-image">
            <img :src="previewDoc.attachment.data" :alt="previewDoc.attachment.name" />
          </div>
          <div v-else-if="isPDF(previewDoc.attachment.type)" class="preview-pdf">
            <iframe :src="previewDoc.attachment.data" width="100%" height="600px"></iframe>
          </div>
          <div v-else-if="isMarkdownDocument(previewDoc.attachment)" class="preview-markdown-wrapper">
            <div class="preview-tabs">
              <button
                class="preview-tab"
                :class="{ active: markdownPreviewMode === 'rendered' }"
                @click="markdownPreviewMode = 'rendered'"
              >
                Aperçu
              </button>
              <button
                class="preview-tab"
                :class="{ active: markdownPreviewMode === 'source' }"
                @click="markdownPreviewMode = 'source'"
              >
                Source
              </button>
            </div>

            <div v-if="markdownPreviewMode === 'rendered'" class="preview-markdown" v-html="renderMarkdownAttachment(previewDoc.attachment)"></div>
            <pre v-else class="preview-markdown-source">{{ extractAttachmentText(previewDoc.attachment) }}</pre>
          </div>
          <div v-else class="preview-download">
            <div class="file-icon-large">{{ getFileIcon(previewDoc.attachment.type) }}</div>
            <p>{{ previewDoc.attachment.name }}</p>
            <button @click="downloadDocument(previewDoc.attachment)" class="btn btn-primary">
              📥 Télécharger
            </button>
          </div>

          <div class="preview-details">
            <h4>Informations</h4>
            <div class="details-grid">
              <div><strong>Source:</strong> {{ previewDoc.sourceType === 'ticket' ? 'Ticket' : 'Tâche locale' }}</div>
              <div><strong>Nom:</strong> {{ previewDoc.sourceName }}</div>
              <div><strong>Projet:</strong> {{ previewDoc.projectName }}</div>
              <div><strong>Taille:</strong> {{ formatFileSize(previewDoc.attachment.size) }}</div>
              <div><strong>Type:</strong> {{ previewDoc.attachment.type }}</div>
              <div><strong>Ajouté le:</strong> {{ formatDate(previewDoc.attachment.uploadedAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../services/database-new'
import MarkdownIt from 'markdown-it'

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

export default {
  name: 'DocumentsGED',
  data() {
    return {
      projects: [],
      tickets: [],
      localTasks: [],
      documents: [],
      searchQuery: '',
      filters: {
        projectId: null,
        sourceType: 'all',
        fileType: 'all'
      },
      groupByProject: true,
      previewDoc: null,
      markdownPreviewMode: 'rendered'
    }
  },
  computed: {
    filteredDocuments() {
      let docs = [...this.documents]

      // Recherche par nom
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        docs = docs.filter(doc => 
          doc.attachment.name.toLowerCase().includes(query) ||
          doc.sourceName.toLowerCase().includes(query) ||
          doc.projectName.toLowerCase().includes(query)
        )
      }

      // Filtre par projet
      if (this.filters.projectId) {
        docs = docs.filter(doc => doc.projectId === this.filters.projectId)
      }

      // Filtre par type de source
      if (this.filters.sourceType !== 'all') {
        docs = docs.filter(doc => doc.sourceType === this.filters.sourceType)
      }

      // Filtre par type de fichier
      if (this.filters.fileType !== 'all') {
        docs = docs.filter(doc => {
          const type = this.getFileCategory(doc.attachment.type)
          return type === this.filters.fileType
        })
      }

      return docs
    },
    groupedDocuments() {
      const groups = {}
      
      this.filteredDocuments.forEach(doc => {
        if (!groups[doc.projectId]) {
          groups[doc.projectId] = {
            projectId: doc.projectId,
            projectName: doc.projectName,
            documents: [],
            collapsed: false
          }
        }
        groups[doc.projectId].documents.push(doc)
      })

      return Object.values(groups).sort((a, b) => 
        a.projectName.localeCompare(b.projectName)
      )
    },
    totalDocuments() {
      return this.documents.length
    },
    totalSize() {
      return this.documents.reduce((sum, doc) => sum + doc.attachment.size, 0)
    },
    hasActiveFilters() {
      return this.searchQuery || 
             this.filters.projectId !== null || 
             this.filters.sourceType !== 'all' ||
             this.filters.fileType !== 'all'
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.projects = await db.getAllProjects()
      this.tickets = await db.getAllTickets()
      this.localTasks = await db.getAllLocalTasks()

      // Compiler tous les documents
      this.documents = []

      // Documents des tickets
      this.tickets.forEach(ticket => {
        if (ticket.attachments && ticket.attachments.length > 0) {
          const project = this.projects.find(p => p.id === ticket.projectId)
          ticket.attachments.forEach(attachment => {
            this.documents.push({
              id: `ticket-${ticket.id}-${attachment.id}`,
              sourceType: 'ticket',
              sourceId: ticket.id,
              sourceName: ticket.title,
              projectId: ticket.projectId,
              projectName: project?.name || 'Projet inconnu',
              attachment
            })
          })
        }
      })

      // Documents des tâches locales
      this.localTasks.forEach(task => {
        if (task.attachments && task.attachments.length > 0) {
          const project = this.projects.find(p => p.id === task.projectId)
          task.attachments.forEach(attachment => {
            this.documents.push({
              id: `task-${task.id}-${attachment.id}`,
              sourceType: 'localTask',
              sourceId: task.id,
              sourceName: task.title,
              projectId: task.projectId,
              projectName: project?.name || 'Projet inconnu',
              attachment
            })
          })
        }
      })

      // Trier par date (plus récent en premier)
      this.documents.sort((a, b) => 
        new Date(b.attachment.uploadedAt) - new Date(a.attachment.uploadedAt)
      )
    },
    previewDocument(doc) {
      this.previewDoc = doc
      this.markdownPreviewMode = 'rendered'
    },
    closePreview() {
      this.previewDoc = null
      this.markdownPreviewMode = 'rendered'
    },
    async deleteDocument(doc) {
      if (!confirm(`Supprimer le fichier "${doc.attachment.name}" ?`)) return

      try {
        if (doc.sourceType === 'ticket') {
          const ticket = this.tickets.find(t => t.id === doc.sourceId)
          if (ticket) {
            const updatedAttachments = ticket.attachments.filter(a => a.id !== doc.attachment.id)
            await db.updateTicket(ticket.id, { attachments: updatedAttachments })
          }
        } else if (doc.sourceType === 'localTask') {
          const task = this.localTasks.find(t => t.id === doc.sourceId)
          if (task) {
            const updatedAttachments = task.attachments.filter(a => a.id !== doc.attachment.id)
            await db.updateLocalTask(task.id, { attachments: updatedAttachments })
          }
        }

        await this.loadData()
        alert('✅ Document supprimé')
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        alert('❌ Erreur lors de la suppression')
      }
    },
    downloadDocument(attachment) {
      const link = document.createElement('a')
      link.href = attachment.data
      link.download = attachment.name
      link.click()
    },
    resetFilters() {
      this.searchQuery = ''
      this.filters = {
        projectId: null,
        sourceType: 'all',
        fileType: 'all'
      }
    },
    isImage(type) {
      return type.startsWith('image/')
    },
    isPDF(type) {
      return type === 'application/pdf'
    },
    isMarkdownDocument(attachment) {
      if (!attachment) return false
      const type = String(attachment.type || '').toLowerCase()
      const name = String(attachment.name || '').toLowerCase()
      return (
        type === 'text/markdown' ||
        type === 'text/x-markdown' ||
        name.endsWith('.md') ||
        name.endsWith('.markdown') ||
        name.endsWith('.mdown')
      )
    },
    extractAttachmentText(attachment) {
      const rawData = String(attachment?.data || '')
      if (!rawData) return ''

      const [, payload = rawData] = rawData.split(',', 2)

      try {
        const decoded = atob(payload)
        const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0))
        return new TextDecoder('utf-8').decode(bytes)
      } catch (error) {
        console.error('Erreur décodage pièce jointe texte:', error)
        return ''
      }
    },
    renderMarkdownAttachment(attachment) {
      const source = this.extractAttachmentText(attachment)
      if (!source.trim()) {
        return '<p><em>Document Markdown vide.</em></p>'
      }

      return markdownParser.render(source)
    },
    getFileIcon(type) {
      if (type.startsWith('image/')) return '🖼️'
      if (type === 'application/pdf') return '📕'
      if (type.includes('word') || type.includes('document')) return '📄'
      if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
      if (type.includes('powerpoint') || type.includes('presentation')) return '📊'
      if (type.includes('zip') || type.includes('rar')) return '📦'
      if (type.includes('video')) return '🎬'
      if (type.includes('audio')) return '🎵'
      return '📎'
    },
    getFileCategory(type) {
      if (type.startsWith('image/')) return 'image'
      if (type === 'application/pdf') return 'pdf'
      if (type.includes('word') || type.includes('document') || 
          type.includes('excel') || type.includes('spreadsheet') ||
          type.includes('powerpoint') || type.includes('presentation')) return 'document'
      return 'other'
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    },
    formatDate(dateString) {
      if (!dateString) return 'Date inconnue'
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.ged-container {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h2 {
  margin: 0;
  color: #2d3748;
  font-size: 2rem;
  font-weight: 700;
}

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-badge {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Filtres */
.filters-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.filter-input,
.filter-select {
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

/* Vue par projet */
.project-group {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.project-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f7fafc;
}

.project-group-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.project-icon {
  font-size: 1.5rem;
}

.count-badge {
  font-size: 0.875rem;
  font-weight: 500;
  color: #718096;
  background: #f7fafc;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.btn-collapse {
  background: #f7fafc;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.btn-collapse:hover {
  background: #e2e8f0;
}

/* Grille de documents */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.document-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.document-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.document-preview {
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  background: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.image-preview {
  width: 100%;
  height: 100%;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  font-size: 4rem;
}

.document-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.document-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.source-badge,
.project-badge,
.size-badge,
.date-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.source-badge {
  background: #e6f3ff;
  color: #0066cc;
}

.source-badge.localTask {
  background: #e6ffe6;
  color: #009900;
}

.project-badge {
  background: #f3e6ff;
  color: #8800cc;
}

.size-badge {
  background: #f7fafc;
  color: #718096;
}

.date-badge {
  color: #a0aec0;
}

.document-date {
  font-size: 0.75rem;
  color: #a0aec0;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f7fafc;
}

.btn-icon {
  background: #f7fafc;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e2e8f0;
  transform: scale(1.1);
}

.btn-icon.btn-danger:hover {
  background: #fee;
  color: #c00;
}

/* État vide */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #718096;
}

/* Modal de prévisualisation */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-preview .modal-body {
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #2d3748;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #718096;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f7fafc;
}

.modal-body {
  padding: 1.5rem;
}

.preview-image img {
  width: 100%;
  border-radius: 8px;
}

.preview-pdf iframe {
  border: none;
  border-radius: 8px;
}

.preview-markdown-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.preview-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.preview-tab {
  border: none;
  background: transparent;
  color: #475569;
  font-weight: 600;
  padding: 0.55rem 0.9rem;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
}

.preview-tab.active {
  background: white;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-bottom-color: white;
  margin-bottom: -1px;
}

.preview-markdown,
.preview-markdown-source {
  padding: 1rem 1.25rem;
  max-height: 60vh;
  overflow: auto;
}

.preview-markdown-source {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  background: white;
}

.preview-markdown :deep(h1),
.preview-markdown :deep(h2),
.preview-markdown :deep(h3) {
  margin-top: 0;
  color: #1f2937;
}

.preview-markdown :deep(p),
.preview-markdown :deep(li) {
  line-height: 1.6;
  color: #374151;
}

.preview-markdown :deep(pre),
.preview-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.preview-markdown :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.9rem;
  border-radius: 8px;
  overflow: auto;
}

.preview-markdown :deep(blockquote) {
  margin: 0;
  padding-left: 1rem;
  border-left: 4px solid #cbd5e1;
  color: #475569;
}

.preview-download {
  text-align: center;
  padding: 3rem;
}

.file-icon-large {
  font-size: 6rem;
  margin-bottom: 1rem;
}

.preview-details {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #f7fafc;
}

.preview-details h4 {
  margin: 0 0 1rem 0;
  color: #2d3748;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  font-size: 0.9rem;
}

.details-grid div {
  padding: 0.5rem;
  background: #f7fafc;
  border-radius: 6px;
}

.details-grid strong {
  color: #4a5568;
  display: block;
  margin-bottom: 0.25rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
