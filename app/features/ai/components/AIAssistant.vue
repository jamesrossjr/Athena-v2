<!--
  Universal AI Assistant Overlay Component

  Embeddable AI assistant that works with any existing Nuxt application
  Uses .client.vue suffix to prevent SSR hydration issues
-->

<template>
  <!-- AI Assistant Overlay -->
  <teleport to="body">
    <div
      v-if="aiState.isOpen"
      class="ai-assistant-overlay"
      :class="[`dock-${dockMode}`]"
      @click="handleOverlayClick"
    >
      <!-- AI Assistant Modal -->
      <div
        class="ai-assistant-modal"
        :class="[`modal-${dockMode}`]"
        @click.stop
      >
        <!-- Header -->
        <div class="ai-assistant-header">
          <div class="ai-assistant-title">
            <span class="ai-icon">🤖</span>
            <h3>AI Assistant</h3>
            <span
              v-if="aiState.isLoading"
              class="loading-indicator"
            >
              <span class="loading-dots">
                <span />
                <span />
                <span />
              </span>
            </span>
          </div>
          <div class="ai-header-controls">
            <button
              class="ai-dock-button"
              :title="`Switch to ${dockMode === 'center' ? 'right' : dockMode === 'right' ? 'left' : 'center'} position`"
              @click="toggleDockMode"
            >
              <span v-if="dockMode === 'center'">⊞</span>
              <span v-else-if="dockMode === 'right'">⊟</span>
              <span v-else>⊡</span>
            </button>
            <button
              class="ai-close-button"
              aria-label="Close AI Assistant"
              @click="closeAI"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Command Input -->
        <div class="ai-command-section">
          <div class="ai-input-container">
            <input
              ref="commandInput"
              v-model="currentInput"
              type="text"
              placeholder="Ask AI to do something... (e.g., 'Navigate to the dashboard')"
              class="ai-command-input"
              :disabled="aiState.isLoading"
              @input="handleInputChange"
              @keydown.enter="executeCurrentCommandWithFeedback"
              @keydown.escape="closeAI"
              @keydown.up="navigateHistory(-1)"
              @keydown.down="navigateHistory(1)"
            >
            <button
              v-if="voiceInputSupported"
              class="ai-voice-button"
              :class="{ listening: isListening }"
              :disabled="aiState.isLoading"
              :title="isListening ? 'Stop Voice Input' : 'Start Voice Input'"
              @click="toggleVoiceInput"
            >
              <span v-if="isListening">🎤</span>
              <span v-else>🎙️</span>
            </button>
            <button
              class="ai-send-button"
              :disabled="!currentInput.trim() || aiState.isLoading"
              @click="executeCurrentCommandWithFeedback"
            >
              <span v-if="aiState.isLoading">...</span>
              <span v-else>→</span>
            </button>
          </div>

          <!-- Command Preview -->
          <div
            v-if="showPreview && commandPreview"
            class="ai-command-preview"
          >
            <div class="preview-icon">
              👁️
            </div>
            <div class="preview-text">
              {{ commandPreview }}
            </div>
          </div>

          <!-- Progress Indicator -->
          <div
            v-if="showProgress"
            class="ai-progress-container"
          >
            <div class="progress-label">
              Processing command...
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: executionProgress + '%' }"
              />
            </div>
            <div class="progress-percent">
              {{ Math.round(executionProgress) }}%
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="ai-quick-actions">
            <button
              v-for="action in quickActions"
              :key="action.id"
              class="ai-quick-action"
              @click="executeQuickAction(action)"
            >
              {{ action.icon }} {{ action.label }}
            </button>
            <button
              class="ai-quick-action templates-btn"
              :class="{ active: showTemplates }"
              @click="toggleTemplates"
            >
              📋 Templates
            </button>
          </div>

          <!-- Smart Templates Panel -->
          <div
            v-if="showTemplates"
            class="ai-templates-panel"
          >
            <div class="templates-header">
              <h4>Smart Templates</h4>
              <p>Context-aware templates for {{ currentContext.pageType === 'ide' ? 'development' : 'productivity' }}</p>
            </div>
            <div class="templates-grid">
              <div
                v-for="template in availableTemplates"
                :key="template.id"
                class="template-card"
                @click="insertTemplate(template)"
              >
                <div class="template-icon">
                  {{ template.icon }}
                </div>
                <div class="template-content">
                  <h5>{{ template.title }}</h5>
                  <p>{{ template.description }}</p>
                  <span class="template-category">{{ template.category }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat History -->
        <div class="ai-chat-container">
          <!-- Scroll to top button -->
          <button
            v-if="showScrollToTop"
            class="ai-scroll-top-btn"
            title="Scroll to top"
            @click="scrollToTop"
          >
            ↑
          </button>

          <!-- Chat messages -->
          <div
            ref="chatHistory"
            class="ai-chat-history"
            @scroll="handleScroll"
          >
            <div
              v-for="(entry, index) in aiState.history.slice(-50)"
              :key="index"
              class="ai-chat-entry"
            >
              <!-- User Command -->
              <div class="ai-user-message">
                <span class="ai-user-icon">👤</span>
                <div class="ai-message-content">
                  {{ entry.command }}
                </div>
                <span class="ai-timestamp">
                  {{ formatTime(entry.timestamp) }}
                </span>
              </div>

              <!-- AI Response -->
              <div class="ai-response">
                <span class="ai-bot-icon">🤖</span>
                <div class="ai-message-content">
                  <div
                    v-for="(result, resultIndex) in entry.results"
                    :key="resultIndex"
                    class="ai-result"
                  >
                    <div
                      v-if="result.error"
                      class="ai-error"
                    >
                      ❌ {{ result.action }}: {{ result.error }}
                    </div>
                    <div
                      v-else-if="result.result"
                      class="ai-success"
                    >
                      <div
                        v-if="result.result.success"
                        class="ai-success-message"
                      >
                        ✅ {{ result.result.message || `${result.action} completed successfully` }}
                      </div>
                      <div
                        v-else
                        class="ai-error-message"
                      >
                        ❌ {{ result.result.error || `${result.action} failed` }}
                      </div>
                      <div
                        v-if="result.result.data"
                        class="ai-result-data"
                      >
                        <pre>{{ JSON.stringify(result.result.data, null, 2) }}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="aiState.history.length === 0"
              class="ai-empty-state"
            >
              <div class="ai-welcome-message">
                <h4>👋 {{ getWelcomeMessage() }}</h4>
                <p>I understand you're working on <strong>{{ currentContext.pageType }}</strong> content. Here are some relevant actions:</p>

                <!-- Context-Aware Suggestions -->
                <div class="ai-context-suggestions">
                  <div
                    v-for="suggestion in contextSuggestions"
                    :key="suggestion.command"
                    class="ai-context-suggestion"
                    @click="executeContextSuggestion(suggestion)"
                  >
                    <span class="suggestion-icon">{{ suggestion.icon }}</span>
                    <span class="suggestion-label">{{ suggestion.label }}</span>
                    <span class="suggestion-priority">{{ suggestion.priority }}</span>
                  </div>
                </div>

                <div class="ai-context-info">
                  <p class="ai-context-details">
                    📍 Page: {{ currentContext.pageType }} |
                    ⏰ {{ currentContext.timeOfDay }} |
                    🔧 Mode: {{ currentContext.workflowPattern }}
                    <span v-if="currentContext.selectedText"> | ✨ Text selected</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Scroll to bottom button -->
            <button
              v-if="showScrollToBottom"
              class="ai-scroll-bottom-btn"
              title="Scroll to bottom"
              @click="scrollToBottom"
            >
              ↓
            </button>
          </div>

          <!-- Available Actions -->
          <div class="ai-actions-section">
            <details class="ai-actions-details">
              <summary>Available Actions ({{ availableActions.length }})</summary>
              <div class="ai-actions-list">
                <div
                  v-for="action in availableActions"
                  :key="action.name"
                  class="ai-action-item"
                  @click="insertActionTemplate(action)"
                >
                  <code class="ai-action-name">[ACTION:{{ action.name }}({{ action.parameters.join(', ') }})]</code>
                  <p class="ai-action-description">
                    {{ action.description }}
                  </p>
                </div>
              </div>
            </details>
          </div>

          <!-- Footer -->
          <div class="ai-assistant-footer">
            <div class="ai-shortcuts">
              <span><kbd>Enter</kbd> Send</span>
              <span><kbd>Esc</kbd> Close</span>
              <span><kbd>↑/↓</kbd> History</span>
            </div>
            <div class="ai-provider">
              Powered by {{ currentProvider }}
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Quick Actions Floating Toolbar -->
      <div
        v-if="showQuickActions && quickActions.length > 0"
        class="quick-actions-toolbar"
        :style="{
          left: quickActionsPosition.x + 'px',
          top: quickActionsPosition.y + 'px'
        }"
        @mouseleave="hideQuickActions"
      >
        <div class="quick-actions-container">
          <button
            v-for="action in quickActions"
            :key="action.command"
            class="quick-action-btn"
            :title="action.label"
            @click="executeQuickAction(action)"
          >
            <span class="quick-action-icon">{{ action.icon }}</span>
            <span class="quick-action-label">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Result Toast -->
      <div
        v-if="showResultToast && lastCommandResult"
        class="ai-result-toast"
        :class="{ success: lastCommandResult.success, error: !lastCommandResult.success }"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <span v-if="lastCommandResult.success">✅</span>
            <span v-else>❌</span>
          </div>
          <div class="toast-message">
            <div class="toast-title">
              {{ lastCommandResult.success ? 'Success' : 'Error' }}
            </div>
            <div class="toast-text">
              {{ lastCommandResult.message }}
            </div>
            <div class="toast-time">
              {{ lastCommandResult.details.timestamp }}
            </div>
          </div>
          <button
            class="toast-close"
            @click="hideResultToast"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAI } from '../composables/useAI'
