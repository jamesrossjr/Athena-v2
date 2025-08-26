<!--
  Universal AI Sidebar - Ctrl+Shift+A Access

  Persistent sidebar for AI conversations with context awareness.
  This is the second complementary access point to the Universal Command Palette.

  Features:
  - Persistent AI conversations
  - Context-aware assistance
  - Floating/docked modes
  - Full conversation history
  - Actionable results with clear action buttons
-->

<template>
  <!-- AI Sidebar Panel -->
  <teleport to="body">
    <div
      v-if="isOpen"
      class="fixed right-0 top-0 h-screen z-[9999] flex"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/5 -z-10"
        @click="close"
      />

      <!-- Sidebar Container (Explorer-style) -->
      <div class="w-80 h-full bg-white border-l border-gray-300 shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🤖</span>
            <div>
              <h2 class="text-sm font-medium text-gray-900">
                AI Assistant
              </h2>
              <p class="text-xs text-gray-500">
                {{ currentContext }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-1">
            <!-- Close Button -->
            <button
              class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              @click="close"
            >
              <span class="text-sm">✕</span>
            </button>
          </div>
        </div>

        <!-- Context Banner -->
        <div
          v-if="contextInfo"
          class="px-3 py-1.5 bg-gray-50 border-b border-gray-200"
        >
          <div class="flex items-center space-x-2 text-sm">
            <span class="text-gray-600">{{ contextInfo.type }}:</span>
            <span class="font-medium text-gray-800 truncate">{{ contextInfo.name }}</span>
          </div>
        </div>

        <!-- Conversation Area -->
        <div class="flex-1 flex flex-col min-h-0">
          <!-- Messages -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-3 space-y-3"
          >
            <!-- Welcome Message -->
            <div
              v-if="!conversationHistory.length"
              class="text-center py-8"
            >
              <div class="text-6xl mb-4">
                🤖
              </div>
              <h3 class="text-sm font-medium text-gray-900 mb-2">
                AI Assistant Ready
              </h3>
              <p class="text-gray-500 text-sm mb-4">
                I can help with coding, analysis, documentation, and more.
              </p>

              <!-- Quick Actions -->
              <div class="grid grid-cols-1 gap-2 max-w-xs mx-auto">
                <button
                  v-for="suggestion in quickSuggestions"
                  :key="suggestion.id"
                  class="flex items-center space-x-2 p-2 text-left rounded hover:bg-gray-50 transition-colors"
                  @click="applySuggestion(suggestion)"
                >
                  <span class="text-sm">{{ suggestion.icon }}</span>
                  <div class="text-sm">
                    <div class="text-sm font-medium text-gray-900">
                      {{ suggestion.title }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ suggestion.description }}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Conversation Messages -->
            <div
              v-for="message in conversationHistory"
              :key="message.id"
              :class="[
                'flex space-x-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              ]"
            >
              <!-- AI Avatar -->
              <div
                v-if="message.role === 'assistant'"
                class="flex-shrink-0"
              >
                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span class="text-sm">🤖</span>
                </div>
              </div>

              <!-- Message Content -->
              <div
                :class="[
                  'max-w-[85%] rounded px-2 py-1.5',
                  message.role === 'user'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                ]"
              >
                <div
                  class="text-sm"
                  v-html="formatMessage(message.content)"
                />

                <!-- Action Buttons -->
                <div
                  v-if="message.actions && message.actions.length"
                  class="flex flex-wrap gap-1 mt-2"
                >
                  <button
                    v-for="action in message.actions"
                    :key="action.id"
                    :class="[
                      'px-2 py-0.5 text-xs rounded transition-colors',
                      message.role === 'user'
                        ? 'bg-gray-500 hover:bg-gray-400 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    ]"
                    @click="executeAction(action)"
                  >
                    {{ action.label }}
                  </button>
                </div>
              </div>

              <!-- User Avatar -->
              <div
                v-if="message.role === 'user'"
                class="flex-shrink-0"
              >
                <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span class="text-sm">👤</span>
                </div>
              </div>
            </div>

            <!-- Typing Indicator -->
            <div
              v-if="isLoading"
              class="flex space-x-3"
            >
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span class="text-sm">🤖</span>
                </div>
              </div>
              <div class="bg-gray-100 rounded-lg px-3 py-2">
                <div class="flex space-x-1">
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 0ms"
                  />
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 150ms"
                  />
                  <div
                    class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style="animation-delay: 300ms"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="border-t border-gray-200 p-3">
            <!-- Context Suggestions -->
            <div
              v-if="contextSuggestions.length && !currentInput"
              class="mb-3"
            >
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="suggestion in contextSuggestions.slice(0, 3)"
                  :key="suggestion.text"
                  class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  @click="currentInput = suggestion.text"
                >
                  {{ suggestion.text }}
                </button>
              </div>
            </div>

            <!-- Input Field -->
            <div class="relative">
              <textarea
                ref="inputRef"
                v-model="currentInput"
                placeholder="Ask anything or describe what you need help with..."
                class="w-full px-3 py-2 border border-gray-300 rounded resize-none focus:outline-none focus:border-gray-400 bg-white"
                rows="3"
                @keydown="handleKeyDown"
                @input="handleInputChange"
              />

              <!-- Send Button -->
              <button
                :disabled="!currentInput.trim() || isLoading"
                class="absolute bottom-2 right-2 p-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                @click="sendMessage"
              >
                <span class="text-sm">{{ isLoading ? '...' : '→' }}</span>
              </button>
            </div>

            <!-- Input Hints -->
            <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{{ currentInput.length }}/1000</span>
              <div class="flex items-center space-x-2">
                <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd>
                <span>to send</span>
                <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Shift+Enter</kbd>
                <span>for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, readonly } from 'vue'
