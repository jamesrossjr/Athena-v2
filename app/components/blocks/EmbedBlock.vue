<template>
  <div class="embed-block">
    <!-- Empty state -->
    <div
      v-if="!content?.url"
      class="embed-placeholder"
    >
      <div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <span class="text-4xl">🔗</span>
        <p class="mt-2 text-gray-500">
          Add an embed
        </p>
        <p class="mt-1 text-xs text-gray-400">
          YouTube, Vimeo, Twitter, GitHub, Figma, and more
        </p>
        <button
          class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          @click="showDialog = true"
        >
          Add Embed
        </button>
      </div>
    </div>

    <!-- Embed content -->
    <div
      v-else
      class="embed-content"
    >
      <!-- YouTube embed -->
      <div
        v-if="content.type === 'youtube'"
        class="youtube-embed"
      >
        <div class="relative aspect-video">
          <iframe
            :src="`https://www.youtube.com/embed/${content.videoId}?rel=0`"
            class="absolute inset-0 w-full h-full rounded-lg"
            frameborder="0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <div class="mt-2">
          <p
            v-if="content.title"
            class="text-sm font-medium text-gray-900"
          >
            {{ content.title }}
          </p>
          <p class="text-xs text-gray-500">
            YouTube
          </p>
        </div>
      </div>

      <!-- Vimeo embed -->
      <div
        v-else-if="content.type === 'vimeo'"
        class="vimeo-embed"
      >
        <div class="relative aspect-video">
          <iframe
            :src="`https://player.vimeo.com/video/${content.videoId}`"
            class="absolute inset-0 w-full h-full rounded-lg"
            frameborder="0"
            allowfullscreen
          />
        </div>
        <div class="mt-2">
          <p
            v-if="content.title"
            class="text-sm font-medium text-gray-900"
          >
            {{ content.title }}
          </p>
          <p class="text-xs text-gray-500">
            Vimeo
          </p>
        </div>
      </div>

      <!-- Twitter/X embed -->
      <div
        v-else-if="content.type === 'twitter'"
        class="twitter-embed"
      >
        <div class="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-blue-400">🐦</span>
            <span class="text-sm font-medium">Twitter/X Post</span>
          </div>
          <p class="text-sm text-gray-600 mb-2">
            View the original post on Twitter/X
          </p>
          <a
            :href="content.url"
            target="_blank"
            class="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm"
          >
            Open Tweet →
          </a>
        </div>
      </div>

      <!-- GitHub embed -->
      <div
        v-else-if="content.type === 'github'"
        class="github-embed"
      >
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-gray-800">🐙</span>
            <span class="text-sm font-medium">GitHub Repository</span>
          </div>
          <p class="text-sm text-gray-600 mb-2">
            {{ content.repo || 'GitHub Repository' }}
          </p>
          <a
            :href="content.url"
            target="_blank"
            class="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm"
          >
            View on GitHub →
          </a>
        </div>
      </div>

      <!-- Figma embed -->
      <div
        v-else-if="content.type === 'figma'"
        class="figma-embed"
      >
        <div class="relative aspect-video">
          <iframe
            :src="content.embedUrl"
            class="absolute inset-0 w-full h-full rounded-lg border border-gray-200"
            allowfullscreen
          />
        </div>
        <div class="mt-2">
          <p
            v-if="content.title"
            class="text-sm font-medium text-gray-900"
          >
            {{ content.title }}
          </p>
          <p class="text-xs text-gray-500">
            Figma
          </p>
        </div>
      </div>

      <!-- Generic embed -->
      <div
        v-else
        class="generic-embed"
      >
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div class="flex items-center space-x-2 mb-2">
            <span class="text-blue-500">🌐</span>
            <span class="text-sm font-medium">Web Content</span>
          </div>
          <p class="text-sm text-gray-600 mb-2 break-all">
            {{ content.url }}
          </p>
          <div class="flex space-x-2">
            <a
              :href="content.url"
              target="_blank"
              class="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm"
            >
              Open Link →
            </a>
            <button
              class="text-blue-500 hover:text-blue-600 text-sm"
              @click="tryIframeEmbed"
            >
              Try Iframe
            </button>
          </div>
        </div>
      </div>

      <!-- Embed controls -->
      <div class="flex justify-end mt-2 space-x-2">
        <button
          class="text-xs text-gray-400 hover:text-red-500"
          @click="removeEmbed"
        >
          Remove
        </button>
        <button
          class="text-xs text-gray-400 hover:text-blue-500"
          @click="editEmbed"
        >
          Edit URL
        </button>
      </div>
    </div>

    <!-- Embed URL Dialog -->
    <Teleport to="body">
      <div
        v-if="showDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        @click="showDialog = false"
      >
        <div
          class="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          @click.stop
        >
          <h3 class="text-lg font-semibold mb-4">
            Add Embed
          </h3>
          <input
            v-model="embedUrl"
            type="url"
            placeholder="Paste URL (YouTube, Vimeo, Twitter, etc.)"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            @keydown.enter="handleEmbed"
          >
          <div class="text-xs text-gray-500 mb-4">
            Supported: YouTube, Vimeo, Twitter/X, GitHub, Figma, and more
          </div>
          <div class="flex justify-end space-x-2">
            <button
              class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              @click="showDialog = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              :disabled="!embedUrl.trim()"
              @click="handleEmbed"
            >
              Add Embed
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  content: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update'])

