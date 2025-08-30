<template>
  <div class="node-ide" :class="{ expanded: isExpanded }">
    <div class="ide-header">
      <Icon name="heroicons:code-bracket-square" class="node-icon" />
      <span class="node-title">{{ title }}</span>
      <div class="ide-tabs">
        <div 
          v-for="file in openFiles" 
          :key="file.id"
          class="ide-tab"
          :class="{ active: activeFile?.id === file.id }"
          @click="selectFile(file)"
        >
          <Icon :name="getFileIcon(file.name)" class="file-icon" />
          <span>{{ file.name }}</span>
          <button @click.stop="closeFile(file)" class="tab-close">
            <Icon name="heroicons:x-mark" />
          </button>
        </div>
        <button @click="createNewFile" class="new-tab">
          <Icon name="heroicons:plus" />
        </button>
      </div>
      <div class="ide-actions">
        <button @click="runCode" class="run-btn" :disabled="isRunning">
          <Icon :name="isRunning ? 'heroicons:stop' : 'heroicons:play'" />
          {{ isRunning ? 'Stop' : 'Run' }}
        </button>
        <button @click="$emit('close')" class="close-btn">
          <Icon name="heroicons:x-mark" />
        </button>
      </div>
    </div>
    
    <div class="ide-body">
      <!-- File Explorer -->
      <div class="file-explorer" v-if="showExplorer">
        <div class="explorer-header">
          <span>Files</span>
          <button @click="createNewFile" class="explorer-action">
            <Icon name="heroicons:document-plus" />
          </button>
        </div>
        <div class="file-tree">
          <div 
            v-for="file in files" 
            :key="file.id"
            class="file-item"
            :class="{ active: activeFile?.id === file.id }"
            @click="openFile(file)"
          >
            <Icon :name="getFileIcon(file.name)" class="file-icon" />
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.content.length) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Code Editor -->
      <div class="code-editor-container">
        <div class="editor-toolbar">
          <select v-model="activeLanguage" class="language-selector">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="vue">Vue</option>
            <option value="json">JSON</option>
          </select>
          <div class="editor-info">
            <span>Line {{ cursorPosition.line }}</span>
            <span>Col {{ cursorPosition.column }}</span>
            <span>{{ activeLanguage }}</span>
          </div>
        </div>
        
        <div class="code-editor" ref="editorRef">
          <div class="line-numbers">
            <div 
              v-for="line in lineCount" 
              :key="line"
              class="line-number"
              :class="{ active: line === cursorPosition.line }"
            >
              {{ line }}
            </div>
          </div>
          
          <textarea
            v-model="activeFile.content"
            class="code-textarea"
            :style="{ fontFamily: 'monospace' }"
            @input="handleCodeChange"
            @keydown="handleKeyDown"
            spellcheck="false"
          />
          
          <!-- Syntax highlighting overlay -->
          <div class="syntax-overlay" v-html="highlightedCode"></div>
        </div>
        
        <!-- Intellisense/Autocomplete -->
        <div 
          v-if="showAutocomplete" 
          class="autocomplete"
          :style="autocompletePosition"
        >
          <div 
            v-for="(suggestion, index) in suggestions"
            :key="index"
            class="suggestion"
            :class="{ selected: selectedSuggestion === index }"
            @click="applySuggestion(suggestion)"
          >
            <Icon :name="getSuggestionIcon(suggestion.type)" />
            <span class="suggestion-text">{{ suggestion.text }}</span>
            <span class="suggestion-type">{{ suggestion.type }}</span>
          </div>
        </div>
      </div>
      
      <!-- Terminal/Output -->
      <div class="ide-terminal" :class="{ expanded: terminalExpanded }">
        <div class="terminal-header">
          <div class="terminal-tabs">
            <button 
              class="terminal-tab" 
              :class="{ active: activeTerminal === 'output' }"
              @click="activeTerminal = 'output'"
            >
              Output
            </button>
            <button 
              class="terminal-tab"
              :class="{ active: activeTerminal === 'console' }"
              @click="activeTerminal = 'console'"
            >
              Console
            </button>
            <button 
              class="terminal-tab"
              :class="{ active: activeTerminal === 'problems' }"
              @click="activeTerminal = 'problems'"
            >
              Problems
              <span v-if="problems.length" class="problem-count">{{ problems.length }}</span>
            </button>
          </div>
          <button @click="toggleTerminal" class="terminal-toggle">
            <Icon :name="terminalExpanded ? 'heroicons:chevron-down' : 'heroicons:chevron-up'" />
          </button>
        </div>
        
        <div class="terminal-content">
          <!-- Output Tab -->
          <div v-if="activeTerminal === 'output'" class="terminal-output">
            <pre>{{ output }}</pre>
            <div v-if="isRunning" class="running-indicator">
              <div class="spinner"></div>
              <span>Running...</span>
            </div>
          </div>
          
          <!-- Console Tab -->
          <div v-if="activeTerminal === 'console'" class="terminal-console">
            <div v-for="log in consoleLogs" :key="log.id" class="console-log" :class="log.type">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <input 
              v-model="consoleInput"
              @keydown.enter="executeCommand"
              class="console-input"
              placeholder=">"
            />
          </div>
          
          <!-- Problems Tab -->
          <div v-if="activeTerminal === 'problems'" class="terminal-problems">
            <div v-for="problem in problems" :key="problem.id" class="problem-item">
              <Icon 
                :name="problem.severity === 'error' ? 'heroicons:x-circle' : 'heroicons:exclamation-triangle'"
                :class="problem.severity"
              />
              <span class="problem-file">{{ problem.file }}:{{ problem.line }}</span>
              <span class="problem-message">{{ problem.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Status Bar -->
    <div class="ide-status">
      <div class="status-left">
        <span class="status-item">
          <Icon name="heroicons:document-text" />
          {{ files.length }} files
        </span>
        <span class="status-item" :class="{ modified: hasUnsavedChanges }">
          <Icon name="heroicons:pencil" />
          {{ hasUnsavedChanges ? 'Modified' : 'Saved' }}
        </span>
      </div>
      <div class="status-right">
        <span class="status-item">UTF-8</span>
        <span class="status-item">{{ activeLanguage }}</span>
        <span class="status-item">Spaces: 2</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface File {
  id: string
  name: string
  content: string
  language: string
  modified: boolean
}

interface Problem {
  id: string
  file: string
  line: number
  severity: 'error' | 'warning'
  message: string
}

const props = defineProps<{
  node: any
  isExpanded?: boolean
}>()

const emit = defineEmits(['update', 'close'])

// State
const title = ref(props.node?.title || 'Code Editor')
const files = ref<File[]>(props.node?.content?.files || [
  {
    id: 'file-1',
    name: 'index.js',
    content: '// Welcome to the IDE\nconsole.log("Hello, World!");',
    language: 'javascript',
    modified: false
  }
])
const openFiles = ref<File[]>([files.value[0]])
const activeFile = ref<File>(files.value[0])
const activeLanguage = ref('javascript')
const showExplorer = ref(true)
const terminalExpanded = ref(true)
const activeTerminal = ref<'output' | 'console' | 'problems'>('output')

// Editor state
const cursorPosition = ref({ line: 1, column: 1 })
const showAutocomplete = ref(false)
const suggestions = ref<any[]>([])
const selectedSuggestion = ref(0)
const autocompletePosition = ref({ top: '0px', left: '0px' })
const highlightedCode = ref('')

// Execution state
const isRunning = ref(false)
const output = ref('')
const consoleLogs = ref<any[]>([])
const consoleInput = ref('')
const problems = ref<Problem[]>([])
const hasUnsavedChanges = ref(false)

// Computed
const lineCount = computed(() => {
  if (!activeFile.value) return 0
  return activeFile.value.content.split('\n').length
})

// Methods
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const icons: Record<string, string> = {
    js: 'vscode-icons:file-type-js',
    ts: 'vscode-icons:file-type-typescript',
    vue: 'vscode-icons:file-type-vue',
    html: 'vscode-icons:file-type-html',
    css: 'vscode-icons:file-type-css',
    json: 'vscode-icons:file-type-json',
    py: 'vscode-icons:file-type-python',
    md: 'vscode-icons:file-type-markdown'
  }
  return icons[ext || ''] || 'heroicons:document'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

function createNewFile() {
  const newFile: File = {
    id: `file-${Date.now()}`,
    name: `untitled-${files.value.length + 1}.js`,
    content: '',
    language: 'javascript',
    modified: false
  }
  files.value.push(newFile)
  openFile(newFile)
}

function openFile(file: File) {
  if (!openFiles.value.find(f => f.id === file.id)) {
    openFiles.value.push(file)
  }
  selectFile(file)
}

function selectFile(file: File) {
  activeFile.value = file
  activeLanguage.value = file.language
}

function closeFile(file: File) {
  const index = openFiles.value.findIndex(f => f.id === file.id)
  if (index > -1) {
    openFiles.value.splice(index, 1)
    if (activeFile.value?.id === file.id && openFiles.value.length > 0) {
      selectFile(openFiles.value[Math.max(0, index - 1)])
    }
  }
}

function handleCodeChange() {
  if (activeFile.value) {
    activeFile.value.modified = true
    hasUnsavedChanges.value = true
    
    // Trigger syntax highlighting
    updateSyntaxHighlighting()
    
    // Check for problems
    checkForProblems()
  }
}

function handleKeyDown(event: KeyboardEvent) {
  // Handle shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 's':
        event.preventDefault()
        saveFile()
        break
      case 'Enter':
        event.preventDefault()
        runCode()
        break
      case ' ':
        event.preventDefault()
        triggerAutocomplete()
        break
    }
  }
  
  // Update cursor position
  updateCursorPosition()
}

