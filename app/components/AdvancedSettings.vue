<template>
  <div
    class="advanced-settings"
    :class="{ 'dark-mode': settings.appearance.darkMode }"
  >
    <!-- Header with Search -->
    <div class="settings-header">
      <button
        v-if="currentPath.length > 0"
        class="back-btn"
        @click="handleBack"
      >
        <Icon name="heroicons:arrow-left" />
      </button>
      <h2 class="settings-title">
        {{ currentTitle }}
      </h2>
    </div>

    <!-- Search Bar -->
    <div
      v-if="currentPath.length === 0"
      class="search-container"
    >
      <Icon
        name="heroicons:magnifying-glass"
        class="search-icon"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search settings"
        class="search-input"
        @input="handleSearch"
      >
      <button
        v-if="searchQuery"
        class="clear-search"
        @click="searchQuery = ''"
      >
        <Icon name="heroicons:x-circle" />
      </button>
    </div>

    <!-- Quick Actions -->
    <div
      v-if="currentPath.length === 0 && !searchQuery"
      class="quick-actions"
    >
      <button
        v-for="action in quickActions"
        :key="action.id"
        class="quick-action-btn"
        :class="{ active: action.active }"
        @click="executeQuickAction(action)"
      >
        <Icon :name="action.icon" />
        <span>{{ action.label }}</span>
      </button>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- Search Results -->
      <div
        v-if="searchResults.length > 0 && searchQuery"
        class="search-results"
      >
        <div class="section-label">
          Search Results
        </div>
        <div
          v-for="result in searchResults"
          :key="result.path"
          class="settings-item"
          @click="navigateToSetting(result.path)"
        >
          <div class="item-icon">
            <Icon :name="result.icon" />
          </div>
          <div class="item-content">
            <div class="item-title">
              {{ result.title }}
            </div>
            <div class="item-subtitle">
              {{ result.category }}
            </div>
          </div>
          <Icon
            name="heroicons:chevron-right"
            class="item-arrow"
          />
        </div>
      </div>

      <!-- Main Categories -->
      <div
        v-else-if="currentPath.length === 0"
        class="settings-categories"
      >
        <div
          v-for="category in settingsCategories"
          :key="category.id"
          class="category-section"
        >
          <div class="section-label">
            {{ category.label }}
          </div>
          <div
            v-for="item in category.items"
            :key="item.id"
            class="settings-item"
            @click="navigateTo(item)"
          >
            <div
              class="item-icon"
              :style="{ background: item.color }"
            >
              <Icon :name="item.icon" />
            </div>
            <div class="item-content">
              <div class="item-title">
                {{ item.title }}
              </div>
              <div class="item-subtitle">
                {{ item.subtitle }}
              </div>
            </div>
            <Icon
              name="heroicons:chevron-right"
              class="item-arrow"
            />
          </div>
        </div>
      </div>

      <!-- Sub-settings -->
      <div
        v-else
        class="sub-settings"
      >
        <component
          :is="currentComponent"
          v-model="settings"
          @navigate="navigateTo"
          @update="updateSetting"
        />
      </div>
    </div>

    <!-- Footer Actions -->
    <div
      v-if="hasChanges"
      class="settings-footer"
    >
      <button
        class="btn-secondary"
        @click="resetSettings"
      >
        Reset to Defaults
      </button>
      <button
        class="btn-primary"
        @click="saveSettings"
      >
        Save Changes
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, shallowRef, type Component } from 'vue'
import GeneralSettings from './settings/GeneralSettings.vue'
import AISettings from './settings/AISettings.vue'
import AppearanceSettings from './settings/AppearanceSettings.vue'
import PrivacySettings from './settings/PrivacySettings.vue'
import NotificationSettings from './settings/NotificationSettings.vue'
import AccessibilitySettings from './settings/AccessibilitySettings.vue'
import DeveloperSettings from './settings/DeveloperSettings.vue'
import GridSettings from './settings/GridSettings.vue'
import AboutSettings from './settings/AboutSettings.vue'

const emit = defineEmits(['update'])