import { useContextAwareness } from '../composables/useContextAwareness'

// Only runs on client-side due to .client.vue suffix
const { ai, aiState, closeAI, executeCommand } = useAI()

// Smart Context Awareness
const {
  currentContext,
  contextSuggestions,
  trackAction,
  getWelcomeMessage,
  filterCommandsByContext,
  initializeContext
} = useContextAwareness()

// Enhanced Quick Actions
const quickActions = ref([])
const showQuickActions = ref(false)
const quickActionsPosition = ref({ x: 0, y: 0 })
const selectedTextRef = ref('')

// Voice Input System
const isListening = ref(false)
const speechRecognition = ref(null)
const voiceInputSupported = ref(false)

// Smart Templates System
const availableTemplates = ref([])
const showTemplates = ref(false)

// Better Visual Feedback System
const commandPreview = ref('')
const showPreview = ref(false)
const executionProgress = ref(0)
const showProgress = ref(false)
const lastCommandResult = ref(null)
const showResultToast = ref(false)

// Component state
const currentInput = ref('')
const commandInput = ref(null)
const chatHistory = ref(null)
const historyIndex = ref(-1)
const commandHistory = ref([])

// Scroll state
const showScrollToTop = ref(false)
const showScrollToBottom = ref(false)
const isUserScrolling = ref(false)

