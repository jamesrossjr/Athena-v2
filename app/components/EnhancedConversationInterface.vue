<template>
  <div
    class="conversation-interface"
    :class="{ 'voice-mode': isVoiceMode }"
  >
    <!-- 3D ATHENA Character Section -->
    <div
      class="character-section"
      :class="{
        'voice-active': isVoiceMode,
        'chat-minimized': !isVoiceMode,
        'speaking': isCharacterSpeaking
      }"
    >
      <ATHENACharacter3D
        ref="ATHENACharacter"
        :show-controls="true"
        :show-emotion-controls="false"
        :show-gesture-controls="false"
        :show-stats="false"
        :default-mode="isVoiceMode ? 'voice' : 'chat'"
        @mode-changed="handleModeChange"
        @emotion-changed="handleEmotionChange"
        @initialized="handleCharacterInitialized"
      />

      <!-- Voice Mode Controls -->
      <div
        v-if="isVoiceMode"
        class="voice-controls"
      >
        <div class="voice-status">
          <div
            class="status-indicator"
            :class="voiceStatus"
          >
            <UIcon :name="voiceStatusIcon" />
            <span>{{ voiceStatusText }}</span>
          </div>
        </div>

        <div class="voice-buttons">
          <UButton
            v-if="!isListening && !isSpeechProcessing"
            icon="i-lucide-mic"
            color="green"
            size="lg"
            class="voice-button"
            @click="startVoiceInput"
          >
            Start Speaking
          </UButton>

          <UButton
            v-if="isListening"
            icon="i-lucide-mic-off"
            color="red"
            size="lg"
            class="voice-button"
            @click="stopVoiceInput"
          >
            Stop Speaking
          </UButton>

          <div
            v-if="isSpeechProcessing"
            class="processing-indicator"
          >
            <UIcon
              name="i-lucide-loader"
              class="animate-spin"
            />
            <span>Processing speech...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Interface Section -->
    <div
      class="chat-section"
      :class="{ 'full-height': !isVoiceMode }"
    >
      <!-- Header -->
      <div class="conversation-header">
        <div class="header-left">
          <div class="avatar-section">
            <div
              v-if="!isVoiceMode"
              class="avatar"
            >
              <ATHENACharacter3D
                ref="miniATHENACharacter"
                :show-controls="false"
                :default-mode="'chat'"
                class="mini-character"
              />
            </div>
            <div class="header-info">
              <h3>{{ isVoiceMode ? 'Voice Chat with Athena' : 'Chat with Athena' }}</h3>
              <div class="status-info">
                <span
                  class="status-indicator"
                  :class="connectionStatus"
                >
                  {{ connectionStatus }}
                </span>
                <span v-if="messages.length > 0">{{ messages.length }} messages</span>
                <span
                  v-if="metrics.avgResponseTime"
                  class="response-time"
                >
                  Avg: {{ Math.round(metrics.avgResponseTime) }}ms
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- Voice/Chat Toggle -->
          <UButton
            :icon="isVoiceMode ? 'i-lucide-message-circle' : 'i-lucide-mic'"
            :label="isVoiceMode ? 'Chat Mode' : 'Voice Mode'"
            :color="isVoiceMode ? 'blue' : 'green'"
            variant="outline"
            size="sm"
            @click="toggleConversationMode"
          />

          <!-- WebSocket Connection -->
          <UButton
            v-if="!isConnected"
            icon="i-lucide-wifi"
            label="Connect"
            color="green"
            size="sm"
            @click="connectWebSocket"
          />

          <!-- New Thread -->
          <UButton
            v-if="isConnected"
            icon="i-lucide-plus"
            label="New Thread"
            color="blue"
            variant="outline"
            size="sm"
            @click="createNewThread"
          />

          <!-- Thread Selector -->
          <div
            v-if="conversationList.length > 0"
            class="relative"
          >
            <UButton
              icon="i-lucide-message-square"
              variant="outline"
              size="sm"
              :label="`${conversationList.length} threads`"
            />
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div
        ref="messagesContainer"
        class="messages-area"
        @scroll="handleScroll"
      >
        <!-- Welcome message -->
        <div
          v-if="messages.length === 0"
          class="welcome-section"
        >
          <div class="welcome-content">
            <div class="welcome-avatar">
              🤖
            </div>
            <h3>Hi! I'm ATHENA</h3>
            <p>
              I'm your AI companion with personality, memory, and emotional intelligence.
              {{ isVoiceMode ? 'Just click the microphone and start talking!' : 'Type a message or click a starter below.' }}
            </p>

            <div
              v-if="!isVoiceMode"
              class="conversation-starters"
            >
              <UButton
                v-for="starter in conversationStarters"
                :key="starter"
                :label="starter"
                variant="soft"
                size="sm"
                @click="sendMessage(starter)"
              />
            </div>

            <div
              v-if="isVoiceMode"
              class="voice-tips"
            >
              <div class="tip">
                💡 Tip: I can understand natural speech and respond with my voice
              </div>
              <div class="tip">
                🧠 Try saying "think out loud" for step-by-step reasoning
              </div>
            </div>
          </div>
        </div>

        <!-- Message list -->
        <div
          v-for="message in messages"
          :key="message.id"
          :class="[
            'message-wrapper',
            message.role === 'user' ? 'user-message' : 'ai-message'
          ]"
        >
          <div class="message-content">
            <!-- AI Avatar for AI messages -->
            <div
              v-if="message.role === 'assistant'"
              class="message-avatar"
            >
              🤖
            </div>

            <div
              class="message-bubble"
              :class="message.role"
            >
              <!-- Reasoning steps -->
              <div
                v-if="message.metadata?.reasoning && showReasoning[message.id]"
                class="reasoning-section"
              >
                <div class="reasoning-header">
                  <UIcon name="i-lucide-brain" />
                  <span>My thinking process:</span>
                </div>
                <div class="reasoning-steps">
                  <div
                    v-for="step in message.metadata.reasoning"
                    :key="step.step"
                    class="reasoning-step"
                  >
                    <div class="step-number">
                      {{ step.step }}
                    </div>
                    <div class="step-content">
                      <div class="step-description">
                        {{ step.description }}
                      </div>
                      <div class="step-thinking">
                        {{ step.thinking }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Message text -->
              <div class="message-text">
                {{ message.content }}
              </div>

              <!-- Message metadata -->
              <div class="message-metadata">
                <span class="timestamp">{{ formatTime(message.timestamp) }}</span>

                <div class="metadata-actions">
                  <!-- Reasoning toggle -->
                  <button
                    v-if="message.metadata?.reasoning"
                    class="metadata-button"
                    @click="toggleReasoning(message.id)"
                  >
                    <UIcon name="i-lucide-brain" />
                    {{ showReasoning[message.id] ? 'Hide' : 'Show' }} reasoning
                  </button>

                  <!-- Confidence indicator -->
                  <span
                    v-if="message.metadata?.confidence"
                    class="confidence-indicator"
                    :class="getConfidenceClass(message.metadata.confidence)"
                  >
                    {{ Math.round(message.metadata.confidence * 100) }}%
                  </span>

                  <!-- Voice playback for AI messages -->
                  <button
                    v-if="message.role === 'assistant' && supportsSpeechSynthesis"
                    class="metadata-button"
                    :disabled="isCharacterSpeaking"
                    @click="speakMessage(message.content)"
                  >
                    <UIcon name="i-lucide-volume-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Thinking/Processing indicators -->
        <div
          v-if="isThinking || isSpeechProcessing"
          class="thinking-indicator"
        >
          <div class="message-avatar">
            🤖
          </div>
          <div class="thinking-bubble">
            <div class="thinking-dots">
              <div class="dot" />
              <div class="dot" />
              <div class="dot" />
            </div>
            <span>{{ isSpeechProcessing ? 'Processing your speech...' : 'Thinking...' }}</span>
          </div>
        </div>
      </div>

      <!-- Input Section -->
      <div
        v-if="!isVoiceMode"
        class="input-section"
      >
        <div class="input-wrapper">
          <UTextarea
            ref="messageInput"
            v-model="currentMessage"
            :placeholder="isVoiceMode ? 'Voice mode active - use microphone above' : 'Ask me anything or just say hello...'"
            :disabled="isProcessing || isVoiceMode"
            :rows="1"
            :maxrows="4"
            autoresize
            @keydown="handleKeyDown"
          />

          <UButton
            :disabled="!canSend"
            icon="i-lucide-send"
            :color="canSend ? 'primary' : 'gray'"
            class="send-button"
            @click="handleSend"
          />
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <UToggle
            v-model="reasoningModeEnabled"
            icon="i-lucide-brain"
            label="Reasoning Mode"
          />

          <UButton
            icon="i-lucide-trash"
            label="Clear"
            color="gray"
            variant="ghost"
            size="sm"
            @click="clearConversation"
          />

          <div class="flex-1" />

          <div
            v-if="metrics.avgResponseTime"
            class="performance-indicator"
          >
            Avg: {{ Math.round(metrics.avgResponseTime) }}ms
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useWebSocketConversation } from '~/composables/useWebSocketConversation'
import { useATHENAAI } from '~/composables/useATHENAAI'
// import { useElevenLabsVoice } from '~/composables/useElevenLabsVoice'
// import ATHENACharacter3D from './ATHENACharacter3D.vue'
import ATHENACharacter3D from './Athena3D.vue'

