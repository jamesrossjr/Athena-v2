<template>
  <div class="whiteboard-editor w-full h-full relative bg-gray-50 overflow-hidden">
    <!-- Toolbar -->
    <div class="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex items-center space-x-1">
      <!-- Selection Tool -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'select' && 'bg-blue-100 text-blue-600'
        ]"
        title="Select (V)"
        @click="setTool('select')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 15l-2 5L9 9l11 4-5 2z"
          />
        </svg>
      </button>

      <!-- Pen Tool -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'pen' && 'bg-blue-100 text-blue-600'
        ]"
        title="Pen (P)"
        @click="setTool('pen')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>

      <!-- Rectangle Tool -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'rectangle' && 'bg-blue-100 text-blue-600'
        ]"
        title="Rectangle (R)"
        @click="setTool('rectangle')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            stroke-width="2"
          />
        </svg>
      </button>

      <!-- Circle Tool -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'circle' && 'bg-blue-100 text-blue-600'
        ]"
        title="Circle (C)"
        @click="setTool('circle')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke-width="2"
          />
        </svg>
      </button>

      <!-- Text Tool -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'text' && 'bg-blue-100 text-blue-600'
        ]"
        title="Text (T)"
        @click="setTool('text')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      <div class="w-px h-8 bg-gray-300 mx-1" />

      <!-- Sticky Note -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'sticky' && 'bg-blue-100 text-blue-600'
        ]"
        title="Sticky Note (S)"
        @click="setTool('sticky')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      <!-- Arrow/Connector -->
      <button
        :class="[
          'p-2 rounded hover:bg-gray-100 transition-colors',
          currentTool === 'arrow' && 'bg-blue-100 text-blue-600'
        ]"
        title="Arrow (A)"
        @click="setTool('arrow')"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </button>

      <div class="w-px h-8 bg-gray-300 mx-1" />

      <!-- Color Picker -->
      <div class="relative">
        <button
          class="p-2 rounded hover:bg-gray-100 transition-colors flex items-center space-x-1"
          @click="showColorPicker = !showColorPicker"
        >
          <div
            :style="{ backgroundColor: currentColor }"
            class="w-5 h-5 rounded border border-gray-300"
          />
        </button>
        <div
          v-if="showColorPicker"
          class="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="color in colors"
              :key="color"
              :style="{ backgroundColor: color }"
              class="w-8 h-8 rounded hover:scale-110 transition-transform"
              @click="setColor(color)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom Controls -->
    <div class="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-sm border border-gray-200 p-2 flex items-center space-x-2">
      <button
        class="p-1 hover:bg-gray-100 rounded"
        @click="zoomOut"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 12H4"
          />
        </svg>
      </button>
      <span class="text-sm text-gray-600 min-w-[50px] text-center">{{ Math.round(zoom * 100) }}%</span>
      <button
        class="p-1 hover:bg-gray-100 rounded"
        @click="zoomIn"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
      <button
        class="p-1 hover:bg-gray-100 rounded"
        @click="resetZoom"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>

    <!-- Canvas Container -->
    <div
      ref="canvasContainer"
      class="w-full h-full"
      @wheel.prevent="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @dblclick="handleDoubleClick"
    >
      <!-- SVG Canvas -->
      <svg
        ref="svgCanvas"
        class="w-full h-full"
        :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
      >
        <!-- Grid Pattern -->
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="1"
              cy="1"
              r="0.5"
              fill="#e5e7eb"
            />
          </pattern>
        </defs>
        <rect
          :x="viewBox.x - 1000"
          :y="viewBox.y - 1000"
          :width="viewBox.width + 2000"
          :height="viewBox.height + 2000"
          fill="url(#grid)"
        />

        <!-- Render Elements -->
        <g
          v-for="element in elements"
          :key="element.id"
        >
          <!-- Rectangle -->
          <rect
            v-if="element.type === 'rectangle'"
            :x="element.x"
            :y="element.y"
            :width="element.width"
            :height="element.height"
            :fill="element.fill || 'none'"
            :stroke="element.stroke || currentColor"
            stroke-width="2"
            :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
            @click="selectElement(element)"
          />

          <!-- Circle -->
          <circle
            v-else-if="element.type === 'circle'"
            :cx="element.cx"
            :cy="element.cy"
            :r="element.r"
            :fill="element.fill || 'none'"
            :stroke="element.stroke || currentColor"
            stroke-width="2"
            :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
            @click="selectElement(element)"
          />

          <!-- Path (for pen tool) -->
          <path
            v-else-if="element.type === 'path'"
            :d="element.d"
            fill="none"
            :stroke="element.stroke || currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
            @click="selectElement(element)"
          />

          <!-- Text -->
          <text
            v-else-if="element.type === 'text'"
            :x="element.x"
            :y="element.y"
            :fill="element.fill || currentColor"
            font-size="16"
            font-family="Inter, sans-serif"
            :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
            @click="selectElement(element)"
          >
            {{ element.text }}
          </text>

          <!-- Sticky Note -->
          <g v-else-if="element.type === 'sticky'">
            <rect
              :x="element.x"
              :y="element.y"
              width="200"
              height="200"
              :fill="element.fill || '#fef3c7'"
              stroke="none"
              rx="4"
              :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
              @click="selectElement(element)"
            />
            <text
              :x="element.x + 10"
              :y="element.y + 30"
              fill="#92400e"
              font-size="14"
              font-family="Inter, sans-serif"
            >
              {{ element.text || 'Note' }}
            </text>
          </g>

          <!-- Arrow -->
          <line
            v-else-if="element.type === 'arrow'"
            :x1="element.x1"
            :y1="element.y1"
            :x2="element.x2"
            :y2="element.y2"
            :stroke="element.stroke || currentColor"
            stroke-width="2"
            marker-end="url(#arrowhead)"
            :class="{ 'cursor-move': currentTool === 'select' && element.id === selectedElement?.id }"
            @click="selectElement(element)"
          />
        </g>

        <!-- Arrow marker definition -->
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              :fill="currentColor"
            />
          </marker>
        </defs>

        <!-- Current drawing element (while drawing) -->
        <g v-if="isDrawing && currentDrawing">
          <rect
            v-if="currentDrawing.type === 'rectangle'"
            :x="Math.min(currentDrawing.x, currentDrawing.endX)"
            :y="Math.min(currentDrawing.y, currentDrawing.endY)"
            :width="Math.abs(currentDrawing.endX - currentDrawing.x)"
            :height="Math.abs(currentDrawing.endY - currentDrawing.y)"
            fill="none"
            :stroke="currentColor"
            stroke-width="2"
            stroke-dasharray="5,5"
          />
          <circle
            v-else-if="currentDrawing.type === 'circle'"
            :cx="currentDrawing.cx"
            :cy="currentDrawing.cy"
            :r="currentDrawing.r"
            fill="none"
            :stroke="currentColor"
            stroke-width="2"
            stroke-dasharray="5,5"
          />
        </g>
      </svg>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      class="absolute z-30 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]"
    >
      <button
        class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
        @click="duplicateElement"
      >
        Duplicate
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
        @click="deleteElement"
      >
        Delete
      </button>
      <hr class="my-1 border-gray-200">
      <button
        class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
        @click="bringToFront"
      >
        Bring to Front
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
        @click="sendToBack"
      >
        Send to Back
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Props
const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({ elements: [] })
  }
})

