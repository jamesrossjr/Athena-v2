<script setup>
// Block-based editor for Canvas
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import CodeBlock from './blocks/CodeBlock.vue'
import MediaBlock from './blocks/MediaBlock.vue'
import TableBlock from './blocks/TableBlock.vue'
import EmbedBlock from './blocks/EmbedBlock.vue'
import GraphView3D from '../../graph3d/components/GraphView3D.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  showCanvas: {
    type: Boolean,
    default: false
  },
  canvasMode: {
    type: String,
    default: 'infinite' // 'infinite' or '3d'
  },
  allPages: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'update:showCanvas', 'update:canvasMode'])

// Editor state
const blocks = ref(props.modelValue && props.modelValue.length
  ? props.modelValue
  : [
      { id: 'initial', type: 'paragraph', content: '', position: 0 }
    ])

// Template refs for scroll synchronization
const lineNumbersContainer = ref(null)
const contentContainer = ref(null)

// Computed property for minimum height that's SSR-safe
const containerMinHeight = computed(() => {
  const windowHeight = (import.meta.client && typeof window !== 'undefined') ? window.innerHeight : 800
  return Math.max(windowHeight, blocks.value.length * 24 + 200) + 'px'
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue.length > 0 && JSON.stringify(newValue) !== JSON.stringify(blocks.value)) {
    blocks.value = newValue
  }
}, { deep: true })

// Watch for canvas mode changes from parent
watch(() => props.showCanvas, (newValue) => {
  console.log('BlockEditor: showCanvas changed to', newValue, 'canvasMode:', props.canvasMode)
  if (newValue) {
    if (props.canvasMode === '3d') {
      console.log('BlockEditor: Activating 3D graph')
      show3DGraph.value = true
      infiniteCanvas.value = false
    } else {
      console.log('BlockEditor: Activating infinite canvas')
      infiniteCanvas.value = true
      show3DGraph.value = false
    }
  } else {
    console.log('BlockEditor: Deactivating canvas modes')
    infiniteCanvas.value = false
    show3DGraph.value = false
  }
})

watch(() => props.canvasMode, (newValue) => {
  if (props.showCanvas) {
    if (newValue === '3d') {
      show3DGraph.value = true
      infiniteCanvas.value = false
    } else {
      infiniteCanvas.value = true
      show3DGraph.value = false
    }
  }
})

const activeBlockId = ref('initial')
const showSlashCommand = ref(false)
const slashCommandPosition = ref({ x: 0, y: 0 })
const slashQuery = ref('')
const blockSpacing = ref(1) // Default block spacing multiplier
const selectedCommandIndex = ref(0) // For keyboard navigation
const scrollOffset = ref(0) // For slash menu scrolling
const maxVisibleCommands = 5 // Maximum visible commands in slash menu
const pageWidth = ref('normal') // Page width mode: 'normal', 'landscape', 'full'
const infiniteCanvas = ref(props.showCanvas && props.canvasMode === 'infinite') // Infinite canvas mode (2D scrolling)
const show3DGraph = ref(props.showCanvas && props.canvasMode === '3d') // 3D graph view mode

// Debug computed to track canvas state
const canvasDebug = computed(() => ({
  showCanvas: props.showCanvas,
  canvasMode: props.canvasMode,
  infiniteCanvas: infiniteCanvas.value,
  show3DGraph: show3DGraph.value
}))

// Watch for debugging
watch(() => canvasDebug.value, (newValue) => {
  console.log('BlockEditor canvas debug:', newValue)
}, { deep: true })
const pageNodes = ref([]) // Page nodes on the canvas
const canvasOffset = ref({ x: 0, y: 0 }) // Canvas pan offset
const canvasZoom = ref(1) // Canvas zoom level
const pageLinks = ref(new Map()) // Map of page connections: pageId -> Set of linked pageIds
const currentPageId = ref(null) // Currently active page ID
const selectedPageId = ref(null) // Currently selected page ID in canvas

// Advanced block management state
const isUploading = ref(false)
const uploadProgress = ref(0)

