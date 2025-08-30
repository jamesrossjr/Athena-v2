<template>
  <div
    ref="containerRef"
    class="athena-3d-container"
  >
    <!-- Canvas for Three.js -->
    <canvas ref="canvasRef" />

    <!-- Interaction overlay -->
    <div class="athena-overlay">
      <!-- Speech bubble -->
      <Transition name="bubble">
        <div
          v-if="speechBubble.visible"
          class="speech-bubble"
        >
          <div class="speech-content">
            {{ speechBubble.text }}
          </div>
          <div class="speech-tail" />
        </div>
      </Transition>

      <!-- Status indicator -->
      <div
        class="status-indicator"
        :class="statusClass"
      >
        <div class="status-dot" />
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- Voice visualization -->
      <div
        v-if="isListening"
        class="voice-waves"
      >
        <div
          v-for="i in 5"
          :key="i"
          class="wave"
          :style="{ animationDelay: `${i * 0.1}s` }"
        />
      </div>
    </div>

    <!-- Todo quick actions -->
    <Transition name="actions">
      <div
        v-if="showActions"
        class="quick-actions"
      >
        <button
          v-for="action in quickActions"
          :key="action.id"
          class="action-btn"
          @click="executeAction(action)"
        >
          <Icon :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface Props {
  modelUrl?: string
  interactive?: boolean
  size?: { width: number, height: number }
  position?: { x: number, y: number, z: number }
}

const props = withDefaults(defineProps<Props>(), {
  modelUrl: '/models/athena-owl.glb',
  interactive: true,
  size: { width: 400, height: 400 },
  position: { x: 0, y: 0, z: 0 }
})

const emit = defineEmits<{
  command: [command: string]
  action: [action: string, data?: any]
  ready: []
}>()

// Refs
const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()

// State
const isListening = ref(false)
const isThinking = ref(false)
const isReady = ref(false)
const showActions = ref(false)
const speechBubble = ref({
  visible: false,
  text: ''
})

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let model: THREE.Group
let controls: OrbitControls
let animationId: number
let mixer: THREE.AnimationMixer
let idleAnimation: THREE.AnimationAction
let talkAnimation: THREE.AnimationAction
let thinkAnimation: THREE.AnimationAction

// Computed
const statusClass = computed(() => {
  if (isListening.value) return 'listening'
  if (isThinking.value) return 'thinking'
  if (isReady.value) return 'ready'
  return 'idle'
})

const statusText = computed(() => {
  if (isListening.value) return 'Listening...'
  if (isThinking.value) return 'Thinking...'
  if (isReady.value) return 'Ready'
  return 'Loading...'
})

const quickActions = [
  { id: 'create-todo', icon: 'mdi:plus-circle', label: 'New Todo' },
  { id: 'view-todos', icon: 'mdi:format-list-checkbox', label: 'View Todos' },
  { id: 'voice-command', icon: 'mdi:microphone', label: 'Voice Command' },
  { id: 'workflow', icon: 'mdi:graph', label: 'Workflows' }
]

// Initialize Three.js scene
const initThree = () => {
  if (!containerRef.value || !canvasRef.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = null // Transparent background

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    45,
    props.size.width / props.size.height,
    0.1,
    1000
  )
  camera.position.set(0, 2, 5)
  camera.lookAt(0, 0, 0)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true
  })
  renderer.setSize(props.size.width, props.size.height)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 50
  directionalLight.shadow.camera.left = -10
  directionalLight.shadow.camera.right = 10
  directionalLight.shadow.camera.top = 10
  directionalLight.shadow.camera.bottom = -10
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // Rim light for character glow
  const rimLight = new THREE.DirectionalLight(0x4a90e2, 0.4)
  rimLight.position.set(-5, 5, -5)
  scene.add(rimLight)

  // Controls
  if (props.interactive) {
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false
    controls.minDistance = 3
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI / 2
  }

  // Load model
  loadModel()

  // Start animation loop
  animate()
}

// Load 3D model
const loadModel = () => {
  // Create a simple owl geometry as fallback
  createOwlGeometry()

  // Try to load GLTF model if available
  if (props.modelUrl && props.modelUrl !== '/models/athena-owl.glb') {
    const loader = new GLTFLoader()
    loader.load(
      props.modelUrl,
      (gltf) => {
        if (model) scene.remove(model)
        model = gltf.scene
        model.position.set(props.position.x, props.position.y, props.position.z)
        model.scale.set(1, 1, 1)

        // Setup animations if available
        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model)
          idleAnimation = mixer.clipAction(gltf.animations[0])
          if (gltf.animations[1]) talkAnimation = mixer.clipAction(gltf.animations[1])
          if (gltf.animations[2]) thinkAnimation = mixer.clipAction(gltf.animations[2])

          idleAnimation.play()
        }

        scene.add(model)
        isReady.value = true
        emit('ready')
      },
      (progress) => {
        console.log('Loading model:', (progress.loaded / progress.total * 100) + '%')
      },
      (error) => {
        console.warn('Failed to load GLTF model, using fallback:', error)
      }
    )
  }
}