const emit = defineEmits(['update:data'])

// State
const currentTool = ref('select')
const currentColor = ref('#374151')
const showColorPicker = ref(false)
const zoom = ref(1)
const viewBox = ref({ x: 0, y: 0, width: 1200, height: 800 })
const elements = ref([])
const selectedElement = ref(null)
const isDrawing = ref(false)
const currentDrawing = ref(null)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const contextMenu = ref({ show: false, x: 0, y: 0 })

// Canvas refs
const canvasContainer = ref(null)
const svgCanvas = ref(null)

// Colors palette
const colors = [
  '#374151', '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6b7280', '#f3f4f6', '#000000'
]

// Methods
const setTool = (tool) => {
  currentTool.value = tool
  contextMenu.value.show = false
}

const setColor = (color) => {
  currentColor.value = color
  showColorPicker.value = false
}

const zoomIn = () => {
  zoom.value = Math.min(zoom.value * 1.2, 5)
  updateViewBox()
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value / 1.2, 0.1)
  updateViewBox()
}

const resetZoom = () => {
  zoom.value = 1
  viewBox.value = { x: 0, y: 0, width: 1200, height: 800 }
}

const updateViewBox = () => {
  const newWidth = 1200 / zoom.value
  const newHeight = 800 / zoom.value
  viewBox.value.width = newWidth
  viewBox.value.height = newHeight
}

