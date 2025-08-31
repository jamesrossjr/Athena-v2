<template>
  <div
    class="athena-canvas"
    @wheel="canvas.handleWheel"
  >
    <!-- Infinite Grid Canvas Background (hidden in workspace mode) -->
    <div
      v-if="!canvas.isWorkspaceMode.value"
      class="canvas-grid"
      :style="gridStyle"
      @mousedown="canvas.handleMouseDown($event)"
    />

    <!-- Canvas Nodes/Workspaces -->
    <div
      class="canvas-content"
      :style="canvas.isWorkspaceMode.value ? workspaceTransform : canvasTransform"
    >
      <!-- Advanced Graph Connections - Removed as requested -->

      <!-- Connection Preview Line -->
      <svg
        v-if="canvas.isConnecting.value && canvas.connectionPreview.value"
        class="connection-preview-layer"
        :style="connectionLayerStyle"
      >
        <line
          :x1="canvas.connectionPreview.value.x1"
          :y1="canvas.connectionPreview.value.y1"
          :x2="canvas.connectionPreview.value.x2"
          :y2="canvas.connectionPreview.value.y2"
          class="connection-preview"
          stroke="#4a90e2"
          stroke-width="2"
          stroke-dasharray="5,5"
        />
      </svg>

      <TransitionGroup name="node">
        <div
          v-for="node in canvas.visibleNodes.value"
          :key="node.id"
          class="canvas-node"
          :class="{
            'selected': canvas.selectedNodes.value.has(node.id),
            'focused': voice.conversationContext.value.activeCard === node.id,
            'pinned': node.pinned,
            'expanded': node.expanded,
            'workspace-mode': canvas.isWorkspaceMode.value,
            'graph-view': canvas.isGraphView.value,
            'node-view': canvas.isNodeView.value,
            'detail-view': canvas.isDetailView.value,
            'has-connections': node.connections && node.connections.length > 0
          }"
          :style="canvas.isWorkspaceMode.value ? getWorkspaceNodeStyle(node) : getNodeStyle(node)"
          :data-node-id="node.id"
          @mousedown.stop="handleNodeMouseDown($event, node)"
          @mouseup="handleNodeMouseUp($event, node)"
          @mouseenter="handleNodeHover(node, true)"
          @mouseleave="handleNodeHover(node, false)"
          @dblclick="handleNodeDoubleClick(node)"
          @click="handleNodeClick(node)"
          @contextmenu.prevent="handleNodeRightClick($event, node)"
        >
          <!-- Pin Indicator -->
          <div
            v-if="node.pinned && !canvas.isWorkspaceMode.value"
            class="pin-indicator"
            @click.stop="canvas.toggleNodePin(node.id)"
          >
            <Icon name="heroicons:lock-closed" />
          </div>

          <!-- Expand/Collapse Button -->
          <div
            v-if="!canvas.isGraphView.value && !canvas.isWorkspaceMode.value"
            class="expand-button"
            @click.stop="canvas.expandNodeToWorkspace(node.id)"
          >
            <Icon name="heroicons:arrows-pointing-out" />
          </div>

          <!-- Exit Workspace Button -->
          <div
            v-if="canvas.isWorkspaceMode.value"
            class="exit-workspace-button"
            @click.stop="canvas.collapseFromWorkspace()"
          >
            <Icon name="heroicons:x-mark" />
            <span>Exit Workspace</span>
          </div>
          <!-- Workspace Mode - Full Content -->
          <div
            v-if="canvas.isWorkspaceMode.value"
            class="workspace-content"
          >
            <component
              :is="getNodeComponent(node)"
              :node="node"
              :zoom-level="1"
              :expanded="true"
              @update="updateNodeContent(node.id, $event)"
            />
          </div>

          <!-- Graph view - Small circular nodes -->
          <div
            v-else-if="canvas.isGraphView.value"
            class="graph-node"
          >
            <div
              class="graph-node-circle"
              :style="{
                background: node.color || getNodeColor(node.type),
                boxShadow: `0 0 20px ${node.color || getNodeColor(node.type)}40`
              }"
            >
              <Icon :name="getNodeIcon(node.type)" />
            </div>
            <div class="graph-node-label">
              {{ node.title }}
            </div>
            <div
              v-if="node.tags"
              class="graph-node-tags"
            >
              <span
                v-for="tag in node.tags.slice(0, 2)"
                :key="tag"
                class="tag"
              >
                #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Node view - Compact cards -->
          <div
            v-else-if="canvas.isNodeView.value"
            class="compact-node"
          >
            <div class="compact-header">
              <Icon :name="getNodeIcon(node.type)" />
              <span class="compact-title">{{ node.title }}</span>
            </div>
            <div class="compact-preview">
              {{ getNodePreview(node) }}
            </div>
            <div class="compact-footer">
              <span class="compact-type">{{ node.type }}</span>
              <span
                v-if="node.connections"
                class="compact-connections"
              >
                <Icon name="heroicons:link" />
                {{ node.connections.length }}
              </span>
            </div>
          </div>

          <!-- ATHENAal/Detail view - Full content -->
          <component
            :is="getNodeComponent(node)"
            v-else
            :node="node"
            :zoom-level="canvas.viewport.value.zoom"
            @update="updateNodeContent(node.id, $event)"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- 3D Athena AI Assistant (hidden in workspace mode) -->
    <div
      v-if="!canvas.isWorkspaceMode.value"
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
      <div
        v-if="voice.voiceActivityDetection.value.isSpeaking"
        class="voice-activity"
      >
        <div
          class="activity-bar"
          :style="{
            height: `${voice.voiceActivityDetection.value.volume * 100}%`,
            background: `hsl(${220 + voice.voiceActivityDetection.value.clarity * 60}, 70%, 50%)`
          }"
        />
      </div>

      <!-- Conversation Context Bubble -->
      <Transition name="bubble">
        <div
          v-if="voice.isConversationMode.value"
          class="context-bubble"
        >
          <div class="context-status">
            <div class="pulse-dot" />
            <span>Conversation Mode Active</span>
          </div>
          <div
            v-if="voice.interimTranscript.value"
            class="interim-text"
          >
            {{ voice.interimTranscript.value }}
          </div>
          <div
            v-if="voice.transcript.value"
            class="final-text"
          >
            "{{ voice.transcript.value }}"
          </div>
          <div class="context-hints">
            <span
              v-for="hint in currentHints"
              :key="hint"
              class="hint"
            >
              {{ hint }}
            </span>
          </div>
        </div>
      </Transition>

      <!-- Athena's Insights Panel -->
      <Transition name="insights">
        <div
          v-if="orchestrator.athenaInsights.value.length > 0"
          class="athena-insights"
        >
          <div class="insights-header">
            <Icon name="heroicons:light-bulb" />
            <span>Athena's Insights</span>
          </div>
          <div class="insights-list">
            <div
              v-for="insight in orchestrator.athenaInsights.value"
              :key="insight.id"
              class="insight-item"
              @click="handleInsightAction(insight)"
            >
              <div
                class="insight-confidence"
                :style="{ width: `${insight.confidence * 100}%` }"
              />
              <p>{{ insight.message }}</p>
              <button class="insight-action">
                <Icon name="heroicons:arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Home Screen -->
    <HomeScreen
      ref="homeScreen"
      :is-visible="showHomeScreen"
      @close="showHomeScreen = false"
      @launch-app="launchAppFromHome"
    />

    <!-- Enhanced App Dock with window management -->
    <EnhancedAppDock
      ref="appDock"
      @open-command-center="showCommandPalette = true"
    />

    <!-- Command Palette -->
    <CommandPalette
      v-model="showCommandPalette"
      @execute="handleCommand"
    />

    <!-- Context Menu -->
    <Transition name="context-menu">
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div
          class="context-menu-item"
          @click="duplicateNode(contextMenu.node)"
        >
          <Icon name="heroicons:document-duplicate" />
          <span>Duplicate</span>
          <span class="shortcut">Ctrl+D</span>
        </div>
        <div
          class="context-menu-item"
          @click="canvas.toggleNodePin(contextMenu.node.id)"
        >
          <Icon :name="contextMenu.node?.pinned ? 'heroicons:lock-open' : 'heroicons:lock-closed'" />
          <span>{{ contextMenu.node?.pinned ? 'Unpin' : 'Pin' }}</span>
          <span class="shortcut">P</span>
        </div>
        <div
          class="context-menu-item"
          @click="canvas.expandNodeToWorkspace(contextMenu.node.id)"
        >
          <Icon name="heroicons:arrows-pointing-out" />
          <span>Expand</span>
          <span class="shortcut">Enter</span>
        </div>
        <div class="context-menu-divider" />
        <div
          class="context-menu-item"
          @click="changeNodeColor(contextMenu.node)"
        >
          <Icon name="heroicons:swatch" />
          <span>Change Color</span>
        </div>
        <div
          class="context-menu-item"
          @click="editNodeProperties(contextMenu.node)"
        >
          <Icon name="heroicons:pencil-square" />
          <span>Edit Properties</span>
        </div>
        <div class="context-menu-divider" />
        <div
          class="context-menu-item"
          @click="canvas.connectNodes(contextMenu.node.id, null)"
        >
          <Icon name="heroicons:link" />
          <span>Create Connection</span>
          <span class="shortcut">Alt+Click</span>
        </div>
        <div
          class="context-menu-item"
          @click="disconnectAllFromNode(contextMenu.node)"
        >
          <Icon name="heroicons:link-slash" />
          <span>Remove All Connections</span>
        </div>
        <div class="context-menu-divider" />
        <div
          class="context-menu-item danger"
          @click="deleteNode(contextMenu.node)"
        >
          <Icon name="heroicons:trash" />
          <span>Delete</span>
          <span class="shortcut">Del</span>
        </div>
      </div>
    </Transition>

    <!-- Canvas Controls (hidden in workspace mode) -->
    <div
      v-if="!canvas.isWorkspaceMode.value"
      class="canvas-controls"
    >
      <div class="zoom-controls">
        <button
          class="control-btn"
          @click="zoomIn"
        >
          <Icon name="heroicons:magnifying-glass-plus" />
        </button>
        <span class="zoom-level">{{ Math.round(canvas.viewport.value.zoom * 100) }}%</span>
        <button
          class="control-btn"
          @click="zoomOut"
        >
          <Icon name="heroicons:magnifying-glass-minus" />
        </button>
      </div>
      <button
        class="control-btn"
        @click="canvas.fitToScreen()"
      >
        <Icon name="heroicons:arrows-pointing-out" />
      </button>
      <button
        class="control-btn"
        :class="{ active: voice.isListening.value }"
        @click="toggleVoiceMode"
      >
        <Icon :name="voice.isListening.value ? 'heroicons:microphone' : 'lucide:mic-off'" />
      </button>
    </div>

    <!-- Visual Feedback Layer -->
    <div class="visual-feedback">
      <!-- Connection Lines for Workflows -->
      <svg
        v-if="connections.length"
        class="connections-layer"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#8b5cf6"
            />
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
      <div
        v-if="voice.isConversationMode.value"
        class="status-item"
      >
        <Icon name="heroicons:chat-bubble-left-right" />
        <span>Conversation depth: {{ voice.conversationContext.value.conversationDepth }}</span>
      </div>
      <div
        v-if="voice.confidence.value > 0"
        class="status-item"
      >
        <Icon name="heroicons:signal" />
        <span>Confidence: {{ Math.round(voice.confidence.value * 100) }}%</span>
      </div>
    </div>

    <!-- Color Theme Settings Modal -->
    <Transition name="modal">
      <ColorThemeSettings
        v-if="showColorSettings"
        @close="showColorSettings = false"
        @apply-theme="applyTheme"
      />
    </Transition>

    <!-- All UI controls are now in ProCommandCenter - Press Cmd/Ctrl+K -->
    <div
      v-if="false"
      class="bottom-control-bar-removed"
    >
      <!-- Control Buttons -->
      <div class="control-buttons">
        <!-- Theme Button -->
        <button
          class="control-btn theme-btn"
          title="Change Theme"
          @click="showColorSettings = true"
        >
          <Icon name="heroicons:paint-brush" />
          <span>Theme</span>
        </button>

        <!-- ATHENA Button -->
        <button
          class="control-btn athena-btn"
          title="Add ATHENA AI Assistant"
          @click="addAthenaBlock"
        >
          <Icon name="heroicons:sparkles" />
          <span>ATHENA</span>
        </button>
      </div>

      <!-- Search Container -->
      <div
        class="search-container"
        :class="{ collapsed: searchBarCollapsed }"
      >
        <Icon
          name="heroicons:magnifying-glass"
          class="search-icon"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search nodes... (Ctrl+F)"
          class="search-input"
          @input="handleSearch"
          @keydown.escape="clearSearch"
        >
        <button
          v-if="searchQuery"
          class="clear-search"
          @click="clearSearch"
        >
          <Icon name="heroicons:x-mark" />
        </button>
      </div>

      <!-- Collapse Toggle Button -->
      <button
        class="control-btn collapse-btn"
        :title="searchBarCollapsed ? 'Expand search' : 'Collapse search'"
        @click="searchBarCollapsed = !searchBarCollapsed"
      >
        <Icon :name="searchBarCollapsed ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" />
      </button>

      <div
        v-if="!searchBarCollapsed"
        class="search-filters"
      >
        <button
          v-for="type in nodeTypes"
          :key="type"
          class="filter-chip"
          :class="{ active: activeFilters.includes(type) }"
          @click="toggleTypeFilter(type)"
        >
          <Icon :name="getNodeIcon(type)" />
          {{ type }}
        </button>
      </div>

      <div
        v-if="!searchBarCollapsed && filteredNodes.length !== canvas.nodes.value.size"
        class="search-results"
      >
        {{ filteredNodes.length }} of {{ canvas.nodes.value.size }} nodes
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useInfiniteCanvas } from '@/composables/useInfiniteCanvas'
import { useAdvancedVoice } from '@/composables/useAdvancedVoice'
import { useAthena3D } from '@/composables/useAthena3D'
import { useAthenaOrchestrator } from '@/composables/useAthenaOrchestrator'
import { useGraphConnections } from '@/composables/useGraphConnections'
import { clearAllCache, setupCacheClearShortcut } from '@/utils/clearAllCache'
import CommandPalette from '@/components/CommandPalette.vue'
import Athena3D from '@/components/Athena3D.vue'
import GraphConnections from '@/components/GraphConnections.vue'
import NodeEditor from '@/components/nodes/NodeEditor.vue'
import NodeIDE from '@/components/nodes/NodeIDE.vue'
import TodoBlock from '@/components/nodes/blocks/TodoBlock.vue'
import WorkflowWidget from '@/components/nodes/WorkflowWidget.vue'
import ColorThemeSettings from '@/components/ColorThemeSettings.vue'
import AthenaVoiceInterface from '@/components/AthenaVoiceInterface.vue'
// New productivity blocks
import KanbanBlock from '@/components/nodes/blocks/KanbanBlock.vue'
import PipelineBlock from '@/components/nodes/blocks/PipelineBlock.vue'
import MetricsBlock from '@/components/nodes/blocks/MetricsBlock.vue'
import GitOpsBlock from '@/components/nodes/blocks/GitOpsBlock.vue'
import ContainerBlock from '@/components/nodes/blocks/ContainerBlock.vue'
import InfrastructureBlock from '@/components/nodes/blocks/InfrastructureBlock.vue'
import AthenaBlock from '@/components/nodes/blocks/AthenaBlock.vue'
// Import the enhanced components
import EnhancedAppDock from '@/components/EnhancedAppDock.vue'
import HomeScreen from '@/components/HomeScreen.vue'