// Block types available via slash commands
const blockTypes = [
  // Basic text blocks
  { type: 'paragraph', label: 'Text', description: 'Just start writing with plain text', icon: '📝', category: 'basic' },
  { type: 'heading1', label: 'Heading 1', description: 'Big section heading', icon: '📋', category: 'basic' },
  { type: 'heading2', label: 'Heading 2', description: 'Medium section heading', icon: '📄', category: 'basic' },
  { type: 'heading3', label: 'Heading 3', description: 'Small section heading', icon: '📃', category: 'basic' },
  { type: 'bulletList', label: 'Bullet List', description: 'Create a simple bullet list', icon: '•', category: 'basic' },
  { type: 'numberedList', label: 'Numbered List', description: 'Create a numbered list', icon: '🔢', category: 'basic' },
  { type: 'quote', label: 'Quote', description: 'Capture a quote', icon: '💬', category: 'basic' },
  { type: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: '—', category: 'basic' },

  // Rich media blocks
  { type: 'image', label: 'Image', description: 'Upload or embed an image', icon: '🖼️', category: 'media' },
  { type: 'video', label: 'Video', description: 'Embed a video from URL or upload', icon: '🎥', category: 'media' },
  { type: 'audio', label: 'Audio', description: 'Add audio files or recordings', icon: '🎵', category: 'media' },
  { type: 'file', label: 'File', description: 'Upload any file type', icon: '📎', category: 'media' },
  { type: 'embed', label: 'Embed', description: 'Embed content from other sites', icon: '🔗', category: 'media' },

  // Advanced blocks
  { type: 'codeBlock', label: 'Code Block', description: 'Add code with syntax highlighting', icon: '💻', category: 'advanced' },
  { type: 'table', label: 'Table', description: 'Create a responsive table', icon: '📊', category: 'advanced' },
  { type: 'math', label: 'Math', description: 'Add mathematical equations', icon: '∑', category: 'advanced' },
  { type: 'chart', label: 'Chart', description: 'Create data visualizations', icon: '📈', category: 'advanced' },
  { type: 'callout', label: 'Callout', description: 'Highlight important information', icon: '💡', category: 'advanced' },
  { type: 'toggle', label: 'Toggle', description: 'Collapsible content section', icon: '🔽', category: 'advanced' },
  { type: 'bookmark', label: 'Bookmark', description: 'Save links with preview', icon: '🔖', category: 'advanced' },

  // Spacing controls
  { type: 'spacing-0.5', label: 'Tight Spacing', description: 'Reduce space between blocks', icon: '⬇️', category: 'spacing' },
  { type: 'spacing-1', label: 'Normal Spacing', description: 'Default block spacing', icon: '↕️', category: 'spacing' },
  { type: 'spacing-1.5', label: 'Relaxed Spacing', description: 'More space between blocks', icon: '⬆️', category: 'spacing' },
  { type: 'spacing-2', label: 'Loose Spacing', description: 'Extra space between blocks', icon: '⬆️⬆️', category: 'spacing' },

  // Page width controls
  { type: 'width-full', label: 'Full Width', description: 'Use full page width', icon: '📏', category: 'layout' },
  { type: 'width-landscape', label: 'Landscape Width', description: 'Landscape page width', icon: '📄', category: 'layout' },
  { type: 'width-normal', label: 'Normal Width', description: 'Standard page width', icon: '📃', category: 'layout' },

  // Canvas controls
  { type: 'canvas-infinite', label: 'Infinite Canvas', description: 'Enable 2D infinite whiteboard', icon: '🎨', category: 'layout' },
  { type: 'canvas-3d', label: '3D Graph View', description: 'View interconnected pages in 3D', icon: '🌐', category: 'layout' },
  { type: 'canvas-normal', label: 'Normal Mode', description: 'Standard document mode', icon: '📝', category: 'layout' },
  { type: 'page', label: 'Page Node', description: 'Create a page node on canvas', icon: '📄', category: 'canvas' }
]

// Filtered block types based on slash query
const filteredBlockTypes = computed(() => {
  if (!slashQuery.value) return blockTypes
  return blockTypes.filter(type =>
    type.label.toLowerCase().includes(slashQuery.value.toLowerCase())
    || type.description.toLowerCase().includes(slashQuery.value.toLowerCase())
  )
})

// Visible block types (limited to 5 with scrolling)
const visibleBlockTypes = computed(() => {
  const filtered = filteredBlockTypes.value
  const start = scrollOffset.value
  const end = start + maxVisibleCommands
  return filtered.slice(start, end)
})

// Add new block
const addBlock = (afterId, type = 'paragraph') => {
  const afterIndex = blocks.value.findIndex(block => block.id === afterId)
  const newBlock = {
    id: `block-${Date.now()}`,
    type,
    content: '',
    position: afterIndex + 1
  }

  blocks.value.splice(afterIndex + 1, 0, newBlock)

  // Update positions
  blocks.value.forEach((block, index) => {
    block.position = index
  })

  emit('update:modelValue', blocks.value)

  // Focus new block
  nextTick(() => {
    focusBlock(newBlock.id)
  })

  return newBlock.id
}

// Focus a specific block
const focusBlock = (blockId) => {
  activeBlockId.value = blockId
  nextTick(() => {
    // Try to find the main textarea first, then fallback to any input/textarea
    let element = document.querySelector(`[data-block-id="${blockId}"] textarea:not([readonly])`)
    if (!element) {
      element = document.querySelector(`[data-block-id="${blockId}"] textarea, [data-block-id="${blockId}"] input`)
    }
    element?.focus()
  })
}

// Navigate between blocks with arrow keys
const navigateToBlock = (currentBlockId, direction) => {
  const currentIndex = blocks.value.findIndex(block => block.id === currentBlockId)
  if (currentIndex === -1) return

  let targetIndex
  if (direction === 'up' && currentIndex > 0) {
    targetIndex = currentIndex - 1
  } else if (direction === 'down' && currentIndex < blocks.value.length - 1) {
    targetIndex = currentIndex + 1
  } else {
    return // No navigation needed
  }

  const targetBlock = blocks.value[targetIndex]
  focusBlock(targetBlock.id)

  // Position cursor at appropriate location
  nextTick(() => {
    // Find editable textarea (not readonly)
    const element = document.querySelector(`[data-block-id="${targetBlock.id}"] textarea:not([readonly])`)
    if (element && !element.readOnly) {
      if (direction === 'up') {
        // Move to end of previous block
        element.setSelectionRange(element.value.length, element.value.length)
      } else {
        // Move to beginning of next block
        element.setSelectionRange(0, 0)
      }
    }
    // For readonly blocks (like dividers), just focus is enough
  })
}

// Handle Enter key - create new block
const handleEnter = (blockId, event) => {
  event.preventDefault()
  const newBlockId = addBlock(blockId)
  focusBlock(newBlockId)
}

// Handle content changes and auto-convert empty blocks back to paragraphs
const handleContentChange = (blockId, content, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  // Update block content first
  block.content = content

  // If content is empty and block is not paragraph, convert back to paragraph
  if (content === '' && block.type !== 'paragraph') {
    block.type = 'paragraph'
    block.content = ''
    emit('update:modelValue', blocks.value)
    return
  }

  // Handle slash commands
  if (content.startsWith('/')) {
    handleSlashCommand(blockId, content, event)
  } else {
    // Hide slash command menu if not typing slash command
    if (showSlashCommand.value) {
      showSlashCommand.value = false
      slashQuery.value = ''
    }
  }

  emit('update:modelValue', blocks.value)
}

