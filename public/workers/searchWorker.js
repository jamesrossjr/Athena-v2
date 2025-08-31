/**
 * Search Worker - High-performance search processing
 * 
 * This worker handles:
 * - Fuzzy search with Fuse.js
 * - Semantic analysis
 * - Result ranking and scoring
 * - Performance optimization
 */

// Import Fuse.js from CDN for worker environment
importScripts('https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js')

// Worker state
let searchInstances = new Map()
let searchCache = new Map()
let performanceMetrics = {
  totalSearches: 0,
  averageTime: 0,
  cacheHits: 0,
  cacheMisses: 0
}

// Fuse.js configuration optimized for performance
const createFuseConfig = (searchMode) => {
  const baseConfig = {
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 1,
    threshold: 0.4,
    shouldSort: true,
    findAllMatches: false, // Performance optimization
    useExtendedSearch: true
  }

  // Mode-specific configurations
  switch (searchMode) {
    case 'fast':
      return {
        ...baseConfig,
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'tags', weight: 0.3 }
        ],
        threshold: 0.5, // Less strict for speed
        minMatchCharLength: 2
      }
    
    case 'comprehensive':
      return {
        ...baseConfig,
        keys: [
          { name: 'title', weight: 0.3 },
          { name: 'description', weight: 0.2 },
          { name: 'tags', weight: 0.2 },
          { name: 'keywords', weight: 0.15 },
          { name: 'category', weight: 0.15 }
        ],
        threshold: 0.3 // More strict for accuracy
      }
    
    default:
      return {
        ...baseConfig,
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'description', weight: 0.3 },
          { name: 'tags', weight: 0.3 }
        ]
      }
  }
}

// Create optimized search index
const createSearchInstance = (items, mode = 'default') => {
  const config = createFuseConfig(mode)
  return new Fuse(items, config)
}

// Advanced caching with TTL and LRU eviction
class SearchCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes TTL
    this.cache = new Map()
    this.accessTimes = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key) {
    const now = Date.now()
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check TTL
    if (now - entry.timestamp > this.ttl) {
      this.delete(key)
      return null
    }
    
    // Update access time for LRU
    this.accessTimes.set(key, now)
    performanceMetrics.cacheHits++
    return entry.data
  }

  set(key, data) {
    const now = Date.now()
    
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      data,
      timestamp: now
    })
    this.accessTimes.set(key, now)
    performanceMetrics.cacheMisses++
  }

  delete(key) {
    this.cache.delete(key)
    this.accessTimes.delete(key)
  }

  evictLRU() {
    let oldestKey = null
    let oldestTime = Date.now()
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  clear() {
    this.cache.clear()
    this.accessTimes.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) || 0
    }
  }
}

// Initialize cache
const cache = new SearchCache()

// Semantic scoring algorithm optimized for Web Worker
const calculateSemanticScore = (query, item) => {
  const queryWords = query.toLowerCase().split(/\s+/)
  let semanticScore = 0
  
  queryWords.forEach(word => {
    // Title matching (highest weight)
    if (item.title?.toLowerCase().includes(word)) {
      semanticScore += 3.0
    }
    
    // Description matching
    if (item.description?.toLowerCase().includes(word)) {
      semanticScore += 2.0
    }
    
    // Tag matching with fuzzy tolerance
    item.tags?.forEach(tag => {
      const tagLower = tag.toLowerCase()
      if (tagLower.includes(word) || word.includes(tagLower)) {
        semanticScore += 1.5
      }
    })
    
    // Keyword matching
    item.keywords?.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      if (keywordLower.includes(word) || word.includes(keywordLower)) {
        semanticScore += 1.0
      }
    })
    
    // Category matching
    if (item.category?.toLowerCase().includes(word)) {
      semanticScore += 0.5
    }
  })
  
  return semanticScore
}

// Advanced result merging and ranking
const mergeAndRankResults = (fuzzyResults, semanticResults, contextBoosts, userPreferences) => {
  const merged = new Map()
  const now = Date.now()
  
  // Add fuzzy results
  fuzzyResults.forEach(result => {
    const confidence = Math.round((1 - (result.score || 0)) * 100)
    merged.set(result.item.id, {
      ...result.item,
      score: result.score || 0,
      confidence,
      matchType: 'fuzzy',
      matches: result.matches,
      relevanceFactors: ['fuzzy-match']
    })
  })
  
  // Merge semantic results
  semanticResults.forEach(result => {
    const existing = merged.get(result.item.id)
    const semanticConfidence = Math.min(100, Math.round(result.score * 15))
    
    if (existing) {
      existing.semanticScore = result.score
      existing.confidence = Math.max(existing.confidence, semanticConfidence)
      existing.relevanceFactors.push('semantic-match')
      existing.score = Math.min(existing.score, 1 - (result.score / 10))
    } else {
      merged.set(result.item.id, {
        ...result.item,
        score: 1 - (result.score / 10),
        confidence: semanticConfidence,
        matchType: 'semantic',
        semanticScore: result.score,
        relevanceFactors: ['semantic-match']
      })
    }
  })
  
  // Apply context and user preference boosts
  merged.forEach((result, id) => {
    // Frequency boost
    const freqItem = userPreferences.frequentCommands?.find(f => f.id === id)
    if (freqItem && freqItem.count > 2) {
      result.score *= 0.7 // Lower score = higher rank
      result.confidence = Math.min(100, result.confidence + 15)
      result.frequent = true
      result.usageCount = freqItem.count
      result.relevanceFactors.push('frequent-use')
    }
    
    // Recency boost
    const recentItem = userPreferences.recentSearches?.find(r => r.result?.id === id)
    if (recentItem && (now - recentItem.timestamp) < 3600000) { // 1 hour
      result.score *= 0.8
      result.confidence = Math.min(100, result.confidence + 10)
      result.recent = true
      result.relevanceFactors.push('recent-use')
    }
    
    // Context boost
    const contextBoost = contextBoosts[id]
    if (contextBoost) {
      result.score *= (1 - contextBoost)
      result.confidence = Math.min(100, result.confidence + Math.round(contextBoost * 20))
      result.contextRelevant = true
      result.relevanceFactors.push('context-relevant')
    }
  })
  
  return Array.from(merged.values())
    .sort((a, b) => {
      // Multi-factor sorting
      if (a.frequent && !b.frequent) return -1
      if (!a.frequent && b.frequent) return 1
      if (a.recent && !b.recent) return -1
      if (!a.recent && b.recent) return 1
      if (a.contextRelevant && !b.contextRelevant) return -1
      if (!a.contextRelevant && b.contextRelevant) return 1
      return (a.score || 0) - (b.score || 0)
    })
}