// Docking state
const dockMode = ref('center') // 'center', 'left', 'right'

// Toggle docking mode
const toggleDockMode = () => {
  const modes = ['center', 'right', 'left']
  const currentIndex = modes.indexOf(dockMode.value)
  dockMode.value = modes[(currentIndex + 1) % modes.length]
  trackAction('dock_mode_changed', { mode: dockMode.value })
}

// Set specific dock mode
const setDockMode = (mode) => {
  dockMode.value = mode
  trackAction('dock_mode_set', { mode })
}

// Enhanced Quick Actions System
const generateQuickActions = (selectedText, context) => {
  const actions = []

  if (selectedText) {
    // Text-based actions
    actions.push(
      { icon: '🔤', label: 'Make Bold', command: 'formatBold', priority: 10 },
      { icon: '💭', label: 'Make Italic', command: 'formatItalic', priority: 9 },
      { icon: '🔍', label: 'Explain', command: 'explainText', priority: 8 },
      { icon: '🌐', label: 'Translate', command: 'translateText', priority: 7 },
      { icon: '✨', label: 'Improve', command: 'improveText', priority: 6 }
    )

    // Context-specific actions
    if (selectedText.includes('```') || /^[a-z_][a-zA-Z0-9_]*\s*\(/.test(selectedText)) {
      actions.push({ icon: '💻', label: 'Debug Code', command: 'debugCode', priority: 11 })
      actions.push({ icon: '📝', label: 'Document', command: 'documentCode', priority: 8 })
    }

    if (/^\d+/.test(selectedText) || selectedText.includes('$')) {
      actions.push({ icon: '🧮', label: 'Calculate', command: 'calculate', priority: 9 })
    }
  } else {
    // General context actions
    const pageActions = contextSuggestions.value.slice(0, 4).map(suggestion => ({
      icon: suggestion.icon,
      label: suggestion.label,
      command: suggestion.command,
      priority: suggestion.priority
    }))
    actions.push(...pageActions)
  }

  return actions.sort((a, b) => b.priority - a.priority).slice(0, 6)
}

const showQuickActionsFor = (selectedText, event) => {
  selectedTextRef.value = selectedText
  quickActions.value = generateQuickActions(selectedText, currentContext)

  if (quickActions.value.length > 0) {
    const rect = event?.target?.getBoundingClientRect?.() || { x: 0, y: 0 }
    quickActionsPosition.value = {
      x: Math.min(rect.x + 10, window.innerWidth - 300),
      y: Math.max(rect.y - 50, 10)
    }
    showQuickActions.value = true
    trackAction('quick_actions_shown', { textLength: selectedText.length, actionCount: quickActions.value.length })
  }
}

const executeQuickAction = async (action) => {
  const text = selectedTextRef.value
  showQuickActions.value = false

  trackAction('quick_action_executed', { action: action.command })

  // Execute the action with selected text
  let command = `${action.command}`
  if (text) {
    command += ` "${text}"`
  }

  await executeCommand(command)
}

const hideQuickActions = () => {
  showQuickActions.value = false
  setTimeout(() => {
    selectedTextRef.value = ''
    quickActions.value = []
  }, 200)
}

// Voice Input Implementation
const initializeVoiceInput = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    voiceInputSupported.value = true
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    speechRecognition.value = new SpeechRecognition()

    speechRecognition.value.continuous = false
    speechRecognition.value.interimResults = true
    speechRecognition.value.lang = 'en-US'

    speechRecognition.value.onstart = () => {
      isListening.value = true
      trackAction('voice_input_started')
    }

    speechRecognition.value.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        currentInput.value = finalTranscript.trim()
        trackAction('voice_input_completed', { transcript: finalTranscript })
      }
    }

    speechRecognition.value.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      isListening.value = false
      trackAction('voice_input_error', { error: event.error })
    }

    speechRecognition.value.onend = () => {
      isListening.value = false
      trackAction('voice_input_ended')
    }
  } else {
    voiceInputSupported.value = false
  }
}

const toggleVoiceInput = () => {
  if (!voiceInputSupported.value) {
    alert('Speech recognition is not supported in your browser')
    return
  }

  if (isListening.value) {
    speechRecognition.value?.stop()
  } else {
    currentInput.value = '' // Clear previous input
    speechRecognition.value?.start()
  }
}

