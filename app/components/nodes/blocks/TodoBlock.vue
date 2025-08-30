<template>
  <div class="todo-block">
    <div class="todo-header">
      <Icon name="heroicons:list-bullet" class="todo-icon" />
      <span class="todo-title">Todo List</span>
      <span class="todo-count">{{ completedCount }}/{{ items.length }}</span>
    </div>
    <div class="todo-items">
      <div 
        v-for="(item, index) in items" 
        :key="index"
        class="todo-item"
        :class="{ completed: item.checked }"
      >
        <input
          type="checkbox"
          v-model="item.checked"
          @change="updateItem(index)"
          class="todo-checkbox"
        />
        <input
          v-model="item.text"
          @input="updateItem(index)"
          @keydown="handleKeydown($event, index)"
          @blur="cleanupEmpty(index)"
          class="todo-text"
          :class="{ completed: item.checked }"
          placeholder="Todo item..."
        />
        <button 
          @click="removeItem(index)"
          class="todo-remove"
          v-if="items.length > 1"
        >
          <Icon name="heroicons:x-mark" />
        </button>
      </div>
      <button @click="addItem" class="add-todo">
        <Icon name="heroicons:plus" />
        <span>Add item</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface TodoItem {
  text: string
  checked: boolean
}

const props = defineProps<{
  modelValue: any
  block: any
  selected?: boolean
  readonly?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update', 'delete', 'move-up', 'move-down'])

const items = ref<TodoItem[]>(props.modelValue?.items || [
  { text: '', checked: false }
])

const completedCount = computed(() => {
  return items.value.filter(item => item.checked).length
})

const updateItem = (index: number) => {
  emit('update:modelValue', { items: items.value })
  emit('update', { items: items.value })
}

const addItem = () => {
  items.value.push({ text: '', checked: false })
  updateItem(items.value.length - 1)
}

const removeItem = (index: number) => {
  if (items.value.length > 1) {
    items.value.splice(index, 1)
    updateItem(Math.max(0, index - 1))
  }
}

const cleanupEmpty = (index: number) => {
  // Remove empty items except if it's the only one
  if (items.value.length > 1 && !items.value[index].text.trim()) {
    removeItem(index)
  }
}

const handleKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Add new item after current
    items.value.splice(index + 1, 0, { text: '', checked: false })
    updateItem(index + 1)
    
    // Focus new item
    setTimeout(() => {
      const inputs = document.querySelectorAll('.todo-text')
      const nextInput = inputs[index + 1] as HTMLInputElement
      nextInput?.focus()
    }, 10)
  } else if (event.key === 'Backspace' && !items.value[index].text) {
    event.preventDefault()
    if (index > 0) {
      removeItem(index)
      // Focus previous item
      setTimeout(() => {
        const inputs = document.querySelectorAll('.todo-text')
        const prevInput = inputs[index - 1] as HTMLInputElement
        prevInput?.focus()
      }, 10)
    } else if (items.value.length === 1) {
      // Delete the whole block if it's the only empty item
      emit('delete')
    }
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

// Watch for external updates
watch(() => props.modelValue?.items, (newItems) => {
  if (newItems) {
    items.value = newItems
  }
})
</script>

<style scoped>
.todo-block {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  overflow: hidden;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.todo-icon {
  color: #4a90e2;
  font-size: 16px;
}

.todo-title {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
}

.todo-count {
  padding: 2px 8px;
  background: rgba(74, 144, 226, 0.2);
  color: #4a90e2;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.todo-items {
  padding: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
  transition: all 0.2s;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #4a90e2;
  cursor: pointer;
}

.todo-text {
  flex: 1;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  outline: none;
  padding: 2px 4px;
}

.todo-text:focus {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}

.todo-text.completed {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.5);
}

.todo-text::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.todo-remove {
  padding: 2px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  opacity: 0;
}

.todo-item:hover .todo-remove {
  opacity: 1;
}

.todo-remove:hover {
  background: rgba(255, 0, 0, 0.2);
  color: #ff6b6b;
}

.add-todo {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  margin-top: 4px;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-todo:hover {
  background: rgba(74, 144, 226, 0.1);
  border-color: rgba(74, 144, 226, 0.5);
  color: #4a90e2;
}
</style>