// Main search function with performance optimizations
const performSearch = (query, items, options = {}) => {
  const startTime = performance.now()
  const {
    mode = 'default',
    maxResults = 20,
    context = 'default',
    userPreferences = {},
    contextBoosts = {},
    useCache = true
  } = options
  
  // Check cache first
  const cacheKey = `${query}-${mode}-${context}-${items.length}`
  if (useCache) {
    const cached = cache.get(cacheKey)
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        searchTime: performance.now() - startTime
      }
    }
  }
  
  // Create or reuse Fuse instance
  const instanceKey = `${mode}-${items.length}`
  if (!searchInstances.has(instanceKey)) {
    searchInstances.set(instanceKey, createSearchInstance(items, mode))
  }
  const fuse = searchInstances.get(instanceKey)
  
  // Perform fuzzy search
  const fuzzyResults = fuse.search(query, { limit: maxResults * 2 })
  
  // Perform semantic search in parallel
  const semanticResults = items
    .map(item => ({
      item,
      score: calculateSemanticScore(query, item)
    }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
  
  // Merge and rank results
  const finalResults = mergeAndRankResults(
    fuzzyResults,
    semanticResults,
    contextBoosts,
    userPreferences
  ).slice(0, maxResults)
  
  const searchTime = performance.now() - startTime
  
  // Update performance metrics
  performanceMetrics.totalSearches++
  performanceMetrics.averageTime = 
    (performanceMetrics.averageTime * (performanceMetrics.totalSearches - 1) + searchTime) / 
    performanceMetrics.totalSearches
  
  const result = {
    results: finalResults,
    searchTime,
    totalResults: finalResults.length,
    queryAnalysis: {
      queryLength: query.length,
      wordCount: query.split(/\s+/).length,
      hasSpecialChars: /[^a-zA-Z0-9\s]/.test(query)
    },
    performance: {
      fuzzyResultCount: fuzzyResults.length,
      semanticResultCount: semanticResults.length,
      cacheUsed: false
    }
  }
  
  // Cache the result
  if (useCache && searchTime > 5) { // Only cache slower searches
    cache.set(cacheKey, result)
  }
  
  return result
}

// Spelling correction with optimized Levenshtein distance
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i] + 1,     // deletion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }
  
  return matrix[b.length][a.length]
}

const getSpellingSuggestions = (query, items, maxSuggestions = 3) => {
  const suggestions = new Set()
  const queryLower = query.toLowerCase()
  
  // Common corrections
  const corrections = {
    'fiel': 'file', 'flie': 'file', 'comand': 'command',
    'serch': 'search', 'creat': 'create', 'delet': 'delete',
    'cancle': 'cancel', 'cahce': 'cache', 'settigns': 'settings'
  }
  
  if (corrections[queryLower]) {
    suggestions.add(corrections[queryLower])
  }
  
  // Find close matches from item titles
  const threshold = Math.max(2, Math.floor(query.length * 0.3))
  items.forEach(item => {
    const distance = levenshteinDistance(queryLower, item.title.toLowerCase())
    if (distance > 0 && distance <= threshold) {
      suggestions.add(item.title.toLowerCase())
    }
  })
  
  return Array.from(suggestions).slice(0, maxSuggestions)
}

// Message handler
self.addEventListener('message', (event) => {
  const { type, data, id } = event.data
  
  try {
    let result
    
    switch (type) {
      case 'search':
        result = performSearch(data.query, data.items, data.options)
        break
        
      case 'spell-check':
        result = getSpellingSuggestions(data.query, data.items, data.maxSuggestions)
        break
        
      case 'clear-cache':
        cache.clear()
        searchInstances.clear()
        result = { success: true }
        break
        
      case 'get-stats':
        result = {
          performance: performanceMetrics,
          cache: cache.getStats(),
          instances: searchInstances.size
        }
        break
        
      case 'warmup':
        // Warmup the worker with sample data
        data.items.forEach((items, index) => {
          const instanceKey = `default-${items.length}`
          if (!searchInstances.has(instanceKey)) {
            searchInstances.set(instanceKey, createSearchInstance(items))
          }
        })
        result = { warmed: searchInstances.size }
        break
        
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
    
    // Send successful response
    self.postMessage({
      type: 'response',
      id,
      success: true,
      data: result
    })
    
  } catch (error) {
    // Send error response
    self.postMessage({
      type: 'response',
      id,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }
})

// Keep the worker alive and responsive
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Handle worker cleanup
self.addEventListener('beforeunload', () => {
  cache.clear()
  searchInstances.clear()
})

console.log('Search Worker initialized and ready')