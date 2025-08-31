<template>
  <div class="grid-settings">
    <div class="settings-group">
      <h3 class="group-title">
        Grid Layout Configuration
      </h3>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Enable Grid Snapping</span>
          <span class="label-description">Windows snap to grid positions</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.enableGrid"
            type="checkbox"
            @change="updateSettings"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Grid Columns</span>
          <span class="label-description">Number of columns in the grid</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.gridColumns"
            type="range"
            min="2"
            max="12"
            step="1"
            class="setting-slider"
            @input="updateSettings"
          >
          <span class="slider-value">{{ settings.gridColumns }}</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Grid Rows</span>
          <span class="label-description">Number of rows in the grid</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.gridRows"
            type="range"
            min="2"
            max="8"
            step="1"
            class="setting-slider"
            @input="updateSettings"
          >
          <span class="slider-value">{{ settings.gridRows }}</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Default Window Width</span>
          <span class="label-description">Width in grid cells</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.defaultWidth"
            type="range"
            min="1"
            :max="settings.gridColumns"
            step="1"
            class="setting-slider"
            @input="updateSettings"
          >
          <span class="slider-value">{{ settings.defaultWidth }} cells</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Default Window Height</span>
          <span class="label-description">Height in grid cells</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.defaultHeight"
            type="range"
            min="1"
            :max="settings.gridRows"
            step="1"
            class="setting-slider"
            @input="updateSettings"
          >
          <span class="slider-value">{{ settings.defaultHeight }} cells</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Grid Gap</span>
          <span class="label-description">Space between grid cells (px)</span>
        </div>
        <div class="slider-container">
          <input
            v-model.number="settings.gridGap"
            type="range"
            min="0"
            max="20"
            step="2"
            class="setting-slider"
            @input="updateSettings"
          >
          <span class="slider-value">{{ settings.gridGap }}px</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Show Grid Lines</span>
          <span class="label-description">Display grid overlay</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.showGridLines"
            type="checkbox"
            @change="updateSettings"
          >
          <span class="toggle-slider" />
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">Auto-Lock Windows</span>
          <span class="label-description">Automatically lock adjacent windows</span>
        </div>
        <label class="toggle-switch">
          <input
            v-model="settings.autoLock"
            type="checkbox"
            @change="updateSettings"
          >
          <span class="toggle-slider" />
        </label>
      </div>
    </div>

    <!-- Workspace Management -->
    <div class="settings-group">
      <h3 class="group-title">
        Workspace Management
      </h3>

      <div class="workspace-list">
        <div
          v-for="workspace in workspaces"
          :key="workspace.id"
          class="workspace-item"
        >
          <div class="workspace-info">
            <Icon :name="workspace.icon || 'heroicons:squares-2x2'" />
            <span class="workspace-name">{{ workspace.name }}</span>
            <span class="workspace-count">{{ workspace.windows.length }} windows</span>
          </div>
          <div class="workspace-actions">
            <button
              class="action-btn"
              title="Load Workspace"
              @click="loadWorkspace(workspace)"
            >
              <Icon name="heroicons:arrow-up-tray" />
            </button>
            <button
              class="action-btn"
              title="Update Workspace"
              @click="updateWorkspace(workspace)"
            >
              <Icon name="heroicons:arrow-path" />
            </button>
            <button
              class="action-btn danger"
              title="Delete Workspace"
              @click="deleteWorkspace(workspace)"
            >
              <Icon name="heroicons:trash" />
            </button>
          </div>
        </div>

        <div
          v-if="!workspaces.length"
          class="empty-state"
        >
          <Icon name="heroicons:folder-open" />
          <p>No saved workspaces</p>
          <small>Select windows and save them as a workspace</small>
        </div>
      </div>

      <div class="workspace-actions-bar">
        <button
          class="action-btn primary"
          :disabled="!hasSelectedWindows"
          @click="saveCurrentAsWorkspace"
        >
          <Icon name="heroicons:plus" />
          Save Current as Workspace
        </button>
      </div>
    </div>

    <!-- Grid Preview -->
    <div class="settings-group">
      <h3 class="group-title">
        Grid Preview
      </h3>
      <div class="grid-preview">
        <div
          class="grid-container"
          :style="gridPreviewStyle"
        >
          <div
            v-for="cell in totalCells"
            :key="cell"
            class="grid-cell"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWindowManager } from '@/composables/useWindowManager'

const windowManager = useWindowManager()

const emit = defineEmits(['update'])

