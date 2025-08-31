/**
 * Window Manager Composable
 * Handles all window operations including minimize, maximize, snap, and dock interactions
 */

import { ref, computed, reactive } from 'vue'
import type { Ref } from 'vue'

export interface Window {
  id: string
  type: string
  title: string
  icon: string
  component?: any
  position: { x: number, y: number }
  size: { width: number, height: number }
  gridPosition?: { col: number, row: number, width: number, height: number }
  lockedTo?: string[]
  state: 'normal' | 'minimized' | 'maximized' | 'snapped-left' | 'snapped-right' | 'snapped-top' | 'snapped-bottom'
  zIndex: number
  isActive: boolean
  isDragging: boolean
  isResizing: boolean
  minimizedPosition?: { x: number, y: number }
  previousState?: {
    position: { x: number, y: number }
    size: { width: number, height: number }
    state: string
  }
}

export interface SnapZone {
  id: string
  bounds: { x: number, y: number, width: number, height: number }
  type: 'left' | 'right' | 'top' | 'bottom' | 'center'
}

const windows = ref<Map<string, Window>>(new Map())
const activeWindowId = ref<string | null>(null)
const snapZones = ref<SnapZone[]>([])
const highestZIndex = ref(1000)
const minimizedWindows = ref<Set<string>>(new Set())
const snapPreview = ref<SnapZone | null>(null)

// Grid settings
const gridSettings = ref({
  enableGrid: false,
  gridColumns: 6,
  gridRows: 4,
  defaultWidth: 2,
  defaultHeight: 2,
  gridGap: 8,
  showGridLines: false,
  autoLock: true
})

