<template>
  <div
    class="enhanced-file-explorer h-full flex flex-col transition-colors"
    :class="{
      'bg-white text-gray-900': explorerSettings.theme === 'light',
      'bg-gray-900 text-white': explorerSettings.theme === 'dark',
      'bg-white text-gray-900 dark:bg-gray-900 dark:text-white': explorerSettings.theme === 'auto'
    }"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <!-- Header with project info and actions -->
    <div class="flex items-center justify-between p-3 bg-white border-b border-gray-100">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 bg-green-500 rounded-full" />
        <span class="text-sm font-medium text-gray-700">
          {{ currentProject?.name || 'No Project' }}
        </span>
      </div>
      <div class="flex items-center space-x-1">
        <!-- New File Button -->
        <button
          class="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="New File"
          @click="handleCreateFile"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
        <!-- New Folder Button -->
        <button
          class="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="New Folder"
          @click="handleCreateFolder"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </button>
        <!-- Refresh Button -->
        <button
          class="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh"
          @click="refreshProject"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <!-- Explorer Settings -->
        <button
          class="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title="Explorer Settings"
          @click="showSettingsDialog = true"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="px-3 py-2 border-b border-gray-100">
      <div class="relative">
        <svg
          class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search files..."
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          @input="onSearchInput"
        >
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          @click="clearSearch"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- File Tree -->
    <div class="flex-1 overflow-auto p-2">
      <FileTreeNode
        v-for="node in displayedFileTree"
        :key="node.path"
        :node="node"
        :level="0"
        :selected-file="activeFile"
        :selected-files="selectedFiles"
        @select="onFileSelect"
        @toggle="toggleFolder"
        @context-menu="onContextMenu"
        @rename="onRename"
        @delete="onDelete"
        @move="onMove"
      />

      <!-- Empty state -->
      <div
        v-if="displayedFileTree.length === 0"
        class="flex flex-col items-center justify-center h-32 text-gray-500"
      >
        <svg
          class="w-8 h-8 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p class="text-sm">
          No files in project
        </p>
        <button
          class="text-blue-600 hover:text-blue-800 text-sm mt-1"
          @click="showCreateFileDialog = true"
        >
          Create your first file
        </button>
      </div>
    </div>

    <!-- Project Actions -->
    <div class="border-t bg-white p-3">
      <div class="space-y-2">
        <!-- Package Manager -->
        <div class="flex items-center space-x-2">
          <select
            v-model="selectedPackageManager"
            class="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
          >
            <option value="npm">
              npm
            </option>
            <option value="pnpm">
              pnpm
            </option>
            <option value="yarn">
              yarn
            </option>
          </select>
          <button
            class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            title="Install Packages"
            @click="showInstallDialog = true"
          >
            Install
          </button>
        </div>

        <!-- Quick Scripts -->
        <div class="flex space-x-1">
          <button
            v-for="(script, name) in quickScripts"
            :key="name"
            class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs rounded flex-1"
            :title="script"
            @click="runScript(name)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create File Dialog -->
    <Dialog
      v-if="showCreateFileDialog"
      title="Create New File"
      @close="showCreateFileDialog = false"
      @confirm="createNewFile"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Parent Folder
          </label>
          <select
            v-model="newFileParent"
            class="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">
              Root
            </option>
            <option
              v-for="folder in availableFolders"
              :key="folder.path"
              :value="folder.path"
            >
              {{ folder.path }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            File Name
          </label>
          <input
            v-model="newFileName"
            type="text"
            class="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="example.js"
            @keydown.enter="createNewFile"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Template
          </label>
          <select
            v-model="selectedTemplate"
            class="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="empty">
              Empty File
            </option>
            <option value="component">
              Vue Component
            </option>
            <option value="page">
              Vue Page
            </option>
            <option value="api">
              API Route
            </option>
            <option value="middleware">
              Middleware
            </option>
            <option value="composable">
              Composable
            </option>
            <option value="utils">
              Utility Function
            </option>
          </select>
        </div>
      </div>
    </Dialog>

    <!-- Create Folder Dialog -->
    <Dialog
      v-if="showCreateFolderDialog"
      title="Create New Folder"
      @close="showCreateFolderDialog = false"
      @confirm="createNewFolder"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Parent Folder
          </label>
          <select
            v-model="newFolderParent"
            class="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">
              Root
            </option>
            <option
              v-for="folder in availableFolders"
              :key="folder.path"
              :value="folder.path"
            >
              {{ folder.path }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Folder Name
          </label>
          <input
            v-model="newFolderName"
            type="text"
            class="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="components"
            @keydown.enter="createNewFolder"
          >
        </div>
      </div>
    </Dialog>

    <!-- Install Package Dialog -->
    <Dialog
      v-if="showInstallDialog"
      title="Install Package"
      @close="showInstallDialog = false"
      @confirm="installNewPackage"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Package Name
          </label>
          <input
            v-model="packageToInstall"
            type="text"
            class="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="lodash"
            @keydown.enter="installNewPackage"
          >
        </div>
        <div class="flex items-center">
          <input
            id="dev-dependency"
            v-model="installAsDev"
            type="checkbox"
            class="mr-2"
          >
          <label
            for="dev-dependency"
            class="text-sm text-gray-700"
          >
            Install as dev dependency
          </label>
        </div>
        <div class="text-xs text-gray-500">
          Common packages: axios, lodash, moment, uuid, @types/node
        </div>
      </div>
    </Dialog>

    <!-- Settings Dialog -->
    <Dialog
      v-if="showSettingsDialog"
      title="Explorer Settings"
      @close="showSettingsDialog = false"
      @confirm="saveSettings"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Theme
          </label>
          <select
            v-model="explorerSettings.theme"
            class="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="light">
              Light
            </option>
            <option value="dark">
              Dark
            </option>
            <option value="auto">
              Auto (System)
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            View Mode
          </label>
          <select
            v-model="explorerSettings.viewMode"
            class="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="tree">
              Tree View
            </option>
            <option value="list">
              List View
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <div class="flex items-center">
            <input
              id="show-hidden"
              v-model="explorerSettings.showHiddenFiles"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="show-hidden"
              class="text-sm text-gray-700"
            >
              Show hidden files
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="show-size"
              v-model="explorerSettings.showFileSize"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="show-size"
              class="text-sm text-gray-700"
            >
              Show file sizes
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="show-modified"
              v-model="explorerSettings.showLastModified"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="show-modified"
              class="text-sm text-gray-700"
            >
              Show last modified dates
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="show-git"
              v-model="explorerSettings.showGitStatus"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="show-git"
              class="text-sm text-gray-700"
            >
              Show Git status
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="compact-mode"
              v-model="explorerSettings.compactMode"
              type="checkbox"
              class="mr-2"
            >
            <label
              for="compact-mode"
              class="text-sm text-gray-700"
            >
              Compact mode
            </label>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Context Menu -->
    <ContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="onContextMenuSelect"
      @close="contextMenu.show = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFileSystem as _useFileSystem } from '../composables/useFileSystem'
import FileTreeNode from './FileTreeNode.vue'
import Dialog from '../../../components/Dialog.vue'
import ContextMenu from '../../../components/ContextMenu.vue'

defineOptions({
  name: 'EnhancedFileExplorer'
})

const props = defineProps({
  projectConfig: {
    type: Object,
    default: null
  },
  files: {
    type: Object,
    default: () => ({})
  },
  activeFile: {
    type: String,
    default: null
  },
  workspaceName: {
    type: String,
    default: 'My Project'
  }
})

const emit = defineEmits(['file-select', 'file-change', 'project-change', 'create-folder', 'create-file', 'delete-file', 'rename-file', 'refresh-files'])

// Simple file system state (fallback if composable fails)
const currentProject = computed(() => ({ name: props.workspaceName }))

// Convert files prop to file tree format
const fileTree = computed(() => {
  if (props.files && Object.keys(props.files).length > 0) {
    return convertFilesToTree(props.files)
  }

  // Fallback tree structure - workspace folder with just README.md
  return [{
    name: props.workspaceName,
    path: props.workspaceName,
    type: 'folder',
    isOpen: folderStates.value.get(props.workspaceName) ?? true,
    children: [
      { name: 'README.md', path: 'README.md', type: 'file' }
    ]
  }]
})

const activeFile = computed(() => props.activeFile)

// Function to convert files object to tree structure
const convertFilesToTree = (files) => {
  const workspaceChildren = []

  Object.keys(files).forEach((filePath) => {
    const pathParts = filePath.split('/')
    let currentLevel = workspaceChildren

    // Build folder structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i]
      const folderPath = pathParts.slice(0, i + 1).join('/')

      let folder = currentLevel.find(item => item.name === folderName && item.type === 'folder')

      if (!folder) {
        folder = {
          name: folderName,
          path: folderPath,
          type: 'folder',
          isOpen: folderStates.value.get(folderPath) ?? true,
          children: []
        }
        currentLevel.push(folder)
      } else {
        // Update folder state
        folder.isOpen = folderStates.value.get(folderPath) ?? true
      }

      currentLevel = folder.children
    }

    // Add the file
    const fileName = pathParts[pathParts.length - 1]
    currentLevel.push({
      name: fileName,
      path: filePath,
      type: 'file'
    })
  })

  // Return workspace as the single root folder containing everything
  return [{
    name: props.workspaceName,
    path: props.workspaceName,
    type: 'folder',
    isOpen: folderStates.value.get(props.workspaceName) ?? true,
    children: workspaceChildren
  }]
}

// Mock functions for now
const _createFile = (parentPath, fileName, _content) => {
  console.log('Creating file:', fileName, 'in', parentPath)
  return Promise.resolve()
}
const _createFolder = (parentPath, folderName) => {
  console.log('Creating folder:', folderName, 'in', parentPath)
  return Promise.resolve()
}
const folderStates = ref(new Map())

const toggleFolder = (path) => {
  console.log('Toggle folder:', path)

  // Store folder state since fileTree is computed
  const currentState = folderStates.value.get(path) ?? true
  folderStates.value.set(path, !currentState)

  // Force reactivity update
  folderStates.value = new Map(folderStates.value)
}
const installPackage = () => Promise.resolve(true)
const runScript = () => Promise.resolve()
const initializeProject = () => Promise.resolve()

// UI state
const showCreateFileDialog = ref(false)
const showCreateFolderDialog = ref(false)
const showInstallDialog = ref(false)
const showSettingsDialog = ref(false)
const selectedPackageManager = ref('npm')
const contextMenu = ref({ show: false, x: 0, y: 0, node: null })

// Explorer settings
const explorerSettings = ref({
  theme: 'light', // 'light', 'dark', 'auto'
  viewMode: 'tree', // 'tree', 'list'
  showHiddenFiles: false,
  showFileSize: true,
  showLastModified: true,
  showGitStatus: true,
  compactMode: false
})

// Form data
const newFileName = ref('')
const newFileParent = ref('')
const selectedTemplate = ref('empty')
const newFolderName = ref('')
const newFolderParent = ref('')
const packageToInstall = ref('')
const installAsDev = ref(false)
const searchQuery = ref('')
const filteredFileTree = ref([])
const selectedNodeIndex = ref(0)
const keyboardNavigationEnabled = ref(true)

// Multi-selection state
const selectedFiles = ref(new Set())
const lastSelectedFile = ref(null)

// Clipboard state
const clipboardState = ref({
  files: [],
  operation: null, // 'copy' or 'cut'
  source: null
})

// File operation history for undo/redo
const operationHistory = ref([])
const historyIndex = ref(-1)

// Computed properties
const availableFolders = computed(() => {
  const getFolders = (nodes, prefix = '') => {
    const folders = []
    for (const node of nodes) {
      if (node.type === 'folder') {
        const path = prefix ? `${prefix}/${node.name}` : node.name
        folders.push({ ...node, path })
        if (node.children) {
          folders.push(...getFolders(node.children, path))
        }
      }
    }
    return folders
  }
  return getFolders(fileTree.value)
})

const quickScripts = computed(() => {
  if (!currentProject.value) return {}
  const scripts = currentProject.value.scripts || {}
  // Show only common/important scripts
  const priority = ['dev', 'build', 'start', 'test', 'lint']
  const filtered = {}
  priority.forEach((key) => {
    if (scripts[key]) filtered[key] = scripts[key]
  })
  return filtered
})

const contextMenuItems = computed(() => {
  const node = contextMenu.value.node
  if (!node) return []

  const items = []
  const hasClipboard = clipboardState.value.files.length > 0
  const isSelectedFiles = selectedFiles.value.size > 1

  if (node.type === 'folder') {
    items.push(
      { label: 'New File', action: 'new-file', icon: '📄' },
      { label: 'New Folder', action: 'new-folder', icon: '📁' },
      { separator: true }
    )

    if (hasClipboard) {
      items.push(
        { label: `Paste (${clipboardState.value.files.length} items)`, action: 'paste', icon: '📋' },
        { separator: true }
      )
    }

    items.push(
      { label: 'Copy Path', action: 'copy-path', icon: '📋' },
      { label: 'Copy Relative Path', action: 'copy-relative-path', icon: '📋' },
      { separator: true },
      { label: 'Reveal in File Explorer', action: 'reveal-explorer', icon: '📂' },
      { separator: true }
    )
  } else {
    // File-specific options
    items.push(
      { label: 'Open', action: 'open', icon: '📖' },
      { label: 'Open With...', action: 'open-with', icon: '⚙️' },
      { separator: true }
    )

    if (isSelectedFiles) {
      items.push(
        { label: `Copy ${selectedFiles.value.size} Files`, action: 'copy-multi', icon: '📄' },
        { label: `Cut ${selectedFiles.value.size} Files`, action: 'cut-multi', icon: '✂️' },
        { separator: true }
      )
    } else {
      items.push(
        { label: 'Copy', action: 'copy', icon: '📄' },
        { label: 'Cut', action: 'cut', icon: '✂️' },
        { separator: true }
      )
    }

    items.push(
      { label: 'Copy Path', action: 'copy-path', icon: '📋' },
      { label: 'Copy Relative Path', action: 'copy-relative-path', icon: '📋' },
      { separator: true },
      { label: 'Reveal in File Explorer', action: 'reveal-explorer', icon: '📂' },
      { separator: true }
    )
  }

  // Common options
  if (isSelectedFiles) {
    items.push(
      { label: `Delete ${selectedFiles.value.size} Files`, action: 'delete-multi', icon: '🗑️', danger: true }
    )
  } else {
    items.push(
      { label: 'Rename', action: 'rename', icon: '✏️' },
      { label: 'Delete', action: 'delete', icon: '🗑️', danger: true }
    )
  }

  return items
})

const displayedFileTree = computed(() => {
  if (!searchQuery.value.trim()) {
    return fileTree.value
  }
  return filteredFileTree.value
})

// Methods
const onFileSelect = (node, event = null) => {
  if (event?.ctrlKey || event?.metaKey) {
    // Multi-selection with Ctrl/Cmd key
    handleMultiSelect(node)
  } else if (event?.shiftKey && lastSelectedFile.value) {
    // Range selection with Shift key
    handleRangeSelect(node)
  } else {
    // Single selection
    selectedFiles.value.clear()
    if (node.type === 'file') {
      selectedFiles.value.add(node.path)
      lastSelectedFile.value = node.path
      emit('file-select', node.path)
    }
  }
  console.log('Selected files:', Array.from(selectedFiles.value))
}

const handleMultiSelect = (node) => {
  if (node.type === 'file') {
    if (selectedFiles.value.has(node.path)) {
      selectedFiles.value.delete(node.path)
    } else {
      selectedFiles.value.add(node.path)
      lastSelectedFile.value = node.path
      emit('file-select', node.path)
    }
    // Force reactivity
    selectedFiles.value = new Set(selectedFiles.value)
  }
}

const handleRangeSelect = (node) => {
  if (node.type === 'file' && lastSelectedFile.value) {
    const flatFiles = getFlatFileList()
    const startIndex = flatFiles.findIndex(f => f.path === lastSelectedFile.value)
    const endIndex = flatFiles.findIndex(f => f.path === node.path)

    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex)
      const end = Math.max(startIndex, endIndex)

      selectedFiles.value.clear()
      for (let i = start; i <= end; i++) {
        selectedFiles.value.add(flatFiles[i].path)
      }
      selectedFiles.value = new Set(selectedFiles.value)
    }
  }
}

