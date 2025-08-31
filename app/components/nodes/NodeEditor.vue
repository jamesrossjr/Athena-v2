<template>
  <div class="node-editor" :class="{ expanded: isExpanded }">
    <div class="node-header">
      <Icon name="heroicons:document-text" class="node-icon" />
      <input 
        v-model="title" 
        class="node-title"
        @blur="updateTitle"
        placeholder="Untitled Document"
      />
      <div class="node-actions">
        <button @click="toggleFormat('bold')" class="format-btn" :class="{ active: formats.bold }">
          <Icon name="heroicons:bold" />
        </button>
        <button @click="toggleFormat('italic')" class="format-btn" :class="{ active: formats.italic }">
          <Icon name="heroicons:italic" />
        </button>
        <button @click="addBlock" class="format-btn">
          <Icon name="heroicons:plus" />
        </button>
        <button @click="$emit('close')" class="close-btn">
          <Icon name="heroicons:x-mark" />
        </button>
      </div>
    </div>
    
    <div class="editor-content" ref="editorContainer">
      <!-- Block-based editor -->
      <div class="blocks-container">
        <TransitionGroup name="block">
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            class="editor-block"
            :class="`block-${block.type}`"
            @click="selectBlock(index)"
          >
            <!-- Block Type Selector -->
            <div class="block-type-selector" v-if="selectedBlock === index">
              <button 
                v-for="type in blockTypes" 
                :key="type.id"
                @click.stop="changeBlockType(index, type.id)"
                class="type-btn"
                :title="type.label"
              >
                <Icon :name="type.icon" />
              </button>
            </div>
            
            <!-- Block Content -->
            <component
              :is="getBlockComponent(block.type)"
              v-model="block.content"
              :block="block"
              :selected="selectedBlock === index"
              @update="updateBlock(index, $event)"
              @delete="deleteBlock(index)"
              @move-up="moveBlock(index, -1)"
              @move-down="moveBlock(index, 1)"
            />
            
            <!-- Block Handle -->
            <div class="block-handle" v-if="selectedBlock === index">
              <Icon name="heroicons:bars-3" />
            </div>
          </div>
        </TransitionGroup>
      </div>
      
      <!-- Add block button -->
      <div class="add-block-area" @click="addBlock">
        <Icon name="heroicons:plus-circle" />
        <span>Add a block</span>
      </div>
    </div>
    
    <!-- Status bar -->
    <div class="editor-status">
      <span class="word-count">{{ wordCount }} words</span>
      <span class="block-count">{{ blocks.length }} blocks</span>
      <span class="save-status" :class="saveStatus">
        <Icon :name="saveStatus === 'saved' ? 'heroicons:check' : 'heroicons:cloud-arrow-up'" />
        {{ saveStatus }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import TextBlock from './blocks/TextBlock.vue'
import HeadingBlock from './blocks/HeadingBlock.vue'
import CodeBlock from './blocks/CodeBlock.vue'
import TodoBlock from './blocks/TodoBlock.vue'
import ImageBlock from './blocks/ImageBlock.vue'
import TableBlock from './blocks/TableBlock.vue'

interface Block {
  id: string
  type: string
  content: any
  metadata?: any
}

const props = defineProps<{
  node: any
  isExpanded?: boolean
}>()

const emit = defineEmits(['update', 'close'])

// State
const title = ref(props.node?.title || 'Untitled Document')
const blocks = ref<Block[]>(props.node?.content?.blocks || [
  { id: generateId(), type: 'text', content: { text: '' } }
])
const selectedBlock = ref<number | null>(null)
const formats = ref({
  bold: false,
  italic: false,
  underline: false
})
const saveStatus = ref<'saved' | 'saving' | 'unsaved'>('saved')

// Block types
const blockTypes = [
  { id: 'text', label: 'Text', icon: 'heroicons:bars-3' },
  { id: 'heading', label: 'Heading', icon: 'heroicons:h1' },
  { id: 'code', label: 'Code', icon: 'heroicons:code-bracket' },
  { id: 'todo', label: 'Todo List', icon: 'heroicons:list-bullet' },
  { id: 'image', label: 'Image', icon: 'heroicons:photo' },
  { id: 'table', label: 'Table', icon: 'heroicons:table-cells' }
]

// Computed
const wordCount = computed(() => {
  return blocks.value.reduce((count, block) => {
    if (block.type === 'text' || block.type === 'heading') {
      const text = block.content?.text || ''
      return count + text.split(/\s+/).filter(word => word.length > 0).length
    }
    return count
  }, 0)
})

// Methods
function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getBlockComponent(type: string) {
  const components: Record<string, any> = {
    text: TextBlock,
    heading: HeadingBlock,
    code: CodeBlock,
    todo: TodoBlock,
    image: ImageBlock,
    table: TableBlock
  }
  return components[type] || TextBlock
}

function addBlock(type = 'text') {
  const newBlock: Block = {
    id: generateId(),
    type,
    content: getDefaultContent(type)
  }
  
  if (selectedBlock.value !== null) {
    blocks.value.splice(selectedBlock.value + 1, 0, newBlock)
    selectedBlock.value++
  } else {
    blocks.value.push(newBlock)
    selectedBlock.value = blocks.value.length - 1
  }
  
  saveContent()
}

function getDefaultContent(type: string) {
  switch (type) {
    case 'heading':
      return { text: '', level: 2 }
    case 'code':
      return { code: '', language: 'javascript' }
    case 'todo':
      return { items: [{ text: '', checked: false }] }
    case 'image':
      return { url: '', caption: '' }
    case 'table':
      return { rows: 3, cols: 3, cells: [] }
    default:
      return { text: '' }
  }
}

function updateBlock(index: number, content: any) {
  blocks.value[index].content = content
  saveContent()
}

function deleteBlock(index: number) {
  if (blocks.value.length > 1) {
    blocks.value.splice(index, 1)
    if (selectedBlock.value === index) {
      selectedBlock.value = Math.max(0, index - 1)
    }
    saveContent()
  }
}

function moveBlock(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex < blocks.value.length) {
    const block = blocks.value.splice(index, 1)[0]
    blocks.value.splice(newIndex, 0, block)
    selectedBlock.value = newIndex
    saveContent()
  }
}