// Props
const props = defineProps({
  defaultMode: {
    type: String,
    default: 'chat',
    validator: value => ['chat', 'voice'].includes(value)
  },
  autoConnect: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['modeChanged', 'messageReceived', 'connected', 'disconnected'])

// Template refs
const messagesContainer = ref(null)
const messageInput = ref(null)
const ATHENACharacter = ref(null)
const miniATHENACharacter = ref(null)

// Core systems
const {
  connect: _connect,
  disconnect,
  sendMessage: sendWebSocketMessage,
  startNewThread,
  switchToThread,
  currentMessages: _currentMessages,
  activeThreads,
  currentThreadId: _currentThreadId,
  isConnected,
  connectionStatus
} = useWebSocketConversation()

const {
  generateResponse: generateATHENAResponse,
  memoryStats: _memoryStats,
  relationshipLevel: _relationshipLevel
} = useATHENAAI()

// ElevenLabs AI Voice System - temporarily disabled for build
// const {
//   speak: _speakElevenLabs,
//   speakWithEmotion,
//   isLoading: _isVoiceLoading,
//   isPlaying: _isVoicePlaying,
//   isAvailable: isElevenLabsAvailable,
//   status: _elevenLabsStatus
// } = useElevenLabsVoice()

// Temporary placeholders
const _speakElevenLabs = () => Promise.resolve()
const speakWithEmotion = () => Promise.resolve()
const _isVoiceLoading = ref(false)
const _isVoicePlaying = ref(false)
const isElevenLabsAvailable = ref(false)
const _elevenLabsStatus = ref('disabled')

// UI State
const isVoiceMode = ref(props.defaultMode === 'voice')
const currentMessage = ref('')
const showReasoning = ref({})
const reasoningModeEnabled = ref(true)
const isListening = ref(false)
const isSpeechProcessing = ref(false)
const isCharacterSpeaking = ref(false)
const isThinking = ref(false)

// Voice Recognition
let speechRecognition = null
const supportsSpeechRecognition = computed(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
const supportsSpeechSynthesis = computed(() => 'speechSynthesis' in window)

// Conversation data
const messages = ref([])
const conversationList = computed(() => Array.from(activeThreads.value.values()))
const metrics = ref({ avgResponseTime: 0 })

// Conversation starters
const conversationStarters = [
  'How are you today?',
  'Help me solve a problem',
  'Tell me something interesting',
  'What can we talk about?'
]

// Computed properties
const canSend = computed(() => {
  return currentMessage.value.trim().length > 0 && !isProcessing.value && !isVoiceMode.value
})

const isProcessing = computed(() => {
  return isThinking.value || isSpeechProcessing.value
})

const voiceStatus = computed(() => {
  if (isSpeechProcessing.value) return 'processing'
  if (isListening.value) return 'listening'
  if (isCharacterSpeaking.value) return 'speaking'
  return 'ready'
})

const voiceStatusIcon = computed(() => {
  const icons = {
    ready: 'i-lucide-mic',
    listening: 'i-lucide-mic',
    processing: 'i-lucide-loader',
    speaking: 'i-lucide-volume-2'
  }
  return icons[voiceStatus.value]
})

const voiceStatusText = computed(() => {
  const texts = {
    ready: 'Ready to listen',
    listening: 'Listening...',
    processing: 'Processing speech...',
    speaking: 'ATHENA is speaking'
  }
  return texts[voiceStatus.value]
})

// Methods
const handleModeChange = (newMode) => {
  isVoiceMode.value = newMode
  emit('modeChanged', newMode)

  if (newMode) {
    initializeSpeechRecognition()
  } else {
    cleanupSpeechRecognition()
  }
}

const toggleConversationMode = () => {
  if (ATHENACharacter.value) {
    ATHENACharacter.value.toggleMode()
  } else {
    handleModeChange(!isVoiceMode.value)
  }
}

const connectWebSocket = async () => {
  try {
    // Skip WebSocket connection for now - use HTTP API directly
    console.log('[Athena] Using direct HTTP API instead of WebSocket')
    // await connect()
    // emit('connected')
  } catch (error) {
    console.error('Failed to connect:', error)
  }
}

const createNewThread = async () => {
  try {
    await startNewThread('New conversation')
    messages.value = []
  } catch (error) {
    console.error('Failed to create thread:', error)
  }
}

const sendMessage = async (content) => {
  if (!content?.trim()) return

  const startTime = performance.now()

  // Add user message
  const userMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: content.trim(),
    timestamp: Date.now()
  }
  messages.value.push(userMessage)

  // Show thinking indicator
  isThinking.value = true

  try {
    // Send via WebSocket if connected, otherwise use direct AI
    let response
    if (isConnected.value) {
      response = await sendWebSocketMessage(content, { streamResponse: true })
    } else {
      response = await generateATHENAResponse(content, {
        reasoning: reasoningModeEnabled.value,
        history: messages.value.slice(-10)
      })
    }

    // Add AI response
    const aiMessage = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: response.text || response.content || 'I apologize, but I couldn\'t generate a response.',
      timestamp: Date.now(),
      metadata: {
        confidence: response.confidence || 0.8,
        emotion: response.emotion || 'neutral',
        reasoning: response.reasoning || [],
        processingTime: performance.now() - startTime
      }
    }
    messages.value.push(aiMessage)

    // Update metrics
    metrics.value.avgResponseTime = (metrics.value.avgResponseTime + aiMessage.metadata.processingTime) / 2

    // Handle character animation and speech
    if (ATHENACharacter.value) {
      // Set emotion based on response
      if (response.emotion) {
        await ATHENACharacter.value.setCharacterEmotion(response.emotion)
      }

      // Speak the response in voice mode
      if (isVoiceMode.value) {
        await speakMessage(aiMessage.content)
      }
    }

    emit('messageReceived', aiMessage)
  } catch (error) {
    console.error('Failed to send message:', error)

    // Add error message
    const errorMessage = {
      id: `error_${Date.now()}`,
      role: 'assistant',
      content: 'I apologize, but I encountered an error while processing your message. Please try again.',
      timestamp: Date.now(),
      metadata: {
        confidence: 0.1,
        emotion: 'apologetic',
        error: error.message
      }
    }
    messages.value.push(errorMessage)
  } finally {
    isThinking.value = false
    scrollToBottom()
  }
}