// Create procedural owl geometry
const createOwlGeometry = () => {
  const owlGroup = new THREE.Group()

  // Body (sphere)
  const bodyGeometry = new THREE.SphereGeometry(1, 32, 32)
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x8b7355,
    emissive: 0x4a90e2,
    emissiveIntensity: 0.1
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  body.receiveShadow = true
  owlGroup.add(body)

  // Head (smaller sphere)
  const headGeometry = new THREE.SphereGeometry(0.7, 32, 32)
  const headMaterial = new THREE.MeshPhongMaterial({
    color: 0x8b7355,
    emissive: 0x4a90e2,
    emissiveIntensity: 0.1
  })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 1.2
  head.castShadow = true
  head.receiveShadow = true
  owlGroup.add(head)

  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16)
  const eyeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x4a90e2,
    emissiveIntensity: 0.3
  })

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  leftEye.position.set(-0.25, 1.3, 0.6)
  owlGroup.add(leftEye)

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
  rightEye.position.set(0.25, 1.3, 0.6)
  owlGroup.add(rightEye)

  // Pupils
  const pupilGeometry = new THREE.SphereGeometry(0.1, 8, 8)
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })

  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
  leftPupil.position.set(-0.25, 1.3, 0.75)
  owlGroup.add(leftPupil)

  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
  rightPupil.position.set(0.25, 1.3, 0.75)
  owlGroup.add(rightPupil)

  // Beak
  const beakGeometry = new THREE.ConeGeometry(0.15, 0.3, 4)
  const beakMaterial = new THREE.MeshPhongMaterial({ color: 0xffa500 })
  const beak = new THREE.Mesh(beakGeometry, beakMaterial)
  beak.position.set(0, 1.1, 0.7)
  beak.rotation.x = Math.PI / 2
  owlGroup.add(beak)

  // Wings
  const wingGeometry = new THREE.SphereGeometry(0.6, 16, 16)
  const wingMaterial = new THREE.MeshPhongMaterial({
    color: 0x6b5843,
    emissive: 0x4a90e2,
    emissiveIntensity: 0.05
  })

  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
  leftWing.position.set(-0.8, 0, 0)
  leftWing.scale.set(0.5, 1.2, 0.3)
  owlGroup.add(leftWing)

  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
  rightWing.position.set(0.8, 0, 0)
  rightWing.scale.set(0.5, 1.2, 0.3)
  owlGroup.add(rightWing)

  // Add glow effect
  const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)
  owlGroup.add(glow)

  model = owlGroup
  model.position.set(props.position.x, props.position.y, props.position.z)
  scene.add(model)

  isReady.value = true
  emit('ready')
}

// Animation loop
const animate = () => {
  animationId = requestAnimationFrame(animate)

  // Update controls
  if (controls) controls.update()

  // Update mixer
  if (mixer) mixer.update(0.016)

  // Idle animation
  if (model && !mixer) {
    model.rotation.y += 0.005
    model.position.y = props.position.y + Math.sin(Date.now() * 0.001) * 0.1
  }

  // Thinking animation
  if (isThinking.value && model) {
    model.rotation.y += 0.02
  }

  // Render
  renderer.render(scene, camera)
}

// Handle window resize
const handleResize = () => {
  if (!camera || !renderer) return

  camera.aspect = props.size.width / props.size.height
  camera.updateProjectionMatrix()
  renderer.setSize(props.size.width, props.size.height)
}

// Public methods
const speak = (text: string, duration = 3000) => {
  speechBubble.value.text = text
  speechBubble.value.visible = true

  if (talkAnimation) {
    idleAnimation?.stop()
    talkAnimation.play()
  }

  setTimeout(() => {
    speechBubble.value.visible = false
    if (talkAnimation) {
      talkAnimation.stop()
      idleAnimation?.play()
    }
  }, duration)
}

const startListening = () => {
  isListening.value = true
  showActions.value = false
}

const stopListening = () => {
  isListening.value = false
}

const startThinking = () => {
  isThinking.value = true
  if (thinkAnimation) {
    idleAnimation?.stop()
    thinkAnimation.play()
  }
}

const stopThinking = () => {
  isThinking.value = false
  if (thinkAnimation) {
    thinkAnimation.stop()
    idleAnimation?.play()
  }
}

const executeAction = (action: any) => {
  emit('action', action.id, action)
  showActions.value = false
}

// Lifecycle
onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (controls) controls.dispose()
})

// Expose methods
defineExpose({
  speak,
  startListening,
  stopListening,
  startThinking,
  stopThinking
})
</script>

<style scoped>
.athena-3d-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.athena-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 20px;
}

.speech-bubble {
  position: absolute;
  bottom: 85%;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
  border: 1px solid rgba(74, 144, 226, 0.3);
  border-radius: 20px;
  padding: 15px 20px;
  max-width: 300px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
}

.speech-content {
  color: #333;
  font-size: 14px;
  line-height: 1.5;
}

.speech-tail {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(240, 248, 255, 0.95);
}

.status-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  animation: pulse 2s infinite;
}

.status-text {
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.ready .status-dot {
  background: #4ade80;
}

.status-indicator.listening .status-dot {
  background: #60a5fa;
  animation: pulse 0.5s infinite;
}

.status-indicator.thinking .status-dot {
  background: #fbbf24;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.voice-waves {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  pointer-events: none;
}

.wave {
  width: 4px;
  height: 20px;
  background: linear-gradient(to top, #4a90e2, #60a5fa);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.quick-actions {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(74, 144, 226, 0.3);
}

/* Transitions */
.bubble-enter-active, .bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(10px) scale(0.8);
}

.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.8);
}

.actions-enter-active, .actions-leave-active {
  transition: all 0.3s ease;
}

.actions-enter-from, .actions-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
