import { ref, computed } from 'vue'

export const useOverlayManager = () => {
  const activeOverlay = ref<string | null>(null)
  const overlayStack = ref<string[]>([])

  const showOverlay = (name: string) => {
    if (activeOverlay.value && !overlayStack.value.includes(activeOverlay.value)) {
      overlayStack.value.push(activeOverlay.value)
    }
    activeOverlay.value = name
  }

  const hideOverlay = (name?: string) => {
    if (name && activeOverlay.value !== name) return

    if (overlayStack.value.length > 0) {
      activeOverlay.value = overlayStack.value.pop() || null
    } else {
      activeOverlay.value = null
    }
  }

  const hideAllOverlays = () => {
    activeOverlay.value = null
    overlayStack.value = []
  }

  const isOverlayActive = (name: string) => computed(() => activeOverlay.value === name)

  const hasActiveOverlay = computed(() => activeOverlay.value !== null)

  const toggle = (name: string) => {
    if (activeOverlay.value === name) {
      hideOverlay(name)
    } else {
      showOverlay(name)
    }
  }

  return {
    activeOverlay: computed(() => activeOverlay.value),
    hasActiveOverlay,
    showOverlay,
    hideOverlay,
    hideAllOverlays,
    isOverlayActive,
    toggle
  }
}
