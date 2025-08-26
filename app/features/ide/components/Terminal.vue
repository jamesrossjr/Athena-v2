<template>
  <div class="terminal-container h-full bg-white relative">
    <!-- Terminal Content (no header, full height) -->
    <div
      v-for="tab in terminalTabs"
      :id="getTerminalContainerId(tab.id)"
      :key="tab.id"
      :class="[
        'terminal-content h-full bg-white',
        tab.id === activeTabId ? 'block' : 'hidden'
      ]"
    />

    <!-- Loading State -->
    <div
      v-if="!isTerminalReady"
      class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
    >
      <div class="text-center text-gray-300">
        <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p>Initializing terminal...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
    >
      <div class="text-center text-red-400 max-w-md">
        <p class="mb-2">
          ⚠️ Terminal Error
        </p>
        <p class="text-sm">
          {{ error }}
        </p>
        <button
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          @click="initializeTerminals"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps({
  sessionId: {
    type: String,
    default: null
  },
  activeTabId: {
    type: String,
    default: 'terminal-1'
  },
  terminalTabs: {
    type: Array,
    default: () => []
  }
})

defineOptions({
  name: 'AppTerminal'
})

const _emit = defineEmits(['close'])

// Terminal state
const isTerminalReady = ref(false)
const error = ref(null)
const terminalInstances = ref(new Map())

// Generate unique container ID for each tab
const getTerminalContainerId = tabId => `terminal-container-${tabId}`

// Terminal composable
let terminalComposable = null

const initializeTerminals = async () => {
  try {
    error.value = null
    isTerminalReady.value = false

    // Import terminal composable dynamically (client-side only)
    if (import.meta.client) {
      const { useTerminal } = await import('../composables/useTerminal')
      terminalComposable = useTerminal()

      // Wait for DOM to be ready
      await nextTick()

      // Initialize all terminal tabs
      for (const tab of props.terminalTabs) {
        if (!terminalInstances.value.has(tab.id)) {
          const containerId = getTerminalContainerId(tab.id)
          const sessionId = await terminalComposable.createTerminal(containerId, tab.id)
          terminalInstances.value.set(tab.id, sessionId)
        }
      }

      isTerminalReady.value = true

      // Focus active terminal after creation
      setTimeout(() => {
        if (terminalComposable && props.activeTabId) {
          const activeSessionId = terminalInstances.value.get(props.activeTabId)
          if (activeSessionId) {
            terminalComposable.focusTerminal(activeSessionId)
          }
        }
      }, 100)
    } else {
      // Server-side: just mark as not ready
      isTerminalReady.value = false
    }
  } catch (err) {
    console.error('Failed to initialize terminals:', err)
    error.value = err.message || 'Failed to initialize terminals'
    isTerminalReady.value = false
  }
}

const clearTerminal = (tabId = null) => {
  const targetTabId = tabId || props.activeTabId
  const sessionId = terminalInstances.value.get(targetTabId)
  if (terminalComposable && sessionId) {
    terminalComposable.clearTerminal(sessionId)
  }
}

const resizeTerminal = (tabId = null) => {
  const targetTabId = tabId || props.activeTabId
  const sessionId = terminalInstances.value.get(targetTabId)
  if (terminalComposable && sessionId) {
    terminalComposable.resizeTerminal(sessionId)
  }
}

const createNewTerminal = async (tabId) => {
  if (import.meta.client && terminalComposable && !terminalInstances.value.has(tabId)) {
    try {
      await nextTick() // Wait for DOM
      const containerId = getTerminalContainerId(tabId)
      const sessionId = await terminalComposable.createTerminal(containerId, tabId)
      terminalInstances.value.set(tabId, sessionId)
    } catch (err) {
      console.error('Failed to create new terminal:', err)
    }
  }
}

// Handle window resize
const handleResize = () => {
  setTimeout(resizeTerminal, 100)
}

onMounted(() => {
  // Only initialize on client side
  if (import.meta.client) {
    initializeTerminals()

    // Handle window resize
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', handleResize)

    // Cleanup all terminal sessions
    if (terminalComposable) {
      for (const sessionId of terminalInstances.value.values()) {
        terminalComposable.destroyTerminal(sessionId)
      }
    }
  }
})

// Watch for new terminal tabs
watch(() => props.terminalTabs, async (newTabs) => {
  if (import.meta.client && terminalComposable) {
    for (const tab of newTabs) {
      if (!terminalInstances.value.has(tab.id)) {
        await createNewTerminal(tab.id)
      }
    }
  }
}, { deep: true })

// Watch active tab changes
watch(() => props.activeTabId, (newTabId) => {
  if (import.meta.client && terminalComposable && newTabId) {
    setTimeout(() => {
      const sessionId = terminalInstances.value.get(newTabId)
      if (sessionId) {
        terminalComposable.focusTerminal(sessionId)
      }
    }, 100)
  }
})

// Expose methods for parent component
defineExpose({
  clearTerminal,
  resizeTerminal,
  createNewTerminal,
  focusTerminal: (tabId = null) => {
    const targetTabId = tabId || props.activeTabId
    const sessionId = terminalInstances.value.get(targetTabId)
    if (terminalComposable && sessionId) {
      terminalComposable.focusTerminal(sessionId)
    }
  }
})
</script>

<style scoped>
.terminal-container {
  background: #ffffff;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.terminal-content {
  background: #ffffff;
  color: #374151;
}

/* Ensure xterm.js styles work properly */
.terminal-content :deep(.xterm) {
  height: 100%;
  width: 100%;
}

.terminal-content :deep(.xterm-viewport) {
  background-color: #ffffff !important;
}

.terminal-content :deep(.xterm-screen) {
  background-color: #ffffff !important;
}

/* Hide scrollbars but keep functionality */
.terminal-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.terminal-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* Also hide xterm's internal scrollbar */
.terminal-content :deep(.xterm-viewport::-webkit-scrollbar) {
  display: none;
}

.terminal-content :deep(.xterm-screen) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.terminal-content :deep(.xterm-screen::-webkit-scrollbar) {
  display: none;
}
</style>
