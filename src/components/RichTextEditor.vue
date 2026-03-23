<template>
  <div class="rich-text-editor">
    <div class="editor-tools">
      <button type="button" class="btn btn-secondary btn-sm" @click="toggleMarkdownPanel">
        {{ showMarkdownPanel ? 'Fermer Markdown' : 'Importer Markdown' }}
      </button>
    </div>

    <div v-if="showMarkdownPanel" class="markdown-panel">
      <label>Markdown</label>
      <textarea
        v-model="markdownInput"
        rows="6"
        placeholder="# Titre\n\n- item 1\n- item 2\n\n**gras** _italique_"
      ></textarea>
      <div class="markdown-actions">
        <button type="button" class="btn btn-primary btn-sm" @click="applyMarkdown(false)">Remplacer le contenu</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="applyMarkdown(true)">Ajouter au contenu</button>
      </div>
    </div>

    <QuillEditor 
      v-model:content="content"
      :contentType="contentType"
      theme="snow"
      :toolbar="toolbar"
      @update:content="onUpdate"
      :placeholder="placeholder"
    />
  </div>
</template>

<script>
import { QuillEditor } from '@vueup/vue-quill'
import MarkdownIt from 'markdown-it'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

export default {
  name: 'RichTextEditor',
  components: {
    QuillEditor
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Saisir du texte...'
    },
    contentType: {
      type: String,
      default: 'html',
      validator: (value) => ['html', 'text', 'delta'].includes(value)
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      content: this.modelValue,
      showMarkdownPanel: false,
      markdownInput: '',
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link'],
        ['clean']
      ]
    }
  },
  watch: {
    modelValue(newValue) {
      if (newValue !== this.content) {
        this.content = newValue
      }
    }
  },
  methods: {
    toggleMarkdownPanel() {
      this.showMarkdownPanel = !this.showMarkdownPanel
      if (this.showMarkdownPanel && !this.markdownInput) {
        this.markdownInput = ''
      }
    },
    applyMarkdown(append = false) {
      const source = String(this.markdownInput || '').trim()
      if (!source) return

      const html = markdownParser.render(source)
      const nextContent = append
        ? `${this.content || ''}${this.content ? '<p><br></p>' : ''}${html}`
        : html

      this.content = nextContent
      this.$emit('update:modelValue', nextContent)

      if (!append) {
        this.markdownInput = ''
      }
      this.showMarkdownPanel = false
    },
    onUpdate(value) {
      this.$emit('update:modelValue', value)
    }
  }
}
</script>

<style scoped>
.rich-text-editor {
  margin-bottom: 1rem;
}

.editor-tools {
  margin-bottom: 0.5rem;
}

.markdown-panel {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.6rem;
}

.markdown-panel label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 600;
  color: #374151;
}

.markdown-panel textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.86rem;
  resize: vertical;
}

.markdown-actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.rich-text-editor :deep(.ql-container) {
  min-height: 150px;
  font-size: 14px;
}

.rich-text-editor :deep(.ql-editor) {
  min-height: 150px;
}

.rich-text-editor :deep(.ql-toolbar) {
  border-radius: 4px 4px 0 0;
  background: #f8f9fa;
}

.rich-text-editor :deep(.ql-container) {
  border-radius: 0 0 4px 4px;
}
</style>
