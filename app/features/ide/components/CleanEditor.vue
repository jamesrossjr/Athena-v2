<template>
  <div class="clean-editor h-full w-full relative bg-white overflow-hidden">
    <!-- Pure Editor Surface -->
    <div class="h-full w-full">
      <IDECodeEditor
        v-if="activeFile && files[activeFile]"
        :filename="activeFile"
        :initial-content="files[activeFile].content"
        :language="files[activeFile].language"
        @update-content="updateFileContent"
        @run-code="runCode"
        @save-file="saveFile"
      />
      <div
        v-else
        class="h-full w-full bg-white"
        :style="{
          paddingLeft: '1rem',
          paddingRight: '3rem',
          paddingTop: '0.25rem',
          paddingBottom: '2rem',
          backgroundImage: `repeating-linear-gradient(
            transparent,
            transparent 23px,
            #f8f9fa 23px,
            #f8f9fa 24px
          )`
        }"
        @click="focusEditor"
      >
        <div
          class="text-gray-400 text-xs font-mono"
          :style="{
            lineHeight: '24px',
            fontSize: '12px',
            marginBottom: '24px'
          }"
        >
          Start writing... Press <span class="font-medium">Ctrl+O</span> to open files or <span class="font-medium">/</span> for commands
        </div>
        <div class="h-96 cursor-text bg-white" />
      </div>
    </div>

    <!-- File Explorer Overlay -->
    <div
      v-if="overlayManager.isVisible('fileDrawer')"
      class="fixed top-0 left-0 w-80 h-full bg-white border-r border-gray-200 z-40 transform transition-transform duration-300"
      :class="_fileDrawerClasses"
    >
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="font-semibold text-gray-800">
            File Explorer
          </h3>
          <button
            class="p-1 hover:bg-gray-100 rounded"
            @click="closeFileDrawer"
          >
            ✕
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <EnhancedFileExplorer
            :files="files"
            :active-file="activeFile"
            :workspace-name="pageTitle"
            @file-select="_onFileSelect"
            @create-file="_createFile"
            @create-folder="_createFolder"
            @rename-file="_renameFile"
            @delete-file="_deleteFile"
          />
        </div>
      </div>
    </div>

    <!-- Terminal Overlay -->
    <div
      v-if="overlayManager.isVisible('terminal')"
      class="fixed bottom-0 left-0 right-0 h-64 bg-gray-900 border-t border-gray-700 z-40 transform transition-transform duration-300"
      :class="_terminalClasses"
    >
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <h3 class="font-semibold text-gray-200">
            Terminal
          </h3>
          <button
            class="p-1 hover:bg-gray-700 rounded text-gray-300"
            @click="_closeTerminal"
          >
            ✕
          </button>
        </div>
        <div class="flex-1">
          <Terminal />
        </div>
      </div>
    </div>

    <!-- Settings/Action Bar -->
    <div class="fixed top-4 right-4 z-30">
      <div class="flex flex-col space-y-2">
        <!-- File Explorer Toggle -->
        <button
          :class="[
            'p-3 rounded-lg shadow-lg transition-colors',
            overlayManager.isVisible('fileDrawer')
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          ]"
          title="Toggle File Explorer (Ctrl+O)"
          @click="toggleFileDrawer"
        >
          📁
        </button>

        <!-- Terminal Toggle -->
        <button
          :class="[
            'p-3 rounded-lg shadow-lg transition-colors',
            overlayManager.isVisible('terminal')
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          ]"
          title="Toggle Terminal (Ctrl+`)"
          @click="toggleTerminal"
        >
          ⚡
        </button>
      </div>
    </div>

    <!-- AI Assistant -->
    <AIAssistant />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useKeyboardShortcuts } from '../../../../composables/useKeyboardShortcuts'
import { useOverlayManager } from '../../../../composables/useOverlayManager'
import { useAI } from '../../ai/composables/useAI'
import IDECodeEditor from './IDECodeEditor.vue'
import EnhancedFileExplorer from './EnhancedFileExplorer.vue'
import Terminal from './Terminal.vue'
import AIAssistant from '../../ai/components/AIAssistant.vue'

