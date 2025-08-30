<template>
  <div class="text-block">
    <div 
      ref="editorRef"
      class="text-editor"
      :contenteditable="!readonly"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
      v-html="formattedContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: any
  block: any
  selected?: boolean
  readonly?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update', 'delete', 'move-up', 'move-down'])

const editorRef = ref<HTMLElement>()

const formattedContent = computed(() => {
  const text = props.modelValue?.text || ''
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLElement
  let text = target.innerText || ''
  
  emit('update:modelValue', { text })
  emit('update', { text })
}

const handleKeydown = (event: KeyboardEvent) => {
  // Handle special keys
  if (event.key === 'Backspace' && !editorRef.value?.innerText) {
    event.preventDefault()
    emit('delete')
  } else if (event.key === 'Enter' && event.shiftKey) {
    // Shift+Enter for new block
    event.preventDefault()
    const selection = window.getSelection()
    if (selection) {
      const range = selection.getRangeAt(0)
      const textAfter = range.endContainer.textContent?.substring(range.endOffset) || ''
      
      // Update current block with text before cursor
      const textBefore = editorRef.value?.innerText?.replace(textAfter, '') || ''
      emit('update', { text: textBefore })
      
      // Create new block with text after cursor
      // This would be handled by the parent
    }
  } else if (event.key === 'Tab') {
    event.preventDefault()
    document.execCommand('insertHTML', false, '  ')
  } else if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault()
        document.execCommand('bold')
        break
      case 'i':
        event.preventDefault()
        document.execCommand('italic')
        break
      case 'u':
        event.preventDefault()
        document.execCommand('underline')
        break
    }
  } else if (event.altKey) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      emit('move-up')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      emit('move-down')
    }
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// Focus on selection
watch(() => props.selected, async (selected) => {
  if (selected) {
    await nextTick()
    editorRef.value?.focus()
  }
})
</script>

<style scoped>
.text-block {
  width: 100%;
}

.text-editor {
  min-height: 24px;
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.text-editor:focus {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.text-editor:empty::before {
  content: 'Type or / for commands...';
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

.text-editor :deep(strong) {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.text-editor :deep(em) {
  font-style: italic;
  color: rgba(255, 255, 255, 0.85);
}

.text-editor :deep(code) {
  padding: 2px 4px;
  background: rgba(74, 144, 226, 0.2);
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}
</style>