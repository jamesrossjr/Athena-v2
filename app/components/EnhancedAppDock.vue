<template>
  <div class="enhanced-dock-wrapper">
    <!-- Snap Preview Overlay -->
    <Transition name="snap-preview">
      <div
        v-if="windowManager.snapPreview.value"
        class="snap-preview"
        :style="snapPreviewStyle"
      />
    </Transition>

    <!-- Windows Container -->
    <div class="windows-container">
      <div
        v-for="window in windowManager.allWindows.value"
        :id="window.id"
        :key="window.id"
        class="app-window"
        :class="{
          active: window.isActive,
          minimized: window.state === 'minimized',
          maximized: window.state === 'maximized',
          snapped: window.state.includes('snapped'),
          dragging: window.isDragging,
          resizing: window.isResizing
        }"
        :style="getWindowStyle(window)"
        @mousedown="windowManager.activateWindow(window.id)"
      >
        <!-- Window Header -->
        <div
          class="window-header"
          @mousedown="startDrag(window, $event)"
          @dblclick="windowManager.maximizeWindow(window.id)"
        >
          <div class="window-title">
            <Icon
              :name="window.icon"
              class="window-icon"
            />
            <span>{{ window.title }}</span>
          </div>

          <div class="window-controls">
            <button
              class="control-btn minimize"
              title="Minimize (Alt+M)"
              @click.stop="windowManager.minimizeWindow(window.id)"
            >
              <svg viewBox="0 0 10 10">
                <path
                  d="M 2 5 L 8 5"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </button>

            <button
              class="control-btn maximize"
              title="Maximize (Alt+X)"
              @click.stop="windowManager.maximizeWindow(window.id)"
            >
              <svg viewBox="0 0 10 10">
                <rect
                  x="2"
                  y="2"
                  width="6"
                  height="6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </button>

            <button
              class="control-btn close"
              title="Close (Alt+F4)"
              @click.stop="windowManager.closeWindow(window.id)"
            >
              <svg viewBox="0 0 10 10">
                <path
                  d="M 2 2 L 8 8 M 8 2 L 2 8"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Window Content -->
        <div class="window-content">
          <component
            :is="window.component"
            v-if="window.component"
            :window-id="window.id"
          />
          <div
            v-else
            class="window-placeholder"
          >
            <Icon
              :name="window.icon"
              class="placeholder-icon"
            />
            <p>{{ window.title }}</p>
          </div>
        </div>

        <!-- Resize Handles -->
        <div class="resize-handles">
          <div
            class="resize-handle top"
            @mousedown="startResize(window, 'top', $event)"
          />
          <div
            class="resize-handle right"
            @mousedown="startResize(window, 'right', $event)"
          />
          <div
            class="resize-handle bottom"
            @mousedown="startResize(window, 'bottom', $event)"
          />
          <div
            class="resize-handle left"
            @mousedown="startResize(window, 'left', $event)"
          />
          <div
            class="resize-handle top-left"
            @mousedown="startResize(window, 'top-left', $event)"
          />
          <div
            class="resize-handle top-right"
            @mousedown="startResize(window, 'top-right', $event)"
          />
          <div
            class="resize-handle bottom-left"
            @mousedown="startResize(window, 'bottom-left', $event)"
          />
          <div
            class="resize-handle bottom-right"
            @mousedown="startResize(window, 'bottom-right', $event)"
          />
        </div>
      </div>
    </div>

    <!-- App Dock -->
    <div
      class="enhanced-dock"
      :class="{
        'visible': dockVisible || isHovered || hasMinimizedWindows,
        'auto-hide': autoHide
      }"
      @mouseenter="handleDockHover"
      @mouseleave="handleDockLeave"
    >
      <div class="dock-container">
        <!-- Pinned Apps -->
        <div
          v-for="app in pinnedApps"
          :key="app.id"
          class="dock-item"
          :class="{ running: isAppRunning(app.type) }"
          @click="launchApp(app)"
          @contextmenu.prevent="showContextMenu(app, $event)"
          @mouseenter="handleAppHover(app)"
          @mouseleave="handleAppLeave"
        >
          <div class="dock-icon">
            <Icon :name="app.icon" />
          </div>

          <!-- Tooltip -->
          <Transition name="tooltip">
            <div
              v-if="hoveredApp === app"
              class="dock-tooltip"
            >
              {{ app.name }}
              <span
                v-if="app.shortcut"
                class="shortcut"
              >{{ app.shortcut }}</span>
            </div>
          </Transition>

          <!-- Running indicator -->
          <div
            v-if="isAppRunning(app.type)"
            class="running-dot"
          />

          <!-- Instance dots for multiple windows -->
          <div
            v-if="getAppInstances(app.type) > 1"
            class="instance-dots"
          >
            <span
              v-for="i in Math.min(getAppInstances(app.type), 3)"
              :key="i"
              class="dot"
            />
          </div>
        </div>

        <!-- Separator -->
        <div
          v-if="pinnedApps.length > 0 && windowManager.dockWindows.value.length > 0"
          class="dock-separator"
        />

        <!-- Minimized Windows -->
        <div
          v-for="window in windowManager.dockWindows.value"
          :key="window.id"
          class="dock-item minimized"
          @click="windowManager.restoreWindow(window.id)"
          @contextmenu.prevent="showWindowContextMenu(window, $event)"
          @mouseenter="handleWindowHover(window)"
          @mouseleave="handleWindowLeave"
        >
          <div class="dock-icon bounce">
            <Icon :name="window.icon" />
          </div>

          <!-- Tooltip -->
          <Transition name="tooltip">
            <div
              v-if="hoveredWindow === window"
              class="dock-tooltip"
            >
              {{ window.title }}
              <span class="status">Minimized</span>
            </div>
          </Transition>
        </div>

        <!-- App Drawer -->
        <div class="dock-separator" />
        <div
          class="dock-item app-drawer"
          @click="openCommandCenter"
          @mouseenter="hoveredApp = { name: 'App Drawer', shortcut: 'Ctrl+K' }"
          @mouseleave="hoveredApp = null"
        >
          <div class="dock-icon">
            <Icon name="heroicons:squares-2x2" />
          </div>

          <!-- Tooltip -->
          <Transition name="tooltip">
            <div
              v-if="hoveredApp?.name === 'App Drawer'"
              class="dock-tooltip"
            >
              App Drawer
              <span class="shortcut">Ctrl+K</span>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <Transition name="context-menu">
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <div
          v-if="contextMenu.type === 'app'"
          class="menu-content"
        >
          <div
            class="menu-item"
            @click="launchApp(contextMenu.target)"
          >
            <Icon name="heroicons:play" />
            <span>Open</span>
          </div>
          <div
            class="menu-item"
            @click="launchNewInstance(contextMenu.target)"
          >
            <Icon name="heroicons:document-plus" />
            <span>New Window</span>
          </div>
          <div class="menu-separator" />
          <div
            class="menu-item"
            @click="pinApp(contextMenu.target)"
          >
            <Icon name="heroicons:bookmark" />
            <span>{{ isPinned(contextMenu.target) ? 'Unpin from Dock' : 'Pin to Dock' }}</span>
          </div>
        </div>

        <div
          v-else-if="contextMenu.type === 'window'"
          class="menu-content"
        >
          <div
            class="menu-item"
            @click="windowManager.restoreWindow(contextMenu.target.id)"
          >
            <Icon name="heroicons:arrow-up" />
            <span>Restore</span>
          </div>
          <div
            class="menu-item"
            @click="windowManager.maximizeWindow(contextMenu.target.id)"
          >
            <Icon name="heroicons:arrows-pointing-out" />
            <span>Maximize</span>
          </div>
          <div class="menu-separator" />
          <div
            class="menu-item"
            @click="windowManager.closeWindow(contextMenu.target.id)"
          >
            <Icon name="heroicons:x-mark" />
            <span>Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWindowManager } from '@/composables/useWindowManager'
