<template>
  <div class="home-page">
    <!-- 3D Graph Globe - Full Screen -->
    <Graph3DGlobe />

    <!-- Floating Dock -->
    <EnhancedAppDock @open-command-center="openCommandCenter" />

    <!-- Command Center -->
    <Transition name="command-center">
      <ProCommandCenter
        v-if="showCommandCenter"
        @close="showCommandCenter = false"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Graph3DGlobe from '@/components/Graph3DGlobe.vue'
import EnhancedAppDock from '@/components/EnhancedAppDock.vue'
import ProCommandCenter from '@/features/navigation/components/ProCommandCenter.vue'

const showCommandCenter = ref(false)

const openCommandCenter = () => {
  showCommandCenter.value = true
}
</script>

<style scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Command Center Transition */
.command-center-enter-active,
.command-center-leave-active {
  transition: all 0.3s ease;
}

.command-center-enter-from,
.command-center-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}
</style>