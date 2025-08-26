<template>
  <div
    :class="[
      'file-tree-node',
      { selected: isSelected }
    ]"
    :style="{ paddingLeft: `${level * 16 + 8}px` }"
  >
    <div
      class="node-content flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-600 hover:text-gray-800 transition-colors"
      :draggable="true"
      :class="{ 'drag-over': isDragOver }"
      @click="handleClick($event)"
      @dblclick="handleDoubleClick"
      @contextmenu="$emit('context-menu', $event, node)"
      @dragstart="handleDragStart"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- Folder toggle icon -->
      <button
        v-if="node.type === 'folder'"
        class="toggle-btn w-4 h-4 flex items-center justify-center mr-1 hover:bg-gray-100 rounded transition-colors"
        @click.stop="$emit('toggle', node.path)"
      >
        <svg
          :class="['w-3 h-3 transform transition-transform', { 'rotate-90': node.isOpen }]"
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

      <!-- File/Folder icon -->
      <div class="icon mr-2">
        <svg
          :class="iconClass"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path :d="iconPath" />
        </svg>
      </div>

      <!-- File/Folder name -->
      <span
        :class="[
          'name flex-1 truncate',
          { 'font-medium': node.type === 'folder' }
        ]"
      >
        {{ node.name }}
      </span>

      <!-- File status indicators -->
      <div class="flex items-center space-x-1 ml-2">
        <!-- Git status indicator -->
        <span
          v-if="gitStatus"
          class="text-xs font-mono px-1 rounded"
          :class="{
            'bg-yellow-100 text-yellow-800': gitStatus === 'M',
            'bg-green-100 text-green-800': gitStatus === 'A',
            'bg-red-100 text-red-800': gitStatus === 'D',
            'bg-gray-100 text-gray-800': gitStatus === '??',
            'bg-blue-100 text-blue-800': gitStatus === 'R'
          }"
          :title="gitStatus === 'M' ? 'Modified' : gitStatus === 'A' ? 'Added' : gitStatus === 'D' ? 'Deleted' : gitStatus === '??' ? 'Untracked' : 'Renamed'"
        >
          {{ gitStatus }}
        </span>

        <!-- Unsaved changes indicator -->
        <div
          v-if="hasUnsavedChanges"
          class="w-2 h-2 bg-orange-500 rounded-full"
          title="Unsaved changes"
        />

        <!-- Modified indicator -->
        <div
          v-if="node.type === 'file' && isModified"
          class="w-2 h-2 bg-blue-500 rounded-full"
          title="Recently modified"
        />

        <!-- File metadata -->
        <div
          v-if="node.type === 'file'"
          class="flex flex-col text-xs text-gray-400"
        >
          <!-- File size -->
          <span v-if="node.size">
            {{ formatFileSize(node.size) }}
          </span>

          <!-- Last modified -->
          <span
            v-if="node.lastModified"
            class="text-xs"
          >
            {{ formatLastModified(node.lastModified) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Child nodes (for folders) -->
    <template v-if="node.type === 'folder' && node.isOpen && node.children">
      <FileTreeNode
        v-for="child in sortedChildren"
        :key="child.path"
        :node="child"
        :level="level + 1"
        :selected-file="selectedFile"
        :selected-files="selectedFiles"
        @select="$emit('select', $event, $arguments[1])"
        @toggle="$emit('toggle', $event)"
        @context-menu="$emit('context-menu', $event, $arguments[1])"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
        @move="$emit('move', $event)"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

defineOptions({
  name: 'FileTreeNode'
})

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  selectedFile: {
    type: String,
    default: null
  },
  selectedFiles: {
    type: Set,
    default: () => new Set()
  }
})

const emit = defineEmits(['select', 'toggle', 'context-menu', 'rename', 'delete', 'move'])

// Drag and drop state
const isDragOver = ref(false)

// Computed properties
const isSelected = computed(() => {
  return props.node.type === 'file' && (
    props.selectedFile === props.node.path
    || props.selectedFiles.has(props.node.path)
  )
})

const isModified = computed(() => {
  // Check if file has been modified recently
  if (!props.node.lastModified) return false
  const lastMod = new Date(props.node.lastModified)
  const now = new Date()
  const diffHours = (now - lastMod) / (1000 * 60 * 60)
  return diffHours < 24 // Modified in last 24 hours
})

