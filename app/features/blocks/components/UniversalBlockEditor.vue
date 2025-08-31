<!--
  Universal Block Editor with Context-Aware Commands

  Adapts "/" commands based on current workspace type:
  - IDE workspace: /code, /terminal, /file commands
  - Whiteboard: /shape, /draw, /sticky commands
  - Document: /heading, /table, /database commands
  - Database: /table, /query, /chart commands
  - Graph3D: /node, /connection, /cluster commands
-->

<template>
  <div class="universal-block-editor">
    <!-- Block Container -->
    <div
      ref="editorContainer"
      class="blocks-container min-h-screen bg-white"
      @click="handleContainerClick"
    >
      <!-- Block List -->
      <div
        v-for="(block, index) in blocks"
        :key="block.id"
        class="block-wrapper group relative"
        :class="{ focused: focusedBlockId === block.id }"
      >
        <!-- Block Controls -->
        <div class="block-controls absolute left-0 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- Drag Handle -->
          <button
            class="drag-handle w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center cursor-grab"
            :draggable="true"
            @dragstart="handleDragStart(block, index, $event)"
            @dragend="handleDragEnd"
          >
            <span class="text-gray-400 text-sm">⋮⋮</span>
          </button>

          <!-- Add Block Above -->
          <button
            class="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center"
            @click="addBlockAbove(index)"
          >
            <span class="text-gray-400 text-sm">+</span>
          </button>
        </div>

        <!-- Block Content -->
        <div
          class="block-content ml-8 py-2 min-h-[2.5rem]"
          :class="getBlockContentClasses(block)"
        >
          <!-- Command Slash Menu -->
          <div
            v-if="showCommandMenu && commandMenuBlockId === block.id"
            class="command-menu absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
            :style="commandMenuPosition"
          >
            <!-- Search Input -->
            <div class="p-2 border-b border-gray-100">
              <input
                ref="commandSearchRef"
                v-model="commandSearch"
                type="text"
                placeholder="Search commands..."
                class="w-full px-2 py-1 text-sm border-0 focus:outline-none"
                @keydown="handleCommandKeyDown"
                @input="filterCommands"
              >
            </div>

            <!-- Command Categories -->
            <div class="py-1">
              <div
                v-for="(commands, category) in filteredCommandsByCategory"
                :key="category"
                class="command-category"
              >
                <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                  {{ category }}
                </div>
                <div
                  v-for="(command, cmdIndex) in commands"
                  :key="command.id"
                  :class="[
                    'command-item flex items-center space-x-3 px-3 py-2 cursor-pointer hover:bg-gray-50',
                    selectedCommandIndex === getCmdGlobalIndex(category, cmdIndex) ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  ]"
                  @click="executeCommand(command, block.id)"
                  @mouseenter="selectedCommandIndex = getCmdGlobalIndex(category, cmdIndex)"
                >
                  <span class="command-icon text-lg">{{ command.icon }}</span>
                  <div class="flex-1">
                    <div class="command-name font-medium text-gray-900">
                      {{ command.name }}
                    </div>
                    <div class="command-description text-xs text-gray-500">
                      {{ command.description }}
                    </div>
                  </div>
                  <div
                    v-if="command.shortcut"
                    class="command-shortcut text-xs text-gray-400"
                  >
                    {{ command.shortcut }}
                  </div>
                </div>
              </div>

              <!-- Workspace Context Info -->
              <div class="border-t border-gray-100 px-3 py-2 bg-gray-50">
                <div class="flex items-center space-x-2 text-xs text-gray-600">
                  <span class="workspace-icon">{{ getWorkspaceIcon(currentWorkspace) }}</span>
                  <span>{{ currentWorkspace.toUpperCase() }} Workspace</span>
                  <div class="flex-1" />
                  <span class="text-gray-400">{{ filteredCommands.length }} commands</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Block Type Renderer -->
          <component
            :is="getBlockComponent(block.type)"
            :block="block"
            :focused="focusedBlockId === block.id"
            @update:content="updateBlockContent(block.id, $event)"
            @focus="handleBlockFocus(block.id, $event)"
            @blur="handleBlockBlur(block.id)"
            @enter="handleEnterKey(block.id)"
            @backspace="handleBackspace(block.id, $event)"
            @slash-command="showSlashMenu(block.id, $event)"
            @arrow-up="handleArrowUp(block.id)"
            @arrow-down="handleArrowDown(block.id)"
          />
        </div>

        <!-- Drop Zones -->
        <div
          v-if="isDragging"
          class="drop-zone h-1 bg-blue-500 opacity-0 transition-opacity"
          :class="{ 'opacity-100': dropIndex === index }"
          @dragover.prevent="handleDragOver(index)"
          @drop="handleDrop(index)"
        />
      </div>

      <!-- Final Drop Zone -->
      <div
        v-if="isDragging"
        class="drop-zone h-1 bg-blue-500 opacity-0 transition-opacity"
        :class="{ 'opacity-100': dropIndex === blocks.length }"
        @dragover.prevent="handleDragOver(blocks.length)"
        @drop="handleDrop(blocks.length)"
      />

      <!-- Add Block Button (Empty State) -->
      <div
        v-if="blocks.length === 0"
        class="empty-state p-8 text-center text-gray-500"
      >
        <div class="text-4xl mb-4">
          ✨
        </div>
        <h3 class="text-lg font-medium mb-2">
          Start writing, coding, or creating
        </h3>
        <p class="text-sm mb-4">
          Press <kbd class="bg-gray-100 px-2 py-1 rounded">/</kbd> for commands or just start typing
        </p>
        <button
          class="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          @click="addFirstBlock"
        >
          <span>Add first block</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useContextualCommands } from '../composables/useContextualCommands'

