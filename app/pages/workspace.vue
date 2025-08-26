<script setup>
// Canvas Workspace - The main editor interface
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useWorkspace } from '../../composables/useWorkspace'
import { useLocalWorkspace } from '../../composables/useLocalWorkspace'
import { useAI } from '../features/ai/composables/useAI'
import ProCommandCenter from '../features/navigation/components/ProCommandCenter.vue'
import UniversalAISidebar from '../features/ai/components/UniversalAISidebar.vue'
import BlockEditor from '../features/blocks/components/BlockEditor.vue'
import CleanEditor from '../features/ide/components/CleanEditor.vue'
import IDEBlockEditor from '../features/ide/components/IDEBlockEditor.vue'
import GraphView3D from '../features/graph3d/components/GraphView3D.vue'
import WhiteboardEditor from '../features/whiteboard/components/WhiteboardEditor.vue'
import DatabaseEditor from '../features/database/components/DatabaseEditor.vue'
// import AIAssistant from '../features/ai/components/AIAssistant.vue'
import Terminal from '../features/ide/components/Terminal.vue'
import EnhancedFileExplorer from '../features/ide/components/EnhancedFileExplorer.vue'

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
// Old command center state - kept for compatibility but disabled
const commandCenter = ref({
  isOpen: false,
  query: '',
  results: [],
  activeTab: 'search' // search, ai
})

// Editor state
const editor = ref({
  currentDocument: null,
  blocks: [{ id: 'initial', type: 'paragraph', content: '', position: 0 }],
  isEditing: false,
  saveTimeout: null,
  showCanvas: false,
  canvasMode: 'infinite'
})

// Terminal state and controls
const terminalVisible = ref(false)
const terminalExpanded = ref(true)

// Terminal tabs state
const terminalTabs = ref([
  { id: 'terminal-1', name: 'Terminal 1', active: true }
])
const activeTerminalTab = ref('terminal-1')
const maxTerminalTabs = 4

// AI Assistant state
const { registerActions } = useAI()

// 3D Graph state
const show3DGraph = ref(false)

// Component refs
const cleanEditorRef = ref(null)
const _graphSettings = ref({
  layout: 'force',
  showNodes: true,
  showConnections: true,
  animationsEnabled: true
})

// AI Chat state (integrated into Command Center)
const aiChat = ref({
  messages: [],
  inputMessage: '',
  isLoading: false,
  error: null,
  isStreaming: false,
  currentStreamMessage: '',
  conversationTitle: 'New Conversation'
})

// Load conversation from localStorage
const loadConversation = () => {
  try {
    const saved = localStorage.getItem('ai-conversation')
    if (saved) {
      const parsed = JSON.parse(saved)
      aiChat.value.messages = parsed.messages || []
      aiChat.value.conversationTitle = parsed.title || 'New Conversation'
    }
  } catch (error) {
    console.error('Failed to load conversation:', error)
  }
}

// Save conversation to localStorage
const saveConversation = () => {
  try {
    const conversation = {
      messages: aiChat.value.messages,
      title: aiChat.value.conversationTitle,
      lastUpdated: new Date().toISOString()
    }
    localStorage.setItem('ai-conversation', JSON.stringify(conversation))
  } catch (error) {
    console.error('Failed to save conversation:', error)
  }
}

// Auto-save conversation when messages change
watch(() => aiChat.value.messages, () => {
  saveConversation()
}, { deep: true })

// Clear conversation
const clearConversation = () => {
  aiChat.value.messages = []
  aiChat.value.conversationTitle = 'New Conversation'
  aiChat.value.error = null
  localStorage.removeItem('ai-conversation')
}

// AI Provider Settings with persistence
const aiSettings = ref({
  provider: 'ollama', // ollama, openai, anthropic, gemini
  ollamaUrl: 'http://192.168.12.236:8089',
  ollamaModel: 'gpt-oss:20b',
  openaiApiKey: '',
  anthropicApiKey: '',
  geminiApiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: 'You are a helpful assistant integrated into a workspace application. Be concise and helpful.',
  conversationId: null
})

// Load AI settings from localStorage on startup
const loadAISettings = () => {
  try {
    const saved = localStorage.getItem('ai-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      Object.assign(aiSettings.value, parsed)
    }
  } catch (error) {
    console.error('Failed to load AI settings:', error)
  }
}

// Save AI settings to localStorage
const saveAISettings = () => {
  try {
    localStorage.setItem('ai-settings', JSON.stringify(aiSettings.value))
  } catch (error) {
    console.error('Failed to save AI settings:', error)
  }
}

// Watch for changes in AI settings and save them
watch(aiSettings, () => {
  saveAISettings()
}, { deep: true })

// Load settings and conversation on startup
onMounted(() => {
  loadAISettings()
  loadConversation()

  // Register workspace-specific AI actions
  registerActions({
    switchWorkspaceMode: {
      description: 'Switch between different workspace modes (blocks, ide, database, etc.)',
      parameters: ['mode: string'],
      execute: async (mode) => {
        const validModes = ['blocks', 'ide', 'database', 'whiteboard', '3d-graph']
        if (!validModes.includes(mode)) {
          return {
            success: false,
            error: `Invalid mode. Valid modes: ${validModes.join(', ')}`
          }
        }

        currentWorkspaceType.value = mode
        return {
          success: true,
          message: `Switched to ${mode} workspace mode`
        }
      }
    },

    createNewPage: {
      description: 'Create a new page in the current workspace',
      parameters: ['title?: string'],
      execute: async (title = 'Untitled Page') => {
        const newPage = {
          id: `page-${Date.now()}`,
          title,
          blocks: [{ id: 'initial', type: 'paragraph', content: '', position: 0 }],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }

        pages.value.push(newPage)
        currentPage.value = newPage

        return {
          success: true,
          message: `Created new page: ${title}`
        }
      }
    },

    toggleTerminal: {
      description: 'Show or hide the terminal panel',
      parameters: [],
      execute: async () => {
        terminalVisible.value = !terminalVisible.value
        return {
          success: true,
          message: terminalVisible.value ? 'Terminal opened' : 'Terminal closed'
        }
      }
    },

    toggleFileExplorer: {
      description: 'Show or hide the file explorer sidebar',
      parameters: [],
      execute: async () => {
        showSidebar.value = !showSidebar.value
        return {
          success: true,
          message: showSidebar.value ? 'File explorer opened' : 'File explorer closed'
        }
      }
    },

    addBlock: {
      description: 'Add a new block to the current page',
      parameters: ['type: string', 'content?: string'],
      execute: async (type, content = '') => {
        const validTypes = ['paragraph', 'heading1', 'heading2', 'heading3', 'code', 'list', 'quote']
        if (!validTypes.includes(type)) {
          return {
            success: false,
            error: `Invalid block type. Valid types: ${validTypes.join(', ')}`
          }
        }

        if (currentPage.value) {
          const newBlock = {
            id: `block-${Date.now()}`,
            type,
            content,
            position: currentPage.value.blocks.length
          }

          currentPage.value.blocks.push(newBlock)

          return {
            success: true,
            message: `Added ${type} block to page`
          }
        }

        return {
          success: false,
          error: 'No active page to add block to'
        }
      }
    },

    saveWorkspace: {
      description: 'Save the current workspace to local storage',
      parameters: [],
      execute: async () => {
        try {
          if (currentWorkspace.value) {
            saveWorkspace(currentWorkspace.value)
            return {
              success: true,
              message: 'Workspace saved successfully'
            }
          }
          return {
            success: false,
            error: 'No active workspace to save'
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to save workspace: ${error.message}`
          }
        }
      }
    }
  })
})

const aiWorkspaceContext = computed(() => {
  const page = currentPage.value
  const context = {
    type: 'blocks',
    pageName: page?.title || 'Untitled',
    pageCount: pages.value.length,
    currentFile: currentActiveFile.value
  }

  if (page?.isIDEMode) {
    context.type = 'ide'
  } else if (page?.isWhiteboardMode) {
    context.type = 'whiteboard'
  } else if (page?.isDatabaseMode) {
    context.type = 'database'
  }

  return context
})

// Workspace composables
const { createDocument } = useWorkspace()
const {
  getWorkspaces: getLocalWorkspaces,
  createWorkspace: createLocalWorkspace,
  getCurrentWorkspace,
  setCurrentWorkspace,
  saveWorkspacePages,
  deleteWorkspace: deleteLocalWorkspace,
  renameWorkspace
} = useLocalWorkspace()

// Workspace name input
const workspaceName = ref('')

// Available workspaces
const availableWorkspaces = ref([])

// Page management state
const pages = ref([]) // Array of pages in current workspace
const activePageId = ref(null) // Currently active page ID
const currentPageTitle = ref({
  value: 'Untitled',
  isEditing: false,
  originalValue: 'Untitled'
})

// Computed property for current page
const currentPage = computed(() => {
  return pages.value.find(p => p.id === activePageId.value)
})

// File drawer state
// (removed unused fileDrawerOpen)

// Computed properties for IDE workspace
const allWorkspaceFiles = computed(() => {
  // Combine all files from all pages into a flat structure
  const files = {}
  pages.value.forEach((page) => {
    if (page.files) {
      Object.keys(page.files).forEach((filename) => {
        const pageFolderName = page.title.toLowerCase().replace(/\s+/g, '-')
        const fullPath = `${pageFolderName}/${filename}`
        files[fullPath] = page.files[filename]
      })
    }
  })
  return files
})

const currentActiveFile = computed(() => {
  // Return the active file from the current page, with folder prefix
  const page = currentPage.value
  if (page && page.activeFile) {
    const pageFolderName = page.title.toLowerCase().replace(/\s+/g, '-')
    return `${pageFolderName}/${page.activeFile}`
  }
  return null
})

// Check if user has workspace and load available workspaces
onMounted(async () => {
  try {
    // Load available workspaces from localStorage
    const localWorkspaces = getLocalWorkspaces()
    availableWorkspaces.value = localWorkspaces

    // Get current workspace or create one if none exists
    let currentWorkspace = getCurrentWorkspace()

    if (!currentWorkspace && localWorkspaces.length > 0) {
      // No current workspace set, use the first available
      currentWorkspace = localWorkspaces[0]
      setCurrentWorkspace(currentWorkspace.id)
    } else if (!currentWorkspace) {
      // No workspaces exist, create the first one
      currentWorkspace = createLocalWorkspace('My Workspace')
      setCurrentWorkspace(currentWorkspace.id)
      availableWorkspaces.value = [currentWorkspace]
    }

    if (currentWorkspace) {
      workspaceState.value.hasWorkspace = true
      workspaceState.value.currentWorkspace = currentWorkspace

      // Load pages from current workspace
      pages.value = currentWorkspace.pages || []

      // Set active page to the first one or create initial page
      if (pages.value.length > 0) {
        switchToPage(pages.value[0].id)
      } else {
        createNewPage()
      }
    } else {
      workspaceState.value.hasWorkspace = false
    }

    workspaceState.value.isLoading = false
  } catch (error) {
    console.error('Error loading workspace:', error)
    workspaceState.value.isLoading = false
    workspaceState.value.hasWorkspace = false
  }
})

// Command Center (Cmd+K) functionality
const selectedCommandIndex = ref(0) // For keyboard navigation in command center

// Pro Command Center (Ctrl+K) - Primary Navigation Platform
const commandCenterRef = ref(null)

// Universal AI Sidebar (Ctrl+Shift+A)
const aiSidebarRef = ref(null)

const toggleCommandCenter = () => {
  if (commandCenterRef.value) {
    commandCenterRef.value.open()
  }
}

// Handle navigation from unified command center
const _handleNavigate = (navItem) => {
  console.log('Navigate:', navItem)

  if (navItem.type === 'workspace') {
    // Open specific workspace
    setCurrentView(navItem.workspace.id)
  } else if (navItem.action && navItem.action.startsWith('switch-workspace:')) {
    const workspaceType = navItem.action.split(':')[1]
    setCurrentView(workspaceType)
  } else if (navItem.type === 'create') {
    // Create new workspace
    createNewWorkspace(navItem.title.replace('Create "', '').replace('"', ''))
  }
}

// Handle action execution from unified command center
const handleExecuteAction = (action) => {
  console.log('Execute action:', action)

  switch (action.action) {
    case 'create-workspace':
      createNewWorkspace('New Workspace')
      break
    case 'switch-workspace:ide':
      setCurrentView('ide')
      break
    case 'switch-workspace:whiteboard':
      setCurrentView('whiteboard')
      break
    case 'switch-workspace:database':
      setCurrentView('database')
      break
    case 'switch-workspace:graph3d':
      setCurrentView('graph3d')
      break
    case 'global-search':
      // Implement global search
      console.log('Global search triggered')
      break
  }
}

// Handle command center execution - Professional version
const handleCommandCenterExecute = (execution) => {
  console.log('Command center execute:', execution)

  switch (execution.type) {
    case 'file':
      // Open file
      if (execution.data.path) {
        // Handle file opening logic here
        console.log('Open file:', execution.data.path)
      }
      break

    case 'command':
      handleCommand(execution.action, execution.data)
      break

    case 'quick':
      handleQuickAction(execution.action, execution.data)
      break

    default:
      console.log('Unknown execution type:', execution.type)
  }
}

const handleCommand = (action, _data) => {
  switch (action) {
    case 'create-file':
      // Show create file dialog or create file directly
      console.log('Create new file')
      addNewPage() // Use existing function
      break

    case 'create-folder':
      console.log('Create new folder')
      break

    case 'git-status':
      console.log('Show git status')
      break

    case 'open-terminal':
      console.log('Open terminal')
      break

    default:
      console.log('Unknown command:', action)
  }
}

const handleQuickAction = (action, _data) => {
  switch (action) {
    case 'daily-notes':
      console.log('Open daily notes')
      break

    case 'tasks':
      console.log('Open task list')
      break

    default:
      console.log('Unknown quick action:', action)
  }
}

// Command Center tab switching
const switchCommandCenterTab = (tab) => {
  commandCenter.value.activeTab = tab
  if (tab === 'ai') {
    nextTick(() => {
      const aiInput = document.getElementById('ai-input')
      if (aiInput) {
        aiInput.focus()
        // Scroll to bottom when opening AI tab
        setTimeout(() => {
          if (aiChat.value.messages.length > 0) {
            scrollToBottom(false) // Fast scroll
          }
        }, 100)
      }
    })
  } else if (tab === 'search') {
    nextTick(() => {
      document.getElementById('command-center-input')?.focus()
    })
  }
}

// AI Chat functions
const sendAIMessage = async (message) => {
  if (!message.trim()) return

  // Clear any previous errors
  aiChat.value.error = null

  // Validate settings first
  const validationError = validateAISettings()
  if (validationError) {
    aiChat.value.error = validationError
    return
  }

  // Add user message
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: message.trim(),
    timestamp: new Date()
  }
  aiChat.value.messages.push(userMessage)
  aiChat.value.inputMessage = ''
  aiChat.value.isLoading = true

  // Auto-generate conversation title from first message
  if (aiChat.value.messages.length === 1) {
    aiChat.value.conversationTitle = message.length > 50
      ? message.substring(0, 50) + '...'
      : message
  }

  // Scroll to bottom after adding user message
  autoScrollToBottom()

  try {
    let response = ''

    switch (aiSettings.value.provider) {
      case 'ollama':
        response = await sendToOllama(message)
        break
      case 'openai':
        response = await sendToOpenAI(message)
        break
      case 'anthropic':
        response = await sendToClaude(message)
        break
      case 'gemini':
        response = await sendToGemini(message)
        break
      default:
        throw new Error('Unknown AI provider selected')
    }

    // Parse and execute any actions in the AI response
    const actionResult = await parseAndExecuteActions(response)

    // Add AI response (modified if actions were executed)
    const aiResponse = {
      id: Date.now() + 1,
      role: 'assistant',
      content: actionResult.response,
      timestamp: new Date(),
      hasActions: actionResult.modified,
      actionResults: actionResult.actionResults
    }
    aiChat.value.messages.push(aiResponse)

    // If actions were executed, add a summary
    if (actionResult.modified && actionResult.actionResults.length > 0) {
      const successfulActions = actionResult.actionResults.filter(a => a.success).length
      const failedActions = actionResult.actionResults.filter(a => !a.success).length

      if (successfulActions > 0 || failedActions > 0) {
        const summaryMessage = {
          id: Date.now() + 2,
          role: 'assistant',
          content: `📊 **Action Summary**: ${successfulActions} successful, ${failedActions} failed`,
          timestamp: new Date(),
          isActionSummary: true
        }
        aiChat.value.messages.push(summaryMessage)
      }
    }

    // Scroll to bottom after AI response
    autoScrollToBottom()
  } catch (error) {
    console.error('AI Error:', error)

    // Create user-friendly error message
    let errorContent = 'Sorry, I encountered an error: '

    if (error.message.includes('fetch')) {
      errorContent += 'Unable to connect to AI service. Please check your network connection and settings.'
    } else if (error.message.includes('API key')) {
      errorContent += 'Invalid API key. Please check your settings.'
    } else if (error.message.includes('401')) {
      errorContent += 'Authentication failed. Please check your API key.'
    } else if (error.message.includes('429')) {
      errorContent += 'Rate limit exceeded. Please try again later.'
    } else if (error.message.includes('500')) {
      errorContent += 'AI service is temporarily unavailable. Please try again later.'
    } else {
      errorContent += error.message || 'Unknown error occurred.'
    }

    const errorMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: errorContent,
      timestamp: new Date(),
      isError: true
    }
    aiChat.value.messages.push(errorMessage)

    // Scroll to bottom after error message
    autoScrollToBottom()
  } finally {
    aiChat.value.isLoading = false
  }
}

// Validate AI settings before sending
const validateAISettings = () => {
  const { provider } = aiSettings.value

  switch (provider) {
    case 'ollama':
      if (!aiSettings.value.ollamaUrl) return 'Ollama URL is required'
      if (!aiSettings.value.ollamaModel) return 'Ollama model is required'
      break
    case 'openai':
      if (!aiSettings.value.openaiApiKey) return 'OpenAI API key is required'
      break
    case 'anthropic':
      if (!aiSettings.value.anthropicApiKey) return 'Anthropic API key is required'
      break
    case 'gemini':
      if (!aiSettings.value.geminiApiKey) return 'Gemini API key is required'
      break
    default:
      return 'Please select an AI provider'
  }
  return null
}

// Message container ref for better scrolling control
const aiMessagesContainer = ref(null)

// Auto-scroll to bottom of messages with smooth behavior
const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (aiMessagesContainer.value) {
      aiMessagesContainer.value.scrollTo({
        top: aiMessagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  })
}

// Check if user has scrolled up (not at bottom)
const isAtBottom = () => {
  if (!aiMessagesContainer.value) return true
  const container = aiMessagesContainer.value
  const threshold = 100 // pixels from bottom to consider "at bottom"
  return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold
}

// Auto-scroll only if user is at bottom (don't interrupt manual scrolling)
const autoScrollToBottom = () => {
  if (isAtBottom()) {
    scrollToBottom(true)
    showScrollButton.value = false
  }
}

// Handle scroll events to show/hide scroll button
const handleScroll = () => {
  if (aiMessagesContainer.value) {
    showScrollButton.value = !isAtBottom()
  }
}

// Force scroll to bottom (for button click)
const forceScrollToBottom = () => {
  scrollToBottom(true)
  showScrollButton.value = false
}

// AI Provider Functions with enhanced error handling and context
const sendToOllama = async (message) => {
  const url = aiSettings.value.ollamaUrl.replace(/\/$/, '') // Remove trailing slash
  const fullPrompt = buildContextPrompt(message)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

  try {
    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiSettings.value.ollamaModel,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: aiSettings.value.temperature,
          num_predict: aiSettings.value.maxTokens
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model '${aiSettings.value.ollamaModel}' not found. Please ensure it's installed in Ollama.`)
      }
      const errorText = await response.text()
      throw new Error(`Ollama API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    if (!data.response) {
      throw new Error('Empty response from Ollama')
    }

    return data.response.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Ollama might be processing a large request.')
    }
    if (error.message.includes('fetch')) {
      throw new Error(`Cannot connect to Ollama at ${url}. Is Ollama running?`)
    }
    throw error
  }
}

const sendToOpenAI = async (message) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const messages = buildChatHistory(message)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiSettings.value.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: aiSettings.value.temperature,
        max_tokens: aiSettings.value.maxTokens
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`

      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key')
      } else if (response.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.')
      } else if (response.status === 400) {
        throw new Error(`OpenAI request error: ${errorMessage}`)
      }

      throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI')
    }

    return data.choices[0].message.content.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('OpenAI request timed out')
    }
    throw error
  }
}

const sendToClaude = async (message) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const messages = buildChatHistory(message)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiSettings.value.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: aiSettings.value.maxTokens,
        messages: messages,
        system: aiSettings.value.systemPrompt
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`

      if (response.status === 401) {
        throw new Error('Invalid Anthropic API key')
      } else if (response.status === 429) {
        throw new Error('Anthropic rate limit exceeded. Please try again later.')
      }

      throw new Error(`Claude API error (${response.status}): ${errorMessage}`)
    }

    const data = await response.json()

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude')
    }

    return data.content[0].text.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Claude request timed out')
    }
    throw error
  }
}

const sendToGemini = async (message) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const fullPrompt = buildContextPrompt(message)

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${aiSettings.value.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: aiSettings.value.temperature,
          maxOutputTokens: aiSettings.value.maxTokens
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`

      if (response.status === 400 && errorMessage.includes('API key')) {
        throw new Error('Invalid Gemini API key')
      } else if (response.status === 429) {
        throw new Error('Gemini rate limit exceeded. Please try again later.')
      }

      throw new Error(`Gemini API error (${response.status}): ${errorMessage}`)
    }

    const data = await response.json()

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini')
    }

    const content = data.candidates[0].content.parts[0].text
    if (!content) {
      throw new Error('Empty response from Gemini')
    }

    return content.trim()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Gemini request timed out')
    }
    throw error
  }
}

