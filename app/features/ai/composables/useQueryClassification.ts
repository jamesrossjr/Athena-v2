import { ref, computed } from 'vue'

export interface QueryClassification {
  type: 'action' | 'ai' | 'mixed'
  confidence: number
  suggestedMode: 'command' | 'ai' | 'auto'
  intent: {
    category: 'navigation' | 'file' | 'search' | 'creation' | 'ai-query' | 'analysis' | 'code' | 'project'
    action?: string
    entities?: string[]
    aiTrigger?: boolean
  }
  reasoning: string
}

export const useQueryClassification = () => {
  // Keywords that indicate navigation/action intent
  const actionKeywords = [
    'go to', 'open', 'create', 'new', 'delete', 'rename', 'move', 'copy',
    'run', 'build', 'test', 'deploy', 'commit', 'push', 'pull', 'merge',
    'switch', 'checkout', 'branch', 'tag', 'stash', 'reset', 'revert',
    'settings', 'preferences', 'config', 'install', 'uninstall',
    'start', 'stop', 'restart', 'debug', 'breakpoint', 'watch'
  ]

  // Keywords that indicate AI/analysis intent
  const aiKeywords = [
    'explain', 'how to', 'what is', 'why', 'summarize', 'analyze', 'review',
    'suggest', 'recommend', 'help me', 'can you', 'please', 'generate',
    'write', 'refactor', 'optimize', 'fix', 'improve', 'document',
    'translate', 'convert', 'transform', 'compare', 'find issues',
    'best practices', 'performance', 'security', 'error', 'bug'
  ]

  // File extensions and programming terms
  const codeTerms = [
    'function', 'class', 'method', 'variable', 'component', 'module',
    'import', 'export', 'api', 'endpoint', 'database', 'query',
    'react', 'vue', 'angular', 'node', 'python', 'java', 'typescript'
  ]

  // Project management terms
  const projectTerms = [
    'project', 'workspace', 'folder', 'directory', 'repository', 'repo',
    'issue', 'ticket', 'task', 'sprint', 'milestone', 'release', 'version'
  ]

  function classifyQuery(query: string): QueryClassification {
    const lowerQuery = query.toLowerCase().trim()

    // Check for explicit AI trigger
    if (lowerQuery.startsWith('ai:') || lowerQuery.startsWith('ask:') || lowerQuery.startsWith('chat:')) {
      return {
        type: 'ai',
        confidence: 1.0,
        suggestedMode: 'ai',
        intent: {
          category: 'ai-query',
          aiTrigger: true
        },
        reasoning: 'Explicit AI trigger detected'
      }
    }

    // Score different aspects
    let actionScore = 0
    let aiScore = 0

    // Check for action keywords
    actionKeywords.forEach((keyword) => {
      if (lowerQuery.includes(keyword)) {
        actionScore += keyword.length === lowerQuery.length ? 2 : 1
      }
    })

    // Check for AI keywords
    aiKeywords.forEach((keyword) => {
      if (lowerQuery.includes(keyword)) {
        aiScore += keyword.length === lowerQuery.length ? 2 : 1
      }
    })

    // Check for question words
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
    const startsWithQuestion = questionWords.some(word => lowerQuery.startsWith(word))
    if (startsWithQuestion) aiScore += 2

    // Check for question mark
    if (lowerQuery.includes('?')) aiScore += 1

    // Length-based scoring (longer queries are more likely AI)
    if (lowerQuery.split(' ').length > 5) aiScore += 1
    if (lowerQuery.split(' ').length > 10) aiScore += 2

    // Check for conversational patterns
    const conversationalPhrases = [
      'i want to', 'i need to', 'can you help', 'please help', 'i would like'
    ]
    conversationalPhrases.forEach((phrase) => {
      if (lowerQuery.includes(phrase)) aiScore += 2
    })

    // Determine category and entities
    let category: QueryClassification['intent']['category'] = 'search'
    const entities: string[] = []

    // Categorization
    if (codeTerms.some(term => lowerQuery.includes(term))) {
      category = 'code'
      entities.push(...codeTerms.filter(term => lowerQuery.includes(term)))
    } else if (projectTerms.some(term => lowerQuery.includes(term))) {
      category = 'project'
      entities.push(...projectTerms.filter(term => lowerQuery.includes(term)))
    } else if (lowerQuery.includes('file') || lowerQuery.includes('folder')) {
      category = 'file'
    } else if (actionScore > aiScore) {
      category = 'navigation'
    } else if (aiScore > actionScore) {
      category = 'ai-query'
    }

    // File path detection
    if (lowerQuery.match(/[\/\\]/) || lowerQuery.match(/\.\w+$/)) {
      category = 'file'
      actionScore += 2
    }

    // Determine final classification
    let type: QueryClassification['type']
    let suggestedMode: QueryClassification['suggestedMode']
    let confidence: number
    let reasoning: string

    if (actionScore > aiScore + 1) {
      type = 'action'
      suggestedMode = 'command'
      confidence = Math.min(0.9, (actionScore - aiScore) / Math.max(actionScore, aiScore, 1))
      reasoning = `Action intent detected (score: ${actionScore} vs ${aiScore})`
    } else if (aiScore > actionScore + 1) {
      type = 'ai'
      suggestedMode = 'ai'
      confidence = Math.min(0.9, (aiScore - actionScore) / Math.max(actionScore, aiScore, 1))
      reasoning = `AI intent detected (score: ${aiScore} vs ${actionScore})`
    } else {
      type = 'mixed'
      suggestedMode = 'auto'
      confidence = 0.5
      reasoning = `Mixed or unclear intent (action: ${actionScore}, ai: ${aiScore})`
    }

    return {
      type,
      confidence,
      suggestedMode,
      intent: {
        category,
        entities: entities.length > 0 ? entities : undefined,
        aiTrigger: false
      },
      reasoning
    }
  }

  // Example classifications for testing
  const exampleQueries = [
    'go to settings',
    'create new project',
    'explain this function',
    'how do I implement authentication?',
    'ai: help me write a component',
    'open main.js',
    'what are the best practices for React?',
    'run tests',
    'can you help me debug this issue?',
    'switch to main branch'
  ]

  const testClassifications = computed(() =>
    exampleQueries.map(query => ({
      query,
      classification: classifyQuery(query)
    }))
  )

  // Get suggestions based on current context
  function getContextualSuggestions(context: {
    currentFile?: string
    currentProject?: string
    currentWorkspace?: string
    recentActions?: string[]
  }) {
    const suggestions: { text: string, type: 'action' | 'ai', category: string }[] = []

    // Action suggestions based on context
    if (context.currentFile) {
      suggestions.push(
        { text: `open ${context.currentFile}`, type: 'action', category: 'file' },
        { text: `run ${context.currentFile}`, type: 'action', category: 'execution' },
        { text: `explain this file`, type: 'ai', category: 'analysis' }
      )
    }

    if (context.currentProject) {
      suggestions.push(
        { text: `go to ${context.currentProject}`, type: 'action', category: 'navigation' },
        { text: `analyze ${context.currentProject} structure`, type: 'ai', category: 'analysis' }
      )
    }

    // Common actions
    suggestions.push(
      { text: 'create new file', type: 'action', category: 'creation' },
      { text: 'open settings', type: 'action', category: 'navigation' },
      { text: 'commit changes', type: 'action', category: 'git' },
      { text: 'run tests', type: 'action', category: 'execution' }
    )

    // AI suggestions
    suggestions.push(
      { text: 'help me with this code', type: 'ai', category: 'assistance' },
      { text: 'explain the current error', type: 'ai', category: 'debugging' },
      { text: 'suggest improvements', type: 'ai', category: 'optimization' },
      { text: 'generate documentation', type: 'ai', category: 'documentation' }
    )

    return suggestions
  }

  return {
    classifyQuery,
    getContextualSuggestions,
    testClassifications,
    actionKeywords,
    aiKeywords,
    codeTerms,
    projectTerms
  }
}
