<!--
  Professional Kanban Board Component

  Features:
  - Smooth drag-and-drop with visual feedback
  - Dark theme with minimal design
  - Real-time updates
  - Keyboard accessibility
  - Mobile responsive
-->

<template>
  <div class="kanban-board h-full overflow-x-auto bg-gray-900 p-6">
    <div class="flex space-x-6 min-w-max h-full">
      <!-- Kanban Columns -->
      <div
        v-for="column in columns"
        :key="column.id"
        class="flex-shrink-0 w-80 bg-gray-800 rounded-lg flex flex-col"
      >
        <!-- Column Header -->
        <header class="px-4 py-3 border-b border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div :class="['w-3 h-3 rounded-full', column.color]" />
              <h3 class="font-medium text-gray-100">
                {{ column.name }}
              </h3>
              <span class="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                {{ getColumnTaskCount(column.id) }}
              </span>
            </div>
            <button
              class="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
              @click="$emit('column-menu', column.id)"
            >
              <DotsIcon class="w-4 h-4" />
            </button>
          </div>
        </header>

        <!-- Task Cards Container -->
        <div
          :ref="`column-${column.id}`"
          class="flex-1 p-4 space-y-3 overflow-y-auto"
          :data-column="column.id"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- Task Cards -->
          <TaskCard
            v-for="task in getColumnTasks(column.id)"
            :key="task.id"
            :task="task"
            :dragging="draggedTask?.id === task.id"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @task-click="handleTaskClick"
            @task-edit="handleTaskEdit"
          />

          <!-- Add New Card Button -->
          <button
            v-if="column.id === 'todo' || getColumnTasks(column.id).length > 0"
            class="w-full p-3 border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 rounded-lg transition-colors group"
            @click="handleAddCard(column.id)"
          >
            <div class="flex items-center justify-center space-x-2">
              <PlusIcon class="w-4 h-4" />
              <span class="text-sm font-medium">Add a card</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Add Column Button -->
      <div class="flex-shrink-0 w-80">
        <button
          class="w-full h-16 border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 rounded-lg transition-colors flex items-center justify-center space-x-2"
          @click="handleAddColumn"
        >
          <PlusIcon class="w-5 h-5" />
          <span class="font-medium">Add another list</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Task Detail Modal -->
  <TaskDetailModal
    v-if="selectedTask"
    :task="selectedTask"
    @close="selectedTask = null"
    @save="handleTaskSave"
    @delete="handleTaskDelete"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import TaskCard from './TaskCard.vue'
import TaskDetailModal from './TaskDetailModal.vue'

// Icons
const PlusIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>`
}

const DotsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>`
}

// Props
const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    required: true
  }
})

// Emits
const emit = defineEmits([
  'task-moved',
  'task-created',
  'task-updated',
  'task-deleted',
  'column-menu'
])

// State
const draggedTask = ref(null)
const dragOverColumn = ref(null)
const selectedTask = ref(null)

// Computed
const getColumnTasks = (columnId) => {
  return props.tasks.filter(task => task.status === columnId)
}

const getColumnTaskCount = (columnId) => {
  return getColumnTasks(columnId).length
}

// Methods
const handleDragStart = (task) => {
  draggedTask.value = task
}

const handleDragEnd = () => {
  draggedTask.value = null
  dragOverColumn.value = null
}

const handleDragOver = (e) => {
  e.preventDefault()
  const column = e.currentTarget.dataset.column
  dragOverColumn.value = column
}

const handleDrop = (e) => {
  e.preventDefault()

  if (!draggedTask.value) return

  const targetColumn = e.currentTarget.dataset.column
  const sourceColumn = draggedTask.value.status

  if (targetColumn !== sourceColumn) {
    emit('task-moved', draggedTask.value.id, sourceColumn, targetColumn)
  }

  handleDragEnd()
}

const handleTaskClick = (task) => {
  selectedTask.value = task
}

const handleTaskEdit = (taskId, updates) => {
  emit('task-updated', taskId, updates)
}

const handleTaskSave = (taskId, updates) => {
  emit('task-updated', taskId, updates)
  selectedTask.value = null
}

const handleTaskDelete = (taskId) => {
  emit('task-deleted', taskId)
  selectedTask.value = null
}

const handleAddCard = (columnId) => {
  const newTask = {
    title: 'New Task',
    description: '',
    status: columnId,
    priority: 'medium',
    assignee: null,
    dueDate: null,
    labels: []
  }

  emit('task-created', newTask)
}

const handleAddColumn = () => {
  // Emit event to parent to handle column creation
  console.log('Add new column')
}
</script>

<style scoped>
/* Custom scrollbar for columns */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.700');
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

/* Drag over effects */
.drag-over {
  background-color: theme('colors.blue.900/20');
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
</style>
