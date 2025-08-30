<template>
  <Teleport to="body">
    <Transition name="palette">
      <div
        v-if="isOpen"
        class="command-palette-overlay"
        @click="close"
      >
        <div
          class="command-palette"
          @click.stop
        >
          <div class="palette-header">
            <Icon
              name="heroicons:magnifying-glass"
              class="search-icon"
            />
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              class="search-input"
              placeholder="Type a command or search..."
              @keydown="handleKeydown"
            >
            <kbd class="palette-shortcut">ESC</kbd>
          </div>

          <div class="palette-results">
            <!-- Quick Actions -->
            <div
              v-if="filteredActions.length > 0"
              class="result-section"
            >
              <div class="section-title">
                Quick Actions
              </div>
              <div
                v-for="(action, index) in filteredActions"
                :key="action.id"
                class="result-item"
                :class="{ active: selectedIndex === index }"
                @click="executeAction(action)"
                @mouseenter="selectedIndex = index"
              >
                <Icon
                  :name="action.icon"
                  class="result-icon"
                />
                <div class="result-content">
                  <div class="result-title">
                    {{ action.title }}
                  </div>
                  <div
                    v-if="action.description"
                    class="result-description"
                  >
                    {{ action.description }}
                  </div>
                </div>
                <div
                  v-if="action.shortcut"
                  class="result-shortcut"
                >
                  <kbd
                    v-for="key in action.shortcut.split('+')"
                    :key="key"
                  >{{ key }}</kbd>
                </div>
              </div>
            </div>

            <!-- AI Commands -->
            <div
              v-if="filteredAICommands.length > 0"
              class="result-section"
            >
              <div class="section-title">
                AI Assistant
              </div>
              <div
                v-for="(command, index) in filteredAICommands"
                :key="command.id"
                class="result-item"
                :class="{ active: selectedIndex === filteredActions.length + index }"
                @click="executeCommand(command)"
                @mouseenter="selectedIndex = filteredActions.length + index"
              >
                <Icon
                  :name="command.icon"
                  class="result-icon ai-icon"
                />
                <div class="result-content">
                  <div class="result-title">
                    {{ command.title }}
                  </div>
                  <div
                    v-if="command.description"
                    class="result-description"
                  >
                    {{ command.description }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Files -->
            <div
              v-if="filteredRecent.length > 0"
              class="result-section"
            >
              <div class="section-title">
                Recent
              </div>
              <div
                v-for="(item, index) in filteredRecent"
                :key="item.id"
                class="result-item"
                :class="{ active: selectedIndex === filteredActions.length + filteredAICommands.length + index }"
                @click="openRecent(item)"
                @mouseenter="selectedIndex = filteredActions.length + filteredAICommands.length + index"
              >
                <Icon
                  :name="getFileIcon(item.type)"
                  class="result-icon"
                />
                <div class="result-content">
                  <div class="result-title">
                    {{ item.title }}
                  </div>
                  <div class="result-description">
                    {{ item.path }}
                  </div>
                </div>
                <div class="result-meta">
                  {{ formatTime(item.lastAccessed) }}
                </div>
              </div>
            </div>

            <!-- No results -->
            <div
              v-if="query && allResults.length === 0"
              class="no-results"
            >
              <Icon
                name="heroicons:magnifying-glass"
                class="no-results-icon"
              />
              <div class="no-results-text">
                No results found for "{{ query }}"
              </div>
              <div class="no-results-hint">
                Try a different search term or command
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'execute': [action: any]
}>()

