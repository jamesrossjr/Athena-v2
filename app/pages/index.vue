<template>
  <div class="athena-canvas" @wheel="canvas.handleWheel">
    <!-- Infinite Grid Canvas Background -->
    <div 
      class="canvas-grid" 
      :style="gridStyle"
      @mousedown="canvas.handleMouseDown($event)"
    />
    
    <!-- Canvas Nodes/Workspaces -->
    <div class="canvas-content" :style="canvasTransform">
      <!-- Connection Lines (Obsidian-like) -->
      <svg 
        v-if="canvas.isGraphView.value || canvas.isNodeView.value"
        class="connection-layer"
        :style="connectionLayerStyle"
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#4a90e2;stop-opacity:0.3" />
            <stop offset="50%" style="stop-color:#4a90e2;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:#4a90e2;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <g v-for="connection in visibleConnections" :key="connection.id">
          <line
            :x1="connection.x1"
            :y1="connection.y1"
            :x2="connection.x2"
            :y2="connection.y2"
            class="connection-line"
            :class="{ 
              'active': connection.active,
              'graph-mode': canvas.isGraphView.value
            }"
            stroke="url(#connectionGradient)"
            :stroke-width="canvas.isGraphView.value ? 2 : 1"
            :opacity="canvas.isGraphView.value ? 0.8 : 0.4"
          />
          <!-- Connection particle animation -->
          <circle
            v-if="connection.active"
            r="3"
            fill="#4a90e2"
            class="connection-particle"
          >
            <animateMotion
              :dur="`${3 + Math.random() * 2}s`"
              repeatCount="indefinite"
            >
              <mpath :href="`#path-${connection.id}`" />
            </animateMotion>
          </circle>
        </g>
      </svg>
      
      <TransitionGroup name="node">
        <div
          v-for="node in canvas.visibleNodes.value"
          :key="node.id"
          class="canvas-node"
          :class="{
            'selected': canvas.selectedNodes.value.has(node.id),
            'focused': voice.conversationContext.value.activeCard === node.id,
            'graph-view': canvas.isGraphView.value,
            'node-view': canvas.isNodeView.value,
            'detail-view': canvas.isDetailView.value,
            'has-connections': node.connections && node.connections.length > 0
          }"
          :style="getNodeStyle(node)"
          :data-node-id="node.id"
          @mousedown.stop="handleNodeMouseDown($event, node)"
          @mouseenter="handleNodeHover(node, true)"
          @mouseleave="handleNodeHover(node, false)"
          @dblclick="handleNodeDoubleClick(node)"
        >
          <!-- Graph view - Small circular nodes -->
          <div v-if="canvas.isGraphView.value" class="graph-node">
            <div 
              class="graph-node-circle"
              :style="{ 
                background: node.color || getNodeColor(node.type),
                boxShadow: `0 0 20px ${node.color || getNodeColor(node.type)}40`
              }"
            >
              <Icon :name="getNodeIcon(node.type)" />
            </div>
            <div class="graph-node-label">{{ node.title }}</div>
            <div v-if="node.tags" class="graph-node-tags">
              <span v-for="tag in node.tags.slice(0, 2)" :key="tag" class="tag">
                #{{ tag }}
              </span>
            </div>
          </div>
          
          <!-- Node view - Compact cards -->
          <div v-else-if="canvas.isNodeView.value" class="compact-node">
            <div class="compact-header">
              <Icon :name="getNodeIcon(node.type)" />
              <span class="compact-title">{{ node.title }}</span>
            </div>
            <div class="compact-preview">
              {{ getNodePreview(node) }}
            </div>
            <div class="compact-footer">
              <span class="compact-type">{{ node.type }}</span>
              <span v-if="node.connections" class="compact-connections">
                <Icon name="heroicons:link" />
                {{ node.connections.length }}
              </span>
            </div>
          </div>
          
          <!-- Normal/Detail view - Full content -->
          <component
            v-else
            :is="getNodeComponent(node)"
            :node="node"
            :zoom-level="canvas.viewport.value.zoom"
            @update="updateNodeContent(node.id, $event)"
          />
        </div>
      </TransitionGroup>
    </div>
    
    <!-- 3D Athena AI Assistant -->
    <div
      ref="athenaContainer"
      class="athena-3d-wrapper"
      :style="athenaStyle"
      :class="{
        'listening': voice.isListening.value,
        'speaking': voice.isSpeaking.value,
        'processing': voice.isProcessing.value,
        'conversation-mode': voice.isConversationMode.value
      }"
      @mousedown="startAthenaDrag"
    >
      <Athena3D
        ref="athena3D"
        :size="{ width: 200, height: 200 }"
        @command="handleVoiceCommand"
        @action="handleAthenaAction"
      />
      
      <!-- Voice Activity Indicator -->
      <div class="voice-activity" v-if="voice.voiceActivityDetection.value.isSpeaking">
        <div class="activity-bar" 
          :style="{ 
            height: `${voice.voiceActivityDetection.value.volume * 100}%`,
            background: `hsl(${220 + voice.voiceActivityDetection.value.clarity * 60}, 70%, 50%)`
          }"
        />
      </div>
      
      <!-- Conversation Context Bubble -->
      <Transition name="bubble">
        <div v-if="voice.isConversationMode.value" class="context-bubble">
          <div class="context-status">
            <div class="pulse-dot" />
            <span>Conversation Mode Active</span>
          </div>
          <div v-if="voice.interimTranscript.value" class="interim-text">
            {{ voice.interimTranscript.value }}
          </div>
          <div v-if="voice.transcript.value" class="final-text">
            "{{ voice.transcript.value }}"
          </div>
          <div class="context-hints">
            <span v-for="hint in currentHints" :key="hint" class="hint">
              {{ hint }}
            </span>
          </div>
        </div>
      </Transition>
    </div>
    
    <!-- Command Palette -->
    <CommandPalette 
      v-model="showCommandPalette"
      @execute="handleCommand"
    />
    
    <!-- Canvas Controls -->
    <div class="canvas-controls">
      <div class="zoom-controls">
        <button class="control-btn" @click="zoomIn">
          <Icon name="heroicons:magnifying-glass-plus" />
        </button>
        <span class="zoom-level">{{ Math.round(canvas.viewport.value.zoom * 100) }}%</span>
        <button class="control-btn" @click="zoomOut">
          <Icon name="heroicons:magnifying-glass-minus" />
        </button>
      </div>
      <button class="control-btn" @click="canvas.fitToScreen()">
        <Icon name="heroicons:arrows-pointing-out" />
      </button>
      <button class="control-btn" @click="toggleVoiceMode" :class="{ active: voice.isListening.value }">
        <Icon :name="voice.isListening.value ? 'heroicons:microphone' : 'heroicons:microphone-slash'" />
      </button>
    </div>
    
    <!-- Visual Feedback Layer -->
    <div class="visual-feedback">
      <!-- Connection Lines for Workflows -->
      <svg v-if="connections.length" class="connections-layer">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
          </marker>
        </defs>
        <path
          v-for="conn in connections"
          :key="conn.id"
          :d="conn.path"
          class="connection-line"
          marker-end="url(#arrowhead)"
        />
      </svg>
      
      <!-- Action Feedback -->
      <TransitionGroup name="feedback">
        <div
          v-for="feedback in actionFeedback"
          :key="feedback.id"
          class="feedback-item"
          :style="feedback.style"
        >
          {{ feedback.text }}
        </div>
      </TransitionGroup>
    </div>
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-item">
        <Icon name="heroicons:squares-2x2" />
        <span>{{ canvas.nodes.value.size }} nodes</span>
      </div>
      <div class="status-item" v-if="voice.isConversationMode.value">
        <Icon name="heroicons:chat-bubble-left-right" />
        <span>Conversation depth: {{ voice.conversationContext.value.conversationDepth }}</span>
      </div>
      <div class="status-item" v-if="voice.confidence.value > 0">
        <Icon name="heroicons:signal" />
        <span>Confidence: {{ Math.round(voice.confidence.value * 100) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useInfiniteCanvas } from '@/composables/useInfiniteCanvas'
import { useAdvancedVoice } from '@/composables/useAdvancedVoice'
import { useAthena3D } from '@/composables/useAthena3D'
import CommandPalette from '@/components/CommandPalette.vue'
import Athena3D from '@/components/Athena3D.vue'

// Initialize composables
const canvas = useInfiniteCanvas()
const voice = useAdvancedVoice()
const athenaAI = useAthena3D()

// Refs
const athenaContainer = ref<HTMLElement>()
const athena3D = ref<any>()
const showCommandPalette = ref(false)

// Athena position and dragging
const athenaPosition = ref({ x: 0, y: 0 })
const isDraggingAthena = ref(false)
const athenaDragOffset = ref({ x: 0, y: 0 })

// Visual feedback
const connections = ref<Array<{ id: string; path: string }>>([])
const actionFeedback = ref<Array<{ id: string; text: string; style: any }>>([])

// Context hints
const currentHints = computed(() => {
  const hints = []
  
  if (voice.conversationContext.value.conversationDepth === 0) {
    hints.push('Say "create a todo"', 'Say "show my workspaces"', 'Say "help"')
  } else {
    const lastIntent = voice.conversationContext.value.contextStack[
      voice.conversationContext.value.contextStack.length - 1
    ]?.intent
    
    if (lastIntent === 'canvas.create') {
      hints.push('Say position: "top left", "center", "bottom right"')
    } else if (lastIntent === 'todo.create') {
      hints.push('Say "high priority"', 'Say "due tomorrow"')
    } else {
      hints.push('Say "yes" to confirm', 'Say "cancel" to abort')
    }
  }
  
  return hints.slice(0, 3)
})

// Computed styles
const athenaStyle = computed(() => ({
  position: 'fixed',
  left: `${athenaPosition.value.x}px`,
  top: `${athenaPosition.value.y}px`,
  zIndex: 1000,
  cursor: isDraggingAthena.value ? 'grabbing' : 'grab'
}))

const gridStyle = computed(() => {
  const { x, y, zoom } = canvas.viewport.value
  const gridSize = 50 * zoom
  return {
    backgroundSize: `${gridSize}px ${gridSize}px`,
    backgroundPosition: `${-x * zoom}px ${-y * zoom}px`
  }
})

const canvasTransform = computed(() => ({
  transform: `scale(${canvas.viewport.value.zoom})`,
  transformOrigin: '0 0'
}))

const connectionLayerStyle = computed(() => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  overflow: 'visible'
}))