import SettingsWindow from './windows/SettingsWindow.vue'

const windowManager = useWindowManager()
const emit = defineEmits(['open-command-center'])

// Dock state
const dockVisible = ref(false)
const autoHide = ref(true)
const isHovered = ref(false)
const hoveredApp = ref<any>(null)
const hoveredWindow = ref<any>(null)
const hoverTimeout = ref<NodeJS.Timeout | null>(null)
const dockVisibilityTimeout = ref<NodeJS.Timeout | null>(null)

// Context menu
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: '',
  target: null as any
})

// Pinned apps
const pinnedApps = ref([
  { id: 'terminal', name: 'Terminal', type: 'terminal', icon: 'heroicons:command-line', shortcut: 'Ctrl+T' },
  { id: 'explorer', name: 'File Explorer', type: 'explorer', icon: 'heroicons:folder-open', shortcut: 'Ctrl+E' },
  { id: 'editor', name: 'Code Editor', type: 'editor', icon: 'heroicons:code-bracket', shortcut: 'Ctrl+N' },
  { id: 'browser', name: 'Browser', type: 'browser', icon: 'heroicons:globe-alt', shortcut: 'Ctrl+B' },
  { id: 'settings', name: 'Settings', type: 'settings', icon: 'heroicons:cog-6-tooth', shortcut: 'Ctrl+,' }
])