function saveFile() {
  if (activeFile.value) {
    activeFile.value.modified = false
    hasUnsavedChanges.value = files.value.some(f => f.modified)
    
    // Emit update
    emit('update', {
      content: { files: files.value }
    })
  }
}

async function runCode() {
  if (isRunning.value) {
    // Stop execution
    isRunning.value = false
    output.value += '\n[Execution stopped]'
    return
  }
  
  isRunning.value = true
  output.value = 'Running code...\n'
  
  try {
    // Simulate code execution
    if (activeLanguage.value === 'javascript') {
      // Create a sandboxed execution context
      const code = activeFile.value?.content || ''
      
      // Override console.log to capture output
      const logs: string[] = []
      const originalLog = console.log
      console.log = (...args) => {
        logs.push(args.join(' '))
      }
      
      // Execute code (in production, use a proper sandbox)
      try {
        eval(code)
        output.value = logs.join('\n') || 'Code executed successfully (no output)'
      } catch (error: any) {
        output.value = `Error: ${error.message}`
        problems.value.push({
          id: `problem-${Date.now()}`,
          file: activeFile.value?.name || 'unknown',
          line: 1,
          severity: 'error',
          message: error.message
        })
      } finally {
        console.log = originalLog
      }
    } else {
      output.value = `Language '${activeLanguage.value}' execution not implemented yet`
    }
  } finally {
    isRunning.value = false
  }
}