// Compute visible connections based on visible nodes
const visibleConnections = computed(() => {
  const connections: any[] = []
  const { x, y, zoom } = canvas.viewport.value
  
  canvas.visibleNodes.value.forEach(node => {
    if (node.connections) {
      node.connections.forEach(targetId => {
        const targetNode = canvas.nodes.value.get(targetId)
        if (targetNode && canvas.visibleNodes.value.includes(targetNode)) {
          // Calculate connection line positions
          const x1 = (node.position.x + node.size.width / 2 - x) * zoom
          const y1 = (node.position.y + node.size.height / 2 - y) * zoom
          const x2 = (targetNode.position.x + targetNode.size.width / 2 - x) * zoom
          const y2 = (targetNode.position.y + targetNode.size.height / 2 - y) * zoom
          
          connections.push({
            id: `${node.id}-${targetId}`,
            x1, y1, x2, y2,
            active: canvas.selectedNodes.value.has(node.id) || canvas.selectedNodes.value.has(targetId)
          })
        }
      })
    }
  })
  
  return connections
})

// Node management
const getNodeStyle = (node: any) => {
  const { x, y, zoom } = canvas.viewport.value
  return {
    left: `${(node.position.x - x) * zoom}px`,
    top: `${(node.position.y - y) * zoom}px`,
    width: `${node.size.width}px`,
    height: `${node.size.height}px`
  }
}

