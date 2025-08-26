<template>
  <div class="ide-layout h-full flex flex-col bg-white">
    <!-- IDE Header -->
    <div class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
      <div class="flex items-center space-x-4">
        <!-- File Tree Toggle -->
        <button
          class="p-1 hover:bg-gray-50 rounded text-gray-500 hover:text-gray-700 transition-colors"
          title="Toggle File Explorer"
          @click="toggleFileExplorer"
        >
          <svg
            :class="['w-5 h-5 transform transition-transform', { 'rotate-180': !showFileExplorer }]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <h2 class="text-lg font-semibold text-gray-800">
          {{ pageTitle }} - IDE Mode
        </h2>
        <div class="flex items-center space-x-2">
          <button
            class="p-1 hover:bg-gray-50 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Toggle Extensions Panel"
            @click="toggleRightPanel"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
              />
            </svg>
          </button>
          <button
            class="text-gray-500 hover:text-gray-700 text-sm px-3 py-1 rounded hover:bg-gray-50 transition-colors"
            @click="exitIDEMode"
          >
            Exit IDE
          </button>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <span class="text-xs text-gray-500">{{ Object.keys(files).length }} files</span>
        <div class="flex space-x-1">
          <div class="w-3 h-3 rounded-full bg-red-500" />
          <div class="w-3 h-3 rounded-full bg-yellow-500" />
          <div class="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>
    </div>

    <!-- Main IDE Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Panel: File Explorer -->
      <div
        v-if="showFileExplorer"
        class="bg-white border-r border-gray-100 flex-shrink-0 relative transition-all duration-300"
        :style="{ width: leftPanelWidth + 'px' }"
      >
        <EnhancedFileExplorer
          :files="files"
          :active-file="activeFile"
          @select-file="selectFile"
          @create-file="createFile"
          @rename-file="renameFile"
          @delete-file="deleteFile"
          @create-folder="createFolder"
          @project-created="handleProjectCreated"
          @package-installed="handlePackageInstalled"
          @script-run="handleScriptRun"
        />

        <!-- Resize Handle -->
        <div
          class="absolute right-0 top-0 w-1 h-full cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-all opacity-0 hover:opacity-60"
          @mousedown="startResize('left')"
        />
      </div>

      <!-- Center Panel: Code Editor -->
      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex-1">
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
            class="h-full flex items-center justify-center bg-white text-gray-400"
          >
            <div class="text-center">
              <svg
                class="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p class="text-lg font-medium mb-2">
                No file selected
              </p>
              <p class="text-sm">
                Select a file from the explorer or create a new one
              </p>
            </div>
          </div>
        </div>

        <!-- Horizontal Resize Handle -->
        <div
          class="h-1 bg-gray-200 hover:bg-gray-300 cursor-row-resize transition-all opacity-0 hover:opacity-60"
          @mousedown="startResize('horizontal')"
        />

        <!-- Bottom Panel: Terminal -->
        <div
          class="bg-gray-50 border-t border-gray-100 flex-shrink-0"
          :style="{ height: bottomPanelHeight + 'px' }"
        >
          <Terminal
            :files="files"
            :active-file="activeFile"
            @execute-command="executeCommand"
            @create-file="createFile"
            @open-file="selectFile"
            @run-code="runCode"
          />
        </div>
      </div>

      <!-- Right Panel: Extensions and Tools -->
      <div
        v-if="showRightPanel"
        class="bg-white border-l border-gray-100 flex-shrink-0 relative transition-all duration-300 flex flex-col"
        :style="{ width: rightPanelWidth + 'px' }"
      >
        <!-- Right Panel Tabs -->
        <div class="flex border-b border-gray-100 bg-gray-50">
          <button
            v-for="tab in rightPanelTabs"
            :key="tab.id"
            class="flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
            :class="activeRightTab === tab.id
              ? 'text-blue-600 border-blue-600 bg-white'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'"
            @click="activeRightTab = tab.id"
          >
            <div class="flex items-center space-x-1">
              <span v-html="tab.icon" />
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </div>

        <!-- Right Panel Content -->
        <div class="flex-1 overflow-hidden">
          <!-- Extensions Tab -->
          <div
            v-if="activeRightTab === 'extensions'"
            class="h-full"
          >
            <ExtensionManager />
          </div>

          <!-- Debug Tab -->
          <div
            v-if="activeRightTab === 'debug'"
            class="h-full p-4 overflow-y-auto"
          >
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-800 mb-3">
                Debug Console
              </h3>
              <div class="bg-gray-50 rounded p-3 text-sm font-mono">
                <div class="text-gray-600">
                  Debug session not active
                </div>
                <div class="text-gray-400 text-xs mt-1">
                  Click a play button in the editor toolbar to start debugging
                </div>
              </div>

              <h4 class="font-medium text-gray-700 mt-4">
                Variables
              </h4>
              <div class="bg-gray-50 rounded p-3 text-sm">
                <div class="text-gray-500 text-xs">
                  No variables to display
                </div>
              </div>

              <h4 class="font-medium text-gray-700 mt-4">
                Call Stack
              </h4>
              <div class="bg-gray-50 rounded p-3 text-sm">
                <div class="text-gray-500 text-xs">
                  No call stack to display
                </div>
              </div>

              <h4 class="font-medium text-gray-700 mt-4">
                Watch
              </h4>
              <div class="bg-gray-50 rounded p-3 text-sm">
                <div class="text-gray-500 text-xs">
                  No watch expressions
                </div>
                <button class="text-blue-600 text-xs hover:text-blue-800 mt-2">
                  + Add Expression
                </button>
              </div>
            </div>
          </div>

          <!-- Git Tab -->
          <div
            v-if="activeRightTab === 'git'"
            class="h-full p-4 overflow-y-auto"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">
                  Source Control
                </h3>
                <button class="text-blue-600 text-xs hover:text-blue-800">
                  Initialize Repository
                </button>
              </div>

              <div class="bg-gray-50 rounded p-4 text-center">
                <svg
                  class="w-8 h-8 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <p class="text-sm text-gray-600 mb-2">
                  No source control provider registered
                </p>
                <p class="text-xs text-gray-500">
                  Initialize a Git repository to start using version control
                </p>
              </div>
            </div>
          </div>

          <!-- Search Tab -->
          <div
            v-if="activeRightTab === 'search'"
            class="h-full p-4"
          >
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-800 mb-3">
                Search
              </h3>
              <div class="space-y-3">
                <input
                  type="text"
                  placeholder="Search files..."
                  class="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                >
                <input
                  type="text"
                  placeholder="Replace (optional)..."
                  class="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:border-blue-500 focus:outline-none"
                >
                <div class="flex space-x-2">
                  <button class="flex-1 bg-blue-600 text-white text-sm px-3 py-2 rounded hover:bg-blue-700">
                    Search
                  </button>
                  <button class="flex-1 bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded hover:bg-gray-200">
                    Replace All
                  </button>
                </div>
              </div>

              <div class="border-t border-gray-100 pt-4">
                <div class="text-center text-gray-500 text-sm py-8">
                  No search results
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resize Handle -->
        <div
          class="absolute left-0 top-0 w-1 h-full cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-all opacity-0 hover:opacity-60"
          @mousedown="startResize('right')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import EnhancedFileExplorer from './EnhancedFileExplorer.vue'