// Settings state
const settings = ref({
  general: {
    language: 'en',
    timezone: 'auto',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    startupBehavior: 'last-state',
    autoSave: true,
    autoSaveInterval: 30
  },
  ai: {
    provider: 'ollama',
    temperature: 0.7,
    maxTokens: 2048,
    streamResponses: true,
    contextMemory: true,
    personalityMode: 'professional',
    voiceEnabled: true,
    voiceModel: 'natural',
    whisperMode: false,
    wakeWord: false,
    proactiveAssistance: true,
    learningEnabled: true,
    customInstructions: '',
    apiEndpoint: '',
    apiKey: ''
  },
  // Provider-specific configurations
  ollama: {
    model: 'llama2',
    url: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 2048,
    stream: true
  },
  openai: {
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    stream: true
  },
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048
  },
  gemini: {
    model: 'gemini-pro',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048
  },
  appearance: {
    theme: 'system',
    darkMode: false,
    accentColor: '#4a90e2',
    fontSize: 'medium',
    fontFamily: 'system',
    animations: true,
    animationSpeed: 'normal',
    compactMode: false,
    showTooltips: true,
    iconPack: 'heroicons'
  },
  privacy: {
    telemetry: false,
    crashReports: true,
    usageAnalytics: false,
    shareData: false,
    localProcessing: true,
    encryptStorage: true,
    clearOnExit: false,
    cookiePolicy: 'essential'
  },
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    desktop: true,
    aiAlerts: true,
    systemAlerts: true,
    updateAlerts: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  },
  accessibility: {
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    keyboardNavigation: true,
    focusIndicators: true,
    largeText: false,
    colorBlindMode: 'none',
    audioDescriptions: false,
    captions: true
  },
  developer: {
    debugMode: false,
    verboseLogging: false,
    showPerformance: false,
    experimentalFeatures: false,
    betaChannel: false,
    apiEndpoint: 'production',
    customHeaders: {},
    proxyEnabled: false,
    cacheStrategy: 'normal'
  },
  integrations: {
    github: { enabled: false, token: '', scope: 'repo' },
    gitlab: { enabled: false, token: '', url: '' },
    slack: { enabled: false, webhook: '' },
    discord: { enabled: false, webhook: '' },
    notion: { enabled: false, apiKey: '' },
    jira: { enabled: false, url: '', email: '', token: '' }
  },
  shortcuts: {
    toggleAI: 'Alt+A',
    openSettings: 'Ctrl+,',
    quickSearch: 'Ctrl+K',
    voiceInput: 'Alt+V',
    minimize: 'Alt+M',
    chatMode: 'Alt+C',
    commandPalette: 'Ctrl+Shift+P'
  },
  workspace: {
    defaultProject: '',
    autoOpenProjects: true,
    projectHistory: [],
    recentFiles: [],
    backupEnabled: true,
    backupInterval: 300,
    backupLocation: 'local',
    syncEnabled: false
  },
  security: {
    requireAuth: false,
    biometric: false,
    autoLock: false,
    lockTimeout: 15,
    encryptionLevel: 'standard',
    trustedDevices: [],
    twoFactor: false
  },
  performance: {
    gpuAcceleration: true,
    memoryLimit: 'auto',
    cacheSize: 100,
    preloadModels: true,
    lazyLoading: true,
    backgroundTasks: true,
    workerThreads: 4
  }
})

// Navigation state
const currentPath = ref<string[]>([])
const searchQuery = ref('')
const searchResults = ref<Array<{ id: string, title: string, subtitle: string, category: string, path: string }>>([])
const hasChanges = ref(false)

// Component mapping
const componentMap: Record<string, Component> = {
  general: GeneralSettings,
  ai: AISettings,
  appearance: AppearanceSettings,
  privacy: PrivacySettings,
  notifications: NotificationSettings,
  accessibility: AccessibilitySettings,
  developer: DeveloperSettings,
  grid: GridSettings,
  about: AboutSettings
}

const currentComponent = shallowRef<Component | null>(null)

// Quick actions
const quickActions = ref([
  { id: 'dark', label: 'Dark Mode', icon: 'heroicons:moon', active: false },
  { id: 'voice', label: 'Voice', icon: 'heroicons:microphone', active: true },
  { id: 'notify', label: 'Notifications', icon: 'heroicons:bell', active: true },
  { id: 'sync', label: 'Sync', icon: 'heroicons:cloud', active: false }
])

