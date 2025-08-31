<template>
  <div class="ai-settings">
    <!-- AI Model Configuration -->
    <div class="settings-group">
      <h3 class="group-title">
        AI Model
      </h3>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Language Model</span>
          <span class="label-description">Choose the AI model for conversations</span>
        </div>
        <select
          v-model="settings.ai.provider"
          class="setting-select"
          @change="handleProviderChange"
        >
          <option value="ollama">
            Ollama (Local Models)
          </option>
          <option value="openai">
            OpenAI (GPT Models)
          </option>
          <option value="claude">
            Claude (Anthropic)
          </option>
          <option value="gemini">
            Gemini (Google)
          </option>
        </select>
      </div>

      <!-- Provider-specific settings -->
      <div
        v-if="settings.ai.provider === 'ollama'"
        class="provider-settings"
      >
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">Ollama Model</span>
            <span class="label-description">Select from locally available models</span>
          </div>
          <div class="model-selector-container">
            <select
              v-model="settings.ollama.model"
              class="setting-select"
              :disabled="!ollamaModels.length"
            >
              <option
                v-for="model in ollamaModels"
                :key="model.name"
                :value="model.name"
              >
                {{ model.name }} ({{ formatSize(model.size) }})
              </option>
            </select>
            <button
              class="refresh-models-btn"
              :disabled="isRefreshingModels"
              @click="refreshOllamaModels"
            >
              <Icon
                name="heroicons:arrow-path"
                :class="{ 'animate-spin': isRefreshingModels }"
              />
            </button>
          </div>
          <small
            v-if="!ollamaModels.length"
            class="warning-text"
          >
            No models found. Make sure Ollama is running and has models installed.
          </small>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">Ollama URL</span>
            <span class="label-description">Local Ollama server endpoint</span>
          </div>
          <div class="url-input-container">
            <input
              v-model="settings.ollama.url"
              type="text"
              placeholder="http://localhost:11434"
              class="setting-input"
            >
            <button
              class="test-connection-btn"
              :disabled="isTestingConnection"
              @click="testOllamaConnection"
            >
              <Icon
                name="heroicons:bolt"
                :class="{ 'animate-pulse': isTestingConnection }"
              />
              Test
            </button>
          </div>
          <div
            v-if="connectionStatus"
            class="connection-status"
            :class="connectionStatus.type"
          >
            <Icon :name="connectionStatus.icon" />
            {{ connectionStatus.message }}
          </div>
        </div>
      </div>

      <div
        v-else-if="settings.ai.provider === 'openai'"
        class="provider-settings"
      >
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">OpenAI Model</span>
            <span class="label-description">Choose GPT model variant</span>
          </div>
          <select
            v-model="settings.openai.model"
            class="setting-select"
          >
            <option value="gpt-4o">
              GPT-4o (Latest)
            </option>
            <option value="gpt-4-turbo">
              GPT-4 Turbo
            </option>
            <option value="gpt-4">
              GPT-4
            </option>
            <option value="gpt-3.5-turbo">
              GPT-3.5 Turbo
            </option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">API Key</span>
            <span class="label-description">Your OpenAI API key</span>
          </div>
          <div class="api-key-container">
            <input
              v-model="settings.openai.apiKey"
              :type="showOpenAIKey ? 'text' : 'password'"
              placeholder="sk-..."
              class="setting-input"
            >
            <button
              class="reveal-btn"
              @click="showOpenAIKey = !showOpenAIKey"
            >
              <Icon :name="showOpenAIKey ? 'heroicons:eye-slash' : 'heroicons:eye'" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="settings.ai.provider === 'claude'"
        class="provider-settings"
      >
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">Claude Model</span>
            <span class="label-description">Select Claude model version</span>
          </div>
          <select
            v-model="settings.claude.model"
            class="setting-select"
          >
            <option value="claude-3-5-sonnet-20241022">
              Claude 3.5 Sonnet (Latest)
            </option>
            <option value="claude-3-opus-20240229">
              Claude 3 Opus
            </option>
            <option value="claude-3-sonnet-20240229">
              Claude 3 Sonnet
            </option>
            <option value="claude-3-haiku-20240307">
              Claude 3 Haiku
            </option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">API Key</span>
            <span class="label-description">Your Anthropic API key</span>
          </div>
          <div class="api-key-container">
            <input
              v-model="settings.claude.apiKey"
              :type="showClaudeKey ? 'text' : 'password'"
              placeholder="sk-ant-..."
              class="setting-input"
            >
            <button
              class="reveal-btn"
              @click="showClaudeKey = !showClaudeKey"
            >
              <Icon :name="showClaudeKey ? 'heroicons:eye-slash' : 'heroicons:eye'" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="settings.ai.provider === 'gemini'"
        class="provider-settings"
      >
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">Gemini Model</span>
            <span class="label-description">Choose Gemini model</span>
          </div>
          <select
            v-model="settings.gemini.model"
            class="setting-select"
          >
            <option value="gemini-pro">
              Gemini Pro
            </option>
            <option value="gemini-pro-vision">
              Gemini Pro Vision
            </option>
          </select>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">API Key</span>
            <span class="label-description">Your Google AI API key</span>
          </div>
          <div class="api-key-container">
            <input
              v-model="settings.gemini.apiKey"
              :type="showGeminiKey ? 'text' : 'password'"
              placeholder="AIza..."
              class="setting-input"
            >
            <button
              class="reveal-btn"
              @click="showGeminiKey = !showGeminiKey"
            >
              <Icon :name="showGeminiKey ? 'heroicons:eye-slash' : 'heroicons:eye'" />
            </button>
          </div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Response Temperature</span>
          <span class="label-description">Controls creativity vs consistency (0-1)</span>
        </div>
        <div class="slider-container">
          <input
            :value="getCurrentTemperature()"
            type="range"
            min="0"
            max="1"
            step="0.1"
            class="setting-slider"
            @input="updateTemperature"
          >
          <span class="slider-value">{{ getCurrentTemperature() }}</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Max Response Length</span>
          <span class="label-description">Maximum tokens in responses</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.ai.maxTokens"
            type="range"
            min="256"
            max="4096"
            step="256"
            class="setting-slider"
          >
          <span class="slider-value">{{ settings.ai.maxTokens }}</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Stream Responses</span>
          <span class="label-description">Show responses as they're generated</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.streamResponses"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <!-- Personality & Behavior -->
    <div class="settings-group">
      <h3 class="group-title">
        Personality & Behavior
      </h3>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Personality Mode</span>
          <span class="label-description">How ATHENA interacts with you</span>
        </div>
        <div class="radio-group">
          <label class="radio-option">
            <input
              v-model="settings.ai.personalityMode"
              type="radio"
              value="professional"
            >
            <span class="radio-label">
              <Icon name="heroicons:briefcase" />
              Professional
            </span>
          </label>
          <label class="radio-option">
            <input
              v-model="settings.ai.personalityMode"
              type="radio"
              value="friendly"
            >
            <span class="radio-label">
              <Icon name="heroicons:face-smile" />
              Friendly
            </span>
          </label>
          <label class="radio-option">
            <input
              v-model="settings.ai.personalityMode"
              type="radio"
              value="casual"
            >
            <span class="radio-label">
              <Icon name="heroicons:chat-bubble-left" />
              Casual
            </span>
          </label>
          <label class="radio-option">
            <input
              v-model="settings.ai.personalityMode"
              type="radio"
              value="mentor"
            >
            <span class="radio-label">
              <Icon name="heroicons:academic-cap" />
              Mentor
            </span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Proactive Assistance</span>
          <span class="label-description">ATHENA suggests actions based on context</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.proactiveAssistance"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Context Memory</span>
          <span class="label-description">Remember conversation history</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.contextMemory"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Learning Enabled</span>
          <span class="label-description">Learn from your preferences over time</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.learningEnabled"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <!-- Voice Settings -->
    <div class="settings-group">
      <h3 class="group-title">
        Voice & Speech
      </h3>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Voice Enabled</span>
          <span class="label-description">Enable voice interactions</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.voiceEnabled"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div
        v-if="settings.ai.voiceEnabled"
        class="setting-item"
      >
        <div class="setting-label">
          <span class="label-text">Voice Model</span>
          <span class="label-description">Text-to-speech voice selection</span>
        </div>
        <select
          v-model="settings.ai.voiceModel"
          class="setting-select"
        >
          <option value="natural">
            Natural (Default)
          </option>
          <option value="nova">
            Nova (Energetic)
          </option>
          <option value="alloy">
            Alloy (Professional)
          </option>
          <option value="echo">
            Echo (Warm)
          </option>
          <option value="fable">
            Fable (British)
          </option>
          <option value="onyx">
            Onyx (Deep)
          </option>
          <option value="shimmer">
            Shimmer (Soft)
          </option>
        </select>
      </div>

      <div
        v-if="settings.ai.voiceEnabled"
        class="setting-item"
      >
        <div class="setting-label">
          <span class="label-text">Whisper Mode</span>
          <span class="label-description">Lower volume for quiet environments</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.whisperMode"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div
        v-if="settings.ai.voiceEnabled"
        class="setting-item"
      >
        <div class="setting-label">
          <span class="label-text">Wake Word</span>
          <span class="label-description">Activate with "Hey ATHENA"</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.ai.wakeWord"
            type="checkbox"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <!-- Advanced AI Settings -->
    <div class="settings-group">
      <h3 class="group-title">
        Advanced
      </h3>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Custom Instructions</span>
          <span class="label-description">Additional context for all interactions</span>
        </div>
        <textarea
          v-model="settings.ai.customInstructions"
          placeholder="E.g., 'Always explain code in simple terms' or 'Focus on Python solutions'"
          class="setting-textarea"
          rows="3"
        />
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">API Endpoint</span>
          <span class="label-description">Custom API endpoint (advanced users)</span>
        </div>
        <input
          v-model="settings.ai.apiEndpoint"
          type="text"
          placeholder="https://api.openai.com/v1"
          class="setting-input"
        >
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">API Key</span>
          <span class="label-description">Your API key (stored securely)</span>
        </div>
        <div class="input-with-button">
          <input
            v-model="settings.ai.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="sk-..."
            class="setting-input"
          >
          <button
            class="reveal-btn"
            @click="showApiKey = !showApiKey"
          >
            <Icon :name="showApiKey ? 'heroicons:eye-slash' : 'heroicons:eye'" />
          </button>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="settings-actions">
      <button
        class="action-btn secondary"
        @click="testConnection"
      >
        <Icon name="heroicons:bolt" />
        Test Connection
      </button>
      <button
        class="action-btn secondary"
        @click="clearMemory"
      >
        <Icon name="heroicons:trash" />
        Clear Memory
      </button>
      <button
        class="action-btn primary"
        @click="exportSettings"
      >
        <Icon name="heroicons:arrow-down-tray" />
        Export Settings
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOllamaAPI } from '~/composables/useOllamaAPI'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

