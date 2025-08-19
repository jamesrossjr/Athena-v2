<script setup>
// Block-based editor for Canvas
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// Editor state
const blocks = ref(props.modelValue.length
  ? props.modelValue
  : [
      { id: 'initial', type: 'paragraph', content: '', position: 0 }
    ])

const activeBlockId = ref('initial')
const showSlashCommand = ref(false)
const slashCommandPosition = ref({ x: 0, y: 0 })
const slashQuery = ref('')
const blockSpacing = ref(1) // Default block spacing multiplier

// Block types available via slash commands
const blockTypes = [
  { type: 'paragraph', label: 'Text', description: 'Just start writing with plain text', icon: '📝' },
  { type: 'heading1', label: 'Heading 1', description: 'Big section heading', icon: '📋' },
  { type: 'heading2', label: 'Heading 2', description: 'Medium section heading', icon: '📄' },
  { type: 'heading3', label: 'Heading 3', description: 'Small section heading', icon: '📃' },
  { type: 'bulletList', label: 'Bullet List', description: 'Create a simple bullet list', icon: '•' },
  { type: 'numberedList', label: 'Numbered List', description: 'Create a numbered list', icon: '🔢' },
  { type: 'quote', label: 'Quote', description: 'Capture a quote', icon: '💬' },
  { type: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: '—' },
  { type: 'spacing-0.5', label: 'Tight Spacing', description: 'Reduce space between blocks', icon: '⬇️' },
  { type: 'spacing-1', label: 'Normal Spacing', description: 'Default block spacing', icon: '↕️' },
  { type: 'spacing-1.5', label: 'Relaxed Spacing', description: 'More space between blocks', icon: '⬆️' },
  { type: 'spacing-2', label: 'Loose Spacing', description: 'Extra space between blocks', icon: '⬆️⬆️' }
]

// Filtered block types based on slash query
const filteredBlockTypes = computed(() => {
  if (!slashQuery.value) return blockTypes
  return blockTypes.filter(type =>
    type.label.toLowerCase().includes(slashQuery.value.toLowerCase())
    || type.description.toLowerCase().includes(slashQuery.value.toLowerCase())
  )
})

// Add new block
const addBlock = (afterId, type = 'paragraph') => {
  const afterIndex = blocks.value.findIndex(block => block.id === afterId)
  const newBlock = {
    id: `block-${Date.now()}`,
    type,
    content: '',
    position: afterIndex + 1
  }

  blocks.value.splice(afterIndex + 1, 0, newBlock)

  // Update positions
  blocks.value.forEach((block, index) => {
    block.position = index
  })

  emit('update:modelValue', blocks.value)

  // Focus new block
  nextTick(() => {
    focusBlock(newBlock.id)
  })

  return newBlock.id
}

// Focus a specific block
const focusBlock = (blockId) => {
  activeBlockId.value = blockId
  nextTick(() => {
    const element = document.querySelector(`[data-block-id="${blockId}"] input, [data-block-id="${blockId}"] textarea`)
    element?.focus()
  })
}

// Handle Enter key - create new block
const handleEnter = (blockId, event) => {
  event.preventDefault()
  const newBlockId = addBlock(blockId)
  focusBlock(newBlockId)
}

// Handle slash command
const handleSlashCommand = (blockId, content, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  if (content.startsWith('/')) {
    slashQuery.value = content.slice(1)
    showSlashCommand.value = true

    // Position slash command menu
    const rect = event.target.getBoundingClientRect()
    slashCommandPosition.value = {
      x: rect.left,
      y: rect.bottom + 8
    }
  } else {
    showSlashCommand.value = false
    slashQuery.value = ''
  }

  block.content = content
  emit('update:modelValue', blocks.value)
}

// Apply block type from slash command
const applyBlockType = (blockId, type) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  // Handle spacing commands
  if (type.startsWith('spacing-')) {
    const spacingValue = parseFloat(type.replace('spacing-', ''))
    blockSpacing.value = spacingValue
    block.content = '' // Clear the slash command
  } else {
    block.type = type
    block.content = '' // Clear the slash command
  }

  showSlashCommand.value = false
  slashQuery.value = ''

  emit('update:modelValue', blocks.value)

  nextTick(() => {
    focusBlock(blockId)
  })
}