const getNodeComponent = (node: any) => {
  // Return appropriate component based on node type
  switch (node.type) {
    case 'editor':
      return 'NodeEditor'
    case 'ide':
      return 'NodeIDE'
    case 'todo':
      return 'TodoBlock'
    case 'workflow':
      return 'WorkflowBuilder'
    default:
      return 'NodeEditor'
  }
}

const getNodeColor = (type: string) => {
  const colors: Record<string, string> = {
    workspace: '#4a90e2',
    document: '#50c878',
    ide: '#ff6b6b',
    todo: '#ffa500',
    workflow: '#9b59b6',
    note: '#f39c12',
    editor: '#3498db'
  }
  return colors[type] || '#4a90e2'
}

const getNodeIcon = (type: string) => {
  const icons: Record<string, string> = {
    workspace: 'heroicons:squares-2x2',
    document: 'heroicons:document-text',
    ide: 'heroicons:code-bracket',
    todo: 'heroicons:check-circle',
    workflow: 'heroicons:chart-bar-square',
    note: 'heroicons:pencil-square',
    editor: 'heroicons:document-duplicate'
  }
  return icons[type] || 'heroicons:cube'
}

const getNodePreview = (node: any) => {
  if (!node.content) return 'Empty node'
  
  if (typeof node.content === 'string') {
    return node.content.substring(0, 100) + (node.content.length > 100 ? '...' : '')
  }
  
  if (node.type === 'todo' && node.content.items) {
    const completed = node.content.items.filter((i: any) => i.completed).length
    return `${completed}/${node.content.items.length} tasks completed`
  }
  
  if (node.type === 'ide' && node.content.files) {
    return `${node.content.files.length} files`
  }
  
  return JSON.stringify(node.content).substring(0, 100) + '...'
}

