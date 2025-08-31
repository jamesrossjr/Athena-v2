/**
 * IndexedDB Cache Composable
 *
 * High-performance caching layer with:
 * - Structured storage for search results and user data
 * - TTL-based expiration
 * - Compression for large datasets
 * - Background cleanup
 * - Transaction management
 */

import { ref, onUnmounted } from 'vue'

export const useIndexedDBCache = () => {
  const isSupported = ref(typeof window !== 'undefined' && 'indexedDB' in window)
  const isReady = ref(false)
  const error = ref(null)

  let db = null
  let cleanupInterval = null

  // Database configuration
  const DB_NAME = 'CommandCenterCache'
  const DB_VERSION = 1
  const STORES = {
    searchResults: {
      name: 'searchResults',
      keyPath: 'key',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'context', keyPath: 'context' },
        { name: 'query', keyPath: 'query' }
      ]
    },
    userPreferences: {
      name: 'userPreferences',
      keyPath: 'key',
      indexes: [
        { name: 'timestamp', keyPath: 'lastModified' }
      ]
    },
    itemMetadata: {
      name: 'itemMetadata',
      keyPath: 'id',
      indexes: [
        { name: 'type', keyPath: 'type' },
        { name: 'frequency', keyPath: 'frequency' },
        { name: 'lastUsed', keyPath: 'lastUsed' }
      ]
    },
    searchStats: {
      name: 'searchStats',
      keyPath: 'date',
      indexes: [
        { name: 'searchCount', keyPath: 'searchCount' }
      ]
    }
  }

  // TTL settings (in milliseconds)
  const TTL = {
    searchResults: 300000, // 5 minutes
    userPreferences: 2592000000, // 30 days
    itemMetadata: 604800000, // 7 days
    searchStats: 2592000000 // 30 days
  }

  // Initialize IndexedDB
  const initDB = () => {
    return new Promise((resolve, reject) => {
      if (!isSupported.value) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        error.value = request.error
        reject(request.error)
      }

      request.onsuccess = (event) => {
        db = event.target.result
        isReady.value = true

        // Set up periodic cleanup
        cleanupInterval = setInterval(cleanupExpiredEntries, 60000) // Every minute

        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        const database = event.target.result

        // Create object stores
        Object.values(STORES).forEach((store) => {
          if (!database.objectStoreNames.contains(store.name)) {
            const objectStore = database.createObjectStore(store.name, {
              keyPath: store.keyPath
            })

            // Create indexes
            store.indexes.forEach((index) => {
              objectStore.createIndex(index.name, index.keyPath, {
                unique: false
              })
            })
          }
        })
      }
    })
  }

  // Generic get operation with TTL check
  const get = async (storeName, key) => {
    if (!db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result

        if (!result) {
          resolve(null)
          return
        }

        // Check TTL
        const now = Date.now()
        const ttl = TTL[storeName] || TTL.searchResults

        if (result.timestamp && (now - result.timestamp) > ttl) {
          // Entry expired, delete it
          deleteEntry(storeName, key)
          resolve(null)
          return
        }

        resolve(result)
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Generic set operation with compression for large data
  const set = async (storeName, key, data, metadata = {}) => {
    if (!db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const now = Date.now()
      const entry = {
        key,
        data: shouldCompress(data) ? compress(data) : data,
        compressed: shouldCompress(data),
        timestamp: now,
        size: getDataSize(data),
        ...metadata
      }

      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(entry)

      request.onsuccess = () => resolve(entry)
      request.onerror = () => reject(request.error)
    })
  }

  // Delete entry
  const deleteEntry = async (storeName, key) => {
    if (!db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  }

  // Search-specific operations
  const cacheSearchResult = async (query, context, results, searchTime) => {
    const key = `${query}-${context}-${Date.now()}`

    return set('searchResults', key, {
      query,
      context,
      results,
      searchTime,
      resultCount: results.length
    })
  }

  const getCachedSearchResult = async (query, context) => {
    // Look for recent results matching this query and context
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['searchResults'], 'readonly')
      const store = transaction.objectStore('searchResults')
      const index = store.index('query')
      const request = index.getAll(query)

      request.onsuccess = () => {
        const results = request.result
          .filter(result =>
            result.context === context
            && (Date.now() - result.timestamp) < TTL.searchResults
          )
          .sort((a, b) => b.timestamp - a.timestamp)

        resolve(results[0] || null)
      }

      request.onerror = () => reject(request.error)
    })
  }

  // User preferences operations
  const saveUserPreferences = async (preferences) => {
    return set('userPreferences', 'main', preferences, {
      lastModified: Date.now()
    })
  }

  const getUserPreferences = async () => {
    const result = await get('userPreferences', 'main')
    return result?.data || null
  }

  // Item metadata operations
  const updateItemMetadata = async (itemId, metadata) => {
    const existing = await get('itemMetadata', itemId)
    const updated = {
      id: itemId,
      frequency: (existing?.frequency || 0) + (metadata.frequency || 1),
      lastUsed: Date.now(),
      totalUses: (existing?.totalUses || 0) + 1,
      ...metadata
    }

    return set('itemMetadata', itemId, updated)
  }

  const getItemMetadata = async (itemId) => {
    return get('itemMetadata', itemId)
  }

  const getFrequentItems = async (limit = 10) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['itemMetadata'], 'readonly')
      const store = transaction.objectStore('itemMetadata')
      const index = store.index('frequency')
      const request = index.openCursor(null, 'prev')

      const results = []
      let count = 0

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor && count < limit) {
          results.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Search statistics
  const recordSearchStats = async (searchTime, resultCount, cacheHit = false) => {
    const today = new Date().toDateString()
    const existing = await get('searchStats', today)

    const stats = existing?.data || {
      date: today,
      searchCount: 0,
      totalSearchTime: 0,
      averageSearchTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResults: 0
    }

    stats.searchCount++
    stats.totalSearchTime += searchTime
    stats.averageSearchTime = stats.totalSearchTime / stats.searchCount
    stats.totalResults += resultCount

    if (cacheHit) {
      stats.cacheHits++
    } else {
      stats.cacheMisses++
    }

    return set('searchStats', today, stats)
  }

  const getSearchStats = async (days = 7) => {
    const results = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateString = date.toDateString()

      const stats = await get('searchStats', dateString)
      if (stats) {
        results.push(stats.data)
      }
    }

    return results
  }

  // Utility functions
  const shouldCompress = (data) => {
    const size = getDataSize(data)
    return size > 10000 // Compress if larger than 10KB
  }

  const compress = (data) => {
    // Simple JSON string compression (in production, use a proper compression library)
    try {
      return {
        compressed: true,
        data: JSON.stringify(data)
      }
    } catch {
      return data
    }
  }

  const getDataSize = (data) => {
    return new Blob([JSON.stringify(data)]).size
  }

  // Cleanup expired entries
  const cleanupExpiredEntries = async () => {
    if (!db) return

    const now = Date.now()

    // Cleanup each store
    for (const [storeName, store] of Object.entries(STORES)) {
      try {
        const transaction = db.transaction([store.name], 'readwrite')
        const objectStore = transaction.objectStore(store.name)
        const index = objectStore.index('timestamp')
        const ttl = TTL[storeName] || TTL.searchResults

        const cutoffTime = now - ttl
        const range = IDBKeyRange.upperBound(cutoffTime)
        const request = index.openCursor(range)

        request.onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }
      } catch (error) {
        console.warn(`Cleanup failed for store ${storeName}:`, error)
      }
    }
  }

  // Get storage usage statistics
  const getStorageStats = async () => {
    if (!db) return null

    const stats = {}

    for (const store of Object.values(STORES)) {
      try {
        const count = await new Promise((resolve, reject) => {
          const transaction = db.transaction([store.name], 'readonly')
          const objectStore = transaction.objectStore(store.name)
          const request = objectStore.count()

          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })

        stats[store.name] = { count }
      } catch (error) {
        stats[store.name] = { count: 0, error: error.message }
      }
    }

    return stats
  }

  // Clear all data
  const clearAll = async () => {
    if (!db) return

    const promises = Object.values(STORES).map((store) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([store.name], 'readwrite')
        const objectStore = transaction.objectStore(store.name)
        const request = objectStore.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    })

    return Promise.all(promises)
  }

  // Initialize on composable creation
  if (isSupported.value && typeof window !== 'undefined') {
    initDB().catch((err) => {
      console.error('Failed to initialize IndexedDB:', err)
      error.value = err
    })
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }

    if (db) {
      db.close()
    }
  })

  return {
    isSupported,
    isReady,
    error,

    // Generic operations
    get,
    set,
    deleteEntry,

    // Search operations
    cacheSearchResult,
    getCachedSearchResult,

    // User preferences
    saveUserPreferences,
    getUserPreferences,

    // Item metadata
    updateItemMetadata,
    getItemMetadata,
    getFrequentItems,

    // Statistics
    recordSearchStats,
    getSearchStats,
    getStorageStats,

    // Maintenance
    cleanupExpiredEntries,
    clearAll,

    // Utilities
    initDB
  }
}