function executeCommand() {
  if (consoleInput.value.trim()) {
    consoleLogs.value.push({
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      type: 'info',
      message: `> ${consoleInput.value}`
    })
    
    try {
      const result = eval(consoleInput.value)
      consoleLogs.value.push({
        id: `log-${Date.now()}-result`,
        timestamp: new Date(),
        type: 'log',
        message: String(result)
      })
    } catch (error: any) {
      consoleLogs.value.push({
        id: `log-${Date.now()}-error`,
        timestamp: new Date(),
        type: 'error',
        message: error.message
      })
    }
    
    consoleInput.value = ''
  }
}

function toggleTerminal() {
  terminalExpanded.value = !terminalExpanded.value
}

function updateCursorPosition() {
  // Update cursor position based on textarea selection
  // This is simplified - in production, use a proper code editor library
  cursorPosition.value = { 
    line: 1, 
    column: 1 
  }
}

function updateSyntaxHighlighting() {
  // Simplified syntax highlighting
  // In production, use a proper syntax highlighting library
  if (activeFile.value) {
    let code = activeFile.value.content
    
    // Basic keyword highlighting for JavaScript
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default']
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      code = code.replace(regex, `<span class="keyword">${keyword}</span>`)
    })
    
    // String highlighting
    code = code.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
    
    // Comment highlighting
    code = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
    
    highlightedCode.value = code
  }
}

function checkForProblems() {
  // Basic problem detection
  problems.value = []
  
  if (activeFile.value) {
    const lines = activeFile.value.content.split('\n')
    lines.forEach((line, index) => {
      // Check for common issues
      if (line.includes('console.log') && activeLanguage.value === 'production') {
        problems.value.push({
          id: `problem-${Date.now()}-${index}`,
          file: activeFile.value!.name,
          line: index + 1,
          severity: 'warning',
          message: 'console.log should not be used in production'
        })
      }
    })
  }
}

function triggerAutocomplete() {
  // Simple autocomplete suggestions
  suggestions.value = [
    { text: 'console.log()', type: 'function' },
    { text: 'document.getElementById()', type: 'function' },
    { text: 'addEventListener', type: 'method' },
    { text: 'querySelector', type: 'method' },
    { text: 'forEach', type: 'method' }
  ]
  showAutocomplete.value = true
  selectedSuggestion.value = 0
}

function applySuggestion(suggestion: any) {
  // Apply the selected suggestion to the code
  if (activeFile.value) {
    activeFile.value.content += suggestion.text
  }
  showAutocomplete.value = false
}

function getSuggestionIcon(type: string) {
  const icons: Record<string, string> = {
    function: 'heroicons:code-bracket',
    method: 'heroicons:cube',
    property: 'heroicons:tag',
    variable: 'heroicons:variable'
  }
  return icons[type] || 'heroicons:document-text'
}

// Initialize
onMounted(() => {
  updateSyntaxHighlighting()
})
</script>