const updateNodeContent = (nodeId: string, content: any) => {
  canvas.updateNode(nodeId, { content })
  // Auto-connect based on content similarity
  canvas.autoConnectByContent(nodeId)
}

const handleNodeDoubleClick = (node: any) => {
  if (canvas.isGraphView.value || canvas.isNodeView.value) {
    // Zoom in on double-click when in graph/node view
    canvas.centerOnNode(node.id)
    canvas.zoom(2, canvas.canvasSize.value.width / 2, canvas.canvasSize.value.height / 2)
  }
}

// Voice command handling
const handleVoiceCommand = async (command: string) => {
  // Process through advanced voice system
  const response = await voice.processCommand(command)
  
  // Execute canvas actions
  if (response.action) {
    await executeCanvasAction(response.action)
  }
  
  // Update Athena's state
  if (athena3D.value) {
    athena3D.value.speak(response.text)
    if (response.emotion) {
      athenaAI.state.value.mood = response.emotion
    }
  }
}

// Execute canvas actions from voice commands
const executeCanvasAction = async (action: any) => {
  switch (action.type) {
    case 'create_node':
      await createNodeWithAnimation(action.data)
      break
      
    case 'remove_node':
      await removeNodeWithAnimation(action.data.id)
      break
      
    case 'move_node':
      await moveNodeWithAnimation(action.data)
      break
      
    case 'zoom':
      await zoomWithAnimation(action.data)
      break
      
    case 'organize':
      await organizeCanvas(action.data.layout)
      break
      
    case 'create_todo':
      await createTodoNode(action.data)
      break
      
    case 'create_workflow':
      await createWorkflowNode(action.data)
      break
      
    case 'search':
      await performSearch(action.data.query)
      break
  }
  
  // Show visual feedback
  showActionFeedback(action)
}

// Canvas actions with animations
const createNodeWithAnimation = async (data: any) => {
  const node = {
    type: data.type || 'todo',
    title: data.title || 'New Node',
    position: data.position || { x: 500, y: 300 },
    size: { width: 300, height: 200 },
    minimized: false,
    content: data.content || {}
  }
  
  const nodeId = canvas.addNode(node)
  
  // Animate creation
  await nextTick()
  const element = document.querySelector(`[data-node-id="${nodeId}"]`)
  if (element) {
    element.classList.add('node-creating')
    setTimeout(() => element.classList.remove('node-creating'), 500)
  }
  
  // Update voice context
  voice.setActiveCard(nodeId)
  
  return nodeId
}

