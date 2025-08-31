<template>
  <div class="relative h-full w-full bg-white overflow-hidden">
    <!-- Scrollable Container -->
    <div class="flex h-full">
      <!-- Line Numbers (scrollable) -->
      <div
        ref="lineNumbersContainer"
        class="w-12 bg-gray-50 border-r border-gray-200 z-10 overflow-y-hidden flex-shrink-0"
        :style="{ height: '100%', overflowY: 'hidden' }"
      >
        <div
          class="line-numbers-content"
          :style="{
            minHeight: containerMinHeight
          }"
        >
          <div
            v-for="n in Math.max(100, Math.ceil((blocks.length * 24 + 200) / 24))"
            :key="n"
            class="h-6 flex items-center justify-end pr-2 text-xs text-gray-400 font-mono"
            :style="{ lineHeight: '24px' }"
          >
            {{ n }}
          </div>
        </div>
      </div>

      <!-- Lined Page Background (scrollable) -->
      <div
        ref="contentContainer"
        class="flex-1 h-full overflow-y-auto lined-content"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            transparent,
            transparent 23px,
            #f0f0f0 23px,
            #f0f0f0 24px
          )`,
          backgroundSize: '100% 24px'
        }"
        @scroll="syncScrollPosition"
      >
        <!-- Content Container with proper line alignment -->
        <div
          class="mx-auto max-w-full"
          :style="{
            paddingLeft: '1rem',
            paddingRight: '3rem',
            paddingTop: '0px',
            paddingBottom: '200px',
            lineHeight: '24px',
            minHeight: containerMinHeight
          }"
        >
          <!-- Render blocks -->
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            :data-block-id="block.id"
            :style="{
              position: 'relative',
              marginBottom: '0px',
              zIndex: blocks.length - index,
              minHeight: '24px',
              lineHeight: '24px'
            }"
            class="block-container"
          >
            <!-- Block content -->
            <div style="width: 100%; min-width: 0;">
              <!-- Text-based blocks for IDE -->
              <textarea
                v-if="['paragraph', 'heading1', 'heading2', 'heading3', 'code'].includes(block.type)"
                :value="block.content"
                :placeholder="getBlockPlaceholder(block.type)"
                :class="getBlockClass(block.type)"
                style="resize: none; overflow: hidden;"
                rows="1"
                @input="(e) => {
                  handleContentChange(block.id, e.target.value, e);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }"
                @keydown="(e) => {
                  // Handle Tab key for indentation
                  if (e.key === 'Tab') {
                    handleTabKey(e);
                    return;
                  }

                  // Handle slash command navigation first
                  if (handleKeyNavigation(block.id, e)) {
                    return; // Navigation handled, stop here
                  }

                  // Handle block navigation with arrow keys
                  if (e.key === 'ArrowUp' && e.target.selectionStart === 0) {
                    e.preventDefault();
                    navigateToBlock(block.id, 'up');
                  }
                  else if (e.key === 'ArrowDown' && e.target.selectionEnd === e.target.value.length) {
                    e.preventDefault();
                    navigateToBlock(block.id, 'down');
                  }
                  // Handle regular keys
                  else if (e.key === 'Enter' && !e.shiftKey) {
                    handleEnter(block.id, e);
                  }
                  else if (e.key === 'Backspace' && block.content === '') {
                    handleBackspace(block.id, e);
                  }
                }"
                @focus="activeBlockId = block.id"
              />

              <!-- Unknown block type fallback -->
              <div
                v-else
                class="unknown-block p-4 bg-gray-100 rounded"
              >
                <p class="text-gray-500">
                  Unknown block type: {{ block.type }}
                </p>
              </div>
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
              @wheel="handleSlashMenuWheel"
            >
              <div
                style="
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  max-height: 240px;
                  overflow: hidden;
                "
              >
                <div
                  v-for="(blockType, index) in visibleBlockTypes"
                  :key="blockType.type"
                  :class="[
                    'canvas-hover-bg',
                    index + scrollOffset === selectedCommandIndex ? 'bg-blue-100' : ''
                  ]"
                  style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; cursor: pointer; min-height: 48px;"
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
        </div> <!-- Close content container -->
      </div> <!-- Close lined page background -->
    </div> <!-- Close flex container -->
  </div> <!-- Close IDE block editor -->
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

// Editor state
const blocks = ref(props.modelValue && props.modelValue.length
  ? props.modelValue
  : [
      { id: 'initial', type: 'paragraph', content: '', position: 0 }
    ])

// Template refs for scroll synchronization
const lineNumbersContainer = ref(null)
const contentContainer = ref(null)

// Computed property for minimum height that's SSR-safe
const containerMinHeight = computed(() => {
  const windowHeight = (import.meta.client && typeof window !== 'undefined') ? window.innerHeight : 800
  return Math.max(windowHeight, blocks.value.length * 24 + 200) + 'px'
})

// Slash command state
const activeBlockId = ref('initial')
const showSlashCommand = ref(false)
const slashCommandPosition = ref({ x: 0, y: 0 })
const slashQuery = ref('')
const selectedCommandIndex = ref(0)
const scrollOffset = ref(0)
const maxVisibleCommands = 5

// IDE-focused block types
const blockTypes = [
  // Basic text blocks for IDE
  { type: 'paragraph', label: 'Text', description: 'Plain text content', icon: '📝', category: 'basic' },
  { type: 'heading1', label: 'Heading 1', description: 'Main heading', icon: '📋', category: 'basic' },
  { type: 'heading2', label: 'Heading 2', description: 'Section heading', icon: '📄', category: 'basic' },
  { type: 'heading3', label: 'Heading 3', description: 'Sub-heading', icon: '📃', category: 'basic' },
  { type: 'code', label: 'Code', description: 'Code snippet or block', icon: '💻', category: 'code' }
]

// Filtered block types based on slash query
const filteredBlockTypes = computed(() => {
  if (!slashQuery.value) return blockTypes
  return blockTypes.filter(type =>
    type.label.toLowerCase().includes(slashQuery.value.toLowerCase())
    || type.description.toLowerCase().includes(slashQuery.value.toLowerCase())
  )
})

// Visible block types (limited to 5 with scrolling)
const visibleBlockTypes = computed(() => {
  const filtered = filteredBlockTypes.value
  const start = scrollOffset.value
  const end = start + maxVisibleCommands
  return filtered.slice(start, end)
})

// Sync scroll position between line numbers and content
const syncScrollPosition = () => {
  if (lineNumbersContainer.value && contentContainer.value) {
    const scrollTop = contentContainer.value.scrollTop

    // Update the transform of the line numbers content instead of scrolling
    const lineNumbersContent = lineNumbersContainer.value.querySelector('.line-numbers-content')
    if (lineNumbersContent) {
      lineNumbersContent.style.transform = `translateY(-${scrollTop}px)`
    }

    // Update the background position of the lines to move with the content
    contentContainer.value.style.backgroundPosition = `0 ${-scrollTop}px`
  }
}

// Handle Tab key for indentation instead of focus change
const handleTabKey = (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const target = event.target
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value

    if (event.shiftKey) {
      // Shift+Tab: Remove indentation
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineBeforeTab = value.substring(lineStart, start)
      if (lineBeforeTab.startsWith('  ')) {
        const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2)
        target.value = newValue
        target.setSelectionRange(start - 2, end - 2)
        // Trigger input event to update the model
        target.dispatchEvent(new Event('input', { bubbles: true }))
      }
    } else {
      // Tab: Add indentation (2 spaces)
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      target.value = newValue
      target.setSelectionRange(start + 2, start + 2)
      // Trigger input event to update the model
      target.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

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
    const element = document.querySelector(`[data-block-id="${blockId}"] textarea`)
    element?.focus()
  })
}

// Navigate between blocks with arrow keys
const navigateToBlock = (currentBlockId, direction) => {
  const currentIndex = blocks.value.findIndex(block => block.id === currentBlockId)
  if (currentIndex === -1) return

  let targetIndex
  if (direction === 'up' && currentIndex > 0) {
    targetIndex = currentIndex - 1
  } else if (direction === 'down' && currentIndex < blocks.value.length - 1) {
    targetIndex = currentIndex + 1
  } else {
    return
  }

  const targetBlock = blocks.value[targetIndex]
  focusBlock(targetBlock.id)

  // Position cursor at appropriate location
  nextTick(() => {
    const element = document.querySelector(`[data-block-id="${targetBlock.id}"] textarea`)
    if (element) {
      if (direction === 'up') {
        element.setSelectionRange(element.value.length, element.value.length)
      } else {
        element.setSelectionRange(0, 0)
      }
    }
  })
}

// Handle Enter key - create new block
const handleEnter = (blockId, event) => {
  event.preventDefault()
  const newBlockId = addBlock(blockId)
  focusBlock(newBlockId)
}

// Handle content changes
const handleContentChange = (blockId, content, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  block.content = content

  // Handle slash commands
  if (content.startsWith('/')) {
    handleSlashCommand(blockId, content, event)
  } else {
    if (showSlashCommand.value) {
      showSlashCommand.value = false
      slashQuery.value = ''
    }
  }

  emit('update:modelValue', blocks.value)
}

// Handle slash command
const handleSlashCommand = (blockId, content, event) => {
  const query = content.slice(1)
  slashQuery.value = query
  selectedCommandIndex.value = 0
  scrollOffset.value = 0

  // Show slash command menu
  showSlashCommand.value = true

  // Position slash command menu
  if (event && event.target) {
    const rect = event.target.getBoundingClientRect()
    slashCommandPosition.value = {
      x: rect.left,
      y: rect.bottom + 8
    }
  }
}

// Apply block type from slash command
const applyBlockType = (blockId, type) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  block.type = type
  block.content = ''

  showSlashCommand.value = false
  slashQuery.value = ''

  emit('update:modelValue', blocks.value)

  nextTick(() => {
    focusBlock(blockId)
  })
}

// Handle keyboard navigation in slash command menu
const handleKeyNavigation = (blockId, event) => {
  if (!showSlashCommand.value) return false

  const filtered = filteredBlockTypes.value

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filtered.length - 1)
    updateScrollOffset()
    return true
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
    updateScrollOffset()
    return true
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (filtered[selectedCommandIndex.value]) {
      applyBlockType(blockId, filtered[selectedCommandIndex.value].type)
    }
    return true
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    showSlashCommand.value = false
    slashQuery.value = ''
    return true
  }

  return false
}

// Handle mouse wheel navigation in slash command menu
const handleSlashMenuWheel = (event) => {
  if (!showSlashCommand.value) return

  event.preventDefault()
  const filtered = filteredBlockTypes.value

  if (filtered.length === 0) return

  if (event.deltaY > 0) {
    selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filtered.length - 1)
  } else {
    selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
  }

  updateScrollOffset()
}

// Update scroll offset to keep selected item in view
const updateScrollOffset = () => {
  const filtered = filteredBlockTypes.value
  const selectedIndex = selectedCommandIndex.value

  if (selectedIndex >= scrollOffset.value + maxVisibleCommands) {
    scrollOffset.value = selectedIndex - maxVisibleCommands + 1
  } else if (selectedIndex < scrollOffset.value) {
    scrollOffset.value = selectedIndex
  }

  scrollOffset.value = Math.max(0, scrollOffset.value)
  const maxScroll = Math.max(0, filtered.length - maxVisibleCommands)
  scrollOffset.value = Math.min(scrollOffset.value, maxScroll)
}

// Handle backspace - delete empty blocks (except first one)
const handleBackspace = (blockId, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block || block.content !== '') return

  const blockIndex = blocks.value.findIndex(b => b.id === blockId)

  if (blockIndex === 0) {
    block.type = 'paragraph'
    block.content = ''
    emit('update:modelValue', blocks.value)
    return
  }

  event.preventDefault()

  const prevBlock = blocks.value[blockIndex - 1]
  blocks.value.splice(blockIndex, 1)

  blocks.value.forEach((block, index) => {
    block.position = index
  })

  emit('update:modelValue', blocks.value)
  focusBlock(prevBlock.id)
}

// Get block component/styling based on type
const getBlockClass = (type) => {
  const baseClass = 'w-full border-none outline-none bg-transparent resize-none text-black'

  switch (type) {
    case 'heading1': return `${baseClass} text-2xl font-bold leading-tight`
    case 'heading2': return `${baseClass} text-xl font-semibold leading-snug`
    case 'heading3': return `${baseClass} text-lg font-medium leading-snug`
    case 'code': return `${baseClass} text-sm font-mono bg-gray-50 p-2 rounded`
    default: return `${baseClass} text-sm leading-normal`
  }
}

const getBlockPlaceholder = (type) => {
  switch (type) {
    case 'heading1': return 'Main Heading'
    case 'heading2': return 'Section Heading'
    case 'heading3': return 'Sub Heading'
    case 'code': return 'Enter code...'
    default: return 'Start typing...'
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

<style scoped>
/* Hide scrollbars on line numbers container */
.w-12::-webkit-scrollbar {
  display: none;
}

.w-12 {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* Hide scrollbars on content container but keep scroll functionality */
.lined-content::-webkit-scrollbar {
  display: none;
}

.lined-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

textarea {
  resize: none;
  overflow: hidden;
  min-height: 1.5em;
  line-height: 1.5;
  margin: 0;
  padding: 4px 0;
  height: auto;
  display: block;
  width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap;
}

textarea::placeholder {
  color: #6b7280;
}

textarea:focus::placeholder {
  color: #9ca3af;
}

/* Ensure blocks align to the 24px grid lines */
.block-container {
  line-height: 24px;
  min-height: 24px;
  display: flex;
  align-items: flex-start;
}

.block-container textarea {
  line-height: 24px;
  font-size: 14px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  width: 100%;
  min-height: 24px;
  height: auto;
}

/* Ensure textarea sits exactly on the line */
.block-container textarea:focus {
  background: rgba(59, 130, 246, 0.05);
  outline: none;
}
</style>