// Drag state
const dragState = ref({
  isDragging: false,
  window: null as any,
  startX: 0,
  startY: 0,
  startWindowX: 0,
  startWindowY: 0
})

// Resize state
const resizeState = ref({
  isResizing: false,
  window: null as any,
  handle: '',
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startLeft: 0,
  startTop: 0
})

// Computed
const hasMinimizedWindows = computed(() => windowManager.dockWindows.value.length > 0)

const snapPreviewStyle = computed(() => {
  const preview = windowManager.snapPreview.value
  if (!preview) return {}

  return {
    left: `${preview.bounds.x}px`,
    top: `${preview.bounds.y}px`,
    width: `${preview.bounds.width}px`,
    height: `${preview.bounds.height}px`
  }
})

// Methods
const handleAppHover = (app: any) => {
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  hoveredApp.value = app
}

const handleAppLeave = () => {
  hoverTimeout.value = setTimeout(() => {
    hoveredApp.value = null
  }, 50)
}

const handleWindowHover = (window: any) => {
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  hoveredWindow.value = window
}

const handleWindowLeave = () => {
  hoverTimeout.value = setTimeout(() => {
    hoveredWindow.value = null
  }, 50)
}

const handleDockHover = () => {
  isHovered.value = true
}

const handleDockLeave = () => {
  isHovered.value = false
}

const getWindowStyle = (window: any) => {
  if (window.state === 'minimized') {
    return { display: 'none' }
  }

  return {
    left: `${window.position.x}px`,
    top: `${window.position.y}px`,
    width: `${window.size.width}px`,
    height: `${window.size.height}px`,
    zIndex: window.zIndex
  }
}

const isAppRunning = (type: string) => {
  return windowManager.allWindows.value.some(w => w.type === type && w.state !== 'minimized')
}

const getAppInstances = (type: string) => {
  return windowManager.allWindows.value.filter(w => w.type === type).length
}

const isPinned = (app: any) => {
  return pinnedApps.value.some(p => p.type === app.type)
}

const launchApp = (app: any) => {
  // Check if app is already running
  const existingWindow = windowManager.allWindows.value.find(w => w.type === app.type)

  if (existingWindow) {
    if (existingWindow.state === 'minimized') {
      windowManager.restoreWindow(existingWindow.id)
    } else {
      windowManager.activateWindow(existingWindow.id)
    }
  } else {
    // Create new window with component mapping
    const windowConfig: any = {
      type: app.type,
      title: app.name,
      icon: app.icon,
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200
      }
    }

    // Add component based on app type
    if (app.type === 'settings') {
      windowConfig.component = SettingsWindow
      windowConfig.size = { width: 900, height: 600 }
    }

    windowManager.createWindow(windowConfig)
  }
}

const launchNewInstance = (app: any) => {
  // Check instance limit
  const instances = getAppInstances(app.type)
  if (instances >= 3) {
    console.log(`Maximum instances (3) reached for ${app.name}`)
    return
  }

  const windowConfig: any = {
    type: app.type,
    title: `${app.name} (${instances + 1})`,
    icon: app.icon,
    position: {
      x: 150 + instances * 50,
      y: 150 + instances * 50
    }
  }

  // Add component based on app type
  if (app.type === 'settings') {
    windowConfig.component = SettingsWindow
    windowConfig.size = { width: 900, height: 600 }
  }

  windowManager.createWindow(windowConfig)
}

const pinApp = (app: any) => {
  const index = pinnedApps.value.findIndex(p => p.type === app.type)
  if (index >= 0) {
    pinnedApps.value.splice(index, 1)
  } else {
    pinnedApps.value.push(app)
  }
}

const showContextMenu = (app: any, event: MouseEvent) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY - 100,
    type: 'app',
    target: app
  }
}

const showWindowContextMenu = (window: any, event: MouseEvent) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY - 150,
    type: 'window',
    target: window
  }
}

const openCommandCenter = () => {
  emit('open-command-center')
}

