// Local storage-based workspace management
export interface LocalWorkspace {
  id: string
  name: string
  pages: LocalPage[]
  createdAt: string
  updatedAt: string
}

export interface Block {
  id: string
  type: string
  content: string
  position: number
}

export interface LocalPage {
  id: string
  title: string
  blocks: Block[]
  lastModified: string
  isEditing?: boolean
  originalTitle?: string
  isIDEMode?: boolean
  files?: Record<string, { content: string, language: string }>
  activeFile?: string
  terminalHistory?: Record<string, unknown>[]
}

const WORKSPACES_KEY = 'canvas_workspaces'
const CURRENT_WORKSPACE_KEY = 'canvas_current_workspace'

export const useLocalWorkspace = () => {
  // Get all workspaces from localStorage
  const getWorkspaces = (): LocalWorkspace[] => {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(WORKSPACES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load workspaces from localStorage:', error)
      return []
    }
  }

  // Save workspaces to localStorage
  const saveWorkspaces = (workspaces: LocalWorkspace[]): void => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces))
    } catch (error) {
      console.error('Failed to save workspaces to localStorage:', error)
    }
  }

  // Create a new workspace
  const createWorkspace = (name: string): LocalWorkspace => {
    const newWorkspace: LocalWorkspace = {
      id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'Untitled Workspace',
      pages: [{
        id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Main',
        blocks: [{ id: 'initial', type: 'paragraph', content: '', position: 0 }],
        lastModified: new Date().toISOString(),
        isIDEMode: true,
        files: {
          'README.md': {
            content: `# ${name.trim() || 'Untitled Workspace'}\n\nWelcome to your workspace! Start by creating files and folders to organize your project.`,
            language: 'markdown'
          }
        },
        activeFile: 'README.md',
        terminalHistory: []
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const workspaces = getWorkspaces()
    workspaces.unshift(newWorkspace) // Add to beginning
    saveWorkspaces(workspaces)

    return newWorkspace
  }

  // Update an existing workspace
  const updateWorkspace = (workspaceId: string, updates: Partial<LocalWorkspace>): void => {
    const workspaces = getWorkspaces()
    const workspaceIndex = workspaces.findIndex(w => w.id === workspaceId)

    if (workspaceIndex !== -1) {
      workspaces[workspaceIndex] = {
        ...workspaces[workspaceIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      } as LocalWorkspace
      saveWorkspaces(workspaces)
    }
  }

  // Delete a workspace
  const deleteWorkspace = (workspaceId: string): void => {
    const workspaces = getWorkspaces()
    const filteredWorkspaces = workspaces.filter(w => w.id !== workspaceId)
    saveWorkspaces(filteredWorkspaces)

    // If this was the current workspace, clear the current workspace
    if (getCurrentWorkspaceId() === workspaceId) {
      setCurrentWorkspace(null)
    }
  }

  // Get current workspace ID
  const getCurrentWorkspaceId = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CURRENT_WORKSPACE_KEY)
  }

  // Set current workspace
  const setCurrentWorkspace = (workspaceId: string | null): void => {
    if (typeof window === 'undefined') return

    if (workspaceId) {
      localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId)
    } else {
      localStorage.removeItem(CURRENT_WORKSPACE_KEY)
    }
  }

  // Get current workspace
  const getCurrentWorkspace = (): LocalWorkspace | null => {
    const currentId = getCurrentWorkspaceId()
    if (!currentId) return null

    const workspaces = getWorkspaces()
    return workspaces.find(w => w.id === currentId) || null
  }

  // Save workspace pages
  const saveWorkspacePages = (workspaceId: string, pages: LocalPage[]): void => {
    updateWorkspace(workspaceId, { pages })
  }

  // Get workspace by ID
  const getWorkspace = (workspaceId: string): LocalWorkspace | null => {
    const workspaces = getWorkspaces()
    return workspaces.find(w => w.id === workspaceId) || null
  }

  // Rename workspace
  const renameWorkspace = (workspaceId: string, newName: string): void => {
    updateWorkspace(workspaceId, { name: newName.trim() || 'Untitled Workspace' })
  }

  return {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getCurrentWorkspaceId,
    setCurrentWorkspace,
    getCurrentWorkspace,
    saveWorkspacePages,
    getWorkspace,
    renameWorkspace
  }
}