export const useWindowManager = () => {
  // Get all windows
  const allWindows = computed(() => Array.from(windows.value.values()))

  // Get active window
  const activeWindow = computed(() =>
    activeWindowId.value ? windows.value.get(activeWindowId.value) : null
  )

  // Get minimized windows for dock
  const dockWindows = computed(() =>
    allWindows.value.filter(w => minimizedWindows.value.has(w.id))
  )

  // Create a new window
  const createWindow = (options: Partial<Window>): string => {
    const id = options.id || `window-${Date.now()}`
    const window: Window = {
      id,
      type: options.type || 'default',
      title: options.title || 'Untitled',
      icon: options.icon || 'heroicons:window',
      component: options.component,
      position: options.position || { x: 100, y: 100 },
      size: options.size || { width: 600, height: 400 },
      state: 'normal',
      zIndex: highestZIndex.value++,
      isActive: true,
      isDragging: false,
      isResizing: false
    }

    // Deactivate other windows
    windows.value.forEach(w => w.isActive = false)

    windows.value.set(id, window)
    activeWindowId.value = id

    // Animate window creation
    animateWindowCreation(id)

    return id
  }

  // Close a window
  const closeWindow = (id: string) => {
    const window = windows.value.get(id)
    if (!window) return

    // Animate window closing
    animateWindowClose(id).then(() => {
      windows.value.delete(id)
      minimizedWindows.value.delete(id)

      // Activate next window if this was active
      if (activeWindowId.value === id) {
        const remaining = allWindows.value
        if (remaining.length > 0) {
          activateWindow(remaining[remaining.length - 1].id)
        } else {
          activeWindowId.value = null
        }
      }
    })
  }

  // Minimize window to dock
  const minimizeWindow = (id: string) => {
    const window = windows.value.get(id)
    if (!window) return

    // Save current state
    window.previousState = {
      position: { ...window.position },
      size: { ...window.size },
      state: window.state
    }

    window.state = 'minimized'
    minimizedWindows.value.add(id)

    // Animate to dock
    animateMinimize(id)

    // Activate next window
    const visibleWindows = allWindows.value.filter(w => w.state !== 'minimized')
    if (visibleWindows.length > 0) {
      activateWindow(visibleWindows[visibleWindows.length - 1].id)
    } else {
      activeWindowId.value = null
    }
  }

  // Restore window from dock
  const restoreWindow = (id: string) => {
    const window = windows.value.get(id)
    if (!window) return

    // Restore previous state
    if (window.previousState) {
      window.position = { ...window.previousState.position }
      window.size = { ...window.previousState.size }
      window.state = window.previousState.state as any
    } else {
      window.state = 'normal'
    }

    minimizedWindows.value.delete(id)
    window.zIndex = highestZIndex.value++

    // Animate restore
    animateRestore(id)

    // Activate restored window
    activateWindow(id)
  }

  // Maximize window
  const maximizeWindow = (id: string) => {
    const window = windows.value.get(id)
    if (!window) return

    if (window.state === 'maximized') {
      // Restore to normal
      if (window.previousState) {
        window.position = { ...window.previousState.position }
        window.size = { ...window.previousState.size }
        window.state = 'normal'
      }
    } else {
      // Save current state and maximize
      window.previousState = {
        position: { ...window.position },
        size: { ...window.size },
        state: window.state
      }

      window.position = { x: 0, y: 0 }
      window.size = {
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080
      }
      window.state = 'maximized'
    }

    animateMaximize(id)
  }

  // Snap window to edge
  const snapWindow = (id: string, zone: 'left' | 'right' | 'top' | 'bottom' | 'center') => {
    const window = windows.value.get(id)
    if (!window) return

    // Save current state if not already saved
    if (window.state === 'normal' && !window.previousState) {
      window.previousState = {
        position: { ...window.position },
        size: { ...window.size },
        state: window.state
      }
    }

    const screenWidth = window.innerWidth || 1920
    const screenHeight = window.innerHeight || 1080

    switch (zone) {
      case 'left':
        window.position = { x: 0, y: 0 }
        window.size = { width: screenWidth / 2, height: screenHeight }
        window.state = 'snapped-left'
        break
      case 'right':
        window.position = { x: screenWidth / 2, y: 0 }
        window.size = { width: screenWidth / 2, height: screenHeight }
        window.state = 'snapped-right'
        break
      case 'top':
        window.position = { x: 0, y: 0 }
        window.size = { width: screenWidth, height: screenHeight / 2 }
        window.state = 'snapped-top'
        break
      case 'bottom':
        window.position = { x: 0, y: screenHeight / 2 }
        window.size = { width: screenWidth, height: screenHeight / 2 }
        window.state = 'snapped-bottom'
        break
      case 'center':
        window.position = {
          x: (screenWidth - window.size.width) / 2,
          y: (screenHeight - window.size.height) / 2
        }
        window.state = 'normal'
        break
    }

    animateSnap(id)
  }

  // Activate window (bring to front)
  const activateWindow = (id: string) => {
    windows.value.forEach(w => w.isActive = false)

    const window = windows.value.get(id)
    if (window) {
      window.isActive = true
      window.zIndex = highestZIndex.value++
      activeWindowId.value = id
    }
  }

  // Update window position
  const updateWindowPosition = (id: string, position: { x: number, y: number }) => {
    const window = windows.value.get(id)
    if (window) {
      window.position = position
      checkSnapZones(id, position)
    }
  }

  // Update window size
  const updateWindowSize = (id: string, size: { width: number, height: number }) => {
    const window = windows.value.get(id)
    if (window) {
      window.size = size
    }
  }

  // Check for snap zones while dragging
  const checkSnapZones = (id: string, position: { x: number, y: number }) => {
    const screenWidth = window.innerWidth || 1920
    const screenHeight = window.innerHeight || 1080
    const threshold = 50

    // Clear previous preview
    snapPreview.value = null

    // Check edges
    if (position.x < threshold) {
      snapPreview.value = {
        id: 'left',
        bounds: { x: 0, y: 0, width: screenWidth / 2, height: screenHeight },
        type: 'left'
      }
    } else if (position.x > screenWidth - threshold) {
      snapPreview.value = {
        id: 'right',
        bounds: { x: screenWidth / 2, y: 0, width: screenWidth / 2, height: screenHeight },
        type: 'right'
      }
    } else if (position.y < threshold) {
      snapPreview.value = {
        id: 'top',
        bounds: { x: 0, y: 0, width: screenWidth, height: screenHeight / 2 },
        type: 'top'
      }
    } else if (position.y > screenHeight - threshold) {
      snapPreview.value = {
        id: 'bottom',
        bounds: { x: 0, y: screenHeight / 2, width: screenWidth, height: screenHeight / 2 },
        type: 'bottom'
      }
    }
  }

  // Apply snap on mouse release
  const applySnap = (id: string) => {
    if (snapPreview.value) {
      snapWindow(id, snapPreview.value.type)
      snapPreview.value = null
    }
  }

  // Animation functions
  const animateWindowCreation = (id: string) => {
    // Add animation class to element
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          element.classList.add('window-animate-in')
          setTimeout(() => element.classList.remove('window-animate-in'), 300)
        }
      }, 10)
    }
  }

  const animateWindowClose = async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof document !== 'undefined') {
        const element = document.getElementById(id)
        if (element) {
          element.classList.add('window-animate-out')
          setTimeout(() => resolve(), 300)
        } else {
          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  const animateMinimize = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id)
      if (element) {
        element.classList.add('window-minimize')
        setTimeout(() => {
          element.style.display = 'none'
        }, 300)
      }
    }
  }

  const animateRestore = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id)
      if (element) {
        element.style.display = 'block'
        element.classList.add('window-restore')
        setTimeout(() => element.classList.remove('window-restore'), 300)
      }
    }
  }

  const animateMaximize = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id)
      if (element) {
        element.classList.add('window-maximize')
        setTimeout(() => element.classList.remove('window-maximize'), 300)
      }
    }
  }

  const animateSnap = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id)
      if (element) {
        element.classList.add('window-snap')
        setTimeout(() => element.classList.remove('window-snap'), 300)
      }
    }
  }

  // Grid-related methods
  const setGridSettings = (settings: any) => {
    gridSettings.value = { ...gridSettings.value, ...settings }
    if (settings.enableGrid) {
      applyGridToAllWindows()
    }
  }

  const snapToGrid = (id: string) => {
    if (!gridSettings.value.enableGrid) return
    
    const window = windows.value.get(id)
    if (!window) return

    const screenWidth = window.innerWidth || 1920
    const screenHeight = window.innerHeight || 1080
    const cellWidth = screenWidth / gridSettings.value.gridColumns
    const cellHeight = screenHeight / gridSettings.value.gridRows

    // Calculate grid position
    const col = Math.round(window.position.x / cellWidth)
    const row = Math.round(window.position.y / cellHeight)
    
    // Snap to grid
    window.position.x = col * cellWidth + gridSettings.value.gridGap / 2
    window.position.y = row * cellHeight + gridSettings.value.gridGap / 2
    
    // Adjust size to grid
    const widthInCells = Math.round(window.size.width / cellWidth)
    const heightInCells = Math.round(window.size.height / cellHeight)
    
    window.size.width = widthInCells * cellWidth - gridSettings.value.gridGap
    window.size.height = heightInCells * cellHeight - gridSettings.value.gridGap
    
    // Save grid position
    window.gridPosition = {
      col,
      row,
      width: widthInCells,
      height: heightInCells
    }

    // Auto-lock to adjacent windows
    if (gridSettings.value.autoLock) {
      lockToAdjacentWindows(id)
    }
  }

  const lockToAdjacentWindows = (id: string) => {
    const window = windows.value.get(id)
    if (!window || !window.gridPosition) return

    const adjacent: string[] = []
    
    allWindows.value.forEach(w => {
      if (w.id === id || !w.gridPosition) return
      
      // Check if windows are adjacent
      const isAdjacent = 
        (Math.abs(w.gridPosition.col - window.gridPosition.col) === w.gridPosition.width ||
         Math.abs(w.gridPosition.col - window.gridPosition.col) === window.gridPosition.width) &&
        w.gridPosition.row === window.gridPosition.row ||
        (Math.abs(w.gridPosition.row - window.gridPosition.row) === w.gridPosition.height ||
         Math.abs(w.gridPosition.row - window.gridPosition.row) === window.gridPosition.height) &&
        w.gridPosition.col === window.gridPosition.col
      
      if (isAdjacent) {
        adjacent.push(w.id)
      }
    })
    
    window.lockedTo = adjacent
  }

  const applyGridToAllWindows = () => {
    allWindows.value.forEach(w => {
      if (w.state !== 'minimized') {
        snapToGrid(w.id)
      }
    })
  }

  const closeAllWindows = () => {
    windows.value.clear()
    minimizedWindows.value.clear()
    activeWindowId.value = null
  }

  return {
    // State
    windows,
    allWindows,
    activeWindow,
    activeWindowId,
    dockWindows,
    minimizedWindows,
    snapPreview,

    // Methods
    createWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    maximizeWindow,
    snapWindow,
    activateWindow,
    updateWindowPosition,
    updateWindowSize,
    checkSnapZones,
    applySnap,
    
    // Grid methods
    setGridSettings,
    snapToGrid,
    lockToAdjacentWindows,
    applyGridToAllWindows,
    closeAllWindows,
    gridSettings
  }
}
