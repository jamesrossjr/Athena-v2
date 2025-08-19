<script setup>
// Canvas MVP - Main workspace interface
useSeoMeta({
  title: 'Canvas - Digital Workspace',
  description: 'The fastest, most intuitive digital workspace. Minimalist block-based editor with AI co-pilot.'
})

// Redirect to workspace if user has one, otherwise show onboarding
await navigateTo('/workspace')
</script>

<template>
  <div>
    <!-- This will redirect to workspace, so this template shouldn't render -->
  </div>
</template>