// Build context prompt with system instructions and workspace context
const buildContextPrompt = (message) => {
  const context = aiWorkspaceContext.value
  let prompt = getActionSystemPrompt() + '\n\n'

  // Add current workspace info
  prompt += `CURRENT CONTEXT:\n`
  prompt += `- Workspace: ${workspaceState.value.currentWorkspace?.name || 'Unknown'}\n`
  prompt += `- Current Page: "${currentPage.value?.title || 'Untitled'}"\n`

  // Add mode-specific context
  if (context.type === 'ide') {
    prompt += `- Mode: IDE (can execute terminal commands)\n`
    prompt += `- Current File: ${context.currentFile || 'No file selected'}\n`
    if (currentPage.value?.files) {
      prompt += `- Available Files: ${Object.keys(currentPage.value.files).join(', ')}\n`
    }
  } else if (context.type === 'whiteboard') {
    prompt += `- Mode: Whiteboard (visual brainstorming)\n`
  } else if (context.type === 'database') {
    prompt += `- Mode: Database (data management)\n`
  } else if (context.type === 'blocks') {
    prompt += `- Mode: Blocks (structured content)\n`
  }

  prompt += `\nUser message: ${message}`
  return prompt
}

// Build chat history for providers that support it (OpenAI, Claude)
const buildChatHistory = (currentMessage) => {
  const context = aiWorkspaceContext.value
  let systemPrompt = getActionSystemPrompt() + '\n\n'

  // Add current context to system prompt
  systemPrompt += `CURRENT CONTEXT:\n`
  systemPrompt += `- Workspace: ${workspaceState.value.currentWorkspace?.name || 'Unknown'}\n`
  systemPrompt += `- Current Page: "${currentPage.value?.title || 'Untitled'}"\n`

  if (context.type === 'ide') {
    systemPrompt += `- Mode: IDE (can execute terminal commands)\n`
    systemPrompt += `- Current File: ${context.currentFile || 'No file selected'}\n`
    if (currentPage.value?.files) {
      systemPrompt += `- Available Files: ${Object.keys(currentPage.value.files).join(', ')}\n`
    }
  } else if (context.type === 'whiteboard') {
    systemPrompt += `- Mode: Whiteboard (visual brainstorming)\n`
  } else if (context.type === 'database') {
    systemPrompt += `- Mode: Database (data management)\n`
  } else if (context.type === 'blocks') {
    systemPrompt += `- Mode: Blocks (structured content)\n`
  }

  const messages = [
    { role: 'system', content: systemPrompt }
  ]

  // Add recent conversation history (last 10 messages to avoid token limits)
  const recentMessages = aiChat.value.messages.slice(-10)
  for (const msg of recentMessages) {
    if (!msg.isError) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }
  }

  // Add current message
  messages.push({
    role: 'user',
    content: currentMessage
  })

  return messages
}

// Additional AI utility functions
const _testingConnection = ref(false)
const _connectionStatus = ref(null)
const _showScrollButton = ref(false)

// Quick prompts for easy interaction (action-oriented)
const quickPrompts = computed(() => {
  const context = aiWorkspaceContext.value

  if (context.type === 'ide') {
    return [
      'Show me all files in this project',
      'Create a new JavaScript file',
      'Run npm install',
      'Check git status'
    ]
  } else if (context.type === 'whiteboard') {
    return [
      'Get current workspace info',
      'Create a new whiteboard page',
      'Switch to IDE mode',
      'List all my pages'
    ]
  } else if (context.type === 'database') {
    return [
      'Show workspace information',
      'Create a new database page',
      'List all files',
      'Switch to another page'
    ]
  } else {
    return [
      'Show me my workspace info',
      'Create a new page',
      'List all files',
      'Switch to IDE mode'
    ]
  }
})

// Test AI connection
const _testConnection = async () => {
  testingConnection.value = true
  connectionStatus.value = null

  try {
    const validationError = validateAISettings()
    if (validationError) {
      connectionStatus.value = { success: false, message: validationError }
      return
    }

    // Send a simple test message
    let response = ''

    switch (aiSettings.value.provider) {
      case 'ollama':
        response = await sendToOllama('Hello, this is a connection test. Please respond with just "Connection successful".')
        break
      case 'openai':
        response = await sendToOpenAI('Hello, this is a connection test. Please respond with just "Connection successful".')
        break
      case 'anthropic':
        response = await sendToClaude('Hello, this is a connection test. Please respond with just "Connection successful".')
        break
      case 'gemini':
        response = await sendToGemini('Hello, this is a connection test. Please respond with just "Connection successful".')
        break
    }

    connectionStatus.value = {
      success: true,
      message: `✅ Connection successful! AI responded: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`
    }
  } catch (error) {
    connectionStatus.value = {
      success: false,
      message: `❌ Connection failed: ${error.message}`
    }
  } finally {
    testingConnection.value = false
  }
}

// Copy to clipboard utility
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    // Could add a toast notification here
    console.log('Copied to clipboard')
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)

    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      console.log('Copied to clipboard (fallback)')
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError)
    }
    document.body.removeChild(textArea)
  }
}

// Reset all settings to defaults
const _resetAllSettings = () => {
  if (confirm('Are you sure you want to reset all AI settings to defaults? This will clear your API keys and preferences.')) {
    aiSettings.value.provider = 'ollama'
    aiSettings.value.ollamaUrl = 'http://192.168.12.236:8089'
    aiSettings.value.ollamaModel = 'gpt-oss:20b'
    aiSettings.value.openaiApiKey = ''
    aiSettings.value.anthropicApiKey = ''
    aiSettings.value.geminiApiKey = ''
    aiSettings.value.temperature = 0.7
    aiSettings.value.maxTokens = 2048
    aiSettings.value.systemPrompt = 'You are a helpful assistant integrated into a workspace application. Be concise and helpful.'

    connectionStatus.value = null
    clearConversation()
  }
}

// Handle textarea input keydown
const handleInputKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (!aiChat.value.isLoading && aiChat.value.inputMessage.trim()) {
      sendAIMessage(aiChat.value.inputMessage)
    }
  }
}

// Auto-adjust textarea height
const adjustTextareaHeight = (event) => {
  const textarea = event.target
  textarea.style.height = '40px' // Reset to minimum height
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
}

// ==== AI ACTION SYSTEM ====
// Enable AI to perform actions in the workspace

