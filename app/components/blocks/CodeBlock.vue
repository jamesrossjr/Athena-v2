<template>
  <div class="code-block">
    <div class="bg-gray-900 rounded-lg overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 bg-gray-800">
        <select
          v-model="localContent.language"
          class="bg-gray-700 text-white text-sm rounded px-2 py-1"
          @change="updateContent"
        >
          <!-- Frontend Languages -->
          <option value="javascript">
            JavaScript
          </option>
          <option value="typescript">
            TypeScript
          </option>
          <option value="vue">
            Vue
          </option>
          <option value="react">
            React (JSX)
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
          <option value="less">
            Less
          </option>

          <!-- Backend Languages -->
          <option value="python">
            Python
          </option>
          <option value="java">
            Java
          </option>
          <option value="csharp">
            C#
          </option>
          <option value="cpp">
            C++
          </option>
          <option value="c">
            C
          </option>
          <option value="php">
            PHP
          </option>
          <option value="ruby">
            Ruby
          </option>
          <option value="go">
            Go
          </option>
          <option value="rust">
            Rust
          </option>
          <option value="kotlin">
            Kotlin
          </option>
          <option value="swift">
            Swift
          </option>
          <option value="dart">
            Dart
          </option>

          <!-- Database & Query -->
          <option value="sql">
            SQL
          </option>
          <option value="mysql">
            MySQL
          </option>
          <option value="postgresql">
            PostgreSQL
          </option>
          <option value="mongodb">
            MongoDB
          </option>
          <option value="graphql">
            GraphQL
          </option>

          <!-- Data & Config -->
          <option value="json">
            JSON
          </option>
          <option value="xml">
            XML
          </option>
          <option value="yaml">
            YAML
          </option>
          <option value="toml">
            TOML
          </option>
          <option value="ini">
            INI
          </option>

          <!-- Shell & Scripts -->
          <option value="bash">
            Bash
          </option>
          <option value="powershell">
            PowerShell
          </option>
          <option value="batch">
            Batch
          </option>
          <option value="dockerfile">
            Dockerfile
          </option>

          <!-- Documentation -->
          <option value="markdown">
            Markdown
          </option>
          <option value="latex">
            LaTeX
          </option>

          <!-- Other -->
          <option value="regex">
            Regex
          </option>
          <option value="text">
            Plain Text
          </option>
        </select>
        <div class="flex items-center space-x-2">
          <button
            class="text-gray-400 hover:text-white text-xs"
            @click="copyCode"
          >
            Copy
          </button>
          <span class="text-gray-400 text-xs">{{ localContent.language }}</span>
        </div>
      </div>
      <div class="relative">
        <textarea
          ref="codeEditor"
          v-model="localContent.code"
          placeholder="Enter your code..."
          class="w-full bg-gray-900 text-gray-100 font-mono text-sm p-4 border-none outline-none resize-none"
          style="min-height: 100px;"
          @input="handleInput"
          @keydown="handleKeydown"
          @focus="showAutocomplete = false"
        />

        <!-- Autocomplete dropdown -->
        <div
          v-if="showAutocomplete && suggestions.length > 0"
          class="absolute bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10"
          :style="autocompletePosition"
        >
          <div
            v-for="(suggestion, index) in suggestions"
            :key="index"
            :class="[
              'px-3 py-2 text-sm font-mono cursor-pointer flex items-center justify-between',
              index === selectedSuggestionIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            ]"
            @click="applySuggestion(suggestion)"
          >
            <span>{{ suggestion.text }}</span>
            <span class="text-xs opacity-70">{{ suggestion.type }}</span>
          </div>
        </div>

        <div
          v-if="localContent.showLineNumbers && localContent.code"
          class="absolute left-0 top-0 pt-4 pl-2 text-gray-500 font-mono text-sm select-none pointer-events-none"
        >
          <div
            v-for="(line, index) in localContent.code.split('\n')"
            :key="index"
            class="leading-6"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref, nextTick } from 'vue'

