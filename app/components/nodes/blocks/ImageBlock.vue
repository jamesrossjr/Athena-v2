<template>
  <div class="image-block">
    <div v-if="!imageUrl" class="image-upload">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileUpload"
        class="file-input"
      />
      <div class="upload-area" @click="$refs.fileInput.click()">
        <Icon name="heroicons:photo" class="upload-icon" />
        <p class="upload-text">Click to upload image</p>
        <p class="upload-hint">or paste image URL</p>
      </div>
      <input
        v-model="urlInput"
        @keydown.enter="loadFromUrl"
        class="url-input"
        placeholder="https://example.com/image.jpg"
      />
    </div>
    <div v-else class="image-container">
      <img :src="imageUrl" :alt="alt" class="image" />
      <div class="image-controls">
        <input
          v-model="alt"
          @input="updateAlt"
          class="alt-input"
          placeholder="Image description..."
        />
        <button @click="removeImage" class="remove-btn">
          <Icon name="heroicons:trash" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: any
  block: any
  selected?: boolean
  readonly?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update', 'delete', 'move-up', 'move-down'])

const fileInput = ref<HTMLInputElement>()
const imageUrl = ref(props.modelValue?.url || '')
const alt = ref(props.modelValue?.alt || '')
const urlInput = ref('')

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = e.target?.result as string
      alt.value = file.name.replace(/\.[^/.]+$/, '')
      updateImage()
    }
    reader.readAsDataURL(file)
  }
}

const loadFromUrl = () => {
  if (urlInput.value) {
    imageUrl.value = urlInput.value
    updateImage()
  }
}

const removeImage = () => {
  imageUrl.value = ''
  alt.value = ''
  urlInput.value = ''
  updateImage()
}

const updateImage = () => {
  emit('update:modelValue', { url: imageUrl.value, alt: alt.value })
  emit('update', { url: imageUrl.value, alt: alt.value })
}

const updateAlt = () => {
  emit('update', { url: imageUrl.value, alt: alt.value })
}

// Watch for external updates
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    imageUrl.value = newValue.url || ''
    alt.value = newValue.alt || ''
  }
})
</script>

<style scoped>
.image-block {
  width: 100%;
}

.file-input {
  display: none;
}

.upload-area {
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(74, 144, 226, 0.5);
}

.upload-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 12px;
}

.upload-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.url-input {
  width: 100%;
  padding: 8px 12px;
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  outline: none;
}

.url-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(74, 144, 226, 0.5);
}

.image-container {
  position: relative;
}

.image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.image-controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.alt-input {
  flex: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  outline: none;
}

.alt-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(74, 144, 226, 0.5);
}

.remove-btn {
  padding: 6px 12px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.2);
  border-radius: 6px;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(255, 0, 0, 0.2);
  border-color: rgba(255, 0, 0, 0.4);
}
</style>