const stopVoiceInput = () => {
  if (speechRecognition.value && isListening.value) {
    speechRecognition.value.stop()
  }
}

// Smart Templates Implementation
const getSmartTemplates = () => {
  const templates = []
  const pageType = currentContext.pageType
  const timeOfDay = currentContext.timeOfDay

  // Context-aware templates
  const templateSets = {
    blocks: [
      {
        id: 'meeting-notes',
        title: 'Meeting Notes',
        icon: '📝',
        category: 'Productivity',
        description: 'Professional meeting notes template',
        content: `# Meeting Notes - ${new Date().toLocaleDateString()}

## Attendees
- 

## Agenda
1. 
2. 
3. 

## Discussion Points
- 

## Action Items
- [ ] 
- [ ] 

## Next Steps
- 

## Follow-up Date
${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
      },
      {
        id: 'daily-plan',
        title: 'Daily Plan',
        icon: '📅',
        category: 'Planning',
        description: 'Structured daily planning template',
        content: `# Daily Plan - ${new Date().toLocaleDateString()}

## Priority Tasks (Top 3)
1. [ ] 
2. [ ] 
3. [ ] 

## Secondary Tasks
- [ ] 
- [ ] 

## Meetings & Calls
- 

## Notes & Ideas
- 

## Tomorrow's Prep
- 

---
*Created at ${new Date().toLocaleTimeString()}*`
      },
      {
        id: 'project-outline',
        title: 'Project Outline',
        icon: '📊',
        category: 'Planning',
        description: 'Comprehensive project planning template',
        content: `# Project Outline

## Project Name
[Project Title]

## Overview
Brief description of the project goals and objectives.

## Scope
### In Scope
- 
- 

### Out of Scope
- 
- 

## Timeline
- **Start Date:** 
- **End Date:** 
- **Key Milestones:** 

## Resources
- **Team:** 
- **Budget:** 
- **Tools:** 

## Success Criteria
- 
- 

## Risks & Mitigation
- **Risk:** 
  **Mitigation:** 

## Next Steps
1. 
2. 
3. `
      }
    ],
    ide: [
      {
        id: 'code-review-template',
        title: 'Code Review',
        icon: '🔍',
        category: 'Development',
        description: 'Structured code review template',
        content: `# Code Review

## Summary
Brief description of changes made.

## Changes
- 
- 

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Security considerations reviewed

## Performance Impact
- 

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes documented

## Notes
- `
      },
      {
        id: 'bug-report',
        title: 'Bug Report',
        icon: '🐛',
        category: 'Development',
        description: 'Detailed bug report template',
        content: `# Bug Report

## Description
Clear description of the bug.

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- **OS:** 
- **Browser:** 
- **Version:** 

## Screenshots/Logs
[Attach relevant files]

## Severity
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

## Additional Notes
- `
      },
      {
        id: 'api-documentation',
        title: 'API Documentation',
        icon: '📚',
        category: 'Documentation',
        description: 'API endpoint documentation template',
        content: `# API Documentation

## Endpoint: [METHOD] /api/endpoint

### Description
Brief description of what this endpoint does.

### Parameters

#### Required
- \`param1\` (string): Description
- \`param2\` (number): Description

#### Optional
- \`param3\` (boolean): Description (default: false)

### Request Example
\`\`\`json
{
  "param1": "value",
  "param2": 123
}
\`\`\`

### Response Examples

#### Success (200)
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

#### Error (400)
\`\`\`json
{
  "success": false,
  "error": "Error message"
}
\`\`\`

### Error Codes
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error`
      }
    ]
  }

  // Add page-specific templates
  if (templateSets[pageType]) {
    templates.push(...templateSets[pageType])
  }

  // Add time-based templates
  if (timeOfDay === 'morning') {
    templates.unshift({
      id: 'morning-journal',
      title: 'Morning Journal',
      icon: '🌅',
      category: 'Personal',
      description: 'Start your day with reflection',
      content: `# Morning Journal - ${new Date().toLocaleDateString()}

## How I'm Feeling
- 

## Today's Priorities
1. 
2. 
3. 

## Gratitude
- I'm grateful for:
- I appreciate:

## Intention for Today
- 

## Affirmation
"Today I will..."`
    })
  }

  return templates.slice(0, 6) // Limit to 6 templates
}

const loadTemplates = () => {
  availableTemplates.value = getSmartTemplates()
  trackAction('templates_loaded', { count: availableTemplates.value.length, pageType: currentContext.pageType })
}

const toggleTemplates = () => {
  if (!showTemplates.value) {
    loadTemplates()
  }
  showTemplates.value = !showTemplates.value
}

const insertTemplate = async (template) => {
  showTemplates.value = false
  trackAction('template_inserted', { templateId: template.id, category: template.category })

  // Insert template content via AI command
  await executeCommand(`insertTemplate "${template.title}" ${JSON.stringify(template.content)}`)
}

const previewTemplate = (template) => {
  // Could show a preview modal here
  trackAction('template_previewed', { templateId: template.id })
}

