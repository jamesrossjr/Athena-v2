<!--
  Text Block Component
  Basic text paragraph block for the universal block editor
-->

<template>
  <div class="text-block">
    <textarea
      ref="textareaRef"
      v-model="content"
      :placeholder="placeholder"
      class="w-full resize-none border-none outline-none bg-transparent text-gray-900 placeholder-gray-400 leading-relaxed"
      rows="1"
      @input="handleInput"
      @keydown="handleKeyDown"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur')"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  block: {
    type: Object,
    required: true
  },
  focused: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:content',
  'focus',
  'blur',
  'enter',
  'backspace',
  'slash-command',
  'arrow-up',
  'arrow-down'
])

const textareaRef = ref(null)
const content = ref(props.block.content || '')

const placeholder = 'Type \'/\' for commands'

// Watch for block content changes
watch(() => props.block.content, (newContent) => {
  if (newContent !== content.value) {
    content.value = newContent
  }
})

// Watch for focus changes
watch(() => props.focused, (focused) => {
  if (focused) {
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

// Auto-resize textarea
const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

const handleInput = (event) => {
  autoResize()
  emit('update:content', content.value)

  // Check for slash command
  if (content.value.endsWith('/')) {
    emit('slash-command', event)
  }
}

const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('enter')
  } else if (event.key === 'Backspace' && content.value === '') {
    emit('backspace', event)
  } else if (event.key === 'ArrowUp' && isAtStart()) {
    emit('arrow-up')
  } else if (event.key === 'ArrowDown' && isAtEnd()) {
    emit('arrow-down')
  }
}

const isAtStart = () => {
  const textarea = textareaRef.value
  return textarea && textarea.selectionStart === 0
}

const isAtEnd = () => {
  const textarea = textareaRef.value
  return textarea && textarea.selectionStart === content.value.length
}

onMounted(() => {
  autoResize()
})
</script>

<style scoped>
.text-block {
  font-size: 16px;
  line-height: 1.6;
}

textarea {
  min-height: 1.5rem;
}

textarea:focus {
  outline: none;
}
</style>
