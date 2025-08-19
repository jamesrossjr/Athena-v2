<script setup>
// Canvas MVP - Minimal application layout
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Canvas - Digital Workspace',
  description: 'The fastest, most intuitive digital workspace. Minimalist block-based editor with AI co-pilot.'
})
</script>

<template>
  <!-- Minimal, invisible UI layout for Canvas -->
  <div class="min-h-screen bg-white">
    <NuxtPage />
  </div>
</template>