// Better Visual Feedback Implementation
const updateCommandPreview = (input) => {
  if (!input.trim()) {
    showPreview.value = false
    return
  }

  // Generate preview based on command type
  const lowerInput = input.toLowerCase()
  let preview = ''

  if (lowerInput.includes('heading') || lowerInput.includes('h1')) {
    preview = 'Will insert a large heading (H1) at cursor position'
  } else if (lowerInput.includes('bold') || lowerInput.includes('format')) {
    preview = 'Will make selected text bold or add bold formatting'
  } else if (lowerInput.includes('list')) {
    preview = 'Will create a bulleted or numbered list'
  } else if (lowerInput.includes('table')) {
    preview = 'Will insert a formatted table structure'
  } else if (lowerInput.includes('explain') || lowerInput.includes('help')) {
    preview = 'Will provide an explanation or help information'
  } else if (lowerInput.includes('translate')) {
    preview = 'Will translate the selected text or provided content'
  } else if (lowerInput.includes('code') || lowerInput.includes('debug')) {
    preview = 'Will analyze or format code, or help with debugging'
  } else {
    preview = `AI will process: "${input.slice(0, 50)}${input.length > 50 ? '...' : ''}"`
  }

  commandPreview.value = preview
  showPreview.value = true
}

const startProgressFeedback = (commandText) => {
  showProgress.value = true
  executionProgress.value = 0

  // Simulate progress for better UX
  const progressInterval = setInterval(() => {
    if (executionProgress.value < 80) {
      executionProgress.value += Math.random() * 20
    }

    if (!aiState.isLoading) {
      executionProgress.value = 100
      setTimeout(() => {
        showProgress.value = false
        clearInterval(progressInterval)
      }, 500)
    }
  }, 200)

  trackAction('command_progress_started', { command: commandText })
}

const showCommandResult = (success, message, details = {}) => {
  lastCommandResult.value = {
    success,
    message,
    details,
    timestamp: Date.now()
  }

  showResultToast.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showResultToast.value = false
  }, 3000)

  trackAction('command_result_shown', { success, message })
}

const hideResultToast = () => {
  showResultToast.value = false
}

// Enhanced command execution with visual feedback
const executeCommandWithFeedback = async (command) => {
  try {
    // Show command preview briefly
    updateCommandPreview(command)

    // Start progress feedback
    startProgressFeedback(command)

    // Execute the actual command
    const result = await executeCommand(command)

    // Show success result
    showCommandResult(true, `Command executed successfully: ${command.slice(0, 30)}...`, {
      command,
      timestamp: new Date().toLocaleTimeString()
    })

    return result
  } catch (error) {
    // Show error result
    showCommandResult(false, `Command failed: ${error.message || 'Unknown error'}`, {
      command,
      error: error.message,
      timestamp: new Date().toLocaleTimeString()
    })
    throw error
  }
}

// Input change handler for live preview
const handleInputChange = (event) => {
  const value = event.target.value
  currentInput.value = value

  // Show command preview with debouncing
  clearTimeout(handleInputChange.timeoutId)
  handleInputChange.timeoutId = setTimeout(() => {
    updateCommandPreview(value)
  }, 300)
}

// Enhanced current command execution
const executeCurrentCommandWithFeedback = async () => {
  if (!currentInput.value.trim() || aiState.isLoading) return

  const command = currentInput.value.trim()
  showPreview.value = false

  try {
    await executeCommandWithFeedback(command)
    currentInput.value = ''
  } catch (error) {
    console.error('Command execution failed:', error)
  }
}

// Get available actions from AI instance
const availableActions = computed(() => {
  return Array.from(ai.actions.values())
})

// Get current AI provider
const currentProvider = computed(() => {
  return ai.currentProvider || 'AI'
})

// Execute context-aware suggestion
const executeContextSuggestion = async (suggestion) => {
  currentInput.value = suggestion.label
  trackAction('context_suggestion_clicked', suggestion)
  await executeCurrentCommand()
}

// This computed property was causing duplicate declaration issues and is not being used
// The quickActions ref and generateQuickActions function handle quick actions instead

// Execute current command
const executeCurrentCommand = async () => {
  if (!currentInput.value.trim() || aiState.isLoading) return

  const command = currentInput.value.trim()

  // Track action for context awareness
  trackAction('command_executed', { command, timestamp: Date.now() })

  // Add to command history
  if (!commandHistory.value.includes(command)) {
    commandHistory.value.unshift(command)
    // Keep only last 20 commands
    if (commandHistory.value.length > 20) {
      commandHistory.value = commandHistory.value.slice(0, 20)
    }
  }

  // Clear input
  currentInput.value = ''
  historyIndex.value = -1

  try {
    await executeCommand(command)

    // Scroll to bottom of chat
    nextTick(() => {
      if (chatHistory.value) {
        chatHistory.value.scrollTop = chatHistory.value.scrollHeight
      }
    })
  } catch (error) {
    console.error('Failed to execute command:', error)
  }
}

// Execute quick action (removed duplicate - using the more comprehensive one at line 512)

