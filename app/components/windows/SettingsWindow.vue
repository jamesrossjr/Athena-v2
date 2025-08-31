<template>
  <div class="settings-window-content">
    <AdvancedSettings
      @update="handleSettingsUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import AdvancedSettings from '../AdvancedSettings.vue'

const props = defineProps<{
  windowId: string
}>()

const handleSettingsUpdate = (settings: Record<string, unknown>) => {
  console.log('Settings updated from window:', settings)
  // Handle global settings update
  // Save to localStorage or send to API
  localStorage.setItem('athena-settings', JSON.stringify(settings))
}
</script>

<style scoped>
.settings-window-content {
  width: 100%;
  height: 100%;
  background: white;
  overflow: auto;
}
</style>