const hasUnsavedChanges = computed(() => {
  // Check if file has unsaved changes
  return props.node.isDirty || false
})

const gitStatus = computed(() => {
  // Mock git status - in real implementation, this would come from git
  const _statuses = ['', 'M', 'A', 'D', '??', 'R']
  return props.node.gitStatus || ''
})

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatLastModified = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffHours = (now - date) / (1000 * 60 * 60)

  if (diffHours < 1) {
    return 'Just now'
  } else if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`
  } else if (diffHours < 24 * 7) {
    return `${Math.floor(diffHours / 24)}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

const sortedChildren = computed(() => {
  if (!props.node.children) return []

  return [...props.node.children].sort((a, b) => {
    // Folders first, then files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    // Alphabetical within type
    return a.name.localeCompare(b.name)
  })
})

const _iconComponent = computed(() => {
  return 'svg' // Use SVG for all icons
})

const iconPath = computed(() => {
  if (props.node.type === 'folder') {
    // Folder icon
    if (props.node.isOpen) {
      return 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
    } else {
      return 'M10 4H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z'
    }
  }

  // File icons based on extension
  const extension = props.node.name.split('.').pop()?.toLowerCase()

  const iconPaths = {
    // Code files
    js: 'M3 3h18v18H3V3zm16.5 16.5v-13h-13v13h13zM12 8l-2 4h4l-2-4z',
    ts: 'M3 3h18v18H3V3zm16.5 16.5v-13h-13v13h13zM12 8h2v8h-2V8z',
    vue: 'M3 3h18v18H3V3zm9 2l-6 10h2l4-7 4 7h2L12 5z',
    html: 'M12 2l1.09 3.26L16 5.47l-2.35 1.74L14.18 10 12 8.26 9.82 10l.53-2.79L8 5.47l2.91-.21L12 2z',
    css: 'M5 3l-.5 14L12 19l7.5-2L19 3H5zm12.5 11L12 16l-5.5-2V7h11v7z',
    json: 'M5 3l-.5 14L12 19l7.5-2L19 3H5zm7 13.5l-4-1v-9l4 1v9z',
    md: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  }

  return iconPaths[extension] || 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z'
})

const iconClass = computed(() => {
  if (props.node.type === 'folder') {
    return [
      'w-4 h-4 text-blue-600',
      'folder-icon',
      props.node.isOpen ? 'folder-open' : 'folder-closed'
    ]
  }

  // File icon based on extension with specific colors
  const extension = props.node.name.split('.').pop()?.toLowerCase()
  const fileTypeColors = {
    // JavaScript/TypeScript
    js: 'text-yellow-500',
    ts: 'text-blue-500',
    jsx: 'text-cyan-500',
    tsx: 'text-cyan-600',
    // Web
    html: 'text-orange-600',
    css: 'text-blue-400',
    scss: 'text-pink-500',
    sass: 'text-pink-500',
    vue: 'text-green-500',
    // Config/Data
    json: 'text-yellow-600',
    xml: 'text-orange-500',
    yaml: 'text-purple-500',
    yml: 'text-purple-500',
    toml: 'text-gray-600',
    // Documentation
    md: 'text-gray-700',
    txt: 'text-gray-500',
    pdf: 'text-red-600',
    // Images
    png: 'text-purple-400',
    jpg: 'text-purple-400',
    jpeg: 'text-purple-400',
    gif: 'text-purple-400',
    svg: 'text-green-400',
    webp: 'text-purple-400',
    // Programming languages
    py: 'text-green-600',
    java: 'text-orange-700',
    cpp: 'text-blue-700',
    c: 'text-blue-600',
    go: 'text-cyan-700',
    rs: 'text-orange-800',
    php: 'text-purple-600',
    rb: 'text-red-700',
    // Other
    env: 'text-yellow-700',
    gitignore: 'text-red-400',
    dockerfile: 'text-blue-800'
  }

  const colorClass = fileTypeColors[extension] || 'text-gray-500'
  return `w-4 h-4 file-icon file-${extension || 'default'} ${colorClass}`
})

// Methods
const handleClick = (event) => {
  if (props.node.type === 'folder') {
    emit('toggle', props.node.path)
  } else {
    emit('select', props.node, event)
  }
}

const handleDoubleClick = () => {
  if (props.node.type === 'file') {
    emit('select', props.node)
  }
}

