/**
 * Performance Monitor Plugin
 *
 * Monitors command center performance and ensures targets are met:
 * - Launch time < 10ms
 * - Search response time < 50ms
 * - Tracks metrics and alerts for performance degradation
 */

export default defineNuxtPlugin(() => {
  // Performance targets from UCC specification
  const PERFORMANCE_TARGETS = {
    LAUNCH_TIME: 10, // ms
    SEARCH_TIME: 50, // ms
    CACHE_HIT_RATE: 0.7, // 70%
    MEMORY_LIMIT: 50 * 1024 * 1024 // 50MB
  }

  // Performance tracking
  const performanceData = {
    launches: [],
    searches: [],
    cacheStats: {
      hits: 0,
      misses: 0
    },
    memoryUsage: [],
    alerts: []
  }

  // Monitor command center launch performance
  const monitorLaunchPerformance = (componentName, startTime) => {
    const launchTime = performance.now() - startTime

    performanceData.launches.push({
      component: componentName,
      timestamp: Date.now(),
      launchTime,
      targetMet: launchTime <= PERFORMANCE_TARGETS.LAUNCH_TIME
    })

    // Alert if target not met
    if (launchTime > PERFORMANCE_TARGETS.LAUNCH_TIME) {
      const alert = {
        type: 'launch-performance',
        component: componentName,
        actual: launchTime,
        target: PERFORMANCE_TARGETS.LAUNCH_TIME,
        timestamp: Date.now(),
        severity: launchTime > PERFORMANCE_TARGETS.LAUNCH_TIME * 2 ? 'critical' : 'warning'
      }

      performanceData.alerts.push(alert)

      if (alert.severity === 'critical') {
        console.error(`🚨 Critical launch performance: ${componentName} took ${launchTime}ms (target: ${PERFORMANCE_TARGETS.LAUNCH_TIME}ms)`)
      } else {
        console.warn(`⚠️ Launch performance warning: ${componentName} took ${launchTime}ms (target: ${PERFORMANCE_TARGETS.LAUNCH_TIME}ms)`)
      }
    } else {
      console.log(`✅ Launch performance met: ${componentName} launched in ${launchTime}ms`)
    }

    return launchTime
  }

  // Monitor search performance
  const monitorSearchPerformance = (query, searchTime, resultCount, cacheHit = false) => {
    performanceData.searches.push({
      query: query.substring(0, 50), // Truncate for privacy
      timestamp: Date.now(),
      searchTime,
      resultCount,
      cacheHit,
      targetMet: searchTime <= PERFORMANCE_TARGETS.SEARCH_TIME
    })

    // Update cache stats
    if (cacheHit) {
      performanceData.cacheStats.hits++
    } else {
      performanceData.cacheStats.misses++
    }

    // Alert if search is slow
    if (searchTime > PERFORMANCE_TARGETS.SEARCH_TIME) {
      const alert = {
        type: 'search-performance',
        query: query.substring(0, 20),
        actual: searchTime,
        target: PERFORMANCE_TARGETS.SEARCH_TIME,
        timestamp: Date.now(),
        severity: searchTime > PERFORMANCE_TARGETS.SEARCH_TIME * 3 ? 'critical' : 'warning'
      }

      performanceData.alerts.push(alert)

      if (alert.severity === 'critical') {
        console.error(`🚨 Critical search performance: "${query}" took ${searchTime}ms (target: ${PERFORMANCE_TARGETS.SEARCH_TIME}ms)`)
      }
    }

    return searchTime
  }

  // Monitor memory usage
  const monitorMemoryUsage = () => {
    if ('memory' in performance) {
      const memInfo = performance.memory
      const usage = {
        timestamp: Date.now(),
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit
      }

      performanceData.memoryUsage.push(usage)

      // Alert if memory usage is high
      if (usage.used > PERFORMANCE_TARGETS.MEMORY_LIMIT) {
        const alert = {
          type: 'memory-usage',
          actual: usage.used,
          target: PERFORMANCE_TARGETS.MEMORY_LIMIT,
          timestamp: Date.now(),
          severity: usage.used > PERFORMANCE_TARGETS.MEMORY_LIMIT * 2 ? 'critical' : 'warning'
        }

        performanceData.alerts.push(alert)
        console.warn(`⚠️ High memory usage: ${Math.round(usage.used / 1024 / 1024)}MB`)
      }

      // Keep only recent memory samples
      if (performanceData.memoryUsage.length > 100) {
        performanceData.memoryUsage.shift()
      }
    }
  }

  // Get performance statistics
  const getPerformanceStats = () => {
    const now = Date.now()
    const last24h = now - (24 * 60 * 60 * 1000)

    // Filter recent data
    const recentLaunches = performanceData.launches.filter(l => l.timestamp > last24h)
    const recentSearches = performanceData.searches.filter(s => s.timestamp > last24h)
    const recentAlerts = performanceData.alerts.filter(a => a.timestamp > last24h)

    // Calculate statistics
    const launchStats = {
      count: recentLaunches.length,
      averageTime: recentLaunches.reduce((sum, l) => sum + l.launchTime, 0) / (recentLaunches.length || 1),
      targetMetRate: recentLaunches.filter(l => l.targetMet).length / (recentLaunches.length || 1),
      slowestLaunch: Math.max(...recentLaunches.map(l => l.launchTime), 0)
    }

    const searchStats = {
      count: recentSearches.length,
      averageTime: recentSearches.reduce((sum, s) => sum + s.searchTime, 0) / (recentSearches.length || 1),
      targetMetRate: recentSearches.filter(s => s.targetMet).length / (recentSearches.length || 1),
      cacheHitRate: performanceData.cacheStats.hits / (performanceData.cacheStats.hits + performanceData.cacheStats.misses || 1),
      slowestSearch: Math.max(...recentSearches.map(s => s.searchTime), 0)
    }

    const memoryStats = performanceData.memoryUsage.length > 0
      ? {
          current: performanceData.memoryUsage[performanceData.memoryUsage.length - 1],
          peak: Math.max(...performanceData.memoryUsage.map(m => m.used)),
          average: performanceData.memoryUsage.reduce((sum, m) => sum + m.used, 0) / performanceData.memoryUsage.length
        }
      : null

    return {
      targets: PERFORMANCE_TARGETS,
      launch: launchStats,
      search: searchStats,
      memory: memoryStats,
      alerts: recentAlerts,
      summary: {
        overallHealth: (launchStats.targetMetRate + searchStats.targetMetRate) / 2,
        criticalAlerts: recentAlerts.filter(a => a.severity === 'critical').length,
        warningAlerts: recentAlerts.filter(a => a.severity === 'warning').length
      }
    }
  }

  // Generate performance report
  const generatePerformanceReport = () => {
    const stats = getPerformanceStats()

    const report = {
      timestamp: Date.now(),
      summary: {
        status: stats.summary.overallHealth > 0.8
          ? 'excellent'
          : stats.summary.overallHealth > 0.6
            ? 'good'
            : stats.summary.overallHealth > 0.4 ? 'fair' : 'poor',
        overallHealth: Math.round(stats.summary.overallHealth * 100),
        criticalIssues: stats.summary.criticalAlerts,
        warnings: stats.summary.warningAlerts
      },
      performance: {
        launch: {
          averageTime: Math.round(stats.launch.averageTime),
          targetMetRate: Math.round(stats.launch.targetMetRate * 100),
          status: stats.launch.averageTime <= PERFORMANCE_TARGETS.LAUNCH_TIME ? 'passing' : 'failing'
        },
        search: {
          averageTime: Math.round(stats.search.averageTime),
          targetMetRate: Math.round(stats.search.targetMetRate * 100),
          cacheHitRate: Math.round(stats.search.cacheHitRate * 100),
          status: stats.search.averageTime <= PERFORMANCE_TARGETS.SEARCH_TIME ? 'passing' : 'failing'
        },
        memory: stats.memory
          ? {
              current: Math.round(stats.memory.current.used / 1024 / 1024),
              peak: Math.round(stats.memory.peak / 1024 / 1024),
              status: stats.memory.current.used <= PERFORMANCE_TARGETS.MEMORY_LIMIT ? 'passing' : 'failing'
            }
          : null
      },
      recommendations: []
    }

    // Add recommendations based on performance
    if (stats.launch.averageTime > PERFORMANCE_TARGETS.LAUNCH_TIME) {
      report.recommendations.push({
        type: 'launch-optimization',
        message: 'Consider reducing initial component rendering or deferring non-critical operations',
        priority: 'high'
      })
    }

    if (stats.search.averageTime > PERFORMANCE_TARGETS.SEARCH_TIME) {
      report.recommendations.push({
        type: 'search-optimization',
        message: 'Optimize search algorithms or increase worker thread utilization',
        priority: 'high'
      })
    }

    if (stats.search.cacheHitRate < PERFORMANCE_TARGETS.CACHE_HIT_RATE) {
      report.recommendations.push({
        type: 'cache-optimization',
        message: 'Improve cache hit rate by optimizing cache keys and TTL settings',
        priority: 'medium'
      })
    }

    if (stats.memory?.current.used > PERFORMANCE_TARGETS.MEMORY_LIMIT) {
      report.recommendations.push({
        type: 'memory-optimization',
        message: 'Reduce memory usage by implementing garbage collection or data compression',
        priority: 'high'
      })
    }

    return report
  }

  // Performance optimization suggestions
  const getOptimizationSuggestions = () => {
    const stats = getPerformanceStats()
    const suggestions = []

    if (stats.launch.averageTime > PERFORMANCE_TARGETS.LAUNCH_TIME) {
      suggestions.push({
        category: 'initialization',
        title: 'Optimize Component Loading',
        description: 'Use lazy loading and async components to reduce initial bundle size',
        impact: 'high',
        effort: 'medium'
      })
    }

    if (stats.search.cacheHitRate < 0.5) {
      suggestions.push({
        category: 'caching',
        title: 'Improve Cache Strategy',
        description: 'Implement predictive caching and better cache key optimization',
        impact: 'high',
        effort: 'medium'
      })
    }

    if (stats.search.averageTime > PERFORMANCE_TARGETS.SEARCH_TIME * 0.8) {
      suggestions.push({
        category: 'search',
        title: 'Optimize Search Algorithm',
        description: 'Use more efficient indexing or reduce search scope',
        impact: 'medium',
        effort: 'high'
      })
    }

    return suggestions
  }

  // Set up periodic monitoring
  let monitoringInterval = null

  const startMonitoring = () => {
    // Monitor memory usage every 30 seconds
    monitoringInterval = setInterval(monitorMemoryUsage, 30000)

    // Log performance summary every 5 minutes
    setInterval(() => {
      const stats = getPerformanceStats()
      if (stats.summary.overallHealth < 0.6) {
        console.warn('Performance degradation detected:', stats.summary)
      }
    }, 300000) // 5 minutes
  }

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
  }

  // Start monitoring automatically
  startMonitoring()

  // Provide global access to performance monitoring
  return {
    provide: {
      performanceMonitor: {
        monitorLaunchPerformance,
        monitorSearchPerformance,
        monitorMemoryUsage,
        getPerformanceStats,
        generatePerformanceReport,
        getOptimizationSuggestions,
        startMonitoring,
        stopMonitoring,
        targets: PERFORMANCE_TARGETS
      }
    }
  }
})