const getFlatFileList = () => {
  const files = []
  const flatten = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'file') {
        files.push(node)
      }
      if (node.children) {
        flatten(node.children)
      }
    }
  }
  flatten(displayedFileTree.value)
  return files
}

const onContextMenu = (event, node) => {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    node
  }
}

const onContextMenuSelect = (action) => {
  const node = contextMenu.value.node
  contextMenu.value.show = false

  switch (action) {
    case 'open':
      onFileSelect(node)
      break
    case 'open-with':
      // Show open with dialog or options
      console.log('Open with:', node.path)
      break
    case 'new-file':
      newFileParent.value = node.path
      showCreateFileDialog.value = true
      break
    case 'new-folder':
      newFolderParent.value = node.path
      showCreateFolderDialog.value = true
      break
    case 'copy':
      copyFilesToClipboard([node])
      break
    case 'cut':
      cutFilesToClipboard([node])
      break
    case 'copy-multi':
      copyFilesToClipboard(getSelectedNodes())
      break
    case 'cut-multi':
      cutFilesToClipboard(getSelectedNodes())
      break
    case 'paste':
      pasteFromClipboard(node)
      break
    case 'copy-path':
      copyPathToClipboard(node.path)
      break
    case 'copy-relative-path':
      copyRelativePathToClipboard(node.path)
      break
    case 'reveal-explorer':
      revealInExplorer(node.path)
      break
    case 'rename':
      onRename(node)
      break
    case 'delete':
      onDelete(node)
      break
    default:
      console.log('Unhandled context menu action:', action)
  }
}