// Handle [[page]] linking syntax
const _handlePageLinking = (blockId, content) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  // Find all [[page]] links in the content
  const linkPattern = /\[\[([^\]]+)\]\]/g
  const links = []
  let match

  while ((match = linkPattern.exec(content)) !== null) {
    const pageName = match[1].trim()
    if (pageName) {
      links.push(pageName)
    }
  }

  // Update block content
  block.content = content

  // If in canvas mode and we have links, create page nodes for them
  if (infiniteCanvas.value && links.length > 0) {
    links.forEach(pageName => createLinkedPageNode(pageName, blockId))
  }

  emit('update:modelValue', blocks.value)
}

// Handle slash command
const handleSlashCommand = (blockId, content, event) => {
  const query = content.slice(1) // Remove the '/'
  slashQuery.value = query
  selectedCommandIndex.value = 0 // Reset selection
  scrollOffset.value = 0 // Reset scroll position

  // Check for direct shortcuts
  const directShortcuts = {
    h1: 'heading1',
    h2: 'heading2',
    h3: 'heading3',
    code: 'codeBlock',
    table: 'table',
    img: 'image',
    video: 'video',
    quote: 'quote',
    list: 'bulletList',
    ol: 'numberedList',
    full: 'width-full',
    landscape: 'width-landscape',
    normal: 'width-normal',
    canvas: 'canvas-infinite',
    whiteboard: 'canvas-infinite',
    page: 'page'
  }

  // If it's a direct shortcut, apply it immediately
  if (directShortcuts[query.toLowerCase()]) {
    applyBlockType(blockId, directShortcuts[query.toLowerCase()])
    return
  }

  // Show slash command menu
  showSlashCommand.value = true

  // Position slash command menu
  if (event && event.target) {
    const rect = event.target.getBoundingClientRect()
    slashCommandPosition.value = {
      x: rect.left,
      y: rect.bottom + 8
    }
  }
}

// Apply block type from slash command
const applyBlockType = (blockId, type) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  // Handle spacing commands
  if (type.startsWith('spacing-')) {
    const spacingValue = parseFloat(type.replace('spacing-', ''))
    blockSpacing.value = spacingValue
    block.content = '' // Clear the slash command
  } else if (type.startsWith('width-')) {
    const widthMode = type.replace('width-', '')
    pageWidth.value = widthMode
    block.content = '' // Clear the slash command
  } else if (type.startsWith('canvas-')) {
    const canvasMode = type.replace('canvas-', '')
    infiniteCanvas.value = canvasMode === 'infinite' || canvasMode === '3d'
    show3DGraph.value = canvasMode === '3d'
    block.content = '' // Clear the slash command
  } else if (type === 'page') {
    createPageNode()
    block.content = '' // Clear the slash command
  } else {
    block.type = type

    // Initialize content based on block type
    switch (type) {
      case 'codeBlock':
        block.content = {
          language: 'javascript',
          code: '',
          showLineNumbers: true,
          theme: 'vscode-dark'
        }
        break
      case 'table':
        block.content = {
          headers: ['Column 1', 'Column 2', 'Column 3'],
          rows: [['', '', ''], ['', '', '']]
        }
        break
      case 'callout':
        block.content = {
          type: 'info', // info, warning, error, success
          title: '',
          content: ''
        }
        break
      case 'toggle':
        block.content = {
          title: '',
          content: '',
          isOpen: false
        }
        break
      case 'math':
        block.content = {
          formula: '',
          display: 'block' // block or inline
        }
        break
      case 'image':
        // Trigger file upload
        nextTick(() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = (e) => {
            const file = e.target.files[0]
            if (file) handleFileUpload(file, blockId)
          }
          input.click()
        })
        return // Don't clear content yet
      case 'video':
      case 'audio':
      case 'file':
        // Trigger file upload
        nextTick(() => {
          const input = document.createElement('input')
          input.type = 'file'
          if (type === 'video') input.accept = 'video/*'
          else if (type === 'audio') input.accept = 'audio/*'
          input.onchange = (e) => {
            const file = e.target.files[0]
            if (file) handleFileUpload(file, blockId)
          }
          input.click()
        })
        return // Don't clear content yet
      case 'embed':
        block.content = {}
        break
      default:
        block.content = '' // Clear the slash command for basic blocks
    }
  }

  showSlashCommand.value = false
  slashQuery.value = ''

  emit('update:modelValue', blocks.value)

  nextTick(() => {
    focusBlock(blockId)
  })
}

// Handle keyboard navigation in slash command menu
const handleKeyNavigation = (blockId, event) => {
  if (!showSlashCommand.value) return false

  const filtered = filteredBlockTypes.value

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filtered.length - 1)
    updateScrollOffset()
    return true
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
    updateScrollOffset()
    return true
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (filtered[selectedCommandIndex.value]) {
      applyBlockType(blockId, filtered[selectedCommandIndex.value].type)
    }
    return true
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    showSlashCommand.value = false
    slashQuery.value = ''
    return true
  }

  return false
}

// Handle mouse wheel navigation in slash command menu
const handleSlashMenuWheel = (event) => {
  if (!showSlashCommand.value) return

  event.preventDefault()
  const filtered = filteredBlockTypes.value

  if (filtered.length === 0) return

  // Scroll down (positive deltaY) = move selection down
  // Scroll up (negative deltaY) = move selection up
  if (event.deltaY > 0) {
    selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filtered.length - 1)
  } else {
    selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
  }

  // Update scroll offset to keep selected item visible
  updateScrollOffset()
}

