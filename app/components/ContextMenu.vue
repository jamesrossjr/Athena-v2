<template>
  <div
    v-if="isVisible"
    ref="menuRef"
    class="fixed bg-white rounded-md shadow-lg border z-50 py-1 min-w-[160px]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <hr
        v-if="item.separator"
        class="my-1 border-gray-200"
      >
      <button
        v-else
        class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
        :class="{
          'text-gray-400 cursor-not-allowed': item.disabled,
          'text-red-600 hover:bg-red-50': item.danger
        }"
        :disabled="item.disabled"
        @click="handleItemClick(item)"
      >
        <component
          :is="item.icon"
          v-if="item.icon"
          class="w-4 h-4"
        />
        <span>{{ item.label }}</span>
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

defineOptions({
  name: 'ContextMenu'
})

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'item-click'])

const menuRef = ref(null)

const handleItemClick = (item) => {
  if (!item.disabled) {
    emit('item-click', item)
  }
}

const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    emit('close')
  }
}

const handleEscape = (event) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  nextTick(() => {
    if (props.isVisible) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)

      // Adjust position if menu goes off screen
      if (menuRef.value) {
        const rect = menuRef.value.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let adjustedX = props.x
        let adjustedY = props.y

        if (rect.right > viewportWidth) {
          adjustedX = viewportWidth - rect.width - 10
        }

        if (rect.bottom > viewportHeight) {
          adjustedY = viewportHeight - rect.height - 10
        }

        if (adjustedX !== props.x || adjustedY !== props.y) {
          menuRef.value.style.left = `${Math.max(0, adjustedX)}px`
          menuRef.value.style.top = `${Math.max(0, adjustedY)}px`
        }
      }
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>
