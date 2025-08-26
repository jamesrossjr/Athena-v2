<template>
  <div
    ref="containerRef"
    class="graph-3d-container w-full h-full relative bg-white"
  >
    <!-- 3D Canvas will be inserted here -->

    <!-- Enhanced UI Controls Overlay -->
    <div class="absolute top-4 left-4 z-10 space-y-2">
      <!-- Stats Panel -->
      <div class="bg-white bg-opacity-90 text-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 text-sm backdrop-blur-sm">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-gray-400 rounded-full" />
            <span>{{ nodes.length }} Nodes</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-gray-600 rounded-full" />
            <span>{{ links.length }} Links</span>
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          FPS: {{ currentFPS }} | {{ performanceStatus }}
        </div>
      </div>

      <!-- Layout Controls -->
      <div class="bg-white bg-opacity-90 text-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 space-y-2 backdrop-blur-sm">
        <div class="text-xs text-gray-600 font-medium">
          Layout
        </div>
        <select
          v-model="selectedLayout"
          class="bg-white text-gray-700 text-xs p-2 rounded w-full border border-gray-300 focus:border-gray-400 focus:outline-none"
          @change="updateLayout"
        >
          <option value="force">
            🌐 Force Directed
          </option>
          <option value="sphere">
            🌍 Sphere
          </option>
          <option value="grid">
            ⬜ Grid
          </option>
          <option value="hierarchical">
            🌳 Hierarchical
          </option>
          <option value="circular">
            ⭕ Circular
          </option>
        </select>

        <div class="flex items-center space-x-2 mt-2">
          <span class="text-xs">Node Size:</span>
          <input
            v-model="nodeScale"
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            class="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            @input="updateNodeScale"
          >
          <span class="text-xs text-gray-300">{{ nodeScale }}x</span>
        </div>

        <div class="flex items-center space-x-2">
          <button
            class="flex-1 text-xs px-2 py-1 rounded transition-colors"
            :class="isAnimating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
            @click="toggleAnimation"
          >
            {{ isAnimating ? '⏸ Pause' : '▶ Play' }}
          </button>
          <button
            class="flex-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            @click="resetCamera"
          >
            🎯 Reset View
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="bg-white bg-opacity-90 text-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 space-y-2 backdrop-blur-sm">
        <div class="text-xs text-gray-600 font-medium">
          Content Filter
        </div>
        <div class="space-y-1">
          <label class="flex items-center space-x-2 text-xs">
            <input
              v-model="showTextBlocks"
              type="checkbox"
              class="rounded"
              @change="updateVisibility"
            >
            <span>📝 Text Blocks ({{ getNodeCount('text') }})</span>
          </label>
          <label class="flex items-center space-x-2 text-xs">
            <input
              v-model="showCodeBlocks"
              type="checkbox"
              class="rounded"
              @change="updateVisibility"
            >
            <span>💻 Code Blocks ({{ getNodeCount('code') }})</span>
          </label>
          <label class="flex items-center space-x-2 text-xs">
            <input
              v-model="showImageBlocks"
              type="checkbox"
              class="rounded"
              @change="updateVisibility"
            >
            <span>🖼️ Images ({{ getNodeCount('image') }})</span>
          </label>
          <label class="flex items-center space-x-2 text-xs">
            <input
              v-model="showFileBlocks"
              type="checkbox"
              class="rounded"
              @change="updateVisibility"
            >
            <span>📁 Files ({{ getNodeCount('file') }})</span>
          </label>
        </div>
      </div>

      <!-- Navigation Controls -->
      <div class="bg-white bg-opacity-90 text-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 space-y-1 backdrop-blur-sm">
        <div class="text-xs text-gray-600 font-medium mb-2">
          Navigation
        </div>
        <div class="grid grid-cols-2 gap-1 text-xs">
          <div>🖱️ Drag: Rotate</div>
          <div>🎡 Wheel: Zoom</div>
          <div>👆 Click: Select</div>
          <div>👆👆 Double: Focus</div>
          <div>⌨️ Space: Reset</div>
          <div>🔍 Alt+Drag: Pan</div>
        </div>
      </div>
    </div>

    <!-- Exit Button -->
    <button
      class="absolute top-4 right-4 z-10 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm border border-gray-200"
      @click="$emit('exit-graph')"
    >
      Exit Graph View
    </button>

    <!-- Selected Node Info -->
    <div
      v-if="selectedNode"
      class="absolute bottom-4 left-4 right-4 z-10 bg-white bg-opacity-95 text-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
    >
      <h3 class="font-semibold mb-2 text-gray-900">
        {{ selectedNode.title }}
      </h3>
      <div class="text-sm text-gray-600 mb-2">
        {{ selectedNode.blocks?.length || 0 }} blocks
      </div>
      <div class="text-xs">
        <div
          v-if="selectedNode.blocks?.length"
          class="space-y-1"
        >
          <div
            v-for="(block, index) in selectedNode.blocks.slice(0, 3)"
            :key="index"
            class="text-gray-600"
          >
            {{ block.content ? (typeof block.content === 'string' ? block.content.substring(0, 100) : JSON.stringify(block.content).substring(0, 100)) : 'Empty block' }}...
          </div>
          <div
            v-if="selectedNode.blocks.length > 3"
            class="text-gray-500 italic"
          >
            ... and {{ selectedNode.blocks.length - 3 }} more blocks
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

