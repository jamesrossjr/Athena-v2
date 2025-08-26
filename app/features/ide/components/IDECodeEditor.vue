<template>
  <div class="ide-code-editor h-full flex flex-col bg-white">
    <!-- Hidden Editor Header - Only show filename subtly -->
    <div class="hidden px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center space-x-2">
        <div class="flex items-center space-x-1">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              hasUnsavedChanges ? 'bg-orange-400' : 'bg-gray-500'
            ]"
          />
          <span class="text-sm font-medium text-gray-300">{{ filename || 'Untitled' }}</span>
          <span
            v-if="language"
            class="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded"
          >{{ language }}</span>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Language Selector -->
        <select
          v-model="currentLanguage"
          class="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
          @change="updateLanguage"
        >
          <option value="javascript">
            JavaScript
          </option>
          <option value="typescript">
            TypeScript
          </option>
          <option value="html">
            HTML
          </option>
          <option value="css">
            CSS
          </option>
          <option value="scss">
            SCSS
          </option>
          <option value="vue">
            Vue
          </option>
          <option value="react">
            React
          </option>
          <option value="python">
            Python
          </option>
          <option value="java">
            Java
          </option>
          <option value="json">
            JSON
          </option>
          <option value="markdown">
            Markdown
          </option>
          <option value="text">
            Plain Text
          </option>
        </select>

        <!-- Debugger Controls -->
        <div class="flex items-center space-x-1 border-l border-gray-600 pl-2 ml-2">
          <button
            v-if="!debugState.isDebugging"
            class="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded hover:bg-gray-700"
            title="Start Debugging (F5)"
            @click="startDebugging"
          >
            ▶ Debug
          </button>
          <button
            v-if="debugState.isDebugging"
            class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-gray-700"
            title="Stop Debugging (Shift+F5)"
            @click="stopDebugging"
          >
            ⏹ Stop
          </button>

          <!-- Debug Step Controls (shown during debugging) -->
          <template v-if="debugState.isDebugging">
            <button
              class="text-blue-400 hover:text-blue-300 text-xs px-1 py-1 rounded hover:bg-gray-700"
              title="Step Over (F10)"
              @click="stepOver"
            >
              ⏭
            </button>
            <button
              class="text-blue-400 hover:text-blue-300 text-xs px-1 py-1 rounded hover:bg-gray-700"
              title="Step Into (F11)"
              @click="stepInto"
            >
              ⤵
            </button>
            <button
              class="text-blue-400 hover:text-blue-300 text-xs px-1 py-1 rounded hover:bg-gray-700"
              title="Step Out (Shift+F11)"
              @click="stepOut"
            >
              ⤴
            </button>
            <button
              class="text-yellow-400 hover:text-yellow-300 text-xs px-1 py-1 rounded hover:bg-gray-700"
              title="Continue (F5)"
              @click="continueExecution"
            >
              ▶
            </button>
          </template>
        </div>

        <!-- Actions -->
        <button
          class="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
          title="Format code (Ctrl+Shift+F)"
          @click="formatCode"
        >
          Format
        </button>
        <button
          class="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700"
          title="Run code (Ctrl+F5)"
          @click="runCode"
        >
          ▶ Run
        </button>
      </div>
    </div>

    <!-- Editor Content - Clean Page Style -->
    <div
      class="flex-1 relative bg-white"
      :style="{
        backgroundImage: `repeating-linear-gradient(
        transparent,
        transparent 23px,
        #f8f9fa 23px,
        #f8f9fa 24px
      )`
      }"
    >
      <!-- Clean Document Editor -->
      <textarea
        ref="codeEditor"
        v-model="content"
        class="w-full h-full bg-transparent text-gray-900 resize-none outline-none border-none font-mono text-xs"
        :style="{
          paddingLeft: '1rem',
          paddingRight: '3rem',
          paddingTop: '0.25rem',
          paddingBottom: '2rem',
          lineHeight: '24px',
          fontSize: '12px'
        }"
        spellcheck="false"
        autocomplete="off"
        wrap="off"
        @input="handleInput"
        @keydown="handleKeydown"
        @scroll="handleScroll"
        @click="updateCursorPosition"
        @keyup="updateCursorPosition"
      />

      <!-- Autocomplete Dropdown -->
      <div
        v-if="showAutocomplete && autocompleteItems.length > 0"
        class="absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-20 max-h-48 overflow-y-auto"
        :style="autocompletePosition"
      >
        <div
          v-for="(item, index) in autocompleteItems"
          :key="index"
          :class="[
            'px-3 py-2 text-sm cursor-pointer flex items-center justify-between font-mono',
            index === selectedAutocompleteIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          ]"
          @click="applyAutocompletion(item)"
        >
          <span>{{ item.text }}</span>
          <span class="text-xs opacity-70">{{ item.type }}</span>
        </div>
      </div>

      <!-- IntelliSense Completion Dropdown -->
      <div
        v-if="showCompletions && completionSuggestions.length > 0"
        class="absolute bg-gray-800 border border-gray-600 rounded shadow-lg z-30 max-h-64 overflow-y-auto"
        :style="{ top: completionPosition.y + 'px', left: completionPosition.x + 'px', minWidth: '320px' }"
      >
        <div
          v-for="(suggestion, index) in completionSuggestions"
          :key="index"
          class="px-4 py-3 text-sm text-white hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
          :class="{ 'bg-blue-600': selectedCompletionIndex === index }"
          @click="insertCompletion(suggestion)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-4 h-4 flex items-center justify-center">
                <span
                  class="text-xs font-bold"
                  :class="{
                    'text-purple-400': suggestion.kind === 'keyword',
                    'text-blue-400': suggestion.kind === 'function',
                    'text-green-400': suggestion.kind === 'method',
                    'text-orange-400': suggestion.kind === 'object',
                    'text-yellow-400': suggestion.kind === 'variable'
                  }"
                >{{ getIconForKind(suggestion.kind) }}</span>
              </div>
              <div>
                <div class="font-medium">
                  {{ suggestion.label }}
                </div>
                <div
                  v-if="suggestion.detail"
                  class="text-gray-400 text-xs"
                >
                  {{ suggestion.detail }}
                </div>
              </div>
            </div>
            <span class="text-gray-500 text-xs uppercase">{{ suggestion.kind }}</span>
          </div>
        </div>
      </div>

      <!-- Breakpoint Indicators -->
      <div
        v-for="line in [...debugState.breakpoints]"
        :key="`breakpoint-${line}`"
        class="absolute left-2 w-4 h-4 bg-red-600 rounded-full cursor-pointer hover:bg-red-500 flex items-center justify-center"
        :style="{ top: (line - 1) * 24 + 16 + 'px' }"
        title="Click to remove breakpoint"
        @click="toggleBreakpoint(line)"
      >
        <span class="text-white text-xs font-bold">●</span>
      </div>

      <!-- Current Execution Line Indicator -->
      <div
        v-if="debugState.isDebugging && debugState.currentExecutionLine"
        class="absolute left-0 right-0 h-6 bg-yellow-200 opacity-30 pointer-events-none"
        :style="{ top: (debugState.currentExecutionLine - 1) * 24 + 12 + 'px' }"
      />

      <!-- Current Execution Line Arrow -->
      <div
        v-if="debugState.isDebugging && debugState.currentExecutionLine"
        class="absolute left-8 w-0 h-0 pointer-events-none"
        :style="{
          top: (debugState.currentExecutionLine - 1) * 24 + 16 + 'px',
          borderLeft: '6px solid #facc15',
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent'
        }"
        title="Current execution line"
      />

      <!-- Line Number Gutter (for breakpoint clicking) -->
      <div
        v-for="n in totalLines"
        :key="`line-gutter-${n}`"
        class="absolute left-0 w-8 h-6 cursor-pointer hover:bg-gray-100"
        :style="{ top: (n - 1) * 24 + 12 + 'px' }"
        :title="`Click to ${debugState.breakpoints.has(n) ? 'remove' : 'add'} breakpoint on line ${n}`"
        @click="toggleBreakpoint(n)"
      />

      <!-- Error/Warning Indicators -->
      <div
        v-for="error in errors"
        :key="`error-${error.line}`"
        class="absolute left-0 w-2 h-6 bg-red-500 opacity-75"
        :style="{ top: (error.line - 1) * 24 + 12 + 'px' }"
        :title="error.message"
      />
    </div>

    <!-- Status Bar Hidden - using global status bar instead -->
    <div class="hidden px-4 py-1 bg-white border-t border-gray-200 text-xs text-gray-600">
      <div>
        <span>Ln {{ currentLine }}, Col {{ currentColumn }}</span>
        <span v-if="selectedText">{{ selectedText.length }} selected</span>
        <span>{{ currentLanguage }}</span>
      </div>
      <div>
        <span>{{ content.length }} chars</span>
        <span>{{ totalLines }} lines</span>
        <span
          v-if="hasUnsavedChanges"
          class="text-orange-600 font-medium"
        >● Unsaved</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  filename: {
    type: String,
    default: ''
  },
  initialContent: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  }
})

