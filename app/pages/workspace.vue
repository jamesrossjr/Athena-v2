<script setup>
// Canvas Workspace - The main editor interface
useSeoMeta({
  title: 'Canvas Workspace',
  description: 'Your digital workspace - block-based editor with AI co-pilot'
})

// Workspace state
const workspaceState = ref({
  isLoading: true,
  hasWorkspace: false,
  currentWorkspace: null,
  documents: []
})

// Command Center state
const commandCenter = ref({
  isOpen: false,
  query: '',
  results: []
})

// Editor state
const editor = ref({
  currentDocument: null,
  blocks: [],
  isEditing: false,
  saveTimeout: null
})

// Check if user has workspace
onMounted(async () => {
  try {
    // TODO: Check for existing workspace
    // For now, simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000))

    workspaceState.value.isLoading = false
    workspaceState.value.hasWorkspace = false // Will trigger onboarding
  } catch (error) {
    console.error('Error loading workspace:', error)
    workspaceState.value.isLoading = false
  }
})

// Command Center (Cmd+K) functionality
const toggleCommandCenter = () => {
  commandCenter.value.isOpen = !commandCenter.value.isOpen
  if (commandCenter.value.isOpen) {
    nextTick(() => {
      document.getElementById('command-center-input')?.focus()
    })
  }
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e) => {
    // Cmd+K or Ctrl+K for Command Center
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      toggleCommandCenter()
    }

    // Escape to close Command Center
    if (e.key === 'Escape' && commandCenter.value.isOpen) {
      commandCenter.value.isOpen = false
    }
  }

  document.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// Handle command center search
const handleCommandSearch = async (query) => {
  commandCenter.value.query = query

  if (!query.trim()) {
    commandCenter.value.results = []
    return
  }

  // Check for spacing commands
  const spacingCommands = [
    { pattern: /spacing|space/i, results: [
      { type: 'action', label: 'Tight spacing (0.5x)', action: 'spacing-0.5' },
      { type: 'action', label: 'Normal spacing (1x)', action: 'spacing-1' },
      { type: 'action', label: 'Relaxed spacing (1.5x)', action: 'spacing-1.5' },
      { type: 'action', label: 'Loose spacing (2x)', action: 'spacing-2' }
    ] }
  ]

  // Check if query matches spacing commands
  const matchedSpacing = spacingCommands.find(cmd => cmd.pattern.test(query))
  if (matchedSpacing) {
    commandCenter.value.results = matchedSpacing.results
    return
  }

  // Default commands
  commandCenter.value.results = [
    { type: 'action', label: 'Create new document', action: 'create-document' },
    { type: 'action', label: 'Search documents', action: 'search' },
    { type: 'action', label: 'Adjust block spacing', action: 'spacing' },
    { type: 'ai', label: `Ask AI: "${query}"`, action: 'ai-query' }
  ]
}

// Handle document changes (auto-save)
const handleDocumentChange = (blocks) => {
  editor.value.blocks = blocks

  // Auto-save after 1 second of inactivity
  clearTimeout(editor.value.saveTimeout)
  editor.value.saveTimeout = setTimeout(async () => {
    try {
      // TODO: Save to database
      console.log('Auto-saving document...', blocks)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, 1000)
}
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="workspaceState.isLoading"
    class="min-h-screen flex items-center justify-center"
  >
    <div class="text-center space-y-4">
      <div class="animate-spin h-8 w-8 mx-auto border-2 border-gray-300 border-t-gray-600 rounded-full" />
      <p class="text-gray-600">
        Loading your workspace...
      </p>
    </div>
  </div>

  <!-- Onboarding Flow -->
  <div
    v-else-if="!workspaceState.hasWorkspace"
    class="min-h-screen flex items-center justify-center px-4"
  >
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Canvas
        </h1>
        <p class="text-gray-600">
          The fastest, most intuitive digital workspace
        </p>
      </div>

      <div class="space-y-6">
        <div>
          <input
            type="text"
            placeholder="Name your workspace"
            class="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <button
          class="w-full px-4 py-3 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
          @click="() => { workspaceState.hasWorkspace = true }"
        >
          Create Workspace
        </button>

        <p class="text-sm text-gray-500 text-center">
          We'll save your work automatically. No account needed yet.
        </p>
      </div>

      <div class="text-center">
        <p class="text-xs canvas-text-muted">
          Press <kbd class="bg-gray-100 px-2 py-1 rounded text-xs">Cmd+K</kbd> anytime to access the Command Center
        </p>
      </div>
    </div>
  </div>

  <!-- Main Workspace Interface -->
  <div
    v-else
    class="min-h-screen bg-white"
  >
    <!-- Clean, Google Docs-like interface -->
    <div class="max-w-4xl mx-auto px-8 py-16">
      <!-- Block Editor -->
      <BlockEditor
        v-model="editor.blocks"
        @update:model-value="handleDocumentChange"
      />
    </div>

    <!-- Command Center Modal -->
    <div
      v-if="commandCenter.isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      @click="commandCenter.isOpen = false"
    >
      <div
        class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4"
        @click.stop
      >
        <div class="space-y-4">
          <input
            id="command-center-input"
            v-model="commandCenter.query"
            placeholder="Search documents, ask AI, or run commands..."
            class="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="(e) => handleCommandSearch(e.target.value)"
          >

          <div
            v-if="commandCenter.results.length"
            class="space-y-2"
          >
            <div
              v-for="result in commandCenter.results"
              :key="result.label"
              class="p-3 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center space-x-3"
            >
              <span class="canvas-text-muted">{{ result.type === 'ai' ? '✨' : '🔍' }}</span>
              <span>{{ result.label }}</span>
            </div>
          </div>

          <div
            v-else-if="commandCenter.query"
            class="text-center py-8 text-gray-500"
          >
            No results found
          </div>

          <div
            v-else
            class="space-y-2 text-sm text-gray-500"
          >
            <p><strong>Quick actions:</strong></p>
            <ul class="space-y-1 pl-4">
              <li>• Type to search documents</li>
              <li>• Ask AI anything</li>
              <li>• Create new document</li>
              <li>• Navigate anywhere</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minimal, invisible UI styles */
input::placeholder {
  color: #9ca3af;
}

input:focus::placeholder {
  color: #d1d5db;
}

kbd {
  font-family: monospace;
  font-size: 0.75rem;
}
</style>
