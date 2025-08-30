import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface CanvasNode {
  id: string
  type: 'workspace' | 'document' | 'ide' | 'todo' | 'workflow' | 'note' | 'editor'
  title: string
  position: { x: number, y: number }
  size: { width: number, height: number }
  zIndex: number
  minimized: boolean
  content?: any
  connections?: string[] // Connected node IDs
  tags?: string[] // For finding related nodes
  color?: string // Node color in graph view
  lastModified?: Date
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
  minZoom: number
  maxZoom: number
}

export function useInfiniteCanvas() {
  // Canvas state
  const nodes = ref<Map<string, CanvasNode>>(new Map())
  const selectedNodes = ref<Set<string>>(new Set())
  const viewport = ref<CanvasViewport>({
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 3
  })

  // Interaction state
  const isDragging = ref(false)
  const isPanning = ref(false)
  const dragTarget = ref<string | null>(null)
  const dragOffset = ref({ x: 0, y: 0 })
  const panStart = ref({ x: 0, y: 0 })

  // Canvas dimensions
  const canvasSize = ref({ width: 0, height: 0 })

  // Zoom levels for node transformation - Obsidian-like behavior
  const ZOOM_THRESHOLD_GRAPH = 0.3 // Below this, show as graph nodes
  const ZOOM_THRESHOLD_NODE = 0.7 // Below this, show as compact cards
  const ZOOM_THRESHOLD_DETAIL = 1.2 // Above this, show full detail

  // Computed properties
  const isGraphView = computed(() => viewport.value.zoom < ZOOM_THRESHOLD_GRAPH)
  const isNodeView = computed(() => viewport.value.zoom >= ZOOM_THRESHOLD_GRAPH && viewport.value.zoom < ZOOM_THRESHOLD_NODE)
  const isDetailView = computed(() => viewport.value.zoom > ZOOM_THRESHOLD_DETAIL)
  const isNormalView = computed(() =>
    viewport.value.zoom >= ZOOM_THRESHOLD_NODE
    && viewport.value.zoom <= ZOOM_THRESHOLD_DETAIL
  )

  const visibleNodes = computed(() => {
    const visible: CanvasNode[] = []
    const vp = viewport.value
    const padding = 100

    nodes.value.forEach((node) => {
      const screenX = (node.position.x - vp.x) * vp.zoom
      const screenY = (node.position.y - vp.y) * vp.zoom
      const screenWidth = node.size.width * vp.zoom
      const screenHeight = node.size.height * vp.zoom

      // Check if node is in viewport
      if (screenX + screenWidth >= -padding
        && screenX <= canvasSize.value.width + padding
        && screenY + screenHeight >= -padding
        && screenY <= canvasSize.value.height + padding) {
        visible.push(node)
      }
    })

    return visible.sort((a, b) => a.zIndex - b.zIndex)
  })

  // Node management
  const addNode = (node: Omit<CanvasNode, 'id' | 'zIndex'>): string => {
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const maxZ = Math.max(0, ...Array.from(nodes.value.values()).map(n => n.zIndex))

    const newNode: CanvasNode = {
      ...node,
      id,
      zIndex: maxZ + 1,
      connections: node.connections || [],
      lastModified: new Date()
    }

    nodes.value.set(id, newNode)
    
    // Auto-connect based on shared tags
    if (newNode.tags && newNode.tags.length > 0) {
      autoConnectByTags(id)
    }
    
    return id
  }

  const removeNode = (id: string) => {
    // Remove connections to this node from other nodes
    nodes.value.forEach((node) => {
      if (node.connections) {
        node.connections = node.connections.filter(connId => connId !== id)
      }
    })
    
    nodes.value.delete(id)
    selectedNodes.value.delete(id)
  }

  const updateNode = (id: string, updates: Partial<CanvasNode>) => {
    const node = nodes.value.get(id)
    if (node) {
      nodes.value.set(id, { 
        ...node, 
        ...updates,
        lastModified: new Date()
      })
    }
  }

  const bringToFront = (id: string) => {
    const node = nodes.value.get(id)
    if (node) {
      const maxZ = Math.max(...Array.from(nodes.value.values()).map(n => n.zIndex))
      updateNode(id, { zIndex: maxZ + 1 })
    }
  }

  // Connection management
  const connectNodes = (fromId: string, toId: string) => {
    const fromNode = nodes.value.get(fromId)
    const toNode = nodes.value.get(toId)
    
    if (fromNode && toNode) {
      // Add bidirectional connection
      if (!fromNode.connections) fromNode.connections = []
      if (!toNode.connections) toNode.connections = []
      
      if (!fromNode.connections.includes(toId)) {
        fromNode.connections.push(toId)
      }
      if (!toNode.connections.includes(fromId)) {
        toNode.connections.push(fromId)
      }
      
      nodes.value.set(fromId, { ...fromNode })
      nodes.value.set(toId, { ...toNode })
    }
  }

  const disconnectNodes = (fromId: string, toId: string) => {
    const fromNode = nodes.value.get(fromId)
    const toNode = nodes.value.get(toId)
    
    if (fromNode && fromNode.connections) {
      fromNode.connections = fromNode.connections.filter(id => id !== toId)
      nodes.value.set(fromId, { ...fromNode })
    }
    
    if (toNode && toNode.connections) {
      toNode.connections = toNode.connections.filter(id => id !== fromId)
      nodes.value.set(toId, { ...toNode })
    }
  }

  const autoConnectByTags = (nodeId: string) => {
    const node = nodes.value.get(nodeId)
    if (!node || !node.tags) return
    
    nodes.value.forEach((otherNode) => {
      if (otherNode.id !== nodeId && otherNode.tags) {
        // Check for shared tags
        const sharedTags = node.tags!.filter(tag => otherNode.tags!.includes(tag))
        if (sharedTags.length > 0) {
          connectNodes(nodeId, otherNode.id)
        }
      }
    })
  }

  const autoConnectByContent = (nodeId: string) => {
    const node = nodes.value.get(nodeId)
    if (!node) return
    
    const nodeText = JSON.stringify(node.content).toLowerCase()
    
    nodes.value.forEach((otherNode) => {
      if (otherNode.id !== nodeId) {
        const otherText = JSON.stringify(otherNode.content).toLowerCase()
        
        // Simple content similarity check
        const words = nodeText.split(/\W+/)
        const otherWords = otherText.split(/\W+/)
        const commonWords = words.filter(word => 
          word.length > 3 && otherWords.includes(word)
        )
        
        // Connect if significant overlap
        if (commonWords.length > 5) {
          connectNodes(nodeId, otherNode.id)
        }
      }
    })
  }

  // Graph layout - force-directed layout for graph view
  const applyForceLayout = () => {
    if (!isGraphView.value) return
    
    const nodeArray = Array.from(nodes.value.values())
    const iterations = 50
    const k = 100 // Optimal distance between nodes
    const c = 0.1 // Speed
    
    for (let iter = 0; iter < iterations; iter++) {
      // Apply repulsive forces between all nodes
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const node1 = nodeArray[i]
          const node2 = nodeArray[j]
          
          const dx = node2.position.x - node1.position.x
          const dy = node2.position.y - node1.position.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          
          const force = (k * k) / dist
          const fx = (dx / dist) * force * c
          const fy = (dy / dist) * force * c
          
          node1.position.x -= fx
          node1.position.y -= fy
          node2.position.x += fx
          node2.position.y += fy
        }
      }
      
      // Apply attractive forces for connected nodes
      nodeArray.forEach(node => {
        if (node.connections) {
          node.connections.forEach(targetId => {
            const target = nodes.value.get(targetId)
            if (target) {
              const dx = target.position.x - node.position.x
              const dy = target.position.y - node.position.y
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              
              const force = (dist * dist) / k
              const fx = (dx / dist) * force * c * 0.5
              const fy = (dy / dist) * force * c * 0.5
              
              node.position.x += fx
              node.position.y += fy
            }
          })
        }
      })
    }
    
    // Update all node positions
    nodeArray.forEach(node => {
      nodes.value.set(node.id, { ...node })
    })
  }

  // Viewport manipulation
  const pan = (dx: number, dy: number) => {
    viewport.value.x += dx / viewport.value.zoom
    viewport.value.y += dy / viewport.value.zoom
  }

  const zoom = (factor: number, centerX: number, centerY: number) => {
    const oldZoom = viewport.value.zoom
    const newZoom = Math.max(
      viewport.value.minZoom,
      Math.min(viewport.value.maxZoom, oldZoom * factor)
    )

    if (newZoom !== oldZoom) {
      // Adjust viewport to zoom around center point
      const worldX = centerX / oldZoom + viewport.value.x
      const worldY = centerY / oldZoom + viewport.value.y

      viewport.value.zoom = newZoom
      viewport.value.x = worldX - centerX / newZoom
      viewport.value.y = worldY - centerY / newZoom
    }
  }

  const centerOnNode = (id: string) => {
    const node = nodes.value.get(id)
    if (node) {
      viewport.value.x = node.position.x + node.size.width / 2 - canvasSize.value.width / 2 / viewport.value.zoom
      viewport.value.y = node.position.y + node.size.height / 2 - canvasSize.value.height / 2 / viewport.value.zoom
    }
  }

  const fitToScreen = () => {
    if (nodes.value.size === 0) return

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    nodes.value.forEach((node) => {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + node.size.width)
      maxY = Math.max(maxY, node.position.y + node.size.height)
    })

    const width = maxX - minX
    const height = maxY - minY
    const padding = 50

    const scaleX = (canvasSize.value.width - padding * 2) / width
    const scaleY = (canvasSize.value.height - padding * 2) / height
    const scale = Math.min(scaleX, scaleY, viewport.value.maxZoom)

    viewport.value.zoom = scale
    viewport.value.x = minX - padding / scale
    viewport.value.y = minY - padding / scale
  }

  // Mouse event handlers
  const handleMouseDown = (event: MouseEvent, nodeId?: string) => {
    if (nodeId) {
      // Start dragging node
      const node = nodes.value.get(nodeId)
      if (node) {
        isDragging.value = true
        dragTarget.value = nodeId
        
        // Calculate offset in world coordinates
        const worldPos = screenToWorld(event.clientX, event.clientY)
        dragOffset.value = {
          x: worldPos.x - node.position.x,
          y: worldPos.y - node.position.y
        }

        // Select node
        if (!event.shiftKey) {
          selectedNodes.value.clear()
        }
        selectedNodes.value.add(nodeId)
        bringToFront(nodeId)
      }
    } else {
      // Start panning canvas
      isPanning.value = true
      panStart.value = { x: event.clientX, y: event.clientY }

      // Clear selection if not shift-clicking
      if (!event.shiftKey) {
        selectedNodes.value.clear()
      }
    }
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging.value && dragTarget.value) {
      // Move node to new position in world coordinates
      const worldPos = screenToWorld(event.clientX, event.clientY)
      
      updateNode(dragTarget.value, {
        position: { 
          x: worldPos.x - dragOffset.value.x,
          y: worldPos.y - dragOffset.value.y
        }
      })
    } else if (isPanning.value) {
      const dx = event.clientX - panStart.value.x
      const dy = event.clientY - panStart.value.y
      pan(dx, dy)
      panStart.value = { x: event.clientX, y: event.clientY }
    }
  }

  const handleMouseUp = () => {
    isDragging.value = false
    isPanning.value = false
    dragTarget.value = null
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    // Always zoom with mouse wheel (no modifier key needed)
    const factor = event.deltaY < 0 ? 1.1 : 0.9
    zoom(factor, event.clientX, event.clientY)
    
    // Use Shift + scroll for panning if needed
    if (event.shiftKey) {
      // Pan with shift + scroll
      pan(-event.deltaX, -event.deltaY)
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = (event: KeyboardEvent) => {
    // Delete selected nodes
    if (event.key === 'Delete' || event.key === 'Backspace') {
      selectedNodes.value.forEach(id => removeNode(id))
      selectedNodes.value.clear()
    }

    // Select all
    if (event.ctrlKey && event.key === 'a') {
      event.preventDefault()
      nodes.value.forEach(node => selectedNodes.value.add(node.id))
    }

    // Zoom shortcuts
    if (event.ctrlKey) {
      if (event.key === '0') {
        event.preventDefault()
        viewport.value.zoom = 1
      } else if (event.key === '=' || event.key === '+') {
        event.preventDefault()
        zoom(1.2, canvasSize.value.width / 2, canvasSize.value.height / 2)
      } else if (event.key === '-') {
        event.preventDefault()
        zoom(0.8, canvasSize.value.width / 2, canvasSize.value.height / 2)
      }
    }
  }

  // Transform coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: screenX / viewport.value.zoom + viewport.value.x,
      y: screenY / viewport.value.zoom + viewport.value.y
    }
  }

  const worldToScreen = (worldX: number, worldY: number) => {
    return {
      x: (worldX - viewport.value.x) * viewport.value.zoom,
      y: (worldY - viewport.value.y) * viewport.value.zoom
    }
  }

  // Canvas resize handler
  const updateCanvasSize = () => {
    canvasSize.value = {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }

  // Lifecycle
  onMounted(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateCanvasSize)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    // State
    nodes,
    selectedNodes,
    viewport,
    canvasSize,

    // Computed
    isGraphView,
    isNodeView,
    isDetailView,
    isNormalView,
    visibleNodes,

    // Actions
    addNode,
    removeNode,
    updateNode,
    bringToFront,
    connectNodes,
    disconnectNodes,
    autoConnectByTags,
    autoConnectByContent,
    applyForceLayout,
    pan,
    zoom,
    centerOnNode,
    fitToScreen,

    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,

    // Utilities
    screenToWorld,
    worldToScreen
  }
}