// Update scroll offset to keep selected item in view
const updateScrollOffset = () => {
  const filtered = filteredBlockTypes.value
  const selectedIndex = selectedCommandIndex.value

  // If selected item is below visible area, scroll down
  if (selectedIndex >= scrollOffset.value + maxVisibleCommands) {
    scrollOffset.value = selectedIndex - maxVisibleCommands + 1
  } else if (selectedIndex < scrollOffset.value) {
    scrollOffset.value = selectedIndex
  }

  // Ensure scroll offset doesn't go negative
  scrollOffset.value = Math.max(0, scrollOffset.value)

  // Ensure scroll offset doesn't exceed bounds
  const maxScroll = Math.max(0, filtered.length - maxVisibleCommands)
  scrollOffset.value = Math.min(scrollOffset.value, maxScroll)
}

// Handle backspace - delete empty blocks (except first one)
const handleBackspace = (blockId, event) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block || block.content !== '') return

  const blockIndex = blocks.value.findIndex(b => b.id === blockId)

  // Don't delete the first block (index 0) - just clear it and convert to paragraph
  if (blockIndex === 0) {
    block.type = 'paragraph'
    block.content = ''
    emit('update:modelValue', blocks.value)
    return
  }

  // For all other blocks, delete them when empty
  event.preventDefault()

  const prevBlock = blocks.value[blockIndex - 1]
  blocks.value.splice(blockIndex, 1)

  // Update positions
  blocks.value.forEach((block, index) => {
    block.position = index
  })

  emit('update:modelValue', blocks.value)
  focusBlock(prevBlock.id)
}

// Get block component/styling based on type
const getBlockClass = (type) => {
  const baseClass = 'w-full border-none outline-none bg-transparent resize-none text-black'

  switch (type) {
    case 'heading1': return `${baseClass} text-3xl font-bold leading-tight`
    case 'heading2': return `${baseClass} text-2xl font-semibold leading-snug`
    case 'heading3': return `${baseClass} text-xl font-medium leading-snug`
    case 'quote': return `${baseClass} text-lg italic border-l-4 border-gray-300 pl-4 leading-relaxed`
    default: return `${baseClass} text-base leading-normal`
  }
}

// Get container height for each block type - no spacing, just proper container sizing
const _getBlockContainerHeight = (blockType) => {
  switch (blockType) {
    case 'heading1': return '3rem' // H1 container height
    case 'heading2': return '2.5rem' // H2 container height
    case 'heading3': return '2rem' // H3 container height
    case 'quote': return '1.75rem' // Quote container height
    case 'codeBlock': return 'auto' // Code blocks can be multi-line
    case 'table': return 'auto' // Tables can be multi-row
    case 'divider': return '1rem' // Divider container
    case 'bulletList':
    case 'numberedList': return '1.5rem' // List item container
    default: return '1.5rem' // Regular text container height
  }
}

// Get page width styling
const getPageWidthClass = computed(() => {
  switch (pageWidth.value) {
    case 'full': return 'max-w-none px-4' // Full width with minimal padding
    case 'landscape': return 'max-w-6xl px-8' // Landscape width (1152px)
    case 'normal':
    default: return 'max-w-4xl px-8' // Normal width (896px) - default
  }
})

// Update block content safely
const updateBlockContent = (block, property, value) => {
  if (!block.content) {
    block.content = {}
  }
  block.content[property] = value
  emit('update:modelValue', blocks.value)
}

// Advanced block handlers
const handleFileUpload = async (file, blockId) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (!block) return

  isUploading.value = true
  uploadProgress.value = 0

  try {
    // Simulate file upload with progress
    const formData = new FormData()
    formData.append('file', file)

    // Mock upload progress
    const uploadInterval = setInterval(() => {
      uploadProgress.value += Math.random() * 20
      if (uploadProgress.value >= 90) {
        clearInterval(uploadInterval)
      }
    }, 200)

    // TODO: Replace with actual upload API
    await new Promise(resolve => setTimeout(resolve, 2000))
    clearInterval(uploadInterval)
    uploadProgress.value = 100

    // Update block with file data
    const fileUrl = URL.createObjectURL(file)
    block.content = {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      url: fileUrl,
      alt: '',
      caption: ''
    }

    emit('update:modelValue', blocks.value)
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

const getBlockPlaceholder = (type) => {
  switch (type) {
    case 'heading1': return 'Heading 1'
    case 'heading2': return 'Heading 2'
    case 'heading3': return 'Heading 3'
    case 'quote': return 'Quote'
    case 'bulletList': return 'List item'
    case 'numberedList': return 'List item'
    default: return 'Start writing...'
  }
}

// Create a new page node on the canvas
const createPageNode = (title = 'New Page') => {
  const newNode = {
    id: `page-${Date.now()}`,
    title,
    x: Math.random() * 800 + 100, // Random position
    y: Math.random() * 600 + 100,
    width: 300,
    height: 200,
    blocks: [{ id: 'initial', type: 'paragraph', content: '', position: 0 }],
    links: new Set(), // Pages this node links to
    backlinks: new Set() // Pages that link to this node
  }
  pageNodes.value.push(newNode)
  emit('update:modelValue', blocks.value)
  return newNode
}

// Create a linked page node from [[]] syntax
const createLinkedPageNode = (pageName, sourceBlockId) => {
  // Check if page already exists
  let existingPage = pageNodes.value.find(node => node.title.toLowerCase() === pageName.toLowerCase())

  if (!existingPage) {
    // Create new page node
    const sourceNode = findNodeContainingBlock(sourceBlockId)
    const baseX = sourceNode ? sourceNode.x : 400
    const baseY = sourceNode ? sourceNode.y : 300

    existingPage = {
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: pageName,
      x: baseX + (Math.random() - 0.5) * 300, // Position near source
      y: baseY + (Math.random() - 0.5) * 200,
      width: 300,
      height: 200,
      blocks: [{
        id: 'initial',
        type: 'paragraph',
        content: `# ${pageName}\n\nThis page was created from a [[${pageName}]] link.`,
        position: 0
      }],
      links: new Set(),
      backlinks: new Set()
    }

    pageNodes.value.push(existingPage)
  }

  // Create bidirectional link
  const sourceNode = findNodeContainingBlock(sourceBlockId)
  if (sourceNode) {
    sourceNode.links.add(existingPage.id)
    existingPage.backlinks.add(sourceNode.id)

    // Update pageLinks map for connection rendering
    if (!pageLinks.value.has(sourceNode.id)) {
      pageLinks.value.set(sourceNode.id, new Set())
    }
    pageLinks.value.get(sourceNode.id).add(existingPage.id)
  }

  return existingPage
}

// Find which page node contains a specific block
const findNodeContainingBlock = (blockId) => {
  if (currentPageId.value) {
    return pageNodes.value.find(node => node.id === currentPageId.value)
  }

  // If not in a specific page, check if we're editing a page directly
  for (const node of pageNodes.value) {
    if (node.blocks && node.blocks.some(block => block.id === blockId)) {
      return node
    }
  }

  return null
}

// Render text content with clickable [[]] links
const _renderWithLinks = (content) => {
  if (!content) return ''

  return content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    const existingPage = pageNodes.value.find(node => node.title.toLowerCase() === pageName.toLowerCase())
    const pageExists = !!existingPage
    const linkClass = pageExists ? 'text-blue-600 hover:text-blue-800 underline cursor-pointer' : 'text-purple-600 hover:text-purple-800 underline cursor-pointer'

    return `<span class="${linkClass}" data-page-link="${pageName}" onclick="handlePageLinkClick('${pageName}')">${pageName}</span>`
  })
}