// Handle backspace - merge with previous block if empty
const handleBackspace = (blockId, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block || block.content !== '') return

  if (blocks.value.length === 1) return // Don't delete the last block

  event.preventDefault()

  const blockIndex = blocks.value.findIndex(b => b.id === blockId)
  if (blockIndex > 0) {
    const prevBlock = blocks.value[blockIndex - 1]
    blocks.value.splice(blockIndex, 1)

    // Update positions
    blocks.value.forEach((block, index) => {
      block.position = index
    })

    emit('update:modelValue', blocks.value)
    focusBlock(prevBlock.id)
  }
}

// Get block component/styling based on type
const getBlockClass = (type) => {
  const baseClass = 'w-full border-none outline-none bg-transparent resize-none'

  switch (type) {
    case 'heading1': return `${baseClass} text-3xl font-bold leading-tight`
    case 'heading2': return `${baseClass} text-2xl font-semibold leading-snug`
    case 'heading3': return `${baseClass} text-xl font-medium leading-snug`
    case 'quote': return `${baseClass} text-lg italic border-l-4 border-gray-300 pl-4 leading-relaxed`
    default: return `${baseClass} text-base leading-normal`
  }
}

// Get dynamic block spacing
const getBlockSpacing = () => {
  const baseSpacing = 0.5 // Base spacing in rem
  return `${baseSpacing * blockSpacing.value}rem`
}

const getBlockPlaceholder = (type) => {
  switch (type) {
    case 'heading1': return 'Heading 1'
    case 'heading2': return 'Heading 2'
    case 'heading3': return 'Heading 3'
    case 'quote': return 'Quote'
    case 'bulletList': return 'List item'
    case 'numberedList': return 'List item'
    default: return 'Start writing...'
  }
}

// Close slash command menu when clicking outside
onMounted(() => {
  const handleClickOutside = () => {
    showSlashCommand.value = false
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<template>
  <div>
    <!-- Render blocks -->
    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      :data-block-id="block.id"
      :style="{
        position: 'relative',
        marginBottom: index < blocks.length - 1 ? getBlockSpacing() : '0'
      }"
      class="block-container"
    >
      <!-- Block content -->
      <div style="width: 100%; min-width: 0;">
        <!-- Divider block -->
        <div
          v-if="block.type === 'divider'"
          style="padding: 16px 0;"
        >
          <hr style="border-color: #e5e7eb;">
        </div>

        <!-- Text-based blocks -->
        <textarea
          v-else
          :value="block.content"
          :placeholder="getBlockPlaceholder(block.type)"
          :class="getBlockClass(block.type)"
          style="resize: none; overflow: hidden;"
          rows="1"
          @input="handleSlashCommand(block.id, $event.target.value, $event)"
          @keydown.enter="handleEnter(block.id, $event)"
          @keydown.backspace="block.content === '' && handleBackspace(block.id, $event)"
          @focus="activeBlockId = block.id"
          @input.self="
            $event.target.style.height = 'auto';
            $event.target.style.height = $event.target.scrollHeight + 'px';
          "
        />
      </div>
    </div>

    <!-- Slash command menu -->
    <Teleport to="body">
      <div
        v-if="showSlashCommand"
        :style="{
          position: 'fixed',
          zIndex: 50,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '8px',
          width: '320px',
          left: slashCommandPosition.x + 'px',
          top: slashCommandPosition.y + 'px'
        }"
        @click.stop
      >
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div
            v-for="blockType in filteredBlockTypes"
            :key="blockType.type"
            class="canvas-hover-bg"
            style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; cursor: pointer;"
            @click="applyBlockType(activeBlockId, blockType.type)"
          >
            <span class="canvas-text-muted">{{ blockType.icon }}</span>
            <div style="flex: 1;">
              <div style="font-weight: 500; font-size: 14px;">
                {{ blockType.label }}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                {{ blockType.description }}
              </div>
            </div>
          </div>

          <div
            v-if="filteredBlockTypes.length === 0"
            style="padding: 8px; font-size: 14px; color: #6b7280;"
          >
            No matching blocks
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
textarea {
  resize: none;
  overflow: hidden;
  min-height: 1.5rem;
}

textarea::placeholder {
  color: #9ca3af;
}

textarea:focus::placeholder {
  color: #d1d5db;
}

/* Block spacing is now handled dynamically via inline styles */
</style>