// State
const query = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement>()

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Actions data
const actions = [
  {
    id: 'new-workspace',
    title: 'New Workspace',
    description: 'Create a new workspace module',
    icon: 'heroicons:plus-circle',
    shortcut: 'Ctrl+N',
    action: 'create-workspace'
  },
  {
    id: 'new-document',
    title: 'New Document',
    description: 'Create a new document',
    icon: 'heroicons:document-plus',
    shortcut: 'Ctrl+Alt+N',
    action: 'create-document'
  },
  {
    id: 'new-todo',
    title: 'New Todo',
    description: 'Create a new todo item',
    icon: 'heroicons:check-circle',
    action: 'create-todo'
  },
  {
    id: 'open-ide',
    title: 'Open IDE',
    description: 'Open integrated development environment',
    icon: 'heroicons:code-bracket',
    shortcut: 'Ctrl+Shift+I',
    action: 'open-ide'
  },
  {
    id: 'open-workflow',
    title: 'Open Workflow Builder',
    description: 'Design visual workflows',
    icon: 'heroicons:cpu-chip',
    action: 'open-workflow'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Open application settings',
    icon: 'heroicons:cog-6-tooth',
    shortcut: 'Ctrl+,',
    action: 'open-settings'
  },
  {
    id: 'zoom-in',
    title: 'Zoom In',
    description: 'Zoom in the canvas',
    icon: 'heroicons:magnifying-glass-plus',
    shortcut: 'Ctrl++',
    action: 'zoom-in'
  },
  {
    id: 'zoom-out',
    title: 'Zoom Out',
    description: 'Zoom out the canvas',
    icon: 'heroicons:magnifying-glass-minus',
    shortcut: 'Ctrl+-',
    action: 'zoom-out'
  },
  {
    id: 'fit-to-screen',
    title: 'Fit to Screen',
    description: 'Fit all nodes to screen',
    icon: 'heroicons:arrows-pointing-out',
    shortcut: 'Ctrl+0',
    action: 'fit-to-screen'
  }
]

const aiCommands = [
  {
    id: 'ai-chat',
    title: 'Chat with Athena',
    description: 'Open AI assistant conversation',
    icon: 'heroicons:chat-bubble-left-right',
    action: 'ai-chat'
  },
  {
    id: 'ai-generate',
    title: 'Generate with AI',
    description: 'Generate content using AI',
    icon: 'heroicons:sparkles',
    action: 'ai-generate'
  },
  {
    id: 'ai-analyze',
    title: 'Analyze with AI',
    description: 'Analyze current workspace',
    icon: 'heroicons:chart-bar',
    action: 'ai-analyze'
  },
  {
    id: 'ai-suggest',
    title: 'AI Suggestions',
    description: 'Get AI-powered suggestions',
    icon: 'heroicons:light-bulb',
    action: 'ai-suggest'
  }
]

const recentItems = ref([
  {
    id: 'recent-1',
    title: 'Project Roadmap',
    path: '/workspace/documents/roadmap',
    type: 'document',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: 'recent-2',
    title: 'Todo Dashboard',
    path: '/workspace/todos',
    type: 'todo',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2)
  },
  {
    id: 'recent-3',
    title: 'Main Workflow',
    path: '/workspace/workflows/main',
    type: 'workflow',
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24)
  }
])

// Filtered results
const filteredActions = computed(() => {
  if (!query.value) return actions.slice(0, 5)
  const q = query.value.toLowerCase()
  return actions.filter(action =>
    action.title.toLowerCase().includes(q)
    || action.description?.toLowerCase().includes(q)
  )
})

const filteredAICommands = computed(() => {
  if (!query.value) return aiCommands.slice(0, 3)
  const q = query.value.toLowerCase()
  return aiCommands.filter(command =>
    command.title.toLowerCase().includes(q)
    || command.description?.toLowerCase().includes(q)
  )
})

const filteredRecent = computed(() => {
  if (!query.value) return recentItems.value.slice(0, 3)
  const q = query.value.toLowerCase()
  return recentItems.value.filter(item =>
    item.title.toLowerCase().includes(q)
    || item.path.toLowerCase().includes(q)
  )
})

const allResults = computed(() => [
  ...filteredActions.value,
  ...filteredAICommands.value,
  ...filteredRecent.value
])

// Methods
const close = () => {
  isOpen.value = false
  query.value = ''
  selectedIndex.value = 0
}

