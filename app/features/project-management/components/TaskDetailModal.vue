<!--
  Task Detail Modal - Professional Opinionated Minimalism Design

  Features:
  - Full task editing capabilities
  - Priority and status management
  - Due date picker
  - Assignee selection
  - Labels management
  - Comments section
  - Attachment handling
  - Keyboard navigation
-->

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="task"
        class="fixed inset-0 z-[9999] overflow-y-auto"
        @click="handleBackdropClick"
        @keydown="handleKeyDown"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <!-- Modal -->
        <div class="relative min-h-full flex items-center justify-center p-6">
          <div
            ref="modalRef"
            class="relative w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
            @click.stop
          >
            <!-- Header -->
            <header class="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
              <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-2">
                  <div :class="['w-3 h-3 rounded-full', priorityColor]" />
                  <input
                    ref="titleRef"
                    v-model="editedTask.title"
                    class="text-xl font-semibold bg-transparent text-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                    placeholder="Task title..."
                  >
                </div>
              </div>

              <div class="flex items-center space-x-2">
                <!-- Save Button -->
                <button
                  :disabled="!hasChanges"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  @click="handleSave"
                >
                  Save
                </button>

                <!-- Close Button -->
                <button
                  class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                  @click="handleClose"
                >
                  <CloseIcon class="w-5 h-5" />
                </button>
              </div>
            </header>

            <!-- Content -->
            <div class="flex h-[600px]">
              <!-- Main Content -->
              <div class="flex-1 p-6 overflow-y-auto">
                <!-- Description -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    v-model="editedTask.description"
                    class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="4"
                    placeholder="Add a description..."
                  />
                </div>

                <!-- Labels -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Labels
                  </label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <span
                      v-for="label in editedTask.labels"
                      :key="label"
                      class="inline-flex items-center px-3 py-1 bg-blue-900/30 text-blue-300 text-sm rounded-full"
                    >
                      {{ label }}
                      <button
                        class="ml-2 text-blue-300 hover:text-blue-200"
                        @click="removeLabel(label)"
                      >
                        <CloseIcon class="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      v-model="newLabel"
                      class="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add label..."
                      @keydown.enter="addLabel"
                    >
                    <button
                      class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                      @click="addLabel"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <!-- Comments Section -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Comments
                  </label>
                  <div class="space-y-3 mb-4">
                    <div
                      v-for="comment in taskComments"
                      :key="comment.id"
                      class="flex space-x-3 p-3 bg-gray-700 rounded-lg"
                    >
                      <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {{ comment.author.charAt(0) }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                          <span class="text-sm font-medium text-gray-300">{{ comment.author }}</span>
                          <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
                        </div>
                        <p class="text-sm text-gray-100">
                          {{ comment.content }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Add Comment -->
                  <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-gray-300 text-sm font-medium">
                      U
                    </div>
                    <div class="flex-1">
                      <textarea
                        v-model="newComment"
                        class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="2"
                        placeholder="Add a comment..."
                      />
                      <div class="flex justify-end mt-2">
                        <button
                          :disabled="!newComment.trim()"
                          class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                          @click="addComment"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sidebar -->
              <div class="w-80 border-l border-gray-700 bg-gray-750 p-6 overflow-y-auto">
                <!-- Status -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    v-model="editedTask.status"
                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">
                      To Do
                    </option>
                    <option value="in-progress">
                      In Progress
                    </option>
                    <option value="review">
                      Review
                    </option>
                    <option value="done">
                      Done
                    </option>
                  </select>
                </div>

                <!-- Priority -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    v-model="editedTask.priority"
                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">
                      Low
                    </option>
                    <option value="medium">
                      Medium
                    </option>
                    <option value="high">
                      High
                    </option>
                  </select>
                </div>

                <!-- Assignee -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Assignee
                  </label>
                  <div class="flex items-center space-x-2 p-2 bg-gray-700 border border-gray-600 rounded-lg">
                    <div
                      v-if="editedTask.assignee"
                      class="w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center"
                    >
                      {{ editedTask.assignee.name.charAt(0) }}
                    </div>
                    <input
                      v-model="assigneeName"
                      class="flex-1 bg-transparent text-gray-100 placeholder-gray-400 border-none outline-none text-sm"
                      placeholder="Assign to..."
                      @blur="updateAssignee"
                    >
                  </div>
                </div>

                <!-- Due Date -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Due Date
                  </label>
                  <input
                    v-model="editedTask.dueDate"
                    type="date"
                    class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>

                <!-- Actions -->
                <div class="space-y-2">
                  <button
                    class="w-full flex items-center justify-center space-x-2 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                    @click="handleDuplicate"
                  >
                    <CopyIcon class="w-4 h-4" />
                    <span class="text-sm">Duplicate</span>
                  </button>

                  <button
                    class="w-full flex items-center justify-center space-x-2 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                    @click="handleDelete"
                  >
                    <TrashIcon class="w-4 h-4" />
                    <span class="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

// Icons
const CloseIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
}

const CopyIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`
}

const TrashIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`
}

