<template>
  <div class="file-explorer h-full bg-gray-50 border-r border-gray-200 flex flex-col">
    <!-- Header -->
    <div class="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Files</span>
      <div class="flex items-center space-x-1">
        <button
          class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="New File"
          @click="createNewFile"
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
        <button
          class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="New Folder"
          @click="createNewFolder"
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
        <button
          class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
          title="Refresh"
          @click="refreshFileTree"
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
      </div>
    </div>

    <!-- File Tree -->
    <div class="flex-1 overflow-y-auto p-2">
      <div class="space-y-1">
        <div
          v-for="(file, filename) in files"
          :key="filename"
          :class="[
            'flex items-center px-2 py-1 text-sm rounded cursor-pointer select-none',
            filename === activeFile
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
          ]"
          @click="selectFile(filename)"
          @contextmenu.prevent="showContextMenu(filename, $event)"
        >
          <!-- File Icon -->
          <svg
            class="w-4 h-4 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="getFileIcon(filename) === 'js'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              fill="currentColor"
              class="text-yellow-500"
            />
            <path
              v-else-if="getFileIcon(filename) === 'css'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              fill="currentColor"
              class="text-blue-500"
            />
            <path
              v-else-if="getFileIcon(filename) === 'html'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              fill="currentColor"
              class="text-orange-500"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          <!-- File Name -->
          <input
            v-if="filename === editingFile"
            ref="fileNameInput"
            v-model="editingName"
            class="bg-transparent border-none outline-none flex-1 text-sm"
            @blur="saveFileName"
            @keydown.enter="saveFileName"
            @keydown.esc="cancelEdit"
            @click.stop
          >
          <span
            v-else
            class="flex-1 truncate"
          >{{ filename }}</span>

          <!-- Modified indicator -->
          <div
            v-if="isFileModified(filename)"
            class="w-2 h-2 bg-orange-400 rounded-full ml-1 flex-shrink-0"
            title="Modified"
          />
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      class="fixed bg-white border border-gray-200 rounded shadow-lg py-1 z-50"
      @click.stop
    >
      <button
        class="w-full text-left px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
        @click="renameFile(contextMenu.file)"
      >
        Rename
      </button>
      <button
        class="w-full text-left px-3 py-1 text-sm text-red-600 hover:bg-red-50"
        @click="deleteFile(contextMenu.file)"
      >
        Delete
      </button>
    </div>

    <!-- Click outside to close context menu -->
    <div
      v-if="contextMenu.show"
      class="fixed inset-0 z-40"
      @click="contextMenu.show = false"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  files: {
    type: Object,
    required: true
  },
  activeFile: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select-file', 'create-file', 'rename-file', 'delete-file', 'create-folder', 'refresh-files'])

// File editing state
const editingFile = ref(null)
const editingName = ref('')
const fileNameInput = ref(null)

// Context menu state
const contextMenu = ref({
  show: false,
  file: null,
  x: 0,
  y: 0
})

// File operations
const selectFile = (filename) => {
  emit('select-file', filename)
}

const createNewFile = () => {
  const baseName = 'untitled'
  let counter = 1
  let newFileName = `${baseName}.js`

  while (props.files[newFileName]) {
    newFileName = `${baseName}${counter}.js`
    counter++
  }

  emit('create-file', newFileName)
  // Start editing the new file name
  nextTick(() => {
    renameFile(newFileName)
  })
}

const createNewFolder = () => {
  // For now, we'll implement folders later
  console.log('Create folder functionality coming soon')
}

const refreshFileTree = () => {
  // Emit refresh event to parent component to reload file structure
  emit('refresh-files')
}

const renameFile = (filename) => {
  editingFile.value = filename
  editingName.value = filename
  contextMenu.value.show = false
  nextTick(() => {
    fileNameInput.value?.focus()
    fileNameInput.value?.select()
  })
}

const saveFileName = () => {
  if (editingName.value && editingName.value !== editingFile.value) {
    emit('rename-file', editingFile.value, editingName.value.trim())
  }
  cancelEdit()
}

const cancelEdit = () => {
  editingFile.value = null
  editingName.value = ''
}

const deleteFile = (filename) => {
  if (confirm(`Are you sure you want to delete "${filename}"?`)) {
    emit('delete-file', filename)
  }
  contextMenu.value.show = false
}

const showContextMenu = (filename, event) => {
  contextMenu.value = {
    show: true,
    file: filename,
    x: event.clientX,
    y: event.clientY
  }
}

// File type detection
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'js'
    case 'css':
    case 'scss':
    case 'less':
      return 'css'
    case 'html':
    case 'htm':
      return 'html'
    case 'vue':
      return 'vue'
    case 'json':
      return 'json'
    case 'md':
      return 'md'
    default:
      return 'file'
  }
}

// Check if file is modified (placeholder for future implementation)
const _isFileModified = (_filename) => {
  // This would check against saved state
  return false
}

// Hide context menu when clicking outside
const _handleOutsideClick = () => {
  contextMenu.value.show = false
}
</script>

<style scoped>
.file-explorer {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
