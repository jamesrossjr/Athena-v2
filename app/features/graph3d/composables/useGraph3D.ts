// 3D Graph Data Management System
import { ref, computed, watch } from 'vue'

// Types for 3D Graph System
export interface Node3D {
  id: string
  title: string
  type: 'workspace' | 'page' | 'block' | 'file'
  content?: string
  blocks?: Block[]
  position: { x: number, y: number, z: number }
  connections: string[]
  metadata: {
    created: Date
    modified: Date
    size: number
    blockCount: number
    fileType?: string
  }
  visibility: boolean
  selected: boolean
  hovered: boolean
}

export interface Connection3D {
  id: string
  sourceId: string
  targetId: string
  type: 'reference' | 'contains' | 'related' | 'imports'
  strength: number
  bidirectional: boolean
  metadata: {
    created: Date
    context?: string
  }
}

export interface GraphAnalytics {
  totalNodes: number
  totalConnections: number
  averageConnections: number
  clustered: boolean
  centralNodes: Node3D[]
  isolatedNodes: Node3D[]
  performanceMetrics: {
    renderTime: number
    fps: number
    memoryUsage: number
  }
}

// Composable for 3D Graph Management
export function useGraph3D() {
  // Core State
  const nodes = ref<Node3D[]>([])
  const connections = ref<Connection3D[]>([])
  const selectedNodes = ref<Set<string>>(new Set())
  const analytics = ref<GraphAnalytics | null>(null)

  // Configuration
  const config = ref({
    maxNodes: 1000,
    autoLayout: true,
    animationSpeed: 1.0,
    traversalMode: 'dfs' as 'dfs' | 'bfs',
    dfsVisualization: {
      enabled: false,
      speed: 500, // ms per step
      showPath: true,
      highlightVisited: true
    },
    nodeSize: {
      min: 0.5,
      max: 3.0,
      default: 1.0
    },
    colors: {
      workspace: '#06b6d4',
      page: '#4f46e5',
      block: '#10b981',
      file: '#f59e0b',
      connection: '#6b7280',
      selected: '#fbbf24',
      hovered: '#e5e7eb',
      visited: '#9333ea',
      path: '#ef4444',
      current: '#22c55e'
    }
  })

  // Computed Properties
  const visibleNodes = computed(() =>
    nodes.value.filter(node => node.visibility)
  )

  const visibleConnections = computed(() =>
    connections.value.filter((conn) => {
      const source = nodes.value.find(n => n.id === conn.sourceId)
      const target = nodes.value.find(n => n.id === conn.targetId)
      return source?.visibility && target?.visibility
    })
  )

  const nodesByType = computed(() => {
    const grouped = new Map<string, Node3D[]>()
    nodes.value.forEach((node) => {
      if (!grouped.has(node.type)) {
        grouped.set(node.type, [])
      }
      grouped.get(node.type)!.push(node)
    })
    return grouped
  })

  const connectionStrengthMap = computed(() => {
    const strengthMap = new Map<string, number>()
    connections.value.forEach((conn) => {
      const key = `${conn.sourceId}-${conn.targetId}`
      strengthMap.set(key, conn.strength)
    })
    return strengthMap
  })

  // Core Functions
  const createNode = (data: {
    id: string
    title: string
    type: Node3D['type']
    content?: string
    blocks?: any[]
    metadata?: Partial<Node3D['metadata']>
  }): Node3D => {
    const now = new Date()
    const node: Node3D = {
      id: data.id,
      title: data.title,
      type: data.type,
      content: data.content,
      blocks: data.blocks,
      position: { x: 0, y: 0, z: 0 },
      connections: [],
      metadata: {
        created: now,
        modified: now,
        size: data.content?.length || 0,
        blockCount: data.blocks?.length || 0,
        fileType: data.metadata?.fileType,
        ...data.metadata
      },
      visibility: true,
      selected: false,
      hovered: false
    }

    nodes.value.push(node)
    return node
  }

  const createConnection = (data: {
    sourceId: string
    targetId: string
    type?: Connection3D['type']
    strength?: number
    context?: string
  }): Connection3D => {
    const connection: Connection3D = {
      id: `${data.sourceId}-${data.targetId}`,
      sourceId: data.sourceId,
      targetId: data.targetId,
      type: data.type || 'related',
      strength: data.strength || 1.0,
      bidirectional: false,
      metadata: {
        created: new Date(),
        context: data.context
      }
    }

    // Update node connections
    const sourceNode = nodes.value.find(n => n.id === data.sourceId)
    const targetNode = nodes.value.find(n => n.id === data.targetId)

    if (sourceNode && !sourceNode.connections.includes(data.targetId)) {
      sourceNode.connections.push(data.targetId)
    }

    if (targetNode && !targetNode.connections.includes(data.sourceId)) {
      targetNode.connections.push(data.sourceId)
    }

    connections.value.push(connection)
    return connection
  }

  // Workspace Integration Functions
  const loadWorkspaceData = (workspace: { id: string, name?: string, pages?: Array<{ id: string, title: string, blocks?: unknown[] }> }) => {
    console.log('Loading workspace into 3D graph:', workspace)

    // Clear existing data
    nodes.value = []
    connections.value = []

    if (!workspace.pages || !Array.isArray(workspace.pages)) {
      console.warn('No pages found in workspace')
      return
    }

    // Create workspace node
    const workspaceNode = createNode({
      id: `workspace-${workspace.id}`,
      title: workspace.name || 'Workspace',
      type: 'workspace',
      metadata: {
        blockCount: workspace.pages.length,
        size: workspace.pages.reduce((sum: number, page: any) =>
          sum + (page.blocks?.length || 0), 0)
      }
    })

    // Create page nodes
    workspace.pages.forEach((page: any) => {
      const pageNode = createNode({
        id: page.id,
        title: page.title || 'Untitled Page',
        type: 'page',
        blocks: page.blocks,
        metadata: {
          blockCount: page.blocks?.length || 0,
          size: page.blocks?.reduce((sum: number, block: any) =>
            sum + (block.content?.length || 0), 0) || 0
        }
      })

      // Connect workspace to page
      createConnection({
        sourceId: workspaceNode.id,
        targetId: pageNode.id,
        type: 'contains',
        strength: 1.0
      })

      // Create block nodes if they exist
      if (page.blocks && Array.isArray(page.blocks)) {
        page.blocks.forEach((block: any) => {
          const blockNode = createNode({
            id: `${page.id}-block-${block.id}`,
            title: `${block.type} Block`,
            type: 'block',
            content: block.content,
            metadata: {
              size: block.content?.length || 0,
              fileType: block.type
            }
          })

          // Connect page to block
          createConnection({
            sourceId: pageNode.id,
            targetId: blockNode.id,
            type: 'contains',
            strength: 0.8
          })
        })
      }
    })

    // Detect inter-page connections through content references
    detectContentReferences()

    // Calculate analytics
    updateAnalytics()

    console.log(`Created 3D graph with ${nodes.value.length} nodes and ${connections.value.length} connections`)
  }

  // Content Analysis Functions
  const detectContentReferences = () => {
    const linkPattern = /\[\[([^\]]+)\]\]/g

    nodes.value.filter(node => node.type === 'page').forEach((sourcePage) => {
      if (sourcePage.blocks) {
        sourcePage.blocks.forEach((block) => {
          if (typeof block.content === 'string') {
            let match
            while ((match = linkPattern.exec(block.content)) !== null) {
              const linkedPageTitle = match[1].trim()
              const targetPage = nodes.value.find(n =>
                n.type === 'page'
                && n.title.toLowerCase() === linkedPageTitle.toLowerCase()
              )

              if (targetPage && targetPage.id !== sourcePage.id) {
                // Check if connection already exists
                const existingConnection = connections.value.find(conn =>
                  (conn.sourceId === sourcePage.id && conn.targetId === targetPage.id)
                  || (conn.sourceId === targetPage.id && conn.targetId === sourcePage.id)
                )

                if (!existingConnection) {
                  createConnection({
                    sourceId: sourcePage.id,
                    targetId: targetPage.id,
                    type: 'reference',
                    strength: 0.6,
                    context: `Referenced in: ${block.content.substring(0, 50)}...`
                  })
                }
              }
            }
          }
        })
      }
    })
  }

  // Analytics and Insights
  const updateAnalytics = () => {
    const totalNodes = nodes.value.length
    const totalConnections = connections.value.length
    const averageConnections = totalNodes > 0 ? totalConnections / totalNodes : 0

    // Find central nodes (highest connection count)
    const centralNodes = nodes.value
      .sort((a, b) => b.connections.length - a.connections.length)
      .slice(0, Math.min(5, Math.floor(totalNodes * 0.1)))

    // Find isolated nodes (no connections)
    const isolatedNodes = nodes.value
      .filter(node => node.connections.length === 0)

    analytics.value = {
      totalNodes,
      totalConnections,
      averageConnections,
      clustered: averageConnections > 1.5,
      centralNodes,
      isolatedNodes,
      performanceMetrics: {
        renderTime: 0, // Will be updated by 3D renderer
        fps: 60,
        memoryUsage: 0
      }
    }
  }

  // Node Management
  const selectNode = (nodeId: string) => {
    nodes.value.forEach((node) => {
      node.selected = node.id === nodeId
    })

    if (nodeId) {
      selectedNodes.value.clear()
      selectedNodes.value.add(nodeId)
    }
  }

  const selectMultipleNodes = (nodeIds: string[]) => {
    selectedNodes.value.clear()
    nodeIds.forEach(id => selectedNodes.value.add(id))

    nodes.value.forEach((node) => {
      node.selected = selectedNodes.value.has(node.id)
    })
  }

  const hoverNode = (nodeId: string | null) => {
    nodes.value.forEach((node) => {
      node.hovered = node.id === nodeId
    })
  }

  const updateNodeVisibility = (filters: {
    showWorkspaces?: boolean
    showPages?: boolean
    showBlocks?: boolean
    showFiles?: boolean
  }) => {
    nodes.value.forEach((node) => {
      switch (node.type) {
        case 'workspace':
          node.visibility = filters.showWorkspaces !== false
          break
        case 'page':
          node.visibility = filters.showPages !== false
          break
        case 'block':
          node.visibility = filters.showBlocks !== false
          break
        case 'file':
          node.visibility = filters.showFiles !== false
          break
      }
    })
  }

  // DFS Traversal Functions
  const dfsTraverse = (startNodeId: string, callback?: (node: Node3D, depth: number, path: string[]) => void): Node3D[] => {
    const visited = new Set<string>()
    const result: Node3D[] = []
    const stack: { id: string, depth: number, path: string[] }[] = []
    
    // Initialize with start node
    stack.push({ id: startNodeId, depth: 0, path: [] })
    
    while (stack.length > 0) {
      const { id, depth, path } = stack.pop()!
      
      if (visited.has(id)) continue
      visited.add(id)
      
      const node = nodes.value.find(n => n.id === id)
      if (!node) continue
      
      result.push(node)
      const currentPath = [...path, id]
      
      // Execute callback if provided
      if (callback) {
        callback(node, depth, currentPath)
      }
      
      // Add unvisited connections to stack (reverse order for correct DFS)
      const unvisitedConnections = node.connections
        .filter(connId => !visited.has(connId))
        .reverse()
      
      for (const connectedId of unvisitedConnections) {
        stack.push({ 
          id: connectedId, 
          depth: depth + 1,
          path: currentPath
        })
      }
    }
    
    return result
  }

  const dfsPathTo = (startNodeId: string, targetNodeId: string): string[] | null => {
    const visited = new Set<string>()
    const stack: { id: string, path: string[] }[] = []
    
    stack.push({ id: startNodeId, path: [startNodeId] })
    
    while (stack.length > 0) {
      const { id, path } = stack.pop()!
      
      if (id === targetNodeId) {
        return path
      }
      
      if (visited.has(id)) continue
      visited.add(id)
      
      const node = nodes.value.find(n => n.id === id)
      if (!node) continue
      
      // Add unvisited connections to stack
      for (const connectedId of node.connections) {
        if (!visited.has(connectedId)) {
          stack.push({ 
            id: connectedId, 
            path: [...path, connectedId]
          })
        }
      }
    }
    
    return null // No path found
  }

  const dfsDetectCycles = (): string[][] => {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const dfsUtil = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      
      const node = nodes.value.find(n => n.id === nodeId)
      if (!node) return false
      
      for (const connectedId of node.connections) {
        if (!visited.has(connectedId)) {
          if (dfsUtil(connectedId, [...path, connectedId])) {
            return true
          }
        } else if (recursionStack.has(connectedId)) {
          // Cycle detected
          const cycleStartIndex = path.indexOf(connectedId)
          if (cycleStartIndex !== -1) {
            cycles.push(path.slice(cycleStartIndex))
          }
        }
      }
      
      recursionStack.delete(nodeId)
      return false
    }
    
    // Check each unvisited node
    for (const node of nodes.value) {
      if (!visited.has(node.id)) {
        dfsUtil(node.id, [node.id])
      }
    }
    
    return cycles
  }

  const dfsTopologicalSort = (): Node3D[] | null => {
    const visited = new Set<string>()
    const stack: Node3D[] = []
    const recursionStack = new Set<string>()
    
    const dfsUtil = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      
      const node = nodes.value.find(n => n.id === nodeId)
      if (!node) return false
      
      for (const connectedId of node.connections) {
        if (!visited.has(connectedId)) {
          if (dfsUtil(connectedId)) {
            return true // Cycle detected
          }
        } else if (recursionStack.has(connectedId)) {
          return true // Cycle detected
        }
      }
      
      recursionStack.delete(nodeId)
      stack.push(node)
      return false
    }
    
    // Visit all nodes
    for (const node of nodes.value) {
      if (!visited.has(node.id)) {
        if (dfsUtil(node.id)) {
          return null // Graph has cycles, cannot perform topological sort
        }
      }
    }
    
    return stack.reverse()
  }

  const dfsConnectedComponents = (): Node3D[][] => {
    const visited = new Set<string>()
    const components: Node3D[][] = []
    
    const dfsUtil = (nodeId: string, component: Node3D[]) => {
      visited.add(nodeId)
      
      const node = nodes.value.find(n => n.id === nodeId)
      if (!node) return
      
      component.push(node)
      
      for (const connectedId of node.connections) {
        if (!visited.has(connectedId)) {
          dfsUtil(connectedId, component)
        }
      }
    }
    
    // Find all connected components
    for (const node of nodes.value) {
      if (!visited.has(node.id)) {
        const component: Node3D[] = []
        dfsUtil(node.id, component)
        if (component.length > 0) {
          components.push(component)
        }
      }
    }
    
    return components
  }

  // Search and Filter (keeping original but enhanced)
  const searchNodes = (query: string): Node3D[] => {
    const lowercaseQuery = query.toLowerCase()
    return nodes.value.filter(node =>
      node.title.toLowerCase().includes(lowercaseQuery)
      || node.content?.toLowerCase().includes(lowercaseQuery)
      || node.blocks?.some(block =>
        block.content?.toLowerCase().includes(lowercaseQuery)
      )
    )
  }

  const getConnectedNodes = (nodeId: string, depth: number = 1, useDFS: boolean = true): Node3D[] => {
    if (useDFS) {
      // Use DFS traversal
      const result: Node3D[] = []
      dfsTraverse(nodeId, (node, currentDepth) => {
        if (currentDepth > 0 && currentDepth <= depth) {
          result.push(node)
        }
      })
      return result
    } else {
      // Original BFS-like implementation
      const visited = new Set<string>()
      const result: Node3D[] = []

      const traverse = (currentId: string, currentDepth: number) => {
        if (currentDepth > depth || visited.has(currentId)) return

        visited.add(currentId)
        const node = nodes.value.find(n => n.id === currentId)

        if (node && currentDepth > 0) {
          result.push(node)
        }

        if (currentDepth < depth) {
          node?.connections.forEach((connectedId) => {
            traverse(connectedId, currentDepth + 1)
          })
        }
      }

      traverse(nodeId, 0)
      return result
    }
  }

  // Export Functions
  const exportGraphData = () => {
    return {
      nodes: nodes.value,
      connections: connections.value,
      analytics: analytics.value,
      config: config.value,
      metadata: {
        exportDate: new Date(),
        version: '1.0.0'
      }
    }
  }

  const importGraphData = (data: any) => {
    if (data.nodes) nodes.value = data.nodes
    if (data.connections) connections.value = data.connections
    if (data.config) config.value = { ...config.value, ...data.config }

    updateAnalytics()
  }

  // Watch for changes and update analytics
  watch([nodes, connections], updateAnalytics, { deep: true })

  return {
    // State
    nodes,
    connections,
    selectedNodes,
    analytics,
    config,

    // Computed
    visibleNodes,
    visibleConnections,
    nodesByType,
    connectionStrengthMap,

    // Functions
    createNode,
    createConnection,
    loadWorkspaceData,
    detectContentReferences,
    updateAnalytics,
    selectNode,
    selectMultipleNodes,
    hoverNode,
    updateNodeVisibility,
    searchNodes,
    getConnectedNodes,
    exportGraphData,
    importGraphData,
    
    // DFS Functions
    dfsTraverse,
    dfsPathTo,
    dfsDetectCycles,
    dfsTopologicalSort,
    dfsConnectedComponents
  }
}