// Handle clicking on [[]] links
const handlePageLinkClick = (pageName) => {
  if (infiniteCanvas.value) {
    // In canvas mode, focus on the linked node
    const existingPage = pageNodes.value.find(node => node.title.toLowerCase() === pageName.toLowerCase())
    if (existingPage) {
      // Pan to the linked node
      canvasOffset.value.x = -existingPage.x + window.innerWidth / 2
      canvasOffset.value.y = -existingPage.y + window.innerHeight / 2
    }
  } else {
    // In document mode, enter the linked page
    const existingPage = pageNodes.value.find(node => node.title.toLowerCase() === pageName.toLowerCase())
    if (existingPage) {
      enterPageNode(existingPage.id)
    } else {
      // Create new page if it doesn't exist
      const newPage = createPageNode(pageName)
      enterPageNode(newPage.id)
    }
  }
}

// Make link click handler globally available
if (typeof window !== 'undefined') {
  window.handlePageLinkClick = handlePageLinkClick
}

// Get all connections for rendering lines
const getConnections = () => {
  const connections = []

  pageLinks.value.forEach((linkedPages, sourceId) => {
    const sourceNode = pageNodes.value.find(n => n.id === sourceId)

    linkedPages.forEach((targetId) => {
      const targetNode = pageNodes.value.find(n => n.id === targetId)

      if (sourceNode && targetNode) {
        connections.push({
          from: {
            x: sourceNode.x + sourceNode.width / 2,
            y: sourceNode.y + sourceNode.height / 2
          },
          to: {
            x: targetNode.x + targetNode.width / 2,
            y: targetNode.y + targetNode.height / 2
          },
          sourceId,
          targetId
        })
      }
    })
  })

  return connections
}

// Handle canvas mouse events for dragging/panning
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragNode = ref(null)

const handleMouseDown = (event, node = null) => {
  if (!infiniteCanvas.value) return

  isDragging.value = true
  dragStart.value = { x: event.clientX, y: event.clientY }
  dragNode.value = node
  event.preventDefault()
}

const handleMouseMove = (event) => {
  if (!isDragging.value || !infiniteCanvas.value) return

  const deltaX = event.clientX - dragStart.value.x
  const deltaY = event.clientY - dragStart.value.y

  if (dragNode.value) {
    // Dragging a specific node
    dragNode.value.x += deltaX
    dragNode.value.y += deltaY
  } else {
    // Panning the canvas
    canvasOffset.value.x += deltaX
    canvasOffset.value.y += deltaY
  }

  dragStart.value = { x: event.clientX, y: event.clientY }
}

const handleMouseUp = () => {
  isDragging.value = false
  dragNode.value = null
}

// Select a page node in canvas (single click)
const selectPageNode = (nodeId, event) => {
  selectedPageId.value = nodeId
  // Prevent drag if just selecting
  event.stopPropagation()
}

// Enter a page node to edit its content (double click)
const enterPageNode = (nodeId) => {
  const node = pageNodes.value.find(p => p.id === nodeId)
  if (!node) return

  // Track current page for linking context
  currentPageId.value = nodeId
  selectedPageId.value = null // Clear selection when entering

  // Switch to normal mode and load the node's blocks
  infiniteCanvas.value = false
  blocks.value = node.blocks || [{ id: 'initial', type: 'paragraph', content: '', position: 0 }]
  emit('update:modelValue', blocks.value)
}

// Reset canvas view to center
const resetCanvasView = () => {
  canvasOffset.value = { x: 0, y: 0 }
  canvasZoom.value = 1
}

// Handle canvas wheel events for zooming
const handleCanvasWheel = (event) => {
  if (!infiniteCanvas.value) return

  event.preventDefault()
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.1, Math.min(3, canvasZoom.value * zoomFactor))
  canvasZoom.value = newZoom
}

// Zoom in/out functions
const zoomIn = () => {
  canvasZoom.value = Math.min(3, canvasZoom.value * 1.2)
}