defineOptions({
  name: 'GraphView3D'
})

const props = defineProps({
  pages: {
    type: Array,
    default: () => []
  },
  blocks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['exit-graph', 'select-page'])

// Template refs
const containerRef = ref(null)

// State
const selectedLayout = ref('force')
const selectedNode = ref(null)
const nodes = ref([])
const links = ref([])

// Enhanced State
const nodeScale = ref(1.0)
const isAnimating = ref(true)
const currentFPS = ref(60)
const performanceStatus = ref('Good')
const lastFrameTime = ref(0)
const frameCount = ref(0)

// Content Filters
const showTextBlocks = ref(true)
const showCodeBlocks = ref(true)
const showImageBlocks = ref(true)
const showFileBlocks = ref(true)

// Animation and Interaction
const hoveredNode = ref(null)
const _draggedNode = ref(null)
const _cameraTarget = ref({ x: 0, y: 0, z: 0 })
const _isUserInteracting = ref(false)

// Three.js variables
let scene, camera, renderer, controls
let nodeObjects = []
let linkObjects = []
let animationId

// Initialize Three.js scene
const initThreeJS = async () => {
  // Dynamically import Three.js to avoid SSR issues
  const _THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  if (!containerRef.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    containerRef.value.clientWidth / containerRef.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 50)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  containerRef.value.appendChild(renderer.domElement)

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.screenSpacePanning = false
  controls.minDistance = 10
  controls.maxDistance = 200

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
  directionalLight.position.set(10, 10, 5)
  directionalLight.castShadow = false
  scene.add(directionalLight)

  // Create graph
  createGraph()

  // Start animation loop
  animate()

  // Handle window resize
  window.addEventListener('resize', onWindowResize)
}

// Create graph nodes and links
const createGraph = async () => {
  const _THREE = await import('three')

  // Clear existing objects
  nodeObjects.forEach(obj => scene.remove(obj))
  linkObjects.forEach(obj => scene.remove(obj))
  nodeObjects = []
  linkObjects = []

  // Process pages into nodes
  nodes.value = props.pages.map(page => ({
    id: page.id,
    title: page.title,
    blocks: page.blocks || [],
    position: { x: 0, y: 0, z: 0 }
  }))

  // Extract links from page content
  links.value = []
  const linkPattern = /\[\[([^\]]+)\]\]/g

  props.pages.forEach((sourcePage) => {
    if (sourcePage.blocks) {
      sourcePage.blocks.forEach((block) => {
        if (typeof block.content === 'string') {
          let match
          while ((match = linkPattern.exec(block.content)) !== null) {
            const linkedPageTitle = match[1].trim()
            const targetPage = props.pages.find(p =>
              p.title.toLowerCase() === linkedPageTitle.toLowerCase()
            )

            if (targetPage && targetPage.id !== sourcePage.id) {
              links.value.push({
                source: sourcePage.id,
                target: targetPage.id,
                sourceTitle: sourcePage.title,
                targetTitle: targetPage.title
              })
            }
          }
        }
      })
    }
  })

  // Apply layout
  applyLayout()

  // Create node objects
  nodes.value.forEach((node) => {
    // Node geometry - sphere for pages
    const geometry = new THREE.SphereGeometry(1.5, 16, 16)
    const material = new THREE.MeshLambertMaterial({
      color: node.blocks?.length > 5 ? 0x6b7280 : 0x9ca3af,
      transparent: true,
      opacity: 0.9
    })

    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.set(node.position.x, node.position.y, node.position.z)
    sphere.userData = { node }

    // Add text sprite for node title
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const text = node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title

    canvas.width = 256
    canvas.height = 64
    context.font = '24px Arial'
    context.fillStyle = '#374151'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, 128, 32)

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.position.set(node.position.x, node.position.y + 3, node.position.z)
    sprite.scale.set(8, 2, 1)

    scene.add(sphere)
    scene.add(sprite)
    nodeObjects.push(sphere, sprite)
  })

  // Create link objects
  links.value.forEach((link) => {
    const sourceNode = nodes.value.find(n => n.id === link.source)
    const targetNode = nodes.value.find(n => n.id === link.target)

    if (sourceNode && targetNode) {
      const points = [
        new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
        new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z)
      ]

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0xd1d5db,
        transparent: true,
        opacity: 0.6
      })

      const line = new THREE.Line(geometry, material)
      scene.add(line)
      linkObjects.push(line)
    }
  })
}