// Initialize composables
const canvas = useInfiniteCanvas()
const voice = useAdvancedVoice()
const athenaAI = useAthena3D()
const orchestrator = useAthenaOrchestrator()
const graphConnections = useGraphConnections()

// Refs
const athenaContainer = ref<HTMLElement>()
const athena3D = ref<any>()
const showCommandPalette = ref(false)
const showColorSettings = ref(false)
const showHomeScreen = ref(false)
const appDock = ref()
const homeScreen = ref()
const showAthenaVoice = ref(false)

// Search/Filter state
const searchQuery = ref('')
const searchBarCollapsed = ref(false)
const activeFilters = ref<string[]>([])
const nodeTypes = ['workspace', 'document', 'ide', 'todo', 'kanban', 'pipeline', 'metrics', 'gitops', 'container', 'infrastructure', 'workflow', 'note', 'editor']

// Theme state
const currentTheme = ref({
  canvas: '#0a0a0a',
  grid: 'rgba(59, 130, 246, 0.1)',
  nodes: '#4a90e2',
  connections: '#4a90e2',
  text: '#ffffff'
})

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  node: null as any
})

// Athena position and dragging
const athenaPosition = ref({ x: 0, y: 0 })
const isDraggingAthena = ref(false)
const athenaDragOffset = ref({ x: 0, y: 0 })