const onRename = (node) => {
  const newName = prompt('Enter new name:', node.name)
  if (newName && newName !== node.name) {
    const newPath = node.path.replace(node.name, newName)
    emit('rename-file', node.path, newPath)
  }
}

const onDelete = (node) => {
  if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
    emit('delete-file', node.path)
  }
}

const onMove = (moveData) => {
  console.log('Move:', moveData)
  // Update file tree structure
  const { from, to, item } = moveData

  const removeFromTree = (nodes, path) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].path === path) {
        return nodes.splice(i, 1)[0]
      }
      if (nodes[i].children) {
        const removed = removeFromTree(nodes[i].children, path)
        if (removed) return removed
      }
    }
    return null
  }

  const addToTree = (nodes, targetPath, item) => {
    for (const node of nodes) {
      if (node.path === targetPath && node.type === 'folder') {
        if (!node.children) node.children = []
        // Update item path
        const newPath = `${targetPath}/${item.name}`
        item.path = newPath
        node.children.push(item)
        return true
      }
      if (node.children && addToTree(node.children, targetPath, item)) {
        return true
      }
    }
    return false
  }

  // Remove from current location
  const movedItem = removeFromTree(fileTree.value, from)
  if (movedItem) {
    // Add to new location
    if (addToTree(fileTree.value, to, movedItem)) {
      // Emit to parent for persistence
      emit('rename-file', from, movedItem.path)
      console.log(`Moved ${item.name} from ${from} to ${movedItem.path}`)
    }
  }
}

