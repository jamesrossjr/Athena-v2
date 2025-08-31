<template>
  <div class="table-block">
    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse border border-gray-300 bg-white">
        <thead>
          <tr class="bg-gray-50">
            <th
              v-for="(header, colIndex) in localContent.headers"
              :key="`header-${colIndex}`"
              class="border border-gray-300 px-4 py-2 relative"
            >
              <input
                v-model="localContent.headers[colIndex]"
                class="w-full bg-transparent border-none outline-none font-semibold text-left"
                placeholder="Header"
                @input="updateContent"
              >
              <button
                v-if="localContent.headers.length > 1"
                class="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xs"
                @click="removeColumn(colIndex)"
              >
                ✕
              </button>
            </th>
            <th class="border border-gray-300 px-2 py-2 w-8">
              <button
                class="text-gray-400 hover:text-blue-500 text-sm"
                title="Add column"
                @click="addColumn"
              >
                +
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in localContent.rows"
            :key="`row-${rowIndex}`"
            class="hover:bg-gray-50"
          >
            <td
              v-for="(cell, colIndex) in row"
              :key="`cell-${rowIndex}-${colIndex}`"
              class="border border-gray-300 px-4 py-2 relative"
            >
              <input
                v-model="localContent.rows[rowIndex][colIndex]"
                class="w-full bg-transparent border-none outline-none"
                placeholder="Cell content"
                @input="updateContent"
              >
            </td>
            <td class="border border-gray-300 px-2 py-2 w-8">
              <button
                v-if="localContent.rows.length > 1"
                class="text-gray-400 hover:text-red-500 text-sm"
                title="Remove row"
                @click="removeRow(rowIndex)"
              >
                ✕
              </button>
            </td>
          </tr>
          <tr>
            <td
              :colspan="localContent.headers.length + 1"
              class="border border-gray-300 px-4 py-2 text-center"
            >
              <button
                class="text-gray-400 hover:text-blue-500 text-sm"
                title="Add row"
                @click="addRow"
              >
                + Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table controls -->
    <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
      <div class="flex items-center space-x-4">
        <span>{{ localContent.rows.length }} rows × {{ localContent.headers.length }} columns</span>
      </div>
      <div class="flex items-center space-x-2">
        <button
          class="hover:text-blue-500"
          @click="toggleStriped"
        >
          {{ localContent.striped ? 'Remove' : 'Add' }} stripes
        </button>
        <button
          class="hover:text-blue-500"
          @click="exportCSV"
        >
          Export CSV
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

// Create local reactive copy to avoid mutating props
const localContent = reactive({ ...props.content })

// Initialize striped if not set
if (localContent.striped === undefined) {
  localContent.striped = false
}

// Watch for prop changes to sync local copy
watch(() => props.content, (newContent) => {
  Object.assign(localContent, newContent)
}, { deep: true })

const updateContent = () => {
  emit('update', { ...localContent })
}

const addColumn = () => {
  localContent.headers.push(`Column ${localContent.headers.length + 1}`)
  localContent.rows.forEach(row => row.push(''))
  updateContent()
}

const removeColumn = (colIndex) => {
  if (localContent.headers.length <= 1) return
  localContent.headers.splice(colIndex, 1)
  localContent.rows.forEach(row => row.splice(colIndex, 1))
  updateContent()
}

const addRow = () => {
  const newRow = Array(localContent.headers.length).fill('')
  localContent.rows.push(newRow)
  updateContent()
}

const removeRow = (rowIndex) => {
  if (localContent.rows.length <= 1) return
  localContent.rows.splice(rowIndex, 1)
  updateContent()
}

const toggleStriped = () => {
  localContent.striped = !localContent.striped
  updateContent()
}

const exportCSV = () => {
  const csvContent = [
    localContent.headers.join(','),
    ...localContent.rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'table-data.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.table-block {
  margin: 1rem 0;
}

.table-block input:focus {
  background-color: #f9fafb;
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
  border-radius: 2px;
}

tbody tr:nth-child(even) {
  background-color: v-bind('localContent.striped ? "#f9fafb" : "transparent"');
}
</style>