// Window dragging
const startDrag = (window: any, event: MouseEvent) => {
  if (window.state === 'maximized' || window.state.includes('snapped')) {
    return
  }

  dragState.value = {
    isDragging: true,
    window,
    startX: event.clientX,
    startY: event.clientY,
    startWindowX: window.position.x,
    startWindowY: window.position.y
  }

  window.isDragging = true

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleDrag = (event: MouseEvent) => {
  if (!dragState.value.isDragging) return

  const deltaX = event.clientX - dragState.value.startX
  const deltaY = event.clientY - dragState.value.startY

  const newPosition = {
    x: dragState.value.startWindowX + deltaX,
    y: Math.max(0, dragState.value.startWindowY + deltaY)
  }

  windowManager.updateWindowPosition(dragState.value.window.id, newPosition)
}

const stopDrag = () => {
  if (dragState.value.window) {
    dragState.value.window.isDragging = false
    windowManager.applySnap(dragState.value.window.id)
  }

  dragState.value = {
    isDragging: false,
    window: null,
    startX: 0,
    startY: 0,
    startWindowX: 0,
    startWindowY: 0
  }

  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Window resizing
const startResize = (window: any, handle: string, event: MouseEvent) => {
  resizeState.value = {
    isResizing: true,
    window,
    handle,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: window.size.width,
    startHeight: window.size.height,
    startLeft: window.position.x,
    startTop: window.position.y
  }

  window.isResizing = true

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event: MouseEvent) => {
  if (!resizeState.value.isResizing) return

  const deltaX = event.clientX - resizeState.value.startX
  const deltaY = event.clientY - resizeState.value.startY
  const { handle, window, startWidth, startHeight, startLeft, startTop } = resizeState.value

  const newSize = { width: startWidth, height: startHeight }
  const newPosition = { x: startLeft, y: startTop }

  // Handle different resize directions
  if (handle.includes('right')) {
    newSize.width = Math.max(300, startWidth + deltaX)
  }
  if (handle.includes('left')) {
    newSize.width = Math.max(300, startWidth - deltaX)
    newPosition.x = startLeft + deltaX
  }
  if (handle.includes('bottom')) {
    newSize.height = Math.max(200, startHeight + deltaY)
  }
  if (handle.includes('top')) {
    newSize.height = Math.max(200, startHeight - deltaY)
    newPosition.y = startTop + deltaY
  }

  windowManager.updateWindowSize(window.id, newSize)
  windowManager.updateWindowPosition(window.id, newPosition)
}

const stopResize = () => {
  if (resizeState.value.window) {
    resizeState.value.window.isResizing = false
  }

  resizeState.value = {
    isResizing: false,
    window: null,
    handle: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0
  }

  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl+D to toggle dock
  if (event.ctrlKey && event.key === 'd') {
    event.preventDefault()
    dockVisible.value = !dockVisible.value
    autoHide.value = !dockVisible.value
  }

  // Alt+Tab to cycle windows
  if (event.altKey && event.key === 'Tab') {
    event.preventDefault()
    const windows = windowManager.allWindows.value.filter(w => w.state !== 'minimized')
    if (windows.length > 1) {
      const currentIndex = windows.findIndex(w => w.isActive)
      const nextIndex = (currentIndex + 1) % windows.length
      windowManager.activateWindow(windows[nextIndex].id)
    }
  }
}

// Swipe gesture for mobile
const handleSwipe = (event: TouchEvent) => {
  // Implement swipe up from bottom to show dock
  const touch = event.touches[0]
  if (touch.clientY > window.innerHeight - 50) {
    dockVisible.value = true
    autoHide.value = false
  }
}

// Hide context menu on click outside
const hideContextMenu = () => {
  contextMenu.value.show = false
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', hideContextMenu)
  document.addEventListener('touchstart', handleSwipe)

  // Auto-hide dock near edges
  const handleMouseMove = (event: MouseEvent) => {
    const threshold = 10
    const nearBottom = event.clientY > window.innerHeight - threshold

    // Clear any pending visibility changes
    if (dockVisibilityTimeout.value) {
      clearTimeout(dockVisibilityTimeout.value)
    }

    if (nearBottom && autoHide.value) {
      // Show dock immediately when mouse is near bottom
      dockVisible.value = true
    } else if (!nearBottom && !isHovered.value && autoHide.value) {
      // Delay hiding to prevent flicker
      dockVisibilityTimeout.value = setTimeout(() => {
        if (!isHovered.value) {
          dockVisible.value = false
        }
      }, 150)
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', hideContextMenu)
  document.removeEventListener('touchstart', handleSwipe)
})
</script>

<style scoped>
/* Window Styles */
.enhanced-dock-wrapper {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
}

.windows-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.app-window {
  position: absolute;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  pointer-events: auto;
  transition: box-shadow 0.2s ease;
  min-width: 300px;
  min-height: 200px;
}

.app-window.active {
  box-shadow:
    0 25px 70px rgba(0, 0, 0, 0.4),
    0 0 0 2px rgba(59, 130, 246, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

.app-window.dragging {
  transition: none;
  opacity: 0.9;
}

.app-window.resizing {
  transition: none;
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(30, 30, 30, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px 12px 0 0;
  cursor: move;
  user-select: none;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.window-icon {
  width: 16px;
  height: 16px;
}

.window-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.control-btn svg {
  width: 8px;
  height: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.control-btn.minimize {
  background: #febc2e;
}

.control-btn.maximize {
  background: #28c940;
}

.control-btn.close {
  background: #ff5f57;
}

.control-btn:hover {
  transform: scale(1.1);
}

.control-btn:active {
  transform: scale(0.95);
}

.window-content {
  padding: 20px;
  height: calc(100% - 49px);
  overflow: auto;
  color: white;
}

.window-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.5;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

/* Resize Handles */
.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
}

.resize-handle.top,
.resize-handle.bottom {
  left: 10px;
  right: 10px;
  height: 4px;
  cursor: ns-resize;
}

.resize-handle.left,
.resize-handle.right {
  top: 10px;
  bottom: 10px;
  width: 4px;
  cursor: ew-resize;
}

.resize-handle.top { top: 0; }
.resize-handle.bottom { bottom: 0; }
.resize-handle.left { left: 0; }
.resize-handle.right { right: 0; }

.resize-handle.top-left,
.resize-handle.top-right,
.resize-handle.bottom-left,
.resize-handle.bottom-right {
  width: 10px;
  height: 10px;
}

.resize-handle.top-left {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.resize-handle.top-right {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.resize-handle.bottom-right {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

/* Snap Preview */
.snap-preview {
  position: absolute;
  background: rgba(59, 130, 246, 0.2);
  border: 2px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  pointer-events: none;
  transition: all 0.2s ease;
}

/* Enhanced Dock */
.enhanced-dock {
  position: fixed;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px;
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  z-index: 2000;
}

.enhanced-dock.visible {
  bottom: 20px;
}

.dock-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dock-item {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

.dock-item:hover {
  transform: translateY(-5px) scale(1.1);
}

.dock-item:active {
  transform: translateY(-3px) scale(1.05);
}

.dock-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 24px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: center;
}

.dock-item:hover .dock-icon {
  background: rgba(255, 255, 255, 0.2);
}

.dock-icon.bounce {
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.running-dot {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: #3b82f6;
  border-radius: 50%;
}

.instance-dots {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.instance-dots .dot {
  width: 4px;
  height: 4px;
  background: #3b82f6;
  border-radius: 50%;
}

.dock-separator {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

/* Tooltip */
.dock-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  font-size: 12px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
}

.dock-tooltip .shortcut,
.dock-tooltip .status {
  display: block;
  font-size: 10px;
  opacity: 0.7;
  margin-top: 2px;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  padding: 4px;
  min-width: 180px;
  pointer-events: auto;
  z-index: 3000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  color: white;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 8px;
}

/* Animations */
.window-animate-in {
  animation: windowIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-animate-out {
  animation: windowOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-minimize {
  animation: minimize 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-restore {
  animation: restore 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-maximize {
  animation: maximize 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-snap {
  animation: snap 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes windowIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes windowOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

@keyframes minimize {
  to {
    opacity: 0;
    transform: scale(0.8) translateY(100px);
  }
}

@keyframes restore {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(100px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes maximize {
  from {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  to {
    transform: scale(1);
  }
}

@keyframes snap {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 1;
  }
}

/* Transitions */
.snap-preview-enter-active,
.snap-preview-leave-active {
  transition: opacity 0.2s ease;
}

.snap-preview-enter-from,
.snap-preview-leave-to {
  opacity: 0;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: all 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(5px);
}

.context-menu-enter-active,
.context-menu-leave-active {
  transition: all 0.2s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .enhanced-dock {
    width: calc(100% - 40px);
    max-width: 500px;
  }

  .dock-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .app-window {
    min-width: 250px;
    min-height: 150px;
  }
}
</style>