// AI Actions available to the AI - Enhanced CRUD Operations
const aiActions = {
  // ==== CREATE OPERATIONS ====

  createFile: async (filePath, content = '') => {
    const currentPageData = currentPage.value
    if (!currentPageData) {
      throw new Error('No active page to create file in')
    }

    if (!currentPageData.files) {
      currentPageData.files = {}
    }

    // Check if file already exists
    if (currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' already exists. Use editFile or writeFile to modify it.`)
    }

    currentPageData.files[filePath] = {
      content,
      lastModified: new Date(),
      createdAt: new Date(),
      language: getLanguageFromExtension(filePath),
      size: content.length
    }

    return `File '${filePath}' created successfully with ${content.length} characters`
  },

  createFolder: async (folderPath) => {
    const currentPageData = currentPage.value
    if (!currentPageData) {
      throw new Error('No active page to create folder in')
    }

    if (!currentPageData.files) {
      currentPageData.files = {}
    }

    // Create folder marker file
    const folderMarker = `${folderPath}/.folder`
    if (!currentPageData.files[folderMarker]) {
      currentPageData.files[folderMarker] = {
        content: '',
        lastModified: new Date(),
        createdAt: new Date(),
        isFolder: true,
        language: 'folder'
      }
    }

    return `Folder '${folderPath}' created successfully`
  },

  // ==== READ OPERATIONS ====

  readFile: async (filePath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    const file = currentPageData.files[filePath]
    if (!file) {
      throw new Error(`File '${filePath}' not found`)
    }

    if (file.isFolder) {
      throw new Error(`'${filePath}' is a folder, not a file`)
    }

    return {
      path: filePath,
      content: file.content || '',
      language: file.language,
      size: file.content?.length || 0,
      lastModified: file.lastModified,
      createdAt: file.createdAt
    }
  },

  readFolder: async (folderPath = '') => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      return { files: [], folders: [] }
    }

    const files = []
    const folders = new Set()

    Object.keys(currentPageData.files).forEach((path) => {
      if (folderPath === '' || path.startsWith(folderPath + '/')) {
        const relativePath = folderPath === '' ? path : path.substring(folderPath.length + 1)
        const parts = relativePath.split('/')

        if (parts.length === 1) {
          // Direct file in this folder
          if (!path.endsWith('/.folder')) {
            files.push({
              name: parts[0],
              path: path,
              type: 'file',
              language: currentPageData.files[path].language,
              size: currentPageData.files[path].content?.length || 0,
              lastModified: currentPageData.files[path].lastModified
            })
          }
        } else if (parts.length > 1) {
          // Subfolder
          folders.add(parts[0])
        }
      }
    })

    return {
      path: folderPath,
      files: files,
      folders: Array.from(folders).map(folder => ({
        name: folder,
        path: folderPath === '' ? folder : `${folderPath}/${folder}`,
        type: 'folder'
      }))
    }
  },

  listFiles: async (folderPath = '') => {
    const result = await aiActions.readFolder(folderPath)
    const allItems = [
      ...result.files.map(f => f.path),
      ...result.folders.map(f => f.path + '/')
    ]
    return allItems.sort()
  },

  searchFiles: async (searchTerm, searchContent = false) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      return []
    }

    const results = []
    const searchLower = searchTerm.toLowerCase()

    Object.entries(currentPageData.files).forEach(([path, file]) => {
      if (file.isFolder) return

      // Search by filename
      if (path.toLowerCase().includes(searchLower)) {
        results.push({
          path,
          type: 'filename',
          match: path,
          language: file.language
        })
      }

      // Search by content if requested
      if (searchContent && file.content && file.content.toLowerCase().includes(searchLower)) {
        const lines = file.content.split('\n')
        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(searchLower)) {
            results.push({
              path,
              type: 'content',
              line: index + 1,
              match: line.trim(),
              language: file.language
            })
          }
        })
      }
    })

    return results
  },

  // ==== UPDATE OPERATIONS ====

  writeFile: async (filePath, content) => {
    const currentPageData = currentPage.value
    if (!currentPageData) {
      throw new Error('No active page to write file to')
    }

    if (!currentPageData.files) {
      currentPageData.files = {}
    }

    const existingFile = currentPageData.files[filePath]
    const isNewFile = !existingFile

    currentPageData.files[filePath] = {
      content,
      lastModified: new Date(),
      createdAt: existingFile?.createdAt || new Date(),
      language: getLanguageFromExtension(filePath),
      size: content.length
    }

    return isNewFile
      ? `File '${filePath}' created with ${content.length} characters`
      : `File '${filePath}' updated (${content.length} characters)`
  },

  editFile: async (filePath, newContent) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' not found. Use createFile to create it.`)
    }

    if (currentPageData.files[filePath].isFolder) {
      throw new Error(`'${filePath}' is a folder, not a file`)
    }

    const oldSize = currentPageData.files[filePath].content?.length || 0
    currentPageData.files[filePath].content = newContent
    currentPageData.files[filePath].lastModified = new Date()
    currentPageData.files[filePath].size = newContent.length

    return `File '${filePath}' edited successfully. Size changed from ${oldSize} to ${newContent.length} characters.`
  },

  appendToFile: async (filePath, contentToAppend) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' not found. Use createFile to create it.`)
    }

    if (currentPageData.files[filePath].isFolder) {
      throw new Error(`'${filePath}' is a folder, not a file`)
    }

    const existingContent = currentPageData.files[filePath].content || ''
    const newContent = existingContent + contentToAppend

    currentPageData.files[filePath].content = newContent
    currentPageData.files[filePath].lastModified = new Date()
    currentPageData.files[filePath].size = newContent.length

    return `Content appended to '${filePath}'. New size: ${newContent.length} characters.`
  },

  prependToFile: async (filePath, contentToPrepend) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' not found. Use createFile to create it.`)
    }

    const existingContent = currentPageData.files[filePath].content || ''
    const newContent = contentToPrepend + existingContent

    currentPageData.files[filePath].content = newContent
    currentPageData.files[filePath].lastModified = new Date()
    currentPageData.files[filePath].size = newContent.length

    return `Content prepended to '${filePath}'. New size: ${newContent.length} characters.`
  },

  replaceInFile: async (filePath, searchText, replaceText) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' not found`)
    }

    const file = currentPageData.files[filePath]
    if (file.isFolder) {
      throw new Error(`'${filePath}' is a folder, not a file`)
    }

    const oldContent = file.content || ''
    const newContent = oldContent.replace(new RegExp(searchText, 'g'), replaceText)
    const replacements = (oldContent.match(new RegExp(searchText, 'g')) || []).length

    currentPageData.files[filePath].content = newContent
    currentPageData.files[filePath].lastModified = new Date()
    currentPageData.files[filePath].size = newContent.length

    return `Replaced ${replacements} occurrences of '${searchText}' with '${replaceText}' in '${filePath}'`
  },

  renameFile: async (oldPath, newPath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[oldPath]) {
      throw new Error(`File '${oldPath}' not found`)
    }

    if (currentPageData.files[newPath]) {
      throw new Error(`File '${newPath}' already exists`)
    }

    // Copy file to new path
    currentPageData.files[newPath] = {
      ...currentPageData.files[oldPath],
      lastModified: new Date()
    }

    // Remove old path using object destructuring
    const { [oldPath]: _removed, ...updatedFiles } = currentPageData.files
    currentPageData.files = updatedFiles

    return `File renamed from '${oldPath}' to '${newPath}'`
  },

  copyFile: async (sourcePath, destPath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[sourcePath]) {
      throw new Error(`Source file '${sourcePath}' not found`)
    }

    if (currentPageData.files[destPath]) {
      throw new Error(`Destination file '${destPath}' already exists`)
    }

    // Copy file
    currentPageData.files[destPath] = {
      ...currentPageData.files[sourcePath],
      createdAt: new Date(),
      lastModified: new Date()
    }

    return `File copied from '${sourcePath}' to '${destPath}'`
  },

  moveFile: async (sourcePath, destPath) => {
    // Move is rename + copy
    await aiActions.renameFile(sourcePath, destPath)
    return `File moved from '${sourcePath}' to '${destPath}'`
  },

  // ==== DELETE OPERATIONS ====

  deleteFile: async (filePath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    if (!currentPageData.files[filePath]) {
      throw new Error(`File '${filePath}' not found`)
    }

    if (currentPageData.files[filePath].isFolder) {
      throw new Error(`'${filePath}' is a folder. Use deleteFolder to delete it.`)
    }

    const { [filePath]: _deleted, ...updatedFiles } = currentPageData.files
    currentPageData.files = updatedFiles
    return `File '${filePath}' deleted successfully`
  },

  deleteFolder: async (folderPath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    let deletedCount = 0
    const filesToDelete = []

    // Find all files in this folder
    Object.keys(currentPageData.files).forEach((path) => {
      if (path.startsWith(folderPath + '/') || path === folderPath + '/.folder') {
        filesToDelete.push(path)
      }
    })

    if (filesToDelete.length === 0) {
      throw new Error(`Folder '${folderPath}' not found or already empty`)
    }

    // Delete all files in folder
    let updatedFiles = { ...currentPageData.files }
    filesToDelete.forEach((path) => {
      const { [path]: _deleted, ...remaining } = updatedFiles
      updatedFiles = remaining
      deletedCount++
    })
    currentPageData.files = updatedFiles

    return `Folder '${folderPath}' deleted successfully (${deletedCount} items removed)`
  },

  clearFolder: async (folderPath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    let deletedCount = 0
    const filesToDelete = []

    // Find all files in this folder (but keep the folder itself)
    Object.keys(currentPageData.files).forEach((path) => {
      if (path.startsWith(folderPath + '/') && path !== folderPath + '/.folder') {
        filesToDelete.push(path)
      }
    })

    // Delete all files in folder
    let updatedFiles = { ...currentPageData.files }
    filesToDelete.forEach((path) => {
      const { [path]: _deleted, ...remaining } = updatedFiles
      updatedFiles = remaining
      deletedCount++
    })
    currentPageData.files = updatedFiles

    return `Folder '${folderPath}' cleared successfully (${deletedCount} items removed)`
  },

  // ==== ADVANCED AI CAPABILITIES ====

  // Document Processing - Ingest and analyze various document formats
  processDocument: async (filePath) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      throw new Error('No files in current workspace')
    }

    const file = currentPageData.files[filePath]
    if (!file) {
      throw new Error(`File '${filePath}' not found`)
    }

    const ext = filePath.split('.').pop()?.toLowerCase()
    let processedContent = ''
    const metadata = {
      fileName: filePath,
      fileType: ext,
      size: file.size || 0,
      processedAt: new Date(),
      extractedText: '',
      structure: {},
      keywords: [],
      summary: ''
    }

    try {
      switch (ext) {
        case 'pdf':
          // Simulate PDF processing (in real implementation, use PDF.js or similar)
          processedContent = `[Simulated PDF Content Extraction from ${filePath}]\n\nThis would contain the full text extracted from the PDF document. In a real implementation, this would use libraries like PDF.js to parse the PDF and extract text, images, and metadata.`
          metadata.extractedText = processedContent
          metadata.structure = { pages: 1, hasImages: false, hasLinks: false }
          break

        case 'docx':
        case 'doc':
          // Simulate Word document processing
          processedContent = `[Simulated Word Document Processing from ${filePath}]\n\nThis would contain the full text, formatting, and structure extracted from the Word document. Real implementation would use libraries like mammoth.js or docx.js.`
          metadata.extractedText = processedContent
          metadata.structure = { sections: 1, hasImages: false, hasTable: false }
          break

        case 'txt':
        case 'md':
        case 'json':
        case 'js':
        case 'ts':
        case 'html':
        case 'css':
          // Process text-based files
          processedContent = file.content || ''
          metadata.extractedText = processedContent
          metadata.structure = {
            lines: processedContent.split('\n').length,
            characters: processedContent.length,
            words: processedContent.split(/\s+/).length
          }
          break

        default:
          throw new Error(`Document type .${ext} not supported for processing`)
      }

      // Extract keywords (simple implementation)
      const words = processedContent.toLowerCase().split(/\W+/).filter(w => w.length > 3)
      const wordCount = {}
      words.forEach((word) => {
        wordCount[word] = (wordCount[word] || 0) + 1
      })
      metadata.keywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word)

      // Generate summary (first 200 chars)
      metadata.summary = processedContent.substring(0, 200) + '...'

      // Store processed document in workspace
      const processedFileName = `${filePath}.processed.json`
      currentPageData.files[processedFileName] = {
        content: JSON.stringify(metadata, null, 2),
        lastModified: new Date(),
        createdAt: new Date(),
        language: 'json',
        size: JSON.stringify(metadata).length,
        isProcessedDocument: true
      }

      return {
        success: true,
        processedFile: processedFileName,
        metadata: metadata,
        message: `Document '${filePath}' processed successfully. Extracted ${metadata.keywords.length} keywords and created processed version at '${processedFileName}'.`
      }
    } catch (error) {
      throw new Error(`Failed to process document '${filePath}': ${error.message}`)
    }
  },

  // Semantic Search - Vector database simulation for concept-based searches
  semanticSearch: async (query, threshold = 0.7) => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      return { results: [], message: 'No files to search' }
    }

    // Simulate semantic search using keyword matching and content analysis
    const results = []
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\W+/).filter(w => w.length > 2)

    Object.entries(currentPageData.files).forEach(([path, file]) => {
      if (file.isFolder || file.isProcessedDocument) return

      const content = file.content || ''
      const contentLower = content.toLowerCase()

      // Calculate semantic similarity (simplified)
      let relevanceScore = 0
      const matchedConcepts = []

      // Direct phrase matching
      if (contentLower.includes(queryLower)) {
        relevanceScore += 0.9
        matchedConcepts.push('exact_phrase_match')
      }

      // Word matching with context
      queryWords.forEach((word) => {
        if (contentLower.includes(word)) {
          relevanceScore += 0.3
          matchedConcepts.push(word)
        }
      })

      // Concept matching (simulate semantic understanding)
      const conceptMap = {
        react: ['component', 'jsx', 'props', 'state', 'hook'],
        api: ['endpoint', 'request', 'response', 'fetch', 'axios'],
        database: ['sql', 'query', 'table', 'schema', 'migration'],
        auth: ['login', 'password', 'token', 'session', 'user'],
        style: ['css', 'design', 'layout', 'responsive', 'theme']
      }

      queryWords.forEach((queryWord) => {
        Object.entries(conceptMap).forEach(([concept, relatedWords]) => {
          if (queryWord === concept || relatedWords.includes(queryWord)) {
            relatedWords.forEach((related) => {
              if (contentLower.includes(related)) {
                relevanceScore += 0.2
                matchedConcepts.push(`${concept}->${related}`)
              }
            })
          }
        })
      })

      // Normalize score
      relevanceScore = Math.min(relevanceScore, 1.0)

      if (relevanceScore >= threshold) {
        // Find relevant snippets
        const lines = content.split('\n')
        const relevantLines = lines.filter(line =>
          queryWords.some(word => line.toLowerCase().includes(word))
        ).slice(0, 3)

        results.push({
          path,
          relevanceScore: Math.round(relevanceScore * 100) / 100,
          matchedConcepts: [...new Set(matchedConcepts)],
          snippets: relevantLines,
          fileType: file.language,
          lastModified: file.lastModified
        })
      }
    })

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return {
      query,
      results,
      totalFound: results.length,
      message: `Found ${results.length} semantically relevant results for "${query}"`
    }
  },

  // Workspace Analysis - Proactive intelligence about the workspace
  analyzeWorkspace: async () => {
    const currentPageData = currentPage.value
    if (!currentPageData) {
      throw new Error('No active workspace to analyze')
    }

    const analysis = {
      workspace: workspaceState.value.currentWorkspace?.name || 'Unknown',
      analyzedAt: new Date(),
      structure: {
        totalPages: pages.value.length,
        currentPage: currentPageData.title,
        pageType: currentPageData.isIDEMode
          ? 'IDE'
          : currentPageData.isWhiteboardMode
            ? 'Whiteboard'
            : currentPageData.isDatabaseMode ? 'Database' : 'Blocks'
      },
      files: {
        total: 0,
        byType: {},
        recentlyModified: [],
        largestFiles: [],
        emptyFiles: []
      },
      codebase: {
        languages: {},
        totalLines: 0,
        frameworks: [],
        dependencies: []
      },
      insights: [],
      suggestions: []
    }

    if (currentPageData.files) {
      const files = Object.entries(currentPageData.files)
      analysis.files.total = files.length

      files.forEach(([path, file]) => {
        if (file.isFolder) return

        // File type analysis
        const ext = path.split('.').pop()?.toLowerCase() || 'unknown'
        analysis.files.byType[ext] = (analysis.files.byType[ext] || 0) + 1

        // Language analysis
        if (file.language) {
          analysis.codebase.languages[file.language] = (analysis.codebase.languages[file.language] || 0) + 1
        }

        // Content analysis
        const content = file.content || ''
        const lines = content.split('\n').length
        analysis.codebase.totalLines += lines

        // Recently modified files (last 24 hours simulation)
        if (file.lastModified && new Date() - new Date(file.lastModified) < 24 * 60 * 60 * 1000) {
          analysis.files.recentlyModified.push({ path, modified: file.lastModified })
        }

        // Large files
        if (content.length > 5000) {
          analysis.files.largestFiles.push({ path, size: content.length })
        }

        // Empty files
        if (content.length === 0) {
          analysis.files.emptyFiles.push(path)
        }

        // Framework detection
        if (content.includes('import React') || content.includes('from "react"')) {
          if (!analysis.codebase.frameworks.includes('React')) {
            analysis.codebase.frameworks.push('React')
          }
        }
        if (content.includes('import Vue') || content.includes('<template>')) {
          if (!analysis.codebase.frameworks.includes('Vue')) {
            analysis.codebase.frameworks.push('Vue')
          }
        }
        if (path === 'package.json') {
          try {
            const pkg = JSON.parse(content)
            if (pkg.dependencies) {
              analysis.codebase.dependencies = Object.keys(pkg.dependencies)
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      })

      // Generate insights
      if (analysis.files.total === 0) {
        analysis.insights.push('📁 Empty workspace - ready for your first project!')
      } else {
        analysis.insights.push(`📊 Found ${analysis.files.total} files across ${Object.keys(analysis.files.byType).length} different types`)
      }

      if (analysis.codebase.totalLines > 1000) {
        analysis.insights.push(`📈 Large codebase with ${analysis.codebase.totalLines} lines of code`)
      }

      if (analysis.files.emptyFiles.length > 0) {
        analysis.insights.push(`⚠️ Found ${analysis.files.emptyFiles.length} empty files that might need content`)
      }

      if (analysis.codebase.frameworks.length > 0) {
        analysis.insights.push(`🔧 Using frameworks: ${analysis.codebase.frameworks.join(', ')}`)
      }

      // Generate suggestions
      if (analysis.files.byType.js || analysis.files.byType.ts) {
        if (!analysis.files.byType.json || !currentPageData.files['package.json']) {
          analysis.suggestions.push('Consider adding a package.json file to manage dependencies')
        }
        if (!currentPageData.files['README.md']) {
          analysis.suggestions.push('Add a README.md file to document your project')
        }
      }

      if (analysis.codebase.frameworks.includes('React')) {
        if (!currentPageData.files['.eslintrc.js'] && !currentPageData.files['.eslintrc.json']) {
          analysis.suggestions.push('Add ESLint configuration for better code quality')
        }
      }
    }

    return analysis
  },

  // Connection Suggestions - Find related documents and suggest links
  suggestConnections: async () => {
    const currentPageData = currentPage.value
    if (!currentPageData || !currentPageData.files) {
      return { connections: [], message: 'No files to analyze for connections' }
    }

    const connections = []
    const files = Object.entries(currentPageData.files).filter(([, file]) => !file.isFolder)

    // Analyze relationships between files
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const [pathA, fileA] = files[i]
        const [pathB, fileB] = files[j]

        const contentA = (fileA.content || '').toLowerCase()
        const contentB = (fileB.content || '').toLowerCase()

        let connectionScore = 0
        const connectionTypes = []

        // Import/export relationships
        if (contentA.includes(pathB.replace(/\.[^/.]+$/, ''))
          || contentB.includes(pathA.replace(/\.[^/.]+$/, ''))) {
          connectionScore += 0.8
          connectionTypes.push('import/export')
        }

        // Shared function names (simple detection)
        const functionsA = contentA.match(/function\s+(\w+)|const\s+(\w+)\s*=/g) || []
        const functionsB = contentB.match(/function\s+(\w+)|const\s+(\w+)\s*=/g) || []

        const sharedFunctions = functionsA.filter(func =>
          functionsB.some(funcB => func === funcB)
        )

        if (sharedFunctions.length > 0) {
          connectionScore += 0.6
          connectionTypes.push('shared_functions')
        }

        // Similar file types
        if (fileA.language === fileB.language) {
          connectionScore += 0.2
          connectionTypes.push('same_language')
        }

        // Shared keywords
        const wordsA = contentA.split(/\W+/).filter(w => w.length > 3)
        const wordsB = contentB.split(/\W+/).filter(w => w.length > 3)
        const commonWords = wordsA.filter(word => wordsB.includes(word))

        if (commonWords.length > 5) {
          connectionScore += Math.min(commonWords.length * 0.05, 0.4)
          connectionTypes.push('shared_concepts')
        }

        // Similar naming patterns
        const nameA = pathA.split('/').pop().split('.')[0]
        const nameB = pathB.split('/').pop().split('.')[0]
        if (nameA.includes(nameB) || nameB.includes(nameA)) {
          connectionScore += 0.3
          connectionTypes.push('similar_names')
        }

        if (connectionScore > 0.3) {
          connections.push({
            fileA: pathA,
            fileB: pathB,
            score: Math.round(connectionScore * 100) / 100,
            types: connectionTypes,
            suggestion: generateConnectionSuggestion(pathA, pathB, connectionTypes, connectionScore)
          })
        }
      }
    }

    // Sort by connection score
    connections.sort((a, b) => b.score - a.score)

    return {
      connections: connections.slice(0, 10), // Top 10 connections
      totalAnalyzed: files.length,
      message: `Found ${connections.length} potential connections between files`
    }
  },

  // Generative Workflow Automation - Execute complex multi-step tasks
  generateWorkflow: async (taskDescription, workflowType = 'auto') => {
    const results = []
    let workflow = []

    try {
      // Parse the task and determine workflow steps
      const taskLower = taskDescription.toLowerCase()

      if (taskLower.includes('landing page') || taskLower.includes('website')) {
        workflow = [
          { action: 'createFile', params: ['index.html', generateLandingPageHTML()] },
          { action: 'createFile', params: ['styles.css', generateLandingPageCSS()] },
          { action: 'createFile', params: ['script.js', generateLandingPageJS()] },
          { action: 'createFile', params: ['README.md', '# Landing Page\n\nA modern, responsive landing page created by AI workflow automation.'] }
        ]
      } else if (taskLower.includes('react app') || taskLower.includes('react component')) {
        workflow = [
          { action: 'createFile', params: ['package.json', generateReactPackageJSON()] },
          { action: 'createFile', params: ['src/App.js', generateReactApp()] },
          { action: 'createFile', params: ['src/index.js', generateReactIndex()] },
          { action: 'createFile', params: ['public/index.html', generateReactHTML()] },
          { action: 'createFile', params: ['README.md', '# React App\n\nCreated by AI workflow automation.'] }
        ]
      } else if (taskLower.includes('api') || taskLower.includes('express')) {
        workflow = [
          { action: 'createFile', params: ['package.json', generateAPIPackageJSON()] },
          { action: 'createFile', params: ['server.js', generateExpressServer()] },
          { action: 'createFile', params: ['routes/api.js', generateAPIRoutes()] },
          { action: 'createFile', params: ['.env.example', 'PORT=3000\nDB_URL=your_database_url'] },
          { action: 'createFile', params: ['README.md', '# API Server\n\nExpress API server created by AI workflow automation.'] }
        ]
      } else {
        // Generic project structure
        workflow = [
          { action: 'createFile', params: ['README.md', `# ${taskDescription}\n\nProject created by AI workflow automation.`] },
          { action: 'createFile', params: ['src/main.js', '// Main application file\nconsole.log("Hello, World!");'] },
          { action: 'createFolder', params: ['docs'] },
          { action: 'createFile', params: ['docs/setup.md', '# Setup Instructions\n\n1. Clone the repository\n2. Install dependencies\n3. Run the application'] }
        ]
      }

      // Execute workflow steps
      for (const step of workflow) {
        try {
          const result = await aiActions[step.action](...step.params)
          results.push({
            step: `${step.action}(${step.params.map(p => `"${p}"`).join(', ')})`,
            result: result,
            success: true
          })
        } catch (error) {
          results.push({
            step: `${step.action}(${step.params.map(p => `"${p}"`).join(', ')})`,
            error: error.message,
            success: false
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const totalSteps = results.length

      return {
        taskDescription,
        workflowType,
        steps: results,
        summary: `Workflow completed: ${successCount}/${totalSteps} steps successful`,
        success: successCount === totalSteps
      }
    } catch (error) {
      throw new Error(`Failed to generate workflow for "${taskDescription}": ${error.message}`)
    }
  },

  // Workspace operations
  getWorkspaceInfo: async () => {
    const info = {
      currentWorkspace: workspaceState.value.currentWorkspace?.name || 'Unknown',
      currentPage: currentPage.value?.title || 'Untitled',
      pageType: currentPage.value?.isIDEMode
        ? 'IDE'
        : currentPage.value?.isWhiteboardMode
          ? 'Whiteboard'
          : currentPage.value?.isDatabaseMode ? 'Database' : 'Blocks',
      totalPages: pages.value.length,
      files: await aiActions.listFiles()
    }
    return info
  },

  switchPage: async (pageTitle) => {
    const targetPage = pages.value.find(p => p.title.toLowerCase().includes(pageTitle.toLowerCase()))
    if (targetPage) {
      switchToPage(targetPage.id)
      return `Switched to page '${targetPage.title}'`
    }
    throw new Error(`Page containing '${pageTitle}' not found`)
  },

  createPage: async (title, type = 'blocks') => {
    const newPage = createNewPage(title)
    if (type === 'ide') {
      toggleIDEMode(newPage.id)
    } else if (type === 'whiteboard') {
      toggleWhiteboardMode(newPage.id)
    } else if (type === 'database') {
      toggleDatabaseMode(newPage.id)
    }
    return `Created new ${type} page '${title}'`
  },

  // Terminal operations (when in IDE mode)
  executeCommand: async (command) => {
    if (!currentPage.value?.isIDEMode) {
      throw new Error('Terminal commands can only be executed in IDE mode')
    }

    // Simulate command execution (in real implementation, this would use a backend)
    const simulatedResults = {
      'ls': 'file1.js\nfile2.ts\npackage.json\nREADME.md',
      'pwd': '/workspace/current-project',
      'git status': 'On branch main\nnothing to commit, working tree clean',
      'npm install': 'added 125 packages in 3.2s',
      'node --version': 'v18.17.0',
      'npm --version': '9.6.7'
    }

    const result = simulatedResults[command] || `Command executed: ${command}\n[Simulated output - real terminal integration needed]`

    return {
      command,
      output: result,
      exitCode: 0
    }
  },

  // ==== PROJECT-WIDE CONTEXT AWARENESS ACTIONS ====

  analyzeWorkspace: async () => {
    const context = await getWorkspaceContextSummary()
    return {
      summary: `Workspace "${context.workspace.name}" contains ${context.workspace.totalPages} pages with ${context.project.totalFiles} files total.`,
      analysis: context.project,
      insights: context.project.insights,
      recentActivity: context.currentContext.recentFiles,
      currentMode: context.currentContext.workspaceMode
    }
  },

  getProjectSuggestions: async () => {
    const suggestions = await workspaceMonitor.checkForSuggestions()
    return {
      count: suggestions.length,
      suggestions: suggestions.map(s => ({
        type: s.type,
        message: s.message,
        actionable: true
      }))
    }
  },

  analyzeFileConnections: async (filePath) => {
    const connections = await getSuggestedConnections(filePath)
    return {
      file: filePath,
      connectionCount: connections.length,
      connections: connections
    }
  },

  getWorkspaceInsights: async () => {
    const analysis = await analyzeWorkspaceContext()
    const insights = [
      ...analysis.insights,
      `Total complexity score: ${analysis.codeComplexity} lines`,
      `Most recent activity: ${analysis.lastActivity ? new Date(analysis.lastActivity).toLocaleString() : 'No recent activity'}`
    ]

    return {
      totalFiles: analysis.totalFiles,
      totalFolders: analysis.totalFolders,
      languages: analysis.languages,
      frameworks: Array.from(analysis.frameworks),
      insights: insights
    }
  },

  createFromTemplate: async (templateType, projectName, location = '') => {
    const templates = {
      'react-app': async () => {
        const files = [
          ['package.json', generateReactPackageJSON(projectName)],
          ['src/App.jsx', generateReactApp(projectName)],
          ['src/index.js', generateReactIndex()],
          ['public/index.html', generateReactHTML(projectName)]
        ]

        for (const [path, content] of files) {
          await aiActions.createFile(location ? `${location}/${path}` : path, content)
        }

        return `Created React app "${projectName}" with ${files.length} files`
      },

      'express-api': async () => {
        const files = [
          ['package.json', generateAPIPackageJSON(projectName)],
          ['server.js', generateExpressServer(projectName)],
          ['routes/api.js', generateAPIRoutes()]
        ]

        for (const [path, content] of files) {
          await aiActions.createFile(location ? `${location}/${path}` : path, content)
        }

        return `Created Express API "${projectName}" with ${files.length} files`
      },

      'landing-page': async () => {
        const files = [
          ['index.html', generateLandingPageHTML(projectName)],
          ['styles.css', generateLandingPageCSS()],
          ['script.js', generateLandingPageJS()]
        ]

        for (const [path, content] of files) {
          await aiActions.createFile(location ? `${location}/${path}` : path, content)
        }

        return `Created landing page "${projectName}" with ${files.length} files`
      }
    }

    const template = templates[templateType]
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}. Available: ${Object.keys(templates).join(', ')}`)
    }

    return await template()
  }
}

// Helper function to determine file language from extension
const getLanguageFromExtension = (filePath) => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const languageMap = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    vue: 'vue',
    php: 'php',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    sh: 'bash'
  }
  return languageMap[ext] || 'plaintext'
}

// ==== PROJECT-WIDE CONTEXT AWARENESS ====

// Analyze entire workspace for AI context
const analyzeWorkspaceContext = async () => {
  const analysis = {
    totalFiles: 0,
    totalFolders: 0,
    languages: {},
    frameworks: new Set(),
    dependencies: new Set(),
    projectStructure: [],
    codeComplexity: 0,
    lastActivity: null,
    insights: []
  }

  // Analyze all pages in workspace
  pages.value.forEach((page) => {
    if (!page.files) return

    Object.entries(page.files).forEach(([path, file]) => {
      if (file.isFolder) {
        analysis.totalFolders++
        return
      }

      analysis.totalFiles++

      // Language analysis
      const lang = file.language || getLanguageFromExtension(path)
      analysis.languages[lang] = (analysis.languages[lang] || 0) + 1

      // Framework detection
      if (path.includes('package.json') || path.includes('yarn.lock') || path.includes('pnpm-lock.yaml')) {
        try {
          const content = file.content || ''
          if (content.includes('react')) analysis.frameworks.add('React')
          if (content.includes('vue')) analysis.frameworks.add('Vue.js')
          if (content.includes('angular')) analysis.frameworks.add('Angular')
          if (content.includes('express')) analysis.frameworks.add('Express')
          if (content.includes('fastify')) analysis.frameworks.add('Fastify')
          if (content.includes('next')) analysis.frameworks.add('Next.js')
          if (content.includes('nuxt')) analysis.frameworks.add('Nuxt.js')
          if (content.includes('svelte')) analysis.frameworks.add('Svelte')
        } catch {
          // Ignore parsing errors
        }
      }

      // Code complexity (simple line count heuristic)
      if (file.content) {
        analysis.codeComplexity += file.content.split('\n').length
      }

      // Track last activity
      if (file.lastModified && (!analysis.lastActivity || new Date(file.lastModified) > new Date(analysis.lastActivity))) {
        analysis.lastActivity = file.lastModified
      }

      // Structure analysis
      const pathParts = path.split('/')
      if (pathParts.length > 1) {
        analysis.projectStructure.push({
          folder: pathParts[0],
          file: pathParts[pathParts.length - 1],
          depth: pathParts.length - 1
        })
      }
    })
  })

  // Generate insights
  const topLanguage = Object.keys(analysis.languages).reduce((a, b) =>
    analysis.languages[a] > analysis.languages[b] ? a : b, Object.keys(analysis.languages)[0])

  if (topLanguage) {
    analysis.insights.push(`Primary language: ${topLanguage} (${analysis.languages[topLanguage]} files)`)
  }

  if (analysis.frameworks.size > 0) {
    analysis.insights.push(`Frameworks detected: ${Array.from(analysis.frameworks).join(', ')}`)
  }

  if (analysis.totalFiles > 10) {
    analysis.insights.push(`Large project with ${analysis.totalFiles} files across ${analysis.totalFolders} folders`)
  }

  if (analysis.codeComplexity > 1000) {
    analysis.insights.push(`High complexity project (${analysis.codeComplexity} lines of code)`)
  }

  return analysis
}

// Get workspace summary for AI context
const getWorkspaceContextSummary = async () => {
  const analysis = await analyzeWorkspaceContext()
  const currentPageData = currentPage.value

  return {
    workspace: {
      name: workspaceState.value.currentWorkspace?.name || 'Unnamed Workspace',
      totalPages: pages.value.length,
      activePage: currentPageData?.title || 'No active page'
    },
    project: analysis,
    currentContext: {
      activeFiles: selectedFile.value ? [selectedFile.value] : [],
      recentFiles: getRecentFiles(),
      workspaceMode: {
        ide: currentPageData?.ideMode,
        whiteboard: currentPageData?.whiteboardMode,
        database: currentPageData?.databaseMode
      }
    }
  }
}

// Get recently modified files for context
const getRecentFiles = () => {
  const allFiles = []
  pages.value.forEach((page) => {
    if (!page.files) return
    Object.entries(page.files).forEach(([path, file]) => {
      if (!file.isFolder && file.lastModified) {
        allFiles.push({
          path,
          lastModified: new Date(file.lastModified),
          page: page.title
        })
      }
    })
  })

  return allFiles
    .sort((a, b) => b.lastModified - a.lastModified)
    .slice(0, 10)
    .map(f => `${f.path} (${f.page})`)
}

// Smart file suggestions based on context
const getSuggestedConnections = async (filePath) => {
  const currentPageData = currentPage.value
  if (!currentPageData?.files || !currentPageData.files[filePath]) {
    return []
  }

  const targetFile = currentPageData.files[filePath]
  const suggestions = []

  // Analyze file content for connections
  if (targetFile.content) {
    const content = targetFile.content.toLowerCase()

    Object.entries(currentPageData.files).forEach(([path, file]) => {
      if (path === filePath || file.isFolder) return

      // Check for import/require statements
      if (content.includes(path.replace(/\.[^/.]+$/, ''))) {
        suggestions.push({
          type: 'import',
          file: path,
          reason: 'Referenced in imports'
        })
      }

      // Check for similar functionality (same functions/classes)
      const functions = extractFunctions(targetFile.content)
      const otherFunctions = extractFunctions(file.content || '')
      const commonFunctions = functions.filter(f => otherFunctions.includes(f))

      if (commonFunctions.length > 0) {
        suggestions.push({
          type: 'similar',
          file: path,
          reason: `Shared functions: ${commonFunctions.join(', ')}`
        })
      }

      // Check for same language files in related folders
      if (file.language === targetFile.language && path.includes('/') && filePath.includes('/')) {
        const targetFolder = filePath.split('/')[0]
        const fileFolder = path.split('/')[0]
        if (targetFolder === fileFolder) {
          suggestions.push({
            type: 'related',
            file: path,
            reason: `Same folder and language (${file.language})`
          })
        }
      }
    })
  }

  return suggestions.slice(0, 5) // Limit to top 5 suggestions
}

// Extract function names from code (simple heuristic)
const extractFunctions = (code) => {
  if (!code) return []
  const patterns = [
    /function\s+(\w+)/g,
    /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
    /(\w+)\s*:\s*function/g,
    /def\s+(\w+)/g, // Python
    /public\s+\w+\s+(\w+)\s*\(/g // Java/C#
  ]

  const functions = []
  patterns.forEach((pattern) => {
    let match
    while ((match = pattern.exec(code)) !== null) {
      functions.push(match[1])
    }
  })

  return [...new Set(functions)] // Remove duplicates
}

// Smart workspace monitoring for proactive suggestions
const workspaceMonitor = {
  lastAnalysis: null,
  suggestions: [],

  async checkForSuggestions() {
    const context = await getWorkspaceContextSummary()
    const suggestions = []

    // Suggest missing files for common patterns
    if (context.project.frameworks.has('React') && !this.hasFile('src/App.js') && !this.hasFile('src/App.tsx')) {
      suggestions.push({
        type: 'missing_file',
        message: 'Consider creating an App.js or App.tsx file for your React app',
        action: 'createFile',
        params: ['src/App.tsx', this.getReactAppTemplate()]
      })
    }

    // Suggest package.json if JS/TS files exist but no package.json
    if ((context.project.languages.javascript > 0 || context.project.languages.typescript > 0)
      && !this.hasFile('package.json')) {
      suggestions.push({
        type: 'missing_config',
        message: 'JavaScript/TypeScript files detected. Consider adding a package.json',
        action: 'createFile',
        params: ['package.json', JSON.stringify({
          name: context.workspace.name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          type: 'module'
        }, null, 2)]
      })
    }

    // Suggest README if project has multiple files but no documentation
    if (context.project.totalFiles > 5 && !this.hasFile('README.md')) {
      suggestions.push({
        type: 'missing_docs',
        message: 'Large project detected. Consider adding a README.md file',
        action: 'createFile',
        params: ['README.md', `# ${context.workspace.name}\n\nProject description goes here.\n`]
      })
    }

    this.suggestions = suggestions
    this.lastAnalysis = new Date()
    return suggestions
  },

  hasFile(filename) {
    return pages.value.some(page =>
      page.files && Object.keys(page.files).some(path =>
        path === filename || path.endsWith('/' + filename)
      )
    )
  },

  getReactAppTemplate() {
    return `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${workspaceState.value.currentWorkspace?.name || 'My App'}</h1>
      </header>
    </div>
  );
}

export default App;`
  }
}