// Grid settings
const settings = ref({
  enableGrid: true,
  gridColumns: 6,
  gridRows: 4,
  defaultWidth: 2,
  defaultHeight: 2,
  gridGap: 8,
  showGridLines: false,
  autoLock: true
})

// Workspaces
const workspaces = ref<any[]>([])

// Computed
const totalCells = computed(() => settings.value.gridColumns * settings.value.gridRows)

const gridPreviewStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${settings.value.gridColumns}, 1fr)`,
  gridTemplateRows: `repeat(${settings.value.gridRows}, 1fr)`,
  gap: `${settings.value.gridGap}px`
}))

const hasSelectedWindows = computed(() => {
  return windowManager.allWindows.value.some(w => w.state !== 'minimized')
})

// Methods
const updateSettings = () => {
  // Save to localStorage
  localStorage.setItem('gridSettings', JSON.stringify(settings.value))
  
  // Emit update event
  emit('update', { grid: settings.value })
  
  // Apply grid settings to window manager
  windowManager.setGridSettings(settings.value)
}

const saveCurrentAsWorkspace = () => {
  const name = prompt('Enter workspace name:')
  if (!name) return

  const activeWindows = windowManager.allWindows.value
    .filter(w => w.state !== 'minimized')
    .map(w => ({
      type: w.type,
      title: w.title,
      icon: w.icon,
      position: w.position,
      size: w.size,
      gridPosition: w.gridPosition,
      lockedTo: w.lockedTo
    }))

  const workspace = {
    id: Date.now().toString(),
    name,
    windows: activeWindows,
    createdAt: new Date().toISOString()
  }

  workspaces.value.push(workspace)
  saveWorkspaces()
}

const loadWorkspace = (workspace: any) => {
  // Close all current windows
  windowManager.closeAllWindows()

  // Recreate windows from workspace
  workspace.windows.forEach((w: any) => {
    windowManager.createWindow({
      ...w,
      gridPosition: w.gridPosition,
      lockedTo: w.lockedTo
    })
  })
}

const updateWorkspace = (workspace: any) => {
  const activeWindows = windowManager.allWindows.value
    .filter(w => w.state !== 'minimized')
    .map(w => ({
      type: w.type,
      title: w.title,
      icon: w.icon,
      position: w.position,
      size: w.size,
      gridPosition: w.gridPosition,
      lockedTo: w.lockedTo
    }))

  workspace.windows = activeWindows
  workspace.updatedAt = new Date().toISOString()
  saveWorkspaces()
}

const deleteWorkspace = (workspace: any) => {
  if (confirm(`Delete workspace "${workspace.name}"?`)) {
    const index = workspaces.value.indexOf(workspace)
    workspaces.value.splice(index, 1)
    saveWorkspaces()
  }
}

const saveWorkspaces = () => {
  localStorage.setItem('workspaces', JSON.stringify(workspaces.value))
}

const loadWorkspaces = () => {
  const saved = localStorage.getItem('workspaces')
  if (saved) {
    workspaces.value = JSON.parse(saved)
  }
}

const loadSettings = () => {
  const saved = localStorage.getItem('gridSettings')
  if (saved) {
    settings.value = { ...settings.value, ...JSON.parse(saved) }
  }
}

// Lifecycle
onMounted(() => {
  loadSettings()
  loadWorkspaces()
  updateSettings()
})
</script>

<style scoped>
.grid-settings {
  padding: 20px 0;
}

.settings-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1a1a1a;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  margin-right: 24px;
}

.label-text {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.label-description {
  display: block;
  font-size: 13px;
  color: #6b7280;
}

/* Slider */
.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 250px;
}

.setting-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  cursor: pointer;
}

.slider-value {
  min-width: 60px;
  text-align: right;
  font-weight: 600;
  color: #4a90e2;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background: linear-gradient(135deg, #4a90e2, #357abd);
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Workspace List */
.workspace-list {
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.workspace-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.workspace-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.workspace-name {
  font-weight: 500;
  color: #1a1a1a;
}

.workspace-count {
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 12px;
}

.workspace-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Action Buttons */
.workspace-actions-bar {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  color: #666;
  border: 1px solid #e5e7eb;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn.primary {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
  border: none;
}

.action-btn.danger {
  color: #ef4444;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* Grid Preview */
.grid-preview {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  height: 200px;
}

.grid-container {
  width: 100%;
  height: 100%;
}

.grid-cell {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.grid-cell:hover {
  background: #f3f4f6;
  border-color: #4a90e2;
}
</style>