const emit = defineEmits(['update-content', 'run-code', 'save-file'])

// Editor state
const codeEditor = ref(null)
const content = ref(props.initialContent || '')
const currentLanguage = ref(props.language || 'javascript')
const hasUnsavedChanges = ref(false)
const showLineNumbers = ref(true)

// Cursor position
const currentLine = ref(1)
const currentColumn = ref(1)
const selectedText = ref('')

// IntelliSense and Language Server state
const completionSuggestions = ref([])
const showCompletions = ref(false)
const completionPosition = ref({ x: 0, y: 0 })
const selectedCompletionIndex = ref(0)
const diagnostics = ref([]) // Error/warning markers
const _hoverInfo = ref(null)
const _signatureHelp = ref(null)

// Debugger state
const debugState = ref({
  isDebugging: false,
  breakpoints: new Set(),
  currentExecutionLine: null,
  callStack: [],
  variables: {},
  watchExpressions: []
})

// Language Server Integration
const _languageServers = ref({
  javascript: { active: true, port: 3001 },
  typescript: { active: true, port: 3002 },
  python: { active: false, port: 3003 },
  vue: { active: true, port: 3004 }
})

// Autocomplete
const showAutocomplete = ref(false)
const autocompleteItems = ref([])
const selectedAutocompleteIndex = ref(0)
const autocompletePosition = ref({ top: '0px', left: '0px' })