// Search functionality
const onSearchInput = () => {
  if (!searchQuery.value.trim()) {
    filteredFileTree.value = []
    return
  }

  const searchTerm = searchQuery.value.toLowerCase()
  const searchResults = []

  const searchInTree = (nodes) => {
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(searchTerm)) {
        searchResults.push({ ...node })
      }
      if (node.children) {
        searchInTree(node.children)
      }
    }
  }

  searchInTree(fileTree.value)
  filteredFileTree.value = searchResults
}

const clearSearch = () => {
  searchQuery.value = ''
  filteredFileTree.value = []
}

// Enhanced clipboard operations
const getSelectedNodes = () => {
  const nodes = []
  const findNodes = (tree) => {
    for (const node of tree) {
      if (selectedFiles.value.has(node.path)) {
        nodes.push(node)
      }
      if (node.children) {
        findNodes(node.children)
      }
    }
  }
  findNodes(displayedFileTree.value)
  return nodes
}

const copyFilesToClipboard = (nodes) => {
  clipboardState.value = {
    files: nodes.map(n => ({ ...n })),
    operation: 'copy',
    source: 'file-explorer'
  }
  console.log(`Copied ${nodes.length} files to clipboard:`, nodes.map(n => n.path))

  // Also copy paths to system clipboard
  const paths = nodes.map(n => n.path).join('\n')
  if (navigator.clipboard) {
    navigator.clipboard.writeText(paths)
      .then(() => console.log('Paths copied to system clipboard'))
      .catch(err => console.error('Failed to copy paths:', err))
  }
}

