<template>
  <div class="graph-globe-container">
    <canvas ref="globeCanvas" />
    
    <!-- Node Info Tooltip -->
    <Transition name="tooltip">
      <div
        v-if="hoveredNode"
        class="node-tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-header">
          <Icon :name="getNodeIcon(hoveredNode)" />
          <span>{{ hoveredNode.title }}</span>
        </div>
        <div class="tooltip-details">
          <span class="node-type">{{ hoveredNode.type }}</span>
          <span class="node-connections">{{ hoveredNode.connections.length }} connections</span>
        </div>
        <div
          v-if="hoveredNode.dfsDepth !== undefined"
          class="dfs-info"
        >
          <span>DFS Depth: {{ hoveredNode.dfsDepth }}</span>
        </div>
      </div>
    </Transition>

    <!-- Controls -->
    <div class="globe-controls">
      <button
        class="control-btn"
        title="Toggle DFS Visualization"
        :class="{ active: dfsMode }"
        @click="toggleDFSMode"
      >
        <Icon name="heroicons:chart-bar" />
      </button>
      <button
        class="control-btn"
        title="Auto Rotate"
        :class="{ active: autoRotate }"
        @click="toggleAutoRotate"
      >
        <Icon name="heroicons:arrow-path" />
      </button>
      <button
        class="control-btn"
        title="Reset View"
        @click="resetView"
      >
        <Icon name="heroicons:arrow-uturn-left" />
      </button>
    </div>

    <!-- DFS Path Visualization -->
    <div
      v-if="dfsMode && dfsPath.length > 0"
      class="dfs-path-info"
    >
      <h4>DFS Traversal Path</h4>
      <div class="path-nodes">
        <span
          v-for="(nodeId, index) in dfsPath"
          :key="nodeId"
          class="path-node"
          :style="{ backgroundColor: getNodeColorByDepth(index) }"
        >
          {{ getNodeById(nodeId)?.title || nodeId }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { useGraph3D } from '@/features/graph3d/composables/useGraph3D'
import { useWindowManager } from '@/composables/useWindowManager'

const globeCanvas = ref<HTMLCanvasElement>()
const hoveredNode = ref<any>(null)
const tooltipStyle = ref({})
const dfsMode = ref(false)
const autoRotate = ref(true)
const dfsPath = ref<string[]>([])

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let nodeObjects = new Map<string, THREE.Mesh>()
let connectionLines: THREE.Line[] = []
let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()

const graph = useGraph3D()
const windowManager = useWindowManager()

// DFS color mapping based on depth
const dfsColors = [
  '#ef4444', // red - depth 0
  '#f97316', // orange - depth 1
  '#eab308', // yellow - depth 2
  '#84cc16', // lime - depth 3
  '#22c55e', // green - depth 4
  '#06b6d4', // cyan - depth 5
  '#3b82f6', // blue - depth 6
  '#8b5cf6', // violet - depth 7
  '#d946ef', // fuchsia - depth 8
  '#ec4899'  // pink - depth 9+
]

const getNodeColorByDepth = (depth: number): string => {
  return dfsColors[Math.min(depth, dfsColors.length - 1)]
}

const getNodeIcon = (node: any): string => {
  const icons: Record<string, string> = {
    workspace: 'heroicons:squares-2x2',
    page: 'heroicons:document-text',
    block: 'heroicons:cube',
    file: 'heroicons:document',
    app: 'heroicons:window',
    settings: 'heroicons:cog-6-tooth'
  }
  return icons[node.type] || 'heroicons:circle-stack'
}

const getNodeById = (nodeId: string) => {
  return graph.nodes.value.find(n => n.id === nodeId)
}

const initThreeJS = () => {
  if (!globeCanvas.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)

  // Camera setup
  const width = window.innerWidth
  const height = window.innerHeight
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
  camera.position.z = 15

  // Renderer setup
  renderer = new THREE.WebGLRenderer({
    canvas: globeCanvas.value,
    antialias: true,
    alpha: true
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = 0.5
  controls.autoRotate = autoRotate.value
  controls.autoRotateSpeed = 0.5

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 0.8)
  pointLight.position.set(10, 10, 10)
  scene.add(pointLight)

  // Add stars background
  const starsGeometry = new THREE.BufferGeometry()
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.02,
    transparent: true,
    opacity: 0.8
  })

  const starsVertices = []
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 200
    const y = (Math.random() - 0.5) * 200
    const z = (Math.random() - 0.5) * 200
    starsVertices.push(x, y, z)
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
  const stars = new THREE.Points(starsGeometry, starsMaterial)
  scene.add(stars)
}