// Errors
const errors = ref([])

// Computed properties
const totalLines = computed(() => {
  return Math.max(1, content.value.split('\n').length)
})

const lineNumberWidth = computed(() => {
  return Math.max(40, totalLines.value.toString().length * 10 + 20)
})

// Watch for prop changes
watch(() => props.initialContent, (newContent) => {
  content.value = newContent || ''
  hasUnsavedChanges.value = false
})

watch(() => props.language, (newLanguage) => {
  currentLanguage.value = newLanguage
})

// Autocomplete suggestions by language
const getAutocompleteSuggestions = (language, word) => {
  const suggestions = {
    javascript: [
      { text: 'console.log()', type: 'method' },
      { text: 'function', type: 'keyword' },
      { text: 'const', type: 'keyword' },
      { text: 'let', type: 'keyword' },
      { text: 'var', type: 'keyword' },
      { text: 'if', type: 'keyword' },
      { text: 'else', type: 'keyword' },
      { text: 'for', type: 'keyword' },
      { text: 'while', type: 'keyword' },
      { text: 'return', type: 'keyword' },
      { text: 'async', type: 'keyword' },
      { text: 'await', type: 'keyword' },
      { text: 'try', type: 'keyword' },
      { text: 'catch', type: 'keyword' },
      { text: 'finally', type: 'keyword' },
      { text: 'import', type: 'keyword' },
      { text: 'export', type: 'keyword' },
      { text: 'class', type: 'keyword' },
      { text: 'extends', type: 'keyword' },
      { text: 'constructor', type: 'keyword' }
    ],
    html: [
      { text: '<div>', type: 'tag' },
      { text: '<span>', type: 'tag' },
      { text: '<p>', type: 'tag' },
      { text: '<h1>', type: 'tag' },
      { text: '<h2>', type: 'tag' },
      { text: '<a href="">', type: 'tag' },
      { text: '<img src="" alt="">', type: 'tag' },
      { text: '<button>', type: 'tag' },
      { text: '<input type="">', type: 'tag' },
      { text: '<form>', type: 'tag' }
    ],
    css: [
      { text: 'display:', type: 'property' },
      { text: 'position:', type: 'property' },
      { text: 'margin:', type: 'property' },
      { text: 'padding:', type: 'property' },
      { text: 'background:', type: 'property' },
      { text: 'color:', type: 'property' },
      { text: 'font-size:', type: 'property' },
      { text: 'width:', type: 'property' },
      { text: 'height:', type: 'property' },
      { text: 'border:', type: 'property' }
    ],
    python: [
      { text: 'def', type: 'keyword' },
      { text: 'class', type: 'keyword' },
      { text: 'if', type: 'keyword' },
      { text: 'elif', type: 'keyword' },
      { text: 'else', type: 'keyword' },
      { text: 'for', type: 'keyword' },
      { text: 'while', type: 'keyword' },
      { text: 'return', type: 'keyword' },
      { text: 'print()', type: 'function' },
      { text: 'len()', type: 'function' },
      { text: 'range()', type: 'function' },
      { text: 'import', type: 'keyword' },
      { text: 'from', type: 'keyword' }
    ]
  }

  const baseSuggestions = suggestions[language] || suggestions.javascript

  if (!word) return baseSuggestions.slice(0, 10)

  return baseSuggestions
    .filter(s => s.text.toLowerCase().includes(word.toLowerCase()))
    .slice(0, 10)
}