const cutFilesToClipboard = (nodes) => {
  clipboardState.value = {
    files: nodes.map(n => ({ ...n })),
    operation: 'cut',
    source: 'file-explorer'
  }
  console.log(`Cut ${nodes.length} files to clipboard:`, nodes.map(n => n.path))

  // Visual indication for cut files (you could add CSS styling)
  // Mark files as "cut" for visual feedback
  nodes.forEach((_node) => {
    // Add cut styling class or state
  })
}

const pasteFromClipboard = (targetNode) => {
  if (!clipboardState.value.files.length) return

  const targetPath = targetNode.type === 'folder' ? targetNode.path : ''

  clipboardState.value.files.forEach((file) => {
    const newPath = targetPath ? `${targetPath}/${file.name}` : file.name

    if (clipboardState.value.operation === 'copy') {
      // Copy operation - duplicate the file
      addOperation({
        type: 'copy',
        from: file.path,
        to: newPath,
        file: { ...file }
      })
      console.log(`Copying ${file.path} to ${newPath}`)
      emit('create-file', newPath, file.content || '')
    } else if (clipboardState.value.operation === 'cut') {
      // Cut operation - move the file
      addOperation({
        type: 'move',
        from: file.path,
        to: newPath,
        file: { ...file }
      })
      console.log(`Moving ${file.path} to ${newPath}`)
      emit('rename-file', file.path, newPath)
    }
  })

  // Clear clipboard after paste (for cut operations)
  if (clipboardState.value.operation === 'cut') {
    clipboardState.value = { files: [], operation: null, source: null }
  }
}

