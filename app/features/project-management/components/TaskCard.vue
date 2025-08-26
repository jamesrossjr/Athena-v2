<!--
  Task Card Component - Minimalist Design

  Features:
  - Smooth drag interactions
  - Priority indicators
  - Assignee avatars
  - Due date warnings
  - Keyboard accessible
-->

<template>
  <div
    :class="[
      'task-card bg-gray-700 rounded-lg p-4 border border-gray-600 transition-all duration-200 cursor-pointer group',
      {
        'opacity-50 transform rotate-1': dragging,
        'hover:bg-gray-650 hover:border-gray-500': !dragging,
        'border-red-400': isOverdue,
        'border-yellow-400': isDueSoon
      }
    ]"
    draggable="true"
    tabindex="0"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- Priority Indicator -->
    <div
      v-if="task.priority && task.priority !== 'medium'"
      :class="[
        'absolute top-0 left-0 w-1 h-full rounded-l-lg',
        priorityColor
      ]"
    />

    <!-- Task Header -->
    <div class="flex items-start justify-between mb-3">
      <h4 class="font-medium text-gray-100 text-sm leading-tight pr-2">
        {{ task.title }}
      </h4>
      <button
        class="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
        @click.stop="handleMenuClick"
      >
        <DotsIcon class="w-3 h-3 text-gray-400" />
      </button>
    </div>

    <!-- Task Description -->
    <p
      v-if="task.description"
      class="text-xs text-gray-400 mb-3 line-clamp-2"
    >
      {{ task.description }}
    </p>

    <!-- Labels -->
    <div
      v-if="task.labels && task.labels.length"
      class="flex flex-wrap gap-1 mb-3"
    >
      <span
        v-for="label in task.labels"
        :key="label"
        class="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-full"
      >
        {{ label }}
      </span>
    </div>

    <!-- Task Footer -->
    <div class="flex items-center justify-between text-xs">
      <!-- Due Date -->
      <div
        v-if="task.dueDate"
        class="flex items-center space-x-1"
      >
        <CalendarIcon class="w-3 h-3 text-gray-400" />
        <span :class="dateTextColor">
          {{ formatDueDate(task.dueDate) }}
        </span>
      </div>

      <!-- Assignee Avatar -->
      <div
        v-if="task.assignee"
        class="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full"
        :title="task.assignee.name"
      >
        {{ task.assignee.avatar || task.assignee.name.charAt(0) }}
      </div>
    </div>

    <!-- Comments/Attachments Indicators -->
    <div
      v-if="hasMetadata"
      class="flex items-center space-x-3 mt-3 pt-3 border-t border-gray-600"
    >
      <div
        v-if="task.comments"
        class="flex items-center space-x-1 text-gray-400"
      >
        <ChatIcon class="w-3 h-3" />
        <span class="text-xs">{{ task.comments }}</span>
      </div>
      <div
        v-if="task.attachments"
        class="flex items-center space-x-1 text-gray-400"
      >
        <PaperClipIcon class="w-3 h-3" />
        <span class="text-xs">{{ task.attachments }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Icons
const DotsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>`
}

const CalendarIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
}

const ChatIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`
}

const PaperClipIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>`
}

// Props
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  dragging: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['drag-start', 'drag-end', 'task-click', 'task-edit'])

// Computed
const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'high':
      return 'bg-red-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-blue-500'
  }
})

const isOverdue = computed(() => {
  if (!props.task.dueDate) return false
  const today = new Date()
  const dueDate = new Date(props.task.dueDate)
  return dueDate < today && props.task.status !== 'done'
})

const isDueSoon = computed(() => {
  if (!props.task.dueDate || isOverdue.value) return false
  const today = new Date()
  const dueDate = new Date(props.task.dueDate)
  const diffTime = dueDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 3 && diffDays >= 0
})

const dateTextColor = computed(() => {
  if (isOverdue.value) return 'text-red-400'
  if (isDueSoon.value) return 'text-yellow-400'
  return 'text-gray-400'
})

const hasMetadata = computed(() => {
  return props.task.comments || props.task.attachments
})

// Methods
const handleDragStart = (e) => {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.task.id)
  emit('drag-start', props.task)
}

const handleDragEnd = () => {
  emit('drag-end')
}

const handleClick = () => {
  emit('task-click', props.task)
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleClick()
  }
}

const handleMenuClick = () => {
  console.log('Task menu clicked for:', props.task.id)
}

const formatDueDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease;
}

.transition-opacity {
  transition: opacity 0.15s ease;
}

/* Custom gray-650 color */
.hover\:bg-gray-650:hover {
  background-color: #4a5568;
}

/* Focus styles */
.task-card:focus {
  outline: 2px solid theme('colors.blue.500');
  outline-offset: 2px;
}

/* Drag state styles */
.task-card.dragging {
  transform: rotate(2deg) scale(0.95);
  opacity: 0.8;
  z-index: 50;
}
</style>