// IntelliSense Functions
const triggerCompletion = async (position) => {
  const currentWord = getCurrentWordAtPosition(position)
  const lineContent = getLineContent(position.line)

  try {
    // Mock language server request - in real implementation, this would call actual language server
    const suggestions = await getCompletionSuggestions(currentWord, lineContent, currentLanguage.value)

    if (suggestions.length > 0) {
      completionSuggestions.value = suggestions
      showCompletions.value = true
      selectedCompletionIndex.value = 0

      // Position completion popup
      const rect = codeEditor.value.getBoundingClientRect()
      completionPosition.value = {
        x: position.x - rect.left,
        y: position.y - rect.top + 20
      }
    }
  } catch (error) {
    console.error('Completion error:', error)
  }
}

const getCompletionSuggestions = async (word, line, language) => {
  // Mock IntelliSense - real implementation would use language servers
  const mockSuggestions = {
    javascript: [
      { label: 'console.log', kind: 'function', detail: 'Outputs a message to the console', insertText: 'console.log($1)' },
      { label: 'function', kind: 'keyword', detail: 'Function declaration', insertText: 'function $1() {\n\t$2\n}' },
      { label: 'const', kind: 'keyword', detail: 'Constant variable declaration', insertText: 'const $1 = $2' },
      { label: 'let', kind: 'keyword', detail: 'Variable declaration', insertText: 'let $1 = $2' },
      { label: 'if', kind: 'keyword', detail: 'If statement', insertText: 'if ($1) {\n\t$2\n}' },
      { label: 'for', kind: 'keyword', detail: 'For loop', insertText: 'for (let i = 0; i < $1; i++) {\n\t$2\n}' },
      { label: 'document', kind: 'object', detail: 'Document object', insertText: 'document' },
      { label: 'window', kind: 'object', detail: 'Window object', insertText: 'window' },
      { label: 'addEventListener', kind: 'method', detail: 'Add event listener', insertText: 'addEventListener($1, $2)' }
    ],
    typescript: [
      { label: 'interface', kind: 'keyword', detail: 'Interface declaration', insertText: 'interface $1 {\n\t$2\n}' },
      { label: 'type', kind: 'keyword', detail: 'Type alias', insertText: 'type $1 = $2' },
      { label: 'enum', kind: 'keyword', detail: 'Enum declaration', insertText: 'enum $1 {\n\t$2\n}' },
      { label: 'class', kind: 'keyword', detail: 'Class declaration', insertText: 'class $1 {\n\t$2\n}' }
    ],
    python: [
      { label: 'def', kind: 'keyword', detail: 'Function definition', insertText: 'def $1($2):\n\t$3' },
      { label: 'class', kind: 'keyword', detail: 'Class definition', insertText: 'class $1:\n\t$2' },
      { label: 'if', kind: 'keyword', detail: 'If statement', insertText: 'if $1:\n\t$2' },
      { label: 'for', kind: 'keyword', detail: 'For loop', insertText: 'for $1 in $2:\n\t$3' },
      { label: 'print', kind: 'function', detail: 'Print function', insertText: 'print($1)' }
    ]
  }

  const baseSuggestions = mockSuggestions[language] || []
  return baseSuggestions.filter(item =>
    item.label.toLowerCase().includes(word.toLowerCase())
  )
}

