<template>
  <div class="rich-text-editor">
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
import '@vueup/vue-quill/dist/vue-quill.snow.css'

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
