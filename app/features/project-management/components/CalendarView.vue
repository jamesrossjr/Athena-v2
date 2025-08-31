<!--
  Calendar View Component - Opinionated Minimalism Design

  Features:
  - Monthly calendar view with task display
  - Task dots and indicators on dates
  - Multi-task day handling
  - Navigation between months
  - Today highlighting
  - Drag and drop date changes
  - Quick task creation on dates
  - Due date warnings and overdue indicators
-->

<template>
  <div class="calendar-view h-full flex flex-col bg-gray-900">
    <!-- Calendar Header -->
    <div class="flex items-center justify-between p-6 border-b border-gray-700">
      <div class="flex items-center space-x-4">
        <h2 class="text-xl font-semibold text-gray-100">
          {{ currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}
        </h2>
        <div class="text-sm text-gray-400">
          {{ tasksThisMonth }} tasks this month
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center space-x-2">
        <button
          class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          @click="navigateMonth(-1)"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>

        <button
          class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm rounded-lg transition-colors"
          @click="goToToday"
        >
          Today
        </button>

        <button
          class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          @click="navigateMonth(1)"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="flex-1 p-6 overflow-hidden">
      <div class="h-full bg-gray-800 rounded-lg overflow-hidden">
        <!-- Day Headers -->
        <div class="grid grid-cols-7 border-b border-gray-700">
          <div
            v-for="day in dayHeaders"
            :key="day"
            class="p-4 text-center text-sm font-medium text-gray-400 bg-gray-750"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar Days -->
        <div class="grid grid-cols-7 h-full">
          <div
            v-for="day in calendarDays"
            :key="day.key"
            :class="[
              'relative border-r border-b border-gray-700 p-2 transition-colors cursor-pointer min-h-[120px]',
              day.isCurrentMonth ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-850 text-gray-500',
              day.isToday ? 'ring-2 ring-blue-500 ring-inset' : '',
              day.isSelected ? 'bg-blue-900/20' : ''
            ]"
            @click="handleDayClick(day)"
            @drop="handleDrop($event, day)"
            @dragover="handleDragOver"
            @dragenter="handleDragEnter(day)"
            @dragleave="handleDragLeave"
          >
            <!-- Day Number -->
            <div class="flex items-center justify-between mb-2">
              <span
                :class="[
                  'text-sm font-medium',
                  day.isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : '',
                  !day.isCurrentMonth ? 'text-gray-600' : 'text-gray-200'
                ]"
              >
                {{ day.date.getDate() }}
              </span>

              <!-- Add Task Button -->
              <button
                v-if="day.isCurrentMonth"
                class="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-all"
                @click.stop="handleAddTask(day)"
              >
                <PlusIcon class="w-3 h-3" />
              </button>
            </div>

            <!-- Task Indicators -->
            <div class="space-y-1 overflow-hidden">
              <!-- Main tasks (up to 3 visible) -->
              <div
                v-for="task in getVisibleTasks(day)"
                :key="task.id"
                :class="[
                  'text-xs px-2 py-1 rounded truncate cursor-pointer transition-all hover:scale-105',
                  getTaskStyle(task),
                  task.status === 'done' ? 'line-through opacity-75' : ''
                ]"
                :title="task.title + (task.assignee ? ' - ' + task.assignee.name : '')"
                draggable="true"
                @click.stop="$emit('task-click', task)"
                @dragstart="handleTaskDragStart($event, task)"
              >
                <div class="flex items-center space-x-1">
                  <div :class="['w-1.5 h-1.5 rounded-full', getPriorityColor(task.priority)]" />
                  <span class="truncate">{{ task.title }}</span>
                </div>
              </div>

              <!-- More tasks indicator -->
              <div
                v-if="getTasksForDay(day).length > 3"
                class="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                @click.stop="showMoreTasks(day)"
              >
                +{{ getTasksForDay(day).length - 3 }} more
              </div>
            </div>

            <!-- Due date warning indicator -->
            <div
              v-if="hasOverdueTasks(day)"
              class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"
              title="Has overdue tasks"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar Footer -->
    <div class="px-6 py-4 border-t border-gray-700 bg-gray-800">
      <div class="flex items-center justify-between">
        <!-- Legend -->
        <div class="flex items-center space-x-6 text-sm text-gray-400">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full" />
            <span>High Priority</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Medium Priority</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full" />
            <span>Low Priority</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Overdue</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="flex items-center space-x-4 text-sm text-gray-400">
          <span>{{ completedThisMonth }} completed</span>
          <span>{{ overdueThisMonth }} overdue</span>
        </div>
      </div>
    </div>

    <!-- Day Detail Modal -->
    <teleport to="body">
      <div
        v-if="selectedDay"
        class="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
        @click="closeModal"
      >
        <div class="min-h-full flex items-center justify-center p-6">
          <div
            class="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 w-full max-w-md"
            @click.stop
          >
            <!-- Modal Header -->
            <div class="p-4 border-b border-gray-700">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-100">
                  {{ selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
                </h3>
                <button
                  class="text-gray-400 hover:text-gray-200"
                  @click="closeModal"
                >
                  <CloseIcon class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Modal Content -->
            <div class="p-4 max-h-96 overflow-y-auto">
              <div
                v-if="getTasksForDay(selectedDay).length === 0"
                class="text-center py-8"
              >
                <CalendarIcon class="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p class="text-gray-400">
                  No tasks for this day
                </p>
                <button
                  class="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  @click="handleAddTask(selectedDay)"
                >
                  Add Task
                </button>
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="task in getTasksForDay(selectedDay)"
                  :key="task.id"
                  class="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors cursor-pointer"
                  @click="$emit('task-click', task)"
                >
                  <div :class="['w-3 h-3 rounded-full', getPriorityColor(task.priority)]" />
                  <div class="flex-1 min-w-0">
                    <div
                      :class="[
                        'font-medium text-gray-100',
                        task.status === 'done' ? 'line-through opacity-75' : ''
                      ]"
                    >
                      {{ task.title }}
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      {{ getStatusLabel(task.status) }}
                      {{ task.assignee ? ' • ' + task.assignee.name : '' }}
                    </div>
                  </div>
                  <span
                    :class="[
                      'text-xs px-2 py-1 rounded-full',
                      getStatusColor(task.status)
                    ]"
                  >
                    {{ getStatusLabel(task.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Icons
const ChevronLeftIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>`
}

const ChevronRightIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`
}

const PlusIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>`
}

const CloseIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`
}

const CalendarIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
}