// Navigate command history
const navigateHistory = (direction) => {
  if (commandHistory.value.length === 0) return

  const newIndex = historyIndex.value + direction

  if (newIndex >= -1 && newIndex < commandHistory.value.length) {
    historyIndex.value = newIndex

    if (newIndex === -1) {
      currentInput.value = ''
    } else {
      currentInput.value = commandHistory.value[newIndex]
    }
  }
}

// Insert action template
const insertActionTemplate = (action) => {
  const template = `[ACTION:${action.name}(${action.parameters.map(p => `"${p.split(':')[0]}"`).join(', ')})]`
  currentInput.value = template

  // Focus input and position cursor before the closing bracket
  nextTick(() => {
    if (commandInput.value) {
      commandInput.value.focus()
      const cursorPos = template.lastIndexOf(')]')
      commandInput.value.setSelectionRange(cursorPos, cursorPos)
    }
  })
}

// Handle overlay click (close on background click)
const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeAI()
  }
}

// Scroll functions
const handleScroll = (event) => {
  if (!chatHistory.value) return

  const { scrollTop, scrollHeight, clientHeight } = chatHistory.value
  const scrollFromTop = scrollTop
  const scrollFromBottom = scrollHeight - scrollTop - clientHeight

  // Show scroll to top button when scrolled down more than 100px
  showScrollToTop.value = scrollFromTop > 100

  // Show scroll to bottom button when not at bottom and there's content below
  showScrollToBottom.value = scrollFromBottom > 50

  // Track if user is scrolling (prevent auto-scroll when user is scrolling up)
  isUserScrolling.value = scrollFromBottom > 10
}

const scrollToTop = () => {
  if (chatHistory.value) {
    chatHistory.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

const scrollToBottom = () => {
  if (chatHistory.value) {
    chatHistory.value.scrollTo({
      top: chatHistory.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// Format timestamp
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// Auto-focus input when modal opens
watch(() => aiState.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      if (commandInput.value) {
        commandInput.value.focus()
      }
    })
  }
})

// Global event handlers for quick actions
const handleSelectionChange = () => {
  const selection = window.getSelection()
  const selectedText = selection.toString().trim()

  if (selectedText.length > 0 && aiState.isOpen) {
    // Get the range and create a mock event for positioning
    try {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const mockEvent = {
        target: {
          getBoundingClientRect: () => rect
        }
      }
      showQuickActionsFor(selectedText, mockEvent)
    } catch (e) {
      // Selection might be invalid
      hideQuickActions()
    }
  } else {
    hideQuickActions()
  }
}

const handleClickOutside = (event) => {
  if (!event.target.closest('.quick-actions-toolbar') && !event.target.closest('.ai-assistant-modal')) {
    hideQuickActions()
  }
}

// Initialize context awareness, quick actions, and voice input
onMounted(() => {
  initializeContext()
  initializeVoiceInput()

  // Add global selection listener
  document.addEventListener('selectionchange', handleSelectionChange)

  // Click outside to hide quick actions
  document.addEventListener('click', handleClickOutside)

  nextTick(() => {
    // Focus command input when modal opens
    if (commandInput.value && aiState.isOpen) {
      commandInput.value.focus()
    }
  })
})

// Cleanup event listeners and voice input
onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
  document.removeEventListener('click', handleClickOutside)
  stopVoiceInput()
})

// Auto-scroll chat history when new messages arrive (only if user hasn't scrolled up)
watch(() => aiState.history.length, () => {
  nextTick(() => {
    if (chatHistory.value && !isUserScrolling.value) {
      chatHistory.value.scrollTo({
        top: chatHistory.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
})
</script>

<style scoped>
/* AI Assistant Overlay Styles - Minimalist IDE Design */
.ai-assistant-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.ai-assistant-modal {
  background: #2d2d30;
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 600px;
  height: 600px; /* Fixed height instead of max-height */
  max-height: 90vh; /* Fallback for smaller screens */
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid #3c3c3c;
  overflow: hidden;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Consolas', monospace;
  color: #cccccc;
  font-size: 13px;
}

/* Header - IDE Style */
.ai-assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #3c3c3c;
  background: #1e1e1e;
  color: #cccccc;
  border-radius: 8px 8px 0 0;
  position: relative;
  overflow: hidden;
  min-height: 44px;
}

.ai-assistant-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.ai-icon {
  font-size: 16px;
  opacity: 0.8;
}

.ai-assistant-title h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: #cccccc;
  position: relative;
  z-index: 1;
}

.loading-indicator {
  margin-left: 8px;
}

.loading-dots {
  display: inline-flex;
  gap: 2px;
}

.loading-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #6b7280;
  animation: bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(3) {
  animation-delay: -0.16s;
}

.ai-close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 16px;
  cursor: pointer;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 1;
}

.ai-close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Command Section */
.ai-command-section {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
}

.ai-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-command-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);

  /* Invisible scrollbar for multi-line input if needed */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.ai-command-input::-webkit-scrollbar {
  display: none;
}

.ai-command-input:focus {
  border-color: rgba(103, 126, 234, 0.6);
  box-shadow: 0 0 0 3px rgba(103, 126, 234, 0.1);
  background: rgba(255, 255, 255, 1);
  transform: translateY(-1px);
}

.ai-command-input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.ai-send-button {
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(103, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.ai-send-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  pointer-events: none;
}

.ai-send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(103, 126, 234, 0.4);
}

.ai-send-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Voice Input Button */
.ai-voice-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s ease;
  margin-right: 8px;
  position: relative;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.ai-voice-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  border-radius: 12px;
  pointer-events: none;
}