const removeNodeWithAnimation = async (nodeId: string) => {
  const element = document.querySelector(`[data-node-id="${nodeId}"]`)
  if (element) {
    element.classList.add('node-removing')
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  canvas.removeNode(nodeId)
  voice.setActiveCard(null)
}

const moveNodeWithAnimation = async (data: any) => {
  const { id, position, direction } = data
  
  if (position === 'relative' && direction) {
    // Move relative to current position
    const node = canvas.nodes.value.get(id)
    if (node) {
      const newPosition = {
        x: node.position.x + direction.dx,
        y: node.position.y + direction.dy
      }
      canvas.updateNode(id, { position: newPosition })
    }
  } else if (position) {
    // Move to absolute position
    canvas.updateNode(id, { position })
  }
}

const zoomWithAnimation = async (data: any) => {
  if (data.direction === 'in') {
    canvas.zoom(1.5, canvas.canvasSize.value.width / 2, canvas.canvasSize.value.height / 2)
  } else if (data.direction === 'out') {
    canvas.zoom(0.7, canvas.canvasSize.value.width / 2, canvas.canvasSize.value.height / 2)
  } else if (data.direction === 'fit') {
    canvas.fitToScreen()
  }
}

const organizeCanvas = async (layout: string) => {
  const nodes = Array.from(canvas.nodes.value.values())
  const gridCols = Math.ceil(Math.sqrt(nodes.length))
  const spacing = 350
  const startX = 100
  const startY = 100
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / gridCols)
    const col = index % gridCols
    
    const position = {
      x: startX + col * spacing,
      y: startY + row * spacing
    }
    
    canvas.updateNode(node.id, { position })
  })
  
  canvas.fitToScreen()
}

// Todo and workflow creation
const createTodoNode = async (data: any) => {
  const todoNode = {
    type: 'todo',
    title: data.title || 'New Todo',
    position: canvas.screenToWorld(
      canvas.canvasSize.value.width / 2,
      canvas.canvasSize.value.height / 2
    ),
    size: { width: 300, height: 150 },
    minimized: false,
    content: {
      priority: data.priority,
      dueDate: data.dueDate,
      completed: false
    }
  }
  
  return await createNodeWithAnimation(todoNode)
}

const createWorkflowNode = async (data: any) => {
  const workflowNode = {
    type: 'workflow',
    title: 'New Workflow',
    position: canvas.screenToWorld(
      canvas.canvasSize.value.width / 2,
      canvas.canvasSize.value.height / 2
    ),
    size: { width: 400, height: 300 },
    minimized: false,
    content: {
      template: data.template,
      nodes: [],
      connections: []
    }
  }
  
  return await createNodeWithAnimation(workflowNode)
}

// Search functionality
const performSearch = async (query: string) => {
  // Highlight matching nodes
  canvas.nodes.value.forEach(node => {
    if (node.title.toLowerCase().includes(query.toLowerCase())) {
      canvas.selectedNodes.value.add(node.id)
    }
  })
  
  // Center on first match
  const firstMatch = Array.from(canvas.selectedNodes.value)[0]
  if (firstMatch) {
    canvas.centerOnNode(firstMatch)
  }
}

// Visual feedback
const showActionFeedback = (action: any) => {
  const feedback = {
    id: `feedback-${Date.now()}`,
    text: getActionFeedbackText(action),
    style: {
      left: '50%',
      top: '20px',
      transform: 'translateX(-50%)'
    }
  }
  
  actionFeedback.value.push(feedback)
  
  setTimeout(() => {
    const index = actionFeedback.value.findIndex(f => f.id === feedback.id)
    if (index > -1) {
      actionFeedback.value.splice(index, 1)
    }
  }, 3000)
}

const getActionFeedbackText = (action: any) => {
  const texts: Record<string, string> = {
    create_node: '✨ Node created',
    remove_node: '🗑️ Node removed',
    move_node: '↔️ Node moved',
    zoom: '🔍 Zoom adjusted',
    organize: '📐 Canvas organized',
    create_todo: '✅ Todo created',
    create_workflow: '⚡ Workflow created',
    search: '🔎 Search complete'
  }
  
  return texts[action.type] || 'Action completed'
}

