/**
 * Context-Aware Block Commands
 *
 * Provides different "/" commands based on current workspace type
 */

import { ref, computed, inject } from 'vue'

export type WorkspaceType = 'blocks' | 'ide' | 'whiteboard' | 'database' | 'graph3d'

export interface BlockCommand {
  id: string
  name: string
  description: string
  icon: string
  shortcut?: string
  category: string
  action: () => void
}

export const useContextualCommands = (workspaceType: WorkspaceType = 'blocks') => {
  const currentWorkspace = ref<WorkspaceType>(workspaceType)

  // Base commands available in all workspaces
  const baseCommands: BlockCommand[] = [
    {
      id: 'paragraph',
      name: 'Text',
      description: 'Add a paragraph of text',
      icon: '📝',
      category: 'basic',
      action: () => ({ type: 'paragraph', content: '' })
    },
    {
      id: 'heading1',
      name: 'Heading 1',
      description: 'Large section heading',
      icon: 'H1',
      category: 'text',
      action: () => ({ type: 'heading', level: 1, content: '' })
    },
    {
      id: 'heading2',
      name: 'Heading 2',
      description: 'Medium section heading',
      icon: 'H2',
      category: 'text',
      action: () => ({ type: 'heading', level: 2, content: '' })
    },
    {
      id: 'heading3',
      name: 'Heading 3',
      description: 'Small section heading',
      icon: 'H3',
      category: 'text',
      action: () => ({ type: 'heading', level: 3, content: '' })
    },
    {
      id: 'bulleted-list',
      name: 'Bulleted List',
      description: 'Create a bulleted list',
      icon: '•',
      category: 'text',
      action: () => ({ type: 'bulleted-list', items: [''] })
    },
    {
      id: 'numbered-list',
      name: 'Numbered List',
      description: 'Create a numbered list',
      icon: '1.',
      category: 'text',
      action: () => ({ type: 'numbered-list', items: [''] })
    }
  ]

  // IDE Workspace specific commands
  const ideCommands: BlockCommand[] = [
    {
      id: 'code-block',
      name: 'Code Block',
      description: 'Add a code snippet',
      icon: '💻',
      category: 'code',
      action: () => ({ type: 'code', language: 'javascript', content: '' })
    },
    {
      id: 'terminal',
      name: 'Terminal',
      description: 'Embed a terminal instance',
      icon: '⚡',
      category: 'code',
      action: () => ({ type: 'terminal', cwd: '/', content: '' })
    },
    {
      id: 'file-tree',
      name: 'File Tree',
      description: 'Show file explorer',
      icon: '📁',
      category: 'code',
      action: () => ({ type: 'file-tree', path: './' })
    },
    {
      id: 'git-status',
      name: 'Git Status',
      description: 'Show git repository status',
      icon: '🌿',
      category: 'code',
      action: () => ({ type: 'git-status', repo: './' })
    },
    {
      id: 'npm-scripts',
      name: 'NPM Scripts',
      description: 'Show package.json scripts',
      icon: '📦',
      category: 'code',
      action: () => ({ type: 'npm-scripts', package: './package.json' })
    },
    {
      id: 'dockerfile',
      name: 'Dockerfile',
      description: 'Create Docker configuration',
      icon: '🐳',
      category: 'code',
      action: () => ({ type: 'code', language: 'dockerfile', content: 'FROM node:18-alpine\n' })
    }
  ]

  // Whiteboard workspace specific commands
  const whiteboardCommands: BlockCommand[] = [
    {
      id: 'sticky-note',
      name: 'Sticky Note',
      description: 'Add a sticky note',
      icon: '🗒️',
      category: 'shapes',
      action: () => ({ type: 'sticky-note', color: 'yellow', content: '' })
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      description: 'Draw a rectangle',
      icon: '◻️',
      category: 'shapes',
      action: () => ({ type: 'shape', shape: 'rectangle', style: {} })
    },
    {
      id: 'circle',
      name: 'Circle',
      description: 'Draw a circle',
      icon: '⭕',
      category: 'shapes',
      action: () => ({ type: 'shape', shape: 'circle', style: {} })
    },
    {
      id: 'arrow',
      name: 'Arrow',
      description: 'Draw an arrow',
      icon: '➡️',
      category: 'shapes',
      action: () => ({ type: 'shape', shape: 'arrow', style: {} })
    },
    {
      id: 'text-box',
      name: 'Text Box',
      description: 'Add a text box',
      icon: '💬',
      category: 'shapes',
      action: () => ({ type: 'text-box', content: '', style: {} })
    },
    {
      id: 'draw-free',
      name: 'Free Draw',
      description: 'Free drawing tool',
      icon: '✏️',
      category: 'drawing',
      action: () => ({ type: 'free-draw', tool: 'pen' })
    },
    {
      id: 'draw-line',
      name: 'Line',
      description: 'Draw a straight line',
      icon: '📏',
      category: 'drawing',
      action: () => ({ type: 'shape', shape: 'line', style: {} })
    },
    {
      id: 'image-upload',
      name: 'Image',
      description: 'Upload an image',
      icon: '🖼️',
      category: 'media',
      action: () => ({ type: 'image', src: '', alt: '' })
    }
  ]

  // Database workspace specific commands
  const databaseCommands: BlockCommand[] = [
    {
      id: 'table',
      name: 'Table',
      description: 'Create a data table',
      icon: '📊',
      category: 'data',
      action: () => ({
        type: 'table',
        headers: ['Column 1', 'Column 2'],
        rows: [['', '']]
      })
    },
    {
      id: 'sql-query',
      name: 'SQL Query',
      description: 'Write a SQL query',
      icon: '💾',
      category: 'data',
      action: () => ({
        type: 'code',
        language: 'sql',
        content: 'SELECT * FROM table_name;'
      })
    },
    {
      id: 'chart',
      name: 'Chart',
      description: 'Create a data visualization',
      icon: '📈',
      category: 'data',
      action: () => ({
        type: 'chart',
        chartType: 'bar',
        data: [],
        config: {}
      })
    },
    {
      id: 'database-schema',
      name: 'Schema',
      description: 'Show database schema',
      icon: '🏗️',
      category: 'data',
      action: () => ({ type: 'database-schema', connection: '' })
    },
    {
      id: 'data-grid',
      name: 'Data Grid',
      description: 'Interactive data grid',
      icon: '🗃️',
      category: 'data',
      action: () => ({ type: 'data-grid', source: '', editable: true })
    },
    {
      id: 'csv-import',
      name: 'Import CSV',
      description: 'Import CSV data',
      icon: '📥',
      category: 'data',
      action: () => ({ type: 'csv-import', file: null })
    }
  ]

  // Graph 3D workspace specific commands
  const graph3dCommands: BlockCommand[] = [
    {
      id: 'node',
      name: 'Node',
      description: 'Add a graph node',
      icon: '🔵',
      category: 'graph',
      action: () => ({
        type: 'graph-node',
        label: '',
        position: { x: 0, y: 0, z: 0 }
      })
    },
    {
      id: 'connection',
      name: 'Connection',
      description: 'Connect two nodes',
      icon: '🔗',
      category: 'graph',
      action: () => ({
        type: 'graph-edge',
        from: '',
        to: '',
        weight: 1
      })
    },
    {
      id: 'cluster',
      name: 'Cluster',
      description: 'Group related nodes',
      icon: '🎯',
      category: 'graph',
      action: () => ({
        type: 'graph-cluster',
        nodes: [],
        label: ''
      })
    },
    {
      id: 'force-layout',
      name: 'Force Layout',
      description: 'Apply force-directed layout',
      icon: '🌀',
      category: 'layout',
      action: () => ({ type: 'layout-force', strength: 1 })
    },
    {
      id: 'hierarchical-layout',
      name: 'Tree Layout',
      description: 'Apply hierarchical layout',
      icon: '🌳',
      category: 'layout',
      action: () => ({ type: 'layout-hierarchy', direction: 'vertical' })
    },
    {
      id: 'graph-data',
      name: 'Import Graph Data',
      description: 'Import JSON or CSV graph data',
      icon: '📈',
      category: 'data',
      action: () => ({ type: 'graph-data-import', format: 'json' })
    }
  ]

  // Document workspace specific commands (enhanced text editing)
  const documentCommands: BlockCommand[] = [
    {
      id: 'quote',
      name: 'Quote',
      description: 'Add a blockquote',
      icon: '❝',
      category: 'text',
      action: () => ({ type: 'blockquote', content: '' })
    },
    {
      id: 'callout',
      name: 'Callout',
      description: 'Add an info callout box',
      icon: '💡',
      category: 'text',
      action: () => ({
        type: 'callout',
        variant: 'info',
        title: '',
        content: ''
      })
    },
    {
      id: 'toggle',
      name: 'Toggle List',
      description: 'Collapsible content section',
      icon: '▶️',
      category: 'text',
      action: () => ({
        type: 'toggle',
        title: '',
        content: '',
        expanded: false
      })
    },
    {
      id: 'divider',
      name: 'Divider',
      description: 'Add a horizontal line',
      icon: '━━━',
      category: 'layout',
      action: () => ({ type: 'divider' })
    },
    {
      id: 'embed',
      name: 'Embed',
      description: 'Embed external content',
      icon: '🔗',
      category: 'media',
      action: () => ({ type: 'embed', url: '', provider: 'generic' })
    }
  ]

  // Get commands based on current workspace
  const availableCommands = computed(() => {
    const commands = [...baseCommands]

    switch (currentWorkspace.value) {
      case 'ide':
        commands.push(...ideCommands)
        break
      case 'whiteboard':
        commands.push(...whiteboardCommands)
        break
      case 'database':
        commands.push(...databaseCommands)
        break
      case 'graph3d':
        commands.push(...graph3dCommands)
        break
      case 'blocks':
      default:
        commands.push(...documentCommands)
        break
    }

    return commands
  })

  // Group commands by category
  const commandsByCategory = computed(() => {
    const categories: Record<string, BlockCommand[]> = {}

    availableCommands.value.forEach((command) => {
      if (!categories[command.category]) {
        categories[command.category] = []
      }
      categories[command.category].push(command)
    })

    return categories
  })

  // Filter commands by search query
  const filterCommands = (query: string): BlockCommand[] => {
    if (!query) return availableCommands.value

    const lowerQuery = query.toLowerCase()
    return availableCommands.value.filter(command =>
      command.name.toLowerCase().includes(lowerQuery)
      || command.description.toLowerCase().includes(lowerQuery)
    )
  }

  // Get command by ID
  const getCommand = (id: string): BlockCommand | undefined => {
    return availableCommands.value.find(command => command.id === id)
  }

  // Set workspace type
  const setWorkspaceType = (type: WorkspaceType) => {
    currentWorkspace.value = type
  }

  return {
    currentWorkspace,
    availableCommands,
    commandsByCategory,
    filterCommands,
    getCommand,
    setWorkspaceType
  }
}
