<template>
  <div class="table-block">
    <div class="table-header">
      <Icon name="heroicons:table-cells" class="table-icon" />
      <span class="table-title">Table</span>
      <button @click="addColumn" class="add-btn" title="Add column">
        <Icon name="heroicons:plus" />
        Col
      </button>
      <button @click="addRow" class="add-btn" title="Add row">
        <Icon name="heroicons:plus" />
        Row
      </button>
    </div>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th 
              v-for="(col, colIndex) in columns" 
              :key="colIndex"
              class="table-header-cell"
            >
              <input
                v-model="col.name"
                @input="updateTable"
                @keydown="handleHeaderKeydown($event, colIndex)"
                class="header-input"
                placeholder="Header..."
              />
              <button 
                @click="removeColumn(colIndex)"
                class="remove-col-btn"
                v-if="columns.length > 1"
              >
                <Icon name="heroicons:x-mark" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(row, rowIndex) in rows" 
            :key="rowIndex"
            class="table-row"
          >
            <td 
              v-for="(col, colIndex) in columns" 
              :key="colIndex"
              class="table-cell"
            >
              <input
                v-model="row[colIndex]"
                @input="updateTable"
                @keydown="handleCellKeydown($event, rowIndex, colIndex)"
                class="cell-input"
                placeholder="-"
              />
            </td>
            <td class="row-actions">
              <button 
                @click="removeRow(rowIndex)"
                class="remove-row-btn"
                v-if="rows.length > 1"
              >
                <Icon name="heroicons:x-mark" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Column {
  name: string
}

const props = defineProps<{
  modelValue: any
  block: any
  selected?: boolean
  readonly?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update', 'delete', 'move-up', 'move-down'])

const columns = ref<Column[]>(props.modelValue?.columns || [
  { name: 'Column 1' },
  { name: 'Column 2' }
])

const rows = ref<string[][]>(props.modelValue?.rows || [
  ['', ''],
  ['', '']
])

const updateTable = () => {
  emit('update:modelValue', { columns: columns.value, rows: rows.value })
  emit('update', { columns: columns.value, rows: rows.value })
}

const addColumn = () => {
  columns.value.push({ name: `Column ${columns.value.length + 1}` })
  rows.value.forEach(row => row.push(''))
  updateTable()
}

const removeColumn = (index: number) => {
  if (columns.value.length > 1) {
    columns.value.splice(index, 1)
    rows.value.forEach(row => row.splice(index, 1))
    updateTable()
  }
}

const addRow = () => {
  rows.value.push(new Array(columns.value.length).fill(''))
  updateTable()
}

const removeRow = (index: number) => {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1)
    updateTable()
  }
}

const handleHeaderKeydown = (event: KeyboardEvent, colIndex: number) => {
  if (event.key === 'Tab' && !event.shiftKey && colIndex === columns.value.length - 1) {
    event.preventDefault()
    addColumn()
  } else if (event.altKey) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      emit('move-up')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      emit('move-down')
    }
  }
}

const handleCellKeydown = (event: KeyboardEvent, rowIndex: number, colIndex: number) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (rowIndex === rows.value.length - 1) {
      addRow()
    }
    // Focus next row same column
    setTimeout(() => {
      const inputs = document.querySelectorAll('.cell-input')
      const nextIndex = (rowIndex + 1) * columns.value.length + colIndex
      const nextInput = inputs[nextIndex] as HTMLInputElement
      nextInput?.focus()
    }, 10)
  } else if (event.key === 'Tab') {
    if (!event.shiftKey && colIndex === columns.value.length - 1 && rowIndex === rows.value.length - 1) {
      event.preventDefault()
      addRow()
    }
  } else if (event.key === 'ArrowUp' && rowIndex === 0 && !rows.value[rowIndex][colIndex]) {
    // Focus header if in first row and cell is empty
    const headers = document.querySelectorAll('.header-input')
    const header = headers[colIndex] as HTMLInputElement
    header?.focus()
  }
}

// Watch for external updates
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    columns.value = newValue.columns || columns.value
    rows.value = newValue.rows || rows.value
  }
})
</script>

<style scoped>
.table-block {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.table-icon {
  color: #4a90e2;
  font-size: 16px;
}

.table-title {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.2);
  border-radius: 4px;
  color: #4a90e2;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: rgba(74, 144, 226, 0.2);
  border-color: rgba(74, 144, 226, 0.4);
}

.table-container {
  padding: 12px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table-header-cell {
  position: relative;
  padding: 0;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 120px;
}

.header-input {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
  outline: none;
}

.header-input:focus {
  background: rgba(74, 144, 226, 0.1);
}

.remove-col-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.2s;
}

.table-header-cell:hover .remove-col-btn {
  opacity: 1;
}

.remove-col-btn:hover {
  background: rgba(255, 0, 0, 0.2);
  color: #ff6b6b;
}

.table-row {
  position: relative;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.table-cell {
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cell-input {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  outline: none;
}

.cell-input:focus {
  background: rgba(255, 255, 255, 0.03);
}

.cell-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.row-actions {
  width: 30px;
  padding: 0;
  border: none;
  text-align: center;
}

.remove-row-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.2s;
}

.table-row:hover .remove-row-btn {
  opacity: 1;
}

.remove-row-btn:hover {
  background: rgba(255, 0, 0, 0.2);
  color: #ff6b6b;
}
</style>