// Props
const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

// Emits
const emit = defineEmits(['task-click', 'task-moved', 'add-task'])

// State
const currentMonth = ref(new Date())
const selectedDay = ref(null)
const draggedTask = ref(null)
const dragOverDay = ref(null)

// Constants
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const today = new Date()

  // First day of the month
  const firstDay = new Date(year, month, 1)
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)

  // Start from Sunday of the week containing the first day
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  // End at Saturday of the week containing the last day
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  const days = []
  const current = new Date(startDate)

  while (current <= endDate) {
    days.push({
      key: current.toISOString().split('T')[0],
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: current.toDateString() === today.toDateString(),
      isSelected: selectedDay.value?.key === current.toISOString().split('T')[0]
    })
    current.setDate(current.getDate() + 1)
  }

  return days
})

const tasksThisMonth = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  return props.tasks.filter((task) => {
    if (!task.dueDate) return false
    const taskDate = new Date(task.dueDate)
    return taskDate.getFullYear() === year && taskDate.getMonth() === month
  }).length
})

const completedThisMonth = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  return props.tasks.filter((task) => {
    if (!task.dueDate || task.status !== 'done') return false
    const taskDate = new Date(task.dueDate)
    return taskDate.getFullYear() === year && taskDate.getMonth() === month
  }).length
})

const overdueThisMonth = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return props.tasks.filter((task) => {
    if (!task.dueDate || task.status === 'done') return false
    const taskDate = new Date(task.dueDate)
    return taskDate.getFullYear() === year
      && taskDate.getMonth() === month
      && taskDate < today
  }).length
})

