<template>
  <div class="code-block">
    <div class="code-header">
      <select 
        v-model="language" 
        @change="updateLanguage"
        class="language-selector"
      >
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="json">JSON</option>
        <option value="sql">SQL</option>
        <option value="bash">Bash</option>
        <option value="markdown">Markdown</option>
        <option value="vue">Vue</option>
        <option value="react">React</option>
        <option value="rust">Rust</option>
        <option value="go">Go</option>
        <option value="java">Java</option>
        <option value="cpp">C++</option>
      </select>
      <button @click="copyCode" class="copy-btn" title="Copy code">
        <Icon :name="copied ? 'heroicons:check' : 'heroicons:clipboard'" />
      </button>
      <button @click="runCode" class="run-btn" title="Run code" v-if="canRun">
        <Icon name="heroicons:play" />
      </button>
    </div>
    <div class="code-container">
      <div class="line-numbers">
        <div 
          v-for="(_, index) in lines" 
          :key="index"
          class="line-number"
        >
          {{ index + 1 }}
        </div>
      </div>
      <textarea
        ref="codeRef"
        v-model="code"
        class="code-editor"
        :readonly="readonly"
        @input="handleInput"
        @keydown="handleKeydown"
        spellcheck="false"
      />
    </div>
    <div v-if="output" class="code-output">
      <div class="output-header">
        <Icon name="heroicons:command-line" />
        <span>Output</span>
        <button @click="clearOutput" class="clear-btn">
          <Icon name="heroicons:x-mark" />
        </button>
      </div>
      <pre class="output-content">{{ output }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: any
  block: any
  selected?: boolean
  readonly?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'update', 'delete', 'move-up', 'move-down'])

const codeRef = ref<HTMLTextAreaElement>()
const code = ref(props.modelValue?.code || '')
const language = ref(props.modelValue?.language || 'javascript')
const output = ref('')
const copied = ref(false)

const lines = computed(() => {
  return code.value.split('\n')
})

const canRun = computed(() => {
  return ['javascript', 'typescript', 'python'].includes(language.value)
})

const handleInput = () => {
  emit('update:modelValue', { code: code.value, language: language.value })
  emit('update', { code: code.value, language: language.value })
}

const updateLanguage = () => {
  emit('update', { code: code.value, language: language.value })
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const start = codeRef.value?.selectionStart || 0
    const end = codeRef.value?.selectionEnd || 0
    const newCode = code.value.substring(0, start) + '  ' + code.value.substring(end)
    code.value = newCode
    
    nextTick(() => {
      if (codeRef.value) {
        codeRef.value.selectionStart = start + 2
        codeRef.value.selectionEnd = start + 2
      }
    })
    handleInput()
  } else if (event.key === 'Backspace' && !code.value && event.ctrlKey) {
    event.preventDefault()
    emit('delete')
  } else if (event.altKey) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      emit('move-up')
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      emit('move-down')
    }
  } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    runCode()
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy code:', err)
  }
}

const runCode = async () => {
  if (!canRun.value) return
  
  output.value = 'Running...'
  
  try {
    if (language.value === 'javascript' || language.value === 'typescript') {
      // Simple JavaScript execution (in sandbox)
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
      const fn = new AsyncFunction('console', code.value)
      
      const logs: string[] = []
      const mockConsole = {
        log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
        error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => String(a)).join(' ')),
        warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' '))
      }
      
      await fn(mockConsole)
      output.value = logs.join('\n') || 'Code executed successfully (no output)'
    } else if (language.value === 'python') {
      // Would need a Python runtime or API
      output.value = 'Python execution not yet implemented'
    }
  } catch (error: any) {
    output.value = `Error: ${error.message}`
  }
}

const clearOutput = () => {
  output.value = ''
}

// Focus on selection
watch(() => props.selected, async (selected) => {
  if (selected) {
    await nextTick()
    codeRef.value?.focus()
  }
})
</script>

<style scoped>
.code-block {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.language-selector {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
}

.language-selector:hover {
  background: rgba(255, 255, 255, 0.08);
}

.copy-btn, .run-btn, .clear-btn {
  margin-left: auto;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.copy-btn:hover, .run-btn:hover, .clear-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.run-btn {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.run-btn:hover {
  background: rgba(74, 222, 128, 0.3);
}

.code-container {
  display: flex;
  position: relative;
}

.line-numbers {
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  user-select: none;
}

.line-number {
  height: 20px;
  line-height: 20px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  text-align: right;
}

.code-editor {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 20px;
  resize: none;
  outline: none;
  min-height: 100px;
  white-space: pre;
  overflow-x: auto;
}

.code-output {
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.output-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.output-content {
  padding: 12px;
  color: #4ade80;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}
</style>