const zoomOut = () => {
  canvasZoom.value = Math.max(0.1, canvasZoom.value * 0.8)
}

// Start dragging a page node
const startDraggingNode = (nodeId, event) => {
  event.preventDefault()
  dragNode.value = { id: nodeId, startX: event.clientX, startY: event.clientY }
  document.addEventListener('mousemove', handleNodeDrag)
  document.addEventListener('mouseup', stopDraggingNode)
}

// Handle dragging a page node
const handleNodeDrag = (event) => {
  if (!dragNode.value) return

  const deltaX = event.clientX - dragNode.value.startX
  const deltaY = event.clientY - dragNode.value.startY

  const node = pageNodes.value.find(p => p.id === dragNode.value.id)
  if (node) {
    node.x += deltaX
    node.y += deltaY
  }

  dragNode.value.startX = event.clientX
  dragNode.value.startY = event.clientY
}

// Stop dragging a page node
const stopDraggingNode = () => {
  document.removeEventListener('mousemove', handleNodeDrag)
  document.removeEventListener('mouseup', stopDraggingNode)
  dragNode.value = null
}

// Sync scroll position between line numbers and content
const syncScrollPosition = () => {
  if (lineNumbersContainer.value && contentContainer.value) {
    const scrollTop = contentContainer.value.scrollTop

    // Update the transform of the line numbers content instead of scrolling
    const lineNumbersContent = lineNumbersContainer.value.querySelector('.line-numbers-content')
    if (lineNumbersContent) {
      lineNumbersContent.style.transform = `translateY(-${scrollTop}px)`
    }

    // Update the background position of the lines to move with the content
    contentContainer.value.style.backgroundPosition = `0 ${-scrollTop}px`
  }
}

// Handle Tab key for indentation instead of focus change
const handleTabKey = (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const target = event.target
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value

    if (event.shiftKey) {
      // Shift+Tab: Remove indentation
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineBeforeTab = value.substring(lineStart, start)
      if (lineBeforeTab.startsWith('  ')) {
        const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2)
        target.value = newValue
        target.setSelectionRange(start - 2, end - 2)
        // Trigger input event to update the model
        target.dispatchEvent(new Event('input', { bubbles: true }))
      }
    } else {
      // Tab: Add indentation (2 spaces)
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      target.value = newValue
      target.setSelectionRange(start + 2, start + 2)
      // Trigger input event to update the model
      target.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}

