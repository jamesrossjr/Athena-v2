import { ref, computed } from 'vue'
import type { Ref } from 'vue'

export interface AthenaState {
  mood: 'happy' | 'neutral' | 'thinking' | 'excited' | 'concerned'
  energy: number // 0-100
  activity: string
  lastInteraction: Date | null
  conversationContext: Map<string, any>
  suggestions: string[]
  personality: {
    helpfulness: number
    creativity: number
    efficiency: number
    friendliness: number
  }
}

export interface AthenaResponse {
  text: string
  emotion: AthenaState['mood']
  action?: {
    type: string
    data: any
  }
  suggestions?: string[]
  visualization?: {
    type: '3d-graph' | 'workflow' | 'timeline' | 'kanban'
    data: any
  }
}

export function useAthena3D() {
  // State
  const state = ref<AthenaState>({
    mood: 'neutral',
    energy: 100,
    activity: 'idle',
    lastInteraction: null,
    conversationContext: new Map(),
    suggestions: [],
    personality: {
      helpfulness: 0.9,
      creativity: 0.8,
      efficiency: 0.85,
      friendliness: 0.95
    }
  })

  const isProcessing = ref(false)
  const currentAnimation = ref<string>('idle')
  const interactionHistory = ref<Array<{
    timestamp: Date
    type: 'voice' | 'text' | 'gesture'
    input: string
    response: AthenaResponse
  }>>([])

  // Personality traits affect responses
  const responseStyle = computed(() => {
    const { helpfulness, creativity, efficiency, friendliness } = state.value.personality

    if (friendliness > 0.8 && helpfulness > 0.8) return 'enthusiastic'
    if (efficiency > 0.8 && creativity < 0.5) return 'direct'
    if (creativity > 0.8 && friendliness > 0.7) return 'playful'
    if (helpfulness > 0.9) return 'supportive'
    return 'balanced'
  })

  // Process natural language for todo management
  const processNaturalLanguage = async (input: string): Promise<AthenaResponse> => {
    isProcessing.value = true
    currentAnimation.value = 'thinking'

    // Update state
    state.value.activity = 'processing'
    state.value.lastInteraction = new Date()

    // Analyze intent and entities
    const intent = analyzeIntent(input)
    const entities = extractEntities(input)
    const sentiment = analyzeSentiment(input)

    // Adjust mood based on interaction
    updateMood(sentiment)

    // Generate contextual response
    const response = await generateResponse(intent, entities, sentiment)

    // Add to history
    interactionHistory.value.push({
      timestamp: new Date(),
      type: 'voice',
      input,
      response
    })

    // Update suggestions based on context
    updateSuggestions(intent, entities)

    isProcessing.value = false
    currentAnimation.value = 'idle'
    state.value.activity = 'idle'

    return response
  }

  // Analyze user intent
  const analyzeIntent = (input: string): string => {
    const normalized = input.toLowerCase()

    // Todo creation patterns
    if (normalized.match(/\b(create|add|new|make|schedule|remind)\b.*\b(todo|task|item|reminder)\b/)) {
      return 'create_todo'
    }

    // Todo query patterns
    if (normalized.match(/\b(show|list|what|display|get)\b.*\b(todo|task|pending|due)\b/)) {
      return 'query_todos'
    }

    // Todo completion
    if (normalized.match(/\b(complete|finish|done|mark|check)\b/)) {
      return 'complete_todo'
    }

    // Workflow creation
    if (normalized.match(/\b(automate|workflow|trigger|when|if)\b/)) {
      return 'create_workflow'
    }

    // Analytics request
    if (normalized.match(/\b(analyze|stats|statistics|progress|productivity|report)\b/)) {
      return 'show_analytics'
    }

    // Prioritization
    if (normalized.match(/\b(prioritize|important|urgent|focus|next)\b/)) {
      return 'prioritize_todos'
    }

    // Collaboration
    if (normalized.match(/\b(assign|delegate|share|team|collaborate)\b/)) {
      return 'collaborate'
    }

    // Help request
    if (normalized.match(/\b(help|how|what can|explain|guide)\b/)) {
      return 'help'
    }

    return 'general'
  }

  // Extract entities from input
  const extractEntities = (input: string): Record<string, any> => {
    const entities: Record<string, any> = {}

    // Time entities
    const timePatterns = {
      today: /\btoday\b/i,
      tomorrow: /\btomorrow\b/i,
      thisWeek: /\bthis week\b/i,
      nextWeek: /\bnext week\b/i,
      urgent: /\b(urgent|asap|immediately)\b/i,
      morning: /\b(morning|am)\b/i,
      afternoon: /\b(afternoon|pm)\b/i,
      evening: /\b(evening|night)\b/i
    }

    for (const [key, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(input)) {
        entities.time = entities.time || []
        entities.time.push(key)
      }
    }

    // Priority extraction
    if (/\b(high|critical|urgent|important)\b/i.test(input)) {
      entities.priority = 'high'
    } else if (/\b(low|minor|optional)\b/i.test(input)) {
      entities.priority = 'low'
    } else {
      entities.priority = 'medium'
    }

    // Project/Category extraction
    const projectMatch = input.match(/\b(?:for|in|under|project:|category:)\s*([A-Za-z0-9\s]+)/i)
    if (projectMatch) {
      entities.project = projectMatch[1].trim()
    }

    // Person extraction (for assignments)
    const personMatch = input.match(/\b(?:assign to|delegate to|for)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
    if (personMatch) {
      entities.assignee = personMatch[1]
    }

    // Tags extraction
    const tags = input.match(/#\w+/g)
    if (tags) {
      entities.tags = tags.map(tag => tag.substring(1))
    }

    // Duration extraction
    const durationMatch = input.match(/\b(\d+)\s*(hour|minute|day|week)s?\b/i)
    if (durationMatch) {
      entities.duration = {
        value: parseInt(durationMatch[1]),
        unit: durationMatch[2].toLowerCase()
      }
    }

    return entities
  }

  // Analyze sentiment
  const analyzeSentiment = (input: string): number => {
    const positive = /\b(great|awesome|perfect|excellent|happy|excited|love|thanks|please)\b/gi
    const negative = /\b(bad|terrible|awful|hate|angry|frustrated|annoying|stupid)\b/gi
    const urgent = /\b(urgent|asap|immediately|critical|emergency)\b/gi

    const positiveCount = (input.match(positive) || []).length
    const negativeCount = (input.match(negative) || []).length
    const urgentCount = (input.match(urgent) || []).length

    // Calculate sentiment score (-1 to 1)
    let score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount)

    // Urgent items slightly decrease sentiment (stress)
    score -= urgentCount * 0.1

    return Math.max(-1, Math.min(1, score))
  }

  // Update Athena's mood based on interactions
  const updateMood = (sentiment: number) => {
    if (sentiment > 0.5) {
      state.value.mood = 'excited'
      state.value.energy = Math.min(100, state.value.energy + 5)
    } else if (sentiment > 0) {
      state.value.mood = 'happy'
    } else if (sentiment < -0.5) {
      state.value.mood = 'concerned'
      state.value.energy = Math.max(0, state.value.energy - 5)
    } else if (sentiment < 0) {
      state.value.mood = 'thinking'
    } else {
      state.value.mood = 'neutral'
    }
  }

  // Generate contextual response
  const generateResponse = async (
    intent: string,
    entities: Record<string, any>,
    sentiment: number
  ): Promise<AthenaResponse> => {
    const style = responseStyle.value
    let response: AthenaResponse = {
      text: '',
      emotion: state.value.mood,
      suggestions: []
    }

    switch (intent) {
      case 'create_todo':
        response = generateCreateTodoResponse(entities, style)
        break

      case 'query_todos':
        response = generateQueryTodosResponse(entities, style)
        break

      case 'complete_todo':
        response = generateCompleteTodoResponse(entities, style)
        break

      case 'create_workflow':
        response = generateWorkflowResponse(entities, style)
        break

      case 'show_analytics':
        response = generateAnalyticsResponse(entities, style)
        break

      case 'prioritize_todos':
        response = generatePrioritizationResponse(entities, style)
        break

      case 'collaborate':
        response = generateCollaborationResponse(entities, style)
        break

      case 'help':
        response = generateHelpResponse(style)
        break

      default:
        response = generateGeneralResponse(sentiment, style)
    }

    return response
  }

  // Response generators for different intents
  const generateCreateTodoResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: [
        'Absolutely! I\'m creating that task for you right now. This is going to help you stay super organized!',
        'Perfect! I love helping you stay on track. Creating this todo with all the details you mentioned!',
        'You got it! Adding this to your tasks. You\'re really crushing it with your productivity today!'
      ],
      direct: [
        'Task created.',
        'Added to your todo list.',
        'Done. The task has been scheduled.'
      ],
      playful: [
        'Consider it done! Another task for the productivity champion!',
        'Boom! Task created faster than you can say \'productivity\'!',
        'Task added! You\'re building quite the collection there!'
      ],
      supportive: [
        'I\'ve created that task for you. You\'re doing great at staying organized!',
        'Task added successfully. I\'m here if you need help managing your workload.',
        'Got it! I\'ve added this to your tasks. Remember, one step at a time!'
      ],
      balanced: [
        'I\'ve created the task for you.',
        'Task has been added to your list.',
        'Successfully created your todo.'
      ]
    }

    const text = responses[style][Math.floor(Math.random() * responses[style].length)]

    return {
      text,
      emotion: style === 'enthusiastic' ? 'excited' : 'happy',
      action: {
        type: 'create_todo',
        data: entities
      },
      suggestions: [
        'Would you like to set a reminder?',
        'Should I add any subtasks?',
        'Want to see your schedule for today?'
      ]
    }
  }

  const generateQueryTodosResponse = (entities: any, style: string): AthenaResponse => {
    const count = Math.floor(Math.random() * 10) + 1 // Mock todo count

    const responses = {
      enthusiastic: `You have ${count} todos! Let me show them to you - you're going to love how organized everything looks!`,
      direct: `${count} todos found.`,
      playful: `${count} adventures await you on your todo list! Ready to conquer them?`,
      supportive: `You have ${count} todos. Don't worry, we'll tackle them together, one at a time!`,
      balanced: `Here are your ${count} todos.`
    }

    return {
      text: responses[style],
      emotion: 'neutral',
      action: {
        type: 'show_todos',
        data: entities
      },
      visualization: {
        type: 'kanban',
        data: { filter: entities }
      }
    }
  }

  const generateCompleteTodoResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: [
        'Woohoo! Task completed! You\'re on fire today! 🎉',
        'Amazing work! Another one bites the dust! Keep up the fantastic momentum!',
        'YES! Task marked as complete! You\'re absolutely crushing your goals!'
      ],
      direct: [
        'Task completed.',
        'Marked as done.',
        'Status updated.'
      ],
      playful: [
        'Ding ding ding! We have a winner! Task completed!',
        'And... it\'s gone! Task vanquished successfully!',
        'Achievement unlocked: Task Completer!'
      ],
      supportive: [
        'Great job completing that task! You\'re making excellent progress.',
        'Well done! Every completed task is a step forward.',
        'Task completed! You should be proud of your progress.'
      ],
      balanced: [
        'Task has been marked as complete.',
        'I\'ve updated the task status to completed.',
        'Task completed successfully.'
      ]
    }

    const text = responses[style][Math.floor(Math.random() * responses[style].length)]

    return {
      text,
      emotion: 'excited',
      action: {
        type: 'complete_todo',
        data: entities
      },
      suggestions: [
        'Want to see what\'s next on your list?',
        'Should I show your progress stats?',
        'Ready for the next task?'
      ]
    }
  }

  const generateWorkflowResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: 'Oh, I LOVE automation! Let\'s create an amazing workflow that\'ll save you tons of time!',
      direct: 'Opening workflow builder.',
      playful: 'Time to automate all the things! Let\'s build some workflow magic!',
      supportive: 'Great idea! Automation can really help reduce your workload. Let\'s set this up together.',
      balanced: 'I\'ll help you create a workflow for that.'
    }

    return {
      text: responses[style],
      emotion: 'thinking',
      action: {
        type: 'create_workflow',
        data: entities
      },
      visualization: {
        type: 'workflow',
        data: { template: 'blank' }
      }
    }
  }

  const generateAnalyticsResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: 'Let\'s dive into your productivity stats! You\'re going to love seeing your progress!',
      direct: 'Generating analytics report.',
      playful: 'Time for some number crunching! Let\'s see how awesome you\'ve been!',
      supportive: 'Let\'s look at your progress together. Remember, every small step counts!',
      balanced: 'Here\'s your productivity analysis.'
    }

    return {
      text: responses[style],
      emotion: 'thinking',
      action: {
        type: 'show_analytics',
        data: entities
      },
      visualization: {
        type: '3d-graph',
        data: { period: entities.time || '7d' }
      }
    }
  }

  const generatePrioritizationResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: 'Let\'s get your priorities straight! I\'ll help you focus on what matters most!',
      direct: 'Analyzing task priorities.',
      playful: 'Time to separate the \'must-dos\' from the \'maybe-laters\'!',
      supportive: 'I\'ll help you prioritize. Remember, you don\'t have to do everything at once.',
      balanced: 'I\'ll help you prioritize your tasks.'
    }

    return {
      text: responses[style],
      emotion: 'thinking',
      action: {
        type: 'prioritize',
        data: entities
      },
      suggestions: [
        'Focus on high-priority items first',
        'Consider using time-blocking',
        'Break large tasks into smaller ones'
      ]
    }
  }

  const generateCollaborationResponse = (entities: any, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: 'Teamwork makes the dream work! Let\'s get everyone on board!',
      direct: 'Setting up collaboration.',
      playful: 'Calling all teammates! Time to join forces!',
      supportive: 'Great idea to collaborate! Working together makes tasks easier.',
      balanced: 'I\'ll help you set up collaboration for this task.'
    }

    return {
      text: responses[style],
      emotion: 'happy',
      action: {
        type: 'collaborate',
        data: entities
      }
    }
  }

  const generateHelpResponse = (style: string): AthenaResponse => {
    const responses = {
      enthusiastic: 'I\'m SO glad you asked! I can help you with todos, workflows, analytics, and so much more! What would you like to explore?',
      direct: 'I can: create todos, manage tasks, build workflows, show analytics, prioritize work.',
      playful: 'Your wish is my command! I\'m like a genie, but for productivity! What can I grant you today?',
      supportive: 'I\'m here to help! I can assist with task management, automation, analytics, and keeping you organized. What do you need?',
      balanced: 'I can help you manage todos, create workflows, view analytics, and organize your work.'
    }

    return {
      text: responses[style],
      emotion: 'happy',
      suggestions: [
        'Create a new todo',
        'Show my tasks',
        'Build a workflow',
        'View analytics',
        'Prioritize tasks'
      ]
    }
  }

  const generateGeneralResponse = (sentiment: number, style: string): AthenaResponse => {
    const responses = {
      enthusiastic: [
        'I\'m here and ready to help you be amazing!',
        'Let\'s make today incredibly productive!',
        'I\'m excited to help you achieve your goals!'
      ],
      direct: [
        'How can I help?',
        'What do you need?',
        'Ready for your command.'
      ],
      playful: [
        'At your service, productivity master!',
        'Ready to rock and roll!',
        'What adventure shall we embark on?'
      ],
      supportive: [
        'I\'m here for you. How can I help?',
        'Whatever you need, we\'ll handle it together.',
        'I\'m ready to support you in any way I can.'
      ],
      balanced: [
        'How can I assist you?',
        'What would you like to do?',
        'I\'m ready to help.'
      ]
    }

    const text = responses[style][Math.floor(Math.random() * responses[style].length)]

    return {
      text,
      emotion: sentiment > 0 ? 'happy' : 'neutral'
    }
  }

  // Update contextual suggestions
  const updateSuggestions = (intent: string, entities: Record<string, any>) => {
    const suggestions: string[] = []

    // Time-based suggestions
    const hour = new Date().getHours()
    if (hour < 12) {
      suggestions.push('Review today\'s priorities')
    } else if (hour < 17) {
      suggestions.push('Check afternoon tasks')
    } else {
      suggestions.push('Plan tomorrow\'s tasks')
    }

    // Context-based suggestions
    switch (intent) {
      case 'create_todo':
        suggestions.push('Add another task')
        suggestions.push('Set up a recurring task')
        suggestions.push('Create a workflow')
        break

      case 'complete_todo':
        suggestions.push('What\'s next?')
        suggestions.push('View progress')
        suggestions.push('Take a break')
        break

      case 'show_analytics':
        suggestions.push('Export report')
        suggestions.push('Set productivity goals')
        suggestions.push('Review patterns')
        break
    }

    // Add personality-based suggestions
    if (state.value.energy < 30) {
      suggestions.push('Take a short break')
    }

    if (interactionHistory.value.length > 10) {
      suggestions.push('Review recent activity')
    }

    state.value.suggestions = suggestions.slice(0, 5)
  }

  // Gesture recognition for 3D interactions
  const handleGesture = (gesture: string) => {
    switch (gesture) {
      case 'wave':
        state.value.mood = 'happy'
        currentAnimation.value = 'wave'
        break

      case 'tap':
        currentAnimation.value = 'nod'
        break

      case 'swipe_up':
        currentAnimation.value = 'fly'
        break

      case 'long_press':
        currentAnimation.value = 'think'
        state.value.mood = 'thinking'
        break
    }
  }

  // Energy management
  const updateEnergy = () => {
    // Decrease energy with interactions
    if (state.value.activity !== 'idle') {
      state.value.energy = Math.max(0, state.value.energy - 1)
    } else {
      // Slowly regenerate energy when idle
      state.value.energy = Math.min(100, state.value.energy + 0.5)
    }

    // Adjust behavior based on energy
    if (state.value.energy < 20) {
      state.value.mood = 'neutral'
      state.value.personality.efficiency *= 0.8
    }
  }

  // Learning and adaptation
  const learnFromInteraction = (input: string, response: AthenaResponse, feedback?: 'positive' | 'negative') => {
    // Store interaction patterns
    state.value.conversationContext.set(input, {
      response,
      feedback,
      timestamp: new Date()
    })

    // Adjust personality based on feedback
    if (feedback === 'positive') {
      // Reinforce current personality traits
      Object.keys(state.value.personality).forEach((trait) => {
        state.value.personality[trait as keyof typeof state.value.personality]
          = Math.min(1, state.value.personality[trait as keyof typeof state.value.personality] + 0.01)
      })
    } else if (feedback === 'negative') {
      // Adjust personality traits
      if (responseStyle.value === 'enthusiastic') {
        state.value.personality.friendliness *= 0.95
      } else if (responseStyle.value === 'direct') {
        state.value.personality.friendliness *= 1.05
      }
    }
  }

  // Get contextual greeting
  const getGreeting = (): string => {
    const hour = new Date().getHours()
    const greetings = {
      morning: [
        'Good morning! Ready to make today amazing?',
        'Rise and shine! What shall we accomplish today?',
        'Morning! Let\'s make today productive!'
      ],
      afternoon: [
        'Good afternoon! How\'s your day going?',
        'Hey there! Ready to tackle the afternoon?',
        'Afternoon! Let\'s keep the momentum going!'
      ],
      evening: [
        'Good evening! Wrapping up for the day?',
        'Evening! Time to review today\'s progress?',
        'Hey! Let\'s see what you\'ve accomplished today!'
      ],
      night: [
        'Still working? Don\'t forget to rest!',
        'Burning the midnight oil? I\'m here to help!',
        'Late night productivity session? Let\'s do this!'
      ]
    }

    let timeOfDay: keyof typeof greetings
    if (hour < 12) timeOfDay = 'morning'
    else if (hour < 17) timeOfDay = 'afternoon'
    else if (hour < 21) timeOfDay = 'evening'
    else timeOfDay = 'night'

    const options = greetings[timeOfDay]
    return options[Math.floor(Math.random() * options.length)]
  }

  return {
    // State
    state,
    isProcessing,
    currentAnimation,
    interactionHistory,
    responseStyle,

    // Methods
    processNaturalLanguage,
    handleGesture,
    updateEnergy,
    learnFromInteraction,
    getGreeting,

    // Analysis functions (exposed for testing/debugging)
    analyzeIntent,
    extractEntities,
    analyzeSentiment
  }
}