// Drag and drop methods
const handleDragStart = (event) => {
  event.dataTransfer.setData('application/json', JSON.stringify({
    path: props.node.path,
    name: props.node.name,
    type: props.node.type
  }))
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnter = (event) => {
  if (props.node.type === 'folder') {
    event.preventDefault()
    isDragOver.value = true
  }
}

const handleDragOver = (event) => {
  if (props.node.type === 'folder') {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false

  if (props.node.type === 'folder') {
    try {
      const draggedItem = JSON.parse(event.dataTransfer.getData('application/json'))
      if (draggedItem.path !== props.node.path) {
        emit('move', {
          from: draggedItem.path,
          to: props.node.path,
          item: draggedItem
        })
      }
    } catch (e) {
      console.error('Failed to parse dragged item:', e)
    }
  }
}
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-content.selected,
.selected .node-content {
  background-color: #f8fafc;
  color: #475569;
  border-left: 2px solid #e2e8f0;
}

.toggle-btn {
  color: #94a3b8;
}

.toggle-btn:hover {
  color: #64748b;
}

/* File and folder icons using CSS */
.folder-icon {
  position: relative;
}

.folder-icon.folder-closed::before {
  content: '📁';
  font-size: 14px;
}

.folder-icon.folder-open::before {
  content: '📂';
  font-size: 14px;
}

.file-icon {
  position: relative;
}

.file-icon::before {
  content: '📄';
  font-size: 12px;
}

/* Specific file type icons */
.file-js::before,
.file-jsx::before,
.file-mjs::before {
  content: '📜';
  color: #f7df1e;
}

.file-ts::before,
.file-tsx::before {
  content: '📜';
  color: #3178c6;
}

.file-vue::before {
  content: '💚';
  color: #4fc08d;
}

.file-html::before {
  content: '🌐';
  color: #e34f26;
}

.file-css::before,
.file-scss::before,
.file-sass::before,
.file-less::before {
  content: '🎨';
  color: #1572b6;
}

.file-json::before {
  content: '⚙️';
  color: #292929;
}

.file-md::before,
.file-markdown::before {
  content: '📝';
  color: #083fa1;
}

.file-py::before {
  content: '🐍';
  color: #3776ab;
}

.file-php::before {
  content: '🐘';
  color: #777bb4;
}

.file-rb::before {
  content: '💎';
  color: #cc342d;
}

.file-go::before {
  content: '🐹';
  color: #00add8;
}

.file-rs::before {
  content: '⚙️';
  color: #ce422b;
}

.file-java::before {
  content: '☕';
  color: #ed8b00;
}

.file-c::before,
.file-cpp::before,
.file-h::before {
  content: '⚡';
  color: #659ad2;
}

.file-cs::before {
  content: '🔷';
  color: #239120;
}

.file-xml::before {
  content: '📋';
  color: #ff6600;
}

.file-yaml::before,
.file-yml::before {
  content: '📄';
  color: #cb171e;
}

.file-toml::before {
  content: '⚙️';
  color: #9c4221;
}

.file-ini::before {
  content: '📋';
  color: #6d6d6d;
}

.file-sh::before,
.file-bash::before {
  content: '🐚';
  color: #4eaa25;
}

.file-ps1::before {
  content: '💙';
  color: #012456;
}

.file-sql::before {
  content: '🗃️';
  color: #336791;
}

.file-gitignore::before,
.file-dockerignore::before {
  content: '🚫';
  color: #f14e32;
}

.file-dockerfile::before {
  content: '🐳';
  color: #2496ed;
}

.file-package::before {
  content: '📦';
  color: #cb3837;
}

.file-lock::before {
  content: '🔒';
  color: #767676;
}

.file-env::before {
  content: '🔐';
  color: #ecd53f;
}

.file-config::before {
  content: '⚙️';
  color: #6d6d6d;
}

.file-png::before,
.file-jpg::before,
.file-jpeg::before,
.file-gif::before,
.file-svg::before,
.file-ico::before {
  content: '🖼️';
  color: #ff69b4;
}

.file-pdf::before {
  content: '📕';
  color: #ff0000;
}

.file-zip::before,
.file-rar::before,
.file-7z::before,
.file-tar::before,
.file-gz::before {
  content: '🗜️';
  color: #b8860b;
}

.node-content.drag-over {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px dashed #3b82f6;
}

.node-content[draggable="true"]:hover {
  cursor: grab;
}

.node-content[draggable="true"]:active {
  cursor: grabbing;
}
</style>