const getCurrentWordAtPosition = (position) => {
  // Mock implementation - get current word at cursor
  const lines = content.value.split('\n')
  const line = lines[position.line - 1] || ''
  const beforeCursor = line.substring(0, position.column)
  const match = beforeCursor.match(/\w+$/)
  return match ? match[0] : ''
}

const getLineContent = (lineNumber) => {
  const lines = content.value.split('\n')
  return lines[lineNumber - 1] || ''
}

const getCursorPosition = () => {
  // Mock cursor position - real implementation would get actual cursor position
  return { line: currentLine.value, column: currentColumn.value, x: 100, y: 100 }
}

// Diagnostic Functions (Error/Warning detection)
const runDiagnostics = async () => {
  // Mock diagnostics - real implementation would use language server
  const mockErrors = []

  if (currentLanguage.value === 'javascript') {
    // Simple syntax checking
    const lines = content.value.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('console.log') && !line.includes('(') && !line.includes(')')) {
        mockErrors.push({
          line: index + 1,
          column: line.indexOf('console.log'),
          message: 'Missing parentheses in console.log',
          severity: 'error'
        })
      }
      if (line.includes('function') && !line.includes('{')) {
        mockErrors.push({
          line: index + 1,
          column: line.indexOf('function'),
          message: 'Function declaration missing opening brace',
          severity: 'error'
        })
      }
    })
  }

  diagnostics.value = mockErrors
}

// Event handlers
const handleInput = (_event) => {
  hasUnsavedChanges.value = true
  emit('update-content', content.value)

  // Trigger IntelliSense on certain characters
  const lastChar = content.value.slice(-1)
  if (['.', '(', ' '].includes(lastChar)) {
    const position = getCursorPosition()
    triggerCompletion(position)
  }

  // Run diagnostics after typing
  runDiagnostics()

  // Trigger autocomplete
  updateAutocomplete()

  // Simple syntax checking (placeholder)
  checkSyntax()
}

const handleKeydown = (event) => {
  if (showAutocomplete.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedAutocompleteIndex.value = Math.min(
        selectedAutocompleteIndex.value + 1,
        autocompleteItems.value.length - 1
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedAutocompleteIndex.value = Math.max(selectedAutocompleteIndex.value - 1, 0)
    } else if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault()
      if (autocompleteItems.value[selectedAutocompleteIndex.value]) {
        applyAutocompletion(autocompleteItems.value[selectedAutocompleteIndex.value])
      }
    } else if (event.key === 'Escape') {
      showAutocomplete.value = false
    }
    return
  }

  // Handle IntelliSense completion navigation
  if (showCompletions.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedCompletionIndex.value = Math.min(
        selectedCompletionIndex.value + 1,
        completionSuggestions.value.length - 1
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedCompletionIndex.value = Math.max(selectedCompletionIndex.value - 1, 0)
    } else if (event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault()
      if (completionSuggestions.value[selectedCompletionIndex.value]) {
        insertCompletion(completionSuggestions.value[selectedCompletionIndex.value])
      }
    } else if (event.key === 'Escape') {
      hideCompletions()
    }
    return
  }

  // Handle keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        saveFile()
        break
      case 'f':
        if (event.shiftKey) {
          event.preventDefault()
          formatCode()
        }
        break
      case 'F5':
        event.preventDefault()
        runCode()
        break
    }
  }

  // Handle function keys for debugging
  if (event.key === 'F5') {
    event.preventDefault()
    if (event.shiftKey) {
      stopDebugging()
    } else if (debugState.value.isDebugging) {
      continueExecution()
    } else {
      startDebugging()
    }
  } else if (event.key === 'F10') {
    event.preventDefault()
    stepOver()
  } else if (event.key === 'F11') {
    event.preventDefault()
    if (event.shiftKey) {
      stepOut()
    } else {
      stepInto()
    }
  } else if (event.key === 'F9') {
    event.preventDefault()
    toggleBreakpoint(currentLine.value)
  }

  // Handle special keys
  if (event.key === 'Tab') {
    event.preventDefault()
    insertTab()
  }
}

const handleScroll = () => {
  // Update line number scroll
  showAutocomplete.value = false
}