// Block Components (lazy loaded)
const BlockText = defineAsyncComponent(() => import('./blocks/TextBlock.vue'))
const BlockHeading = defineAsyncComponent(() => import('./blocks/HeadingBlock.vue'))
const BlockCode = defineAsyncComponent(() => import('./blocks/CodeBlock.vue'))
const BlockTable = defineAsyncComponent(() => import('./blocks/TableBlock.vue'))
const BlockMedia = defineAsyncComponent(() => import('./blocks/MediaBlock.vue'))

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  workspaceType: {
    type: String,
    default: 'blocks' // blocks, ide, whiteboard, database, graph3d
  }
})

const emit = defineEmits(['update:modelValue', 'block-focus', 'block-updated'])

// Contextual Commands
const {
  currentWorkspace,
  availableCommands,
  commandsByCategory,
  filterCommands,
  getCommand,
  setWorkspaceType
} = useContextualCommands(props.workspaceType)

// State
const blocks = ref(props.modelValue?.length
  ? props.modelValue
  : [
      { id: generateId(), type: 'paragraph', content: '', position: 0 }
    ])

const focusedBlockId = ref(null)
const editorContainer = ref(null)

// Command Menu State
const showCommandMenu = ref(false)
const commandMenuBlockId = ref(null)
const commandMenuPosition = ref({ top: '0px', left: '0px' })
const commandSearch = ref('')
const selectedCommandIndex = ref(0)
const commandSearchRef = ref(null)

// Drag and Drop State
const isDragging = ref(false)
const draggedBlock = ref(null)
const draggedIndex = ref(-1)
const dropIndex = ref(-1)

// Computed
const filteredCommands = computed(() => {
  return filterCommands(commandSearch.value)
})

const filteredCommandsByCategory = computed(() => {
  const categories = {}
  filteredCommands.value.forEach((command) => {
    if (!categories[command.category]) {
      categories[command.category] = []
    }
    categories[command.category].push(command)
  })
  return categories
})

// Watch for workspace type changes
watch(() => props.workspaceType, (newType) => {
  setWorkspaceType(newType)
})

// Watch for model value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && JSON.stringify(newValue) !== JSON.stringify(blocks.value)) {
    blocks.value = newValue
  }
}, { deep: true })

// Watch for blocks changes
watch(blocks, (newBlocks) => {
  emit('update:modelValue', newBlocks)
}, { deep: true })

// Methods
const generateId = () => {
  return 'block_' + Math.random().toString(36).substr(2, 9)
}

const getBlockComponent = (blockType) => {
  const components = {
    paragraph: BlockText,
    heading: BlockHeading,
    code: BlockCode,
    table: BlockTable,
    image: BlockMedia,
    media: BlockMedia
  }
  return components[blockType] || BlockText
}

const getBlockContentClasses = (block) => {
  const classes = ['block-item', 'transition-all', 'duration-150']

  if (focusedBlockId.value === block.id) {
    classes.push('ring-2', 'ring-blue-500', 'ring-opacity-20', 'rounded-md')
  }

  return classes
}

const getWorkspaceIcon = (workspace) => {
  const icons = {
    blocks: '📝',
    ide: '💻',
    whiteboard: '🎨',
    database: '🗄️',
    graph3d: '🌐'
  }
  return icons[workspace] || '📝'
}

const getCmdGlobalIndex = (category, cmdIndex) => {
  let globalIndex = 0
  for (const [cat, commands] of Object.entries(filteredCommandsByCategory.value)) {
    if (cat === category) {
      return globalIndex + cmdIndex
    }
    globalIndex += commands.length
  }
  return globalIndex
}

// Block Management
const updateBlockContent = (blockId, content) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (block) {
    block.content = content
    emit('block-updated', { blockId, content })
  }
}

const handleBlockFocus = (blockId, event) => {
  focusedBlockId.value = blockId
  emit('block-focus', { blockId, event })
}

const handleBlockBlur = (blockId) => {
  // Don't immediately remove focus to allow for command menu
  setTimeout(() => {
    if (!showCommandMenu.value) {
      focusedBlockId.value = null
    }
  }, 100)
}