// ==== HELPER FUNCTIONS FOR GENERATIVE WORKFLOWS ====

// Helper function for connection suggestions
const generateConnectionSuggestion = (fileA, fileB, types, score) => {
  if (types.includes('import/export')) {
    return `Strong dependency relationship detected between ${fileA} and ${fileB}`
  }
  if (types.includes('shared_functions')) {
    return `These files share common functions and might benefit from refactoring into a shared module`
  }
  if (types.includes('shared_concepts') && score > 0.6) {
    return `High conceptual similarity - consider organizing these files in the same directory`
  }
  return `Moderate relationship detected - consider reviewing for potential consolidation`
}

// Code generation helpers for workflows
const generateLandingPageHTML = (projectName = 'AI Generated Landing Page') => {
  return '<!DOCTYPE html><html><head><title>' + projectName + '</title></head><body><h1>Landing Page</h1></body></html>'
}

// Original function was removed due to Vue template parsing issues with template literals

const generateLandingPageCSS = () => `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
}

header {
    background: #fff;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 5%;
    max-width: 1200px;
    margin: 0 auto;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: #007bff;
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-links a {
    text-decoration: none;
    color: #333;
    transition: color 0.3s;
}

.nav-links a:hover {
    color: #007bff;
}

.hero {
    text-align: center;
    padding: 5rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
}

.cta-button {
    background: #ff6b6b;
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 50px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
}

.cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255,107,107,0.4);
}

.features {
    padding: 5rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.features h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 3rem;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.feature-card {
    background: #f8f9fa;
    padding: 2rem;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-card h3 {
    color: #007bff;
    margin-bottom: 1rem;
}

footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem;
}

@media (max-width: 768px) {
    .hero h1 {
        font-size: 2rem;
    }
    
    .nav-links {
        gap: 1rem;
    }
}`

const generateLandingPageJS = () => `// AI Generated Landing Page JavaScript

// Smooth scrolling function
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth'
        });
    }
}

// Add scroll animations
window.addEventListener('scroll', () => {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        const cardVisible = 150;
        
        if (cardTop < window.innerHeight - cardVisible) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
});

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state for animations
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s, transform 0.6s';
    });
    
    console.log('AI Generated Landing Page loaded successfully!');
});`

const generateReactPackageJSON = (projectName = 'react-app') => `{
  "name": "${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}",
  "version": "1.0.0",
  "description": "React app created by AI workflow automation",
  "main": "src/index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}`

const generateReactApp = (projectName = 'My App') => `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [todos, setTodos] = useState(['Learn React', 'Build awesome apps']);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, newTodo]);
      setNewTodo('');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>${projectName}</h1>
        <p>Welcome to your new React application!</p>
        
        <div className="counter-section">
          <h2>Counter: {count}</h2>
          <button onClick={() => setCount(count - 1)}>-</button>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>

        <div className="todo-section">
          <h2>Todo List</h2>
          <div className="todo-input">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add new todo..."
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            />
            <button onClick={addTodo}>Add</button>
          </div>
          <ul className="todo-list">
            {todos.map((todo, index) => (
              <li key={index} className="todo-item">{todo}</li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;`

const generateReactIndex = () => `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`

const generateReactHTML = (projectName = 'React App') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${projectName}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    
    .App {
      text-align: center;
    }
    
    .App-header {
      padding: 2rem;
      color: white;
    }
    
    .counter-section, .todo-section {
      margin: 2rem 0;
      background: rgba(255,255,255,0.1);
      padding: 1.5rem;
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }
    
    button {
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 10px 20px;
      margin: 0 5px;
      border-radius: 5px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    button:hover {
      transform: translateY(-2px);
    }
    
    input {
      padding: 10px;
      margin: 0 10px;
      border: none;
      border-radius: 5px;
      width: 200px;
    }
    
    .todo-list {
      list-style: none;
      padding: 0;
    }
    
    .todo-item {
      background: rgba(255,255,255,0.2);
      margin: 0.5rem 0;
      padding: 0.5rem;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>`

const generateAPIPackageJSON = (projectName = 'express-api') => `{
  "name": "${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}",
  "version": "1.0.0",
  "description": "Express API server created by AI workflow automation",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^6.1.5",
    "dotenv": "^16.0.3",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  }
}`

const generateExpressServer = (_projectName = 'My API') => `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'AI Generated API Server is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the AI Generated API',
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'GET /api/users',
      'POST /api/users',
      'GET /api/data'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 AI Generated API Server running on port \${PORT}\`);
  console.log(\`📡 Health check: http://localhost:\${PORT}/health\`);
});

module.exports = app;`

const generateAPIRoutes = () => `const express = require('express');
const router = express.Router();

// Sample data store (use a real database in production)
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

let dataStore = {
  items: ['Item 1', 'Item 2', 'Item 3'],
  analytics: {
    totalRequests: 0,
    lastAccess: new Date()
  }
};

// Middleware to track requests
router.use((req, res, next) => {
  dataStore.analytics.totalRequests++;
  dataStore.analytics.lastAccess = new Date();
  next();
});

// GET all users
router.get('/users', (req, res) => {
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// GET user by ID
router.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

// POST new user
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }
  
  const newUser = {
    id: Math.max(...users.map(u => u.id), 0) + 1,
    name,
    email
  };
  
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: newUser
  });
});

// GET analytics data
router.get('/data', (req, res) => {
  res.json({
    success: true,
    data: dataStore
  });
});

// POST new item
router.post('/data/items', (req, res) => {
  const { item } = req.body;
  
  if (!item) {
    return res.status(400).json({
      success: false,
      message: 'Item is required'
    });
  }
  
  dataStore.items.push(item);
  
  res.json({
    success: true,
    message: 'Item added successfully',
    data: dataStore.items
  });
});

module.exports = router;`

// ==== ACTION PARSING AND EXECUTION ====

// Parse AI response for action commands and execute them
const parseAndExecuteActions = async (aiResponse) => {
  const actionRegex = /\[ACTION:(\w+)(?:\((.*?)\))?\]/g
  let match
  const actions = []

  while ((match = actionRegex.exec(aiResponse)) !== null) {
    const [fullMatch, actionName, params] = match
    actions.push({
      fullMatch,
      actionName,
      params: params ? params.split(',').map(p => p.trim().replace(/['"]/g, '')) : []
    })
  }

  if (actions.length === 0) {
    return { modified: false, response: aiResponse, actionResults: [] }
  }

  let modifiedResponse = aiResponse
  const actionResults = []

  // Execute actions sequentially
  for (const action of actions) {
    try {
      let result
      const { actionName, params } = action

      switch (actionName) {
        case 'readFile':
          result = await aiActions.readFile(params[0])
          break
        case 'writeFile':
          result = await aiActions.writeFile(params[0], params[1] || '')
          break
        case 'createFile':
          result = await aiActions.createFile(params[0], params[1] || '')
          break
        case 'deleteFile':
          result = await aiActions.deleteFile(params[0])
          break
        case 'listFiles':
          result = await aiActions.listFiles()
          break
        case 'getWorkspaceInfo':
          result = await aiActions.getWorkspaceInfo()
          break
        case 'switchPage':
          result = await aiActions.switchPage(params[0])
          break
        case 'createPage':
          result = await aiActions.createPage(params[0], params[1] || 'blocks')
          break
        case 'executeCommand':
          result = await aiActions.executeCommand(params[0])
          break
        case 'readFolder':
          result = await aiActions.readFolder(params[0] || '')
          break
        case 'createFolder':
          result = await aiActions.createFolder(params[0])
          break
        case 'editFile':
          result = await aiActions.editFile(params[0], params[1])
          break
        case 'appendToFile':
          result = await aiActions.appendToFile(params[0], params[1])
          break
        case 'prependToFile':
          result = await aiActions.prependToFile(params[0], params[1])
          break
        case 'replaceInFile':
          result = await aiActions.replaceInFile(params[0], params[1], params[2])
          break
        case 'renameFile':
          result = await aiActions.renameFile(params[0], params[1])
          break
        case 'copyFile':
          result = await aiActions.copyFile(params[0], params[1])
          break
        case 'moveFile':
          result = await aiActions.moveFile(params[0], params[1])
          break
        case 'deleteFolder':
          result = await aiActions.deleteFolder(params[0])
          break
        case 'searchFiles':
          result = await aiActions.searchFiles(params[0], params[1] === 'true')
          break
        case 'processDocument':
          result = await aiActions.processDocument(params[0])
          break
        case 'semanticSearch':
          result = await aiActions.semanticSearch(params[0])
          break
        case 'analyzeWorkspace':
          result = await aiActions.analyzeWorkspace()
          break
        case 'generateWorkflow':
          result = await aiActions.generateWorkflow(params[0], params[1])
          break
        case 'suggestConnections':
          result = await aiActions.suggestConnections()
          break
        default:
          throw new Error(`Unknown action: ${actionName}`)
      }

      actionResults.push({
        action: actionName,
        params,
        result,
        success: true
      })

      // Replace action marker with result
      const resultText = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
      modifiedResponse = modifiedResponse.replace(action.fullMatch, `✅ **Action Complete**: ${resultText}`)
    } catch (error) {
      actionResults.push({
        action: action.actionName,
        params: action.params,
        error: error.message,
        success: false
      })

      // Replace action marker with error
      modifiedResponse = modifiedResponse.replace(action.fullMatch, `❌ **Action Failed**: ${error.message}`)
    }
  }

  return {
    modified: true,
    response: modifiedResponse,
    actionResults,
    originalResponse: aiResponse
  }
}

// Enhanced system prompt for action-based AI
const getActionSystemPrompt = () => {
  return `${aiSettings.value.systemPrompt}

IMPORTANT: You have access to workspace actions. You can perform real actions using these commands:

File Operations:
- [ACTION:readFile("filename")] - Read a file
- [ACTION:writeFile("filename", "content")] - Write/update a file
- [ACTION:createFile("filename", "content")] - Create a new file
- [ACTION:deleteFile("filename")] - Delete a file
- [ACTION:listFiles()] - List all files
- [ACTION:searchFiles("term", true)] - Search files by name and content
- [ACTION:replaceInFile("filename", "search", "replace")] - Replace text in file

Workspace Operations:
- [ACTION:getWorkspaceInfo()] - Get current workspace info
- [ACTION:switchPage("page_name")] - Switch to a different page
- [ACTION:createPage("title", "type")] - Create new page (type: blocks, ide, whiteboard, database)

Terminal Operations (IDE mode only):
- [ACTION:executeCommand("command")] - Run terminal commands

Project-Wide Intelligence:
- [ACTION:analyzeWorkspace()] - Get comprehensive workspace analysis with insights
- [ACTION:getWorkspaceInsights()] - Get detailed project insights and complexity metrics
- [ACTION:getProjectSuggestions()] - Get proactive suggestions for improving the project
- [ACTION:analyzeFileConnections("filename")] - Analyze relationships between files
- [ACTION:createFromTemplate("template-type", "project-name", "location")] - Generate complete projects (react-app, express-api, landing-page)

Document Processing & Search:
- [ACTION:processDocument("filename")] - Extract and analyze document content
- [ACTION:semanticSearch("query")] - Find conceptually related content across workspace
- [ACTION:getConnectionSuggestions("filename")] - Get smart suggestions for related files

Generative Workflows:
- [ACTION:generateProject("type", "name")] - Create complete project structures
- [ACTION:buildWorkflow("description")] - Execute complex multi-step development tasks

When users ask you to DO something (not just explain), use these actions. For example:
- "Create a new file called test.js" → Use [ACTION:createFile("test.js", "// New file")]
- "Show me the contents of package.json" → Use [ACTION:readFile("package.json")]
- "Run npm install" → Use [ACTION:executeCommand("npm install")]
- "Analyze my workspace" → Use [ACTION:analyzeWorkspace()]
- "Create a React app called MyProject" → Use [ACTION:createFromTemplate("react-app", "MyProject")]
- "Find files related to authentication" → Use [ACTION:semanticSearch("authentication")]
- "What files are connected to this component?" → Use [ACTION:analyzeFileConnections("Component.jsx")]

The AI can now:
1. Perform comprehensive CRUD operations on files and folders
2. Process and analyze various document formats
3. Create semantic search indexes and find conceptually related content  
4. Execute interactive terminal commands and show the process
5. Monitor workspace and provide proactive suggestions
6. Generate complete projects from high-level descriptions

Always provide helpful context around the actions you take.`
}

// File drawer toggle

// Sidebar state and controls
const sidebarVisible = ref(false)
const _sidebarExpanded = ref(true)

// Folder drawer state (minimal thin drawer behind line numbers)
const folderDrawerOpen = ref(false)

const toggleFolderDrawer = () => {
  folderDrawerOpen.value = !folderDrawerOpen.value
}

// Helper functions for status bar
const getFileLanguage = (filePath) => {
  if (!filePath) return 'Ready'
  const file = allWorkspaceFiles.value[filePath]
  if (!file) return 'Text'
  return file.language || 'Text'
}

// Helper function to organize files into a tree structure
const _organizeFilesIntoTree = (files) => {
  const tree = {}

  Object.keys(files).forEach((filePath) => {
    const parts = filePath.split('/')
    let current = tree

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          isFolder: index < parts.length - 1,
          children: index < parts.length - 1 ? {} : null,
          data: index === parts.length - 1 ? files[filePath] : null,
          fullPath: parts.slice(0, index + 1).join('/')
        }
      }
      if (current[part].children) {
        current = current[part].children
      }
    })
  })

  return tree
}