// Node interaction
const handleNodeMouseDown = (event: MouseEvent, node: any) => {
  canvas.handleMouseDown(event, node.id)
  voice.setActiveCard(node.id)
}

const handleNodeHover = (node: any, hovering: boolean) => {
  if (hovering && voice.isConversationMode.value) {
    // Update spatial context for voice
    voice.updateSpatialContext({
      focusedNode: node.id,
      viewportCenter: {
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2
      }
    })
  }
}

// Athena dragging
const startAthenaDrag = (event: MouseEvent) => {
  isDraggingAthena.value = true
  athenaDragOffset.value = {
    x: event.clientX - athenaPosition.value.x,
    y: event.clientY - athenaPosition.value.y
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingAthena.value) {
      athenaPosition.value = {
        x: e.clientX - athenaDragOffset.value.x,
        y: e.clientY - athenaDragOffset.value.y
      }
    }
  }
  
  const handleMouseUp = () => {
    isDraggingAthena.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// Voice mode toggle
const toggleVoiceMode = () => {
  voice.toggleListening()
  
  if (voice.isListening.value) {
    athenaAI.getGreeting()
    if (athena3D.value) {
      athena3D.value.speak(athenaAI.getGreeting())
    }
  }
}

// Canvas controls
const zoomIn = () => {
  canvas.zoom(1.2, canvas.canvasSize.value.width / 2, canvas.canvasSize.value.height / 2)
  voice.updateSpatialContext({ zoomLevel: canvas.viewport.value.zoom })
}

const zoomOut = () => {
  canvas.zoom(0.8, canvas.canvasSize.value.width / 2, canvas.canvasSize.value.height / 2)
  voice.updateSpatialContext({ zoomLevel: canvas.viewport.value.zoom })
}

// Command palette handling
const handleCommand = (command: any) => {
  executeCanvasAction({
    type: command.action,
    data: command.data
  })
  showCommandPalette.value = false
}

// Handle Athena actions
const handleAthenaAction = (actionId: string, data: any) => {
  switch (actionId) {
    case 'create-todo':
      createTodoNode({})
      break
    case 'view-todos':
      performSearch('todo')
      break
    case 'voice-command':
      toggleVoiceMode()
      break
    case 'workflow':
      createWorkflowNode({ template: 'blank' })
      break
  }
}

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K for command palette
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
  
  // Spacebar for voice (when not typing)
  if (event.code === 'Space' && !event.target?.matches('input, textarea')) {
    event.preventDefault()
    toggleVoiceMode()
  }
  
  // Escape to exit conversation mode
  if (event.key === 'Escape' && voice.isConversationMode.value) {
    voice.exitConversationMode()
  }
}

