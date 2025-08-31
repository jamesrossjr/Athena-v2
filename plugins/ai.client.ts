/**
 * AI Assistant Client Plugin for Nuxt 4.0
 *
 * Initializes the Universal AI Assistant on client-side only
 * Prevents SSR hydration issues and provides seamless integration
 */

export default defineNuxtPlugin({
  name: 'universal-ai-assistant',
  setup() {
    // Only run on client-side
    if (!import.meta.client) return

    const { ai, registerActions, setContext } = useAI()
    const route = useRoute()
    const router = useRouter()

    // Enhanced client-side actions
    registerActions({
      // Browser-specific actions
      copyToClipboard: {
        description: 'Copy text to clipboard',
        parameters: ['text: string'],
        execute: async (text) => {
          try {
            await navigator.clipboard.writeText(text)
            return {
              success: true,
              message: `Copied to clipboard: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
            }
          } catch {
            return {
              success: false,
              error: 'Failed to copy to clipboard'
            }
          }
        }
      },

      // Local storage operations
      setLocalStorage: {
        description: 'Store data in browser local storage',
        parameters: ['key: string', 'value: any'],
        execute: async (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value))
            return {
              success: true,
              message: `Stored ${key} in local storage`
            }
          } catch {
            return {
              success: false,
              error: 'Failed to set local storage'
            }
          }
        }
      },

      getLocalStorage: {
        description: 'Get data from browser local storage',
        parameters: ['key: string'],
        execute: async (key) => {
          try {
            const value = localStorage.getItem(key)
            return {
              success: true,
              data: value ? JSON.parse(value) : null,
              message: `Retrieved ${key} from local storage`
            }
          } catch {
            return {
              success: false,
              error: 'Failed to get from local storage'
            }
          }
        }
      },

      // Browser navigation
      goBack: {
        description: 'Navigate back in browser history',
        parameters: [],
        execute: async () => {
          try {
            router.back()
            return {
              success: true,
              message: 'Navigated back in history'
            }
          } catch {
            return {
              success: false,
              error: 'Failed to navigate back'
            }
          }
        }
      },

      goForward: {
        description: 'Navigate forward in browser history',
        parameters: [],
        execute: async () => {
          try {
            router.forward()
            return {
              success: true,
              message: 'Navigated forward in history'
            }
          } catch {
            return {
              success: false,
              error: 'Failed to navigate forward'
            }
          }
        }
      },

      // Page scroll actions
      scrollToTop: {
        description: 'Scroll page to top',
        parameters: [],
        execute: async () => {
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return {
              success: true,
              message: 'Scrolled to top of page'
            }
          } catch {
            return {
              success: false,
              error: 'Failed to scroll'
            }
          }
        }
      },

      scrollToElement: {
        description: 'Scroll to specific element by ID or selector',
        parameters: ['selector: string'],
        execute: async (selector) => {
          try {
            const element = document.querySelector(selector)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              return {
                success: true,
                message: `Scrolled to element: ${selector}`
              }
            } else {
              return {
                success: false,
                error: `Element not found: ${selector}`
              }
            }
          } catch {
            return {
              success: false,
              error: 'Failed to scroll to element'
            }
          }
        }
      },

      // DOM manipulation
      highlightElement: {
        description: 'Highlight a specific element on the page',
        parameters: ['selector: string', 'duration?: number'],
        execute: async (selector, duration = 3000) => {
          try {
            const element = document.querySelector(selector)
            if (element) {
              const originalBorder = element.style.border
              const originalBoxShadow = element.style.boxShadow

              element.style.border = '2px solid #3B82F6'
              element.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)'
              element.style.transition = 'all 0.3s ease'

              setTimeout(() => {
                element.style.border = originalBorder
                element.style.boxShadow = originalBoxShadow
              }, duration)

              return {
                success: true,
                message: `Highlighted element: ${selector}`
              }
            } else {
              return {
                success: false,
                error: `Element not found: ${selector}`
              }
            }
          } catch {
            return {
              success: false,
              error: 'Failed to highlight element'
            }
          }
        }
      },

      // Form interactions
      fillForm: {
        description: 'Fill form fields with provided data',
        parameters: ['formData: object'],
        execute: async (formData) => {
          try {
            let filledCount = 0

            for (const [fieldName, value] of Object.entries(formData)) {
              const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`)
              if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                  field.checked = Boolean(value)
                } else {
                  field.value = value
                }

                // Trigger input events for reactive frameworks
                field.dispatchEvent(new Event('input', { bubbles: true }))
                field.dispatchEvent(new Event('change', { bubbles: true }))
                filledCount++
              }
            }

            return {
              success: true,
              message: `Filled ${filledCount} form fields`,
              data: { filledCount, totalFields: Object.keys(formData).length }
            }
          } catch {
            return {
              success: false,
              error: 'Failed to fill form'
            }
          }
        }
      },

      // Page information
      getPageInfo: {
        description: 'Get detailed information about the current page',
        parameters: [],
        execute: async () => {
          try {
            const pageInfo = {
              url: window.location.href,
              title: document.title,
              domain: window.location.hostname,
              path: window.location.pathname,
              hash: window.location.hash,
              search: window.location.search,
              referrer: document.referrer,
              userAgent: navigator.userAgent,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight
              },
              scroll: {
                x: window.scrollX,
                y: window.scrollY
              },
              elements: {
                forms: document.forms.length,
                links: document.links.length,
                images: document.images.length
              }
            }

            return {
              success: true,
              data: pageInfo,
              message: 'Retrieved page information'
            }
          } catch {
            return {
              success: false,
              error: 'Failed to get page info'
            }
          }
        }
      },

      // Console logging for debugging
      logMessage: {
        description: 'Log message to browser console',
        parameters: ['message: string', 'level?: string'],
        execute: async (message, level = 'info') => {
          try {
            switch (level.toLowerCase()) {
              case 'error':
                console.error(`[AI Assistant] ${message}`)
                break
              case 'warn':
                console.warn(`[AI Assistant] ${message}`)
                break
              case 'debug':
                console.debug(`[AI Assistant] ${message}`)
                break
              default:
                console.log(`[AI Assistant] ${message}`)
            }

            return {
              success: true,
              message: `Logged message at ${level} level`
            }
          } catch {
            return {
              success: false,
              error: 'Failed to log message'
            }
          }
        }
      }
    })

    // Set enhanced client-side context
    const updateContext = () => {
      setContext({
        // Browser information
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,

        // Viewport information
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },

        // Page information
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,

        // Nuxt route information
        currentRoute: {
          path: route.path,
          name: route.name,
          params: route.params,
          query: route.query,
          hash: route.hash,
          meta: route.meta
        },

        // Timestamp
        lastUpdated: new Date().toISOString()
      })
    }

    // Initial context setup
    updateContext()

    // Update context on route changes
    router.afterEach(() => {
      updateContext()
    })

    // Update context on window resize
    window.addEventListener('resize', updateContext)

    // Global error handler for AI actions
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[AI Assistant] Unhandled promise rejection:', event.reason)
    })

    // Provide global access to AI assistant (for debugging)
    if (import.meta.dev) {
      window.__universalAI = ai
      console.log('🤖 Universal AI Assistant loaded! Access via window.__universalAI')
      console.log('   Press Ctrl/Cmd + K to open the AI assistant')
    }

    return {
      provide: {
        universalAI: ai
      }
    }
  }
})
