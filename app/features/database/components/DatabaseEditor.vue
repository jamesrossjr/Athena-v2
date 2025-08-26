<template>
  <div class="database-editor w-full h-full bg-white flex flex-col">
    <!-- Toolbar -->
    <div class="border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <!-- Add Row -->
        <button
          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1"
          @click="addRow"
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
          <span>Add Row</span>
        </button>

        <!-- Add Column -->
        <button
          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1"
          @click="showAddColumn = true"
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
          <span>Add Column</span>
        </button>

        <div class="w-px h-6 bg-gray-300" />

        <!-- Filter -->
        <button
          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1"
          @click="showFilter = !showFilter"
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span>Filter</span>
        </button>

        <!-- Sort -->
        <button
          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center space-x-1"
          @click="showSort = !showSort"
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
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <span>Sort</span>
        </button>
      </div>

      <div class="flex items-center space-x-2">
        <!-- View Type -->
        <div class="flex items-center space-x-1 bg-white border border-gray-300 rounded">
          <button
            :class="[
              'px-3 py-1 text-sm',
              viewType === 'table' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'
            ]"
            @click="viewType = 'table'"
          >
            Table
          </button>
          <button
            :class="[
              'px-3 py-1 text-sm',
              viewType === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'
            ]"
            @click="viewType = 'grid'"
          >
            Grid
          </button>
          <button
            :class="[
              'px-3 py-1 text-sm',
              viewType === 'kanban' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'
            ]"
            @click="viewType = 'kanban'"
          >
            Kanban
          </button>
        </div>

        <!-- Search -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
          <svg
            class="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div
      v-if="showFilter"
      class="border-b border-gray-200 bg-gray-50 px-4 py-2"
    >
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">Filter by:</span>
        <select
          v-model="filterColumn"
          class="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">
            Select column
          </option>
          <option
            v-for="col in columns"
            :key="col.id"
            :value="col.id"
          >
            {{ col.name }}
          </option>
        </select>
        <select
          v-model="filterOperator"
          class="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="equals">
            Equals
          </option>
          <option value="contains">
            Contains
          </option>
          <option value="starts">
            Starts with
          </option>
          <option value="ends">
            Ends with
          </option>
        </select>
        <input
          v-model="filterValue"
          type="text"
          placeholder="Value"
          class="text-sm border border-gray-300 rounded px-2 py-1"
        >
        <button
          class="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="applyFilter"
        >
          Apply
        </button>
        <button
          class="text-sm px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          @click="clearFilter"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-auto">
      <!-- Table View -->
      <div
        v-if="viewType === 'table'"
        class="min-w-full"
      >
        <table class="w-full border-collapse">
          <thead class="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th class="w-12 border border-gray-300 bg-gray-100">
                <input
                  type="checkbox"
                  class="rounded"
                  @change="selectAll"
                >
              </th>
              <th
                v-for="column in columns"
                :key="column.id"
                class="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 bg-gray-100"
              >
                <div class="flex items-center justify-between">
                  <span>{{ column.name }}</span>
                  <div class="flex items-center space-x-1">
                    <button
                      class="p-1 hover:bg-gray-200 rounded"
                      @click="sortByColumn(column.id)"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                      </svg>
                    </button>
                    <button
                      class="p-1 hover:bg-gray-200 rounded"
                      @click="editColumn(column)"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, _rowIndex) in filteredRows"
              :key="row.id"
              :class="{ 'bg-blue-50': selectedRows.includes(row.id) }"
            >
              <td class="border border-gray-300 text-center">
                <input
                  type="checkbox"
                  class="rounded"
                  :checked="selectedRows.includes(row.id)"
                  @change="toggleRowSelection(row.id)"
                >
              </td>
              <td
                v-for="column in columns"
                :key="column.id"
                class="border border-gray-300 px-4 py-2"
              >
                <div
                  v-if="editingCell?.row === row.id && editingCell?.column === column.id"
                  class="flex items-center"
                >
                  <input
                    v-model="editingCell.value"
                    type="text"
                    class="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none"
                    @blur="saveCell"
                    @keydown.enter="saveCell"
                    @keydown.escape="cancelEdit"
                  >
                </div>
                <div
                  v-else
                  class="cursor-pointer hover:bg-gray-50 px-2 py-1 -mx-2 -my-1"
                  @dblclick="startEdit(row.id, column.id, row[column.id])"
                >
                  <span v-if="column.type === 'checkbox'">
                    <input
                      type="checkbox"
                      :checked="row[column.id]"
                      @change="updateCell(row.id, column.id, !row[column.id])"
                    >
                  </span>
                  <span v-else-if="column.type === 'select'">
                    <select
                      :value="row[column.id]"
                      class="text-sm border border-gray-300 rounded px-1"
                      @change="updateCell(row.id, column.id, $event.target.value)"
                    >
                      <option
                        v-for="option in column.options"
                        :key="option"
                        :value="option"
                      >
                        {{ option }}
                      </option>
                    </select>
                  </span>
                  <span v-else>
                    {{ row[column.id] || '' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grid View -->
      <div
        v-else-if="viewType === 'grid'"
        class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="row in filteredRows"
          :key="row.id"
          class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <div
            v-for="column in columns"
            :key="column.id"
            class="mb-2"
          >
            <span class="text-xs text-gray-500">{{ column.name }}:</span>
            <div class="font-medium">
              {{ row[column.id] || '-' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Kanban View -->
      <div
        v-else-if="viewType === 'kanban'"
        class="p-4 flex space-x-4 overflow-x-auto"
      >
        <div
          v-for="status in kanbanStatuses"
          :key="status"
          class="bg-gray-50 rounded-lg p-4 min-w-[300px]"
        >
          <h3 class="font-semibold text-gray-700 mb-3">
            {{ status }}
          </h3>
          <div class="space-y-2">
            <div
              v-for="row in getKanbanCards(status)"
              :key="row.id"
              class="bg-white border border-gray-200 rounded p-3 cursor-move hover:shadow-md transition-shadow"
              draggable="true"
              @dragstart="handleDragStart(row, status)"
              @dragover.prevent
              @drop="handleDrop(status)"
            >
              <div
                v-for="column in columns.slice(0, 3)"
                :key="column.id"
                class="text-sm"
              >
                <span class="text-gray-500">{{ column.name }}:</span>
                <span class="ml-1">{{ row[column.id] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Column Modal -->
    <div
      v-if="showAddColumn"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-96">
        <h3 class="text-lg font-semibold mb-4">
          Add Column
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Column Name</label>
            <input
              v-model="newColumn.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
            <select
              v-model="newColumn.type"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">
                Text
              </option>
              <option value="number">
                Number
              </option>
              <option value="date">
                Date
              </option>
              <option value="checkbox">
                Checkbox
              </option>
              <option value="select">
                Select
              </option>
            </select>
          </div>
          <div v-if="newColumn.type === 'select'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Options (comma separated)</label>
            <input
              v-model="newColumn.options"
              type="text"
              placeholder="Option 1, Option 2, Option 3"
              class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-2">
          <button
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            @click="showAddColumn = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            @click="confirmAddColumn"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({ columns: [], rows: [] })
  }
})

const emit = defineEmits(['update:data'])

// State
const viewType = ref('table')
const searchQuery = ref('')
const showFilter = ref(false)
const showSort = ref(false)
const showAddColumn = ref(false)

// Data
const columns = ref([
  { id: 'id', name: 'ID', type: 'number' },
  { id: 'name', name: 'Name', type: 'text' },
  { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
  { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
  { id: 'date', name: 'Date', type: 'date' }
])

const rows = ref([
  { id: 1, name: 'Task 1', status: 'To Do', priority: 'High', date: '2024-01-15' },
  { id: 2, name: 'Task 2', status: 'In Progress', priority: 'Medium', date: '2024-01-16' },
  { id: 3, name: 'Task 3', status: 'Done', priority: 'Low', date: '2024-01-17' }
])

// Selection
const selectedRows = ref([])
const editingCell = ref(null)

// Filtering
const filterColumn = ref('')
const filterOperator = ref('contains')
const filterValue = ref('')
const activeFilter = ref(null)

// Sorting
const sortColumn = ref('')
const sortDirection = ref('asc')

// New Column
const newColumn = ref({
  name: '',
  type: 'text',
  options: ''
})

// Kanban
const kanbanStatuses = ['To Do', 'In Progress', 'Done']
const draggedItem = ref(null)

// Computed
const filteredRows = computed(() => {
  let result = [...rows.value]

  // Apply search
  if (searchQuery.value) {
    result = result.filter((row) => {
      return Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    })
  }

  // Apply filter
  if (activeFilter.value) {
    result = result.filter((row) => {
      const value = String(row[activeFilter.value.column] || '')
      const filterVal = activeFilter.value.value.toLowerCase()

      switch (activeFilter.value.operator) {
        case 'equals':
          return value.toLowerCase() === filterVal
        case 'contains':
          return value.toLowerCase().includes(filterVal)
        case 'starts':
          return value.toLowerCase().startsWith(filterVal)
        case 'ends':
          return value.toLowerCase().endsWith(filterVal)
        default:
          return true
      }
    })
  }

  // Apply sort
  if (sortColumn.value) {
    result.sort((a, b) => {
      const aVal = a[sortColumn.value]
      const bVal = b[sortColumn.value]

      if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return result
})

// Methods
const addRow = () => {
  const newRow = { id: Date.now() }
  columns.value.forEach((col) => {
    if (col.id !== 'id') {
      newRow[col.id] = col.type === 'checkbox' ? false : ''
    }
  })
  rows.value.push(newRow)
  emitUpdate()
}

const confirmAddColumn = () => {
  const column = {
    id: newColumn.value.name.toLowerCase().replace(/\s+/g, '_'),
    name: newColumn.value.name,
    type: newColumn.value.type
  }

  if (newColumn.value.type === 'select' && newColumn.value.options) {
    column.options = newColumn.value.options.split(',').map(o => o.trim())
  }

  columns.value.push(column)

  // Add default values to existing rows
  rows.value.forEach((row) => {
    row[column.id] = column.type === 'checkbox' ? false : ''
  })

  newColumn.value = { name: '', type: 'text', options: '' }
  showAddColumn.value = false
  emitUpdate()
}

const selectAll = (e) => {
  if (e.target.checked) {
    selectedRows.value = rows.value.map(r => r.id)
  } else {
    selectedRows.value = []
  }
}

const toggleRowSelection = (rowId) => {
  const index = selectedRows.value.indexOf(rowId)
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(rowId)
  }
}

const startEdit = (rowId, columnId, value) => {
  editingCell.value = { row: rowId, column: columnId, value }
}

const saveCell = () => {
  if (editingCell.value) {
    updateCell(editingCell.value.row, editingCell.value.column, editingCell.value.value)
    editingCell.value = null
  }
}

const cancelEdit = () => {
  editingCell.value = null
}

const updateCell = (rowId, columnId, value) => {
  const row = rows.value.find(r => r.id === rowId)
  if (row) {
    row[columnId] = value
    emitUpdate()
  }
}

const sortByColumn = (columnId) => {
  if (sortColumn.value === columnId) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = columnId
    sortDirection.value = 'asc'
  }
}

const editColumn = (column) => {
  // Implementation for column editing
  console.log('Edit column:', column)
}

const applyFilter = () => {
  if (filterColumn.value && filterValue.value) {
    activeFilter.value = {
      column: filterColumn.value,
      operator: filterOperator.value,
      value: filterValue.value
    }
  }
}

const clearFilter = () => {
  activeFilter.value = null
  filterColumn.value = ''
  filterOperator.value = 'contains'
  filterValue.value = ''
}

const getKanbanCards = (status) => {
  return filteredRows.value.filter(row => row.status === status)
}

const handleDragStart = (row, status) => {
  draggedItem.value = { row, status }
}

const handleDrop = (newStatus) => {
  if (draggedItem.value) {
    const row = rows.value.find(r => r.id === draggedItem.value.row.id)
    if (row) {
      row.status = newStatus
      emitUpdate()
    }
    draggedItem.value = null
  }
}

const emitUpdate = () => {
  emit('update:data', { columns: columns.value, rows: rows.value })
}

// Lifecycle
onMounted(() => {
  if (props.initialData?.columns) {
    columns.value = props.initialData.columns
  }
  if (props.initialData?.rows) {
    rows.value = props.initialData.rows
  }
})
</script>

<style scoped>
.database-editor {
  font-family: 'Inter', sans-serif;
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>
