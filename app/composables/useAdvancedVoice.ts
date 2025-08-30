import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

interface ConversationContext {
  lastCommand: string | null
  lastResponse: string | null
  activeCard: string | null
  conversationDepth: number
  contextStack: Array<{
    intent: string
    entities: Record<string, any>
    timestamp: Date
  }>
  spatialContext: {
    focusedNode: string | null
    viewportCenter: { x: number; y: number }
    zoomLevel: number
  }
}

interface VoiceConfig {
  continuous: boolean
  interimResults: boolean
  confidenceThreshold: number
  silenceTimeout: number
  wakeWords: string[]
  voiceSettings: {
    rate: number
    pitch: number
    volume: number
    voice: SpeechSynthesisVoice | null
  }
}

export function useAdvancedVoice() {
  // Core state
  const isListening = ref(false)
  const isProcessing = ref(false)
  const isSpeaking = ref(false)
  const isConversationMode = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const confidence = ref(0)
  
  // Advanced state
  const conversationContext = ref<ConversationContext>({
    lastCommand: null,
    lastResponse: null,
    activeCard: null,
    conversationDepth: 0,
    contextStack: [],
    spatialContext: {
      focusedNode: null,
      viewportCenter: { x: 0, y: 0 },
      zoomLevel: 1
    }
  })
  
  const voiceConfig = ref<VoiceConfig>({
    continuous: true,
    interimResults: true,
    confidenceThreshold: 0.7,
    silenceTimeout: 1500,
    wakeWords: ['athena', 'hey athena', 'ok athena', 'athena please'],
    voiceSettings: {
      rate: 1.1,
      pitch: 1.0,
      volume: 1.0,
      voice: null
    }
  })
  
  // Audio analysis
  const audioContext = ref<AudioContext | null>(null)
  const analyser = ref<AnalyserNode | null>(null)
  const microphone = ref<MediaStreamAudioSourceNode | null>(null)
  const voiceActivityDetection = ref({
    isSpeaking: false,
    volume: 0,
    frequency: 0,
    clarity: 0
  })
  
  // Recognition instances
  let recognition: any = null
  let synthesis: SpeechSynthesis | null = null
  let silenceTimer: NodeJS.Timeout | null = null
  let conversationTimer: NodeJS.Timeout | null = null
  
  // Initialize speech recognition with advanced features
  const initializeRecognition = () => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported')
      return
    }
    
    recognition = new SpeechRecognition()
    recognition.continuous = voiceConfig.value.continuous
    recognition.interimResults = voiceConfig.value.interimResults
    recognition.maxAlternatives = 3
    recognition.lang = 'en-US'
    
    // Advanced event handlers
    recognition.onstart = () => {
      isListening.value = true
      resetSilenceTimer()
    }
    
    recognition.onresult = (event: any) => {
      handleRecognitionResult(event)
    }
    
    recognition.onerror = (event: any) => {
      handleRecognitionError(event)
    }
    
    recognition.onend = () => {
      if (isConversationMode.value && !isSpeaking.value) {
        // Restart in conversation mode for continuous listening
        setTimeout(() => {
          if (isConversationMode.value) {
            recognition.start()
          }
        }, 100)
      } else {
        isListening.value = false
      }
    }
    
    recognition.onsoundstart = () => {
      voiceActivityDetection.value.isSpeaking = true
    }
    
    recognition.onsoundend = () => {
      voiceActivityDetection.value.isSpeaking = false
    }
    
    recognition.onnomatch = () => {
      // Handle no match gracefully
      if (isConversationMode.value) {
        speak("I didn't quite catch that. Could you repeat?")
      }
    }
  }
  
  // Initialize audio context for voice analysis
  const initializeAudioAnalysis = async () => {
    try {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 2048
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      microphone.value = audioContext.value.createMediaStreamSource(stream)
      microphone.value.connect(analyser.value)
      
      startVoiceAnalysis()
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error)
    }
  }
  
  // Continuous voice analysis for better detection
  const startVoiceAnalysis = () => {
    if (!analyser.value) return
    
    const bufferLength = analyser.value.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const analyze = () => {
      if (!analyser.value) return
      
      analyser.value.getByteFrequencyData(dataArray)
      
      // Calculate voice metrics
      let sum = 0
      let maxFreq = 0
      let maxFreqIndex = 0
      
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
        if (dataArray[i] > maxFreq) {
          maxFreq = dataArray[i]
          maxFreqIndex = i
        }
      }
      
      voiceActivityDetection.value.volume = sum / bufferLength / 255
      voiceActivityDetection.value.frequency = maxFreqIndex * audioContext.value!.sampleRate / (2 * bufferLength)
      voiceActivityDetection.value.clarity = maxFreq / 255
      
      // Detect voice activity
      const isVoice = voiceActivityDetection.value.volume > 0.1 && 
                     voiceActivityDetection.value.frequency > 85 && 
                     voiceActivityDetection.value.frequency < 300
      
      voiceActivityDetection.value.isSpeaking = isVoice
      
      requestAnimationFrame(analyze)
    }
    
    analyze()
  }
  
  // Advanced recognition result handler
  const handleRecognitionResult = (event: any) => {
    let finalTranscript = ''
    let interim = ''
    let maxConfidence = 0
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const alternative = result[0]
      const text = alternative.transcript.trim()
      
      if (result.isFinal) {
        finalTranscript += text + ' '
        maxConfidence = Math.max(maxConfidence, alternative.confidence || 0.9)
      } else {
        interim += text + ' '
      }
    }
    
    interimTranscript.value = interim.trim()
    
    if (finalTranscript) {
      transcript.value = finalTranscript.trim()
      confidence.value = maxConfidence
      
      // Process with context awareness
      processTranscript(transcript.value, maxConfidence)
      
      // Reset silence timer
      resetSilenceTimer()
    }
  }
  
  // Process transcript with advanced NLU
  const processTranscript = async (text: string, confidence: number) => {
    const normalizedText = text.toLowerCase().trim()
    
    // Check for wake words
    const hasWakeWord = voiceConfig.value.wakeWords.some(word => 
      normalizedText.includes(word.toLowerCase())
    )
    
    if (!isConversationMode.value && hasWakeWord) {
      // Enter conversation mode
      enterConversationMode()
      
      // Remove wake word and process command
      const command = voiceConfig.value.wakeWords.reduce((text, word) => 
        text.replace(new RegExp(word, 'gi'), ''), normalizedText
      ).trim()
      
      if (command) {
        await processCommand(command)
      } else {
        await speak("Yes, I'm listening. How can I help you?")
      }
    } else if (isConversationMode.value) {
      // In conversation mode, process everything
      await processCommand(normalizedText)
    } else if (confidence > voiceConfig.value.confidenceThreshold) {
      // High confidence command without wake word
      const quickCommands = ['stop', 'pause', 'resume', 'cancel', 'help']
      if (quickCommands.some(cmd => normalizedText.includes(cmd))) {
        await processCommand(normalizedText)
      }
    }
  }
  
  // Advanced command processing with context
  const processCommand = async (command: string) => {
    isProcessing.value = true
    
    // Analyze command with context
    const analysis = await analyzeCommandWithContext(command)
    
    // Update conversation context
    conversationContext.value.lastCommand = command
    conversationContext.value.conversationDepth++
    conversationContext.value.contextStack.push({
      intent: analysis.intent,
      entities: analysis.entities,
      timestamp: new Date()
    })
    
    // Keep context stack manageable
    if (conversationContext.value.contextStack.length > 10) {
      conversationContext.value.contextStack.shift()
    }
    
    // Execute command based on intent
    const response = await executeCommand(analysis)
    
    // Speak response
    await speak(response.text)
    
    // Update context
    conversationContext.value.lastResponse = response.text
    
    // Handle follow-up actions
    if (response.followUp) {
      setTimeout(() => {
        handleFollowUp(response.followUp!)
      }, 1000)
    }
    
    isProcessing.value = false
    
    // Reset conversation timer
    resetConversationTimer()
    
    return response
  }
  
  // Context-aware command analysis
  const analyzeCommandWithContext = async (command: string) => {
    const lastContext = conversationContext.value.contextStack[
      conversationContext.value.contextStack.length - 1
    ]
    
    // Enhanced intent detection with context
    let intent = detectIntent(command)
    const entities = extractEntities(command)
    
    // Contextual intent resolution
    if (intent === 'unclear' && lastContext) {
      // Try to infer intent from context
      if (command.includes('yes') || command.includes('sure') || command.includes('ok')) {
        intent = 'confirm'
        entities.confirmedAction = lastContext.intent
      } else if (command.includes('no') || command.includes('cancel')) {
        intent = 'cancel'
      } else if (command.includes('that') || command.includes('it')) {
        // Reference to previous context
        intent = lastContext.intent
        entities.reference = 'previous'
      }
    }
    
    // Pronoun resolution
    if (command.includes('it') || command.includes('that') || command.includes('this')) {
      if (conversationContext.value.activeCard) {
        entities.target = conversationContext.value.activeCard
      } else if (conversationContext.value.spatialContext.focusedNode) {
        entities.target = conversationContext.value.spatialContext.focusedNode
      }
    }
    
    return { intent, entities, confidence: 0.85 }
  }
  
  // Enhanced intent detection
  const detectIntent = (command: string): string => {
    const intents = {
      // Canvas manipulation
      'canvas.create': /\b(create|add|new|make|spawn|generate)\b.*\b(card|node|workspace|todo|document|note)\b/i,
      'canvas.remove': /\b(remove|delete|close|destroy|kill)\b.*\b(card|node|workspace|this|that|it)\b/i,
      'canvas.move': /\b(move|drag|shift|place|position)\b.*\b(to|here|there|left|right|up|down|center)\b/i,
      'canvas.zoom': /\b(zoom|magnify|focus)\b.*\b(in|out|on|to)\b/i,
      'canvas.navigate': /\b(go|navigate|jump|show|take me)\b.*\b(to|back|forward|home)\b/i,
      'canvas.organize': /\b(organize|arrange|align|distribute|clean|tidy)\b/i,
      
      // Todo management
      'todo.create': /\b(todo|task|reminder)\b.*\b(create|add|new)\b/i,
      'todo.complete': /\b(complete|finish|done|check|mark)\b.*\b(todo|task|that|it)\b/i,
      'todo.list': /\b(show|list|what are|display)\b.*\b(todo|task|pending|due)\b/i,
      'todo.prioritize': /\b(prioritize|important|urgent|focus)\b/i,
      
      // Workflow
      'workflow.create': /\b(workflow|automation|trigger|automate)\b/i,
      'workflow.connect': /\b(connect|link|wire|attach)\b.*\b(to|with|between)\b/i,
      
      // Search and filter
      'search': /\b(search|find|look for|where is|locate)\b/i,
      'filter': /\b(filter|show only|hide|exclude)\b/i,
      
      // Conversation
      'greeting': /^(hello|hi|hey|good morning|good afternoon)/i,
      'goodbye': /\b(goodbye|bye|see you|talk later|exit)\b/i,
      'help': /\b(help|what can you|how do|explain|guide)\b/i,
      'confirm': /^(yes|yeah|sure|ok|confirm|do it|go ahead)/i,
      'cancel': /^(no|cancel|stop|abort|never mind)/i,
      
      // Meta commands
      'undo': /\b(undo|revert|go back|cancel last)\b/i,
      'redo': /\b(redo|repeat|do again)\b/i,
      'clear': /\b(clear|reset|start over|clean slate)\b/i
    }
    
    for (const [key, pattern] of Object.entries(intents)) {
      if (pattern.test(command)) {
        return key
      }
    }
    
    return 'unclear'
  }
  
  // Enhanced entity extraction
  const extractEntities = (command: string): Record<string, any> => {
    const entities: Record<string, any> = {}
    
    // Spatial entities
    const spatialTerms = {
      positions: {
        'top left': { x: 0.2, y: 0.2 },
        'top right': { x: 0.8, y: 0.2 },
        'bottom left': { x: 0.2, y: 0.8 },
        'bottom right': { x: 0.8, y: 0.8 },
        'center': { x: 0.5, y: 0.5 },
        'left': { x: 0.2, y: 0.5 },
        'right': { x: 0.8, y: 0.5 },
        'top': { x: 0.5, y: 0.2 },
        'bottom': { x: 0.5, y: 0.8 }
      },
      directions: {
        'up': { dx: 0, dy: -100 },
        'down': { dx: 0, dy: 100 },
        'left': { dx: -100, dy: 0 },
        'right': { dx: 100, dy: 0 }
      }
    }
    
    // Check for spatial positions
    for (const [term, coords] of Object.entries(spatialTerms.positions)) {
      if (command.includes(term)) {
        entities.position = coords
        break
      }
    }
    
    // Check for directions
    for (const [term, delta] of Object.entries(spatialTerms.directions)) {
      if (command.includes(term)) {
        entities.direction = delta
        break
      }
    }
    
    // Card types
    const cardTypes = ['todo', 'document', 'workspace', 'note', 'workflow', 'calendar', 'kanban']
    for (const type of cardTypes) {
      if (command.includes(type)) {
        entities.cardType = type
        break
      }
    }
    
    // Colors
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'gray']
    for (const color of colors) {
      if (command.includes(color)) {
        entities.color = color
        break
      }
    }
    
    // Quantities
    const quantityMatch = command.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i)
    if (quantityMatch) {
      const numberWords: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10
      }
      entities.quantity = numberWords[quantityMatch[1]] || parseInt(quantityMatch[1])
    }
    
    // Time references
    const timeRefs = {
      today: 0,
      tomorrow: 1,
      'next week': 7,
      'this week': 0,
      'next month': 30
    }
    
    for (const [term, days] of Object.entries(timeRefs)) {
      if (command.includes(term)) {
        const date = new Date()
        date.setDate(date.getDate() + days)
        entities.dueDate = date.toISOString()
        entities.timeReference = term
        break
      }
    }
    
    // Extract quoted text
    const quotedMatch = command.match(/"([^"]+)"|'([^']+)'/)
    if (quotedMatch) {
      entities.title = quotedMatch[1] || quotedMatch[2]
    }
    
    // Priority levels
    if (/\b(high|urgent|critical|important)\b/i.test(command)) {
      entities.priority = 'high'
    } else if (/\b(low|minor|optional)\b/i.test(command)) {
      entities.priority = 'low'
    }
    
    return entities
  }
  
  // Execute command with canvas integration
  const executeCommand = async (analysis: any) => {
    const { intent, entities } = analysis
    let response = { text: '', action: null as any, followUp: null as any }
    
    switch (intent) {
      case 'canvas.create':
        response = await createCanvasNode(entities)
        break
        
      case 'canvas.remove':
        response = await removeCanvasNode(entities)
        break
        
      case 'canvas.move':
        response = await moveCanvasNode(entities)
        break
        
      case 'canvas.zoom':
        response = await zoomCanvas(entities)
        break
        
      case 'canvas.navigate':
        response = await navigateCanvas(entities)
        break
        
      case 'canvas.organize':
        response = await organizeCanvas(entities)
        break
        
      case 'todo.create':
        response = await createTodo(entities)
        break
        
      case 'todo.complete':
        response = await completeTodo(entities)
        break
        
      case 'todo.list':
        response = await listTodos(entities)
        break
        
      case 'workflow.create':
        response = await createWorkflow(entities)
        break
        
      case 'search':
        response = await performSearch(entities)
        break
        
      case 'help':
        response = generateHelpResponse()
        break
        
      case 'greeting':
        response = generateGreeting()
        break
        
      case 'confirm':
        response = await handleConfirmation(entities)
        break
        
      case 'cancel':
        response = handleCancellation()
        break
        
      case 'undo':
        response = await performUndo()
        break
        
      default:
        response = await handleUnclearIntent(analysis)
    }
    
    return response
  }
  
  // Canvas manipulation functions
  const createCanvasNode = async (entities: any) => {
    const type = entities.cardType || 'todo'
    const position = entities.position || { x: 0.5, y: 0.5 }
    const title = entities.title || `New ${type}`
    
    // Convert relative to absolute position
    const absolutePosition = {
      x: position.x * window.innerWidth,
      y: position.y * window.innerHeight
    }
    
    return {
      text: `Creating a ${type} card${entities.position ? ' at the ' + Object.keys(entities.position)[0] + ' of your screen' : ''}`,
      action: {
        type: 'create_node',
        data: {
          type,
          title,
          position: absolutePosition,
          animated: true
        }
      },
      followUp: entities.cardType === 'todo' ? {
        prompt: 'What would you like to add to this todo?',
        context: 'todo_details'
      } : null
    }
  }
  
  const removeCanvasNode = async (entities: any) => {
    const target = entities.target || conversationContext.value.activeCard
    
    if (!target) {
      return {
        text: "Which card would you like me to remove? You can say 'this one' while focusing on it.",
        action: null,
        followUp: {
          prompt: 'waiting_for_selection',
          context: 'remove_target'
        }
      }
    }
    
    return {
      text: `Removing the card`,
      action: {
        type: 'remove_node',
        data: { id: target, animated: true }
      },
      followUp: null
    }
  }
  
  const moveCanvasNode = async (entities: any) => {
    const target = entities.target || conversationContext.value.activeCard
    
    if (!target) {
      return {
        text: "Which card would you like to move?",
        action: null,
        followUp: {
          prompt: 'waiting_for_selection',
          context: 'move_target'
        }
      }
    }
    
    let newPosition
    if (entities.position) {
      newPosition = {
        x: entities.position.x * window.innerWidth,
        y: entities.position.y * window.innerHeight
      }
    } else if (entities.direction) {
      // Move relative to current position
      newPosition = 'relative'
    }
    
    return {
      text: `Moving the card${entities.position ? ' to the ' + Object.keys(entities.position)[0] : ''}`,
      action: {
        type: 'move_node',
        data: {
          id: target,
          position: newPosition,
          direction: entities.direction,
          animated: true
        }
      },
      followUp: null
    }
  }
  
  const zoomCanvas = async (entities: any) => {
    const direction = entities.direction || (entities.target ? 'in' : 'fit')
    
    return {
      text: direction === 'fit' ? 'Fitting all cards to screen' : `Zooming ${direction}`,
      action: {
        type: 'zoom',
        data: {
          direction,
          target: entities.target,
          animated: true
        }
      },
      followUp: null
    }
  }
  
  const organizeCanvas = async (entities: any) => {
    const layout = entities.layout || 'grid'
    
    return {
      text: `Organizing your workspace in a ${layout} layout`,
      action: {
        type: 'organize',
        data: {
          layout,
          animated: true
        }
      },
      followUp: {
        prompt: 'Does this layout work better for you?',
        context: 'layout_feedback'
      }
    }
  }
  
  // Todo management functions
  const createTodo = async (entities: any) => {
    const title = entities.title || 'New task'
    const priority = entities.priority || 'medium'
    
    return {
      text: `Creating ${priority === 'high' ? 'high priority ' : ''}todo: "${title}"`,
      action: {
        type: 'create_todo',
        data: {
          title,
          priority,
          dueDate: entities.dueDate,
          createCard: true
        }
      },
      followUp: {
        prompt: 'Would you like to add any details or set a reminder?',
        context: 'todo_enhance'
      }
    }
  }
  
  const completeTodo = async (entities: any) => {
    const target = entities.target || conversationContext.value.activeCard
    
    return {
      text: 'Marking task as complete. Great job!',
      action: {
        type: 'complete_todo',
        data: { id: target }
      },
      followUp: {
        prompt: 'Would you like to see your remaining tasks?',
        context: 'show_remaining'
      }
    }
  }
  
  const listTodos = async (entities: any) => {
    return {
      text: `Showing your ${entities.timeReference ? entities.timeReference + "'s" : ''} todos`,
      action: {
        type: 'list_todos',
        data: {
          filter: entities.timeReference,
          createCards: true
        }
      },
      followUp: null
    }
  }
  
  // Workflow creation
  const createWorkflow = async (entities: any) => {
    return {
      text: 'Opening the workflow builder. What would you like to automate?',
      action: {
        type: 'create_workflow',
        data: {
          template: entities.template || 'blank'
        }
      },
      followUp: {
        prompt: 'You can say things like "when I complete a task, create a new one" or "every morning at 9, show my todos"',
        context: 'workflow_setup'
      }
    }
  }
  
  // Search functionality
  const performSearch = async (entities: any) => {
    const query = entities.title || entities.query || ''
    
    return {
      text: `Searching for "${query}"`,
      action: {
        type: 'search',
        data: { query }
      },
      followUp: null
    }
  }
  
  // Response generators
  const generateHelpResponse = () => ({
    text: "I can help you manage your canvas workspace. Try saying: 'Create a new todo', 'Move this card to the right', 'Zoom in on my workspace', 'Show my tasks for today', or 'Organize my cards'. I'm always listening for the word 'Athena'.",
    action: {
      type: 'show_hints',
      data: {
        hints: [
          'Create a [todo/document/workspace]',
          'Move [this/that] [up/down/left/right]',
          'Zoom [in/out]',
          'Show my [todos/workspaces]',
          'Organize my cards'
        ]
      }
    },
    followUp: null
  })
  
  const generateGreeting = () => {
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    
    return {
      text: `${timeGreeting}! I'm ready to help you organize your workspace. What would you like to do?`,
      action: null,
      followUp: null
    }
  }
  
  const handleConfirmation = async (entities: any) => {
    const lastContext = conversationContext.value.contextStack[
      conversationContext.value.contextStack.length - 1
    ]
    
    if (entities.confirmedAction) {
      return {
        text: 'Executing that for you now',
        action: {
          type: 'execute_confirmed',
          data: lastContext
        },
        followUp: null
      }
    }
    
    return {
      text: 'Confirmed',
      action: null,
      followUp: null
    }
  }
  
  const handleCancellation = () => ({
    text: 'Cancelled. No problem!',
    action: {
      type: 'cancel_last'
    },
    followUp: null
  })
  
  const performUndo = async () => ({
    text: 'Undoing the last action',
    action: {
      type: 'undo'
    },
    followUp: null
  })
  
  const handleUnclearIntent = async (analysis: any) => {
    // Try to be helpful even when intent is unclear
    const suggestions = [
      "I can help you create cards, move them around, or organize your workspace.",
      "Would you like me to show you what I can do?",
      "Try saying 'create a todo' or 'show my tasks'"
    ]
    
    return {
      text: "I'm not sure what you'd like me to do. " + suggestions[Math.floor(Math.random() * suggestions.length)],
      action: null,
      followUp: {
        prompt: 'waiting_for_clarification',
        context: 'unclear'
      }
    }
  }
  
  // Handle follow-up actions
  const handleFollowUp = async (followUp: any) => {
    if (followUp.prompt && followUp.prompt !== 'waiting_for_selection') {
      await speak(followUp.prompt)
    }
    
    // Store follow-up context
    conversationContext.value.contextStack.push({
      intent: `followup.${followUp.context}`,
      entities: followUp,
      timestamp: new Date()
    })
  }
  
  // Enhanced speech synthesis
  const speak = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthesis) synthesis = window.speechSynthesis
      
      // Cancel any ongoing speech
      synthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = voiceConfig.value.voiceSettings.rate
      utterance.pitch = voiceConfig.value.voiceSettings.pitch
      utterance.volume = voiceConfig.value.voiceSettings.volume
      
      // Use selected voice or best available
      if (voiceConfig.value.voiceSettings.voice) {
        utterance.voice = voiceConfig.value.voiceSettings.voice
      } else {
        const voices = synthesis.getVoices()
        const preferredVoice = voices.find(v => 
          v.name.includes('Google') || v.name.includes('Microsoft')
        ) || voices[0]
        if (preferredVoice) utterance.voice = preferredVoice
      }
      
      utterance.onstart = () => {
        isSpeaking.value = true
        // Pause recognition while speaking
        if (recognition && isListening.value) {
          recognition.stop()
        }
      }
      
      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
        
        // Resume recognition if in conversation mode
        if (isConversationMode.value && recognition) {
          setTimeout(() => {
            try {
              recognition.start()
            } catch (e) {
              // Already started
            }
          }, 200)
        }
      }
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event)
        isSpeaking.value = false
        resolve()
      }
      
      synthesis.speak(utterance)
    })
  }
  
  // Recognition error handler
  const handleRecognitionError = (event: any) => {
    console.error('Recognition error:', event.error)
    
    switch (event.error) {
      case 'no-speech':
        // Silence detected, continue listening if in conversation mode
        if (isConversationMode.value) {
          resetSilenceTimer()
        }
        break
        
      case 'audio-capture':
        speak("I'm having trouble accessing your microphone. Please check your permissions.")
        isListening.value = false
        break
        
      case 'network':
        speak("I'm having network issues. Let me try again.")
        setTimeout(() => startListening(), 1000)
        break
        
      case 'not-allowed':
        speak("I need microphone permission to listen to you.")
        isListening.value = false
        break
    }
  }
  
  // Timer management
  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer)
    
    silenceTimer = setTimeout(() => {
      if (isConversationMode.value && !isSpeaking.value) {
        // Exit conversation mode after extended silence
        exitConversationMode()
      }
    }, voiceConfig.value.silenceTimeout * 3)
  }
  
  const resetConversationTimer = () => {
    if (conversationTimer) clearTimeout(conversationTimer)
    
    conversationTimer = setTimeout(() => {
      if (isConversationMode.value) {
        speak("I'm still here if you need me")
        resetConversationTimer()
      }
    }, 30000) // Remind every 30 seconds
  }
  
  // Conversation mode management
  const enterConversationMode = () => {
    isConversationMode.value = true
    conversationContext.value.conversationDepth = 0
    resetConversationTimer()
  }
  
  const exitConversationMode = () => {
    isConversationMode.value = false
    conversationContext.value.conversationDepth = 0
    
    if (conversationTimer) {
      clearTimeout(conversationTimer)
      conversationTimer = null
    }
    
    if (recognition && isListening.value) {
      recognition.stop()
    }
  }
  
  // Public methods
  const startListening = () => {
    if (!recognition) {
      initializeRecognition()
    }
    
    if (recognition && !isListening.value) {
      try {
        recognition.start()
        isListening.value = true
      } catch (e) {
        console.error('Failed to start recognition:', e)
      }
    }
  }
  
  const stopListening = () => {
    if (recognition && isListening.value) {
      recognition.stop()
      isListening.value = false
      exitConversationMode()
    }
  }
  
  const toggleListening = () => {
    if (isListening.value) {
      stopListening()
    } else {
      startListening()
      enterConversationMode()
    }
  }
  
  // Update spatial context
  const updateSpatialContext = (context: any) => {
    conversationContext.value.spatialContext = {
      ...conversationContext.value.spatialContext,
      ...context
    }
  }
  
  // Set active card for context
  const setActiveCard = (cardId: string | null) => {
    conversationContext.value.activeCard = cardId
  }
  
  // Lifecycle
  onMounted(() => {
    initializeRecognition()
    initializeAudioAnalysis()
    
    // Load voice preferences
    if (synthesis) {
      synthesis.onvoiceschanged = () => {
        const voices = synthesis!.getVoices()
        const preferredVoice = voices.find(v => 
          v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Microsoft'))
        )
        if (preferredVoice) {
          voiceConfig.value.voiceSettings.voice = preferredVoice
        }
      }
    }
  })
  
  onUnmounted(() => {
    stopListening()
    
    if (silenceTimer) clearTimeout(silenceTimer)
    if (conversationTimer) clearTimeout(conversationTimer)
    
    if (audioContext.value) {
      audioContext.value.close()
    }
  })
  
  return {
    // State
    isListening,
    isProcessing,
    isSpeaking,
    isConversationMode,
    transcript,
    interimTranscript,
    confidence,
    conversationContext,
    voiceActivityDetection,
    voiceConfig,
    
    // Methods
    startListening,
    stopListening,
    toggleListening,
    speak,
    processCommand,
    updateSpatialContext,
    setActiveCard,
    enterConversationMode,
    exitConversationMode
  }
}