const addBlock = (afterIndex = -1, blockData = null) => {
  const newBlock = blockData || {
    id: generateId(),
    type: 'paragraph',
    content: '',
    position: afterIndex + 1
  }

  if (afterIndex === -1) {
    blocks.value.push(newBlock)
  } else {
    blocks.value.splice(afterIndex + 1, 0, newBlock)
  }

  // Update positions
  blocks.value.forEach((block, index) => {
    block.position = index
  })

  nextTick(() => {
    focusedBlockId.value = newBlock.id
  })

  return newBlock.id
}

const addBlockAbove = (index) => {
  addBlock(index - 1)
}

const addFirstBlock = () => {
  addBlock()
}

const deleteBlock = (blockId) => {
  const index = blocks.value.findIndex(b => b.id === blockId)
  if (index > -1 && blocks.value.length > 1) {
    blocks.value.splice(index, 1)

    // Focus previous block if available
    if (index > 0) {
      focusedBlockId.value = blocks.value[index - 1].id
    } else if (blocks.value.length > 0) {
      focusedBlockId.value = blocks.value[0].id
    }
  }
}

// Keyboard Handlers
const handleEnterKey = (blockId) => {
  const index = blocks.value.findIndex(b => b.id === blockId)
  addBlock(index)
}

const handleBackspace = (blockId, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (block && !block.content.trim() && blocks.value.length > 1) {
    event.preventDefault()
    deleteBlock(blockId)
  }
}

const handleArrowUp = (blockId) => {
  const index = blocks.value.findIndex(b => b.id === blockId)
  if (index > 0) {
    focusedBlockId.value = blocks.value[index - 1].id
  }
}

const handleArrowDown = (blockId) => {
  const index = blocks.value.findIndex(b => b.id === blockId)
  if (index < blocks.value.length - 1) {
    focusedBlockId.value = blocks.value[index + 1].id
  }
}

// Command Menu
const showSlashMenu = (blockId, event) => {
  commandMenuBlockId.value = blockId
  showCommandMenu.value = true
  commandSearch.value = ''
  selectedCommandIndex.value = 0

  // Position menu
  const rect = event.target.getBoundingClientRect()
  commandMenuPosition.value = {
    top: (rect.bottom + window.scrollY) + 'px',
    left: rect.left + 'px'
  }

  nextTick(() => {
    commandSearchRef.value?.focus()
  })
}

const hideCommandMenu = () => {
  showCommandMenu.value = false
  commandMenuBlockId.value = null
  commandSearch.value = ''
}

const executeCommand = (command, blockId) => {
  const blockData = command.action()

  if (blockData) {
    const index = blocks.value.findIndex(b => b.id === blockId)
    if (index > -1) {
      // Replace current block or add new block based on command
      if (blockData.type && blockData.type !== blocks.value[index].type) {
        blocks.value[index] = { ...blocks.value[index], ...blockData }
      } else {
        addBlock(index, blockData)
      }
    }
  }

  hideCommandMenu()
}

const handleCommandKeyDown = (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedCommandIndex.value = Math.min(
      selectedCommandIndex.value + 1,
      filteredCommands.value.length - 1
    )
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const command = filteredCommands.value[selectedCommandIndex.value]
    if (command) {
      executeCommand(command, commandMenuBlockId.value)
    }
  } else if (event.key === 'Escape') {
    hideCommandMenu()
  }
}

// Drag and Drop
const handleDragStart = (block, index, event) => {
  isDragging.value = true
  draggedBlock.value = block
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  isDragging.value = false
  draggedBlock.value = null
  draggedIndex.value = -1
  dropIndex.value = -1
}

const handleDragOver = (index) => {
  dropIndex.value = index
}

const handleDrop = (targetIndex) => {
  if (draggedIndex.value === -1 || !draggedBlock.value) return

  // Remove from old position
  blocks.value.splice(draggedIndex.value, 1)

  // Insert at new position
  const insertIndex = targetIndex > draggedIndex.value ? targetIndex - 1 : targetIndex
  blocks.value.splice(insertIndex, 0, draggedBlock.value)

  // Update positions
  blocks.value.forEach((block, index) => {
    block.position = index
  })

  handleDragEnd()
}

const handleContainerClick = (event) => {
  if (event.target === editorContainer.value) {
    // Clicked on empty space, add block at end
    addBlock()
  }
}

// Global click handler to hide command menu
const handleGlobalClick = (event) => {
  if (showCommandMenu.value && !event.target.closest('.command-menu')) {
    hideCommandMenu()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

// Expose methods
defineExpose({
  addBlock,
  deleteBlock,
  focusBlock: (blockId) => { focusedBlockId.value = blockId },
  getBlocks: () => blocks.value
})
</script>

<style scoped>
.blocks-container {
  padding: 2rem;
  max-width: 4xl;
  margin: 0 auto;
}

.block-wrapper {
  position: relative;
  margin-bottom: 0.5rem;
}

.block-wrapper.focused {
  z-index: 10;
}

.block-controls {
  left: -2.5rem;
}

.command-menu {
  min-width: 320px;
  max-width: 480px;
  z-index: 1000;
}

.drop-zone {
  margin: 2px 0;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Scrollbar styling for command menu */
.command-menu::-webkit-scrollbar {
  width: 6px;
}

.command-menu::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.command-menu::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.command-menu::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