const handleWheel = (e) => {
  if (e.ctrlKey || e.metaKey) {
    // Zoom with ctrl/cmd + scroll
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  } else {
    // Pan with regular scroll
    viewBox.value.x += e.deltaX / zoom.value
    viewBox.value.y += e.deltaY / zoom.value
  }
}

const getMousePosition = (e) => {
  const rect = svgCanvas.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / zoom.value + viewBox.value.x,
    y: (e.clientY - rect.top) / zoom.value + viewBox.value.y
  }
}

const handleMouseDown = (e) => {
  const pos = getMousePosition(e)

  if (e.button === 2) {
    // Right click - show context menu
    if (selectedElement.value) {
      contextMenu.value = { show: true, x: e.clientX, y: e.clientY }
    }
    return
  }

  contextMenu.value.show = false

  if (currentTool.value === 'select') {
    if (selectedElement.value) {
      isDragging.value = true
      dragStart.value = pos
    }
  } else if (currentTool.value === 'rectangle') {
    isDrawing.value = true
    currentDrawing.value = {
      type: 'rectangle',
      x: pos.x,
      y: pos.y,
      endX: pos.x,
      endY: pos.y
    }
  } else if (currentTool.value === 'circle') {
    isDrawing.value = true
    currentDrawing.value = {
      type: 'circle',
      cx: pos.x,
      cy: pos.y,
      r: 0
    }
  } else if (currentTool.value === 'text') {
    const text = prompt('Enter text:')
    if (text) {
      addElement({
        type: 'text',
        x: pos.x,
        y: pos.y,
        text,
        fill: currentColor.value
      })
    }
  } else if (currentTool.value === 'sticky') {
    addElement({
      type: 'sticky',
      x: pos.x,
      y: pos.y,
      text: 'New Note',
      fill: '#fef3c7'
    })
  }
}

const handleMouseMove = (e) => {
  const pos = getMousePosition(e)

  if (isDragging.value && selectedElement.value) {
    const dx = pos.x - dragStart.value.x
    const dy = pos.y - dragStart.value.y

    // Update element position
    const element = elements.value.find(el => el.id === selectedElement.value.id)
    if (element) {
      if (element.type === 'rectangle' || element.type === 'sticky' || element.type === 'text') {
        element.x += dx
        element.y += dy
      } else if (element.type === 'circle') {
        element.cx += dx
        element.cy += dy
      }
    }

    dragStart.value = pos
  } else if (isDrawing.value && currentDrawing.value) {
    if (currentDrawing.value.type === 'rectangle') {
      currentDrawing.value.endX = pos.x
      currentDrawing.value.endY = pos.y
    } else if (currentDrawing.value.type === 'circle') {
      const dx = pos.x - currentDrawing.value.cx
      const dy = pos.y - currentDrawing.value.cy
      currentDrawing.value.r = Math.sqrt(dx * dx + dy * dy)
    }
  }
}