const handleSend = () => {
  if (canSend.value) {
    const message = currentMessage.value
    currentMessage.value = ''
    sendMessage(message)
  }
}

const handleKeyDown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// Voice functionality
const initializeSpeechRecognition = () => {
  if (!supportsSpeechRecognition.value) {
    console.warn('Speech recognition not supported')
    return
  }

  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
  speechRecognition = new SpeechRecognition()

  speechRecognition.continuous = false
  speechRecognition.interimResults = false
  speechRecognition.lang = 'en-US'

  speechRecognition.onstart = () => {
    isListening.value = true
  }

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    if (transcript.trim()) {
      sendMessage(transcript)
    }
  }

  speechRecognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error)
    isListening.value = false
    isSpeechProcessing.value = false
  }

  speechRecognition.onend = () => {
    isListening.value = false
    isSpeechProcessing.value = false
  }
}

const startVoiceInput = () => {
  if (speechRecognition && !isListening.value) {
    speechRecognition.start()
  }
}

const stopVoiceInput = () => {
  if (speechRecognition && isListening.value) {
    speechRecognition.stop()
  }
}

const speakMessage = async (text) => {
  if (isCharacterSpeaking.value || (!isElevenLabsAvailable.value && !supportsSpeechSynthesis.value)) return

  isCharacterSpeaking.value = true

  try {
    // Start character speaking animation
    if (ATHENACharacter.value) {
      ATHENACharacter.value.startSpeaking()
    }

    // Use ElevenLabs AI voice if available, fallback to browser synthesis
    if (isElevenLabsAvailable.value) {
      console.log('[Athena Voice] Using ElevenLabs AI voice synthesis')

      // Use emotional context based on message content
      let emotion = 'confident' // Default Athena emotion

      if (text.includes('?')) emotion = 'mysterious'
      if (text.toLowerCase().includes('welcome') || text.toLowerCase().includes('greet')) emotion = 'authoritative'
      if (text.toLowerCase().includes('knowledge') || text.toLowerCase().includes('wisdom')) emotion = 'confident'

      await speakWithEmotion(text, emotion)
    } else {
      // Fallback to browser speech synthesis
      console.log('[Athena Voice] Falling back to browser speech synthesis')

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)

      // Configure Athena voice (Lara Croft style)
      utterance.rate = 0.9
      utterance.pitch = 0.8
      utterance.volume = 0.85
      utterance.lang = 'en-GB'

      // Find British voice
      const voices = window.speechSynthesis.getVoices()
      const athenaVoice = voices.find(voice =>
        voice.lang.includes('en-GB') && voice.name.toLowerCase().includes('female')
      ) || voices.find(voice => voice.lang.includes('en-GB'))

      if (athenaVoice) utterance.voice = athenaVoice

      utterance.onend = () => {
        isCharacterSpeaking.value = false
        if (ATHENACharacter.value) ATHENACharacter.value.stopSpeakingAnimation()
      }

      window.speechSynthesis.speak(utterance)
      return // Exit early for browser synthesis
    }
  } catch (error) {
    console.error('[Athena Voice] Speech synthesis error:', error)
  } finally {
    // For ElevenLabs, stop animation after playback
    setTimeout(() => {
      isCharacterSpeaking.value = false
      if (ATHENACharacter.value) {
        ATHENACharacter.value.stopSpeakingAnimation()
      }
    }, 500) // Small delay to ensure audio completes
  }
}

