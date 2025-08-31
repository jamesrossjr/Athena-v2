<!--
  List View Component - Opinionated Minimalism Design

  Features:
  - Sortable columns (title, priority, status, due date, assignee)
  - Filterable by status, priority, assignee
  - Bulk selection and actions
  - Keyboard navigation
  - Professional data table design
  - Contextual row actions
-->

<template>
  <div class="list-view h-full flex flex-col bg-gray-900">
    <!-- Controls Bar -->
    <div class="flex items-center justify-between p-6 border-b border-gray-700">
      <!-- Filters -->
      <div class="flex items-center space-x-4">
        <!-- Status Filter -->
        <div class="relative">
          <select
            v-model="filters.status"
            class="appearance-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-8 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">
              All Status
            </option>
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
          <ChevronDownIcon class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <!-- Priority Filter -->
        <div class="relative">
          <select
            v-model="filters.priority"
            class="appearance-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-8 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">
              All Priority
            </option>
            <option value="high">
              High
            </option>
            <option value="medium">
              Medium
            </option>
            <option value="low">
              Low
            </option>
          </select>
          <ChevronDownIcon class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <!-- Search -->
        <div class="relative">
          <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search tasks..."
            class="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-2">
        <!-- Bulk Actions -->
        <div
          v-if="selectedTasks.length > 0"
          class="flex items-center space-x-2 mr-4"
        >
          <span class="text-sm text-gray-400">{{ selectedTasks.length }} selected</span>
          <button
            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            @click="handleBulkDelete"
          >
            Delete
          </button>
          <button
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            @click="handleBulkStatusChange"
          >
            Change Status
          </button>
        </div>

        <!-- View Options -->
        <button
          class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          @click="$emit('add-task')"
        >
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full">
        <!-- Header -->
        <thead class="sticky top-0 bg-gray-800 border-b border-gray-700">
          <tr>
            <!-- Select All -->
            <th class="w-12 p-4 text-left">
              <input
                type="checkbox"
                :checked="allTasksSelected"
                :indeterminate="someTasksSelected"
                class="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                @change="handleSelectAll"
              >
            </th>

            <!-- Title -->
            <th class="px-4 py-3 text-left">
              <button
                class="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
                @click="handleSort('title')"
              >
                <span>Title</span>
                <SortIcon
                  :class="[
                    'w-4 h-4 transition-transform',
                    sortBy === 'title' && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortBy === 'title' ? 'text-blue-400' : 'text-gray-500'
                  ]"
                />
              </button>
            </th>

            <!-- Status -->
            <th class="px-4 py-3 text-left">
              <button
                class="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
                @click="handleSort('status')"
              >
                <span>Status</span>
                <SortIcon
                  :class="[
                    'w-4 h-4 transition-transform',
                    sortBy === 'status' && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortBy === 'status' ? 'text-blue-400' : 'text-gray-500'
                  ]"
                />
              </button>
            </th>

            <!-- Priority -->
            <th class="px-4 py-3 text-left">
              <button
                class="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
                @click="handleSort('priority')"
              >
                <span>Priority</span>
                <SortIcon
                  :class="[
                    'w-4 h-4 transition-transform',
                    sortBy === 'priority' && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortBy === 'priority' ? 'text-blue-400' : 'text-gray-500'
                  ]"
                />
              </button>
            </th>

            <!-- Assignee -->
            <th class="px-4 py-3 text-left">
              <button
                class="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
                @click="handleSort('assignee')"
              >
                <span>Assignee</span>
                <SortIcon
                  :class="[
                    'w-4 h-4 transition-transform',
                    sortBy === 'assignee' && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortBy === 'assignee' ? 'text-blue-400' : 'text-gray-500'
                  ]"
                />
              </button>
            </th>

            <!-- Due Date -->
            <th class="px-4 py-3 text-left">
              <button
                class="flex items-center space-x-1 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
                @click="handleSort('dueDate')"
              >
                <span>Due Date</span>
                <SortIcon
                  :class="[
                    'w-4 h-4 transition-transform',
                    sortBy === 'dueDate' && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortBy === 'dueDate' ? 'text-blue-400' : 'text-gray-500'
                  ]"
                />
              </button>
            </th>

            <!-- Actions -->
            <th class="w-20 px-4 py-3 text-right">
              <span class="text-sm font-medium text-gray-300">Actions</span>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <tr
            v-for="task in sortedAndFilteredTasks"
            :key="task.id"
            class="border-b border-gray-700 hover:bg-gray-800/50 transition-colors group cursor-pointer"
            @click="handleTaskClick(task)"
          >
            <!-- Checkbox -->
            <td
              class="p-4"
              @click.stop
            >
              <input
                type="checkbox"
                :checked="selectedTasks.includes(task.id)"
                class="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                @change="handleTaskSelect(task.id, $event)"
              >
            </td>

            <!-- Title -->
            <td class="px-4 py-3">
              <div class="flex items-center space-x-3">
                <div :class="['w-1 h-8 rounded-full', getPriorityColor(task.priority)]" />
                <div class="min-w-0 flex-1">
                  <div class="font-medium text-gray-100 truncate">
                    {{ task.title }}
                  </div>
                  <div
                    v-if="task.description"
                    class="text-sm text-gray-400 truncate mt-1"
                  >
                    {{ task.description }}
                  </div>
                  <!-- Labels -->
                  <div
                    v-if="task.labels && task.labels.length"
                    class="flex flex-wrap gap-1 mt-1"
                  >
                    <span
                      v-for="label in task.labels.slice(0, 3)"
                      :key="label"
                      class="px-2 py-0.5 bg-blue-900/30 text-blue-300 text-xs rounded-full"
                    >
                      {{ label }}
                    </span>
                    <span
                      v-if="task.labels.length > 3"
                      class="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full"
                    >
                      +{{ task.labels.length - 3 }}
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Status -->
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusColor(task.status)
                ]"
              >
                {{ getStatusLabel(task.status) }}
              </span>
            </td>

            <!-- Priority -->
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getPriorityBadgeColor(task.priority)
                ]"
              >
                {{ getPriorityLabel(task.priority) }}
              </span>
            </td>

            <!-- Assignee -->
            <td class="px-4 py-3">
              <div
                v-if="task.assignee"
                class="flex items-center space-x-2"
              >
                <div class="w-6 h-6 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {{ task.assignee.avatar || task.assignee.name.charAt(0) }}
                </div>
                <span class="text-sm text-gray-100 truncate">{{ task.assignee.name }}</span>
              </div>
              <span
                v-else
                class="text-sm text-gray-500"
              >Unassigned</span>
            </td>

            <!-- Due Date -->
            <td class="px-4 py-3">
              <span
                v-if="task.dueDate"
                :class="[
                  'text-sm',
                  getDueDateColor(task.dueDate, task.status)
                ]"
              >
                {{ formatDueDate(task.dueDate) }}
              </span>
              <span
                v-else
                class="text-sm text-gray-500"
              >No due date</span>
            </td>

            <!-- Actions -->
            <td
              class="px-4 py-3 text-right"
              @click.stop
            >
              <button
                class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-all"
                @click="$emit('task-menu', task)"
              >
                <DotsIcon class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="sortedAndFilteredTasks.length === 0"
        class="flex flex-col items-center justify-center h-64"
      >
        <div class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <SearchIcon class="w-8 h-8 text-gray-600" />
        </div>
        <h3 class="text-lg font-medium text-gray-300 mb-2">
          No tasks found
        </h3>
        <p class="text-gray-500 text-center max-w-md">
          {{ Object.values(filters).some(f => f) ? 'Try adjusting your filters or search term.' : 'Create your first task to get started.' }}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="sortedAndFilteredTasks.length > 0"
      class="px-6 py-4 border-t border-gray-700 bg-gray-800"
    >
      <div class="flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing {{ sortedAndFilteredTasks.length }} of {{ tasks.length }} tasks
        </div>
        <div class="flex items-center space-x-4">
          <span>{{ selectedTasks.length }} selected</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Icons
const ChevronDownIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`
}

const SearchIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`
}

const PlusIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>`
}

const SortIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>`
}

const DotsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>`
}

// Props
const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
})

// Emits
const emit = defineEmits(['task-click', 'task-menu', 'add-task', 'bulk-delete', 'bulk-status-change'])

// State
const filters = ref({
  status: '',
  priority: '',
  search: ''
})

const sortBy = ref('title')
const sortOrder = ref('asc')
const selectedTasks = ref([])

// Computed
const sortedAndFilteredTasks = computed(() => {
  const filtered = props.tasks.filter((task) => {
    const matchesStatus = !filters.value.status || task.status === filters.value.status
    const matchesPriority = !filters.value.priority || task.priority === filters.value.priority
    const matchesSearch = !filters.value.search
      || task.title.toLowerCase().includes(filters.value.search.toLowerCase())
      || (task.description && task.description.toLowerCase().includes(filters.value.search.toLowerCase()))
      || (task.assignee && task.assignee.name.toLowerCase().includes(filters.value.search.toLowerCase()))

    return matchesStatus && matchesPriority && matchesSearch
  })

  // Sort
  filtered.sort((a, b) => {
    let aValue = a[sortBy.value]
    let bValue = b[sortBy.value]

    // Handle nested properties
    if (sortBy.value === 'assignee') {
      aValue = a.assignee?.name || ''
      bValue = b.assignee?.name || ''
    }

    // Handle dates
    if (sortBy.value === 'dueDate') {
      aValue = aValue ? new Date(aValue) : new Date('9999-12-31')
      bValue = bValue ? new Date(bValue) : new Date('9999-12-31')
    }

    // Handle priority ordering
    if (sortBy.value === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      aValue = priorityOrder[aValue] || 0
      bValue = priorityOrder[bValue] || 0
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return filtered
})

const allTasksSelected = computed(() => {
  return sortedAndFilteredTasks.value.length > 0
    && selectedTasks.value.length === sortedAndFilteredTasks.value.length
})

const someTasksSelected = computed(() => {
  return selectedTasks.value.length > 0
    && selectedTasks.value.length < sortedAndFilteredTasks.value.length
})

// Methods
const handleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = 'asc'
  }
}

const handleTaskSelect = (taskId, event) => {
  if (event.target.checked) {
    selectedTasks.value.push(taskId)
  } else {
    const index = selectedTasks.value.indexOf(taskId)
    if (index > -1) {
      selectedTasks.value.splice(index, 1)
    }
  }
}

const handleSelectAll = (event) => {
  if (event.target.checked) {
    selectedTasks.value = sortedAndFilteredTasks.value.map(task => task.id)
  } else {
    selectedTasks.value = []
  }
}

const handleTaskClick = (task) => {
  emit('task-click', task)
}

const handleBulkDelete = () => {
  if (confirm(`Are you sure you want to delete ${selectedTasks.value.length} tasks?`)) {
    emit('bulk-delete', selectedTasks.value)
    selectedTasks.value = []
  }
}

const handleBulkStatusChange = () => {
  // This would open a modal or dropdown for status selection
  emit('bulk-status-change', selectedTasks.value)
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

const getPriorityBadgeColor = (priority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-900/30 text-red-300'
    case 'low':
      return 'bg-green-900/30 text-green-300'
    default:
      return 'bg-blue-900/30 text-blue-300'
  }
}

const getPriorityLabel = (priority) => {
  switch (priority) {
    case 'high':
      return 'High'
    case 'low':
      return 'Low'
    default:
      return 'Medium'
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

const getDueDateColor = (dueDate, status) => {
  if (!dueDate || status === 'done') return 'text-gray-400'

  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-red-400'
  if (diffDays <= 3) return 'text-yellow-400'
  return 'text-gray-400'
}

const formatDueDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
/* Custom scrollbar */
.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: theme('colors.gray.800');
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: theme('colors.gray.600');
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.500');
}

/* Table styling */
table {
  border-collapse: separate;
  border-spacing: 0;
}

/* Checkbox styling */
input[type="checkbox"]:indeterminate {
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M 4 8 L 12 8'/%3e%3c/svg%3e");
}

/* Focus styles */
input:focus,
select:focus {
  outline: none;
}

/* Smooth transitions */
.transition-colors {
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.transition-all {
  transition: all 0.15s ease;
}

/* Row hover effect */
tbody tr:hover {
  background-color: rgba(55, 65, 81, 0.5);
}
</style>