const getFileCharCount = (filePath) => {
  if (!filePath) return 0
  const file = allWorkspaceFiles.value[filePath]
  if (!file) return 0
  return (file.content || '').length
}

const getFileLineCount = (filePath) => {
  if (!filePath) return 1
  const file = allWorkspaceFiles.value[filePath]
  if (!file) return 1
  return Math.max(1, (file.content || '').split('\n').length)
}

// File and folder management functions
const _creatingNewFile = ref(false)
const _creatingNewFolder = ref(false)
const _newFileName = ref('')
const _newFolderName = ref('')

const startCreateNewFile = () => {
  creatingNewFile.value = true
  newFileName.value = ''
  nextTick(() => {
    // Focus the input when it appears
    const input = document.querySelector('.new-file-input')
    if (input) input.focus()
  })
}

const startCreateNewFolder = () => {
  creatingNewFolder.value = true
  newFolderName.value = ''
  nextTick(() => {
    // Focus the input when it appears
    const input = document.querySelector('.new-folder-input')
    if (input) input.focus()
  })
}

const startCreateSubfolder = (pageId) => {
  // Switch to the parent page and create a new file with folder path syntax
  switchToPage(pageId)
  startCreateNewFile()
}

const confirmCreateFile = () => {
  if (!newFileName.value.trim()) {
    creatingNewFile.value = false
    return
  }

  const currentPage = pages.value.find(p => p.id === activePageId.value)
  if (!currentPage) {
    creatingNewFile.value = false
    return
  }

  if (!currentPage.files) {
    currentPage.files = {}
  }

  // Support subfolder creation (e.g., "components/Button.vue")
  const filePath = newFileName.value.trim()

  // Determine file language from extension
  const extension = filePath.split('.').pop()?.toLowerCase()
  const languageMap = {
    js: 'javascript',
    ts: 'typescript',
    html: 'html',
    css: 'css',
    scss: 'scss',
    py: 'python',
    md: 'markdown',
    json: 'json',
    vue: 'vue'
  }

  const language = languageMap[extension] || 'text'
  const template = getFileTemplate(filePath, language)

  // Create the file with full path (including subfolders)
  currentPage.files[filePath] = {
    content: template,
    language: language,
    isFolder: false
  }

  // Switch to the new file
  const pageFolderName = currentPage.title.toLowerCase().replace(/\s+/g, '-')
  selectFile(`${pageFolderName}/${filePath}`)

  creatingNewFile.value = false
  newFileName.value = ''
}

const confirmCreateFolder = () => {
  if (!newFolderName.value.trim()) {
    creatingNewFolder.value = false
    return
  }

  createNewPage(newFolderName.value)
  creatingNewFolder.value = false
  newFolderName.value = ''
}

const cancelCreate = () => {
  creatingNewFile.value = false
  creatingNewFolder.value = false
  newFileName.value = ''
  newFolderName.value = ''
}

const getFileTemplate = (filename, language) => {
  const templates = {
    javascript: '// JavaScript file\nconsole.log("Hello World");\n',
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',
    css: '/* CSS styles */\nbody {\n    margin: 0;\n    padding: 20px;\n    font-family: Arial, sans-serif;\n}\n',
    python: '# Python script\nprint("Hello World")\n',
    markdown: '# ' + filename.replace('.md', '') + '\n\nYour content here...\n',
    json: '{\n    "name": "example",\n    "version": "1.0.0"\n}\n'
  }

  return templates[language] || `// ${filename}\n\n`
}

const deleteFileFromPage = (pageId, filename) => {
  if (!confirm(`Are you sure you want to delete ${filename}?`)) return

  const page = pages.value.find(p => p.id === pageId)
  if (page && page.files) {
    const { [filename]: _deleted, ...remaining } = page.files
    page.files = remaining

    // If this was the active file, clear it
    const pageFolderName = page.title.toLowerCase().replace(/\s+/g, '-')
    const fullPath = `${pageFolderName}/${filename}`
    if (currentActiveFile.value === fullPath) {
      // Switch to another file in the page or clear
      const remainingFiles = Object.keys(page.files)
      if (remainingFiles.length > 0) {
        selectFile(`${pageFolderName}/${remainingFiles[0]}`)
      } else {
        // No files left, clear active file
        currentActiveFile.value = null
      }
    }
  }
}

const _showFileContextMenu = (_event, pageId, filename) => {
  // Simple context menu for now - could be enhanced
  const action = confirm(`Rename ${filename}? (Cancel to keep current name)`)
  if (action) {
    const newName = prompt('Enter new filename:', filename)
    if (newName && newName !== filename) {
      renameFileInPage(pageId, filename, newName)
    }
  }
}

const renameFileInPage = (pageId, oldName, newName) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page && page.files && page.files[oldName]) {
    // Copy file content to new name
    page.files[newName] = { ...page.files[oldName] }
    const { [oldName]: _deleted, ...remaining } = page.files
    page.files = remaining

    // Update active file if it was the renamed file
    const pageFolderName = page.title.toLowerCase().replace(/\s+/g, '-')
    const oldFullPath = `${pageFolderName}/${oldName}`
    const newFullPath = `${pageFolderName}/${newName}`

    if (currentActiveFile.value === oldFullPath) {
      selectFile(newFullPath)
    }
  }
}

const toggleSidebar = () => {
  if (!sidebarVisible.value) {
    // Open sidebar
    sidebarVisible.value = true
    sidebarExpanded.value = true
  } else {
    // Close sidebar
    closeSidebar()
  }
}

const closeSidebar = () => {
  sidebarExpanded.value = false
  // Wait for animation to complete before hiding
  setTimeout(() => {
    if (!sidebarExpanded.value) {
      sidebarVisible.value = false
    }
  }, 300)
}

const toggleTerminal = () => {
  terminalVisible.value = !terminalVisible.value
  if (terminalVisible.value) {
    terminalExpanded.value = true
  }
}

// AI Assistant Sidebar state
const isAIActive = ref(false)

const toggleAISidebar = () => {
  if (aiSidebarRef.value) {
    if (aiSidebarRef.value.isOpen.value) {
      aiSidebarRef.value.close()
    } else {
      aiSidebarRef.value.open()
    }
  }
}

const handleAIActivityChange = (active) => {
  isAIActive.value = active
}

const toggleTerminalSize = () => {
  terminalExpanded.value = !terminalExpanded.value
}

const closeTerminal = () => {
  terminalVisible.value = false
}

// Note: GraphView3D component handles its own 3D graph logic internally

// 3D Graph toggle function
const toggle3DGraph = () => {
  show3DGraph.value = !show3DGraph.value
}

// Terminal component ref
const _terminalRef = ref(null)

const clearTerminal = () => {
  if (terminalRef.value && terminalRef.value.clearTerminal) {
    terminalRef.value.clearTerminal(activeTerminalTab.value)
  }
}

// Terminal tab management
const createNewTerminalTab = async () => {
  if (terminalTabs.value.length >= maxTerminalTabs) return

  const newTabNumber = terminalTabs.value.length + 1
  const newTab = {
    id: `terminal-${newTabNumber}`,
    name: `Terminal ${newTabNumber}`,
    active: false
  }

  // Set all tabs as inactive
  terminalTabs.value.forEach(tab => tab.active = false)
  // Add new tab as active
  newTab.active = true
  terminalTabs.value.push(newTab)
  activeTerminalTab.value = newTab.id

  // Create the terminal instance for the new tab
  if (terminalRef.value && terminalRef.value.createNewTerminal) {
    await terminalRef.value.createNewTerminal(newTab.id)
  }
}

const switchTerminalTab = (tabId) => {
  terminalTabs.value.forEach(tab => tab.active = (tab.id === tabId))
  activeTerminalTab.value = tabId
}

const closeTerminalTab = (tabId) => {
  if (terminalTabs.value.length <= 1) return // Keep at least one tab

  const tabIndex = terminalTabs.value.findIndex(tab => tab.id === tabId)
  if (tabIndex === -1) return

  terminalTabs.value.splice(tabIndex, 1)

  // If we closed the active tab, switch to another
  if (activeTerminalTab.value === tabId) {
    const newActiveIndex = Math.max(0, tabIndex - 1)
    const newActiveTab = terminalTabs.value[newActiveIndex]
    if (newActiveTab) {
      switchTerminalTab(newActiveTab.id)
    }
  }
}

// Ref to CleanEditor component
const _cleanEditorRef = ref(null)

const openSettings = () => {
  // Open the enhanced command center
  commandCenterRef.value?.open()
  // The enhanced version doesn't have mode switching - it uses intelligent intent detection
}

const openLiveServer = () => {
  const currentPage = pages.value.find(p => p.id === activePageId.value)
  if (!currentPage) {
    alert('Please select a workspace first')
    return
  }

  // Generate a preview URL - in a real implementation this would start a dev server
  const previewUrl = generatePreviewUrl(currentPage)

  // Open in new tab/window
  window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
}

const generatePreviewUrl = (page) => {
  // Create a blob URL with the HTML content for instant preview
  if (page.files && page.files['index.html']) {
    const htmlContent = page.files['index.html'].content
    const cssContent = page.files['style.css']?.content || ''
    const jsContent = page.files['script.js']?.content || ''

    // Inject CSS and JS into HTML if they exist
    let fullHtml = htmlContent

    if (cssContent) {
      fullHtml = fullHtml.replace(/<link[^>]*href="style\.css"[^>]*>/i, '<style>' + cssContent + '</style>')
    }

    if (jsContent) {
      const scriptRegex = new RegExp('<script[^>]*src="script\\.js"[^>]*><\\/script>', 'i')
      fullHtml = fullHtml.replace(scriptRegex, '<script>' + jsContent + '<' + '/script>')
    }

    const blob = new Blob([fullHtml], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }

  // Fallback: create a simple preview page
  const filesList = page.files
    ? Object.keys(page.files).map(filename =>
        '<div class="file-item">📄 ' + filename + '</div>'
      ).join('')
    : ''

  const fallbackHtml
    = '<!DOCTYPE html>'
      + '<html lang="en">'
      + '<head>'
      + '<meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      + '<title>' + page.title + ' - Live Preview</title>'
      + '<style>'
      + 'body {'
      + 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
      + 'line-height: 1.6;'
      + 'color: #333;'
      + 'max-width: 800px;'
      + 'margin: 0 auto;'
      + 'padding: 2rem;'
      + 'background: #f8f9fa;'
      + '}'
      + '.preview-info {'
      + 'background: white;'
      + 'padding: 2rem;'
      + 'border-radius: 8px;'
      + 'box-shadow: 0 2px 10px rgba(0,0,0,0.1);'
      + 'text-align: center;'
      + '}'
      + 'h1 { color: #2d3748; margin-bottom: 1rem; }'
      + 'p { color: #718096; margin-bottom: 1rem; }'
      + '.files-list {'
      + 'text-align: left;'
      + 'margin-top: 2rem;'
      + 'padding: 1rem;'
      + 'background: #f7fafc;'
      + 'border-radius: 6px;'
      + '}'
      + '.file-item {'
      + 'margin: 0.5rem 0;'
      + 'padding: 0.5rem;'
      + 'background: white;'
      + 'border-radius: 4px;'
      + 'font-family: monospace;'
      + 'font-size: 0.9rem;'
      + '}'
      + '</style>'
      + '</head>'
      + '<body>'
      + '<div class="preview-info">'
      + '<h1>🚀 Live Preview: ' + page.title + '</h1>'
      + '<p>Your workspace is ready for development!</p>'
      + (page.files
        ? '<div class="files-list">'
        + '<h3>Project Files:</h3>'
        + filesList
        + '</div>'
        : '<p>No files in this workspace yet. Start coding!</p>')
      + '</div>'
      + '</body>'
      + '</html>'

  const blob = new Blob([fallbackHtml], { type: 'text/html' })
  return URL.createObjectURL(blob)
}

// File operations for the new layout
const onFileSelect = (filePath) => {
  // Switch to the selected file
  selectFile(filePath)
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e) => {
    // Cmd+K or Ctrl+K for Pro Command Center
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      toggleCommandCenter()
    }

    // Ctrl+O for Sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault()
      toggleSidebar()
    }

    // Ctrl+` for Terminal
    if ((e.metaKey || e.ctrlKey) && e.key === '`') {
      e.preventDefault()
      toggleTerminal()
    }

    // Ctrl+G for 3D Graph
    if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
      e.preventDefault()
      toggle3DGraph()
    }

    // Escape to close Command Center
    if (e.key === 'Escape') {
      if (commandCenter.value.isOpen) {
        commandCenter.value.isOpen = false
      }
    }

    // Page shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === 't') {
      e.preventDefault()
      createNewPage()
    }
  }

  // Click outside handler (for future use)
  const handleClickOutside = () => {
    // Currently no global click outside behavior needed
  }

  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('click', handleClickOutside)
  })
})