const props = defineProps({
  content: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

// Autocomplete state
const showAutocomplete = ref(false)
const suggestions = ref([])
const selectedSuggestionIndex = ref(0)
const autocompletePosition = ref({ top: '0px', left: '0px' })
const codeEditor = ref(null)

// Create local reactive copy to avoid mutating props
const localContent = reactive({ ...props.content })

// Watch for prop changes to sync local copy
watch(() => props.content, (newContent) => {
  Object.assign(localContent, newContent)
}, { deep: true })

// Language-specific autocomplete suggestions
const getAutocompleteSuggestions = (language, currentWord) => {
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
      { text: 'await', type: 'keyword' }
    ],
    vue: [
      { text: '<template>', type: 'tag' },
      { text: '<script setup>', type: 'tag' },
      { text: '<style scoped>', type: 'tag' },
      { text: 'v-model', type: 'directive' },
      { text: 'v-if', type: 'directive' },
      { text: 'v-else', type: 'directive' },
      { text: 'v-for', type: 'directive' },
      { text: 'ref()', type: 'composition' },
      { text: 'reactive()', type: 'composition' },
      { text: 'computed()', type: 'composition' },
      { text: 'watch()', type: 'composition' }
    ],
    python: [
      { text: 'def', type: 'keyword' },
      { text: 'class', type: 'keyword' },
      { text: 'if', type: 'keyword' },
      { text: 'for', type: 'keyword' },
      { text: 'while', type: 'keyword' },
      { text: 'print()', type: 'function' },
      { text: 'len()', type: 'function' },
      { text: 'range()', type: 'function' }
    ]
  }

  const baseSuggestions = suggestions[language] || suggestions.javascript

  if (!currentWord) return baseSuggestions.slice(0, 6)

  return baseSuggestions
    .filter(s => s.text.toLowerCase().includes(currentWord.toLowerCase()))
    .slice(0, 6)
}

const handleInput = (event) => {
  updateContent()

  const textarea = event.target
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localContent.code.substring(0, cursorPos)
  const currentWord = textBeforeCursor.split(/\s/).pop()

  if (currentWord && currentWord.length > 0) {
    suggestions.value = getAutocompleteSuggestions(localContent.language, currentWord)
    if (suggestions.value.length > 0) {
      showAutocomplete.value = true
      selectedSuggestionIndex.value = 0
      updateAutocompletePosition(textarea, cursorPos)
    } else {
      showAutocomplete.value = false
    }
  } else {
    showAutocomplete.value = false
  }
}

const handleKeydown = (event) => {
  if (!showAutocomplete.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedSuggestionIndex.value = Math.min(selectedSuggestionIndex.value + 1, suggestions.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
  } else if (event.key === 'Tab' || event.key === 'Enter') {
    event.preventDefault()
    if (suggestions.value[selectedSuggestionIndex.value]) {
      applySuggestion(suggestions.value[selectedSuggestionIndex.value])
    }
  } else if (event.key === 'Escape') {
    showAutocomplete.value = false
  }
}

const applySuggestion = (suggestion) => {
  const textarea = codeEditor.value
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = localContent.code.substring(0, cursorPos)
  const textAfterCursor = localContent.code.substring(cursorPos)

  // Find the start of current word
  const words = textBeforeCursor.split(/(\s+)/)
  const currentWord = words[words.length - 1]
  const wordStart = textBeforeCursor.lastIndexOf(currentWord)

  // Replace current word with suggestion
  localContent.code
    = localContent.code.substring(0, wordStart)
      + suggestion.text
      + textAfterCursor

  showAutocomplete.value = false
  updateContent()

  // Set cursor position after the inserted suggestion
  nextTick(() => {
    const newCursorPos = wordStart + suggestion.text.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

const updateAutocompletePosition = (textarea, cursorPos) => {
  const lines = localContent.code.substring(0, cursorPos).split('\n')
  const currentLine = lines.length - 1
  const currentColumn = lines[lines.length - 1].length

  // Approximate position calculation
  const lineHeight = 24
  const charWidth = 8.4

  autocompletePosition.value = {
    top: `${72 + (currentLine * lineHeight)}px`,
    left: `${16 + (currentColumn * charWidth)}px`
  }
}

const updateContent = () => {
  emit('update', { ...localContent })
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.content.code)
    // TODO: Show toast notification
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}
</script>

<style scoped>
.code-block {
  margin: 1rem 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Cascadia Code', monospace;
}
</style>
