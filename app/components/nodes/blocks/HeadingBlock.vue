<template>
  <div class="heading-block">
    <select 
      v-model="level" 
      @change="updateLevel"
      class="heading-level"
    >
      <option :value="1">H1</option>
      <option :value="2">H2</option>
      <option :value="3">H3</option>
      <option :value="4">H4</option>
      <option :value="5">H5</option>
      <option :value="6">H6</option>
    </select>
    <component
      :is="`h${level}`"
      ref="headingRef"
      class="heading-editor"
      :class="`h${level}`"
      :contenteditable="!readonly"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
      v-text="text"
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

const headingRef = ref<HTMLElement>()
const text = computed(() => props.modelValue?.text || '')
const level = ref(props.modelValue?.level || 2)

const handleInput = (event: Event) => {
  const target = event.target as HTMLElement
  const newText = target.innerText || ''
  
  emit('update:modelValue', { text: newText, level: level.value })
  emit('update', { text: newText, level: level.value })
}

const updateLevel = () => {
  emit('update', { text: text.value, level: level.value })
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !headingRef.value?.innerText) {
    event.preventDefault()
    emit('delete')
  } else if (event.key === 'Enter') {
    event.preventDefault()
    // Convert to text block on Enter
    // This would be handled by parent
  } else if (event.altKey) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      emit('move-up')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      emit('move-down')
    }
  } else if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
    // Heading level shortcuts
    const num = parseInt(event.key)
    if (num >= 1 && num <= 6) {
      event.preventDefault()
      level.value = num
      updateLevel()
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
    headingRef.value?.focus()
  }
})
</script>

<style scoped>
.heading-block {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.heading-level {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
}

.heading-level:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.heading-editor {
  flex: 1;
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  outline: none;
  word-wrap: break-word;
}

.heading-editor:focus {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.heading-editor:empty::before {
  content: 'Heading...';
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

.h1 {
  font-size: 32px;
  line-height: 1.2;
}

.h2 {
  font-size: 28px;
  line-height: 1.3;
}

.h3 {
  font-size: 24px;
  line-height: 1.4;
}

.h4 {
  font-size: 20px;
  line-height: 1.5;
}

.h5 {
  font-size: 18px;
  line-height: 1.5;
}

.h6 {
  font-size: 16px;
  line-height: 1.6;
}
</style>