const executeAction = (action: any) => {
  emit('execute', { type: 'action', data: action })
  close()
}

const executeCommand = (command: any) => {
  emit('execute', { type: 'ai', data: command })
  close()
}

const openRecent = (item: any) => {
  emit('execute', { type: 'open', data: item })
  close()
}

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Escape':
      close()
      break

    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, allResults.value.length - 1)
      break

    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break

    case 'Enter':
      event.preventDefault()
      if (allResults.value.length > 0) {
        const result = allResults.value[selectedIndex.value]
        if (filteredActions.value.includes(result as any)) {
          executeAction(result)
        } else if (filteredAICommands.value.includes(result as any)) {
          executeCommand(result)
        } else {
          openRecent(result)
        }
      }
      break
  }
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'document': return 'heroicons:document-text'
    case 'todo': return 'heroicons:check-circle'
    case 'workflow': return 'heroicons:cpu-chip'
    case 'ide': return 'heroicons:code-bracket'
    default: return 'heroicons:document'
  }
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// Watch for open state changes
watch(isOpen, async (value) => {
  if (value) {
    await nextTick()
    searchInput.value?.focus()
  }
})

// Reset selection when query changes
watch(query, () => {
  selectedIndex.value = 0
})
</script>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.command-palette {
  width: 90%;
  max-width: 640px;
  max-height: 70vh;
  background: rgb(17, 24, 39);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.palette-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
  background: rgba(17, 24, 39, 0.95);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: rgb(156, 163, 175);
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 1rem;
  placeholder-color: rgb(107, 114, 128);
}

.search-input::placeholder {
  color: rgb(107, 114, 128);
}

.palette-shortcut {
  padding: 0.25rem 0.5rem;
  background: rgba(55, 65, 81, 0.5);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 4px;
  color: rgb(156, 163, 175);
  font-size: 0.75rem;
  font-family: monospace;
}

.palette-results {
  max-height: calc(70vh - 4rem);
  overflow-y: auto;
  padding: 0.5rem;
}

.result-section {
  margin-bottom: 1rem;
}

.section-title {
  padding: 0.5rem 0.75rem;
  color: rgb(156, 163, 175);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.25rem 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.result-item:hover,
.result-item.active {
  background: rgba(99, 102, 241, 0.1);
}

.result-item.active {
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.result-icon {
  width: 20px;
  height: 20px;
  color: rgb(156, 163, 175);
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.result-icon.ai-icon {
  color: rgb(168, 85, 247);
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.result-description {
  color: rgb(107, 114, 128);
  font-size: 0.75rem;
  margin-top: 0.125rem;
}

.result-shortcut {
  display: flex;
  gap: 0.25rem;
}

.result-shortcut kbd {
  padding: 0.125rem 0.375rem;
  background: rgba(55, 65, 81, 0.5);
  border: 1px solid rgba(75, 85, 99, 0.5);
  border-radius: 3px;
  color: rgb(156, 163, 175);
  font-size: 0.6875rem;
  font-family: monospace;
}

.result-meta {
  color: rgb(107, 114, 128);
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.no-results {
  padding: 3rem 1rem;
  text-align: center;
}

.no-results-icon {
  width: 48px;
  height: 48px;
  color: rgb(75, 85, 99);
  margin: 0 auto 1rem;
}

.no-results-text {
  color: rgb(156, 163, 175);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.no-results-hint {
  color: rgb(107, 114, 128);
  font-size: 0.875rem;
}

/* Transitions */
.palette-enter-active,
.palette-leave-active {
  transition: all 0.2s ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-from .command-palette,
.palette-leave-to .command-palette {
  transform: scale(0.95) translateY(-20px);
}

/* Scrollbar styling */
.palette-results::-webkit-scrollbar {
  width: 8px;
}

.palette-results::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.5);
  border-radius: 4px;
}

.palette-results::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.5);
  border-radius: 4px;
}

.palette-results::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.5);
}
</style>