// Settings categories
const settingsCategories = computed(() => [
  {
    id: 'athena',
    label: 'ATHENA AI',
    items: [
      {
        id: 'ai',
        title: 'AI & Intelligence',
        subtitle: 'Model, personality, learning',
        icon: 'heroicons:cpu-chip',
        color: 'linear-gradient(135deg, #667eea, #764ba2)'
      },
      {
        id: 'voice',
        title: 'Voice & Speech',
        subtitle: 'Voice recognition, TTS settings',
        icon: 'heroicons:speaker-wave',
        color: 'linear-gradient(135deg, #f093fb, #f5576c)'
      },
      {
        id: 'behavior',
        title: 'Behavior & Responses',
        subtitle: 'How ATHENA interacts with you',
        icon: 'heroicons:chat-bubble-left-right',
        color: 'linear-gradient(135deg, #4facfe, #00f2fe)'
      }
    ]
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'general',
        title: 'General',
        subtitle: 'Language, region, startup',
        icon: 'heroicons:cog-6-tooth',
        color: 'linear-gradient(135deg, #43e97b, #38f9d7)'
      },
      {
        id: 'appearance',
        title: 'Appearance',
        subtitle: 'Theme, colors, animations',
        icon: 'heroicons:paint-brush',
        color: 'linear-gradient(135deg, #fa709a, #fee140)'
      },
      {
        id: 'notifications',
        title: 'Notifications',
        subtitle: 'Alerts, sounds, quiet hours',
        icon: 'heroicons:bell',
        color: 'linear-gradient(135deg, #30cfd0, #330867)'
      }
    ]
  },
  {
    id: 'productivity',
    label: 'Productivity',
    items: [
      {
        id: 'workspace',
        title: 'Workspace',
        subtitle: 'Projects, files, backups',
        icon: 'heroicons:folder-open',
        color: 'linear-gradient(135deg, #a8edea, #fed6e3)'
      },
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        subtitle: 'Customize key bindings',
        icon: 'heroicons:command-line',
        color: 'linear-gradient(135deg, #ffecd2, #fcb69f)'
      },
      {
        id: 'integrations',
        title: 'Integrations',
        subtitle: 'GitHub, Slack, and more',
        icon: 'heroicons:puzzle-piece',
        color: 'linear-gradient(135deg, #ff9a9e, #fecfef)'
      }
    ]
  },
  {
    id: 'privacy-security',
    label: 'Privacy & Security',
    items: [
      {
        id: 'privacy',
        title: 'Privacy',
        subtitle: 'Data, telemetry, cookies',
        icon: 'heroicons:shield-check',
        color: 'linear-gradient(135deg, #6a11cb, #2575fc)'
      },
      {
        id: 'security',
        title: 'Security',
        subtitle: 'Authentication, encryption',
        icon: 'heroicons:lock-closed',
        color: 'linear-gradient(135deg, #f43b47, #453a94)'
      },
      {
        id: 'data',
        title: 'Data Management',
        subtitle: 'Storage, export, deletion',
        icon: 'heroicons:server',
        color: 'linear-gradient(135deg, #0ba360, #3cba92)'
      }
    ]
  },
  {
    id: 'advanced',
    label: 'Advanced',
    items: [
      {
        id: 'accessibility',
        title: 'Accessibility',
        subtitle: 'Screen reader, contrast, motion',
        icon: 'heroicons:eye',
        color: 'linear-gradient(135deg, #7028e4, #e5b2ca)'
      },
      {
        id: 'performance',
        title: 'Performance',
        subtitle: 'GPU, memory, caching',
        icon: 'heroicons:bolt',
        color: 'linear-gradient(135deg, #13547a, #80d0c7)'
      },
      {
        id: 'developer',
        title: 'Developer Options',
        subtitle: 'Debug, logs, experimental',
        icon: 'heroicons:code-bracket',
        color: 'linear-gradient(135deg, #505285, #585e92)'
      }
    ]
  },
  {
    id: 'about',
    label: 'About',
    items: [
      {
        id: 'about',
        title: 'About ATHENA',
        subtitle: 'Version, updates, licenses',
        icon: 'heroicons:information-circle',
        color: 'linear-gradient(135deg, #8e2de2, #4a00e0)'
      },
      {
        id: 'help',
        title: 'Help & Support',
        subtitle: 'Documentation, contact',
        icon: 'heroicons:question-mark-circle',
        color: 'linear-gradient(135deg, #ee0979, #ff6a00)'
      }
    ]
  }
])

// Computed
const currentTitle = computed(() => {
  if (currentPath.value.length === 0) return 'Settings'
  return currentPath.value[currentPath.value.length - 1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})

// Methods
const navigateTo = (item: { id: string }) => {
  currentPath.value.push(item.id)
  currentComponent.value = componentMap[item.id] || null
}

const navigateToSetting = (path: string) => {
  const parts = path.split('.')
  currentPath.value = parts
  currentComponent.value = componentMap[parts[0]] || null
}

const handleBack = () => {
  currentPath.value.pop()
  if (currentPath.value.length === 0) {
    currentComponent.value = null
  }
}

const handleSearch = () => {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }

  // Search through all settings
  const results: Array<{ id: string, title: string, subtitle: string, category: string, path: string }> = []
  const query = searchQuery.value.toLowerCase()

  // Search in each category
  settingsCategories.value.forEach((category) => {
    category.items.forEach((item) => {
      if (
        item.title.toLowerCase().includes(query)
        || item.subtitle.toLowerCase().includes(query)
      ) {
        results.push({
          ...item,
          category: category.label,
          path: item.id
        })
      }
    })
  })

  searchResults.value = results
}