// Apply different layouts with enhanced algorithms
const applyLayout = () => {
  const nodeCount = nodes.value.length

  if (nodeCount === 0) return

  switch (selectedLayout.value) {
    case 'sphere':
      applySphereLayout()
      break
    case 'grid':
      applyGridLayout()
      break
    case 'hierarchical':
      applyHierarchicalLayout()
      break
    case 'circular':
      applyCircularLayout()
      break
    default:
      applyForceLayout()
  }
}

// Enhanced hierarchical layout
const applyHierarchicalLayout = () => {
  // Group nodes by connection depth
  const levels = new Map()
  const visited = new Set()

  // Start with nodes that have no incoming connections
  const rootNodes = nodes.value.filter(node =>
    !links.value.some(link => link.target === node.id)
  )

  if (rootNodes.length === 0 && nodes.value.length > 0) {
    rootNodes.push(nodes.value[0]) // Fallback to first node
  }

  // BFS to assign levels
  const queue = rootNodes.map(node => ({ node, level: 0 }))

  while (queue.length > 0) {
    const { node, level } = queue.shift()

    if (visited.has(node.id)) continue
    visited.add(node.id)

    if (!levels.has(level)) levels.set(level, [])
    levels.get(level).push(node)

    // Find connected nodes
    const connectedNodes = links.value
      .filter(link => link.source === node.id)
      .map(link => nodes.value.find(n => n.id === link.target))
      .filter(n => n && !visited.has(n.id))

    connectedNodes.forEach((connectedNode) => {
      queue.push({ node: connectedNode, level: level + 1 })
    })
  }

  // Position nodes by levels
  const levelHeight = 15
  const maxLevel = Math.max(...levels.keys())

  levels.forEach((levelNodes, level) => {
    const y = (level - maxLevel / 2) * levelHeight
    const nodeSpacing = Math.max(8, 40 / levelNodes.length)

    levelNodes.forEach((node, index) => {
      const x = (index - (levelNodes.length - 1) / 2) * nodeSpacing
      const z = Math.sin(index * 0.5) * 3

      node.position = { x, y, z }
    })
  })

  // Handle unvisited nodes
  const unvisitedNodes = nodes.value.filter(node => !visited.has(node.id))
  unvisitedNodes.forEach((node, index) => {
    node.position = {
      x: (index - unvisitedNodes.length / 2) * 8,
      y: (maxLevel + 2) * levelHeight,
      z: 0
    }
  })
}

