<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50"
    @click="handleOverlayClick"
  >
    <div
      class="bg-white rounded-lg shadow-sm border max-w-md w-full mx-4"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <button
          class="text-gray-300 hover:text-gray-500 transition-colors"
          @click="close"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4">
        <slot />
      </div>

      <!-- Footer -->
      <div class="flex justify-end space-x-2 p-4 border-t border-gray-100">
        <button
          class="px-4 py-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
          @click="close"
        >
          Cancel
        </button>
        <button
          class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
          :disabled="!canConfirm"
          @click="confirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'CustomDialog'
})

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  canConfirm: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const close = () => {
  emit('close')
}

const confirm = () => {
  if (props.canConfirm) {
    emit('confirm')
  }
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}
</script>