// Visual feedback
const connections = ref<Array<{ id: string, path: string }>>([])
const actionFeedback = ref<Array<{ id: string, text: string, style: any }>>([])

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

const workspaceTransform = computed(() => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  transform: 'none',
  zIndex: 1000
}))

const connectionLayerStyle = computed(() => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  overflow: 'visible'
}))

// Filter nodes based on search and filters
const filteredNodes = computed(() => {
  let nodes = Array.from(canvas.nodes.value.values())

  // Filter by type
  if (activeFilters.value.length > 0) {
    nodes = nodes.filter(node => activeFilters.value.includes(node.type))
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    nodes = nodes.filter((node) => {
      return (
        node.title.toLowerCase().includes(query)
        || node.type.toLowerCase().includes(query)
        || (node.tags && node.tags.some(tag => tag.toLowerCase().includes(query)))
        || (node.content && JSON.stringify(node.content).toLowerCase().includes(query))
      )
    })
  }

  return nodes
})

// Compute visible connections based on visible nodes
const visibleConnections = computed(() => {
  const connections: any[] = []
  const { x, y, zoom } = canvas.viewport.value

  canvas.visibleNodes.value.forEach((node) => {
    if (node.connections) {
      node.connections.forEach((targetId) => {
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

const getWorkspaceNodeStyle = (node: any) => {
  // In workspace mode, node fills the entire screen
  return {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100vw',
    height: '100vh',
    borderRadius: '0',
    background: 'rgba(10, 10, 10, 0.98)'
  }
}

const getNodeComponent = (node: any) => {
  // Check if it's a workflow widget node
  if (node.content?.workflowNode) {
    return WorkflowWidget
  }

  // Return appropriate component based on node type
  switch (node.type) {
    case 'editor':
      return NodeEditor
    case 'ide':
      return NodeIDE
    case 'todo':
      return TodoBlock
    case 'kanban':
      return KanbanBlock
    case 'pipeline':
      return PipelineBlock
    case 'metrics':
      return MetricsBlock
    case 'gitops':
      return GitOpsBlock
    case 'container':
      return ContainerBlock
    case 'infrastructure':
      return InfrastructureBlock
    case 'workflow':
      return WorkflowWidget
    case 'athena':
      return AthenaBlock
    default:
      return NodeEditor
  }
}

const getNodeColor = (type: string) => {
  const colors: Record<string, string> = {
    workspace: '#4a90e2',
    document: '#50c878',
    ide: '#ff6b6b',
    todo: '#ffa500',
    kanban: '#14b8a6',
    pipeline: '#8b5cf6',
    metrics: '#ef4444',
    gitops: '#10b981',
    container: '#3b82f6',
    infrastructure: '#f59e0b',
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
    kanban: 'heroicons:view-columns',
    pipeline: 'heroicons:play-circle',
    metrics: 'heroicons:chart-bar',
    gitops: 'heroicons:arrow-path',
    container: 'heroicons:cube',
    infrastructure: 'heroicons:building-office',
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

const handleNodeClick = (node: any) => {
  // Click behavior depends on view mode
  // Expansion is now handled by the expand button, not clicking the node itself
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
  // Check for workflow commands first
  if (command.toLowerCase().includes('workflow')
    || command.toLowerCase().includes('automate')
    || command.toLowerCase().includes('n8n')) {
    const workflowResponse = await orchestrator.handleVoiceWorkflowCommand(command)

    if (athena3D.value) {
      athena3D.value.speak(workflowResponse.message)
    }

    // If workflow nodes were created, animate them
    if (workflowResponse.nodes) {
      for (const nodeId of workflowResponse.nodes) {
        await animateNodeCreation(nodeId)
      }
    }

    return
  }

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

// Animate node creation
const animateNodeCreation = async (nodeId: string) => {
  await nextTick()
  const element = document.querySelector(`[data-node-id="${nodeId}"]`)
  if (element) {
    element.classList.add('node-creating')
    setTimeout(() => element.classList.remove('node-creating'), 500)
  }
}

// Handle Athena's insight actions
const handleInsightAction = async (insight: any) => {
  if (insight.message.includes('automation workflow')) {
    // Create an intelligent workflow based on context
    const nodes = await orchestrator.createIntelligentWorkflow('smart automation')

    if (athena3D.value) {
      athena3D.value.speak(`I've created an automation workflow with ${nodes.length} nodes. The workflow is ready to configure.`)
    }
  } else if (insight.message.includes('debug')) {
    // Find and fix workflow errors
    const workflows = Array.from(canvas.nodes.value.values()).filter(
      n => n.type === 'workflow' && n.content?.executionState === 'error'
    )

    if (workflows.length > 0) {
      canvas.centerOnNode(workflows[0].id)
      canvas.selectedNodes.value.add(workflows[0].id)
    }
  }

  // Remove the insight after acting on it
  orchestrator.athenaInsights.value = orchestrator.athenaInsights.value.filter(
    i => i.id !== insight.id
  )
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
  canvas.nodes.value.forEach((node) => {
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
  // Don't allow dragging in workspace mode
  if (!canvas.isWorkspaceMode.value) {
    canvas.handleMouseDown(event, node.id)
    voice.setActiveCard(node.id)
  }
}

const handleNodeMouseUp = (event: MouseEvent, node: any) => {
  if (canvas.isConnecting.value) {
    canvas.handleMouseUp(event, node.id)
  }
}

const handleNodeRightClick = (event: MouseEvent, node: any) => {
  // Show context menu
  showContextMenu(event, node)
}

// Context menu functions
const showContextMenu = (event: MouseEvent, node: any) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    node
  }
}

const hideContextMenu = () => {
  contextMenu.value.show = false
}

// Graph connection event handlers
const handleConnectionSelected = (connection: any) => {
  console.log('Connection selected:', connection)
  // Could show connection properties in a sidebar
}

const handlePathHighlighted = (path: string[]) => {
  console.log('Path highlighted:', path)
  // Could update UI to show path analysis
}

const duplicateNode = (node: any) => {
  if (!node) return

  const newNode = {
    ...node,
    title: `${node.title} (Copy)`,
    position: {
      x: node.position.x + 50,
      y: node.position.y + 50
    }
  }

  delete newNode.id
  canvas.addNode(newNode)
  hideContextMenu()
}

const deleteNode = (node: any) => {
  if (!node) return
  canvas.removeNode(node.id)
  hideContextMenu()
}

const changeNodeColor = (node: any) => {
  // Simple color picker - you could make this more sophisticated
  const colors = ['#4a90e2', '#50c878', '#ff6b6b', '#ffa500', '#9b59b6', '#f39c12']
  const currentIndex = colors.indexOf(node.color || '#4a90e2')
  const nextColor = colors[(currentIndex + 1) % colors.length]

  canvas.updateNode(node.id, { color: nextColor })
  hideContextMenu()
}

const editNodeProperties = (node: any) => {
  // Could open a modal here for editing
  const newTitle = prompt('Enter new title:', node.title)
  if (newTitle) {
    canvas.updateNode(node.id, { title: newTitle })
  }
  hideContextMenu()
}

const disconnectAllFromNode = (node: any) => {
  if (!node || !node.connections) return

  node.connections.forEach((targetId: string) => {
    canvas.disconnectNodes(node.id, targetId)
  })
  hideContextMenu()
}

// Search/Filter functions
const handleSearch = () => {
  // Focus on first search result if any
  if (filteredNodes.value.length > 0 && searchQuery.value) {
    const firstMatch = filteredNodes.value[0]
    canvas.centerOnNode(firstMatch.id)
    canvas.selectedNodes.value.clear()
    canvas.selectedNodes.value.add(firstMatch.id)
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  activeFilters.value = []
}

const toggleTypeFilter = (type: string) => {
  const index = activeFilters.value.indexOf(type)
  if (index >= 0) {
    activeFilters.value.splice(index, 1)
  } else {
    activeFilters.value.push(type)
  }
  handleSearch() // Re-focus on results
}

// Theme functions
const applyTheme = (theme: any) => {
  if (theme.colors) {
    // Apply preset theme
    currentTheme.value = {
      canvas: theme.colors[0] || '#0a0a0a',
      grid: `${theme.colors[2]}20` || 'rgba(59, 130, 246, 0.1)',
      nodes: theme.colors[2] || '#4a90e2',
      connections: theme.colors[3] || '#4a90e2',
      text: theme.colors[4] || '#ffffff'
    }
  } else if (theme.targets) {
    // Apply custom color to specific targets
    const color = theme.hex || theme.color
    theme.targets.forEach((target: string) => {
      if (target === 'canvas') {
        currentTheme.value.canvas = color
      } else if (target === 'nodes') {
        currentTheme.value.nodes = color
      } else if (target === 'connections') {
        currentTheme.value.connections = color
      }
    })
  }
}

// Launch app from home screen
const launchAppFromHome = (app: any) => {
  showHomeScreen.value = false
  if (appDock.value?.launchApp) {
    appDock.value.launchApp(app.type)
  }
}

// Add ATHENA block to canvas
const addAthenaBlock = () => {
  const centerX = (canvas.viewport.value.x + canvas.canvasSize.value.width / 2) / canvas.viewport.value.zoom
  const centerY = (canvas.viewport.value.y + canvas.canvasSize.value.height / 2) / canvas.viewport.value.zoom

  canvas.addNode({
    type: 'athena',
    title: 'ATHENA AI Assistant',
    position: {
      x: centerX - 200,
      y: centerY - 250
    },
    size: { width: 400, height: 500 },
    minimized: false,
    content: {
      messages: [],
      settings: {}
    },
    color: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    tags: ['ai', 'assistant', 'athena', 'chat']
  })

  // Apply theme to CSS variables
  const root = document.documentElement
  root.style.setProperty('--canvas-bg', currentTheme.value.canvas)
  root.style.setProperty('--grid-color', currentTheme.value.grid)
  root.style.setProperty('--node-color', currentTheme.value.nodes)
  root.style.setProperty('--connection-color', currentTheme.value.connections)
  root.style.setProperty('--text-color', currentTheme.value.text)

  // Save theme preference
  localStorage.setItem('canvas-theme-applied', JSON.stringify(currentTheme.value))
}

const handleNodeHover = (node: any, hovering: boolean) => {
  if (!canvas.isWorkspaceMode.value && hovering && voice.isConversationMode.value) {
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

// Handle ATHENA events - using existing 3D character on canvas
const toggleAthena = () => {
  // ATHENA is the 3D character already on the canvas
  if (athena3D.value) {
    athena3D.value.toggle()
  }
}

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K for command palette
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }

  // Ctrl/Cmd + H for home screen
  if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
    event.preventDefault()
    showHomeScreen.value = !showHomeScreen.value
  }

  // Ctrl/Cmd + F for search
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
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
        { type: 'heading', content: { text: 'Project Overview', level: 1 } },
        { type: 'text', content: { text: 'This is our main development workspace with integrated AI assistance.' } },
        { type: 'todo', content: { items: [
          { text: 'Complete API documentation', checked: false },
          { text: 'Update deployment guide', checked: true }
        ] } }
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

  // Kanban board
  const kanbanId = canvas.addNode({
    type: 'kanban',
    title: 'Sprint Board',
    position: { x: 950, y: 450 },
    size: { width: 400, height: 300 },
    minimized: false,
    tags: ['agile', 'project'],
    color: '#14b8a6',
    content: {}
  })

  // Pipeline
  const pipelineId = canvas.addNode({
    type: 'pipeline',
    title: 'CI/CD Pipeline',
    position: { x: 300, y: 550 },
    size: { width: 450, height: 250 },
    minimized: false,
    tags: ['devops', 'automation'],
    color: '#8b5cf6',
    content: {}
  })

  // Metrics dashboard
  const metricsId = canvas.addNode({
    type: 'metrics',
    title: 'System Metrics',
    position: { x: 800, y: 700 },
    size: { width: 400, height: 350 },
    minimized: false,
    tags: ['monitoring', 'performance'],
    color: '#ef4444',
    content: {}
  })

  // GitOps deployment
  const gitopsId = canvas.addNode({
    type: 'gitops',
    title: 'Production Deploy',
    position: { x: 1200, y: 200 },
    size: { width: 450, height: 300 },
    minimized: false,
    tags: ['deployment', 'gitops'],
    color: '#10b981',
    content: {}
  })

  // Container management
  const containerId = canvas.addNode({
    type: 'container',
    title: 'Docker Containers',
    position: { x: 100, y: 800 },
    size: { width: 500, height: 400 },
    minimized: false,
    tags: ['containers', 'docker'],
    color: '#3b82f6',
    content: {}
  })

  // Infrastructure as Code
  const infraId = canvas.addNode({
    type: 'infrastructure',
    title: 'AWS Infrastructure',
    position: { x: 650, y: 850 },
    size: { width: 600, height: 450 },
    minimized: false,
    tags: ['terraform', 'aws'],
    color: '#f59e0b',
    content: {}
  })

  // Create connections between related nodes
  canvas.connectNodes(workspaceId, todoId)
  canvas.connectNodes(workspaceId, workflowId)
  canvas.connectNodes(workflowId, todoId)
  canvas.connectNodes(workspaceId, editorId)
  canvas.connectNodes(ideId, workspaceId)

  // Create advanced graph connections with different types
  // Pipeline Model: Sequential CI/CD flow
  graphConnections.createConnection(workspaceId, ideId, 'pipeline-next', {
    stage: 'development',
    order: 1
  })

  graphConnections.createConnection(ideId, editorId, 'pipeline-trigger', {
    eventType: 'code-change',
    condition: 'on-save'
  })

  // Hierarchical Model: Workspace contains projects
  graphConnections.createConnection(workspaceId, todoId, 'contains', {
    level: 1,
    category: 'project-management'
  })

  graphConnections.createConnection(workspaceId, workflowId, 'contains', {
    level: 1,
    category: 'automation'
  })

  // Dependency Model: Service dependencies
  graphConnections.createConnection(todoId, workflowId, 'depends-on', {
    protocol: 'webhook',
    reliability: 0.99
  })

  graphConnections.createConnection(editorId, ideId, 'provides', {
    method: 'file-system-access',
    frequency: 'continuous'
  })
  canvas.connectNodes(editorId, todoId)
  // Connect new productivity nodes
  canvas.connectNodes(pipelineId, metricsId)
  canvas.connectNodes(kanbanId, todoId)
  canvas.connectNodes(pipelineId, ideId)
  canvas.connectNodes(metricsId, workflowId)
  // Connect DevOps workflow
  canvas.connectNodes(gitopsId, pipelineId)
  canvas.connectNodes(containerId, gitopsId)
  canvas.connectNodes(infraId, containerId)
  canvas.connectNodes(metricsId, containerId)
}

// Lifecycle
onMounted(async () => {
  // Clear all cache immediately for a fresh start
  console.log('🧹 Clearing all cache for fresh start...')
  await clearAllCache()

  // Setup cache clear shortcut (Ctrl+Shift+Delete)
  setupCacheClearShortcut()

  // Set Athena's initial position (bottom-right corner)
  if (typeof window !== 'undefined') {
    athenaPosition.value = {
      x: window.innerWidth - 150,
      y: window.innerHeight - 150
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', hideContextMenu)

  // Don't initialize sample nodes - keep canvas clean for Android-style app management
  // Users should launch apps from dock or home screen (Ctrl+H)
  // initializeSampleNodes()

  // Start Athena's periodic analysis
  orchestrator.startPeriodicAnalysis()

  // Don't create sample workflow widgets - keep canvas clean
  // if (typeof window !== 'undefined') {
  //   setTimeout(async () => {
  //     const webhookNode = await orchestrator.createWidgetNode(
  //       orchestrator.nodeLibrary.value.get('webhook-trigger')!,
  //       { x: 1000, y: 100 }
  //     )

  //     const aiNode = await orchestrator.createWidgetNode(
  //       orchestrator.nodeLibrary.value.get('ai-process')!,
  //       { x: 1250, y: 100 }
  //     )

  //     canvas.connectNodes(webhookNode, aiNode)

  //     // Trigger Athena's context analysis
  //     orchestrator.athenaAnalyzeContext()
  //   }, 2000)
  // }

  // Update voice spatial context
  voice.updateSpatialContext({
    viewportCenter: {
      x: canvas.canvasSize.value.width / 2,
      y: canvas.canvasSize.value.height / 2
    },
    zoomLevel: canvas.viewport.value.zoom
  })

  // Don't auto-start voice - it's causing errors and loops
  // User can enable voice manually if needed
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      // Show clean canvas message
      console.log('%c✨ Clean Canvas Ready!', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-weight: bold;')
      console.log('%c📱 Android-Style App Management:', 'color: #3b82f6; font-weight: bold; font-size: 14px;')
      console.log('   Ctrl+D → Show/Hide Dock')
      console.log('   Ctrl+K → Open App Drawer')
      console.log('   Ctrl+H → Open Home Screen')
      console.log('   Ctrl+Shift+Delete → Clear All Cache')
      console.log('   Space → Toggle Voice (when not typing)')
      console.log('%c🎯 Canvas stays clean - launch apps on demand!', 'color: #10b981; font-style: italic;')
    }, 1000)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', hideContextMenu)
  voice.stopListening()
  orchestrator.stopPeriodicAnalysis()
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
  cursor: default;
}

.canvas-grid:active {
  cursor: default;
}

/* Show grab cursor only when Alt is held */
.canvas-grid.alt-held {
  cursor: grab !important;
}

.canvas-grid.alt-held:active {
  cursor: grabbing !important;
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

/* Pinned Node Styles */
.canvas-node.pinned {
  border: 2px solid #f59e0b;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
}

.pin-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(245, 158, 11, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.pin-indicator:hover {
  background: rgba(245, 158, 11, 1);
  transform: scale(1.1);
}

.pin-indicator svg {
  width: 16px;
  height: 16px;
  color: white;
}

/* Expand/Collapse Button */
.expand-button {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  background: rgba(74, 144, 226, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}

.canvas-node:hover .expand-button {
  opacity: 1;
}

.expand-button:hover {
  background: rgba(74, 144, 226, 1);
  transform: scale(1.1);
}

.expand-button svg {
  width: 16px;
  height: 16px;
  color: white;
}

/* Workspace Mode Styles */
.canvas-node.workspace-mode {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  border: none !important;
  background: rgba(10, 10, 10, 0.98) !important;
  z-index: 9999 !important;
  overflow: hidden;
}

.workspace-content {
  width: 100%;
  height: 100%;
  padding: 60px 40px 40px 40px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.workspace-content > * {
  width: 100%;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.exit-workspace-button {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10000;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.exit-workspace-button:hover {
  background: rgba(239, 68, 68, 1);
  transform: scale(1.05);
}

.exit-workspace-button svg {
  width: 20px;
  height: 20px;
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

/* Connection Preview */
.connection-preview {
  stroke-dasharray: 5, 5;
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 0;
  min-width: 200px;
  z-index: 10000;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.context-menu-item:hover {
  background: rgba(74, 144, 226, 0.2);
  color: white;
}

.context-menu-item.danger {
  color: #ff6b6b;
}

.context-menu-item.danger:hover {
  background: rgba(255, 107, 107, 0.2);
}

.context-menu-item svg {
  width: 16px;
  height: 16px;
  opacity: 0.8;
}

.context-menu-item .shortcut {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.5;
}

.context-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* Search bar styles */
.search-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  min-width: 400px;
  transition: all 0.3s ease;
}

.search-bar.collapsed {
  padding: 8px;
  min-width: 300px;
}

.search-toggle {
  position: absolute;
  top: -30px;
  right: 10px;
  width: 30px;
  height: 30px;
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.6);
}

.search-toggle:hover {
  background: rgba(20, 20, 20, 0.95);
  color: rgba(255, 255, 255, 0.9);
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: rgba(255, 255, 255, 0.5);
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #4a90e2;
  background: rgba(255, 255, 255, 0.08);
}

.clear-search {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.clear-search:hover {
  color: white;
}

.search-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.filter-chip.active {
  background: rgba(74, 144, 226, 0.2);
  border-color: #4a90e2;
  color: #4a90e2;
}

.filter-chip svg {
  width: 14px;
  height: 14px;
}

.search-results {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

/* Context menu transition */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.2s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
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
  align-items: center;
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

.status-item svg {
  width: 16px;
  height: 16px;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.2), rgba(155, 89, 182, 0.2));
  border: 1px solid rgba(74, 144, 226, 0.3);
  border-radius: 20px;
  color: #4a90e2;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.theme-btn:hover {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.3), rgba(155, 89, 182, 0.3));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.theme-btn svg {
  width: 16px;
  height: 16px;
}

.athena-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.athena-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  border-color: rgba(139, 92, 246, 0.5);
}

.athena-btn svg {
  width: 16px;
  height: 16px;
  color: #8b5cf6;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Athena's Insights Panel */
.athena-insights {
  position: absolute;
  bottom: 80px;
  left: 20px;
  width: 320px;
  max-height: 300px;
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(74, 144, 226, 0.1));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(155, 89, 182, 0.3);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(155, 89, 182, 0.2);
}

.insights-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(155, 89, 182, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.insights-header svg {
  width: 18px;
  height: 18px;
  color: #9b59b6;
}

.insights-header span {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.insights-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
}

.insight-item {
  position: relative;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.insight-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(4px);
}

.insight-confidence {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, rgba(155, 89, 182, 0.2), transparent);
  pointer-events: none;
}

.insight-item p {
  margin: 0;
  padding-right: 30px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.insight-action {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(155, 89, 182, 0.2);
  border: 1px solid rgba(155, 89, 182, 0.3);
  border-radius: 50%;
  color: #9b59b6;
  cursor: pointer;
  transition: all 0.2s;
}

.insight-action:hover {
  background: rgba(155, 89, 182, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.insight-action svg {
  width: 12px;
  height: 12px;
}

/* Insights transition */
.insights-enter-active,
.insights-leave-active {
  transition: all 0.3s ease;
}

.insights-enter-from,
.insights-leave-to {
  opacity: 0;
  transform: translateY(20px);
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