// Props
const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['close', 'save', 'delete', 'duplicate'])

// Refs
const modalRef = ref(null)
const titleRef = ref(null)

// State
const editedTask = ref({})
const newLabel = ref('')
const newComment = ref('')
const assigneeName = ref('')

// Mock comments data
const taskComments = ref([
  {
    id: 1,
    author: 'John Doe',
    content: 'This looks good to me, just need to review the implementation details.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    id: 2,
    author: 'Jane Smith',
    content: 'I\'ve updated the requirements based on our discussion.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
  }
])

// Computed
const priorityColor = computed(() => {
  switch (editedTask.value.priority) {
    case 'high':
      return 'bg-red-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-blue-500'
  }
})

const hasChanges = computed(() => {
  return JSON.stringify(editedTask.value) !== JSON.stringify(props.task)
})

// Methods
const handleClose = () => {
  emit('close')
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    handleClose()
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    handleClose()
  }
}

const handleSave = () => {
  emit('save', editedTask.value.id, editedTask.value)
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this task?')) {
    emit('delete', editedTask.value.id)
  }
}

const handleDuplicate = () => {
  emit('duplicate', editedTask.value)
}

const addLabel = () => {
  if (newLabel.value.trim() && !editedTask.value.labels.includes(newLabel.value.trim())) {
    editedTask.value.labels.push(newLabel.value.trim())
    newLabel.value = ''
  }
}

const removeLabel = (label) => {
  const index = editedTask.value.labels.indexOf(label)
  if (index > -1) {
    editedTask.value.labels.splice(index, 1)
  }
}

const updateAssignee = () => {
  if (assigneeName.value.trim()) {
    editedTask.value.assignee = {
      name: assigneeName.value.trim(),
      avatar: assigneeName.value.charAt(0).toUpperCase()
    }
  } else {
    editedTask.value.assignee = null
  }
}

const addComment = () => {
  if (newComment.value.trim()) {
    taskComments.value.push({
      id: Date.now(),
      author: 'You',
      content: newComment.value.trim(),
      createdAt: new Date()
    })
    newComment.value = ''
  }
}

const formatDate = (date) => {
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// Watchers
watch(() => props.task, (newTask) => {
  if (newTask) {
    editedTask.value = { ...newTask }
    assigneeName.value = newTask.assignee?.name || ''
  }
}, { immediate: true, deep: true })

// Lifecycle
onMounted(() => {
  nextTick(() => {
    titleRef.value?.focus()
  })
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.700');
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

/* Custom gray-750 */
.bg-gray-750 {
  background-color: #374151;
}

/* Focus styles */
input:focus,
textarea:focus,
select:focus {
  outline: none;
}

/* Backdrop blur */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>
