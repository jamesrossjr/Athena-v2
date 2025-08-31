<!--
  Timeline View (Gantt Chart) - Opinionated Minimalism Design

  Features:
  - Simple horizontal Gantt chart
  - Task duration bars with progress indicators
  - Timeline navigation (weeks/months)
  - Dependency indicators (basic)
  - Milestone markers
  - Drag to resize task duration
  - Today indicator
  - Dark theme with clean design
-->

<template>
  <div class="timeline-view h-full flex flex-col bg-gray-900">
    <!-- Header Controls -->
    <div class="flex items-center justify-between p-6 border-b border-gray-700">
      <div class="flex items-center space-x-4">
        <h2 class="text-lg font-semibold text-gray-100">
          Timeline
        </h2>

        <!-- Time Range -->
        <div class="flex items-center space-x-2">
          <button
            :class="[
              'px-3 py-1 text-sm rounded transition-colors',
              timeRange === 'weeks'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
            @click="timeRange = 'weeks'"
          >
            Weeks
          </button>
          <button
            :class="[
              'px-3 py-1 text-sm rounded transition-colors',
              timeRange === 'months'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
            @click="timeRange = 'months'"
          >
            Months
          </button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex items-center space-x-2">
        <button
          class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
          @click="navigateTime(-1)"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>

        <button
          class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm rounded transition-colors"
          @click="goToToday"
        >
          Today
        </button>

        <button
          class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
          @click="navigateTime(1)"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Timeline Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Task List Sidebar -->
      <div class="w-80 border-r border-gray-700 bg-gray-800 overflow-y-auto">
        <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-4">
          <h3 class="text-sm font-medium text-gray-300">
            Tasks
          </h3>
        </div>

        <div class="space-y-1">
          <div
            v-for="task in tasksWithDates"
            :key="task.id"
            class="flex items-center p-4 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30"
            :style="{ height: '60px' }"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <div :class="['w-2 h-2 rounded-full', getPriorityColor(task.priority)]" />
                <span class="font-medium text-gray-100 text-sm truncate">{{ task.title }}</span>
              </div>
              <div class="flex items-center space-x-2 text-xs text-gray-400">
                <span :class="getStatusColor(task.status)">{{ getStatusLabel(task.status) }}</span>
                <span v-if="task.assignee">• {{ task.assignee.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state for sidebar -->
        <div
          v-if="tasksWithDates.length === 0"
          class="p-8 text-center"
        >
          <CalendarIcon class="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p class="text-sm text-gray-500">
            No tasks with dates
          </p>
        </div>
      </div>

      <!-- Timeline Chart -->
      <div class="flex-1 overflow-auto">
        <div class="relative min-w-max">
          <!-- Timeline Header -->
          <div
            class="sticky top-0 bg-gray-800 border-b border-gray-700 z-10"
            :style="{ height: '60px' }"
          >
            <div class="flex h-full">
              <div
                v-for="period in timelinePeriods"
                :key="period.key"
                class="flex flex-col justify-center border-r border-gray-700 px-3"
                :style="{ width: periodWidth + 'px' }"
              >
                <div class="text-xs font-medium text-gray-300">
                  {{ period.label }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ period.sublabel }}
                </div>
              </div>
            </div>
          </div>

          <!-- Timeline Body -->
          <div class="relative">
            <!-- Today Line -->
            <div
              v-if="todayPosition >= 0"
              class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
              :style="{ left: todayPosition + 'px' }"
            >
              <div class="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>

            <!-- Task Bars -->
            <div class="space-y-0">
              <div
                v-for="task in tasksWithDates"
                :key="task.id"
                class="relative border-b border-gray-700/30"
                :style="{ height: '60px' }"
              >
                <!-- Task Bar -->
                <div
                  class="absolute top-1/2 transform -translate-y-1/2 h-6 rounded cursor-pointer group transition-all hover:h-8"
                  :class="[
                    getTaskBarColor(task),
                    'shadow-sm hover:shadow-md'
                  ]"
                  :style="getTaskBarStyle(task)"
                  @click="$emit('task-click', task)"
                >
                  <!-- Progress Bar -->
                  <div
                    v-if="task.progress"
                    class="absolute inset-0 bg-white/20 rounded"
                    :style="{ width: task.progress + '%' }"
                  />

                  <!-- Task Title (on hover) -->
                  <div class="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                    {{ task.title }}
                    <div class="text-xs text-gray-400 mt-1">
                      {{ formatDateRange(task.startDate, task.dueDate) }}
                    </div>
                  </div>

                  <!-- Resize Handles -->
                  <div class="absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-500 rounded-l" />
                  <div class="absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-blue-500 rounded-r" />
                </div>

                <!-- Milestone indicator -->
                <div
                  v-if="task.milestone"
                  class="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-yellow-500 rotate-45"
                  :style="{ left: getDatePosition(task.dueDate) + 'px' }"
                />
              </div>
            </div>

            <!-- Background grid lines -->
            <div class="absolute inset-0 pointer-events-none">
              <div
                v-for="period in timelinePeriods"
                :key="'grid-' + period.key"
                class="absolute top-0 bottom-0 border-r border-gray-700/20"
                :style="{ left: period.position * periodWidth + 'px' }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <div class="px-6 py-4 border-t border-gray-700 bg-gray-800">
      <div class="flex items-center justify-between text-sm text-gray-400">
        <div class="flex items-center space-x-6">
          <span>{{ tasksWithDates.length }} tasks with dates</span>
          <span>{{ overdueTasks }} overdue</span>
          <span>{{ upcomingTasks }} due this week</span>
        </div>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-blue-600 rounded" />
            <span>In Progress</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-600 rounded" />
            <span>Completed</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-yellow-500 rotate-45" />
            <span>Milestone</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Icons
const ChevronLeftIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>`
}

const ChevronRightIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`
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
const emit = defineEmits(['task-click', 'task-updated'])

// State
const timeRange = ref('weeks') // 'weeks' or 'months'
const currentDate = ref(new Date())
const periodWidth = 120 // pixels per period

// Computed
const tasksWithDates = computed(() => {
  return props.tasks.filter(task => task.dueDate || task.startDate).map(task => ({
    ...task,
    startDate: task.startDate || task.createdAt || new Date().toISOString().split('T')[0],
    progress: task.progress || 0
  }))
})

const timelinePeriods = computed(() => {
  const periods = []
  const start = new Date(currentDate.value)

  if (timeRange.value === 'weeks') {
    // Show 8 weeks
    start.setDate(start.getDate() - start.getDay()) // Start of week
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      periods.push({
        key: `week-${i}`,
        label: `Week ${getWeekNumber(weekStart)}`,
        sublabel: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        position: i,
        startDate: weekStart,
        endDate: weekEnd
      })
    }
  } else {
    // Show 6 months
    start.setDate(1) // Start of month
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0)

      periods.push({
        key: `month-${i}`,
        label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        sublabel: monthStart.getFullYear().toString(),
        position: i,
        startDate: monthStart,
        endDate: monthEnd
      })
    }
  }

  return periods
})

const todayPosition = computed(() => {
  const today = new Date()
  return getDatePosition(today.toISOString().split('T')[0])
})

const overdueTasks = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return tasksWithDates.value.filter(task =>
    task.status !== 'done'
    && task.dueDate
    && new Date(task.dueDate) < today
  ).length
})

const upcomingTasks = computed(() => {
  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(today.getDate() + 7)

  return tasksWithDates.value.filter(task =>
    task.dueDate
    && new Date(task.dueDate) >= today
    && new Date(task.dueDate) <= nextWeek
  ).length
})

// Methods
const navigateTime = (direction) => {
  const newDate = new Date(currentDate.value)

  if (timeRange.value === 'weeks') {
    newDate.setDate(newDate.getDate() + (direction * 7))
  } else {
    newDate.setMonth(newDate.getMonth() + direction)
  }

  currentDate.value = newDate
}

const goToToday = () => {
  currentDate.value = new Date()
}

const getDatePosition = (dateString) => {
  const date = new Date(dateString)
  const firstPeriod = timelinePeriods.value[0]
  if (!firstPeriod) return 0

  const startDate = firstPeriod.startDate
  const diffTime = date - startDate

  if (timeRange.value === 'weeks') {
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return (diffDays / 7) * periodWidth
  } else {
    const diffMonths = (date.getFullYear() - startDate.getFullYear()) * 12 + date.getMonth() - startDate.getMonth()
    const dayOfMonth = date.getDate() - 1
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return (diffMonths + dayOfMonth / daysInMonth) * periodWidth
  }
}

const getTaskBarStyle = (task) => {
  const startPos = getDatePosition(task.startDate)
  const endPos = getDatePosition(task.dueDate)
  const width = Math.max(endPos - startPos, 20) // Minimum width of 20px

  return {
    left: startPos + 'px',
    width: width + 'px'
  }
}

const getTaskBarColor = (task) => {
  if (task.status === 'done') {
    return 'bg-green-600 border-green-500'
  }
  if (task.status === 'in-progress') {
    return 'bg-blue-600 border-blue-500'
  }
  if (task.priority === 'high') {
    return 'bg-red-600 border-red-500'
  }
  return 'bg-gray-600 border-gray-500'
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
      return 'text-gray-400'
    case 'in-progress':
      return 'text-blue-400'
    case 'review':
      return 'text-yellow-400'
    case 'done':
      return 'text-green-400'
    default:
      return 'text-gray-400'
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

const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${start} - ${end}`
}

const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Lifecycle
onMounted(() => {
  // Center view on current month/week
  goToToday()
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-auto::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.overflow-auto::-webkit-scrollbar-track,
.overflow-y-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
}

.overflow-auto::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover,
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

/* Timeline specific styles */
.timeline-view {
  min-height: 600px;
}

/* Task bar animations */
.group {
  transition: all 0.2s ease;
}

.group:hover {
  z-index: 10;
}

/* Tooltip styles */
.group:hover .absolute.-top-8 {
  animation: fadeInUp 0.15s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Grid lines */
.absolute.inset-0 .absolute {
  opacity: 0.1;
}

/* Today line animation */
.w-0\.5.bg-red-500 {
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.transition-all {
  transition: all 0.15s ease;
}
</style>