const showDialog = ref(false)
const embedUrl = ref('')

const handleEmbed = () => {
  if (!embedUrl.value.trim()) return

  const parsedEmbed = parseEmbedUrl(embedUrl.value)
  emit('update', parsedEmbed)

  showDialog.value = false
  embedUrl.value = ''
}

const parseEmbedUrl = (url) => {
  let embedType = 'generic'
  let embedData = { url }

  try {
    const urlObj = new URL(url)

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      embedType = 'youtube'
      let videoId = ''

      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      } else if (urlObj.searchParams.has('v')) {
        videoId = urlObj.searchParams.get('v')
      }

      if (videoId) {
        embedData = {
          ...embedData,
          type: embedType,
          videoId,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
      }
    } else if (urlObj.hostname.includes('vimeo.com')) {
      embedType = 'vimeo'
      const videoId = urlObj.pathname.split('/')[1]
      if (videoId) {
        embedData = {
          ...embedData,
          type: embedType,
          videoId
        }
      }
    } else if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
      embedType = 'twitter'
      embedData = {
        ...embedData,
        type: embedType
      }
    } else if (urlObj.hostname.includes('github.com')) {
      embedType = 'github'
      const pathParts = urlObj.pathname.split('/')
      const repo = pathParts.slice(1, 3).join('/')
      embedData = {
        ...embedData,
        type: embedType,
        repo
      }
    } else if (urlObj.hostname.includes('figma.com')) {
      embedType = 'figma'
      const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      embedData = {
        ...embedData,
        type: embedType,
        embedUrl
      }
    }
  } catch (error) {
    console.error('Error parsing embed URL:', error)
  }

  return {
    ...embedData,
    type: embedType
  }
}

const removeEmbed = () => {
  emit('update', {})
}

const editEmbed = () => {
  embedUrl.value = props.content.url || ''
  showDialog.value = true
}

const tryIframeEmbed = () => {
  // Try to convert generic embed to iframe
  const updatedContent = {
    ...props.content,
    embedUrl: props.content.url,
    type: 'iframe'
  }
  emit('update', updatedContent)
}
</script>

<style scoped>
.embed-block {
  margin: 1rem 0;
}

.embed-placeholder {
  transition: all 0.2s ease;
}

.embed-placeholder:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.aspect-video {
  aspect-ratio: 16 / 9;
}

.embed-content iframe {
  border-radius: 0.5rem;
}
</style>