import IDECodeEditor from './IDECodeEditor.vue'
import Terminal from './Terminal.vue'
import ExtensionManager from './ExtensionManager.vue'

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
  'project-created',
  'package-installed',
  'script-run'
])

// Panel sizes and visibility
const leftPanelWidth = ref(250)
const rightPanelWidth = ref(300)
const bottomPanelHeight = ref(300)
const showFileExplorer = ref(false) // Hidden by default
const showRightPanel = ref(true) // Show extensions panel by default
const activeRightTab = ref('extensions')

// Right panel tabs configuration
const rightPanelTabs = ref([
  {
    id: 'extensions',
    label: 'Extensions',
    icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>'
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>'
  },
  {
    id: 'git',
    label: 'Git',
    icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265L11.36 9.29a1 1 0 01-.96.69h-2.8a1 1 0 01-.96-.69L5.05 4.316a1 1 0 01.633-1.265L10 2.236l4.316.815zm-7.78 9.156a1 1 0 01.691.69l1.589 4.765 4.116-.855a1 1 0 01.633 1.265L10 19.764l-4.316-.815a1 1 0 01-.633-1.265l1.485-4.457z" clip-rule="evenodd"></path></svg>'
  },
  {
    id: 'search',
    label: 'Search',
    icon: '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path></svg>'
  }
])

// Resize state
const isResizing = ref(false)
const resizeType = ref(null)
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)
const startHeight = ref(0)

// File operations
const selectFile = (filename) => {
  emit('select-file', filename)
}