const settings = ref(props.modelValue)
const showApiKey = ref(false)
const showOpenAIKey = ref(false)
const showClaudeKey = ref(false)
const showGeminiKey = ref(false)
const isRefreshingModels = ref(false)
const isTestingConnection = ref(false)
const connectionStatus = ref<{ type: string, icon: string, message: string } | null>(null)

// Ollama integration
const {
  isConnected,
  availableModels,
  checkOllamaConnection,
  loadAvailableModels,
  initialize: initializeOllama
} = useOllamaAPI()

const ollamaModels = computed(() => availableModels.value || [])

// Provider management
const handleProviderChange = () => {
  connectionStatus.value = null
  if (settings.value.ai.provider === 'ollama') {
    refreshOllamaModels()
  }
  emit('update', settings.value)
}

// Ollama methods
const refreshOllamaModels = async () => {
  isRefreshingModels.value = true
  try {
    await loadAvailableModels()
    if (ollamaModels.value.length > 0 && !settings.value.ollama?.model) {
      settings.value.ollama = {
        ...settings.value.ollama,
        model: ollamaModels.value[0].name
      }
    }
  } catch (error) {
    console.error('Failed to refresh Ollama models:', error)
  } finally {
    isRefreshingModels.value = false
  }
}

const testOllamaConnection = async () => {
  isTestingConnection.value = true
  connectionStatus.value = null

  try {
    const connected = await checkOllamaConnection()
    if (connected) {
      connectionStatus.value = {
        type: 'success',
        icon: 'heroicons:check-circle',
        message: 'Connection successful'
      }
      await refreshOllamaModels()
    } else {
      connectionStatus.value = {
        type: 'error',
        icon: 'heroicons:x-circle',
        message: 'Failed to connect to Ollama'
      }
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      icon: 'heroicons:x-circle',
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Temperature management per provider
const getCurrentTemperature = () => {
  const provider = settings.value.ai.provider
  switch (provider) {
    case 'ollama':
      return settings.value.ollama?.temperature ?? 0.7
    case 'openai':
      return settings.value.openai?.temperature ?? 0.7
    case 'claude':
      return settings.value.claude?.temperature ?? 0.7
    case 'gemini':
      return settings.value.gemini?.temperature ?? 0.7
    default:
      return 0.7
  }
}

const updateTemperature = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  const provider = settings.value.ai.provider

  if (!settings.value[provider]) {
    settings.value[provider] = {}
  }

  settings.value[provider].temperature = value
  emit('update', settings.value)
}

// Utility functions
const formatSize = (bytes: number): string => {
  if (!bytes) return 'Unknown'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

// Methods
const testConnection = async () => {
  const provider = settings.value.ai.provider
  switch (provider) {
    case 'ollama':
      await testOllamaConnection()
      break
    default:
      console.log(`Testing ${provider} connection...`)
      // Implement other provider tests
  }
}

const clearMemory = () => {
  if (confirm('Clear all conversation memory and learned preferences?')) {
    console.log('Clearing AI memory...')
    // Clear memory
  }
}

const exportSettings = () => {
  const data = JSON.stringify(settings.value.ai, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'athena-ai-settings.json'
  a.click()
}

// Initialize
onMounted(async () => {
  if (settings.value.ai.provider === 'ollama') {
    await initializeOllama()
    await refreshOllamaModels()
  }
})
</script>

<style scoped>
.ai-settings {
  padding: 20px 0;
}

.settings-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  margin-right: 24px;
}

.label-text {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.label-description {
  display: block;
  font-size: 13px;
  color: #6b7280;
}

/* Form Controls */
.setting-select,
.setting-input,
.setting-textarea {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  background: white;
}

.setting-select {
  min-width: 200px;
  cursor: pointer;
}

.setting-input {
  min-width: 300px;
}

.setting-textarea {
  width: 100%;
  margin-top: 12px;
  resize: vertical;
}

.setting-select:focus,
.setting-input:focus,
.setting-textarea:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background: linear-gradient(135deg, #4a90e2, #357abd);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Slider */
.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 250px;
}

.setting-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  cursor: pointer;
}

.slider-value {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  color: #4a90e2;
}

/* Radio Group */
.radio-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
  width: 100%;
}

.radio-option {
  position: relative;
  cursor: pointer;
}

.radio-option input {
  position: absolute;
  opacity: 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.2s ease;
  background: white;
}

.radio-option input:checked + .radio-label {
  border-color: #4a90e2;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(53, 122, 189, 0.1));
}

/* Input with Button */
.input-with-button {
  display: flex;
  gap: 8px;
}

.reveal-btn {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reveal-btn:hover {
  background: #f9fafb;
  color: #4a90e2;
}

/* Actions */
.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
}

.action-btn.secondary {
  background: white;
  color: #666;
  border: 1px solid #e5e7eb;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