// Handle command center search
const handleCommandSearch = async (query) => {
  commandCenter.value.query = query
  selectedCommandIndex.value = 0 // Reset selection when search changes

  if (!query.trim()) {
    // Show default commands when no query
    const defaultResults = []

    // Show existing workspaces first
    if (availableWorkspaces.value.length > 0) {
      availableWorkspaces.value.forEach((workspace) => {
        const isCurrent = workspace.id === workspaceState.value.currentWorkspace?.id
        defaultResults.push({
          type: 'workspace',
          label: isCurrent ? `${workspace.name} (Current)` : `Open "${workspace.name}"`,
          action: 'switch-to-workspace',
          workspaceId: workspace.id,
          icon: isCurrent ? '📂✓' : '📂'
        })
      })

      // Add separator
      defaultResults.push({
        type: 'separator',
        label: '─────────────────',
        action: 'separator',
        icon: ''
      })
    }

    // Add other commands
    defaultResults.push(
      // IDE commands
      { type: 'action', label: 'Turn current page into IDE workspace', action: 'toggle-ide-current', icon: '💻' },
      // Workspace commands
      { type: 'workspace', label: 'Create new workspace', action: 'create-workspace', icon: '✨' },
      { type: 'workspace', label: 'Save current workspace', action: 'save-workspace', icon: '💾' },
      { type: 'workspace', label: 'Rename workspace', action: 'rename-workspace', icon: '✏️' },
      { type: 'workspace', label: 'Delete workspace', action: 'delete-workspace', icon: '🗑️' },
      // Document commands
      { type: 'action', label: 'Create new document', action: 'create-document', icon: '📄' },
      { type: 'action', label: 'New page', action: 'new-page', icon: '📑' },
      { type: 'action', label: 'Search documents', action: 'search', icon: '🔍' },
      // Canvas commands
      { type: 'action', label: 'Enter canvas mode', action: 'canvas-mode', icon: '🎨' },
      { type: 'action', label: 'View 3D graph of pages', action: '3d-graph-mode', icon: '🌐' },
      // Settings
      { type: 'action', label: 'Adjust block spacing', action: 'spacing', icon: '📏' }
    )

    commandCenter.value.results = defaultResults
    return
  }

  const results = []
  const lowerQuery = query.toLowerCase()

  // Workspace search
  if ('workspace'.includes(lowerQuery) || 'switch'.includes(lowerQuery) || 'save'.includes(lowerQuery)) {
    // Add workspace switching options
    availableWorkspaces.value.forEach((workspace) => {
      const isCurrent = workspace.id === workspaceState.value.currentWorkspace?.id
      results.push({
        type: 'workspace',
        label: isCurrent ? `${workspace.name} (Current)` : `Switch to "${workspace.name}"`,
        action: 'switch-to-workspace',
        workspaceId: workspace.id,
        icon: isCurrent ? '📂✓' : '📂'
      })
    })

    // Add create workspace option
    results.push({
      type: 'workspace',
      label: 'Create new workspace',
      action: 'create-workspace',
      icon: '✨'
    })
  }

  // Canvas/whiteboard search
  if ('canvas'.includes(lowerQuery) || 'whiteboard'.includes(lowerQuery) || 'board'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Enter infinite canvas mode',
      action: 'canvas-mode',
      icon: '🎨'
    })
  }

  // IDE search
  if ('ide'.includes(lowerQuery) || 'code'.includes(lowerQuery) || 'editor'.includes(lowerQuery) || 'workspace'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Turn current page into IDE workspace',
      action: 'toggle-ide-current',
      icon: '💻'
    })

    // Show non-IDE pages that can be converted
    pages.value.filter(page => !page.isIDEMode).forEach((page) => {
      results.push({
        type: 'action',
        label: `Turn "${page.title}" into IDE workspace`,
        action: 'toggle-ide-page',
        pageId: page.id,
        icon: '💻'
      })
    })

    // Show IDE pages that can be exited
    pages.value.filter(page => page.isIDEMode).forEach((page) => {
      results.push({
        type: 'action',
        label: `Exit IDE mode for "${page.title}"`,
        action: 'exit-ide-page',
        pageId: page.id,
        icon: '⚡'
      })
    })
  }

  // Whiteboard search
  if ('whiteboard'.includes(lowerQuery) || 'draw'.includes(lowerQuery) || 'canvas'.includes(lowerQuery) || 'sketch'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Turn current page into whiteboard',
      action: 'toggle-whiteboard-current',
      icon: '🎨'
    })

    // Show pages that can be converted to whiteboard
    pages.value.filter(page => !page.isWhiteboardMode).forEach((page) => {
      results.push({
        type: 'action',
        label: `Turn "${page.title}" into whiteboard`,
        action: 'toggle-whiteboard-page',
        pageId: page.id,
        icon: '🎨'
      })
    })
  }

  // Database/Spreadsheet search
  if ('database'.includes(lowerQuery) || 'spreadsheet'.includes(lowerQuery) || 'table'.includes(lowerQuery) || 'data'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Turn current page into database',
      action: 'toggle-database-current',
      icon: '🗄️'
    })

    // Show pages that can be converted to database
    pages.value.filter(page => !page.isDatabaseMode).forEach((page) => {
      results.push({
        type: 'action',
        label: `Turn "${page.title}" into database`,
        action: 'toggle-database-page',
        pageId: page.id,
        icon: '🗄️'
      })
    })
  }

  // 3D graph search
  if ('3d'.includes(lowerQuery) || 'graph'.includes(lowerQuery) || 'network'.includes(lowerQuery) || 'obsidian'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'View 3D graph of pages',
      action: '3d-graph-mode',
      icon: '🌐'
    })
  }

  // Document search
  if ('document'.includes(lowerQuery) || 'doc'.includes(lowerQuery) || 'create'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Create new document',
      action: 'create-document',
      icon: '📄'
    })
  }

  // Tab search
  if ('page'.includes(lowerQuery) || 'pages'.includes(lowerQuery)) {
    results.push(
      { type: 'action', label: 'New page', action: 'new-page', icon: '📑' }
    )

    // Show available pages for quick switching
    if (pages.value.length > 0) {
      pages.value.forEach((page) => {
        results.push({
          type: 'page',
          label: `Switch to "${page.title}"`,
          action: 'switch-to-page',
          pageId: page.id,
          icon: '📄'
        })
      })
    }
  }

  // Delete search
  if ('delete'.includes(lowerQuery) || 'remove'.includes(lowerQuery)) {
    // Show delete options for pages (except if it's the only page)
    if (pages.value.length > 1) {
      pages.value.forEach((page) => {
        results.push({
          type: 'action',
          label: `Delete page "${page.title}"`,
          action: 'delete-page',
          pageId: page.id,
          icon: '🗑️'
        })
      })
    }

    // Show delete options for workspaces (except if it's the only workspace)
    if (availableWorkspaces.value.length > 1) {
      availableWorkspaces.value.forEach((workspace) => {
        const isCurrent = workspace.id === workspaceState.value.currentWorkspace?.id
        results.push({
          type: 'workspace',
          label: `Delete workspace "${workspace.name}"${isCurrent ? ' (Current)' : ''}`,
          action: 'delete-workspace-confirm',
          workspaceId: workspace.id,
          icon: '🗑️'
        })
      })
    }
  }

  // Spacing commands
  if ('spacing'.includes(lowerQuery) || 'space'.includes(lowerQuery)) {
    results.push(
      { type: 'action', label: 'Tight spacing (0.5x)', action: 'spacing-0.5', icon: '📏' },
      { type: 'action', label: 'Normal spacing (1x)', action: 'spacing-1', icon: '📏' },
      { type: 'action', label: 'Relaxed spacing (1.5x)', action: 'spacing-1.5', icon: '📏' },
      { type: 'action', label: 'Loose spacing (2x)', action: 'spacing-2', icon: '📏' }
    )
  }

  // Page width commands
  if ('width'.includes(lowerQuery) || 'page'.includes(lowerQuery)) {
    results.push(
      { type: 'action', label: 'Normal page width', action: 'width-normal', icon: '📄' },
      { type: 'action', label: 'Landscape page width', action: 'width-landscape', icon: '📄' },
      { type: 'action', label: 'Full page width', action: 'width-full', icon: '📄' }
    )
  }

  // Search in documents (if implemented)
  if ('search'.includes(lowerQuery)) {
    results.push({
      type: 'action',
      label: 'Search all documents',
      action: 'search-documents',
      icon: '🔍'
    })
  }

  // AI query option
  if (query.length > 2) {
    results.push({
      type: 'ai',
      label: `Ask AI: "${query}"`,
      action: 'ai-query',
      icon: '✨'
    })
  }

  // If no specific matches, show filtered default commands
  if (results.length === 0) {
    const defaultCommands = [
      { type: 'action', label: 'Create new document', action: 'create-document', icon: '📄' },
      { type: 'action', label: 'Enter canvas mode', action: 'canvas-mode', icon: '🎨' },
      { type: 'workspace', label: 'Create new workspace', action: 'create-workspace', icon: '✨' }
    ]

    results.push(...defaultCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(lowerQuery)
    ))
  }

  commandCenter.value.results = results
}

// Execute command center actions
const executeCommand = async (command) => {
  // Close command center after execution
  const closeCommandCenter = () => {
    commandCenter.value.isOpen = false
    commandCenter.value.query = ''
    commandCenter.value.results = []
  }

  try {
    switch (command.action) {
      // Workspace management
      case 'create-workspace': {
        const name = prompt('Enter workspace name:')
        if (name?.trim()) {
          // Save current workspace pages before creating new one
          if (workspaceState.value.currentWorkspace?.id) {
            saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
          }

          // Create new workspace
          const newWorkspace = createLocalWorkspace(name)
          availableWorkspaces.value = getLocalWorkspaces() // Refresh the list

          // Switch to new workspace
          setCurrentWorkspace(newWorkspace.id)
          workspaceState.value.currentWorkspace = newWorkspace
          workspaceState.value.hasWorkspace = true

          // Load pages from new workspace
          pages.value = newWorkspace.pages || []
          if (pages.value.length > 0) {
            switchToPage(pages.value[0].id)
          } else {
            createNewPage()
          }
        }
        break
      }

      case 'save-workspace':
        if (workspaceState.value.currentWorkspace?.id) {
          saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
          // Show confirmation
          alert('Workspace saved successfully!')
        }
        break

      case 'rename-workspace':
        if (workspaceState.value.currentWorkspace?.id) {
          const newName = prompt('Enter new workspace name:', workspaceState.value.currentWorkspace.name)
          if (newName?.trim() && newName !== workspaceState.value.currentWorkspace.name) {
            renameWorkspace(workspaceState.value.currentWorkspace.id, newName)
            workspaceState.value.currentWorkspace.name = newName
            availableWorkspaces.value = getLocalWorkspaces() // Refresh the list
          }
        }
        break

      case 'delete-workspace':
        if (workspaceState.value.currentWorkspace?.id && availableWorkspaces.value.length > 1) {
          const confirmDelete = confirm(`Are you sure you want to delete "${workspaceState.value.currentWorkspace.name}"? This cannot be undone.`)
          if (confirmDelete) {
            const currentId = workspaceState.value.currentWorkspace.id
            deleteLocalWorkspace(currentId)

            // Switch to another workspace
            availableWorkspaces.value = getLocalWorkspaces()
            if (availableWorkspaces.value.length > 0) {
              const firstWorkspace = availableWorkspaces.value[0]
              setCurrentWorkspace(firstWorkspace.id)
              workspaceState.value.currentWorkspace = firstWorkspace
              pages.value = firstWorkspace.pages || []
              if (pages.value.length > 0) {
                switchToPage(pages.value[0].id)
              } else {
                createNewPage()
              }
            } else {
              // No workspaces left, create a new one
              const newWorkspace = createLocalWorkspace('My Workspace')
              availableWorkspaces.value = [newWorkspace]
              setCurrentWorkspace(newWorkspace.id)
              workspaceState.value.currentWorkspace = newWorkspace
              pages.value = newWorkspace.pages || []
              createNewPage()
            }
          }
        } else if (availableWorkspaces.value.length <= 1) {
          alert('Cannot delete the last workspace.')
        }
        break

      case 'switch-to-workspace':
        if (command.workspaceId && command.workspaceId !== workspaceState.value.currentWorkspace?.id) {
          // Save current workspace pages first
          if (workspaceState.value.currentWorkspace?.id) {
            saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
          }

          // Switch to target workspace
          const targetWorkspace = availableWorkspaces.value.find(w => w.id === command.workspaceId)
          if (targetWorkspace) {
            setCurrentWorkspace(targetWorkspace.id)
            workspaceState.value.currentWorkspace = targetWorkspace

            // Load pages from target workspace
            pages.value = targetWorkspace.pages || []
            if (pages.value.length > 0) {
              switchToPage(pages.value[0].id)
            } else {
              createNewPage()
            }
          }
        }
        break

      // Document management
      case 'create-document':
        if (workspaceState.value.currentWorkspace) {
          const title = prompt('Enter document title:') || 'Untitled'
          const newDoc = await createDocument(workspaceState.value.currentWorkspace.id, title)
          editor.value.currentDocument = newDoc
          editor.value.blocks = [{ id: 'initial', type: 'paragraph', content: '', position: 0 }]
        }
        break

      // Tab management
      case 'new-page':
        createNewPage()
        break

      case 'switch-to-page':
        if (command.pageId) {
          switchToPage(command.pageId)
        }
        break

      // Page deletion
      case 'delete-page':
        if (command.pageId && pages.value.length > 1) {
          const pageToDelete = pages.value.find(p => p.id === command.pageId)
          if (pageToDelete && confirm(`Are you sure you want to delete the page "${pageToDelete.title}"?`)) {
            // If deleting the active page, switch to another page first
            if (command.pageId === activePageId.value) {
              const otherPage = pages.value.find(p => p.id !== command.pageId)
              if (otherPage) {
                switchToPage(otherPage.id)
              }
            }

            // Remove the page
            pages.value = pages.value.filter(p => p.id !== command.pageId)

            // Save to current workspace
            if (workspaceState.value.currentWorkspace?.id) {
              saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
            }
          }
        }
        break

      // Workspace deletion with confirmation
      case 'delete-workspace-confirm':
        if (command.workspaceId && availableWorkspaces.value.length > 1) {
          const workspaceToDelete = availableWorkspaces.value.find(w => w.id === command.workspaceId)
          if (workspaceToDelete && confirm(`Are you sure you want to delete the workspace "${workspaceToDelete.name}" and all its pages?`)) {
            // If deleting current workspace, switch to another first
            if (command.workspaceId === workspaceState.value.currentWorkspace?.id) {
              const otherWorkspace = availableWorkspaces.value.find(w => w.id !== command.workspaceId)
              if (otherWorkspace) {
                setCurrentWorkspace(otherWorkspace.id)
                workspaceState.value.currentWorkspace = otherWorkspace
                pages.value = otherWorkspace.pages || []
                if (pages.value.length > 0) {
                  switchToPage(pages.value[0].id)
                } else {
                  createNewPage()
                }
              }
            }

            // Delete the workspace
            deleteLocalWorkspace(command.workspaceId)
            availableWorkspaces.value = getLocalWorkspaces()
          }
        }
        break

      // Canvas mode
      case 'canvas-mode':
        console.log('Activating canvas mode')
        editor.value.showCanvas = true
        editor.value.canvasMode = 'infinite'
        console.log('Editor state:', editor.value)
        closeCommandCenter()
        return // Exit early to avoid closing again

      // 3D Graph mode
      case '3d-graph-mode':
        console.log('Activating 3D graph mode')
        toggle3DGraph()
        closeCommandCenter()
        return // Exit early to avoid closing again

      // IDE mode commands
      case 'toggle-ide-current':
        if (activePageId.value) {
          toggleIDEMode(activePageId.value)
        }
        closeCommandCenter()
        return

      case 'toggle-ide-page':
        if (command.pageId) {
          toggleIDEMode(command.pageId)
          switchToPage(command.pageId) // Switch to the page we just converted
        }
        closeCommandCenter()
        return

      case 'toggle-3d-graph':
        toggle3DGraph()
        closeCommandCenter()
        return

      // Whiteboard mode commands
      case 'toggle-whiteboard-current':
        if (activePageId.value) {
          toggleWhiteboardMode(activePageId.value)
        }
        closeCommandCenter()
        return

      case 'toggle-whiteboard-page':
        if (command.pageId) {
          toggleWhiteboardMode(command.pageId)
          switchToPage(command.pageId)
        }
        closeCommandCenter()
        return

      // Database mode commands
      case 'toggle-database-current':
        if (activePageId.value) {
          toggleDatabaseMode(activePageId.value)
        }
        closeCommandCenter()
        return

      case 'toggle-database-page':
        if (command.pageId) {
          toggleDatabaseMode(command.pageId)
          switchToPage(command.pageId)
        }
        closeCommandCenter()
        return

      case 'exit-ide-page':
        if (command.pageId) {
          const page = pages.value.find(p => p.id === command.pageId)
          if (page && page.isIDEMode) {
            page.isIDEMode = false
            // Save the change
            if (workspaceState.value.currentWorkspace?.id) {
              saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
            }
          }
        }
        closeCommandCenter()
        return

      // Spacing commands
      case 'spacing-0.5':
      case 'spacing-1':
      case 'spacing-1.5':
      case 'spacing-2': {
        // These would need to be communicated to BlockEditor
        const spacingValue = command.action.split('-')[1]
        alert(`Block spacing set to ${spacingValue}x`)
        break
      }

      // Page width commands
      case 'width-normal':
      case 'width-landscape':
      case 'width-full':
      // These would need to be communicated to BlockEditor
      { const widthMode = command.action.split('-')[1]
        alert(`Page width set to ${widthMode}`)
        break }

      // Search
      case 'search-documents':
        alert('Document search not yet implemented')
        break

      // AI query
      case 'ai-query':
        alert(`AI query: "${commandCenter.value.query}" - Not yet implemented`)
        break

      // Settings Commands
      case 'settings-theme': {
        const currentTheme = localStorage.getItem('ide-theme') || 'light'
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        localStorage.setItem('ide-theme', newTheme)
        alert(`Theme changed to ${newTheme}. This will be fully implemented in a future update.`)
        break
      }

      case 'settings-font-size': {
        const currentSize = localStorage.getItem('ide-font-size') || '12'
        const newSize = prompt('Enter font size (10-24):', currentSize)
        if (newSize && !isNaN(newSize) && newSize >= 10 && newSize <= 24) {
          localStorage.setItem('ide-font-size', newSize)
          alert(`Font size changed to ${newSize}px. Refresh to see changes.`)
        }
        break
      }

      case 'settings-auto-save': {
        const autoSave = localStorage.getItem('ide-auto-save') !== 'false'
        const newAutoSave = !autoSave
        localStorage.setItem('ide-auto-save', newAutoSave.toString())
        alert(`Auto save ${newAutoSave ? 'enabled' : 'disabled'}`)
        break
      }

      case 'settings-word-wrap': {
        const wordWrap = localStorage.getItem('ide-word-wrap') !== 'false'
        const newWordWrap = !wordWrap
        localStorage.setItem('ide-word-wrap', newWordWrap.toString())
        alert(`Word wrap ${newWordWrap ? 'enabled' : 'disabled'}. Refresh to see changes.`)
        break
      }

      case 'settings-tab-size': {
        const currentTabSize = localStorage.getItem('ide-tab-size') || '2'
        const newTabSize = currentTabSize === '2' ? '4' : '2'
        localStorage.setItem('ide-tab-size', newTabSize)
        alert(`Tab size changed to ${newTabSize} spaces`)
        break
      }

      case 'settings-line-numbers': {
        const lineNumbers = localStorage.getItem('ide-line-numbers') !== 'false'
        const newLineNumbers = !lineNumbers
        localStorage.setItem('ide-line-numbers', newLineNumbers.toString())
        alert(`Line numbers ${newLineNumbers ? 'enabled' : 'disabled'}. Refresh to see changes.`)
        break
      }

      case 'settings-minimap': {
        const minimap = localStorage.getItem('ide-minimap') === 'true'
        const newMinimap = !minimap
        localStorage.setItem('ide-minimap', newMinimap.toString())
        alert(`Minimap ${newMinimap ? 'enabled' : 'disabled'}. This will be implemented in a future update.`)
        break
      }

      case 'settings-shortcuts':
        alert('Keyboard Shortcuts:\n\nCtrl/Cmd + K - Pro Command Center (Primary Navigation)\nCtrl/Cmd + O - Toggle File Explorer\nCtrl/Cmd + ` - Toggle Terminal\nCtrl/Cmd + S - Save File\nCtrl/Cmd + N - New File\nEsc - Close overlays')
        break

      case 'settings-reset':
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
          const settingsKeys = ['ide-theme', 'ide-font-size', 'ide-auto-save', 'ide-word-wrap', 'ide-tab-size', 'ide-line-numbers', 'ide-minimap']
          settingsKeys.forEach(key => localStorage.removeItem(key))
          alert('All settings have been reset to defaults. Refresh the page to see changes.')
        }
        break

      case 'live-server':
        openLiveServer()
        break

      default:
        console.log('Unknown command:', command.action)
    }

    // Close command center for all other commands
    closeCommandCenter()
  } catch (error) {
    console.error('Error executing command:', error)
    alert('Error executing command: ' + error.message)
    closeCommandCenter()
  }
}

// Tab management functions
// Page management functions
const createNewPage = (customTitle = null) => {
  // Save current page content before switching
  if (activePageId.value) {
    savePage(activePageId.value, currentPageTitle.value.value, editor.value.blocks)
  }

  // Create new page - always in IDE mode
  const newPage = {
    id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: customTitle || 'Page',
    blocks: [{ id: 'initial', type: 'paragraph', content: '', position: 0 }],
    lastModified: new Date().toISOString(),
    isIDEMode: true,
    files: {
      'README.md': {
        content: `# ${workspaceState.value.currentWorkspace?.name || 'My Workspace'}\n\nWelcome to your workspace! Start by creating files and folders to organize your project.`,
        language: 'markdown'
      }
    },
    activeFile: 'README.md',
    terminalHistory: []
  }

  pages.value.push(newPage)
  switchToPage(newPage.id)
  return newPage
}

const _closePage = (pageId) => {
  // Don't close if it's the only page
  if (pages.value.length <= 1) return

  const pageIndex = pages.value.findIndex(p => p.id === pageId)
  if (pageIndex === -1) return

  // If closing the active page, switch to another page first
  if (pageId === activePageId.value) {
    // Switch to the page to the right, or if it's the last one, switch to the left
    const newActiveIndex = pageIndex < pages.value.length - 1 ? pageIndex + 1 : pageIndex - 1
    if (newActiveIndex >= 0 && newActiveIndex < pages.value.length) {
      switchToPage(pages.value[newActiveIndex].id)
    }
  }

  // Remove the page
  pages.value.splice(pageIndex, 1)

  // Save the updated workspace
  if (workspaceState.value.currentWorkspace) {
    const { saveWorkspacePages } = useLocalWorkspace()
    saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
  }
}