.ai-voice-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.ai-voice-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.ai-voice-button.listening {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  animation: voicePulse 1.5s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.ai-voice-button.listening:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
}

/* Voice input animations */
@keyframes voicePulse {
  0% {
    transform: scale(1) translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4), 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4), 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(1) translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4), 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

/* Quick Actions */
.ai-quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ai-quick-action {
  padding: 4px 8px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-quick-action:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.ai-quick-action.templates-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

/* Smart Templates Panel */
.ai-templates-panel {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  animation: slideDown 0.3s ease;
}

.templates-header {
  margin-bottom: 12px;
}

.templates-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.templates-header p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.template-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.template-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
}

.template-content {
  flex: 1;
  min-width: 0;
}

.template-content h5 {
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.template-content p {
  margin: 0 0 6px 0;
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}

.template-category {
  display: inline-block;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 3px;
}

/* Template animations */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 400px;
  }
}

/* Visual Feedback Elements */

/* Command Preview */
.ai-command-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 1px solid #86efac;
  border-radius: 8px;
  font-size: 12px;
  color: #166534;
  animation: fadeInUp 0.2s ease;
}

.preview-icon {
  font-size: 14px;
  opacity: 0.8;
}

.preview-text {
  flex: 1;
  line-height: 1.4;
}

/* Progress Indicator */
.ai-progress-container {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
  border: 1px solid #f59e0b;
  border-radius: 8px;
  animation: fadeInUp 0.3s ease;
}

.progress-label {
  font-size: 12px;
  color: #92400e;
  font-weight: 500;
  margin-bottom: 8px;
  text-align: center;
}

.progress-bar {
  height: 4px;
  background: #fbbf24;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: progressShine 1.5s ease-in-out infinite;
}

.progress-percent {
  font-size: 11px;
  color: #92400e;
  text-align: center;
  margin-top: 4px;
  font-weight: 600;
}

/* Result Toast */
.ai-result-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10002;
  min-width: 300px;
  max-width: 400px;
  animation: toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-result-toast.success {
  --toast-color: #10b981;
  --toast-bg: #ecfdf5;
  --toast-border: #86efac;
}

.ai-result-toast.error {
  --toast-color: #ef4444;
  --toast-bg: #fef2f2;
  --toast-border: #fca5a5;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--toast-bg);
  border: 1px solid var(--toast-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--toast-color);
  margin-bottom: 4px;
}

.toast-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.4;
  margin-bottom: 4px;
}

.toast-time {
  font-size: 10px;
  color: #6b7280;
  opacity: 0.8;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #374151;
}

/* Animations for visual feedback */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes progressShine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Enhanced loading states */
.ai-send-button:disabled {
  position: relative;
  overflow: hidden;
}

.ai-send-button:disabled::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: buttonShine 1.5s ease-in-out infinite;
}

@keyframes buttonShine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Chat History Container */
.ai-chat-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 400px; /* Fixed height to prevent window resizing */
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
}

/* Subtle gradient overlays to indicate scrollable content */
.ai-chat-container::before,
.ai-chat-container::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
  z-index: 2;
}

.ai-chat-container::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
  border-radius: 12px 12px 0 0;
}

.ai-chat-container::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
  border-radius: 0 0 12px 12px;
}

/* Chat History */
.ai-chat-history {
  height: 100%; /* Take full height of container */
  overflow-y: scroll; /* Enable vertical scrolling */
  overflow-x: hidden;
  padding: 16px 20px;
  scroll-behavior: smooth;

  /* Invisible scrollbars - comprehensive browser support */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer and Edge */
}

/* Webkit browsers (Chrome, Safari, Opera) */
.ai-chat-history::-webkit-scrollbar {
  display: none;
  width: 0;
}

/* Scroll buttons */
.ai-scroll-top-btn,
.ai-scroll-bottom-btn {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  z-index: 10;
}

.ai-scroll-top-btn {
  top: 8px;
}

.ai-scroll-bottom-btn {
  bottom: 8px;
}

.ai-scroll-top-btn:hover,
.ai-scroll-bottom-btn:hover {
  background: rgba(59, 130, 246, 1);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.ai-scroll-top-btn:active,
.ai-scroll-bottom-btn:active {
  transform: scale(0.95);
}

.ai-chat-entry {
  margin-bottom: 20px;
  animation: fadeInUp 0.3s ease-out;
}

.ai-user-message,
.ai-response {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.ai-user-icon,
.ai-bot-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.ai-bot-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-message-content {
  flex: 1;
  background: rgba(243, 244, 246, 0.8);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  position: relative;
}

.ai-response .ai-message-content {
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.9) 0%, rgba(186, 230, 253, 0.6) 100%);
  border: 1px solid rgba(103, 126, 234, 0.2);
}

