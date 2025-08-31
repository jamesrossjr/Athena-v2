// Command Intelligence Composable
// Provides fuzzy search, semantic matching, contextual suggestions, and command prediction

import { ref } from 'vue'
import Fuse from 'fuse.js'

export const useCommandIntelligence = () => {
  // User behavior tracking
  const userPreferences = ref({
    frequentCommands: [],
    recentSearches: [],
    contextualHistory: new Map(),
    commandPatterns: new Map(),
    sessionData: {
      startTime: Date.now(),
      commandCount: 0,
      successRate: 1.0
    }
  })

  // Fuzzy search configuration
  const fuseOptions = {
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'description', weight: 0.2 },
      { name: 'tags', weight: 0.2 },
      { name: 'keywords', weight: 0.15 },
      { name: 'category', weight: 0.15 }
    ],
    threshold: 0.4, // Typo tolerance
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: true,
    useExtendedSearch: true
  }

  // Create Fuse instance for fuzzy search
  const createFuseInstance = (items) => {
    return new Fuse(items, fuseOptions)
  }

  // Perform intelligent search with fuzzy matching and predictions
  const performIntelligentSearch = (query, items, context = 'default') => {
    const startTime = performance.now()

    if (!query?.trim()) {
      return {
        results: getContextualSuggestions(items, context),
        searchTime: 0,
        searchType: 'contextual'
      }
    }

    // Create Fuse instance
    const fuse = createFuseInstance(items)

    // Fuzzy search
    const fuseResults = fuse.search(query)

    // Semantic enhancement
    const semanticResults = performSemanticSearch(query, items)

    // Command predictions based on patterns
    const predictions = predictNextCommand(query, context)

    // Merge and rank results
    const merged = mergeSearchResults(fuseResults, semanticResults, predictions, items)

    const searchTime = Math.round(performance.now() - startTime)

    return {
      results: merged,
      searchTime,
      searchType: 'intelligent'
    }
  }

  // Semantic search simulation (would use actual embeddings in production)
  const performSemanticSearch = (query, items) => {
    const queryWords = query.toLowerCase().split(/\s+/)
    const results = []

    items.forEach((item) => {
      let semanticScore = 0
      let matchedTerms = []

      queryWords.forEach((word) => {
        // Check title
        if (item.title?.toLowerCase().includes(word)) {
          semanticScore += 1.0
          matchedTerms.push({ field: 'title', term: word })
        }

        // Check description
        if (item.description?.toLowerCase().includes(word)) {
          semanticScore += 0.7
          matchedTerms.push({ field: 'description', term: word })
        }

        // Check tags
        item.tags?.forEach((tag) => {
          if (tag.toLowerCase().includes(word) || word.includes(tag.toLowerCase())) {
            semanticScore += 0.5
            matchedTerms.push({ field: 'tag', term: tag })
          }
        })

        // Check keywords
        item.keywords?.forEach((keyword) => {
          if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
            semanticScore += 0.3
            matchedTerms.push({ field: 'keyword', term: keyword })
          }
        })

        // Synonym matching (simple example)
        const synonyms = getSynonyms(word)
        synonyms.forEach((synonym) => {
          if (item.title?.toLowerCase().includes(synonym)
            || item.description?.toLowerCase().includes(synonym)) {
            semanticScore += 0.4
            matchedTerms.push({ field: 'synonym', term: synonym })
          }
        })
      })

      if (semanticScore > 0) {
        results.push({
          item,
          score: semanticScore,
          matchedTerms,
          matchType: 'semantic'
        })
      }
    })

    return results.sort((a, b) => b.score - a.score)
  }

  // Get synonyms for a word (simplified - would use a proper thesaurus in production)
  const getSynonyms = (word) => {
    const synonymMap = {
      create: ['new', 'add', 'make', 'generate'],
      delete: ['remove', 'trash', 'clear', 'erase'],
      edit: ['modify', 'change', 'update', 'alter'],
      open: ['launch', 'start', 'begin', 'show'],
      close: ['exit', 'quit', 'stop', 'end'],
      search: ['find', 'locate', 'lookup', 'query'],
      file: ['document', 'doc', 'page', 'item'],
      folder: ['directory', 'dir', 'container'],
      save: ['store', 'keep', 'persist', 'write']
    }

    return synonymMap[word.toLowerCase()] || []
  }

  // Merge search results from different sources
  const mergeSearchResults = (fuzzyResults, semanticResults, predictions, allItems) => {
    const merged = new Map()

    // Add fuzzy results
    fuzzyResults.forEach((result) => {
      merged.set(result.item.id, {
        ...result.item,
        score: result.score || 0,
        matchType: 'fuzzy',
        confidence: Math.round((1 - (result.score || 0)) * 100)
      })
    })

    // Add/merge semantic results
    semanticResults.forEach((result) => {
      const existing = merged.get(result.item.id)
      if (existing) {
        existing.semanticScore = result.score
        existing.matchedTerms = result.matchedTerms
        existing.confidence = Math.max(existing.confidence, Math.round(result.score * 20))
      } else {
        merged.set(result.item.id, {
          ...result.item,
          score: 1 - (result.score / 10), // Normalize semantic score
          semanticScore: result.score,
          matchType: 'semantic',
          matchedTerms: result.matchedTerms,
          confidence: Math.round(result.score * 20)
        })
      }
    })

    // Boost predicted items
    predictions.forEach((pred) => {
      const existing = merged.get(pred.id)
      if (existing) {
        existing.score *= 0.7 // Boost score
        existing.predicted = true
        existing.confidence = Math.min(100, existing.confidence + 20)
      } else {
        // Add predicted item if not in results
        const item = allItems.find(i => i.id === pred.id)
        if (item) {
          merged.set(pred.id, {
            ...item,
            score: 0.5,
            matchType: 'predicted',
            predicted: true,
            confidence: 60
          })
        }
      }
    })

    // Boost frequently used items
    userPreferences.value.frequentCommands.forEach((freq) => {
      const existing = merged.get(freq.id)
      if (existing && freq.count > 3) {
        existing.score *= 0.8
        existing.frequent = true
        existing.usageCount = freq.count
        existing.confidence = Math.min(100, existing.confidence + 10)
      }
    })

    return Array.from(merged.values())
      .sort((a, b) => {
        // Sort by multiple factors
        if (a.predicted && !b.predicted) return -1
        if (!a.predicted && b.predicted) return 1
        if (a.frequent && !b.frequent) return -1
        if (!a.frequent && b.frequent) return 1
        return (a.score || 0) - (b.score || 0)
      })
      .slice(0, 20) // Limit results
  }

  // Get contextual suggestions based on user behavior and context
  const getContextualSuggestions = (items, context) => {
    const suggestions = []
    const seen = new Set()

    // Get frequent commands for this context
    const frequent = userPreferences.value.frequentCommands
      .filter(cmd => cmd.count > 2)
      .slice(0, 3)

    // Get recent items from context history
    const contextHistory = userPreferences.value.contextualHistory.get(context) || []
    const recent = contextHistory.slice(0, 2)

    // Combine frequent and recent
    ;[...frequent, ...recent].forEach((item) => {
      if (!seen.has(item.id)) {
        const fullItem = items.find(i => i.id === item.id) || item
        suggestions.push({
          ...fullItem,
          suggested: true,
          reason: item.count ? `Used ${item.count} times` : 'Recently used'
        })
        seen.add(item.id)
      }
    })

    // Add smart time-based suggestions
    const hour = new Date().getHours()
    const day = new Date().getDay()

    if (hour < 12 && !seen.has('morning-dashboard')) {
      suggestions.push({
        id: 'morning-dashboard',
        title: 'Daily Dashboard',
        description: 'View your daily overview',
        icon: '📊',
        suggested: true,
        timeBased: true,
        reason: 'Morning suggestion'
      })
    }

    if (day === 1 && !seen.has('weekly-review')) { // Monday
      suggestions.push({
        id: 'weekly-review',
        title: 'Weekly Review',
        description: 'Review last week\'s progress',
        icon: '📅',
        suggested: true,
        timeBased: true,
        reason: 'Monday suggestion'
      })
    }

    // Fill with popular items if needed
    if (suggestions.length < 5) {
      const popular = items
        .filter(item => !seen.has(item.id))
        .slice(0, 5 - suggestions.length)

      popular.forEach((item) => {
        suggestions.push({ ...item, suggested: true, reason: 'Popular' })
      })
    }

    return suggestions.slice(0, 5)
  }

  // Predict next command based on patterns
  const predictNextCommand = (query, context) => {
    const patterns = userPreferences.value.commandPatterns.get(context) || []
    const predictions = []
    const seen = new Set()

    // Find patterns matching the query
    patterns.forEach((pattern) => {
      if (pattern.query.toLowerCase().startsWith(query.toLowerCase())
        && !seen.has(pattern.result.id)) {
        predictions.push({
          ...pattern.result,
          patternMatch: true,
          lastUsed: pattern.timestamp
        })
        seen.add(pattern.result.id)
      }
    })

    // Sort by recency
    predictions.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))

    return predictions.slice(0, 3)
  }

  // Learn from user actions
  const learnFromAction = (item, query, context = 'default') => {
    // Update frequency count
    const existing = userPreferences.value.frequentCommands.find(cmd => cmd.id === item.id)
    if (existing) {
      existing.count = (existing.count || 0) + 1
      existing.lastUsed = Date.now()
    } else {
      userPreferences.value.frequentCommands.push({
        ...item,
        count: 1,
        lastUsed: Date.now()
      })
    }

    // Sort by frequency and recency
    userPreferences.value.frequentCommands.sort((a, b) => {
      const scoreA = a.count + (a.lastUsed ? 1 / (Date.now() - a.lastUsed) * 1000000 : 0)
      const scoreB = b.count + (b.lastUsed ? 1 / (Date.now() - b.lastUsed) * 1000000 : 0)
      return scoreB - scoreA
    })

    // Keep only top items
    userPreferences.value.frequentCommands = userPreferences.value.frequentCommands.slice(0, 50)

    // Update contextual history
    const history = userPreferences.value.contextualHistory.get(context) || []
    history.unshift(item)
    userPreferences.value.contextualHistory.set(context, history.slice(0, 30))

    // Record command pattern if query provided
    if (query) {
      const patterns = userPreferences.value.commandPatterns.get(context) || []
      patterns.push({
        query: query.toLowerCase(),
        result: item,
        timestamp: Date.now()
      })
      userPreferences.value.commandPatterns.set(context, patterns.slice(-100))

      // Update recent searches
      userPreferences.value.recentSearches.unshift({
        query,
        result: item,
        timestamp: Date.now(),
        context
      })
      userPreferences.value.recentSearches = userPreferences.value.recentSearches.slice(0, 20)
    }

    // Update session data
    userPreferences.value.sessionData.commandCount++

    savePreferences()
  }

  // Get spelling suggestions
  const getSpellingSuggestions = (query, items) => {
    const suggestions = []

    // Common misspellings
    const corrections = {
      fiel: 'file',
      flie: 'file',
      comand: 'command',
      serch: 'search',
      creat: 'create',
      delet: 'delete',
      cancle: 'cancel',
      cahce: 'cache',
      settigns: 'settings'
    }

    const lower = query.toLowerCase()
    if (corrections[lower]) {
      suggestions.push(corrections[lower])
    }

    // Use Levenshtein distance for close matches
    const threshold = 2
    items.forEach((item) => {
      const titleDist = levenshteinDistance(lower, item.title.toLowerCase())
      if (titleDist > 0 && titleDist <= threshold) {
        suggestions.push(item.title.toLowerCase())
      }
    })

    return [...new Set(suggestions)].slice(0, 3)
  }

  // Levenshtein distance calculation
  const levenshteinDistance = (a, b) => {
    const matrix = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  // Save preferences to localStorage
  const savePreferences = () => {
    try {
      const toSave = {
        frequentCommands: userPreferences.value.frequentCommands.slice(0, 50),
        recentSearches: userPreferences.value.recentSearches.slice(0, 20),
        contextualHistory: Object.fromEntries(
          Array.from(userPreferences.value.contextualHistory.entries()).slice(0, 10)
        ),
        commandPatterns: Object.fromEntries(
          Array.from(userPreferences.value.commandPatterns.entries()).slice(0, 10)
        ),
        sessionData: userPreferences.value.sessionData
      }
      localStorage.setItem('command-intelligence', JSON.stringify(toSave))
    } catch (error) {
      console.warn('Failed to save command intelligence:', error)
    }
  }

  // Load preferences from localStorage
  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem('command-intelligence')
      if (stored) {
        const parsed = JSON.parse(stored)
        userPreferences.value = {
          frequentCommands: parsed.frequentCommands || [],
          recentSearches: parsed.recentSearches || [],
          contextualHistory: new Map(Object.entries(parsed.contextualHistory || {})),
          commandPatterns: new Map(Object.entries(parsed.commandPatterns || {})),
          sessionData: parsed.sessionData || {
            startTime: Date.now(),
            commandCount: 0,
            successRate: 1.0
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load command intelligence:', error)
    }
  }

  // Get intelligence stats
  const getIntelligenceStats = () => {
    return {
      totalCommands: userPreferences.value.frequentCommands.reduce((sum, cmd) => sum + cmd.count, 0),
      uniqueCommands: userPreferences.value.frequentCommands.length,
      recentSearches: userPreferences.value.recentSearches.length,
      contextsTracked: userPreferences.value.contextualHistory.size,
      patternsLearned: Array.from(userPreferences.value.commandPatterns.values()).flat().length,
      sessionCommands: userPreferences.value.sessionData.commandCount,
      sessionDuration: Date.now() - userPreferences.value.sessionData.startTime
    }
  }

  // Reset intelligence data
  const resetIntelligence = () => {
    userPreferences.value = {
      frequentCommands: [],
      recentSearches: [],
      contextualHistory: new Map(),
      commandPatterns: new Map(),
      sessionData: {
        startTime: Date.now(),
        commandCount: 0,
        successRate: 1.0
      }
    }
    savePreferences()
  }

  return {
    performIntelligentSearch,
    learnFromAction,
    getContextualSuggestions,
    predictNextCommand,
    getSpellingSuggestions,
    savePreferences,
    loadPreferences,
    getIntelligenceStats,
    resetIntelligence,
    userPreferences
  }
}
