<!--
  Project Management Workspace - Opinionated Minimalism

  Features:
  - Dark mode with single accent color (blue)
  - 4 core views: Kanban, List, Timeline, Calendar
  - Contextual dynamic buttons
  - Subtle data indicators
  - Command center integration
  - Automation system
-->

<template>
  <div class="project-workspace h-full bg-gray-900 text-gray-100 flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <!-- Project Info -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span class="text-sm font-semibold text-white">{{ currentProject.name.charAt(0) }}</span>
          </div>
          <div>
            <h1 class="text-lg font-semibold text-white">
              {{ currentProject.name }}
            </h1>
            <p class="text-sm text-gray-400">
              {{ currentProject.description }}
            </p>
          </div>
        </div>

        <!-- Subtle Indicators -->
        <div class="flex items-center space-x-4 ml-6">
          <div
            v-if="overdueTasks > 0"
            class="flex items-center space-x-1 px-2 py-1 bg-red-900/20 rounded-lg"
          >
            <div class="w-2 h-2 bg-red-500 rounded-full" />
            <span class="text-xs text-red-400">{{ overdueTasks }} overdue</span>
          </div>
          <div class="flex items-center space-x-1 px-2 py-1 bg-gray-800 rounded-lg">
            <div class="w-2 h-2 bg-blue-500 rounded-full" />
            <span class="text-xs text-gray-400">{{ activeTasks }} active</span>
          </div>
        </div>
      </div>

      <!-- View Toggle & Actions -->
      <div class="flex items-center space-x-4">
        <!-- View Selector -->
        <div class="flex items-center bg-gray-800 rounded-lg p-1">
          <button
            v-for="view in views"
            :key="view.id"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              currentView === view.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            ]"
            @click="setCurrentView(view.id)"
          >
            <component
              :is="view.icon"
              class="w-4 h-4 mr-1.5"
            />
            {{ view.name }}
          </button>
        </div>

        <!-- Contextual Actions -->
        <div class="flex items-center space-x-2">
          <button
            v-for="action in contextualActions"
            :key="action.id"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2',
              action.primary
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            ]"
            @click="executeAction(action)"
          >
            <component
              :is="action.icon"
              class="w-4 h-4"
            />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-hidden">
      <!-- Kanban View -->
      <KanbanBoard
        v-if="currentView === 'kanban'"
        :tasks="tasks"
        :columns="kanbanColumns"
        @task-moved="handleTaskMoved"
        @task-created="handleTaskCreated"
        @task-updated="handleTaskUpdated"
      />

      <!-- List View -->
      <ListView
        v-else-if="currentView === 'list'"
        :tasks="tasks"
        :columns="listColumns"
        @task-updated="handleTaskUpdated"
        @sort-changed="handleSortChanged"
      />

      <!-- Timeline View -->
      <TimelineView
        v-else-if="currentView === 'timeline'"
        :tasks="tasks"
        :projects="[currentProject]"
        @task-updated="handleTaskUpdated"
      />

      <!-- Calendar View -->
      <CalendarView
        v-else-if="currentView === 'calendar'"
        :tasks="tasksWithDueDates"
        @task-updated="handleTaskUpdated"
        @date-selected="handleDateSelected"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import KanbanBoard from './KanbanBoard.vue'
import ListView from './ListView.vue'
import TimelineView from './TimelineView.vue'
import CalendarView from './CalendarView.vue'

// Icons (simple SVG components)
const KanbanIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>`
}

const ListIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`
}

const TimelineIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`
}

const CalendarIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
}

const PlusIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>`
}

const FilterIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"/></svg>`
}

const SortIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>`
}

const SettingsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
}

// State
const currentView = ref('kanban')
const currentProject = ref({
  id: 'proj-1',
  name: 'Q4 Product Launch',
  description: 'Coordinate the launch of our new product line'
})

// Views configuration
const views = ref([
  { id: 'kanban', name: 'Board', icon: KanbanIcon },
  { id: 'list', name: 'List', icon: ListIcon },
  { id: 'timeline', name: 'Timeline', icon: TimelineIcon },
  { id: 'calendar', name: 'Calendar', icon: CalendarIcon }
])

// Sample data - replace with real data
const tasks = ref([
  {
    id: 'task-1',
    title: 'Design UI mockups',
    description: 'Create wireframes and visual designs for the new features',
    status: 'todo',
    priority: 'high',
    assignee: { name: 'Sarah Chen', avatar: 'SC' },
    dueDate: '2024-01-15',
    labels: ['design', 'ui'],
    createdAt: '2024-01-01'
  },
  {
    id: 'task-2',
    title: 'Implement authentication system',
    description: 'Build secure login and user management',
    status: 'in-progress',
    priority: 'high',
    assignee: { name: 'Mike Johnson', avatar: 'MJ' },
    dueDate: '2024-01-20',
    labels: ['backend', 'security'],
    createdAt: '2024-01-02'
  },
  {
    id: 'task-3',
    title: 'Write API documentation',
    description: 'Document all endpoints and usage examples',
    status: 'review',
    priority: 'medium',
    assignee: { name: 'Alex Kim', avatar: 'AK' },
    dueDate: '2024-01-18',
    labels: ['documentation'],
    createdAt: '2024-01-03'
  },
  {
    id: 'task-4',
    title: 'Set up CI/CD pipeline',
    description: 'Automate testing and deployment processes',
    status: 'done',
    priority: 'medium',
    assignee: { name: 'Jamie Liu', avatar: 'JL' },
    dueDate: '2024-01-12',
    labels: ['devops', 'automation'],
    createdAt: '2024-01-04'
  }
])

// Kanban columns
const kanbanColumns = ref([
  { id: 'todo', name: 'To Do', color: 'bg-gray-700' },
  { id: 'in-progress', name: 'In Progress', color: 'bg-blue-600' },
  { id: 'review', name: 'Review', color: 'bg-yellow-600' },
  { id: 'done', name: 'Done', color: 'bg-green-600' }
])

// List view columns
const listColumns = ref([
  { id: 'title', name: 'Task', sortable: true, width: 'flex-1' },
  { id: 'assignee', name: 'Assignee', sortable: true, width: 'w-32' },
  { id: 'status', name: 'Status', sortable: true, width: 'w-28' },
  { id: 'priority', name: 'Priority', sortable: true, width: 'w-24' },
  { id: 'dueDate', name: 'Due Date', sortable: true, width: 'w-32' }
])

// Computed properties
const overdueTasks = computed(() => {
  const today = new Date()
  return tasks.value.filter(task =>
    task.dueDate && new Date(task.dueDate) < today && task.status !== 'done'
  ).length
})

const activeTasks = computed(() => {
  return tasks.value.filter(task =>
    task.status !== 'done'
  ).length
})

const tasksWithDueDates = computed(() => {
  return tasks.value.filter(task => task.dueDate)
})

// Contextual actions based on current view
const contextualActions = computed(() => {
  const baseActions = []

  switch (currentView.value) {
    case 'kanban':
      return [
        { id: 'new-card', label: 'New Card', icon: PlusIcon, primary: true },
        { id: 'manage-columns', label: 'Columns', icon: SettingsIcon, primary: false }
      ]

    case 'list':
      return [
        { id: 'new-task', label: 'New Task', icon: PlusIcon, primary: true },
        { id: 'sort', label: 'Sort', icon: SortIcon, primary: false },
        { id: 'filter', label: 'Filter', icon: FilterIcon, primary: false }
      ]

    case 'timeline':
      return [
        { id: 'new-task', label: 'New Task', icon: PlusIcon, primary: true },
        { id: 'zoom', label: 'Zoom', icon: SettingsIcon, primary: false }
      ]

    case 'calendar':
      return [
        { id: 'new-event', label: 'New Event', icon: PlusIcon, primary: true },
        { id: 'view-options', label: 'View', icon: SettingsIcon, primary: false }
      ]

    default:
      return []
  }
})

// Methods
const setCurrentView = (viewId) => {
  currentView.value = viewId
}

const executeAction = (action) => {
  switch (action.id) {
    case 'new-card':
    case 'new-task':
      handleNewTask()
      break
    case 'new-event':
      handleNewEvent()
      break
    case 'sort':
      handleSort()
      break
    case 'filter':
      handleFilter()
      break
    case 'manage-columns':
      handleManageColumns()
      break
    default:
      console.log('Action:', action.id)
  }
}

const handleNewTask = () => {
  // Create new task - integrate with command center later
  const newTask = {
    id: `task-${Date.now()}`,
    title: 'New Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: null,
    dueDate: null,
    labels: [],
    createdAt: new Date().toISOString()
  }

  tasks.value.unshift(newTask)
  console.log('Created new task:', newTask)
}

const handleNewEvent = () => {
  console.log('Create new event')
}

const handleSort = () => {
  console.log('Open sort options')
}

const handleFilter = () => {
  console.log('Open filter options')
}

const handleManageColumns = () => {
  console.log('Manage kanban columns')
}

const handleTaskMoved = (taskId, fromColumn, toColumn) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (task) {
    task.status = toColumn
    console.log(`Task ${taskId} moved from ${fromColumn} to ${toColumn}`)

    // Trigger automation
    triggerAutomation('task_moved', { task, fromColumn, toColumn })
  }
}

const handleTaskCreated = (taskData) => {
  const newTask = {
    ...taskData,
    id: `task-${Date.now()}`,
    createdAt: new Date().toISOString()
  }

  tasks.value.push(newTask)
  console.log('Task created:', newTask)

  // Trigger automation
  triggerAutomation('task_created', { task: newTask })
}

const handleTaskUpdated = (taskId, updates) => {
  const taskIndex = tasks.value.findIndex(t => t.id === taskId)
  if (taskIndex !== -1) {
    tasks.value[taskIndex] = { ...tasks.value[taskIndex], ...updates }
    console.log('Task updated:', taskId, updates)

    // Trigger automation
    triggerAutomation('task_updated', { task: tasks.value[taskIndex], updates })
  }
}

const handleSortChanged = (sortConfig) => {
  console.log('Sort changed:', sortConfig)
  // Implement sorting logic
}

const handleDateSelected = (date) => {
  console.log('Date selected:', date)
  // Handle calendar date selection
}

// Automation System
const automationRules = ref([
  {
    id: 'auto-1',
    trigger: 'task_moved',
    condition: { toColumn: 'done' },
    action: 'notify_assignee',
    params: { message: 'Task completed!' }
  },
  {
    id: 'auto-2',
    trigger: 'task_created',
    condition: { labels: ['urgent'] },
    action: 'assign_to',
    params: { assignee: 'manager' }
  }
])

const triggerAutomation = (event, data) => {
  const matchingRules = automationRules.value.filter(rule => rule.trigger === event)

  matchingRules.forEach((rule) => {
    if (checkCondition(rule.condition, data)) {
      executeAutomation(rule.action, rule.params, data)
    }
  })
}

const checkCondition = (condition, data) => {
  // Simple condition checking - expand as needed
  for (const [key, value] of Object.entries(condition)) {
    if (data[key] !== value && data.task?.[key] !== value) {
      return false
    }
  }
  return true
}

const executeAutomation = (action, params, data) => {
  console.log('Executing automation:', action, params, data)

  switch (action) {
    case 'notify_assignee':
      // Send notification
      if (data.task?.assignee) {
        console.log(`Notifying ${data.task.assignee.name}: ${params.message}`)
      }
      break

    case 'assign_to':
      // Auto-assign task
      if (data.task) {
        console.log(`Auto-assigning task to ${params.assignee}`)
      }
      break
  }
}

// Integration with command center - expose search/actions
const getSearchableItems = () => {
  return tasks.value.map(task => ({
    id: task.id,
    type: 'task',
    title: task.title,
    description: task.description,
    icon: '📋',
    badge: task.status.toUpperCase(),
    data: task
  }))
}

const executeCommandCenterAction = (action) => {
  switch (action.type) {
    case 'task':
      // Focus on specific task
      console.log('Focus on task:', action.data)
      break

    case 'create_task':
      handleNewTask()
      break

    case 'ai_analyze':
      // AI analysis through command center
      console.log('AI analysis requested')
      break
  }
}

// Lifecycle
onMounted(() => {
  console.log('Project Management Workspace mounted')
})

// Expose methods for command center integration
defineExpose({
  getSearchableItems,
  executeCommandCenterAction,
  currentProject,
  tasks
})
</script>

<style scoped>
/* Dark theme overrides */
.project-workspace {
  background: theme('colors.gray.900');
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
}

::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

/* Focus styles for accessibility */
button:focus {
  outline: 2px solid theme('colors.blue.500');
  outline-offset: 2px;
}
</style>