const copyPathToClipboard = (path) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(path)
      .then(() => console.log('Full path copied to clipboard:', path))
      .catch(err => console.error('Failed to copy path:', err))
  }
}

const copyRelativePathToClipboard = (path) => {
  // Remove project root and make relative
  const relativePath = path.startsWith('./') ? path : `./${path}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(relativePath)
      .then(() => console.log('Relative path copied to clipboard:', relativePath))
      .catch(err => console.error('Failed to copy relative path:', err))
  }
}

const revealInExplorer = (path) => {
  // In a real implementation, this would open the system file explorer
  console.log('Reveal in explorer:', path)
  // For web implementation, we could show a notification or open a new tab
  if (window.electronAPI) {
    // If running in Electron
    window.electronAPI.showItemInFolder(path)
  } else {
    // Web fallback - show notification
    console.log('Would reveal in system explorer:', path)
  }
}

// Undo/Redo functionality
const addOperation = (operation) => {
  // Remove any operations after current index (if we're in the middle of history)
  operationHistory.value = operationHistory.value.slice(0, historyIndex.value + 1)

  // Add new operation
  operationHistory.value.push(operation)
  historyIndex.value = operationHistory.value.length - 1

  // Limit history size
  if (operationHistory.value.length > 50) {
    operationHistory.value.shift()
    historyIndex.value--
  }

  console.log('Added operation to history:', operation)
}

const undoLastOperation = () => {
  if (historyIndex.value < 0) return

  const operation = operationHistory.value[historyIndex.value]
  console.log('Undoing operation:', operation)

  switch (operation.type) {
    case 'create':
      emit('delete-file', operation.path)
      break
    case 'delete':
      emit('create-file', operation.path, operation.content || '')
      break
    case 'rename':
    case 'move':
      emit('rename-file', operation.to, operation.from)
      break
    case 'copy':
      emit('delete-file', operation.to)
      break
  }

  historyIndex.value--
}

const redoLastOperation = () => {
  if (historyIndex.value >= operationHistory.value.length - 1) return

  historyIndex.value++
  const operation = operationHistory.value[historyIndex.value]
  console.log('Redoing operation:', operation)

  switch (operation.type) {
    case 'create':
      emit('create-file', operation.path, operation.content || '')
      break
    case 'delete':
      emit('delete-file', operation.path)
      break
    case 'rename':
    case 'move':
      emit('rename-file', operation.from, operation.to)
      break
    case 'copy':
      emit('create-file', operation.to, operation.file.content || '')
      break
  }
}

// Keyboard navigation
const handleKeyDown = (event) => {
  if (!keyboardNavigationEnabled.value) return

  const flatNodes = []
  const flattenTree = (nodes, depth = 0) => {
    for (const node of nodes) {
      flatNodes.push({ ...node, depth })
      if (node.type === 'folder' && node.isOpen && node.children) {
        flattenTree(node.children, depth + 1)
      }
    }
  }

  flattenTree(displayedFileTree.value)

  const currentIndex = selectedNodeIndex.value

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (currentIndex < flatNodes.length - 1) {
        selectedNodeIndex.value = currentIndex + 1
        highlightNode(flatNodes[selectedNodeIndex.value])
      }
      break

    case 'ArrowUp':
      event.preventDefault()
      if (currentIndex > 0) {
        selectedNodeIndex.value = currentIndex - 1
        highlightNode(flatNodes[selectedNodeIndex.value])
      }
      break

    case 'ArrowRight':
      event.preventDefault()
      if (currentIndex < flatNodes.length) {
        const node = flatNodes[currentIndex]
        if (node.type === 'folder' && !node.isOpen) {
          toggleFolder(node.path)
        }
      }
      break

    case 'ArrowLeft':
      event.preventDefault()
      if (currentIndex < flatNodes.length) {
        const node = flatNodes[currentIndex]
        if (node.type === 'folder' && node.isOpen) {
          toggleFolder(node.path)
        }
      }
      break

    case 'Enter':
    case ' ':
      event.preventDefault()
      if (currentIndex < flatNodes.length) {
        const node = flatNodes[currentIndex]
        if (node.type === 'file') {
          onFileSelect(node)
        } else {
          toggleFolder(node.path)
        }
      }
      break

    case 'Delete':
      event.preventDefault()
      if (currentIndex < flatNodes.length) {
        onDelete(flatNodes[currentIndex])
      }
      break

    case 'F2':
      event.preventDefault()
      if (currentIndex < flatNodes.length) {
        onRename(flatNodes[currentIndex])
      }
      break

    case 'Escape':
      event.preventDefault()
      keyboardNavigationEnabled.value = false
      setTimeout(() => {
        keyboardNavigationEnabled.value = true
      }, 100)
      break
  }

  // Global keyboard shortcuts
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
    switch (event.key) {
      case 'z':
        event.preventDefault()
        undoLastOperation()
        break
      case 'y':
        event.preventDefault()
        redoLastOperation()
        break
      case 'c':
        if (selectedFiles.value.size > 0) {
          event.preventDefault()
          copyFilesToClipboard(getSelectedNodes())
        }
        break
      case 'x':
        if (selectedFiles.value.size > 0) {
          event.preventDefault()
          cutFilesToClipboard(getSelectedNodes())
        }
        break
      case 'v':
        if (clipboardState.value.files.length > 0) {
          event.preventDefault()
          // Paste to current folder or workspace root
          const targetNode = { type: 'folder', path: props.workspaceName }
          pasteFromClipboard(targetNode)
        }
        break
      case 'a':
        event.preventDefault()
        selectAllFiles()
        break
    }
  }

  // Ctrl+Shift shortcuts
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
    switch (event.key) {
      case 'Z':
        event.preventDefault()
        redoLastOperation()
        break
    }
  }
}

const selectAllFiles = () => {
  selectedFiles.value.clear()
  const files = getFlatFileList()
  files.forEach((file) => {
    selectedFiles.value.add(file.path)
  })
  selectedFiles.value = new Set(selectedFiles.value)
  console.log('Selected all files:', selectedFiles.value.size)
}

const highlightNode = (node) => {
  // This would typically highlight the node visually
  // For now, we'll just set the active file
  if (node.type === 'file') {
    activeFile.value = node.path
  }
  console.log('Highlighted node:', node.path)
}

const createNewFile = async () => {
  if (!newFileName.value.trim()) return

  // Add file to tree
  const newFile = {
    name: newFileName.value,
    path: newFileParent.value ? `${newFileParent.value}/${newFileName.value}` : newFileName.value,
    type: 'file'
  }

  if (newFileParent.value) {
    // Add to specific folder
    const addToFolder = (nodes) => {
      for (const node of nodes) {
        if (node.path === newFileParent.value && node.type === 'folder') {
          if (!node.children) node.children = []
          node.children.push(newFile)
          return true
        }
        if (node.children && addToFolder(node.children)) {
          return true
        }
      }
      return false
    }
    addToFolder(fileTree.value)
  } else {
    // Add to root
    fileTree.value.push(newFile)
  }

  // Get file template content
  const content = getFileTemplate(selectedTemplate.value, newFile.name)

  // Emit file creation to parent component
  emit('create-file', newFile.path, content)

  // Reset form
  showCreateFileDialog.value = false
  newFileName.value = ''
  newFileParent.value = ''
  selectedTemplate.value = 'empty'

  console.log('File created:', newFile.path)
}

const createNewFolder = async () => {
  if (!newFolderName.value.trim()) return

  // Add folder to tree
  const newFolder = {
    name: newFolderName.value,
    path: newFolderParent.value ? `${newFolderParent.value}/${newFolderName.value}` : newFolderName.value,
    type: 'folder',
    isOpen: false,
    children: []
  }

  if (newFolderParent.value) {
    // Add to specific folder
    const addToFolder = (nodes) => {
      for (const node of nodes) {
        if (node.path === newFolderParent.value && node.type === 'folder') {
          if (!node.children) node.children = []
          node.children.push(newFolder)
          return true
        }
        if (node.children && addToFolder(node.children)) {
          return true
        }
      }
      return false
    }
    addToFolder(fileTree.value)
  } else {
    // Add to root
    fileTree.value.push(newFolder)
  }

  // Emit folder creation to parent component
  emit('create-folder', newFolder.path, newFolder.name)

  // Reset form
  showCreateFolderDialog.value = false
  newFolderName.value = ''
  newFolderParent.value = ''

  console.log('Folder created:', newFolder.path)
}

const installNewPackage = async () => {
  if (!packageToInstall.value.trim()) return

  const success = await installPackage(packageToInstall.value, installAsDev.value)

  if (success) {
    // Show success message or update UI
    console.log(`Package ${packageToInstall.value} installed successfully`)
  }

  // Reset form
  showInstallDialog.value = false
  packageToInstall.value = ''
  installAsDev.value = false
}

// Simple handlers for testing
const handleCreateFile = () => {
  console.log('Create file clicked')
  showCreateFileDialog.value = true
}

const handleCreateFolder = () => {
  console.log('Create folder clicked')
  showCreateFolderDialog.value = true
}

const refreshProject = () => {
  // Refresh project structure and file tree
  emit('refresh-files')
  if (currentProject.value) {
    emit('project-change', 'refresh')
  }
}

const saveSettings = () => {
  // Save settings to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('explorer-settings', JSON.stringify(explorerSettings.value))
  }
  showSettingsDialog.value = false
  console.log('Explorer settings saved:', explorerSettings.value)
}

// Load settings on mount
if (typeof window !== 'undefined') {
  const savedSettings = localStorage.getItem('explorer-settings')
  if (savedSettings) {
    try {
      explorerSettings.value = { ...explorerSettings.value, ...JSON.parse(savedSettings) }
    } catch (e) {
      console.error('Failed to load explorer settings:', e)
    }
  }
}

const getFileTemplate = (template, fileName) => {
  const _extension = fileName.split('.').pop()?.toLowerCase()

  const templates = {
    empty: '',
    component: getVueComponentTemplate(fileName),
    page: getVuePageTemplate(fileName),
    api: getApiRouteTemplate(fileName),
    middleware: getMiddlewareTemplate(fileName),
    composable: getComposableTemplate(fileName),
    utils: getUtilsTemplate(fileName)
  }

  return templates[template] || ''
}

const getVueComponentTemplate = (fileName) => {
  const componentName = fileName.replace('.vue', '').replace(/[^a-zA-Z0-9]/g, '')
  return `<template>
  <div class="${componentName.toLowerCase()}">
    <h2>{{ title }}</h2>
  </div>
</template>

  <` + `script setup>
defineProps({
  title: {
    type: String,
    default: '${componentName}'
  }
})
    <` + `/script>

<style scoped>
.${componentName.toLowerCase()} {
  /* Component styles */
}
</style>`
}

const getVuePageTemplate = (fileName) => {
  const pageName = fileName.replace('.vue', '').replace(/[^a-zA-Z0-9]/g, '')
  return `<template>
  <div class="${pageName.toLowerCase()}-page">
    <h1>${pageName}</h1>
    <p>Welcome to the ${pageName} page!</p>
  </div>
</template>

    <` + `script setup>
// Page setup
useHead({
  title: '${pageName}'
})
  <` + `/script>

<style scoped>
.${pageName.toLowerCase()}-page {
  padding: 2rem;
}
</style>`
}

const getApiRouteTemplate = (_fileName) => {
  return `export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  
  switch (method) {
    case 'GET':
      return { message: 'GET request handled' }
    
    case 'POST':
      const body = await readBody(event)
      return { message: 'POST request handled', data: body }
    
    default:
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
  }
})`
}

const getMiddlewareTemplate = (fileName) => {
  const middlewareName = fileName.replace('.js', '').replace('.ts', '')
  return `export default defineNuxtRouteMiddleware((to, from) => {
  // ${middlewareName} middleware logic
  console.log('Navigating from', from.path, 'to', to.path)
  
  // Example: redirect if not authenticated
  // if (!user.value) {
  //   return navigateTo('/login')
  // }
})`
}

const getComposableTemplate = (fileName) => {
  const composableName = fileName.replace('.js', '').replace('.ts', '').replace('use', '')
  return `export const use${composableName} = () => {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetch${composableName} = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Your logic here
      data.value = await $fetch('/api/${composableName.toLowerCase()}')
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    fetch${composableName}
  }
}`
}

const getUtilsTemplate = (fileName) => {
  const utilName = fileName.replace('.js', '').replace('.ts', '')
  return `/**
 * ${utilName} utility functions
 */

export const ${utilName} = {
  // Add your utility functions here
  
  format: (value) => {
    // Example utility function
    return value
  },
  
  validate: (input) => {
    // Example validation function
    return !!input
  }
}

export default ${utilName}
`
}

// Initialize project if config is provided
watch(() => props.projectConfig, (config) => {
  if (config) {
    initializeProject(config)
  }
}, { immediate: true })

// Update package manager
watch(selectedPackageManager, (pm) => {
  if (currentProject.value) {
    currentProject.value.packageManager = pm
  }
})
</script>

<style scoped>
.enhanced-file-explorer {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