const cleanupSpeechRecognition = () => {
  if (speechRecognition) {
    speechRecognition.abort()
    speechRecognition = null
  }
  isListening.value = false
  isSpeechProcessing.value = false
}

// UI helpers
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

const handleScroll = () => {
  // Could implement scroll-based features here
}

const toggleReasoning = (messageId) => {
  showReasoning.value[messageId] = !showReasoning.value[messageId]
}

const clearConversation = () => {
  if (confirm('Clear this conversation? This cannot be undone.')) {
    messages.value = []
    createNewThread()
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getConfidenceClass = (confidence) => {
  if (confidence > 0.8) return 'high-confidence'
  if (confidence > 0.6) return 'medium-confidence'
  return 'low-confidence'
}

const handleCharacterInitialized = () => {
  console.log('[EnhancedConversationInterface] ATHENA character initialized')
}

const handleEmotionChange = (emotion) => {
  console.log(`[EnhancedConversationInterface] ATHENA emotion changed to: ${emotion}`)
}

// Watchers
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

watch(isVoiceMode, (newMode) => {
  if (newMode) {
    initializeSpeechRecognition()
  } else {
    cleanupSpeechRecognition()
  }
})

// Lifecycle
onMounted(async () => {
  // Auto-connect WebSocket if enabled
  if (props.autoConnect) {
    await connectWebSocket()
  }

  // Initialize speech features if in voice mode
  if (isVoiceMode.value) {
    initializeSpeechRecognition()
  }

  // Load voices for speech synthesis - ensure Athena voice is ready
  if (supportsSpeechSynthesis.value) {
    window.speechSynthesis.getVoices() // This triggers voice loading

    // Wait for voices to load and log available options
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices()
      const britishVoices = voices.filter(voice =>
        voice.lang.includes('en-GB') || voice.lang.includes('en-UK')
        || voice.name.toLowerCase().includes('british') || voice.name.toLowerCase().includes('uk')
      )
      console.log('[Athena Voice] Available British voices:', britishVoices.map(v => `${v.name} (${v.lang})`))

      if (britishVoices.length === 0) {
        console.log('[Athena Voice] No British voices found. Available voices:', voices.slice(0, 5).map(v => `${v.name} (${v.lang})`))
      }
    }
  }
})

onUnmounted(() => {
  cleanupSpeechRecognition()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  disconnect()
})

// Expose methods
defineExpose({
  sendMessage,
  toggleConversationMode,
  clearConversation,
  connectWebSocket,
  createNewThread
})
</script>

<style scoped>
/* Minimal styles - component relies on Nuxt UI classes for styling */
.character-section.speaking {
  animation: speaking-pulse 2s ease-in-out infinite alternate;
}

@keyframes speaking-pulse {
  from { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  to { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
}

.voice-controls {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  background-color: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dark .voice-controls {
  background-color: #1f2937;
}

.voice-status {
  margin-bottom: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-indicator.ready {
  color: #4b5563;
}

.dark .status-indicator.ready {
  color: #9ca3af;
}

.status-indicator.listening {
  color: #2563eb;
}

.dark .status-indicator.listening {
  color: #60a5fa;
}

.status-indicator.processing {
  color: #d97706;
}

.dark .status-indicator.processing {
  color: #fbbf24;
}

.status-indicator.speaking {
  color: #00a155;
}

.dark .status-indicator.speaking {
  color: #00dc82;
}

.voice-buttons {
  display: flex;
  justify-content: center;
}

.voice-button {
  min-width: 8rem;
}

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.chat-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-section.full-height {
  height: 100%;
}

.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(to right, #eff6ff, #eef2ff);
}

.dark .conversation-header {
  border-bottom-color: #374151;
  background: linear-gradient(to right, #1f2937, #374151);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.mini-character {
  width: 100%;
  height: 100%;
}

.header-info h3 {
  font-weight: 600;
  color: #111827;
}

.dark .header-info h3 {
  color: white;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.dark .status-info {
  color: #9ca3af;
}

.status-indicator.connected {
  color: #00a155;
}

.dark .status-indicator.connected {
  color: #00dc82;
}

.status-indicator.disconnected {
  color: #dc2626;
}

.dark .status-indicator.disconnected {
  color: #f87171;
}

.response-time {
  color: #2563eb;
}

.dark .response-time {
  color: #60a5fa;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.welcome-section {
  text-align: center;
  padding: 3rem 0;
}

.welcome-content {
  max-width: 28rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.welcome-avatar {
  font-size: 2.25rem;
  margin-bottom: 1rem;
}

.welcome-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.dark .welcome-content h3 {
  color: white;
}

.welcome-content p {
  color: #4b5563;
}

.dark .welcome-content p {
  color: #9ca3af;
}

.conversation-starters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.voice-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #2563eb;
}

.dark .voice-tips {
  color: #60a5fa;
}

.message-wrapper {
  display: flex;
}

.message-wrapper.user-message {
  justify-content: flex-end;
}

.message-wrapper.ai-message {
  justify-content: flex-start;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 28rem;
}

.message-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.dark .message-avatar {
  background-color: #1e3a8a;
}

.message-bubble {
  border-radius: 1rem;
  padding: 0.5rem 1rem;
}

.message-bubble.user {
  background-color: #3b82f6;
  color: white;
}

.message-bubble.assistant {
  background-color: #f3f4f6;
  color: #111827;
}

.dark .message-bubble.assistant {
  background-color: #1f2937;
  color: white;
}

.reasoning-section {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background-color: #eff6ff;
  border-radius: 0.5rem;
  border: 1px solid #bfdbfe;
}

.dark .reasoning-section {
  background-color: rgba(30, 58, 138, 0.2);
  border-color: #1e40af;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1d4ed8;
  margin-bottom: 0.5rem;
}

.dark .reasoning-header {
  color: #93c5fd;
}

.reasoning-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reasoning-step {
  display: flex;
  gap: 0.5rem;
}

.step-number {
  width: 1.25rem;
  height: 1.25rem;
  background-color: #2563eb;
  color: white;
  font-size: 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-description {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
}

.dark .step-description {
  color: #bfdbfe;
}

.step-thinking {
  font-size: 0.75rem;
  color: #2563eb;
  margin-top: 0.25rem;
}

.dark .step-thinking {
  color: #60a5fa;
}

.message-text {
  font-size: 0.875rem;
  line-height: 1.625;
  white-space: pre-wrap;
}

.message-metadata {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.7;
}

.metadata-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metadata-button {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.metadata-button:hover {
  text-decoration: underline;
}

.confidence-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.confidence-indicator.high-confidence {
  background-color: #dcfce7;
  color: #166534;
}

.dark .confidence-indicator.high-confidence {
  background-color: rgba(20, 83, 45, 0.2);
  color: #86efac;
}

.confidence-indicator.medium-confidence {
  background-color: #fef3c7;
  color: #92400e;
}

.dark .confidence-indicator.medium-confidence {
  background-color: rgba(146, 64, 14, 0.2);
  color: #fcd34d;
}

.confidence-indicator.low-confidence {
  background-color: #fee2e2;
  color: #991b1b;
}

.dark .confidence-indicator.low-confidence {
  background-color: rgba(153, 27, 27, 0.2);
  color: #fca5a5;
}

.thinking-indicator {
  display: flex;
  justify-content: flex-start;
}

.thinking-bubble {
  background-color: #f3f4f6;
  color: #111827;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark .thinking-bubble {
  background-color: #1f2937;
  color: white;
}

.thinking-dots {
  display: flex;
  gap: 0.25rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  background-color: #9ca3af;
  border-radius: 50%;
  animation: bounce 1s infinite;
}

.dot:nth-child(1) { animation-delay: 0ms; }
.dot:nth-child(2) { animation-delay: 150ms; }
.dot:nth-child(3) { animation-delay: 300ms; }

.input-section {
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dark .input-section {
  border-top-color: #374151;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.send-button {
  flex-shrink: 0;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.performance-indicator {
  font-size: 0.75rem;
  color: #6b7280;
}

.dark .performance-indicator {
  color: #9ca3af;
}

/* Scrollbar styling */
.messages-area::-webkit-scrollbar {
  width: 0.25rem;
}

.messages-area::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

.dark .messages-area::-webkit-scrollbar-track {
  background-color: #1f2937;
}

.messages-area::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 9999px;
}

.dark .messages-area::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

.dark .messages-area::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}

/* Responsive design */
@media (max-width: 768px) {
  .conversation-interface.voice-mode {
    flex-direction: column;
  }

  .character-section.voice-active {
    width: 100%;
    height: 16rem;
  }

  .message-content {
    max-width: 20rem;
  }
}
</style>