// Methods
const navigateMonth = (direction) => {
  const newDate = new Date(currentMonth.value)
  newDate.setMonth(newDate.getMonth() + direction)
  currentMonth.value = newDate
}

const goToToday = () => {
  currentMonth.value = new Date()
}

const getTasksForDay = (day) => {
  const dayString = day.date.toISOString().split('T')[0]
  return props.tasks.filter(task => task.dueDate === dayString)
}

const getVisibleTasks = (day) => {
  return getTasksForDay(day).slice(0, 3)
}

const hasOverdueTasks = (day) => {
  if (!day.isCurrentMonth) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return getTasksForDay(day).some(task =>
    task.status !== 'done' && day.date < today
  )
}

const handleDayClick = (day) => {
  if (day.isCurrentMonth) {
    selectedDay.value = day
  }
}

const closeModal = () => {
  selectedDay.value = null
}

const showMoreTasks = (day) => {
  selectedDay.value = day
}

const handleAddTask = (day) => {
  emit('add-task', day.date.toISOString().split('T')[0])
  closeModal()
}

const handleTaskDragStart = (event, task) => {
  draggedTask.value = task
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const handleDragEnter = (day) => {
  if (day.isCurrentMonth) {
    dragOverDay.value = day
  }
}

const handleDragLeave = () => {
  dragOverDay.value = null
}

const handleDrop = (event, day) => {
  event.preventDefault()

  if (!draggedTask.value || !day.isCurrentMonth) return

  const newDueDate = day.date.toISOString().split('T')[0]
  if (newDueDate !== draggedTask.value.dueDate) {
    emit('task-moved', draggedTask.value.id, newDueDate)
  }

  draggedTask.value = null
  dragOverDay.value = null
}

const getTaskStyle = (task) => {
  const baseStyle = 'border-l-2'

  if (task.status === 'done') {
    return `${baseStyle} bg-green-900/30 text-green-300 border-green-500`
  }

  switch (task.priority) {
    case 'high':
      return `${baseStyle} bg-red-900/30 text-red-300 border-red-500`
    case 'low':
      return `${baseStyle} bg-green-900/30 text-green-300 border-green-500`
    default:
      return `${baseStyle} bg-blue-900/30 text-blue-300 border-blue-500`
  }
}

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500'
    case 'low':
      return 'bg-green-500'
    default:
      return 'bg-blue-500'
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'todo':
      return 'bg-gray-700 text-gray-300'
    case 'in-progress':
      return 'bg-blue-900/30 text-blue-300'
    case 'review':
      return 'bg-yellow-900/30 text-yellow-300'
    case 'done':
      return 'bg-green-900/30 text-green-300'
    default:
      return 'bg-gray-700 text-gray-300'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'todo':
      return 'To Do'
    case 'in-progress':
      return 'In Progress'
    case 'review':
      return 'Review'
    case 'done':
      return 'Done'
    default:
      return status
  }
}
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

/* Custom colors */
.bg-gray-750 {
  background-color: #374151;
}

.bg-gray-850 {
  background-color: #1f2937;
}

.bg-gray-650 {
  background-color: #4a5568;
}

/* Grid styling */
.grid-cols-7 > div:nth-child(7n) {
  border-right: none;
}

.grid-cols-7 > div:nth-last-child(-n+7) {
  border-bottom: none;
}

/* Task drag animation */
[draggable="true"] {
  cursor: grab;
}

[draggable="true"]:active {
  cursor: grabbing;
}

/* Hover effects */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

/* Pulse animation */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Today ring */
.ring-2 {
  box-shadow: inset 0 0 0 2px theme('colors.blue.500');
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.transition-all {
  transition: all 0.15s ease;
}

/* Calendar day hover states */
.min-h-\[120px\]:hover {
  background-color: rgba(55, 65, 81, 0.7) !important;
}

/* Task item hover scale */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

/* Backdrop blur */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>