// Initialize sample nodes with connections
const initializeSampleNodes = () => {
  // Main workspace
  const workspaceId = canvas.addNode({
    type: 'workspace',
    title: 'Main Workspace',
    position: { x: 200, y: 200 },
    size: { width: 350, height: 250 },
    minimized: false,
    tags: ['development', 'main'],
    color: '#4a90e2',
    content: {
      description: 'Primary development workspace',
      tools: ['Editor', 'Terminal', 'Git']
    }
  })
  
  // Todo list
  const todoId = canvas.addNode({
    type: 'todo',
    title: 'Today\'s Tasks',
    position: { x: 600, y: 200 },
    size: { width: 300, height: 200 },
    minimized: false,
    tags: ['tasks', 'development'],
    color: '#ffa500',
    content: {
      todos: [
        { id: 1, text: 'Review pull requests', completed: false },
        { id: 2, text: 'Team standup', completed: true },
        { id: 3, text: 'Deploy to staging', completed: false }
      ]
    }
  })
  
  // Workflow
  const workflowId = canvas.addNode({
    type: 'workflow',
    title: 'CI/CD Pipeline',
    position: { x: 400, y: 500 },
    size: { width: 400, height: 300 },
    minimized: false,
    tags: ['deployment', 'development'],
    color: '#9b59b6',
    content: {
      status: 'running',
      steps: ['Test', 'Build', 'Deploy']
    }
  })
  
  // Document editor
  const editorId = canvas.addNode({
    type: 'editor',
    title: 'Project Documentation',
    position: { x: 950, y: 350 },
    size: { width: 400, height: 350 },
    minimized: false,
    tags: ['documentation', 'development'],
    color: '#3498db',
    content: {
      blocks: [
        { type: 'heading', content: { text: 'Project Overview', level: 1 }},
        { type: 'text', content: { text: 'This is our main development workspace with integrated AI assistance.' }},
        { type: 'todo', content: { items: [
          { text: 'Complete API documentation', checked: false },
          { text: 'Update deployment guide', checked: true }
        ]}}
      ]
    }
  })
  
  // IDE node
  const ideId = canvas.addNode({
    type: 'ide',
    title: 'Code Editor',
    position: { x: 200, y: 500 },
    size: { width: 400, height: 350 },
    minimized: false,
    tags: ['coding', 'development'],
    color: '#ff6b6b',
    content: {
      files: [
        { name: 'index.js', language: 'javascript', code: 'console.log("Hello World");' },
        { name: 'style.css', language: 'css', code: 'body { margin: 0; }' }
      ]
    }
  })
  
  // Create connections between related nodes
  canvas.connectNodes(workspaceId, todoId)
  canvas.connectNodes(workspaceId, workflowId)
  canvas.connectNodes(workflowId, todoId)
  canvas.connectNodes(workspaceId, editorId)
  canvas.connectNodes(ideId, workspaceId)
  canvas.connectNodes(editorId, todoId)
}

// Lifecycle
onMounted(() => {
  // Set Athena's initial position (bottom-right corner)
  athenaPosition.value = {
    x: window.innerWidth - 150,
    y: window.innerHeight - 150
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  // Initialize canvas with sample nodes
  initializeSampleNodes()
  
  // Update voice spatial context
  voice.updateSpatialContext({
    viewportCenter: {
      x: canvas.canvasSize.value.width / 2,
      y: canvas.canvasSize.value.height / 2
    },
    zoomLevel: canvas.viewport.value.zoom
  })
  
  // Auto-start voice in conversation mode for better UX
  setTimeout(() => {
    voice.startListening()
    if (athena3D.value) {
      athena3D.value.speak("Hello! I'm Athena, your AI assistant. I'm ready to help you manage your workspace. Just say 'Athena' followed by your command, or click me to start a conversation.")
    }
  }, 1000)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  voice.stopListening()
})

// Watch for voice confidence changes
watch(() => voice.confidence.value, (newConfidence) => {
  if (newConfidence > 0.9 && athenaAI.state.value.mood !== 'excited') {
    athenaAI.state.value.mood = 'excited'
  }
})

// Watch for zoom changes to apply force layout in graph view
watch(() => canvas.viewport.value.zoom, (newZoom, oldZoom) => {
  // Apply force layout when entering graph view
  if (canvas.isGraphView.value && oldZoom > 0.3 && newZoom <= 0.3) {
    canvas.applyForceLayout()
  }
  
  // Update voice context with zoom level
  voice.updateSpatialContext({ zoomLevel: newZoom })
})
</script>

<style scoped>
/* Canvas styles remain the same but with enhancements */
.athena-canvas {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}

.canvas-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: all;
  cursor: grab;
}

.canvas-grid:active {
  cursor: grabbing;
}

.canvas-content {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.canvas-node {
  position: absolute;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  pointer-events: all;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  animation: nodeAppear 0.5s ease;
  cursor: move;
}

.canvas-node:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.04);
}

.canvas-node:active {
  cursor: grabbing;
  transform: scale(1.02);
}