const props = defineProps({
  pageTitle: {
    type: String,
    default: 'Untitled'
  },
  files: {
    type: Object,
    required: true
  },
  activeFile: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'exit-ide',
  'update-file',
  'create-file',
  'delete-file',
  'rename-file',
  'select-file',
  'run-code',
  'create-folder',
  'execute-command'
])

// AI Assistant state
const { aiState, openAI, closeAI } = useAI()

// Animation classes
const _fileDrawerClasses = computed(() => ({
  'translate-x-0': overlayManager.isVisible('fileDrawer'),
  '-translate-x-full': !overlayManager.isVisible('fileDrawer')
}))

const _terminalClasses = computed(() => ({
  'translate-y-0': overlayManager.isVisible('terminal'),
  'translate-y-full': !overlayManager.isVisible('terminal')
}))

// File operations
const updateFileContent = (content, language) => {
  if (props.activeFile) {
    emit('update-file', props.activeFile, { content, language })
  }
}

const _createFile = (fileData) => {
  emit('create-file', fileData)
}

const _createFolder = (folderData) => {
  emit('create-folder', folderData)
}

const _renameFile = (oldName, newName) => {
  emit('rename-file', oldName, newName)
}

const _deleteFile = (filename) => {
  emit('delete-file', filename)
}

const runCode = (data) => {
  emit('run-code', data)
}

const _onFileSelect = (file) => {
  emit('select-file', file.path)
  closeFileDrawer()
}

const saveFile = (fileData) => {
  console.log('File saved:', fileData.filename)
}

// UI Controls using overlay manager
const overlayManager = useOverlayManager()

const toggleFileDrawer = () => {
  overlayManager.toggle('fileDrawer')
}

const closeFileDrawer = () => {
  overlayManager.hideOverlay('fileDrawer')
}

const toggleTerminal = () => {
  overlayManager.toggle('terminal')
}

const _closeTerminal = () => {
  overlayManager.hideOverlay('terminal')
}

const toggleCommandPalette = () => {
  if (aiState.isOpen) {
    closeAI()
  } else {
    openAI()
  }
}

const closeCommandPalette = () => {
  closeAI()
}

// Expose toggleCommandPalette to parent
defineExpose({
  toggleCommandPalette
})

const focusEditor = () => {
  // Focus the editor when clicking on empty space
  console.log('Focus editor')
}

const executeCommand = (command) => {
  // Handle local UI commands
  switch (command.action) {
    case 'toggle-files':
      toggleFileDrawer()
      closeCommandPalette()
      break
    case 'toggle-terminal':
      toggleTerminal()
      closeCommandPalette()
      break
    case 'live-server':
      openLivePreview()
      closeCommandPalette()
      break
    default:
      // Emit all other commands to parent workspace for handling
      emit('execute-command', command)
      closeCommandPalette()
  }
}

const openLivePreview = () => {
  if (props.activeFile && props.files[props.activeFile]) {
    // Create a simple preview for the current file
    const file = props.files[props.activeFile]
    let previewContent = ''

    if (file.language === 'html' || props.activeFile.endsWith('.html')) {
      previewContent = file.content
    } else {
      // Create a simple preview for other file types
      previewContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${props.activeFile} - Preview</title>
          <style>
            body { font-family: monospace; padding: 20px; line-height: 1.6; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>${props.activeFile}</h1>
          <pre><code>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </body>
        </html>
      `
    }

    const blob = new Blob([previewContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  } else {
    alert('No file selected to preview')
  }
}

// Keyboard shortcuts
const shortcuts = useKeyboardShortcuts()

const closeAllOverlays = () => {
  overlayManager.hideAllOverlays()
}

onMounted(() => {
  shortcuts.registerIDEShortcuts({
    toggleFileExplorer: toggleFileDrawer,
    toggleTerminal: toggleTerminal,
    toggleCommandPalette: toggleCommandPalette,
    saveFile: () => {
      if (props.activeFile && props.files[props.activeFile]) {
        saveFile({ filename: props.activeFile, content: props.files[props.activeFile].content })
      }
    },
    closeOverlays: closeAllOverlays
  })
  shortcuts.init()
})

onUnmounted(() => {
  shortcuts.cleanup()
})
</script>

<style scoped>
.clean-editor {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

kbd {
  font-family: ui-monospace, 'SF Mono', Consolas, monospace;
}
</style>