/* Message bubble tail effect */
.ai-message-content::before {
  content: '';
  position: absolute;
  top: 10px;
  left: -6px;
  width: 12px;
  height: 12px;
  background: inherit;
  border: inherit;
  border-right: none;
  border-bottom: none;
  transform: rotate(-45deg);
  border-radius: 2px 0 0 0;
}

.ai-timestamp {
  font-size: 11px;
  color: #6b7280;
  align-self: center;
  flex-shrink: 0;
}

.ai-result {
  margin-bottom: 4px;
}

.ai-success-message {
  color: #059669;
}

.ai-error-message {
  color: #dc2626;
}

.ai-result-data {
  margin-top: 8px;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  overflow-x: auto;
}

.ai-result-data pre {
  margin: 0;
  color: #374151;
}

/* Empty State */
.ai-empty-state {
  text-align: center;
  color: #6b7280;
}

.ai-welcome-message h4 {
  margin: 0 0 8px 0;
  color: #111827;
}

.ai-welcome-message p {
  margin: 0 0 16px 0;
}

.ai-example-commands {
  text-align: left;
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.ai-example-commands p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #374151;
}

.ai-example-commands ul {
  margin: 0;
  padding-left: 16px;
}

.ai-example-commands li {
  margin-bottom: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #4b5563;
}

/* Available Actions */
.ai-actions-section {
  border-top: 1px solid #e5e7eb;
  padding: 12px 20px;
}

.ai-actions-details summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  user-select: none;
}

.ai-actions-list {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;

  /* Invisible scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.ai-actions-list::-webkit-scrollbar {
  display: none;
}

.ai-action-item {
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ai-action-item:hover {
  background: #f9fafb;
}

.ai-action-name {
  display: block;
  font-size: 12px;
  color: #3b82f6;
  font-family: 'Monaco', 'Menlo', monospace;
  margin-bottom: 2px;
}

.ai-action-description {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
}

/* Footer */
.ai-assistant-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(180deg, rgba(249, 250, 251, 0.9) 0%, rgba(243, 244, 246, 0.8) 100%);
  border-radius: 0 0 24px 24px;
  font-size: 11px;
  color: #6b7280;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.ai-shortcuts {
  display: flex;
  gap: 12px;
}

.ai-shortcuts kbd {
  background: #e5e7eb;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: inherit;
  font-size: 10px;
}

/* Docking System */
.ai-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-dock-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.ai-dock-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.ai-dock-button:active {
  transform: translateY(0);
}

/* Docking Positions */
.dock-center {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  max-width: 90vw;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-right {
  position: fixed;
  top: 20px;
  right: 20px;
  bottom: 20px;
  width: 400px;
  max-width: 35vw;
  transform: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-left {
  position: fixed;
  top: 20px;
  left: 20px;
  bottom: 20px;
  width: 400px;
  max-width: 35vw;
  transform: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Modal adjustments for docking */
.modal-center {
  height: auto;
  max-height: 80vh;
}

.modal-right,
.modal-left {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modal-right .ai-chat-container,
.modal-left .ai-chat-container {
  flex: 1;
  height: auto;
}

.modal-right .ai-chat-history,
.modal-left .ai-chat-history {
  height: 100%;
}

/* Responsive docking */
@media (max-width: 768px) {
  .dock-left,
  .dock-right {
    width: 90vw !important;
    max-width: 90vw !important;
    left: 5vw !important;
    right: 5vw !important;
    top: 10px !important;
    bottom: 10px !important;
  }
}

/* Enhanced Quick Actions Floating Toolbar */
.quick-actions-toolbar {
  position: fixed;
  z-index: 10001;
  pointer-events: auto;
  animation: quickActionsSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-actions-container {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  transition: all 0.15s ease;
  min-height: 32px;
}

.quick-action-btn:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.quick-action-icon {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.quick-action-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.025em;
}

/* Quick actions animations */
@keyframes quickActionsSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Responsive quick actions */
@media (max-width: 640px) {
  .quick-action-label {
    display: none;
  }

  .quick-action-btn {
    padding: 8px;
    min-width: 36px;
    justify-content: center;
  }

  .quick-actions-container {
    gap: 1px;
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 640px) {
  .ai-assistant-overlay {
    padding: 10px;
  }

  .ai-assistant-modal {
    max-height: 90vh;
  }

  .ai-quick-actions {
    gap: 4px;
  }

  .ai-quick-action {
    font-size: 11px;
    padding: 3px 6px;
  }

  .ai-shortcuts {
    gap: 8px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .ai-assistant-modal {
    background: #1f2937;
    color: #f9fafb;
  }

  .ai-assistant-header {
    background: #111827;
    border-color: #374151;
  }

  .ai-assistant-title h3 {
    color: #f9fafb;
  }

  .ai-command-section {
    border-color: #374151;
  }

  .ai-command-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .ai-command-input:focus {
    border-color: #60a5fa;
  }

  .ai-message-content {
    background: #374151;
    color: #f9fafb;
  }

  .ai-response .ai-message-content {
    background: #1e3a8a;
  }

  .ai-assistant-footer {
    background: #111827;
    border-color: #374151;
  }
}
</style>