.canvas-node.selected {
  border-color: #8b5cf6;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}

.canvas-node.focused {
  border-color: #60a5fa;
  box-shadow: 0 0 30px rgba(96, 165, 250, 0.4);
}

.canvas-node.node-creating {
  animation: nodeCreate 0.5s ease;
}

.canvas-node.node-removing {
  animation: nodeRemove 0.3s ease forwards;
}

/* Graph View Styles - Obsidian-like */
.canvas-node.graph-view {
  background: transparent;
  border: none;
  backdrop-filter: none;
  transition: transform 0.3s ease;
}

.graph-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px;
}

.graph-node-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
}

.graph-node-circle:hover {
  transform: scale(1.2);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.graph-node-circle svg {
  width: 24px;
  height: 24px;
  color: white;
}

.graph-node-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.graph-node-tags {
  display: flex;
  gap: 4px;
}

.graph-node-tags .tag {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* Node View - Compact Cards */
.canvas-node.node-view {
  background: rgba(255, 255, 255, 0.03);
  padding: 0;
  overflow: hidden;
}

.compact-node {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.compact-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.compact-header svg {
  width: 20px;
  height: 20px;
  color: #60a5fa;
}

.compact-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-preview {
  flex: 1;
  padding: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.compact-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
}

.compact-type {
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  font-weight: 500;
}

.compact-connections {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #60a5fa;
}

.compact-connections svg {
  width: 14px;
  height: 14px;
}

/* Connection Lines */
.connection-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.connection-line {
  stroke-linecap: round;
  transition: all 0.3s ease;
}

.connection-line.active {
  stroke-width: 3 !important;
  filter: drop-shadow(0 0 10px rgba(74, 144, 226, 0.8));
}

.connection-line.graph-mode {
  stroke-dasharray: none;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.connection-particle {
  filter: drop-shadow(0 0 6px rgba(74, 144, 226, 0.8));
}

/* Athena 3D Container */
.athena-3d-wrapper {
  position: fixed;
  width: 200px;
  height: 200px;
  transition: transform 0.3s ease;
}

.athena-3d-wrapper.listening {
  transform: scale(1.1);
}

.athena-3d-wrapper.processing {
  animation: processing 1s ease infinite;
}

.athena-3d-wrapper.conversation-mode {
  filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));
}

/* Voice Activity Indicator */
.voice-activity {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  overflow: hidden;
}

.activity-bar {
  position: absolute;
  bottom: 0;
  width: 100%;
  transition: height 0.1s ease;
  border-radius: 10px;
}

/* Conversation Context Bubble */
.context-bubble {
  position: absolute;
  bottom: 220px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 300px;
  max-width: 500px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(20px);
}

.context-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #8b5cf6;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #8b5cf6;
  border-radius: 50%;
  animation: pulse 2s ease infinite;
}

.interim-text {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  margin: 10px 0;
}

.final-text {
  color: white;
  font-weight: 500;
  margin: 10px 0;
}

.context-hints {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.hint {
  padding: 5px 10px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

/* Visual Feedback Layer */
.visual-feedback {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
}

.connections-layer {
  position: absolute;
  inset: 0;
}

.connection-line {
  stroke: #8b5cf6;
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 5, 5;
  animation: dash 20s linear infinite;
}

.feedback-item {
  position: fixed;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6, #60a5fa);
  color: white;
  border-radius: 30px;
  font-weight: 500;
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
  animation: feedbackSlide 0.5s ease;
}

/* Status Bar */
.status-bar {
  position: fixed;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  backdrop-filter: blur(10px);
  z-index: 100;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

/* Canvas Controls Enhanced */
.canvas-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 100;
}

.control-btn.active {
  background: linear-gradient(135deg, #8b5cf6, #60a5fa);
  border-color: transparent;
}

/* Animations */
@keyframes nodeCreate {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes nodeRemove {
  to {
    transform: scale(0);
    opacity: 0;
  }
}

@keyframes processing {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.05) rotate(5deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: -100;
  }
}

@keyframes feedbackSlide {
  from {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

/* Transitions */
.bubble-enter-active, .bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.feedback-enter-active, .feedback-leave-active {
  transition: all 0.5s ease;
}

.feedback-enter-from, .feedback-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.8);
}

.node-enter-active, .node-leave-active {
  transition: all 0.3s ease;
}

.node-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.node-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>