function changeBlockType(index: number, newType: string) {
  blocks.value[index].type = newType
  blocks.value[index].content = getDefaultContent(newType)
  saveContent()
}

function selectBlock(index: number) {
  selectedBlock.value = selectedBlock.value === index ? null : index
}

function toggleFormat(format: keyof typeof formats.value) {
  formats.value[format] = !formats.value[format]
  // Apply format to selected text
  applyFormat(format)
}

function applyFormat(format: string) {
  // This would integrate with the text blocks to apply formatting
  // For now, it's a placeholder
  console.log('Applying format:', format)
}

function updateTitle() {
  emit('update', { title: title.value })
  saveContent()
}

function saveContent() {
  saveStatus.value = 'saving'
  
  // Emit update
  emit('update', {
    title: title.value,
    content: { blocks: blocks.value }
  })
  
  // Simulate save delay
  setTimeout(() => {
    saveStatus.value = 'saved'
  }, 500)
}

// Auto-save
watch(blocks, () => {
  saveStatus.value = 'unsaved'
}, { deep: true })

// Keyboard shortcuts
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          toggleFormat('bold')
          break
        case 'i':
          e.preventDefault()
          toggleFormat('italic')
          break
        case 's':
          e.preventDefault()
          saveContent()
          break
      }
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style scoped>
.node-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 10, 0.95);
  border-radius: 12px;
  overflow: hidden;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.node-icon {
  color: #4a90e2;
  font-size: 20px;
}

.node-title {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 600;
  outline: none;
}

.node-title:focus {
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
}

.node-actions {
  display: flex;
  gap: 5px;
}

.format-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.format-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.format-btn.active {
  background: #4a90e2;
  color: white;
}

.close-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.2);
  color: #ff6b6b;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.blocks-container {
  min-height: 100%;
}

.editor-block {
  position: relative;
  margin-bottom: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s;
}

.editor-block:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.editor-block.selected {
  border-color: #4a90e2;
  background: rgba(74, 144, 226, 0.1);
}

.block-type-selector {
  position: absolute;
  left: -40px;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.type-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.type-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.block-handle {
  position: absolute;
  right: -30px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  color: rgba(255, 255, 255, 0.3);
  cursor: grab;
}

.block-handle:active {
  cursor: grabbing;
}

.add-block-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  margin-top: 20px;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.add-block-area:hover {
  border-color: rgba(74, 144, 226, 0.5);
  color: #4a90e2;
  background: rgba(74, 144, 226, 0.05);
}

.editor-status {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.save-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
}

.save-status.saved {
  color: #4ade80;
}

.save-status.saving {
  color: #fbbf24;
}

.save-status.unsaved {
  color: #f87171;
}

/* Block animations */
.block-enter-active, .block-leave-active {
  transition: all 0.3s ease;
}

.block-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.block-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Expanded state */
.node-editor.expanded {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  height: 80vh;
  z-index: 1000;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
</style>