const switchToPage = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (!page) return

  // Save current page before switching
  if (activePageId.value && activePageId.value !== pageId) {
    savePage(activePageId.value, currentPageTitle.value.value, editor.value.blocks)
  }

  // Switch to the new page
  activePageId.value = pageId
  currentPageTitle.value.value = page.title
  currentPageTitle.value.originalValue = page.title
  editor.value.blocks = [...page.blocks]
  editor.value.currentDocument = { id: pageId, title: page.title }
}

const savePage = (pageId, title, blocks) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    page.title = title.trim() || 'Untitled'
    page.blocks = [...blocks]
    page.lastModified = new Date().toISOString()
  }
}

const getCurrentPageTitle = () => {
  const activePage = pages.value.find(p => p.id === activePageId.value)
  return activePage?.title || 'Untitled'
}

const _startEditingPageTitle = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    page.isEditing = true
    page.originalTitle = page.title
    nextTick(() => {
      const input = document.querySelector(`input[data-page-id="${pageId}"]`)
      if (input) {
        input.focus()
        input.select()
      }
    })
  }
}

const _savePageTitle = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    page.isEditing = false
    const newTitle = page.title.trim() || 'Untitled'
    page.title = newTitle
    page.lastModified = new Date().toISOString()

    // Update current page title reference if this is the active page
    if (pageId === activePageId.value) {
      currentPageTitle.value.value = newTitle
    }
  }
}

const _cancelPageEdit = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    page.isEditing = false
    page.title = page.originalTitle || page.title
  }
}

// IDE Mode functions
const toggleIDEMode = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    page.isIDEMode = !page.isIDEMode

    // Initialize IDE-specific data if entering IDE mode
    if (page.isIDEMode && !page.files) {
      // Create a more comprehensive starter project
      const projectName = page.title.toLowerCase().replace(/\s+/g, '-')

      page.files = {
        'README.md': {
          content: `# ${page.title}\n\nWelcome to your new IDE workspace!\n\n## Getting Started\n\n1. Edit files in the file explorer\n2. Use the terminal for commands\n3. Run code with Ctrl+R\n\n## Files\n\n- \`index.html\` - Main HTML file\n- \`style.css\` - Stylesheet\n- \`script.js\` - JavaScript code\n- \`package.json\` - Project configuration\n\nHappy coding! 🚀`,
          language: 'markdown'
        },
        'index.html': {
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${page.title}</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <div class="container">\n        <h1>Welcome to ${page.title}</h1>\n        <p>Your IDE workspace is ready!</p>\n        <button id="demo-btn">Click me!</button>\n    </div>\n    <` + `script src="script.js"><` + `/script>\n</body>\n</html>`,
          language: 'html'
        },
        'style.css': {
          content: `/* ${page.title} - Stylesheet */\n\n* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}\n\nbody {\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    line-height: 1.6;\n    color: #333;\n    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n    min-height: 100vh;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.container {\n    background: white;\n    padding: 2rem;\n    border-radius: 10px;\n    box-shadow: 0 10px 30px rgba(0,0,0,0.1);\n    text-align: center;\n    max-width: 500px;\n    width: 90%;\n}\n\nh1 {\n    color: #4a5568;\n    margin-bottom: 1rem;\n    font-size: 2rem;\n}\n\np {\n    margin-bottom: 1.5rem;\n    color: #718096;\n}\n\nbutton {\n    background: #667eea;\n    color: white;\n    border: none;\n    padding: 12px 24px;\n    border-radius: 6px;\n    font-size: 16px;\n    cursor: pointer;\n    transition: background 0.3s ease;\n}\n\nbutton:hover {\n    background: #5a67d8;\n    transform: translateY(-1px);\n}`,
          language: 'css'
        },
        'script.js': {
          content: `// ${page.title} - JavaScript\n\n// Wait for DOM to be ready\ndocument.addEventListener('DOMContentLoaded', function() {\n    console.log('${page.title} is ready!');\n    \n    // Demo button functionality\n    const demoBtn = document.getElementById('demo-btn');\n    \n    if (demoBtn) {\n        demoBtn.addEventListener('click', function() {\n            const messages = [\n                'Hello from your IDE workspace!',\n                'Code is working perfectly! 🎉',\n                'Welcome to the future of coding!',\n                'Your imagination is the limit! ✨'\n            ];\n            \n            const randomMessage = messages[Math.floor(Math.random() * messages.length)];\n            alert(randomMessage);\n            \n            // Log to console as well\n            console.log('Button clicked:', randomMessage);\n        });\n    }\n    \n    // Example of modern JavaScript\n    const greeting = (name = 'Developer') => {\n        return \`Hello, \${name}! Welcome to \${document.title}.\`;\n    };\n    \n    console.log(greeting());\n});`,
          language: 'javascript'
        },
        'package.json': {
          content: `{\n  "name": "${projectName}",\n  "version": "1.0.0",\n  "description": "${page.title} - Created in Canvas IDE",\n  "main": "script.js",\n  "scripts": {\n    "start": "echo 'Starting ${page.title}...'; open index.html",\n    "dev": "echo 'Development server not configured yet'",\n    "build": "echo 'Build process not configured yet'",\n    "test": "echo 'No tests yet - add some!'"\n  },\n  "keywords": ["canvas", "ide", "web", "project"],\n  "author": "Canvas IDE User",\n  "license": "MIT",\n  "devDependencies": {},\n  "dependencies": {}\n}`,
          language: 'json'
        }
      }

      page.activeFile = 'README.md' // Start with README to orient the user
      page.terminalHistory = [
        { command: 'echo "Welcome to your new IDE workspace!"', output: 'Welcome to your new IDE workspace!' },
        { command: 'ls', output: 'README.md  index.html  script.js  style.css  package.json' }
      ]
    }

    // Save the change
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

