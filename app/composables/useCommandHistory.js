/**
 * Command History Composable
 *
 * Features:
 * - Comprehensive command tracking and analytics
 * - Search and filter command history
 * - Export/import history data
 * - Command usage statistics
 * - Performance insights
 * - User behavior analysis
 * - Favorites and bookmarks
 * - History visualization data
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useIndexedDBCache } from './useIndexedDBCache'

export const useCommandHistory = (options = {}) => {
  const {
    maxHistorySize = 10000,
    enableAnalytics = true,
    persistHistory = true,
    retentionDays = 30
  } = options

  // State
  const commandHistory = ref([])
  const searchQuery = ref('')
  const filteredHistory = ref([])
  const isLoading = ref(false)
  const analytics = ref({
    totalCommands: 0,
    uniqueCommands: 0,
    favoriteCommands: [],
    usage: {},
    performance: {},
    patterns: []
  })

  // Cache integration
  const {
    isReady: cacheReady,
    get: cacheGet,
    set: cacheSet,
    clear: cacheClear
  } = useIndexedDBCache()

  // Computed properties
  const recentHistory = computed(() => {
    return commandHistory.value.slice(-50).reverse()
  })

  const commandStats = computed(() => {
    const stats = new Map()

    commandHistory.value.forEach((entry) => {
      const key = entry.command.name
      const existing = stats.get(key) || {
        name: key,
        count: 0,
        averageTime: 0,
        totalTime: 0,
        lastUsed: 0,
        context: entry.context,
        success: 0,
        failures: 0
      }

      existing.count++
      existing.totalTime += entry.executionTime || 0
      existing.averageTime = existing.totalTime / existing.count
      existing.lastUsed = Math.max(existing.lastUsed, entry.timestamp)

      if (entry.success) {
        existing.success++
      } else {
        existing.failures++
      }

      stats.set(key, existing)
    })

    return Array.from(stats.values()).sort((a, b) => b.count - a.count)
  })

  const topCommands = computed(() => {
    return commandStats.value.slice(0, 10)
  })

  const searchableHistory = computed(() => {
    if (!searchQuery.value.trim()) {
      return recentHistory.value
    }

    const query = searchQuery.value.toLowerCase()
    return commandHistory.value
      .filter((entry) => {
        return (
          entry.command.name.toLowerCase().includes(query)
          || entry.context.toLowerCase().includes(query)
          || entry.metadata?.description?.toLowerCase().includes(query)
          || entry.metadata?.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      })
      .reverse()
  })

  // Record command execution
  const recordCommand = async (commandData) => {
    const entry = {
      id: generateEntryId(),
      timestamp: Date.now(),
      command: {
        id: commandData.id,
        name: commandData.name,
        type: commandData.type || 'user',
        source: commandData.source || 'unknown'
      },
      context: commandData.context || 'default',
      executionTime: commandData.executionTime || 0,
      success: commandData.success !== false,
      result: commandData.result,
      error: commandData.error,
      metadata: {
        version: '1.0.0',
        userId: getUserId(),
        sessionId: getSessionId(),
        ...commandData.metadata
      },
      performance: {
        memoryBefore: getMemoryUsage(),
        memoryAfter: null,
        cpuTime: commandData.executionTime || 0
      }
    }

    // Add to history
    commandHistory.value.push(entry)

    // Maintain size limit
    if (commandHistory.value.length > maxHistorySize) {
      const removeCount = Math.floor(maxHistorySize * 0.1) // Remove 10%
      commandHistory.value.splice(0, removeCount)
    }

    // Update analytics
    if (enableAnalytics) {
      await updateAnalytics(entry)
    }

    // Persist to cache
    if (persistHistory && cacheReady.value) {
      await persistHistoryEntry(entry)
    }

    return entry
  }

  // Generate unique entry ID
  const generateEntryId = () => {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get user ID (simplified)
  const getUserId = () => {
    return 'user_' + (localStorage.getItem('user-id') || 'anonymous')
  }

  // Get session ID
  const getSessionId = () => {
    if (!window.sessionId) {
      window.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
    return window.sessionId
  }

  // Get memory usage
  const getMemoryUsage = () => {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  // Update analytics
  const updateAnalytics = async (entry) => {
    const commandName = entry.command.name

    // Update usage statistics
    if (!analytics.value.usage[commandName]) {
      analytics.value.usage[commandName] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        lastUsed: 0,
        contexts: new Set(),
        success: 0,
        failures: 0
      }
    }

    const usage = analytics.value.usage[commandName]
    usage.count++
    usage.totalTime += entry.executionTime
    usage.averageTime = usage.totalTime / usage.count
    usage.lastUsed = entry.timestamp
    usage.contexts.add(entry.context)

    if (entry.success) {
      usage.success++
    } else {
      usage.failures++
    }

    // Update totals
    analytics.value.totalCommands++
    analytics.value.uniqueCommands = Object.keys(analytics.value.usage).length

    // Update favorite commands (top 10 most used)
    analytics.value.favoriteCommands = Object.entries(analytics.value.usage)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data, contexts: Array.from(data.contexts) }))

    // Detect usage patterns
    await detectUsagePatterns()
  }

  // Detect usage patterns
  const detectUsagePatterns = async () => {
    const patterns = []
    const recentCommands = commandHistory.value.slice(-100)

    // Sequence pattern detection
    const sequences = findCommandSequences(recentCommands)
    patterns.push(...sequences.map(seq => ({
      type: 'sequence',
      pattern: seq.commands,
      frequency: seq.count,
      confidence: seq.confidence,
      description: `Users often run ${seq.commands.join(' → ')} in sequence`
    })))

    // Time-based patterns
    const timePatterns = findTimeBasedPatterns(recentCommands)
    patterns.push(...timePatterns.map(pattern => ({
      type: 'temporal',
      pattern: pattern.commands,
      timeWindow: pattern.timeWindow,
      frequency: pattern.frequency,
      description: `${pattern.commands.join(', ')} are often used during ${pattern.timeWindow}`
    })))

    // Context patterns
    const contextPatterns = findContextPatterns(recentCommands)
    patterns.push(...contextPatterns.map(pattern => ({
      type: 'contextual',
      context: pattern.context,
      commands: pattern.commands,
      frequency: pattern.frequency,
      description: `In ${pattern.context} context, users frequently use ${pattern.commands.join(', ')}`
    })))

    analytics.value.patterns = patterns.slice(0, 20) // Keep top 20 patterns
  }

  // Find command sequences
  const findCommandSequences = (commands) => {
    const sequences = new Map()
    const windowSize = 3

    for (let i = 0; i <= commands.length - windowSize; i++) {
      const sequence = commands.slice(i, i + windowSize)
        .map(cmd => cmd.command.name)
        .join(' → ')

      sequences.set(sequence, (sequences.get(sequence) || 0) + 1)
    }

    return Array.from(sequences.entries())
      .filter(([, count]) => count >= 3)
      .map(([sequence, count]) => ({
        commands: sequence.split(' → '),
        count,
        confidence: Math.min(count / 10, 1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  // Find time-based patterns
  const findTimeBasedPatterns = (commands) => {
    const timeWindows = {
      morning: [6, 12],
      afternoon: [12, 18],
      evening: [18, 24],
      night: [0, 6]
    }

    const patterns = []

    Object.entries(timeWindows).forEach(([window, [start, end]]) => {
      const windowCommands = commands.filter((cmd) => {
        const hour = new Date(cmd.timestamp).getHours()
        return hour >= start && hour < end
      })

      if (windowCommands.length >= 5) {
        const commandCounts = new Map()
        windowCommands.forEach((cmd) => {
          commandCounts.set(cmd.command.name, (commandCounts.get(cmd.command.name) || 0) + 1)
        })

        const topCommands = Array.from(commandCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .filter(([, count]) => count >= 2)

        if (topCommands.length > 0) {
          patterns.push({
            timeWindow: window,
            commands: topCommands.map(([name]) => name),
            frequency: topCommands[0][1],
            totalCommands: windowCommands.length
          })
        }
      }
    })

    return patterns
  }

  // Find context patterns
  const findContextPatterns = (commands) => {
    const contextGroups = new Map()

    commands.forEach((cmd) => {
      const context = cmd.context
      if (!contextGroups.has(context)) {
        contextGroups.set(context, [])
      }
      contextGroups.get(context).push(cmd.command.name)
    })

    const patterns = []

    contextGroups.forEach((commands, context) => {
      if (commands.length >= 5) {
        const commandCounts = new Map()
        commands.forEach((cmd) => {
          commandCounts.set(cmd, (commandCounts.get(cmd) || 0) + 1)
        })

        const topCommands = Array.from(commandCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .filter(([, count]) => count >= 2)

        if (topCommands.length > 0) {
          patterns.push({
            context,
            commands: topCommands.map(([name]) => name),
            frequency: topCommands[0][1],
            totalCommands: commands.length
          })
        }
      }
    })

    return patterns
  }

  // Search history
  const searchHistory = (query, filters = {}) => {
    searchQuery.value = query

    let results = searchableHistory.value

    // Apply filters
    if (filters.dateFrom) {
      results = results.filter(entry => entry.timestamp >= filters.dateFrom)
    }

    if (filters.dateTo) {
      results = results.filter(entry => entry.timestamp <= filters.dateTo)
    }

    if (filters.context) {
      results = results.filter(entry => entry.context === filters.context)
    }

    if (filters.success !== undefined) {
      results = results.filter(entry => entry.success === filters.success)
    }

    if (filters.commandType) {
      results = results.filter(entry => entry.command.type === filters.commandType)
    }

    filteredHistory.value = results
    return results
  }

  // Clear search
  const clearSearch = () => {
    searchQuery.value = ''
    filteredHistory.value = []
  }

  // Export history
  const exportHistory = (format = 'json', filters = {}) => {
    let data = commandHistory.value

    // Apply filters if provided
    if (Object.keys(filters).length > 0) {
      data = data.filter((entry) => {
        return Object.entries(filters).every(([key, value]) => {
          switch (key) {
            case 'dateFrom':
              return entry.timestamp >= value
            case 'dateTo':
              return entry.timestamp <= value
            case 'context':
              return entry.context === value
            case 'success':
              return entry.success === value
            default:
              return true
          }
        })
      })
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      totalEntries: data.length,
      analytics: analytics.value,
      history: data
    }

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2)
      case 'csv':
        return convertToCSV(data)
      case 'summary':
        return generateSummaryReport(data)
      default:
        return exportData
    }
  }

  // Convert to CSV format
  const convertToCSV = (data) => {
    const headers = [
      'Timestamp',
      'Command Name',
      'Context',
      'Execution Time',
      'Success',
      'Source'
    ]

    const rows = data.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.command.name,
      entry.context,
      entry.executionTime,
      entry.success,
      entry.command.source
    ])

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
  }

  // Generate summary report
  const generateSummaryReport = (data) => {
    const report = {
      summary: {
        totalCommands: data.length,
        timeSpan: {
          from: new Date(Math.min(...data.map(e => e.timestamp))).toISOString(),
          to: new Date(Math.max(...data.map(e => e.timestamp))).toISOString()
        },
        successRate: (data.filter(e => e.success).length / data.length * 100).toFixed(2) + '%',
        averageExecutionTime: (data.reduce((sum, e) => sum + e.executionTime, 0) / data.length).toFixed(2) + 'ms'
      },
      topCommands: commandStats.value.slice(0, 10),
      contexts: Array.from(new Set(data.map(e => e.context))),
      patterns: analytics.value.patterns.slice(0, 5)
    }

    return JSON.stringify(report, null, 2)
  }

  // Import history
  const importHistory = async (data, merge = true) => {
    try {
      const imported = typeof data === 'string' ? JSON.parse(data) : data

      if (!imported.history || !Array.isArray(imported.history)) {
        throw new Error('Invalid history data format')
      }

      if (merge) {
        // Merge with existing history, avoiding duplicates
        const existingIds = new Set(commandHistory.value.map(e => e.id))
        const newEntries = imported.history.filter(e => !existingIds.has(e.id))
        commandHistory.value.push(...newEntries)

        // Sort by timestamp
        commandHistory.value.sort((a, b) => a.timestamp - b.timestamp)
      } else {
        commandHistory.value = imported.history
      }

      // Update analytics
      if (imported.analytics && enableAnalytics) {
        analytics.value = { ...analytics.value, ...imported.analytics }
      }

      // Persist if enabled
      if (persistHistory && cacheReady.value) {
        await persistFullHistory()
      }

      return true
    } catch (error) {
      console.error('Failed to import history:', error)
      return false
    }
  }

  // Clear history
  const clearHistory = async (olderThan = null) => {
    if (olderThan) {
      commandHistory.value = commandHistory.value.filter(
        entry => entry.timestamp > olderThan
      )
    } else {
      commandHistory.value = []
      analytics.value = {
        totalCommands: 0,
        uniqueCommands: 0,
        favoriteCommands: [],
        usage: {},
        performance: {},
        patterns: []
      }
    }

    if (persistHistory && cacheReady.value) {
      await clearPersistedHistory()
    }
  }

  // Persist single history entry
  const persistHistoryEntry = async (entry) => {
    if (!cacheReady.value) return

    try {
      await cacheSet('commandHistory', entry.id, entry)
    } catch (error) {
      console.warn('Failed to persist history entry:', error)
    }
  }

  // Persist full history
  const persistFullHistory = async () => {
    if (!cacheReady.value) return

    try {
      const historyData = {
        entries: commandHistory.value,
        analytics: analytics.value,
        lastUpdated: Date.now()
      }

      await cacheSet('commandHistory', 'full-history', historyData)
    } catch (error) {
      console.warn('Failed to persist full history:', error)
    }
  }

  // Load persisted history
  const loadPersistedHistory = async () => {
    if (!cacheReady.value) return

    try {
      const historyData = await cacheGet('commandHistory', 'full-history')

      if (historyData && historyData.entries) {
        commandHistory.value = historyData.entries

        if (historyData.analytics && enableAnalytics) {
          analytics.value = historyData.analytics
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted history:', error)
    }
  }

  // Clear persisted history
  const clearPersistedHistory = async () => {
    if (!cacheReady.value) return

    try {
      await cacheClear('commandHistory')
    } catch (error) {
      console.warn('Failed to clear persisted history:', error)
    }
  }

  // Get history for visualization
  const getVisualizationData = (period = '7d') => {
    const now = Date.now()
    let timeRange

    switch (period) {
      case '1d':
        timeRange = 24 * 60 * 60 * 1000
        break
      case '7d':
        timeRange = 7 * 24 * 60 * 60 * 1000
        break
      case '30d':
        timeRange = 30 * 24 * 60 * 60 * 1000
        break
      default:
        timeRange = 7 * 24 * 60 * 60 * 1000
    }

    const filteredData = commandHistory.value.filter(
      entry => entry.timestamp > (now - timeRange)
    )

    return {
      timeline: generateTimelineData(filteredData, period),
      commandDistribution: generateCommandDistribution(filteredData),
      contextUsage: generateContextUsage(filteredData),
      performanceMetrics: generatePerformanceMetrics(filteredData),
      successRate: generateSuccessRate(filteredData)
    }
  }

  const generateTimelineData = (data, period) => {
    const intervals = period === '1d' ? 24 : period === '7d' ? 7 : 30
    const intervalSize = period === '1d' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    const timeline = Array(intervals).fill(0).map((_, i) => ({
      timestamp: Date.now() - (intervals - 1 - i) * intervalSize,
      count: 0,
      commands: []
    }))

    data.forEach((entry) => {
      const intervalIndex = Math.floor(
        (Date.now() - entry.timestamp) / intervalSize
      )
      const index = intervals - 1 - intervalIndex

      if (index >= 0 && index < intervals) {
        timeline[index].count++
        timeline[index].commands.push(entry.command.name)
      }
    })

    return timeline
  }

  const generateCommandDistribution = (data) => {
    const distribution = new Map()

    data.forEach((entry) => {
      const name = entry.command.name
      distribution.set(name, (distribution.get(name) || 0) + 1)
    })

    return Array.from(distribution.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  const generateContextUsage = (data) => {
    const usage = new Map()

    data.forEach((entry) => {
      const context = entry.context
      usage.set(context, (usage.get(context) || 0) + 1)
    })

    return Array.from(usage.entries())
      .map(([context, count]) => ({ context, count }))
      .sort((a, b) => b.count - a.count)
  }

  const generatePerformanceMetrics = (data) => {
    const times = data.map(e => e.executionTime).filter(t => t > 0)

    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length || 0,
      minTime: Math.min(...times) || 0,
      maxTime: Math.max(...times) || 0,
      medianTime: times.sort()[Math.floor(times.length / 2)] || 0
    }
  }

  const generateSuccessRate = (data) => {
    const successful = data.filter(e => e.success).length
    return data.length > 0 ? (successful / data.length) * 100 : 0
  }

  // Initialize
  onMounted(async () => {
    isLoading.value = true

    if (persistHistory) {
      await loadPersistedHistory()
    }

    isLoading.value = false
  })

  // Auto-save on changes
  watch(
    () => commandHistory.value.length,
    async () => {
      if (persistHistory && cacheReady.value) {
        await persistFullHistory()
      }
    }
  )

  // Cleanup old entries periodically
  const cleanupOldEntries = () => {
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
    const initialLength = commandHistory.value.length

    commandHistory.value = commandHistory.value.filter(
      entry => entry.timestamp > cutoff
    )

    const removed = initialLength - commandHistory.value.length
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old history entries`)
    }
  }

  // Cleanup interval
  onMounted(() => {
    const cleanupInterval = setInterval(cleanupOldEntries, 60 * 60 * 1000) // Every hour

    onUnmounted(() => {
      clearInterval(cleanupInterval)
    })
  })

  return {
    // State
    commandHistory,
    searchQuery,
    filteredHistory,
    isLoading,
    analytics,

    // Computed
    recentHistory,
    commandStats,
    topCommands,
    searchableHistory,

    // Core API
    recordCommand,
    searchHistory,
    clearSearch,
    clearHistory,

    // Import/Export
    exportHistory,
    importHistory,

    // Visualization
    getVisualizationData,

    // Utilities
    cleanupOldEntries
  }
}