// Enhanced circular layout
const applyCircularLayout = () => {
  const radius = Math.max(15, nodes.value.length * 1.5)
  const angleStep = (Math.PI * 2) / nodes.value.length

  nodes.value.forEach((node, index) => {
    const angle = index * angleStep
    const spiralFactor = 1 + (index / nodes.value.length) * 0.3

    node.position = {
      x: Math.cos(angle) * radius * spiralFactor,
      y: Math.sin(angle) * radius * spiralFactor,
      z: Math.sin(index * 0.3) * 8 // Add vertical variation
    }
  })
}

// Sphere layout
const applySphereLayout = () => {
  const radius = Math.max(15, nodes.value.length * 2)

  nodes.value.forEach((node, index) => {
    const phi = Math.acos(-1 + (2 * index) / nodes.value.length)
    const theta = Math.sqrt(nodes.value.length * Math.PI) * phi

    node.position = {
      x: radius * Math.cos(theta) * Math.sin(phi),
      y: radius * Math.sin(theta) * Math.sin(phi),
      z: radius * Math.cos(phi)
    }
  })
}

// Grid layout
const applyGridLayout = () => {
  const gridSize = Math.ceil(Math.sqrt(nodes.value.length))
  const spacing = 10

  nodes.value.forEach((node, index) => {
    const x = (index % gridSize) * spacing - (gridSize * spacing) / 2
    const y = Math.floor(index / gridSize) * spacing - (gridSize * spacing) / 2
    const z = Math.sin(index * 0.5) * 5 // Add some Z variation

    node.position = { x, y, z }
  })
}

// Force-directed layout (simplified)
const applyForceLayout = () => {
  // Initialize random positions
  nodes.value.forEach((node) => {
    node.position = {
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 40
    }
  })

  // Simple force simulation
  for (let iteration = 0; iteration < 100; iteration++) {
    // Repulsion between nodes
    for (let i = 0; i < nodes.value.length; i++) {
      for (let j = i + 1; j < nodes.value.length; j++) {
        const node1 = nodes.value[i]
        const node2 = nodes.value[j]

        const dx = node1.position.x - node2.position.x
        const dy = node1.position.y - node2.position.y
        const dz = node1.position.z - node2.position.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1

        const force = 500 / (distance * distance)
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        const fz = (dz / distance) * force

        node1.position.x += fx * 0.1
        node1.position.y += fy * 0.1
        node1.position.z += fz * 0.1
        node2.position.x -= fx * 0.1
        node2.position.y -= fy * 0.1
        node2.position.z -= fz * 0.1
      }
    }

    // Attraction for linked nodes
    links.value.forEach((link) => {
      const sourceNode = nodes.value.find(n => n.id === link.source)
      const targetNode = nodes.value.find(n => n.id === link.target)

      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x
        const dy = targetNode.position.y - sourceNode.position.y
        const dz = targetNode.position.z - sourceNode.position.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        const force = distance * 0.02
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force
        const fz = (dz / distance) * force

        sourceNode.position.x += fx
        sourceNode.position.y += fy
        sourceNode.position.z += fz
        targetNode.position.x -= fx
        targetNode.position.y -= fy
        targetNode.position.z -= fz
      }
    })
  }
}

// Update layout
const updateLayout = () => {
  createGraph()
}

