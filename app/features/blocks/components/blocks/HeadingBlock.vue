<!--
  Heading Block Component
  Displays headings (H1-H6) for the universal block editor
-->

<template>
  <div class="heading-block">
    <component
      :is="headingTag"
      class="heading-content"
    >
      <textarea
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder"
        class="w-full resize-none border-none outline-none bg-transparent heading-textarea"
        :class="headingClasses"
        rows="1"
        @input="handleInput"
        @keydown="handleKeyDown"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur')"
      />
    </component>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

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
const level = computed(() => props.block.level || 1)

const headingTag = computed(() => `h${level.value}`)

const placeholder = computed(() => `Heading ${level.value}`)

const headingClasses = computed(() => {
  const classes = ['font-bold', 'text-gray-900', 'placeholder-gray-400']

  switch (level.value) {
    case 1:
      classes.push('text-3xl', 'leading-tight')
      break
    case 2:
      classes.push('text-2xl', 'leading-snug')
      break
    case 3:
      classes.push('text-xl', 'leading-snug')
      break
    case 4:
      classes.push('text-lg', 'leading-normal')
      break
    case 5:
      classes.push('text-base', 'leading-normal')
      break
    case 6:
      classes.push('text-sm', 'leading-normal', 'uppercase', 'tracking-wide')
      break
    default:
      classes.push('text-xl', 'leading-snug')
  }

  return classes
})

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
.heading-block {
  margin: 1rem 0;
}

.heading-content {
  margin: 0;
}

.heading-textarea {
  line-height: inherit;
  font-size: inherit;
  font-weight: inherit;
  font-family: inherit;
  color: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  min-height: 1em;
}

.heading-textarea:focus {
  outline: none;
}

/* Remove default margins from heading elements */
h1, h2, h3, h4, h5, h6 {
  margin: 0;
}
</style>