const updateCursorPosition = () => {
  nextTick(() => {
    if (!codeEditor.value) return

    const textarea = codeEditor.value
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.value.substring(0, cursorPos)
    const lines = textBeforeCursor.split('\n')

    currentLine.value = lines.length
    currentColumn.value = lines[lines.length - 1].length + 1

    // Get selected text
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    selectedText.value = content.value.substring(start, end)
  })
}

const updateAutocomplete = () => {
  if (!codeEditor.value) return

  const textarea = codeEditor.value
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = content.value.substring(0, cursorPos)

  // Get current word
  const match = textBeforeCursor.match(/[\w.]+$/)
  const currentWord = match ? match[0] : ''

  if (currentWord.length > 0) {
    autocompleteItems.value = getAutocompleteSuggestions(currentLanguage.value, currentWord)
    if (autocompleteItems.value.length > 0) {
      showAutocomplete.value = true
      selectedAutocompleteIndex.value = 0
      updateAutocompletePosition(textarea, cursorPos)
    } else {
      showAutocomplete.value = false
    }
  } else {
    showAutocomplete.value = false
  }
}

const updateAutocompletePosition = (textarea, cursorPos) => {
  const lines = content.value.substring(0, cursorPos).split('\n')
  const currentLine = lines.length - 1
  const currentColumn = lines[lines.length - 1].length

  const lineHeight = 24
  const charWidth = 8.4

  autocompletePosition.value = {
    top: `${12 + (currentLine * lineHeight) + lineHeight}px`,
    left: `${(showLineNumbers.value ? lineNumberWidth.value : 0) + 16 + (currentColumn * charWidth)}px`
  }
}