const executeQuickAction = (action: { id: string, active: boolean }) => {
  switch (action.id) {
    case 'dark':
      settings.value.appearance.darkMode = !settings.value.appearance.darkMode
      action.active = settings.value.appearance.darkMode
      break
    case 'voice':
      settings.value.ai.voiceEnabled = !settings.value.ai.voiceEnabled
      action.active = settings.value.ai.voiceEnabled
      break
    case 'notify':
      settings.value.notifications.enabled = !settings.value.notifications.enabled
      action.active = settings.value.notifications.enabled
      break
    case 'sync':
      settings.value.workspace.syncEnabled = !settings.value.workspace.syncEnabled
      action.active = settings.value.workspace.syncEnabled
      break
  }
  hasChanges.value = true
}

const updateSetting = (path: string, value: unknown) => {
  const keys = path.split('.')
  let obj = settings.value as Record<string, unknown>
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]]
  }
  obj[keys[keys.length - 1]] = value
  hasChanges.value = true
}

const saveSettings = () => {
  // Save to localStorage or API
  localStorage.setItem('athena-settings', JSON.stringify(settings.value))
  emit('update', settings.value)
  hasChanges.value = false

  // Show success notification
  console.log('Settings saved successfully')
}

const resetSettings = () => {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    // Reset to defaults
    location.reload()
  }
}

// Watch for changes
watch(settings, () => {
  hasChanges.value = true
}, { deep: true })

// Load saved settings on mount
const loadSettings = () => {
  const saved = localStorage.getItem('athena-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings.value, parsed)
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }
}

// Initialize
loadSettings()

// Expose settings for parent component
defineExpose({
  settings,
  saveSettings
})
</script>

<style scoped>
.advanced-settings {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.advanced-settings.dark-mode {
  background: #1a1a1a;
  color: white;
}

/* Header */
.settings-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.dark-mode .settings-header {
  background: #1a1a1a;
  border-bottom-color: #333;
}

.back-btn, .close-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.back-btn:hover, .close-btn:hover {
  background: #f3f4f6;
}

.dark-mode .back-btn:hover, .dark-mode .close-btn:hover {
  background: #333;
}

.settings-title {
  flex: 1;
  margin: 0 16px;
  font-size: 20px;
  font-weight: 600;
}

/* Search */
.search-container {
  padding: 16px 20px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  font-size: 15px;
  transition: all 0.2s ease;
  background: #f9fafb;
}

.dark-mode .search-input {
  background: #2a2a2a;
  border-color: #444;
  color: white;
}

.search-input:focus {
  border-color: #4a90e2;
  background: white;
}

.dark-mode .search-input:focus {
  background: #333;
}

.search-icon {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.clear-search {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
}

/* Quick Actions */
.quick-actions {
  padding: 16px 20px;
  display: flex;
  gap: 12px;
}

.quick-action-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dark-mode .quick-action-btn {
  background: #2a2a2a;
  border-color: #444;
}

.quick-action-btn:hover {
  background: #f9fafb;
  transform: translateY(-2px);
}

.quick-action-btn.active {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
  border-color: transparent;
}

.quick-action-btn span {
  font-size: 12px;
  font-weight: 500;
}

/* Content */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 20px 0 12px;
}

.dark-mode .section-label {
  color: #9ca3af;
}

/* Settings Items */
.settings-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 8px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
}

.dark-mode .settings-item {
  background: #2a2a2a;
  border-color: #444;
}

.settings-item:hover {
  background: #f9fafb;
  transform: translateX(4px);
}

.dark-mode .settings-item:hover {
  background: #333;
}

.item-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  margin-right: 16px;
}

.item-content {
  flex: 1;
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.item-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.dark-mode .item-subtitle {
  color: #9ca3af;
}

.item-arrow {
  color: #9ca3af;
  font-size: 20px;
}

/* Sub-settings */
.sub-settings {
  padding: 20px 0;
}

/* Footer */
.settings-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: white;
}

.dark-mode .settings-footer {
  background: #1a1a1a;
  border-top-color: #333;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.btn-secondary {
  background: transparent;
  color: #666;
  border: 1px solid #e5e7eb;
}

.dark-mode .btn-secondary {
  color: #9ca3af;
  border-color: #444;
}

.btn-secondary:hover {
  background: #f9fafb;
}

.dark-mode .btn-secondary:hover {
  background: #333;
}

/* Scrollbar */
.settings-content::-webkit-scrollbar {
  width: 8px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.dark-mode .settings-content::-webkit-scrollbar-thumb {
  background: #4b5563;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.settings-categories,
.search-results,
.sub-settings {
  animation: slideIn 0.3s ease;
}
</style>
