<template>
  <div class="media-block">
    <!-- Upload placeholder -->
    <div
      v-if="!content?.url"
      class="upload-placeholder"
    >
      <div
        class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        @click="triggerUpload"
        @dragover.prevent
        @drop="handleDrop"
      >
        <span class="text-4xl">{{ getMediaIcon(type) }}</span>
        <p class="mt-2 text-gray-500">
          {{ getUploadText(type) }}
        </p>
        <p class="mt-1 text-xs text-gray-400">
          or drag and drop
        </p>
        <button
          class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {{ getButtonText(type) }}
        </button>
      </div>
    </div>

    <!-- Media content -->
    <div
      v-else
      class="media-content"
    >
      <!-- Image -->
      <div
        v-if="type === 'image'"
        class="image-wrapper"
      >
        <img
          :src="localContent.url"
          :alt="localContent.alt || localContent.filename"
          class="max-w-full h-auto rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
          @click="openLightbox"
        >
        <div class="mt-2 space-y-2">
          <input
            v-model="localContent.alt"
            placeholder="Alt text (for accessibility)..."
            class="w-full text-xs text-gray-600 bg-transparent border-none outline-none"
            @input="updateContent"
          >
          <input
            v-model="localContent.caption"
            placeholder="Add a caption..."
            class="w-full text-sm text-gray-600 bg-transparent border-none outline-none"
            @input="updateContent"
          >
        </div>
      </div>

      <!-- Video -->
      <div
        v-else-if="type === 'video'"
        class="video-wrapper"
      >
        <video
          :src="localContent.url"
          controls
          class="max-w-full h-auto rounded-lg shadow-sm"
          :poster="localContent.thumbnail"
        />
        <div class="mt-2">
          <input
            v-model="localContent.caption"
            placeholder="Add a caption..."
            class="w-full text-sm text-gray-600 bg-transparent border-none outline-none"
            @input="updateContent"
          >
        </div>
      </div>

      <!-- Audio -->
      <div
        v-else-if="type === 'audio'"
        class="audio-wrapper"
      >
        <div class="bg-gray-100 rounded-lg p-4">
          <div class="flex items-center space-x-3 mb-3">
            <span class="text-2xl">🎵</span>
            <div class="flex-1">
              <p class="font-medium text-gray-900">
                {{ localContent.filename }}
              </p>
              <p class="text-sm text-gray-500">
                {{ formatFileSize(localContent.size) }}
              </p>
            </div>
          </div>
          <audio
            :src="localContent.url"
            controls
            class="w-full"
          />
        </div>
        <div class="mt-2">
          <input
            v-model="localContent.caption"
            placeholder="Add a caption..."
            class="w-full text-sm text-gray-600 bg-transparent border-none outline-none"
            @input="updateContent"
          >
        </div>
      </div>

      <!-- Generic file -->
      <div
        v-else
        class="file-wrapper"
      >
        <div class="bg-gray-100 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">{{ getFileIcon(localContent.mimeType) }}</span>
            <div class="flex-1">
              <p class="font-medium text-gray-900">
                {{ localContent.filename }}
              </p>
              <p class="text-sm text-gray-500">
                {{ formatFileSize(localContent.size) }} • {{ localContent.mimeType }}
              </p>
            </div>
            <a
              :href="localContent.url"
              download
              class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Download
            </a>
          </div>
        </div>
        <div class="mt-2">
          <input
            v-model="localContent.caption"
            placeholder="Add a description..."
            class="w-full text-sm text-gray-600 bg-transparent border-none outline-none"
            @input="updateContent"
          >
        </div>
      </div>

      <!-- Media controls -->
      <div class="flex justify-end mt-2 space-x-2">
        <button
          class="text-xs text-gray-400 hover:text-red-500"
          @click="removeMedia"
        >
          Remove
        </button>
        <button
          class="text-xs text-gray-400 hover:text-blue-500"
          @click="replaceMedia"
        >
          Replace
        </button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="getAcceptTypes(type)"
      @change="handleFileSelect"
    >
  </div>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true // 'image', 'video', 'audio', 'file'
  },
  content: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update', 'upload'])

const fileInput = ref(null)

// Create local reactive copy to avoid mutating props
const localContent = reactive({ ...props.content })

// Watch for prop changes to sync local copy
watch(() => props.content, (newContent) => {
  Object.assign(localContent, newContent)
}, { deep: true })

const updateContent = () => {
  emit('update', { ...localContent })
}

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('upload', file)
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file) {
    emit('upload', file)
  }
}

const removeMedia = () => {
  emit('update', {})
}

const replaceMedia = () => {
  triggerUpload()
}

const openLightbox = () => {
  // TODO: Implement lightbox modal
  window.open(localContent.url, '_blank')
}

const getMediaIcon = (type) => {
  switch (type) {
    case 'image': return '🖼️'
    case 'video': return '🎥'
    case 'audio': return '🎵'
    default: return '📎'
  }
}

const getUploadText = (type) => {
  switch (type) {
    case 'image': return 'Click to upload an image'
    case 'video': return 'Click to upload a video'
    case 'audio': return 'Click to upload an audio file'
    default: return 'Click to upload a file'
  }
}

const getButtonText = (type) => {
  switch (type) {
    case 'image': return 'Choose Image'
    case 'video': return 'Choose Video'
    case 'audio': return 'Choose Audio'
    default: return 'Choose File'
  }
}

const getAcceptTypes = (type) => {
  switch (type) {
    case 'image': return 'image/*'
    case 'video': return 'video/*'
    case 'audio': return 'audio/*'
    default: return '*/*'
  }
}

const getFileIcon = (mimeType) => {
  if (!mimeType) return '📄'

  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📋'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️'

  return '📄'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>

<style scoped>
.media-block {
  margin: 1rem 0;
}

.upload-placeholder {
  transition: all 0.2s ease;
}

.image-wrapper img {
  transition: all 0.2s ease;
}

.image-wrapper img:hover {
  transform: scale(1.02);
}

.video-wrapper video {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.audio-wrapper audio {
  height: 40px;
}

.file-wrapper {
  max-width: 400px;
}
</style>