// Enhanced animation loop with performance monitoring
const animate = () => {
  if (!isAnimating.value) {
    animationId = requestAnimationFrame(animate)
    return
  }

  animationId = requestAnimationFrame(animate)

  // Performance monitoring
  const currentTime = performance.now()
  frameCount.value++

  if (currentTime - lastFrameTime.value >= 1000) {
    currentFPS.value = Math.round((frameCount.value * 1000) / (currentTime - lastFrameTime.value))
    frameCount.value = 0
    lastFrameTime.value = currentTime

    // Update performance status
    if (currentFPS.value >= 55) {
      performanceStatus.value = 'Excellent'
    } else if (currentFPS.value >= 45) {
      performanceStatus.value = 'Good'
    } else if (currentFPS.value >= 30) {
      performanceStatus.value = 'Fair'
    } else {
      performanceStatus.value = 'Poor'
    }
  }

  // Update controls
  if (controls) {
    controls.update()
  }

  // Animate node hovering effects
  if (hoveredNode.value && nodeObjects.length > 0) {
    nodeObjects.forEach((obj) => {
      if (obj.userData?.node && obj.userData.node.id === hoveredNode.value.id) {
        // Gentle pulsing animation for hovered nodes
        const scale = 1 + Math.sin(currentTime * 0.005) * 0.1
        obj.scale.setScalar(scale * nodeScale.value)
      } else if (obj.userData?.node) {
        obj.scale.setScalar(nodeScale.value)
      }
    })
  }

  // Render scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

// Node scale update function
const updateNodeScale = () => {
  nodeObjects.forEach((obj) => {
    if (obj.userData?.node) {
      obj.scale.setScalar(nodeScale.value)
    }
  })
}

// Toggle animation
const toggleAnimation = () => {
  isAnimating.value = !isAnimating.value
}

// Reset camera to default position
const resetCamera = async () => {
  if (!camera || !controls) return

  const _THREE = await import('three')

  // Smooth camera transition
  const startPosition = camera.position.clone()
  const endPosition = new THREE.Vector3(0, 0, 50)
  const startTime = performance.now()
  const duration = 1000 // 1 second

  const animateCameraReset = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Smooth easing
    const easeProgress = 1 - Math.pow(1 - progress, 3)

    camera.position.lerpVectors(startPosition, endPosition, easeProgress)
    camera.lookAt(0, 0, 0)

    if (progress < 1) {
      requestAnimationFrame(animateCameraReset)
    } else {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }

  requestAnimationFrame(animateCameraReset)
}

// Get node count by type for filtering
const getNodeCount = (type) => {
  return nodes.value.filter((node) => {
    if (!node.blocks) return false
    return node.blocks.some(block => block.type === type)
  }).length
}

// Update node visibility based on filters
const updateVisibility = () => {
  nodeObjects.forEach((obj) => {
    if (obj.userData?.node) {
      const node = obj.userData.node
      let shouldShow = false

      if (node.blocks) {
        shouldShow = node.blocks.some((block) => {
          switch (block.type) {
            case 'text':
              return showTextBlocks.value
            case 'code':
              return showCodeBlocks.value
            case 'image':
              return showImageBlocks.value
            case 'file':
              return showFileBlocks.value
            default:
              return true
          }
        })
      } else {
        shouldShow = true // Show nodes without blocks
      }

      obj.visible = shouldShow
    }
  })

  // Also update connections based on visible nodes
  linkObjects.forEach((link) => {
    const connection = link.userData
    if (connection) {
      const sourceNode = nodeObjects.find(obj =>
        obj.userData?.node && obj.userData.node.id === connection.source
      )
      const targetNode = nodeObjects.find(obj =>
        obj.userData?.node && obj.userData.node.id === connection.target
      )

      link.visible = sourceNode?.visible && targetNode?.visible
    }
  })
}

// Handle window resize
const onWindowResize = () => {
  if (camera && renderer && containerRef.value) {
    camera.aspect = containerRef.value.clientWidth / containerRef.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  }
}

// Enhanced mouse interaction with hover and focus effects
const onMouseClick = async (event) => {
  if (!camera || !scene) return

  const _THREE = await import('three')

  const rect = containerRef.value.getBoundingClientRect()
  const mouse = new THREE.Vector2()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObjects(nodeObjects.filter(obj => obj.userData?.node && obj.visible))

  if (intersects.length > 0) {
    const newSelectedNode = intersects[0].object.userData.node

    // Double-click detection for focus
    if (selectedNode.value && selectedNode.value.id === newSelectedNode.id) {
      const now = Date.now()
      if (now - (selectedNode.value.lastClickTime || 0) < 300) {
        // Double click - focus on node
        focusOnNode(newSelectedNode)
      }
    }

    selectedNode.value = newSelectedNode
    selectedNode.value.lastClickTime = Date.now()
    emit('select-page', selectedNode.value.id)

    // Update node highlighting
    updateNodeHighlighting()
  } else {
    selectedNode.value = null
    updateNodeHighlighting()
  }
}

// Handle mouse move for hover effects
const onMouseMove = async (event) => {
  if (!camera || !scene || !containerRef.value) return

  const _THREE = await import('three')

  const rect = containerRef.value.getBoundingClientRect()
  const mouse = new THREE.Vector2()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObjects(nodeObjects.filter(obj => obj.userData?.node && obj.visible))

  if (intersects.length > 0) {
    const newHoveredNode = intersects[0].object.userData.node
    if (!hoveredNode.value || hoveredNode.value.id !== newHoveredNode.id) {
      hoveredNode.value = newHoveredNode
      containerRef.value.style.cursor = 'pointer'
    }
  } else {
    hoveredNode.value = null
    containerRef.value.style.cursor = 'grab'
  }
}

// Focus camera on specific node
const focusOnNode = async (node) => {
  if (!camera || !controls) return

  const nodeObject = nodeObjects.find(obj =>
    obj.userData?.node && obj.userData.node.id === node.id
  )

  if (!nodeObject) return

  const _THREE = await import('three')

  const targetPosition = nodeObject.position.clone()
  targetPosition.z += 20 // Move camera closer to the node

  const startPosition = camera.position.clone()
  const startTarget = controls.target.clone()
  const endTarget = nodeObject.position.clone()

  const startTime = performance.now()
  const duration = 1500 // 1.5 seconds

  const animateToNode = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Smooth easing
    const easeProgress = 1 - Math.pow(1 - progress, 3)

    camera.position.lerpVectors(startPosition, targetPosition, easeProgress)
    controls.target.lerpVectors(startTarget, endTarget, easeProgress)
    controls.update()

    if (progress < 1) {
      requestAnimationFrame(animateToNode)
    }
  }

  requestAnimationFrame(animateToNode)
}

