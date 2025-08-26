// Smart Context Awareness for AI Assistant
// Automatically detects what user is working on and provides relevant suggestions

import { ref, reactive, computed, watch, onMounted, onUnmounted, readonly } from 'vue'

export const useContextAwareness = () => {
  // Current context state
  const currentContext = reactive({
    // Page context
    pageType: 'blocks', // blocks, ide, database, whiteboard, 3d-graph
    pageTitle: '',
    pageContent: '',

    // Selection context
    selectedText: '',
    selectedElement: null,
    selectionType: 'none', // text, image, table, code, block

    // Workspace context
    activeMode: 'workspace',
    currentProject: null,
    recentActions: [],

    // Time-based context
    timeOfDay: 'morning', // morning, afternoon, evening
    dayOfWeek: 'weekday', // weekday, weekend

    // User behavior patterns
    frequentCommands: [],
    workflowPattern: 'writing', // writing, coding, planning, reviewing

    // Environment context
    browserFocus: true,
    networkStatus: 'online',
    deviceType: 'desktop' // desktop, tablet, mobile
  })

  // Context-aware command suggestions
  const contextSuggestions = computed(() => {
    const suggestions = []

    // Based on page type
    switch (currentContext.pageType) {
      case 'blocks':
        suggestions.push(
          { command: 'insertHeading1', label: 'Insert H1 Heading', icon: '📝', priority: 10 },
          { command: 'insertTable', label: 'Insert Table', icon: '📊', priority: 8 },
          { command: 'insertList', label: 'Insert List', icon: '📋', priority: 7 }
        )
        break

      case 'ide':
        suggestions.push(
          { command: 'insertCodeBlock', label: 'Insert Code Block', icon: '💻', priority: 10 },
          { command: 'formatCode', label: 'Format Code', icon: '🔧', priority: 9 },
          { command: 'addComment', label: 'Add Comment', icon: '💬', priority: 8 }
        )
        break

      case 'database':
        suggestions.push(
          { command: 'addRow', label: 'Add Row', icon: '➕', priority: 10 },
          { command: 'addColumn', label: 'Add Column', icon: '📊', priority: 9 },
          { command: 'filterData', label: 'Filter Data', icon: '🔍', priority: 8 }
        )
        break
    }

    // Based on selected content
    if (currentContext.selectedText) {
      suggestions.push(
        { command: 'formatBold', label: 'Make Bold', icon: '🔤', priority: 15 },
        { command: 'formatItalic', label: 'Make Italic', icon: '💭', priority: 14 },
        { command: 'createLink', label: 'Create Link', icon: '🔗', priority: 13 }
      )
    }

    // Based on time of day
    if (currentContext.timeOfDay === 'morning') {
      suggestions.push(
        { command: 'dailyPlan', label: 'Create Daily Plan', icon: '📅', priority: 6 },
        { command: 'reviewTasks', label: 'Review Tasks', icon: '✅', priority: 5 }
      )
    }

    // Based on workflow pattern
    if (currentContext.workflowPattern === 'writing') {
      suggestions.push(
        { command: 'writingAssist', label: 'Writing Assistant', icon: '✍️', priority: 12 },
        { command: 'grammarCheck', label: 'Grammar Check', icon: '📝', priority: 11 }
      )
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 6)
  })

  // Detect page type based on URL and DOM
  const detectPageType = () => {
    if (typeof window === 'undefined') return currentContext.pageType

    const url = window.location.pathname
    const activeElements = document.querySelectorAll('[data-active="true"], .active')

    if (url.includes('ide') || document.querySelector('.monaco-editor')) {
      currentContext.pageType = 'ide'
    } else if (url.includes('database') || document.querySelector('[data-type="database"]')) {
      currentContext.pageType = 'database'
    } else if (url.includes('whiteboard') || document.querySelector('.whiteboard')) {
      currentContext.pageType = 'whiteboard'
    } else if (url.includes('graph') || document.querySelector('.graph-view')) {
      currentContext.pageType = '3d-graph'
    } else {
      currentContext.pageType = 'blocks'
    }

    // Detect page title
    currentContext.pageTitle = document.title || 'Untitled'

    return currentContext.pageType
  }

  // Detect user selection
  const detectSelection = () => {
    if (typeof window === 'undefined') return

    const selection = window.getSelection()
    currentContext.selectedText = selection.toString().trim()

    if (currentContext.selectedText) {
      // Analyze selection type
      const parentElement = selection.anchorNode?.parentElement

      if (parentElement?.tagName === 'CODE') {
        currentContext.selectionType = 'code'
      } else if (parentElement?.tagName === 'TD') {
        currentContext.selectionType = 'table'
      } else if (parentElement?.querySelector('img')) {
        currentContext.selectionType = 'image'
      } else {
        currentContext.selectionType = 'text'
      }
    } else {
      currentContext.selectionType = 'none'
    }
  }

  // Detect time-based context
  const detectTimeContext = () => {
    const hour = new Date().getHours()
    const day = new Date().getDay()

    if (hour < 12) {
      currentContext.timeOfDay = 'morning'
    } else if (hour < 17) {
      currentContext.timeOfDay = 'afternoon'
    } else {
      currentContext.timeOfDay = 'evening'
    }

    currentContext.dayOfWeek = (day === 0 || day === 6) ? 'weekend' : 'weekday'
  }

  // Analyze workflow patterns
  const analyzeWorkflowPattern = () => {
    const recentCommands = currentContext.recentActions.slice(-10)

    const writingCommands = ['insertHeading', 'formatBold', 'formatItalic', 'insertList']
    const codingCommands = ['insertCodeBlock', 'formatCode', 'addComment']
    const planningCommands = ['insertTable', 'createTask', 'addCalendar']

    const writingCount = recentCommands.filter(cmd =>
      writingCommands.some(w => cmd.includes(w))).length
    const codingCount = recentCommands.filter(cmd =>
      codingCommands.some(c => cmd.includes(c))).length
    const planningCount = recentCommands.filter(cmd =>
      planningCommands.some(p => cmd.includes(p))).length

    if (writingCount > codingCount && writingCount > planningCount) {
      currentContext.workflowPattern = 'writing'
    } else if (codingCount > writingCount && codingCount > planningCount) {
      currentContext.workflowPattern = 'coding'
    } else if (planningCount > 0) {
      currentContext.workflowPattern = 'planning'
    } else {
      currentContext.workflowPattern = 'exploring'
    }
  }

  // Track user actions
  const trackAction = (action, details = {}) => {
    currentContext.recentActions.push({
      action,
      details,
      timestamp: Date.now(),
      context: { ...currentContext }
    })

    // Keep only last 50 actions
    if (currentContext.recentActions.length > 50) {
      currentContext.recentActions.shift()
    }

    // Re-analyze workflow patterns
    analyzeWorkflowPattern()
  }

  // Get context-aware welcome message
  const getWelcomeMessage = () => {
    const messages = {
      morning: {
        blocks: 'Good morning! Ready to start writing?',
        ide: 'Good morning! Let\'s code something amazing today!',
        database: 'Good morning! Your data is waiting to be organized.',
        default: 'Good morning! What would you like to create today?'
      },
      afternoon: {
        blocks: 'Hope you\'re having a productive afternoon!',
        ide: 'Afternoon coding session? I\'m here to help!',
        database: 'Let\'s organize some data this afternoon!',
        default: 'How can I help you this afternoon?'
      },
      evening: {
        blocks: 'Working late? Let me help you wrap up!',
        ide: 'Evening coding? Let\'s debug and optimize!',
        database: 'Evening data review session?',
        default: 'How can I assist you this evening?'
      }
    }

    return messages[currentContext.timeOfDay][currentContext.pageType]
      || messages[currentContext.timeOfDay].default
  }

  // Initialize context detection
  const initializeContext = () => {
    if (typeof window === 'undefined') return

    detectPageType()
    detectTimeContext()
    detectSelection()

    // Set up event listeners
    document.addEventListener('selectionchange', detectSelection)
    window.addEventListener('focus', () => currentContext.browserFocus = true)
    window.addEventListener('blur', () => currentContext.browserFocus = false)

    // Periodic context updates
    const contextInterval = setInterval(() => {
      detectPageType()
      detectTimeContext()
    }, 30000) // Update every 30 seconds

    // Cleanup on unmount
    onUnmounted(() => {
      clearInterval(contextInterval)
      document.removeEventListener('selectionchange', detectSelection)
    })
  }

  // Smart command filtering based on context
  const filterCommandsByContext = (commands) => {
    return commands.map((command) => {
      // Add context relevance score
      let relevanceScore = command.baseScore || 1

      // Boost relevance based on current context
      if (currentContext.pageType === 'ide' && command.category === 'coding') {
        relevanceScore += 5
      } else if (currentContext.pageType === 'blocks' && command.category === 'writing') {
        relevanceScore += 5
      } else if (currentContext.selectedText && command.category === 'formatting') {
        relevanceScore += 3
      }

      return {
        ...command,
        relevanceScore,
        contextRelevant: relevanceScore > 1
      }
    }).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  // Get formatted context info for UI display
  const getContextInfo = () => {
    return {
      type: currentContext.pageType.charAt(0).toUpperCase() + currentContext.pageType.slice(1).replace('-', ' '),
      name: currentContext.pageTitle || 'Current Page',
      details: {
        mode: currentContext.activeMode,
        selection: currentContext.selectedText ? `"${currentContext.selectedText.slice(0, 30)}..."` : null,
        workflow: currentContext.workflowPattern
      }
    }
  }

  return {
    currentContext: readonly(currentContext),
    contextSuggestions,
    detectPageType,
    detectSelection,
    trackAction,
    getWelcomeMessage,
    filterCommandsByContext,
    initializeContext,
    getContextInfo
  }
}