const loadSystemNodes = () => {
  // Clear existing
  nodeObjects.forEach(obj => scene.remove(obj))
  nodeObjects.clear()
  connectionLines.forEach(line => scene.remove(line))
  connectionLines = []

  // Create sample system nodes
  const systemNodes = [
    { id: 'workspace-1', title: 'Main Workspace', type: 'workspace' },
    { id: 'workspace-2', title: 'Dev Workspace', type: 'workspace' },
    { id: 'app-terminal', title: 'Terminal', type: 'app' },
    { id: 'app-editor', title: 'Code Editor', type: 'app' },
    { id: 'app-browser', title: 'Browser', type: 'app' },
    { id: 'settings-main', title: 'Settings', type: 'settings' },
    { id: 'page-1', title: 'Documentation', type: 'page' },
    { id: 'page-2', title: 'README', type: 'page' },
    { id: 'block-1', title: 'Code Block', type: 'block' },
    { id: 'block-2', title: 'Text Block', type: 'block' }
  ]

  // Add nodes to graph
  systemNodes.forEach(node => {
    if (!graph.nodes.value.find(n => n.id === node.id)) {
      graph.createNode(node)
    }
  })

  // Create connections
  graph.createConnection({ sourceId: 'workspace-1', targetId: 'page-1' })
  graph.createConnection({ sourceId: 'workspace-1', targetId: 'page-2' })
  graph.createConnection({ sourceId: 'workspace-2', targetId: 'app-terminal' })
  graph.createConnection({ sourceId: 'workspace-2', targetId: 'app-editor' })
  graph.createConnection({ sourceId: 'page-1', targetId: 'block-1' })
  graph.createConnection({ sourceId: 'page-2', targetId: 'block-2' })

  // Position nodes on sphere
  const radius = 8
  graph.nodes.value.forEach((node, index) => {
    const phi = Math.acos(1 - 2 * (index + 0.5) / graph.nodes.value.length)
    const theta = Math.PI * (1 + Math.sqrt(5)) * index

    node.position = {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    }

    // Create 3D object for node
    const geometry = new THREE.SphereGeometry(0.3, 32, 16)
    const color = dfsMode.value && node.dfsDepth !== undefined
      ? new THREE.Color(getNodeColorByDepth(node.dfsDepth))
      : new THREE.Color(graph.config.value.colors[node.type] || '#ffffff')
    
    const material = new THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(node.position.x, node.position.y, node.position.z)
    mesh.userData = { node }
    
    scene.add(mesh)
    nodeObjects.set(node.id, mesh)
  })

  // Create connection lines
  graph.connections.value.forEach(conn => {
    const sourceNode = graph.nodes.value.find(n => n.id === conn.sourceId)
    const targetNode = graph.nodes.value.find(n => n.id === conn.targetId)
    
    if (sourceNode && targetNode) {
      const points = [
        new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z),
        new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z)
      ]
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: dfsMode.value ? 0x4a90e2 : 0x666666,
        opacity: dfsMode.value ? 0.8 : 0.3,
        transparent: true
      })
      
      const line = new THREE.Line(geometry, material)
      scene.add(line)
      connectionLines.push(line)
    }
  })
}

const performDFSVisualization = () => {
  if (graph.nodes.value.length === 0) return

  // Perform DFS from first workspace node
  const startNode = graph.nodes.value.find(n => n.type === 'workspace') || graph.nodes.value[0]
  
  dfsPath.value = []
  graph.dfsTraverse(startNode.id, (node, depth, path) => {
    node.dfsDepth = depth
    dfsPath.value = path
    
    // Update node color based on DFS depth
    const mesh = nodeObjects.get(node.id)
    if (mesh) {
      const color = new THREE.Color(getNodeColorByDepth(depth))
      ;(mesh.material as THREE.MeshPhongMaterial).color = color
      ;(mesh.material as THREE.MeshPhongMaterial).emissive = color
    }
  })
}

const toggleDFSMode = () => {
  dfsMode.value = !dfsMode.value
  if (dfsMode.value) {
    performDFSVisualization()
  } else {
    // Reset colors
    graph.nodes.value.forEach(node => {
      node.dfsDepth = undefined
      const mesh = nodeObjects.get(node.id)
      if (mesh) {
        const color = new THREE.Color(graph.config.value.colors[node.type] || '#ffffff')
        ;(mesh.material as THREE.MeshPhongMaterial).color = color
        ;(mesh.material as THREE.MeshPhongMaterial).emissive = color
      }
    })
    dfsPath.value = []
  }
}

const toggleAutoRotate = () => {
  autoRotate.value = !autoRotate.value
  if (controls) {
    controls.autoRotate = autoRotate.value
  }
}

const resetView = () => {
  if (camera && controls) {
    camera.position.set(0, 0, 15)
    controls.reset()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  const rect = globeCanvas.value?.getBoundingClientRect()
  if (!rect) return

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  // Raycast for hover
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(Array.from(nodeObjects.values()))

  if (intersects.length > 0) {
    const node = intersects[0].object.userData.node
    hoveredNode.value = node
    tooltipStyle.value = {
      left: `${event.clientX + 10}px`,
      top: `${event.clientY - 40}px`
    }
  } else {
    hoveredNode.value = null
  }
}

const handleClick = (event: MouseEvent) => {
  const rect = globeCanvas.value?.getBoundingClientRect()
  if (!rect) return

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(Array.from(nodeObjects.values()))

  if (intersects.length > 0) {
    const node = intersects[0].object.userData.node
    
    // Open corresponding window/app
    if (node.type === 'app') {
      windowManager.createWindow({
        type: node.id.replace('app-', ''),
        title: node.title,
        icon: getNodeIcon(node)
      })
    }
  }
}

const animate = () => {
  requestAnimationFrame(animate)
  
  if (controls) {
    controls.update()
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

const handleResize = () => {
  if (!camera || !renderer) return
  
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  initThreeJS()
  loadSystemNodes()
  animate()

  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('click', handleClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('click', handleClick)
  
  if (renderer) {
    renderer.dispose()
  }
})
</script>

<style scoped>
.graph-globe-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* Node Tooltip */
.node-tooltip {
  position: fixed;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  pointer-events: none;
  z-index: 1000;
  min-width: 200px;
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: white;
  font-weight: 500;
}

.tooltip-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.node-type {
  text-transform: capitalize;
}

.dfs-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: #4a90e2;
}

/* Controls */
.globe-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: rgba(40, 40, 40, 0.9);
  transform: scale(1.05);
}

.control-btn.active {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  border-color: #4a90e2;
}

/* DFS Path Info */
.dfs-path-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  max-width: 400px;
  max-height: 200px;
  overflow-y: auto;
}

.dfs-path-info h4 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
}

.path-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.path-node {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: white;
  white-space: nowrap;
}

/* Transitions */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>