const handleMouseUp = () => {
  if (isDrawing.value && currentDrawing.value) {
    if (currentDrawing.value.type === 'rectangle') {
      const { x, y, endX, endY } = currentDrawing.value
      addElement({
        type: 'rectangle',
        x: Math.min(x, endX),
        y: Math.min(y, endY),
        width: Math.abs(endX - x),
        height: Math.abs(endY - y),
        stroke: currentColor.value
      })
    } else if (currentDrawing.value.type === 'circle') {
      const { cx, cy, r } = currentDrawing.value
      if (r > 5) {
        addElement({
          type: 'circle',
          cx,
          cy,
          r,
          stroke: currentColor.value
        })
      }
    }
  }

  isDrawing.value = false
  currentDrawing.value = null
  isDragging.value = false
}

const handleDoubleClick = (e) => {
  if (currentTool.value === 'text') {
    const pos = getMousePosition(e)
    const text = prompt('Enter text:')
    if (text) {
      addElement({
        type: 'text',
        x: pos.x,
        y: pos.y,
        text,
        fill: currentColor.value
      })
    }
  }
}

const addElement = (element) => {
  element.id = Date.now()
  elements.value.push(element)
  emitUpdate()
}

const selectElement = (element) => {
  if (currentTool.value === 'select') {
    selectedElement.value = element
  }
}

const deleteElement = () => {
  if (selectedElement.value) {
    elements.value = elements.value.filter(el => el.id !== selectedElement.value.id)
    selectedElement.value = null
    contextMenu.value.show = false
    emitUpdate()
  }
}

const duplicateElement = () => {
  if (selectedElement.value) {
    const newElement = { ...selectedElement.value, id: Date.now() }
    if (newElement.x !== undefined) newElement.x += 20
    if (newElement.y !== undefined) newElement.y += 20
    if (newElement.cx !== undefined) newElement.cx += 20
    if (newElement.cy !== undefined) newElement.cy += 20
    elements.value.push(newElement)
    contextMenu.value.show = false
    emitUpdate()
  }
}

const bringToFront = () => {
  if (selectedElement.value) {
    const index = elements.value.findIndex(el => el.id === selectedElement.value.id)
    if (index > -1) {
      const element = elements.value.splice(index, 1)[0]
      elements.value.push(element)
    }
    contextMenu.value.show = false
    emitUpdate()
  }
}

const sendToBack = () => {
  if (selectedElement.value) {
    const index = elements.value.findIndex(el => el.id === selectedElement.value.id)
    if (index > -1) {
      const element = elements.value.splice(index, 1)[0]
      elements.value.unshift(element)
    }
    contextMenu.value.show = false
    emitUpdate()
  }
}

const emitUpdate = () => {
  emit('update:data', { elements: elements.value })
}

// Keyboard shortcuts
const handleKeyDown = (e) => {
  switch (e.key.toLowerCase()) {
    case 'v':
      if (!e.ctrlKey && !e.metaKey) setTool('select')
      break
    case 'p':
      if (!e.ctrlKey && !e.metaKey) setTool('pen')
      break
    case 'r':
      if (!e.ctrlKey && !e.metaKey) setTool('rectangle')
      break
    case 'c':
      if (!e.ctrlKey && !e.metaKey) setTool('circle')
      break
    case 't':
      if (!e.ctrlKey && !e.metaKey) setTool('text')
      break
    case 's':
      if (!e.ctrlKey && !e.metaKey) setTool('sticky')
      break
    case 'a':
      if (!e.ctrlKey && !e.metaKey) setTool('arrow')
      break
    case 'delete':
    case 'backspace':
      deleteElement()
      break
  }
}

// Lifecycle
onMounted(() => {
  if (props.initialData?.elements) {
    elements.value = props.initialData.elements
  }

  window.addEventListener('keydown', handleKeyDown)

  // Prevent context menu on right click
  canvasContainer.value?.addEventListener('contextmenu', e => e.preventDefault())
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.whiteboard-editor {
  user-select: none;
}
</style>
