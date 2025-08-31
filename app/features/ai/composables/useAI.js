/**
 * useAI - Nuxt 4.0 Composable for Universal AI Assistant
 *
 * Auto-imported composable that provides AI capabilities to any Nuxt application
 * without requiring changes to existing code architecture.
 */

export const useAI = () => {
  const config = useRuntimeConfig()
  const { $router } = useNuxtApp()
  const route = useRoute()

  // AI assistant state
  const aiState = reactive({
    isOpen: false,
    isLoading: false,
    currentCommand: '',
    suggestions: [],
    context: {},
    history: [],
    showSettings: false
  })

  // Client-side AI settings (persisted in localStorage)
  const aiSettings = reactive({
    provider: 'ollama',
    ollama: {
      endpoint: 'http://192.168.12.236:8089',
      model: 'gpt-oss:20b'
    },
    openai: {
      apiKey: '',
      model: 'gpt-3.5-turbo'
    },
    claude: {
      apiKey: '',
      model: 'claude-3-haiku-20240307'
    },
    gemini: {
      apiKey: '',
      model: 'gemini-pro'
    }
  })

  // Load settings from localStorage
  const loadSettings = () => {
    if (import.meta.client) {
      try {
        const saved = localStorage.getItem('ai-assistant-settings')
        if (saved) {
          Object.assign(aiSettings, JSON.parse(saved))
        }
      } catch (error) {
        console.warn('Failed to load AI settings:', error)
      }
    }
  }

  // Save settings to localStorage
  const saveSettings = () => {
    if (import.meta.client) {
      try {
        localStorage.setItem('ai-assistant-settings', JSON.stringify(aiSettings))
      } catch (error) {
        console.warn('Failed to save AI settings:', error)
      }
    }
  }

  // Watch for settings changes and save automatically
  watch(aiSettings, saveSettings, { deep: true })

  // AI Core Class - Embeddable AI Engine
  class UniversalAI {
    constructor(options = {}) {
      this.apiKey = options.apiKey || config.public.aiApiKey
      this.actions = new Map()
      this.context = {}
      this.providers = {
        ollama: options.ollamaEndpoint || 'http://192.168.12.236:8089',
        openai: options.openaiApiKey,
        claude: options.claudeApiKey,
        gemini: options.geminiApiKey
      }
      this.currentProvider = options.provider || 'ollama'
      this.settings = {
        ollamaModel: options.ollamaModel || 'gpt-oss:20b',
        ollamaEndpoint: options.ollamaEndpoint || 'http://192.168.12.236:8089'
      }

      // Initialize with Nuxt-specific actions
      this.initializeNuxtActions()
    }

    // Register custom actions for the host application
    registerActions(actions) {
      Object.entries(actions).forEach(([name, config]) => {
        this.actions.set(name, {
          name,
          description: config.description,
          parameters: config.parameters || [],
          execute: config.execute
        })
      })
    }

    // Set context for AI understanding
    setContext(context) {
      this.context = { ...this.context, ...context }
    }

    // Initialize Nuxt-specific actions
    initializeNuxtActions() {
      this.registerActions({
        navigateToPage: {
          description: 'Navigate to a different page using Nuxt router',
          parameters: ['path: string'],
          execute: async (path) => {
            try {
              await $router.push(path)
              return {
                success: true,
                currentPath: path,
                message: `Navigated to ${path}`
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              }
            }
          }
        },

        callNuxtAPI: {
          description: 'Call a Nuxt server API endpoint',
          parameters: ['endpoint: string', 'method?: string', 'data?: object'],
          execute: async (endpoint, method = 'GET', data = null) => {
            try {
              const options = {
                method,
                ...(data && { body: data })
              }

              const result = await $fetch(`/api/${endpoint}`, options)
              return {
                success: true,
                data: result,
                message: `API call to ${endpoint} completed`
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              }
            }
          }
        },

        fetchNuxtData: {
          description: 'Fetch data using Nuxt\'s data fetching',
          parameters: ['key: string', 'endpoint: string'],
          execute: async (key, endpoint) => {
            try {
              const { data } = await $fetch(endpoint)
              return {
                success: true,
                data: data,
                message: `Data fetched from ${endpoint}`
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              }
            }
          }
        },

        getCurrentRoute: {
          description: 'Get current route information',
          parameters: [],
          execute: async () => {
            return {
              success: true,
              data: {
                path: route.path,
                name: route.name,
                params: route.params,
                query: route.query,
                meta: route.meta
              },
              message: `Current route: ${route.path}`
            }
          }
        },

        reloadCurrentPage: {
          description: 'Reload the current page',
          parameters: [],
          execute: async () => {
            try {
              if (import.meta.client) {
                window.location.reload()
              } else {
                await navigateTo(route.path, { replace: true })
              }
              return {
                success: true,
                message: 'Page reloaded successfully'
              }
            } catch (error) {
              return {
                success: false,
                error: error.message
              }
            }
          }
        },

        showNotification: {
          description: 'Show a notification to the user',
          parameters: ['message: string', 'type?: string'],
          execute: async (message, type = 'info') => {
            // This would integrate with the host app's notification system
            // For now, we'll use a simple approach
            if (import.meta.client) {
              const notification = {
                id: Date.now(),
                message,
                type,
                timestamp: new Date()
              }

              // Add to notification store if available
              const notificationStore = useState('notifications', () => [])
              notificationStore.value.unshift(notification)

              return {
                success: true,
                message: `Notification shown: ${message}`
              }
            }
            return {
              success: false,
              error: 'Notifications only available on client-side'
            }
          }
        }
      })
    }

    // Execute AI command
    async executeCommand(command) {
      aiState.isLoading = true
      aiState.currentCommand = command

      try {
        // Parse command for actions
        const actionPattern = /\[ACTION:([^\]]+)\]/g
        const actions = []
        let match

        while ((match = actionPattern.exec(command)) !== null) {
          const actionCall = match[1]
          const actionParts = actionCall.split('(')
          const actionName = actionParts[0]

          if (this.actions.has(actionName)) {
            let params = []
            if (actionParts[1]) {
              const paramString = actionParts[1].replace(')', '')
              params = paramString.split(',').map(p => p.trim().replace(/['"]/g, ''))
            }

            actions.push({
              name: actionName,
              params,
              action: this.actions.get(actionName)
            })
          }
        }

        // Execute actions
        const results = []
        for (const { name, params, action } of actions) {
          try {
            const result = await action.execute(...params)
            results.push({
              action: name,
              params,
              result
            })
          } catch (error) {
            results.push({
              action: name,
              params,
              error: error.message
            })
          }
        }

        // If no actions found, send to AI provider
        if (actions.length === 0) {
          const aiResponse = await this.sendToAIProvider(command)
          results.push({
            action: 'ai_response',
            result: aiResponse
          })
        }

        // Update history
        aiState.history.push({
          command,
          results,
          timestamp: new Date()
        })

        return results
      } catch (error) {
        return [{
          action: 'error',
          error: error.message
        }]
      } finally {
        aiState.isLoading = false
        aiState.currentCommand = ''
      }
    }

    // Send command to AI provider
    async sendToAIProvider(message) {
      const contextPrompt = this.buildContextPrompt()
      const fullMessage = `${contextPrompt}\n\nUser: ${message}`

      try {
        switch (this.currentProvider) {
          case 'ollama':
            return await this.sendToOllama(fullMessage)
          case 'openai':
            return await this.sendToOpenAI(fullMessage)
          case 'claude':
            return await this.sendToClaude(fullMessage)
          case 'gemini':
            return await this.sendToGemini(fullMessage)
          default:
            throw new Error(`Unknown AI provider: ${this.currentProvider}`)
        }
      } catch (error) {
        return {
          success: false,
          message: `AI Provider Error: ${error.message}`,
          error: error.message
        }
      }
    }

    // Build context prompt for AI
    buildContextPrompt() {
      const availableActions = Array.from(this.actions.values())
        .map(action => `- [ACTION:${action.name}(${action.parameters.join(', ')})] - ${action.description}`)
        .join('\n')

      return `You are an AI assistant embedded in a Nuxt.js application. You can perform actions using the following commands:

AVAILABLE ACTIONS:
${availableActions}

CURRENT CONTEXT:
- Current Route: ${route.path}
- Route Name: ${route.name}
- Application Context: ${JSON.stringify(this.context, null, 2)}

When users ask you to perform actions, use the [ACTION:functionName(params)] syntax.
Always provide helpful explanations of what you're doing.`
    }

    // AI Provider implementations
    async sendToOllama(message) {
      const endpoint = this.settings.ollamaEndpoint || this.providers.ollama
      const model = this.settings.ollamaModel || 'gpt-oss:20b'

      try {
        // Use server-side proxy to avoid CORS issues
        const response = await $fetch('/api/ollama/generate', {
          method: 'POST',
          body: {
            endpoint: endpoint,
            model: model,
            prompt: message,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 1000
            }
          }
        })

        return {
          success: true,
          message: response.response || 'No response from Ollama',
          provider: 'ollama',
          model: model
        }
      } catch (error) {
        console.error('Ollama request failed:', {
          endpoint,
          model,
          error: error.message,
          stack: error.stack
        })
        
        // Fallback for when Ollama is not running
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          return {
            success: false,
            message: 'Ollama is not running. Please start Ollama server or switch to a different AI provider.',
            error: 'Connection failed - is Ollama running?',
            provider: 'ollama'
          }
        }
        throw error
      }
    }

    async sendToOpenAI(message) {
      if (!this.providers.openai) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await $fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.providers.openai}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.buildContextPrompt()
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        }
      })

      return {
        success: true,
        message: response.choices[0].message.content,
        provider: 'openai'
      }
    }

    async sendToClaude(message) {
      if (!this.providers.claude) {
        throw new Error('Claude API key not configured')
      }

      const response = await $fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.providers.claude,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: message
            }
          ]
        }
      })

      return {
        success: true,
        message: response.content[0].text,
        provider: 'claude'
      }
    }

    async sendToGemini(message) {
      if (!this.providers.gemini) {
        throw new Error('Gemini API key not configured')
      }

      const response = await $fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.providers.gemini}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          contents: [{
            parts: [{
              text: message
            }]
          }],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        }
      })

      return {
        success: true,
        message: response.candidates[0].content.parts[0].text,
        provider: 'gemini'
      }
    }
  }

  // Load settings first
  loadSettings()

  // Create AI instance with client-side settings
  const ai = new UniversalAI({
    apiKey: config.public.aiApiKey || aiSettings.openai.apiKey,
    openaiApiKey: config.public.openaiApiKey || aiSettings.openai.apiKey,
    claudeApiKey: config.public.claudeApiKey || aiSettings.claude.apiKey,
    geminiApiKey: config.public.geminiApiKey || aiSettings.gemini.apiKey,
    ollamaEndpoint: aiSettings.ollama.endpoint,
    ollamaModel: aiSettings.ollama.model,
    provider: aiSettings.provider
  })

  // Update AI instance when settings change
  watch(() => aiSettings.provider, (newProvider) => {
    ai.currentProvider = newProvider
    ai.settings.ollamaEndpoint = aiSettings.ollama.endpoint
    ai.settings.ollamaModel = aiSettings.ollama.model
    ai.providers.openai = aiSettings.openai.apiKey
    ai.providers.claude = aiSettings.claude.apiKey
    ai.providers.gemini = aiSettings.gemini.apiKey
    ai.providers.ollama = aiSettings.ollama.endpoint
  }, { deep: true })

  // Watch for ollama settings changes specifically
  watch(() => aiSettings.ollama, (newOllamaSettings) => {
    ai.settings.ollamaEndpoint = newOllamaSettings.endpoint
    ai.settings.ollamaModel = newOllamaSettings.model
    ai.providers.ollama = newOllamaSettings.endpoint
  }, { deep: true })

  // Listen for external settings updates (from ProCommandCenter)
  if (import.meta.client) {
    window.addEventListener('ai-settings-updated', (event) => {
      try {
        const updatedSettings = event.detail
        Object.assign(aiSettings, updatedSettings)
        
        // Force update the AI instance
        ai.currentProvider = updatedSettings.provider || ai.currentProvider
        ai.settings.ollamaEndpoint = updatedSettings.ollama?.endpoint || ai.settings.ollamaEndpoint
        ai.settings.ollamaModel = updatedSettings.ollama?.model || ai.settings.ollamaModel
        ai.providers.ollama = updatedSettings.ollama?.endpoint || ai.providers.ollama
        ai.providers.openai = updatedSettings.openai?.apiKey || ai.providers.openai
        ai.providers.claude = updatedSettings.claude?.apiKey || ai.providers.claude
        ai.providers.gemini = updatedSettings.gemini?.apiKey || ai.providers.gemini
        
        console.log('AI settings updated from external source:', updatedSettings)
      } catch (error) {
        console.warn('Failed to handle AI settings update:', error)
      }
    })
  }

  // AI Control Methods
  const openAI = () => {
    aiState.isOpen = true
  }

  const closeAI = () => {
    aiState.isOpen = false
    aiState.currentCommand = ''
  }

  const toggleAI = () => {
    aiState.isOpen = !aiState.isOpen
  }

  const _openSettings = () => {
    aiState.showSettings = true
  }

  const _closeSettings = () => {
    aiState.showSettings = false
  }

  const _toggleSettings = () => {
    aiState.showSettings = !aiState.showSettings
  }

  const _updateProvider = (provider) => {
    aiSettings.provider = provider
    ai.currentProvider = provider
  }

  const _testConnection = async (provider = aiSettings.provider) => {
    const testMessages = {
      ollama: 'Hello, are you working?',
      openai: 'Hello, are you working?',
      claude: 'Hello, are you working?',
      gemini: 'Hello, are you working?'
    }

    try {
      const originalProvider = ai.currentProvider
      ai.currentProvider = provider
      const result = await ai.sendToAIProvider(testMessages[provider])
      ai.currentProvider = originalProvider

      return {
        success: result.success,
        message: result.success ? `${provider} is working correctly!` : result.message,
        provider
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to ${provider}: ${error.message}`,
        provider
      }
    }
  }

  const executeCommand = async (command) => {
    return await ai.executeCommand(command)
  }

  const registerActions = (actions) => {
    ai.registerActions(actions)
  }

  const setContext = (context) => {
    ai.setContext(context)
  }

  // Enhanced sendMessage method for conversation-based interactions
  const sendMessage = async (message, options = {}) => {
    try {
      const { context, conversationHistory } = options

      // Build enhanced context with conversation history
      let contextPrompt = ai.buildContextPrompt()

      if (context) {
        contextPrompt += `\n\nCURRENT CONTEXT:\n${context}`
      }

      if (conversationHistory && conversationHistory.length > 0) {
        const recentMessages = conversationHistory.slice(-5).map(msg =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
        contextPrompt += `\n\nCONVERSATION HISTORY:\n${recentMessages}`
      }

      // Enhanced message with system instructions
      const enhancedMessage = `${contextPrompt}

System Instructions:
- Provide helpful, actionable responses
- If you can perform actions, suggest them clearly
- For code-related queries, provide specific examples
- For UI/navigation tasks, be precise about locations and steps
- Always explain your reasoning

Current User Query: ${message}`

      const response = await ai.sendToAIProvider(enhancedMessage)

      // Parse response for actions
      const actionMatches = response.message?.match(/\[ACTION:([^\]]+)\]/g) || []
      const actions = actionMatches.map((match) => {
        const actionCall = match.replace(/\[ACTION:|\]/g, '')
        const [name, ...params] = actionCall.split('(')[0].split(',').map(s => s.trim())
        return {
          id: `action-${Date.now()}-${Math.random()}`,
          name,
          label: name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          params: params.length > 0 ? params : []
        }
      })

      return {
        text: response.message || 'No response received',
        actions: actions,
        success: response.success,
        provider: response.provider
      }
    } catch (error) {
      return {
        text: `I encountered an error: ${error.message}. Please try again.`,
        actions: [],
        success: false,
        error: error.message
      }
    }
  }

  // Keyboard shortcut handler (Cmd/Ctrl + K)
  const handleKeyboardShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      toggleAI()
    }
  }

  // Initialize keyboard shortcuts on client side
  if (import.meta.client) {
    onMounted(() => {
      document.addEventListener('keydown', handleKeyboardShortcut)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyboardShortcut)
    })
  }

  // Set initial context with Nuxt route information
  setContext({
    currentRoute: route.path,
    routeName: route.name,
    routeParams: route.params,
    routeQuery: route.query,
    nuxtVersion: '4.0',
    timestamp: new Date().toISOString()
  })

  return {
    // AI instance for advanced usage
    ai,

    // State
    aiState: readonly(aiState),
    aiProvider: aiSettings.provider,

    // Control methods
    openAI,
    closeAI,
    toggleAI,

    // Execution methods
    executeCommand,
    registerActions,
    setContext,
    sendMessage
  }
}