// IDE Mode event handlers
const _exitIDEMode = () => {
  const page = currentPage.value
  if (page) {
    page.isIDEMode = false
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const updateFile = (filename, fileData) => {
  const page = currentPage.value
  if (page && page.files) {
    page.files[filename] = { ...page.files[filename], ...fileData }
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const createFile = (filePath, content = '') => {
  const page = currentPage.value
  if (page) {
    if (!page.files) page.files = {}
    if (!page.folders) page.folders = []

    // Handle both old and new parameter formats
    const actualPath = typeof filePath === 'string' ? filePath : (filePath?.filename || filePath?.path)
    const actualContent = typeof filePath === 'string' ? content : (filePath?.content || '')

    // Detect language from file extension
    const getLanguageFromExtension = (filename) => {
      const ext = filename.split('.').pop()?.toLowerCase()
      const languageMap = {
        js: 'javascript',
        ts: 'typescript',
        vue: 'vue',
        jsx: 'javascript',
        tsx: 'typescript',
        css: 'css',
        scss: 'scss',
        html: 'html',
        json: 'json',
        md: 'markdown',
        py: 'python',
        php: 'php',
        go: 'go',
        rs: 'rust',
        java: 'java',
        cpp: 'cpp',
        c: 'c'
      }
      return languageMap[ext] || 'plaintext'
    }

    // Create parent folders if they don't exist
    const parentPath = actualPath.split('/').slice(0, -1).join('/')
    if (parentPath && !page.folders.includes(parentPath)) {
      const pathParts = parentPath.split('/')
      let currentPath = ''
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        if (!page.folders.includes(currentPath)) {
          page.folders.push(currentPath)
        }
      }
    }

    // Create the file
    page.files[actualPath] = {
      content: actualContent,
      language: typeof filePath === 'object' ? filePath.language : getLanguageFromExtension(actualPath)
    }

    page.activeFile = actualPath
    console.log('File created:', actualPath)

    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }

    // Force refresh of file tree
    refreshFileTree()
  }
}

const deleteFile = (filename) => {
  const page = currentPage.value
  if (page && page.files) {
    // Create new object without the deleted file
    const newFiles = { ...page.files }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newFiles[filename]
    page.files = newFiles

    if (page.activeFile === filename) {
      const remainingFiles = Object.keys(page.files)
      page.activeFile = remainingFiles.length > 0 ? remainingFiles[0] : null
    }
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const renameFile = (oldName, newName) => {
  const page = currentPage.value
  if (page && page.files && page.files[oldName]) {
    // Create new object with renamed file
    const newFiles = { ...page.files }
    newFiles[newName] = newFiles[oldName]
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newFiles[oldName]
    page.files = newFiles

    if (page.activeFile === oldName) {
      page.activeFile = newName
    }
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const updateBlocks = (newBlocks) => {
  const page = currentPage.value
  if (page) {
    page.blocks = newBlocks
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const updateWhiteboardData = (data) => {
  const page = currentPage.value
  if (page) {
    page.whiteboardData = data
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const updateDatabaseData = (data) => {
  const page = currentPage.value
  if (page) {
    page.databaseData = data
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

// Toggle functions for workspace modes
const toggleWhiteboardMode = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    // Reset other modes
    page.isIDEMode = false
    page.isDatabaseMode = false
    page.isWhiteboardMode = !page.isWhiteboardMode

    if (page.isWhiteboardMode && !page.whiteboardData) {
      page.whiteboardData = { elements: [] }
    }

    saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
  }
}

const toggleDatabaseMode = (pageId) => {
  const page = pages.value.find(p => p.id === pageId)
  if (page) {
    // Reset other modes
    page.isIDEMode = false
    page.isWhiteboardMode = false
    page.isDatabaseMode = !page.isDatabaseMode

    if (page.isDatabaseMode && !page.databaseData) {
      page.databaseData = { columns: [], rows: [] }
    }

    saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
  }
}

const selectFile = (filename) => {
  const page = currentPage.value
  if (page) {
    page.activeFile = filename
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const runCode = (data) => {
  // In a real implementation, this would execute the code
  console.log('Running code:', data)
  // You could integrate with a code execution service here
}

const createFolder = (folderPath, folderName) => {
  const page = currentPage.value
  if (page) {
    if (!page.folders) page.folders = []
    if (!page.files) page.files = {}

    // Handle both old and new parameter formats
    const actualPath = typeof folderPath === 'string' ? folderPath : (folderPath?.path || folderPath?.name)
    const _actualName = folderName || (typeof folderPath === 'object' ? folderPath.name : folderPath)

    // Create folder structure - ensure path doesn't already exist
    if (actualPath && !page.folders.includes(actualPath)) {
      page.folders.push(actualPath)

      // Create parent folders if they don't exist
      const pathParts = actualPath.split('/')
      let currentPath = ''
      for (const part of pathParts.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        if (!page.folders.includes(currentPath)) {
          page.folders.push(currentPath)
        }
      }

      console.log('Folder created:', actualPath)

      // Save changes
      if (workspaceState.value.currentWorkspace?.id) {
        saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
      }

      // Force refresh of file tree
      refreshFileTree()
    }
  }
}

const refreshFileTree = () => {
  // Force refresh of file tree by triggering reactivity
  const page = currentPage.value
  if (page) {
    // Trigger reactivity by creating new references
    if (page.files) {
      page.files = { ...page.files }
    }
    if (page.folders) {
      page.folders = [...page.folders]
    }

    // Save current state
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }
}

const _handleProjectCreated = (projectData) => {
  const page = currentPage.value
  if (page) {
    // Update page with new project structure
    page.files = { ...page.files, ...projectData.files }
    page.projectConfig = projectData.config

    // Save changes
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }

    console.log('Project created:', projectData.config.name)
  }
}

const _handlePackageInstalled = (packageData) => {
  const page = currentPage.value
  if (page && page.projectConfig) {
    // Update project dependencies
    if (packageData.isDev) {
      page.projectConfig.devDependencies = {
        ...page.projectConfig.devDependencies,
        [packageData.name]: packageData.version
      }
    } else {
      page.projectConfig.dependencies = {
        ...page.projectConfig.dependencies,
        [packageData.name]: packageData.version
      }
    }

    // Update package.json file if it exists
    if (page.files && page.files['package.json']) {
      const packageJson = JSON.parse(page.files['package.json'].content)
      packageJson.dependencies = page.projectConfig.dependencies
      packageJson.devDependencies = page.projectConfig.devDependencies
      page.files['package.json'].content = JSON.stringify(packageJson, null, 2)
    }

    // Save changes
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }

    console.log('Package installed:', packageData.name)
  }
}

const _handleScriptRun = (scriptData) => {
  const page = currentPage.value
  if (page && page.projectConfig) {
    console.log('Running script:', scriptData.script, 'in project:', page.projectConfig.name)
    // In a real implementation, this would execute the npm script
    // You could integrate with a terminal execution service here
  }
}

// Handle command center keyboard navigation
const handleCommandCenterKeydown = (e) => {
  if (!commandCenter.value.results.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    let newIndex = selectedCommandIndex.value + 1
    // Skip separator items
    while (newIndex < commandCenter.value.results.length && commandCenter.value.results[newIndex].type === 'separator') {
      newIndex++
    }
    selectedCommandIndex.value = Math.min(newIndex, commandCenter.value.results.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    let newIndex = selectedCommandIndex.value - 1
    // Skip separator items
    while (newIndex >= 0 && commandCenter.value.results[newIndex].type === 'separator') {
      newIndex--
    }
    selectedCommandIndex.value = Math.max(newIndex, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selectedCommand = commandCenter.value.results[selectedCommandIndex.value]
    if (selectedCommand && selectedCommand.type !== 'separator') {
      executeCommand(selectedCommand)
    }
  }
}

// Handle document changes (auto-save)
const _handleDocumentChange = (blocks) => {
  editor.value.blocks = blocks

  // Save to the active page
  if (activePageId.value) {
    savePage(activePageId.value, getCurrentPageTitle(), blocks)

    // Also save to workspace
    if (workspaceState.value.currentWorkspace?.id) {
      saveWorkspacePages(workspaceState.value.currentWorkspace.id, pages.value)
    }
  }

  // Auto-save after 1 second of inactivity
  clearTimeout(editor.value.saveTimeout)
  editor.value.saveTimeout = setTimeout(async () => {
    try {
      console.log('Auto-saving workspace...', {
        workspace: workspaceState.value.currentWorkspace?.name,
        pages: pages.value.length,
        blocks: blocks.length
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, 1000)
}

// Create new workspace
const handleCreateWorkspace = async () => {
  // Use default name if none provided
  const name = workspaceName.value.trim() || 'My Workspace'

  try {
    console.log('Creating workspace:', name)
    workspaceState.value.hasWorkspace = true
    workspaceState.value.currentWorkspace = { name }
    // TODO: Re-enable Supabase when fixed
    // const newWorkspace = await createWorkspace(name)
    // workspaceState.value.currentWorkspace = newWorkspace
  } catch (error) {
    console.error('Failed to create workspace:', error)
  }
}
</script>

<template>
  <div>
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
              v-model="workspaceName"
              type="text"
              placeholder="Name your workspace"
              class="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              @keydown.enter="handleCreateWorkspace"
            >
          </div>

          <button
            class="w-full px-4 py-3 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
            @click="handleCreateWorkspace"
          >
            Create Workspace
          </button>

          <p class="text-sm text-gray-500 text-center">
            We'll save your work automatically. No account needed yet.
          </p>
        </div>

        <div class="text-center">
          <p class="text-xs canvas-text-muted">
            Press <kbd class="bg-gray-100 px-2 py-1 rounded text-xs">Cmd+K</kbd> or <kbd class="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+K</kbd> anytime to access the Pro Command Center
          </p>
        </div>
      </div>
    </div>

    <!-- Main Workspace Interface - IDE Layout -->
    <div
      v-else
      class="h-screen bg-white relative overflow-hidden"
    >
      <!-- Main Content Area (Full Width) -->
      <div class="h-full flex flex-col overflow-hidden">
        <div class="flex flex-1 overflow-hidden relative">
          <!-- Folder Drawer -->
          <div
            v-if="folderDrawerOpen"
            class="absolute top-0 left-0 w-48 h-full bg-white border-r border-gray-300 flex flex-col overflow-hidden z-20 shadow-sm"
          >
            <!-- Folder Drawer Header -->
            <div class="h-6 border-b border-gray-200 flex items-center justify-between px-2 text-xs text-gray-600 font-medium bg-gray-50">
              <span>Explorer</span>
              <div class="flex items-center space-x-1">
                <button
                  class="w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
                  title="3D Graph View"
                  :class="{ 'bg-blue-200 text-blue-600': show3DGraph }"
                  @click="toggle3DGraph"
                >
                  <svg
                    class="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2L3 7l7 5 7-5-7-5zM3 9l7 5 7-5M3 11l7 5 7-5" />
                  </svg>
                </button>
                <button
                  class="w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
                  title="New File"
                  @click="startCreateNewFile"
                >
                  <svg
                    class="w-3 h-3 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  class="w-4 h-4 hover:bg-gray-200 rounded flex items-center justify-center"
                  title="New Folder"
                  @click="startCreateNewFolder"
                >
                  <svg
                    class="w-3 h-3 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Folder Tree -->
            <div class="flex-1 overflow-y-auto text-xs">
              <div class="px-2 py-1">
                <div class="text-gray-500 font-medium mb-1">
                  WORKSPACE
                </div>

                <!-- New Folder Input -->
                <div
                  v-if="creatingNewFolder"
                  class="mb-2"
                >
                  <div class="flex items-center py-1 bg-blue-50 rounded">
                    <svg
                      class="w-3 h-3 mr-1 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <input
                      v-model="newFolderName"
                      class="new-folder-input flex-1 bg-transparent text-blue-700 outline-none text-xs"
                      placeholder="Folder name..."
                      @keydown.enter="confirmCreateFolder"
                      @keydown.escape="cancelCreate"
                      @blur="cancelCreate"
                    >
                  </div>
                </div>

                <!-- Pages as folders -->
                <div
                  v-for="page in pages"
                  :key="page.id"
                  class="mb-1"
                >
                  <div
                    class="flex items-center py-1 hover:bg-gray-100 cursor-pointer rounded group"
                    :class="{ 'bg-blue-50 text-blue-700': activePageId === page.id }"
                    @click="switchToPage(page.id)"
                  >
                    <svg
                      class="w-3 h-3 mr-1 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span class="text-gray-700 truncate flex-1">{{ page.title }}</span>
                    <button
                      class="opacity-0 group-hover:opacity-100 w-3 h-3 hover:bg-green-200 rounded flex items-center justify-center ml-1"
                      title="Add subfolder"
                      @click.stop="startCreateSubfolder(page.id)"
                    >
                      <svg
                        class="w-2 h-2 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  <!-- Files and folders in page -->
                  <div
                    v-if="page.files || (creatingNewFile && activePageId === page.id)"
                    class="ml-4"
                  >
                    <!-- New File Input -->
                    <div
                      v-if="creatingNewFile && activePageId === page.id"
                      class="mb-1"
                    >
                      <div class="flex items-center py-1 bg-green-50 rounded pl-2">
                        <svg
                          class="w-3 h-3 mr-1 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <input
                          v-model="newFileName"
                          class="new-file-input flex-1 bg-transparent text-green-700 outline-none text-xs"
                          placeholder="path/to/filename.ext"
                          @keydown.enter="confirmCreateFile"
                          @keydown.escape="cancelCreate"
                          @blur="cancelCreate"
                        >
                      </div>
                      <div class="text-xs text-gray-500 ml-4 mt-1">
                        Use "/" to create in subfolders (e.g., "components/Button.vue")
                      </div>
                    </div>

                    <!-- Render files directly for now - simple structure -->
                    <div v-if="page.files">
                      <div
                        v-for="(content, filename) in page.files"
                        :key="filename"
                        class="flex items-center py-1 hover:bg-gray-100 cursor-pointer rounded pl-2 group"
                        :class="{ 'bg-blue-50 text-blue-700': currentActiveFile === `${page.title.toLowerCase().replace(/\s+/g, '-')}/${filename}` }"
                        @click="selectFile(`${page.title.toLowerCase().replace(/\s+/g, '-')}/${filename}`)"
                      >
                        <svg
                          class="w-3 h-3 mr-1 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <span class="truncate flex-1">{{ filename }}</span>
                        <button
                          class="opacity-0 group-hover:opacity-100 w-3 h-3 hover:bg-red-200 rounded flex items-center justify-center ml-1"
                          title="Delete file"
                          @click.stop="deleteFileFromPage(page.id, filename)"
                        >
                          <svg
                            class="w-2 h-2 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Editor Area -->
          <div class="flex-1 overflow-hidden relative">
            <!-- 3D Graph View -->
            <div
              v-if="show3DGraph"
              class="absolute inset-0 z-20 bg-white"
            >
              <div class="h-full flex flex-col">
                <!-- 3D Graph Header -->
                <div class="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
                  <div class="flex items-center space-x-4">
                    <h2 class="text-lg font-semibold text-gray-800">
                      3D Workspace Graph
                    </h2>
                    <div class="flex items-center space-x-2 text-sm text-gray-600">
                      <span>{{ pages.length }} pages</span>
                      <span>•</span>
                      <span>Interactive 3D Visualization</span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <!-- Graph Controls will be handled by the GraphView3D component internally -->
                    <button
                      class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded border"
                      @click="toggle3DGraph"
                    >
                      Close 3D View
                    </button>
                  </div>
                </div>
                <!-- 3D Graph Component -->
                <div class="flex-1">
                  <GraphView3D
                    :pages="pages"
                    :blocks="currentPage?.blocks || []"
                    @exit-graph="toggle3DGraph"
                    @select-page="(pageId) => {
                      switchToPage(pageId)
                      // Keep 3D view open - user can manually close it
                    }"
                  />
                </div>
              </div>
            </div>

            <!-- Regular Editor Views -->
            <div
              v-else
              class="h-full"
            >
              <!-- IDE Mode with Files -->
              <CleanEditor
                v-if="currentPage?.isIDEMode && currentPage?.useFileSystem"
                ref="cleanEditorRef"
                :page-title="currentPage?.title || 'Workspace'"
                :files="allWorkspaceFiles"
                :active-file="currentActiveFile"
                @update-file="updateFile"
                @create-file="createFile"
                @delete-file="deleteFile"
                @rename-file="renameFile"
                @select-file="selectFile"
                @run-code="runCode"
                @create-folder="createFolder"
                @execute-command="executeCommand"
              />

              <!-- IDE Mode with Block Editor -->
              <IDEBlockEditor
                v-else-if="currentPage?.isIDEMode && !currentPage?.useFileSystem"
                :model-value="currentPage?.blocks || []"
                @update:model-value="updateBlocks"
              />

              <!-- Whiteboard Mode -->
              <WhiteboardEditor
                v-else-if="currentPage?.isWhiteboardMode"
                :initial-data="currentPage?.whiteboardData || {}"
                @update:data="updateWhiteboardData"
              />

              <!-- Database/Spreadsheet Mode -->
              <DatabaseEditor
                v-else-if="currentPage?.isDatabaseMode"
                :initial-data="currentPage?.databaseData || {}"
                @update:data="updateDatabaseData"
              />

              <!-- Block-based Editor (Default) -->
              <BlockEditor
                v-else
                :model-value="currentPage?.blocks || []"
                :show-canvas="currentPage?.showCanvas || false"
                :canvas-mode="currentPage?.canvasMode || 'infinite'"
                :all-pages="pages"
                @update:model-value="updateBlocks"
                @update:show-canvas="(value) => { if (currentPage) currentPage.showCanvas = value }"
                @update:canvas-mode="(value) => { if (currentPage) currentPage.canvasMode = value }"
              />
            </div>
          </div>
        </div>

        <!-- Bottom Terminal Panel -->
        <div
          v-if="terminalVisible"
          :class="[
            'border-t border-gray-200 bg-white transition-all duration-300 flex-shrink-0',
            terminalExpanded ? 'h-80' : 'h-10'
          ]"
        >
          <!-- Terminal Header -->
          <div class="h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-3">
            <!-- Terminal Tabs -->
            <div class="flex items-center space-x-1">
              <div
                v-for="tab in terminalTabs"
                :key="tab.id"
                class="flex items-center"
              >
                <button
                  :class="[
                    'px-3 py-1 text-sm rounded-t border-b-2 flex items-center space-x-2',
                    tab.active
                      ? 'bg-white border-blue-500 text-blue-600 font-medium'
                      : 'bg-transparent border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  ]"
                  @click="switchTerminalTab(tab.id)"
                >
                  <span>{{ tab.name }}</span>
                  <button
                    v-if="terminalTabs.length > 1"
                    class="ml-1 text-gray-400 hover:text-red-500"
                    @click.stop="closeTerminalTab(tab.id)"
                  >
                    <svg
                      class="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </button>
              </div>
              <button
                v-if="terminalTabs.length < maxTerminalTabs"
                class="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="New terminal"
                @click="createNewTerminalTab"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            </div>
            <div class="flex items-center space-x-2">
              <button
                class="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                title="Clear terminal"
                @click="clearTerminal"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                class="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                :title="terminalExpanded ? 'Minimize terminal' : 'Maximize terminal'"
                @click="toggleTerminalSize"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="terminalExpanded ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'"
                  />
                </svg>
              </button>
              <button
                class="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                title="Close terminal"
                @click="closeTerminal"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Terminal Content -->
          <div
            v-if="terminalExpanded"
            class="flex-1 overflow-hidden bg-white"
          >
            <Terminal
              ref="terminalRef"
              :files="allWorkspaceFiles"
              :active-file="currentActiveFile"
              :active-tab-id="activeTerminalTab"
              :terminal-tabs="terminalTabs"
              @execute-command="executeCommand"
            />
          </div>
        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="absolute bottom-0 left-0 right-0 h-6 bg-white border-t border-gray-200 flex items-center px-2 text-xs text-gray-600 z-50">
        <!-- Settings Icon -->
        <button
          class="w-4 h-4 hover:bg-gray-100 rounded flex items-center justify-center mr-2"
          title="Open settings"
          @click="openSettings"
        >
          <svg
            class="w-3 h-3 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Folder Toggle Icon -->
        <button
          class="w-4 h-4 hover:bg-gray-100 rounded flex items-center justify-center mr-2"
          title="Toggle folder drawer"
          @click="toggleFolderDrawer"
        >
          <svg
            class="w-3 h-3 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        </button>

        <!-- Terminal Toggle Icon -->
        <button
          class="w-4 h-4 hover:bg-gray-100 rounded flex items-center justify-center mr-2"
          title="Toggle terminal"
          @click="toggleTerminal"
        >
          <svg
            class="w-3 h-3 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- AI Assistant Icon -->
        <button
          :class="[
            'w-4 h-4 hover:bg-gray-100 rounded flex items-center justify-center mr-2 transition-colors',
            isAIActive ? 'animate-pulse-subtle' : ''
          ]"
          title="Toggle AI Assistant (Ctrl+Shift+A)"
          @click="toggleAISidebar"
        >
          <svg
            class="w-3 h-3 text-gray-600"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
            />
            <circle
              cx="12"
              cy="6"
              r="1"
            />
            <circle
              cx="12"
              cy="18"
              r="1"
            />
            <circle
              cx="6"
              cy="12"
              r="1"
            />
            <circle
              cx="18"
              cy="12"
              r="1"
            />
            <path d="M12 9v6" />
            <path d="M9 12h6" />
          </svg>
        </button>

        <!-- Live Server Icon -->
        <button
          class="w-4 h-4 hover:bg-gray-100 rounded flex items-center justify-center mr-3"
          title="Open live server preview"
          @click="openLiveServer"
        >
          <svg
            class="w-3 h-3 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- Status Information -->
        <div class="flex items-center space-x-4">
          <span v-if="currentActiveFile">{{ currentActiveFile }}</span>
          <span v-else>Ready</span>
          <span>{{ getFileLanguage(currentActiveFile) }}</span>
          <span>{{ getFileCharCount(currentActiveFile) }} chars</span>
          <span>{{ getFileLineCount(currentActiveFile) }} lines</span>
        </div>
      </div>

      <!-- Overlay Sidebar that slides over content -->
      <div
        v-if="sidebarVisible"
        class="fixed inset-y-0 left-0 z-50 w-48 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out shadow-lg"
        :class="sidebarExpanded ? 'translate-x-0' : '-translate-x-full'"
      >
        <!-- Sidebar Header -->
        <div class="h-10 border-b border-gray-200 flex items-center justify-between px-3 bg-gray-50">
          <span class="text-sm font-medium text-gray-700">Explorer</span>
          <button
            class="p-1 hover:bg-gray-200 rounded"
            title="Close sidebar"
            @click="closeSidebar"
          >
            <svg
              class="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Sidebar Content -->
        <div class="flex-1 overflow-y-auto">
          <EnhancedFileExplorer
            :files="allWorkspaceFiles"
            :active-file="currentActiveFile"
            :workspace-name="workspaceState.currentWorkspace?.name || 'My Workspace'"
            @file-select="onFileSelect"
            @create-file="createFile"
            @rename-file="renameFile"
            @delete-file="deleteFile"
            @create-folder="createFolder"
            @refresh-files="refreshFileTree"
          />
        </div>
      </div>

      <!-- Overlay Background (when sidebar is open) -->
      <div
        v-if="sidebarVisible && sidebarExpanded"
        class="fixed inset-0 bg-black bg-opacity-20 z-40"
        @click="closeSidebar"
      />
    </div>

    <!-- OLD COMMAND CENTER - DISABLED -->
    <div
      v-if="false"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div
        class="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col"
        @click.stop
      >
        <!-- Tab Header -->
        <div class="flex border-b border-gray-200">
          <button
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              commandCenter.activeTab === 'search'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
            @click="switchCommandCenterTab('search')"
          >
            🔍 Search
          </button>
          <button
            :class="[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              commandCenter.activeTab === 'ai'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
            @click="switchCommandCenterTab('ai')"
          >
            ✨ AI Assistant
          </button>
        </div>

        <!-- Tab Content -->
        <div class="flex-1 overflow-hidden">
          <!-- Search Tab -->
          <div
            v-if="commandCenter.activeTab === 'search'"
            class="p-6 h-full flex flex-col"
          >
            <input
              id="command-center-input"
              v-model="commandCenter.query"
              placeholder="Search documents, ask AI, or run commands..."
              class="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              @input="(e) => handleCommandSearch(e.target.value)"
              @keydown="handleCommandCenterKeydown"
            >

            <div
              v-if="commandCenter.results.length"
              class="flex-1 overflow-y-auto space-y-1"
            >
              <div
                v-for="(result, index) in commandCenter.results"
                :key="result.label + index"
                :class="[
                  result.type === 'separator'
                    ? 'py-1 flex justify-center'
                    : 'p-3 rounded-lg cursor-pointer flex items-center space-x-3 transition-colors',
                  result.type !== 'separator' && index === selectedCommandIndex ? 'bg-blue-50 border border-blue-200' : '',
                  result.type !== 'separator' ? 'hover:bg-gray-50' : ''
                ]"
                @click="result.type !== 'separator' ? executeCommand(result) : null"
              >
                <!-- Separator -->
                <div
                  v-if="result.type === 'separator'"
                  class="text-gray-300 text-xs"
                >
                  ─────────────────
                </div>

                <!-- Regular Command -->
                <template v-else>
                  <span class="text-lg">{{ result.icon || (result.type === 'ai' ? '✨' : result.type === 'workspace' ? '📂' : '🔍') }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      {{ result.label }}
                    </div>
                    <div
                      v-if="result.type === 'workspace'"
                      class="text-xs text-gray-500"
                    >
                      {{ result.workspaceId ? 'Switch to workspace' : 'Workspace' }}
                    </div>
                    <div
                      v-else-if="result.type === 'ai'"
                      class="text-xs text-gray-500"
                    >
                      AI Assistant
                    </div>
                    <div
                      v-else-if="result.type === 'action'"
                      class="text-xs text-gray-500"
                    >
                      Action
                    </div>
                  </div>
                  <div class="text-xs text-gray-400">
                    <kbd class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">↵</kbd>
                  </div>
                </template>
              </div>
            </div>

            <div
              v-else-if="commandCenter.query"
              class="flex-1 flex items-center justify-center"
            >
              <div class="text-center text-gray-500">
                No results found
              </div>
            </div>

            <div
              v-else
              class="flex-1 flex items-center justify-center"
            >
              <div class="space-y-2 text-sm text-gray-500 text-center">
                <p><strong>Quick actions:</strong></p>
                <ul class="space-y-1">
                  <li>• Type to search documents</li>
                  <li>• Ask AI anything</li>
                  <li>• Create new document</li>
                  <li>• Navigate anywhere</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- AI Tab -->
          <div
            v-else-if="commandCenter.activeTab === 'ai'"
            class="h-full flex flex-col"
          >
            <!-- AI Header with controls -->
            <div class="border-b border-gray-200 p-4 flex justify-between items-center">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">
                  {{ aiChat.conversationTitle }}
                </h3>
                <p class="text-xs text-gray-500 flex items-center space-x-2">
                  <span>Using {{ aiSettings.provider.charAt(0).toUpperCase() + aiSettings.provider.slice(1) }}
                    {{ aiSettings.provider === 'ollama' ? `(${aiSettings.ollamaModel})` : '' }}</span>
                  <span class="inline-flex items-center space-x-1 text-green-600">
                    <svg
                      class="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span class="text-xs">Actions enabled</span>
                  </span>
                </p>
              </div>
              <button
                v-if="aiChat.messages.length > 0"
                class="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                @click="clearConversation"
              >
                Clear Chat
              </button>
            </div>

            <!-- Error Display -->
            <div
              v-if="aiChat.error"
              class="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded"
            >
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg
                    class="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800">
                    {{ aiChat.error }}
                  </p>
                  <button
                    class="text-xs text-red-600 hover:text-red-500 mt-1"
                    @click="aiChat.error = null"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            <!-- Messages Area -->
            <div
              ref="aiMessagesContainer"
              class="ai-messages-container flex-1 overflow-y-scroll p-6 space-y-4 min-h-0 scroll-smooth relative scrollbar-hide"
              @scroll="handleScroll"
            >
              <!-- Welcome message if no messages -->
              <div
                v-if="aiChat.messages.length === 0"
                class="text-center py-12"
              >
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span class="text-white text-2xl">✨</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                  AI Assistant Ready
                </h3>
                <p class="text-sm text-gray-600 max-w-sm mx-auto">
                  Using {{ aiSettings.provider.charAt(0).toUpperCase() + aiSettings.provider.slice(1) }} AI provider.
                  Ask me anything about your workspace or get help with your projects.
                </p>

                <!-- Quick action buttons -->
                <div class="mt-6 flex flex-wrap gap-2 justify-center">
                  <button
                    v-for="prompt in quickPrompts"
                    :key="prompt"
                    class="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                    @click="aiChat.inputMessage = prompt"
                  >
                    {{ prompt }}
                  </button>
                </div>
              </div>

              <!-- Messages -->
              <div
                v-for="message in aiChat.messages"
                :key="message.id"
                :class="['flex group', message.role === 'user' ? 'justify-end' : 'justify-start']"
              >
                <div
                  :class="[
                    'max-w-[80%] rounded-lg p-3 relative',
                    message.role === 'user' ? 'bg-blue-600 text-white' : message.isError ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-gray-100 text-gray-900'
                  ]"
                >
                  <!-- Copy button -->
                  <button
                    v-if="message.role === 'assistant'"
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all duration-200"
                    title="Copy message"
                    @click="copyToClipboard(message.content)"
                  >
                    <svg
                      class="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>

                  <div class="text-sm whitespace-pre-wrap pr-8">
                    {{ message.content }}
                  </div>

                  <!-- Action indicators -->
                  <div
                    v-if="message.hasActions"
                    class="mt-2 text-xs"
                  >
                    <div class="flex items-center space-x-2 text-green-600">
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>{{ message.actionResults?.length || 0 }} actions executed</span>
                    </div>
                  </div>

                  <div :class="['text-xs mt-1 flex justify-between items-center', message.role === 'user' ? 'text-blue-200' : message.isError ? 'text-red-600' : message.isActionSummary ? 'text-blue-600' : 'text-gray-500']">
                    <span>{{ new Date(message.timestamp).toLocaleTimeString() }}</span>
                    <span
                      v-if="message.isActionSummary"
                      class="font-medium"
                    >System</span>
                  </div>
                </div>
              </div>

              <!-- Loading indicator -->
              <div
                v-if="aiChat.isLoading"
                class="flex justify-start"
              >
                <div class="bg-gray-100 rounded-lg p-3">
                  <div class="flex space-x-2 items-center">
                    <div class="flex space-x-1">
                      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                    <span class="text-xs text-gray-500">AI is thinking...</span>
                  </div>
                </div>
              </div>

              <!-- Scroll to bottom button -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 scale-90 translate-y-2"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-90 translate-y-2"
              >
                <button
                  v-if="showScrollButton && aiChat.messages.length > 0"
                  class="absolute bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
                  title="Scroll to bottom"
                  @click="forceScrollToBottom"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </Transition>
            </div>

            <!-- Input Area -->
            <div class="border-t border-gray-200 p-4 bg-white sticky bottom-0">
              <div class="flex space-x-2">
                <textarea
                  id="ai-input"
                  v-model="aiChat.inputMessage"
                  placeholder="Ask anything... (Shift+Enter for new line)"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="1"
                  :disabled="aiChat.isLoading"
                  style="min-height: 40px; max-height: 120px;"
                  @keydown="handleInputKeydown"
                  @input="adjustTextareaHeight"
                />
                <button
                  :disabled="!aiChat.inputMessage.trim() || aiChat.isLoading"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                  @click="sendAIMessage(aiChat.inputMessage)"
                >
                  <svg
                    v-if="!aiChat.isLoading"
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </button>
              </div>

              <!-- Input hints -->
              <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>{{ aiSettings.provider.charAt(0).toUpperCase() + aiSettings.provider.slice(1) }} ready</span>
                <span>Enter to send • Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pro Command Center (Ctrl+K) - Primary Navigation Platform -->
    <ProCommandCenter
      ref="commandCenterRef"
      @execute="handleCommandCenterExecute"
    />

    <!-- Universal AI Sidebar (Ctrl+Shift+A) -->
    <UniversalAISidebar
      ref="aiSidebarRef"
      @execute-action="handleExecuteAction"
      @activity-change="handleAIActivityChange"
    />
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

.delay-100 {
  animation-delay: 0.1s;
}

.delay-200 {
  animation-delay: 0.2s;
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Subtle pulse animation for AI active state */
@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari and Opera */
}
</style>
