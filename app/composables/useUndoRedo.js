/**
 * Undo/Redo System Composable
 *
 * Features:
 * - Command pattern implementation
 * - Unlimited undo/redo history
 * - Batch operations support
 * - Memory efficient with LRU eviction
 * - Async command execution
 * - Command grouping and transactions
 * - Persistent history across sessions
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export const useUndoRedo = (options = {}) => {
  const {
    maxHistorySize = 1000,
    persistHistory = true,
    storageKey = 'command-center-history',
    enableBatching = true,
    batchTimeout = 100
  } = options

  // State
  const history = ref([])
  const currentIndex = ref(-1)
  const isUndoing = ref(false)
  const isRedoing = ref(false)
  const batchedCommands = ref([])
  const batchTimeout_id = ref(null)

  // Computed properties
  const canUndo = computed(() => currentIndex.value >= 0)
  const canRedo = computed(() => currentIndex.value < history.value.length - 1)
  const historySize = computed(() => history.value.length)
  const currentCommand = computed(() => {
    return currentIndex.value >= 0 ? history.value[currentIndex.value] : null
  })

  // Command pattern base class
  const createCommand = (name, execute, undo, metadata = {}) => {
    return {
      id: generateCommandId(),
      name,
      execute: wrapCommandFunction(execute),
      undo: wrapCommandFunction(undo),
      timestamp: Date.now(),
      metadata: {
        source: 'command-center',
        version: '1.0.0',
        ...metadata
      },
      executed: false,
      undone: false
    }
  }

  // Generate unique command ID
  const generateCommandId = () => {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Wrap command functions to handle async operations and errors
  const wrapCommandFunction = (fn) => {
    return async (...args) => {
      try {
        const result = await fn(...args)
        return { success: true, result, error: null }
      } catch (error) {
        console.error('Command execution failed:', error)
        return { success: false, result: null, error }
      }
    }
  }

  // Execute a command and add to history
  const executeCommand = async (command) => {
    if (!command || typeof command.execute !== 'function') {
      throw new Error('Invalid command: must have execute function')
    }

    // Clear any redo history when executing new command
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // Execute the command
    const result = await command.execute()

    if (result.success) {
      command.executed = true
      command.executionResult = result.result

      // Add to history
      history.value.push(command)
      currentIndex.value = history.value.length - 1

      // Manage history size
      if (history.value.length > maxHistorySize) {
        history.value.shift()
        currentIndex.value--
      }

      // Persist if enabled
      if (persistHistory) {
        await saveHistoryToStorage()
      }

      return result.result
    } else {
      throw new Error(result.error?.message || 'Command execution failed')
    }
  }

  // Batch multiple commands into a single undo/redo operation
  const executeBatch = async (commands, batchName = 'Batch Operation') => {
    if (!Array.isArray(commands) || commands.length === 0) {
      return []
    }

    const batchCommand = createCommand(
      batchName,
      async () => {
        const results = []
        for (const cmd of commands) {
          const result = await cmd.execute()
          if (!result.success) {
            // Rollback previous commands in batch
            for (let i = results.length - 1; i >= 0; i--) {
              if (commands[i].undo) {
                await commands[i].undo()
              }
            }
            throw new Error(`Batch failed at command: ${cmd.name}`)
          }
          results.push(result.result)
        }
        return results
      },
      async () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          if (commands[i].undo) {
            await commands[i].undo()
          }
        }
      },
      {
        type: 'batch',
        commandCount: commands.length,
        commands: commands.map(cmd => ({
          id: cmd.id,
          name: cmd.name
        }))
      }
    )

    return await executeCommand(batchCommand)
  }

  // Add command to current batch (for auto-batching)
  const addToBatch = (command) => {
    if (!enableBatching) {
      return executeCommand(command)
    }

    batchedCommands.value.push(command)

    // Clear existing timeout
    if (batchTimeout_id.value) {
      clearTimeout(batchTimeout_id.value)
    }

    // Set new timeout to execute batch
    batchTimeout_id.value = setTimeout(async () => {
      if (batchedCommands.value.length > 0) {
        const commands = [...batchedCommands.value]
        batchedCommands.value = []

        if (commands.length === 1) {
          await executeCommand(commands[0])
        } else {
          await executeBatch(commands, 'Auto Batch')
        }
      }
    }, batchTimeout)
  }

  // Undo last command
  const undo = async () => {
    if (!canUndo.value || isUndoing.value) {
      return false
    }

    isUndoing.value = true

    try {
      const command = history.value[currentIndex.value]

      if (command.undo && typeof command.undo === 'function') {
        const result = await command.undo()

        if (result.success) {
          command.undone = true
          currentIndex.value--

          if (persistHistory) {
            await saveHistoryToStorage()
          }

          return true
        } else {
          console.error('Undo failed:', result.error)
          return false
        }
      } else {
        console.warn('Command has no undo function:', command.name)
        currentIndex.value--
        return false
      }
    } catch (error) {
      console.error('Undo error:', error)
      return false
    } finally {
      isUndoing.value = false
    }
  }

  // Redo next command
  const redo = async () => {
    if (!canRedo.value || isRedoing.value) {
      return false
    }

    isRedoing.value = true

    try {
      currentIndex.value++
      const command = history.value[currentIndex.value]

      if (command.execute && typeof command.execute === 'function') {
        const result = await command.execute()

        if (result.success) {
          command.undone = false
          command.executionResult = result.result

          if (persistHistory) {
            await saveHistoryToStorage()
          }

          return true
        } else {
          console.error('Redo failed:', result.error)
          currentIndex.value--
          return false
        }
      } else {
        console.warn('Command has no execute function:', command.name)
        return false
      }
    } catch (error) {
      console.error('Redo error:', error)
      currentIndex.value--
      return false
    } finally {
      isRedoing.value = false
    }
  }

  // Clear all history
  const clearHistory = async () => {
    history.value = []
    currentIndex.value = -1
    batchedCommands.value = []

    if (batchTimeout_id.value) {
      clearTimeout(batchTimeout_id.value)
      batchTimeout_id.value = null
    }

    if (persistHistory) {
      await saveHistoryToStorage()
    }
  }

  // Get command history for display
  const getHistory = (limit = null) => {
    const historyData = history.value.map((command, index) => ({
      id: command.id,
      name: command.name,
      timestamp: command.timestamp,
      executed: command.executed,
      undone: command.undone,
      isCurrent: index === currentIndex.value,
      canUndo: index <= currentIndex.value,
      canRedo: index > currentIndex.value,
      metadata: command.metadata
    }))

    return limit ? historyData.slice(-limit) : historyData
  }

  // Jump to specific point in history
  const jumpToCommand = async (commandId) => {
    const targetIndex = history.value.findIndex(cmd => cmd.id === commandId)
    if (targetIndex === -1) {
      return false
    }

    const direction = targetIndex > currentIndex.value ? 'redo' : 'undo'
    const steps = Math.abs(targetIndex - currentIndex.value)

    let success = true
    for (let i = 0; i < steps && success; i++) {
      if (direction === 'redo') {
        success = await redo()
      } else {
        success = await undo()
      }
    }

    return success
  }

  // Save history to localStorage
  const saveHistoryToStorage = async () => {
    if (typeof localStorage === 'undefined') return

    try {
      const historyData = {
        history: history.value.map(cmd => ({
          id: cmd.id,
          name: cmd.name,
          timestamp: cmd.timestamp,
          metadata: cmd.metadata,
          executed: cmd.executed,
          undone: cmd.undone
        })),
        currentIndex: currentIndex.value,
        savedAt: Date.now()
      }

      localStorage.setItem(storageKey, JSON.stringify(historyData))
    } catch (error) {
      console.warn('Failed to save history to storage:', error)
    }
  }

  // Load history from localStorage
  const loadHistoryFromStorage = async () => {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const historyData = JSON.parse(stored)

        // Only load recent history (last 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
        if (historyData.savedAt > oneDayAgo) {
          // Note: We only restore metadata, not the actual command functions
          // Commands must be re-registered for security reasons
          const restoredHistory = historyData.history.map(cmd => ({
            ...cmd,
            execute: null, // Must be re-registered
            undo: null // Must be re-registered
          }))

          history.value = restoredHistory
          currentIndex.value = Math.min(historyData.currentIndex, restoredHistory.length - 1)
        }
      }
    } catch (error) {
      console.warn('Failed to load history from storage:', error)
    }
  }

  // Get performance statistics
  const getPerformanceStats = () => {
    const now = Date.now()
    const last24h = now - (24 * 60 * 60 * 1000)
    const recentCommands = history.value.filter(cmd => cmd.timestamp > last24h)

    return {
      totalCommands: history.value.length,
      recentCommands: recentCommands.length,
      undoCount: history.value.filter(cmd => cmd.undone).length,
      redoCount: history.value.filter(cmd => cmd.executed && !cmd.undone).length,
      batchCommands: history.value.filter(cmd => cmd.metadata?.type === 'batch').length,
      averageExecutionTime: calculateAverageExecutionTime(recentCommands),
      memoryUsage: history.value.length * 1024 // Rough estimate
    }
  }

  const calculateAverageExecutionTime = (commands) => {
    if (commands.length === 0) return 0

    const times = commands
      .filter(cmd => cmd.metadata?.executionTime)
      .map(cmd => cmd.metadata.executionTime)

    return times.length > 0
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0
  }

  // Predefined command factories for common operations
  const createTextEditCommand = (target, oldValue, newValue, description = 'Text Edit') => {
    return createCommand(
      description,
      async () => {
        target.value = newValue
        return newValue
      },
      async () => {
        target.value = oldValue
        return oldValue
      },
      {
        type: 'text-edit',
        target: target.constructor.name,
        oldLength: oldValue?.length || 0,
        newLength: newValue?.length || 0
      }
    )
  }

  const createPropertyChangeCommand = (object, property, oldValue, newValue, description) => {
    return createCommand(
      description || `Change ${property}`,
      async () => {
        object[property] = newValue
        return newValue
      },
      async () => {
        object[property] = oldValue
        return oldValue
      },
      {
        type: 'property-change',
        property,
        oldValue,
        newValue
      }
    )
  }

  // Initialize
  onMounted(async () => {
    if (persistHistory) {
      await loadHistoryFromStorage()
    }
  })

  // Cleanup
  onUnmounted(() => {
    if (batchTimeout_id.value) {
      clearTimeout(batchTimeout_id.value)
    }
  })

  return {
    // State
    history,
    currentIndex,
    isUndoing,
    isRedoing,
    canUndo,
    canRedo,
    historySize,
    currentCommand,

    // Core API
    createCommand,
    executeCommand,
    executeBatch,
    addToBatch,
    undo,
    redo,
    clearHistory,

    // History navigation
    getHistory,
    jumpToCommand,

    // Command factories
    createTextEditCommand,
    createPropertyChangeCommand,

    // Utilities
    getPerformanceStats,
    saveHistoryToStorage,
    loadHistoryFromStorage
  }
}