<style scoped>
.node-ide {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.ide-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.node-icon {
  color: #007acc;
  font-size: 20px;
}

.node-title {
  color: #cccccc;
  font-weight: 600;
}

.ide-tabs {
  flex: 1;
  display: flex;
  gap: 2px;
  margin: 0 10px;
}

.ide-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #2d2d30;
  color: #969696;
  border-top: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.ide-tab:hover {
  background: #3e3e42;
}

.ide-tab.active {
  background: #1e1e1e;
  color: white;
  border-top-color: #007acc;
}

.file-icon {
  font-size: 14px;
}

.tab-close {
  padding: 2px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  border-radius: 3px;
}

.tab-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.new-tab {
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  border-radius: 3px;
}

.new-tab:hover {
  background: #3e3e42;
}

.ide-actions {
  display: flex;
  gap: 5px;
}

.run-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #0e639c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.run-btn:hover:not(:disabled) {
  background: #1177bb;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  border-radius: 3px;
}

.close-btn:hover {
  background: rgba(255, 0, 0, 0.2);
  color: #f48771;
}

.ide-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* File Explorer */
.file-explorer {
  width: 200px;
  background: #252526;
  border-right: 1px solid #3e3e42;
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  color: #cccccc;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.explorer-action {
  padding: 4px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  border-radius: 3px;
}

.explorer-action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.file-tree {
  padding: 5px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  color: #cccccc;
  cursor: pointer;
  border-radius: 3px;
}

.file-item:hover {
  background: #2a2d2e;
}

.file-item.active {
  background: #094771;
}

.file-name {
  flex: 1;
  font-size: 13px;
}

.file-size {
  font-size: 11px;
  color: #969696;
}

/* Code Editor */
.code-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.language-selector {
  padding: 4px 8px;
  background: #3c3c3c;
  color: #cccccc;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  font-size: 12px;
}

.editor-info {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #969696;
}

.code-editor {
  flex: 1;
  display: flex;
  position: relative;
  overflow: auto;
  background: #1e1e1e;
}

.line-numbers {
  padding: 10px 5px;
  background: #1e1e1e;
  border-right: 1px solid #3e3e42;
  user-select: none;
}

.line-number {
  padding: 0 10px;
  color: #858585;
  font-size: 13px;
  line-height: 20px;
  text-align: right;
}

.line-number.active {
  color: #cccccc;
  background: rgba(255, 255, 255, 0.05);
}

.code-textarea {
  flex: 1;
  padding: 10px;
  background: transparent;
  color: #d4d4d4;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  resize: none;
}

.syntax-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px;
  pointer-events: none;
  font-size: 13px;
  line-height: 20px;
  white-space: pre-wrap;
  opacity: 0;
}

/* Autocomplete */
.autocomplete {
  position: absolute;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  color: #cccccc;
  cursor: pointer;
}

.suggestion:hover, .suggestion.selected {
  background: #094771;
}

.suggestion-text {
  flex: 1;
  font-size: 13px;
}

.suggestion-type {
  font-size: 11px;
  color: #969696;
}

/* Terminal */
.ide-terminal {
  height: 200px;
  background: #1e1e1e;
  border-top: 1px solid #3e3e42;
  transition: height 0.3s;
}

.ide-terminal.expanded {
  height: 300px;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.terminal-tabs {
  display: flex;
  gap: 10px;
}

.terminal-tab {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 2px solid transparent;
}

.terminal-tab:hover {
  color: #cccccc;
}

.terminal-tab.active {
  color: white;
  border-bottom-color: #007acc;
}

.problem-count {
  padding: 0 4px;
  background: #f48771;
  color: white;
  border-radius: 10px;
  font-size: 10px;
  margin-left: 5px;
}

.terminal-toggle {
  padding: 4px;
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
}

.terminal-content {
  height: calc(100% - 35px);
  overflow: auto;
  padding: 10px;
}

.terminal-output {
  font-family: inherit;
  font-size: 13px;
  color: #cccccc;
}

.terminal-output pre {
  margin: 0;
  white-space: pre-wrap;
}

.running-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #4ec9b0;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: #4ec9b0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.console-log {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 13px;
}

.console-log.error {
  color: #f48771;
}

.console-log.warn {
  color: #cca700;
}

.console-log.info {
  color: #4ec9b0;
}

.log-time {
  color: #858585;
}

.log-message {
  flex: 1;
}

.console-input {
  width: 100%;
  padding: 5px;
  background: #2d2d30;
  color: #cccccc;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.problem-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  font-size: 13px;
}

.problem-item .error {
  color: #f48771;
}

.problem-item .warning {
  color: #cca700;
}

.problem-file {
  color: #969696;
}

.problem-message {
  flex: 1;
  color: #cccccc;
}

/* Status Bar */
.ide-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 10px;
  background: #007acc;
  color: white;
  font-size: 12px;
}

.status-left, .status-right {
  display: flex;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-item.modified {
  color: #ffd700;
}

/* Expanded state */
.node-ide.expanded {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  height: 90vh;
  z-index: 1000;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
</style>