// Update node highlighting based on selection and hover
const updateNodeHighlighting = async () => {
  const _THREE = await import('three')

  nodeObjects.forEach((obj) => {
    if (obj.userData?.node) {
      const node = obj.userData.node

      // Reset material
      const originalColor = node.blocks?.length > 5 ? 0x6b7280 : 0x9ca3af

      if (selectedNode.value && node.id === selectedNode.value.id) {
        // Selected node - dark highlight
        obj.material.color.setHex(0x374151)
        obj.material.emissive.setHex(0x1f2937)
      } else if (hoveredNode.value && node.id === hoveredNode.value.id) {
        // Hovered node - subtle highlight
        obj.material.color.setHex(0x6b7280)
        obj.material.emissive.setHex(0x4b5563)
      } else {
        // Default state
        obj.material.color.setHex(originalColor)
        obj.material.emissive.setHex(0x000000)
      }
    }
  })
}

// Keyboard controls
const onKeyDown = (event) => {
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      resetCamera()
      break
    case 'KeyF':
      if (selectedNode.value) {
        focusOnNode(selectedNode.value)
      }
      break
    case 'KeyR':
      updateLayout()
      break
  }
}

// Lifecycle
onMounted(async () => {
  console.log('GraphView3D: Component mounted')
  console.log('GraphView3D: Received pages:', props.pages)
  await nextTick()
  await initThreeJS()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  if (renderer && containerRef.value?.contains(renderer.domElement)) {
    containerRef.value.removeChild(renderer.domElement)
    renderer.dispose()
  }

  window.removeEventListener('resize', onWindowResize)
})

// Watch for prop changes
watch(() => props.pages, () => {
  if (scene) {
    createGraph()
  }
}, { deep: true })

// Add enhanced event listeners
onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('click', onMouseClick)
    containerRef.value.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('click', onMouseClick)
    containerRef.value.removeEventListener('mousemove', onMouseMove)
  }
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.graph-3d-container {
  overflow: hidden;
}

.graph-3d-container canvas {
  display: block;
}

select {
  font-size: 12px;
}
</style>