// Close slash command menu when clicking outside
onMounted(() => {
  const handleClickOutside = () => {
    showSlashCommand.value = false
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<template>
  <!-- 3D Graph View Mode -->
  <GraphView3D
    v-if="show3DGraph"
    :pages="props.allPages.length > 0 ? props.allPages : pageNodes"
    :blocks="blocks"
    @exit-graph="show3DGraph = false; infiniteCanvas = false; emit('update:showCanvas', false)"
    @select-page="handlePageLinkClick"
  />

  <!-- Infinite Canvas Mode -->
  <div
    v-else-if="infiniteCanvas"
    class="infinite-canvas"
    :style="{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#fafafa',
      cursor: isDragging ? 'grabbing' : 'grab',
      transform: `scale(${canvasZoom})`
    }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @wheel="handleCanvasWheel"
    @click="selectedPageId = null"
  >
    <!-- Canvas Grid -->
    <div
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        transform: `translate(${canvasOffset.x % 20}px, ${canvasOffset.y % 20}px)`,
        opacity: 0.4
      }"
    />

    <!-- Connection Lines -->
    <svg
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }"
    >
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
            fill="#6b7280"
          />
        </marker>
      </defs>

      <line
        v-for="connection in getConnections()"
        :key="`${connection.sourceId}-${connection.targetId}`"
        :x1="connection.from.x + canvasOffset.x"
        :y1="connection.from.y + canvasOffset.y"
        :x2="connection.to.x + canvasOffset.x"
        :y2="connection.to.y + canvasOffset.y"
        stroke="#6b7280"
        stroke-width="2"
        stroke-dasharray="5,5"
        marker-end="url(#arrowhead)"
        opacity="0.7"
      />
    </svg>

    <!-- Page Nodes -->
    <div
      v-for="pageNode in pageNodes"
      :key="pageNode.id"
      :style="{
        position: 'absolute',
        left: pageNode.x + canvasOffset.x + 'px',
        top: pageNode.y + canvasOffset.y + 'px',
        width: '300px',
        minHeight: '200px',
        backgroundColor: 'white',
        border: pageNode.id === selectedPageId ? '2px solid #3b82f6' : '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: pageNode.id === selectedPageId ? '0 8px 25px -5px rgba(59, 130, 246, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }"
      class="page-node"
      @click.stop="selectPageNode(pageNode.id, $event)"
      @dblclick.stop="enterPageNode(pageNode.id)"
      @mousedown.stop="startDraggingNode(pageNode.id, $event)"
    >
      <div class="text-lg font-semibold mb-2 text-gray-900">
        {{ pageNode.title }}
      </div>
      <div class="text-sm text-gray-600">
        {{ pageNode.blocks?.length || 0 }} blocks
      </div>
      <div class="text-xs text-gray-400 mt-2">
        Click to select • Double-click to edit
      </div>
    </div>

    <!-- Canvas Controls -->
    <div
      class="fixed top-4 left-4 z-50 bg-white border border-gray-300 rounded-lg p-2 shadow-lg"
    >
      <div class="flex space-x-2">
        <button
          class="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="Zoom Out"
          @click="zoomOut"
        >
          −
        </button>
        <span class="px-2 py-1 text-xs text-gray-600 min-w-12 text-center">
          {{ Math.round(canvasZoom * 100) }}%
        </span>
        <button
          class="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="Zoom In"
          @click="zoomIn"
        >
          +
        </button>
        <button
          class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          @click="resetCanvasView"
        >
          Reset View
        </button>
        <button
          class="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
          @click="infiniteCanvas = false; emit('update:showCanvas', false)"
        >
          Exit Canvas
        </button>
      </div>
    </div>

    <!-- Canvas Instructions -->
    <div
      v-if="pageNodes.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="text-center text-gray-500">
        <h2 class="text-2xl font-semibold mb-4">
          Infinite Canvas
        </h2>
        <p class="text-lg mb-2">
          Type <span class="bg-gray-200 px-2 py-1 rounded font-mono">/page</span> to create a new page node
        </p>
        <p>Drag to pan around • Click nodes to select • Double-click to edit</p>
      </div>
    </div>
  </div>

  <!-- Normal Document Mode -->
  <div
    v-else
    class="relative h-full w-full bg-white overflow-hidden"
  >
    <!-- Scrollable Container -->
    <div class="flex h-full">
      <!-- Line Numbers (scrollable) -->
      <div
        ref="lineNumbersContainer"
        class="w-12 bg-gray-50 border-r border-gray-200 z-10 overflow-y-hidden flex-shrink-0"
        :style="{ height: '100%', overflowY: 'hidden' }"
      >
        <div
          class="line-numbers-content"
          :style="{
            minHeight: containerMinHeight
          }"
        >
          <div
            v-for="n in Math.max(100, Math.ceil((blocks.length * 24 + 200) / 24))"
            :key="n"
            class="h-6 flex items-center justify-end pr-2 text-xs text-gray-400 font-mono"
            :style="{ lineHeight: '24px' }"
          >
            {{ n }}
          </div>
        </div>
      </div>

      <!-- Lined Page Background (scrollable) -->
      <div
        ref="contentContainer"
        class="flex-1 h-full overflow-y-auto lined-content"
        :style="{
          backgroundImage: `repeating-linear-gradient(
            transparent,
            transparent 23px,
            #f0f0f0 23px,
            #f0f0f0 24px
          )`,
          backgroundSize: '100% 24px'
        }"
        @scroll="syncScrollPosition"
      >
        <!-- Content Container with proper line alignment -->
        <div
          :class="['mx-auto', getPageWidthClass]"
          :style="{
            paddingLeft: '1rem',
            paddingRight: '3rem',
            paddingTop: '0px',
            paddingBottom: '200px',
            lineHeight: '24px',
            minHeight: containerMinHeight
          }"
        >
          <!-- Render blocks -->
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            :data-block-id="block.id"
            :style="{
              position: 'relative',
              marginBottom: '0px',
              zIndex: blocks.length - index,
              minHeight: '24px',
              lineHeight: '24px'
            }"
            class="block-container"
          >
            <!-- Block content -->
            <div style="width: 100%; min-width: 0;">
              <!-- Divider block -->
              <div
                v-if="block.type === 'divider'"
                style="padding: 16px 0; position: relative;"
              >
                <hr style="border-color: #e5e7eb;">
                <!-- Hidden textarea for navigation -->
                <textarea
                  :value="''"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; resize: none; border: none; outline: none;"
                  readonly
                  @focus="activeBlockId = block.id"
                  @keydown="(e) => {
                    // Handle navigation for divider
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      navigateToBlock(block.id, 'up');
                    }
                    else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      navigateToBlock(block.id, 'down');
                    }
                    else if (e.key === 'Enter' && !e.shiftKey) {
                      handleEnter(block.id, e);
                    }
                    else if (e.key === 'Backspace') {
                      handleBackspace(block.id, e);
                    }
                  }"
                />
              </div>

              <!-- Media blocks (image, video, audio, file) -->
              <MediaBlock
                v-else-if="['image', 'video', 'audio', 'file'].includes(block.type)"
                :type="block.type"
                :content="block.content || {}"
                @update="(newContent) => { block.content = newContent; emit('update:modelValue', blocks) }"
                @upload="(file) => handleFileUpload(file, block.id)"
              />

              <!-- Code block -->
              <CodeBlock
                v-else-if="block.type === 'codeBlock'"
                :content="block.content || {}"
                @update="(newContent) => { block.content = newContent; emit('update:modelValue', blocks) }"
              />

              <!-- Table block -->
              <TableBlock
                v-else-if="block.type === 'table'"
                :content="block.content || {}"
                @update="(newContent) => { block.content = newContent; emit('update:modelValue', blocks) }"
              />

              <!-- Embed block -->
              <EmbedBlock
                v-else-if="block.type === 'embed'"
                :content="block.content || {}"
                @update="(newContent) => { block.content = newContent; emit('update:modelValue', blocks) }"
              />

              <!-- Callout block -->
              <div
                v-else-if="block.type === 'callout'"
                class="callout-block"
              >
                <div
                  :class="[
                    'p-4 rounded-lg border-l-4',
                    block.content?.type === 'info' ? 'bg-blue-50 border-blue-400' : '',
                    block.content?.type === 'warning' ? 'bg-yellow-50 border-yellow-400' : '',
                    block.content?.type === 'error' ? 'bg-red-50 border-red-400' : '',
                    block.content?.type === 'success' ? 'bg-green-50 border-green-400' : ''
                  ]"
                >
                  <div class="flex items-center mb-2">
                    <span class="mr-2">
                      {{ block.content?.type === 'info' ? '💡'
                        : block.content?.type === 'warning' ? '⚠️'
                          : block.content?.type === 'error' ? '❌' : '✅' }}
                    </span>
                    <input
                      :value="block.content?.title || ''"
                      placeholder="Callout title..."
                      class="flex-1 bg-transparent border-none outline-none font-semibold"
                      @input="updateBlockContent(block, 'title', $event.target.value)"
                    >
                  </div>
                  <textarea
                    :value="block.content?.content || ''"
                    placeholder="Add your message..."
                    class="w-full bg-transparent border-none outline-none resize-none"
                    @input="updateBlockContent(block, 'content', $event.target.value)"
                  />
                </div>
              </div>

              <!-- Text-based blocks (fallback) -->
              <textarea
                v-else-if="['paragraph', 'heading1', 'heading2', 'heading3', 'bulletList', 'numberedList', 'quote'].includes(block.type)"
                :value="block.content"
                :placeholder="getBlockPlaceholder(block.type)"
                :class="getBlockClass(block.type)"
                style="resize: none; overflow: hidden;"
                rows="1"
                @input="(e) => {
                  handleContentChange(block.id, e.target.value, e);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }"
                @keydown="(e) => {
                  // Handle Tab key for indentation
                  if (e.key === 'Tab') {
                    handleTabKey(e);
                    return;
                  }

                  // Handle slash command navigation first
                  if (handleKeyNavigation(block.id, e)) {
                    return; // Navigation handled, stop here
                  }

                  // Handle block navigation with arrow keys
                  if (e.key === 'ArrowUp' && e.target.selectionStart === 0) {
                    e.preventDefault();
                    navigateToBlock(block.id, 'up');
                  }
                  else if (e.key === 'ArrowDown' && e.target.selectionEnd === e.target.value.length) {
                    e.preventDefault();
                    navigateToBlock(block.id, 'down');
                  }
                  // Handle regular keys
                  else if (e.key === 'Enter' && !e.shiftKey) {
                    handleEnter(block.id, e);
                  }
                  else if (e.key === 'Backspace' && block.content === '') {
                    handleBackspace(block.id, e);
                  }
                }"
                @focus="activeBlockId = block.id"
              />

              <!-- Unknown block type fallback -->
              <div
                v-else
                class="unknown-block p-4 bg-gray-100 rounded"
              >
                <p class="text-gray-500">
                  Unknown block type: {{ block.type }}
                </p>
              </div>
            </div>
          </div>
        </div> <!-- Close content container -->
      </div> <!-- Close lined page background -->
    </div> <!-- Close flex container -->

    <!-- Slash command menu -->
    <Teleport to="body">
      <div
        v-if="showSlashCommand"
        :style="{
          position: 'fixed',
          zIndex: 50,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '8px',
          width: '320px',
          left: slashCommandPosition.x + 'px',
          top: slashCommandPosition.y + 'px'
        }"
        @click.stop
        @wheel="handleSlashMenuWheel"
      >
        <div
          style="
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 240px;
            overflow: hidden;
          "
        >
          <div
            v-for="(blockType, index) in visibleBlockTypes"
            :key="blockType.type"
            :class="[
              'canvas-hover-bg',
              index + scrollOffset === selectedCommandIndex ? 'bg-blue-100' : ''
            ]"
            style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; cursor: pointer; min-height: 48px;"
            @click="applyBlockType(activeBlockId, blockType.type)"
          >
            <span class="canvas-text-muted">{{ blockType.icon }}</span>
            <div style="flex: 1;">
              <div style="font-weight: 500; font-size: 14px;">
                {{ blockType.label }}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                {{ blockType.description }}
              </div>
            </div>
          </div>

          <div
            v-if="filteredBlockTypes.length === 0"
            style="padding: 8px; font-size: 14px; color: #6b7280;"
          >
            No matching blocks
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Upload Progress -->
    <Teleport to="body">
      <div
        v-if="isUploading"
        class="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg p-4 shadow-lg"
      >
        <div class="flex items-center space-x-3">
          <div class="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <div>
            <p class="text-sm font-medium">
              Uploading...
            </p>
            <div class="w-40 bg-gray-200 rounded-full h-2 mt-1">
              <div
                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${uploadProgress}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div> <!-- Close normal document mode -->