import { useAI } from '../composables/useAI'
import { useContextAwareness } from '../composables/useContextAwareness'

// Props and emits
const emit = defineEmits(['execute-action', 'close', 'open', 'activity-change'])

// State
const isOpen = ref(false)
const currentInput = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const inputRef = ref(null)
const isAIActive = ref(false)
const inactivityTimer = ref(null)

// AI Integration
const { sendMessage: sendAIMessage } = useAI()
const { currentContext, contextSuggestions, getContextInfo } = useContextAwareness()

// Computed
const contextInfo = computed(() => getContextInfo?.())

// Conversation State
const conversationHistory = ref([])

// Quick suggestions when conversation is empty
const quickSuggestions = ref([
  {
    id: 'explain-code',
    title: 'Explain this code',
    description: 'Help me understand what this does',
    icon: '📖',
    text: 'Can you explain what this code does?'
  },
  {
    id: 'find-bugs',
    title: 'Find issues',
    description: 'Review for bugs and improvements',
    icon: '🐛',
    text: 'Please review this code for any issues or improvements'
  },
  {
    id: 'write-tests',
    title: 'Write tests',
    description: 'Generate test cases',
    icon: '🧪',
    text: 'Help me write tests for this functionality'
  },
  {
    id: 'optimize',
    title: 'Optimize code',
    description: 'Suggest performance improvements',
    icon: '⚡',
    text: 'How can I optimize this code for better performance?'
  }
])

// Methods
const open = () => {
  isOpen.value = true
  isAIActive.value = true
  clearInactivityTimer()
  nextTick(() => {
    inputRef.value?.focus()
  })
  emit('open')
}

const close = () => {
  isOpen.value = false
  isAIActive.value = false
  clearInactivityTimer()
  emit('close')
}

// Removed toggle mode - always docked like explorer
const toggleMode = () => {
  // No-op - always docked
}

const handleKeyDown = (e) => {
  resetInactivityTimer()
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Escape') {
    close()
  }
}

const handleInputChange = () => {
  resetInactivityTimer()
}

const sendMessage = async () => {
  if (!currentInput.value.trim() || isLoading.value) return

  const message = currentInput.value.trim()
  currentInput.value = ''
  isLoading.value = true
  isAIActive.value = true
  resetInactivityTimer()

  // Add user message to history
  const userMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date()
  }
  conversationHistory.value.push(userMessage)

  // Scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })

  try {
    // Send to AI with context
    const response = await sendAIMessage(message, {
      context: currentContext.value,
      conversationHistory: conversationHistory.value.slice(-5) // Last 5 messages for context
    })

    // Add AI response to history
    const aiMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: response.text,
      actions: response.actions || [],
      timestamp: new Date()
    }
    conversationHistory.value.push(aiMessage)

    // Update activity status
    updateAIActivity()
    resetInactivityTimer()

    // Scroll to bottom
    nextTick(() => {
      scrollToBottom()
    })
  } catch (error) {
    console.error('AI message error:', error)

    // Add error message
    const errorMessage = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date()
    }
    conversationHistory.value.push(errorMessage)
  } finally {
    isLoading.value = false
    updateAIActivity()
  }
}

const applySuggestion = (suggestion) => {
  currentInput.value = suggestion.text
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const executeAction = (action) => {
  emit('execute-action', action)
}

const formatMessage = (content) => {
  // Simple markdown-like formatting
  return content
    .replace(/`([^`]+)`/g, '<code class="bg-gray-50 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const clearConversation = () => {
  conversationHistory.value = []
}

// Inactivity management
const resetInactivityTimer = () => {
  clearInactivityTimer()
  inactivityTimer.value = setTimeout(() => {
    if (isOpen.value && !isLoading.value && !currentInput.value.trim()) {
      close()
    }
  }, 30000) // Auto-close after 30 seconds of inactivity
}

const clearInactivityTimer = () => {
  if (inactivityTimer.value) {
    clearTimeout(inactivityTimer.value)
    inactivityTimer.value = null
  }
}

// Track AI activity
const updateAIActivity = () => {
  const wasActive = isAIActive.value
  isAIActive.value = isLoading.value || conversationHistory.value.length > 0
  if (wasActive !== isAIActive.value) {
    emit('activity-change', isAIActive.value)
  }
}

// Global keyboard handler
const handleGlobalKeyDown = (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') {
    e.preventDefault()
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeyDown)
  updateAIActivity()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeyDown)
  clearInactivityTimer()
})

// Expose methods for parent components
defineExpose({
  open,
  close,
  toggleMode,
  clearConversation,
  isOpen: readonly(isOpen)
})

// Watch for sidebar interactions to manage auto-close
watch(isOpen, (newValue) => {
  if (newValue) {
    resetInactivityTimer()
  } else {
    clearInactivityTimer()
  }
})
</script>

<style scoped>
/* Custom scrollbar for messages */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Animation for bounce */
@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.animate-bounce {
  animation: bounce 1.4s infinite ease-in-out both;
}

/* Custom prose styling removed to avoid Tailwind conflicts */

/* Subtle pulse animation for AI active state */
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
    background-color: rgb(156, 163, 175); /* gray-400 */
  }
  50% {
    opacity: 0.8;
    background-color: rgb(107, 114, 128); /* gray-500 */
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
</style>