const applyAutocompletion = (item) => {
  if (!codeEditor.value) return

  const textarea = codeEditor.value
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = content.value.substring(0, cursorPos)
  const textAfterCursor = content.value.substring(cursorPos)

  // Find the start of current word
  const match = textBeforeCursor.match(/[\w.]+$/)
  const wordStart = match ? cursorPos - match[0].length : cursorPos

  // Replace current word with suggestion
  content.value
    = content.value.substring(0, wordStart)
      + item.text
      + textAfterCursor

  showAutocomplete.value = false

  // Set cursor position
  nextTick(() => {
    const newCursorPos = wordStart + item.text.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const insertTab = () => {
  if (!codeEditor.value) return

  const textarea = codeEditor.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd

  // Insert 2 spaces instead of tab
  content.value = content.value.substring(0, start) + '  ' + content.value.substring(end)

  nextTick(() => {
    textarea.setSelectionRange(start + 2, start + 2)
    textarea.focus()
  })
}

const formatCode = () => {
  // Basic formatting (placeholder)
  console.log('Format code - would integrate with prettier or similar')
}

const runCode = () => {
  emit('run-code', { filename: props.filename, content: content.value, language: currentLanguage.value })
}

const saveFile = () => {
  hasUnsavedChanges.value = false
  emit('save-file', { filename: props.filename, content: content.value })
}

const updateLanguage = () => {
  emit('update-content', content.value, currentLanguage.value)
}

const checkSyntax = () => {
  // Basic syntax checking (placeholder)
  errors.value = []

  if (currentLanguage.value === 'javascript') {
    // Simple brace matching
    const braceCount = (content.value.match(/\{/g) || []).length - (content.value.match(/\}/g) || []).length
    if (braceCount !== 0) {
      errors.value.push({ line: totalLines.value, message: 'Mismatched braces' })
    }
  }
}

// Debugger Functions
const toggleBreakpoint = (lineNumber) => {
  if (debugState.value.breakpoints.has(lineNumber)) {
    debugState.value.breakpoints.delete(lineNumber)
  } else {
    debugState.value.breakpoints.add(lineNumber)
  }

  // Trigger breakpoint indicator update
  updateBreakpointIndicators()
}

const startDebugging = () => {
  debugState.value.isDebugging = true
  debugState.value.currentExecutionLine = null
  debugState.value.callStack = []
  debugState.value.variables = {}

  // Mock initialization of debugger
  console.log('Debugger started with breakpoints:', [...debugState.value.breakpoints])
}

const stopDebugging = () => {
  debugState.value.isDebugging = false
  debugState.value.currentExecutionLine = null
  debugState.value.callStack = []
  debugState.value.variables = {}

  console.log('Debugger stopped')
}

const stepOver = () => {
  if (!debugState.value.isDebugging) return

  // Mock step over functionality
  const currentLine = debugState.value.currentExecutionLine || 1
  debugState.value.currentExecutionLine = currentLine + 1

  // Mock variable state update
  debugState.value.variables = {
    ...debugState.value.variables,
    [`line_${currentLine}`]: `Variable at line ${currentLine}`,
    currentStep: currentLine + 1
  }

  console.log('Step over to line:', debugState.value.currentExecutionLine)
}

const stepInto = () => {
  if (!debugState.value.isDebugging) return

  // Mock step into functionality
  const currentLine = debugState.value.currentExecutionLine || 1
  debugState.value.currentExecutionLine = currentLine + 1
  debugState.value.callStack.push({
    function: `function_at_line_${currentLine}`,
    line: currentLine,
    file: props.filename
  })

  console.log('Step into function at line:', currentLine)
}

const stepOut = () => {
  if (!debugState.value.isDebugging || debugState.value.callStack.length === 0) return

  // Mock step out functionality
  const lastCall = debugState.value.callStack.pop()
  debugState.value.currentExecutionLine = lastCall.line + 1

  console.log('Step out of function:', lastCall.function)
}

const continueExecution = () => {
  if (!debugState.value.isDebugging) return

  // Mock continue execution until next breakpoint
  const nextBreakpoint = findNextBreakpoint(debugState.value.currentExecutionLine)
  if (nextBreakpoint) {
    debugState.value.currentExecutionLine = nextBreakpoint
    console.log('Execution paused at breakpoint:', nextBreakpoint)
  } else {
    debugState.value.currentExecutionLine = null
    stopDebugging()
    console.log('Execution completed')
  }
}

const findNextBreakpoint = (currentLine) => {
  const breakpoints = [...debugState.value.breakpoints].sort((a, b) => a - b)
  return breakpoints.find(line => line > currentLine) || null
}

const _addWatchExpression = (expression) => {
  if (!debugState.value.watchExpressions.includes(expression)) {
    debugState.value.watchExpressions.push(expression)
  }
}

const _removeWatchExpression = (expression) => {
  const index = debugState.value.watchExpressions.indexOf(expression)
  if (index > -1) {
    debugState.value.watchExpressions.splice(index, 1)
  }
}

const _evaluateExpression = (expression) => {
  // Mock expression evaluation - real implementation would use debugger API
  try {
    // Simple mock evaluation for demo
    if (expression.includes('variable')) {
      return `Mock value for ${expression}: ${Math.random()}`
    }
    return `${expression} = undefined`
  } catch (error) {
    return `Error: ${error.message}`
  }
}

const updateBreakpointIndicators = () => {
  // This would update the UI indicators - handled by reactive state
  nextTick(() => {
    console.log('Breakpoints updated:', [...debugState.value.breakpoints])
  })
}

// Helper functions for IntelliSense
const getIconForKind = (kind) => {
  switch (kind) {
    case 'function':
    case 'method':
      return '𝑓'
    case 'variable':
      return 'v'
    case 'class':
      return 'C'
    case 'interface':
      return 'I'
    case 'keyword':
      return 'K'
    case 'object':
      return 'O'
    default:
      return '●'
  }
}

const insertCompletion = (suggestion) => {
  if (!codeEditor.value) return

  const textarea = codeEditor.value
  const cursorPos = textarea.selectionStart
  const textBefore = content.value.substring(0, cursorPos)
  const textAfter = content.value.substring(cursorPos)

  // Find the start of the current word being typed
  const match = textBefore.match(/(\w*)$/)
  const currentWordStart = match ? cursorPos - match[1].length : cursorPos

  // Replace current word with suggestion
  const beforeWord = content.value.substring(0, currentWordStart)
  const newContent = beforeWord + suggestion.insertText + textAfter

  content.value = newContent
  showCompletions.value = false

  // Set cursor position after insertion
  nextTick(() => {
    const newCursorPos = currentWordStart + suggestion.insertText.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const hideCompletions = () => {
  showCompletions.value = false
  selectedCompletionIndex.value = 0
}

onMounted(() => {
  updateCursorPosition()
})
</script>

<style scoped>
.ide-code-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Cascadia Code', monospace;
}

/* Scrollbar styling */
.ide-code-editor ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.ide-code-editor ::-webkit-scrollbar-track {
  background: #374151;
}

.ide-code-editor ::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 4px;
}

.ide-code-editor ::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