</template>

<style scoped>
/* Hide scrollbars on line numbers container */
.w-12::-webkit-scrollbar {
  display: none;
}

.w-12 {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* Hide scrollbars on content container but keep scroll functionality */
.lined-content::-webkit-scrollbar {
  display: none;
}

.lined-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

textarea {
  resize: none;
  overflow: hidden;
  min-height: 1.5em;
  line-height: 1.5;
  margin: 0;
  padding: 4px 0;
  height: auto;
  display: block;
  width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap;
}

textarea::placeholder {
  color: #6b7280;
}

textarea:focus::placeholder {
  color: #9ca3af;
}

/* Advanced block styles - no margins for seamless blocks */
.image-block, .video-block, .embed-block {
  margin: 0;
}

.code-block {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.table-block {
  margin: 0;
}

.table-block input:focus {
  background-color: #f9fafb;
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.callout-block {
  margin: 0;
}

.upload-placeholder {
  transition: all 0.2s ease;
}

.upload-placeholder:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.image-content img, .video-content video {
  transition: all 0.2s ease;
}

.image-content img:hover, .video-content video:hover {
  transform: scale(1.02);
}

.embed-content iframe {
  border-radius: 0.5rem;
}

/* Block spacing is now handled dynamically via inline styles */

/* Ensure blocks align to the 24px grid lines */
.block-container {
  line-height: 24px;
  min-height: 24px;
  display: flex;
  align-items: flex-start;
}

.block-container textarea {
  line-height: 24px;
  font-size: 14px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  width: 100%;
  min-height: 24px;
  height: auto;
}

/* Align text blocks to grid */
.block-container p,
.block-container div {
  line-height: 24px;
  margin: 0;
  padding: 0;
}

/* Ensure textarea sits exactly on the line */
.block-container textarea:focus {
  background: rgba(59, 130, 246, 0.05);
  outline: none;
}
</style>