const createFile = (filename) => {
  const defaultContent = getDefaultContent(filename)
  const language = detectLanguage(filename)

  emit('create-file', {
    filename,
    content: defaultContent,
    language
  })
}

const updateFileContent = (content, language) => {
  if (props.activeFile) {
    emit('update-file', props.activeFile, { content, language })
  }
}

const saveFile = (fileData) => {
  // Files are automatically saved, but this could trigger additional save logic
  console.log('File saved:', fileData.filename)
}

const renameFile = (oldName, newName) => {
  emit('rename-file', oldName, newName)
}

const deleteFile = (filename) => {
  emit('delete-file', filename)
}

const runCode = (data) => {
  emit('run-code', data)
}

const createFolder = (folderData) => {
  emit('create-folder', folderData)
}

const handleProjectCreated = (projectData) => {
  emit('project-created', projectData)
}

const handlePackageInstalled = (packageData) => {
  emit('package-installed', packageData)
}

const handleScriptRun = (scriptData) => {
  emit('script-run', scriptData)
}

const executeCommand = (command) => {
  if (command === 'exit-ide') {
    exitIDEMode()
  }
  // Handle other terminal commands as needed
}

const exitIDEMode = () => {
  emit('exit-ide')
}

const toggleFileExplorer = () => {
  showFileExplorer.value = !showFileExplorer.value
  console.log('File explorer toggled:', showFileExplorer.value)
}

const toggleRightPanel = () => {
  showRightPanel.value = !showRightPanel.value
  console.log('Right panel toggled:', showRightPanel.value)
}

// Utility functions
const getDefaultContent = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'js':
      return '// JavaScript file\nconsole.log("Hello World!");'
    case 'ts':
      return '// TypeScript file\nconsole.log("Hello World!");'
    case 'html':
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`
    case 'css':
      return `/* CSS file */
body {
    margin: 0;
    font-family: Arial, sans-serif;
}`
    case 'vue':
      return '<template>\n  <div>\n    <h1>{{ message }}</h1>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from \'vue\'\n\nconst message = ref(\'Hello Vue!\')\n<' + '/script>\n\n<style scoped>\nh1 {\n  color: #42b883;\n}\n</style>'
    case 'py': {
      return '# Python file\nprint("Hello World!")'
    }
    case 'java':
      return `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}`
    case 'json':
      return '{\n  "name": "example",\n  "version": "1.0.0"\n}'
    case 'md':
      return '# Markdown File\n\nHello World!'
    default:
      return '// New file\n'
  }
}

const detectLanguage = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()

  const languageMap = {
    js: 'javascript',
    jsx: 'react',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    vue: 'vue',
    py: 'python',
    java: 'java',
    json: 'json',
    md: 'markdown',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml'
  }

  return languageMap[ext] || 'text'
}

// Panel resizing
const startResize = (type) => {
  isResizing.value = true
  resizeType.value = type

  if (type === 'left') {
    startX.value = event.clientX
    startWidth.value = leftPanelWidth.value
  } else if (type === 'right') {
    startX.value = event.clientX
    startWidth.value = rightPanelWidth.value
  } else if (type === 'horizontal') {
    startY.value = event.clientY
    startHeight.value = bottomPanelHeight.value
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = (type === 'left' || type === 'right') ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (event) => {
  if (!isResizing.value) return

  if (resizeType.value === 'left') {
    const deltaX = event.clientX - startX.value
    const newWidth = Math.max(200, Math.min(500, startWidth.value + deltaX))
    leftPanelWidth.value = newWidth
  } else if (resizeType.value === 'right') {
    const deltaX = startX.value - event.clientX
    const newWidth = Math.max(250, Math.min(500, startWidth.value + deltaX))
    rightPanelWidth.value = newWidth
  } else if (resizeType.value === 'horizontal') {
    const deltaY = startY.value - event.clientY
    const newHeight = Math.max(200, Math.min(600, startHeight.value + deltaY))
    bottomPanelHeight.value = newHeight
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeType.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  // Prevent context menu on resize handles
  document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('cursor-col-resize') || e.target.classList.contains('cursor-row-resize')) {
      e.preventDefault()
    }
  })
})

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.ide-layout {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Prevent text selection during resize */
.ide-layout * {
  user-select: text;
}

.ide-layout.resizing * {
  user-select: none;
}

/* Smooth transitions for file explorer */
.ide-layout .transition-all {
  transition: width 0.3s ease-in-out, opacity 0.3s ease-in-out;
}
</style>
