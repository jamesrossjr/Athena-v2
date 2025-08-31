import { ref, computed, reactive } from 'vue'

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  keywords: string[]
  category: 'language' | 'theme' | 'tool' | 'integration' | 'productivity' | 'debug' | 'testing'

  // Plugin lifecycle
  enabled: boolean
  installed: boolean
  active: boolean

  // Capabilities
  contributes: {
    commands?: PluginCommand[]
    languages?: LanguageSupport[]
    themes?: ThemeContribution[]
    keybindings?: KeyBinding[]
    menus?: MenuContribution[]
    views?: ViewContribution[]
    debuggers?: DebuggerContribution[]
    tasks?: TaskProvider[]
    snippets?: SnippetContribution[]
  }

  // Dependencies
  dependencies?: string[]
  extensionDependencies?: string[]

  // Activation events
  activationEvents: string[]

  // Plugin entry points
  main?: string
  browser?: string

  // Metadata
  displayName: string
  icon?: string
  galleryBanner?: {
    color: string
    theme: 'dark' | 'light'
  }

  // Installation info
  installDate?: Date
  lastUpdated?: Date
  downloadCount?: number
  rating?: number

  // Runtime
  api?: any
  context?: PluginContext
}

export interface PluginCommand {
  command: string
  title: string
  category?: string
  icon?: string
  when?: string
}

export interface LanguageSupport {
  id: string
  aliases: string[]
  extensions: string[]
  configuration?: string
  grammars?: Grammar[]
}

export interface Grammar {
  language: string
  scopeName: string
  path: string
  embeddedLanguages?: Record<string, string>
}

export interface ThemeContribution {
  id: string
  label: string
  uiTheme: 'vs-dark' | 'vs-light' | 'hc-black'
  path: string
}

export interface KeyBinding {
  command: string
  key: string
  mac?: string
  when?: string
}

export interface MenuContribution {
  commandPalette?: MenuGroup[]
  editor?: MenuGroup[]
  explorer?: MenuGroup[]
  debug?: MenuGroup[]
}

export interface MenuGroup {
  submenu?: string
  group?: string
  when?: string
}

export interface ViewContribution {
  id: string
  name: string
  when?: string
}

export interface DebuggerContribution {
  type: string
  label: string
  program?: string
  runtime?: string
  configurationAttributes: any
}

export interface TaskProvider {
  type: string
  required: string[]
  properties: any
}

export interface SnippetContribution {
  language: string
  path: string
}

export interface PluginContext {
  subscriptions: any[]
  workspaceState: any
  globalState: any
  extensionPath: string
  storagePath?: string
  globalStoragePath?: string
  logPath: string
}

export interface PluginMarketplace {
  featured: Plugin[]
  popular: Plugin[]
  recent: Plugin[]
  categories: Record<string, Plugin[]>
  searchResults: Plugin[]
}

export const usePluginSystem = () => {
  const installedPlugins = ref<Plugin[]>([])
  const enabledPlugins = ref<Plugin[]>([])
  const marketplace = reactive<PluginMarketplace>({
    featured: [],
    popular: [],
    recent: [],
    categories: {},
    searchResults: []
  })

  const pluginRegistry = new Map<string, Plugin>()
  const commandRegistry = new Map<string, Function>()
  const languageRegistry = new Map<string, LanguageSupport>()
  const themeRegistry = new Map<string, ThemeContribution>()

  // Core language plugins
  const coreLanguagePlugins: Partial<Plugin>[] = [
    {
      id: 'typescript-language-support',
      name: 'TypeScript Language Support',
      category: 'language',
      contributes: {
        languages: [{
          id: 'typescript',
          aliases: ['TypeScript', 'ts'],
          extensions: ['.ts', '.tsx'],
          grammars: [{
            language: 'typescript',
            scopeName: 'source.ts',
            path: './grammars/typescript.json'
          }]
        }]
      }
    },
    {
      id: 'python-language-support',
      name: 'Python Language Support',
      category: 'language',
      contributes: {
        languages: [{
          id: 'python',
          aliases: ['Python', 'py'],
          extensions: ['.py', '.pyw'],
          grammars: [{
            language: 'python',
            scopeName: 'source.python',
            path: './grammars/python.json'
          }]
        }]
      }
    },
    {
      id: 'java-language-support',
      name: 'Java Language Support',
      category: 'language',
      contributes: {
        languages: [{
          id: 'java',
          aliases: ['Java'],
          extensions: ['.java'],
          grammars: [{
            language: 'java',
            scopeName: 'source.java',
            path: './grammars/java.json'
          }]
        }]
      }
    },
    {
      id: 'go-language-support',
      name: 'Go Language Support',
      category: 'language',
      contributes: {
        languages: [{
          id: 'go',
          aliases: ['Go'],
          extensions: ['.go'],
          grammars: [{
            language: 'go',
            scopeName: 'source.go',
            path: './grammars/go.json'
          }]
        }]
      }
    }
  ]

  // Framework-specific plugins
  const frameworkPlugins: Partial<Plugin>[] = [
    {
      id: 'spring-boot-tools',
      name: 'Spring Boot Tools',
      category: 'tool',
      description: 'Spring Boot development tools and utilities',
      contributes: {
        commands: [
          { command: 'spring.boot.run', title: 'Run Spring Boot Application' },
          { command: 'spring.boot.debug', title: 'Debug Spring Boot Application' },
          { command: 'spring.boot.generate', title: 'Generate Spring Boot Project' }
        ]
      }
    },
    {
      id: 'android-development-kit',
      name: 'Android Development Kit',
      category: 'tool',
      description: 'Android app development tools and emulator integration',
      contributes: {
        commands: [
          { command: 'android.build', title: 'Build Android App' },
          { command: 'android.run', title: 'Run on Device/Emulator' },
          { command: 'android.debug', title: 'Debug Android App' }
        ],
        debuggers: [{
          type: 'android',
          label: 'Android Debugger',
          configurationAttributes: {
            launch: {
              required: ['program'],
              properties: {
                program: { type: 'string', description: 'APK path' },
                device: { type: 'string', description: 'Device ID' }
              }
            }
          }
        }]
      }
    },
    {
      id: 'react-native-tools',
      name: 'React Native Tools',
      category: 'tool',
      description: 'React Native development and debugging',
      contributes: {
        commands: [
          { command: 'react-native.start-metro', title: 'Start Metro Bundler' },
          { command: 'react-native.run-ios', title: 'Run iOS' },
          { command: 'react-native.run-android', title: 'Run Android' }
        ]
      }
    }
  ]

  // Quality assurance plugins
  const qualityPlugins: Partial<Plugin>[] = [
    {
      id: 'sonarqube-integration',
      name: 'SonarQube Integration',
      category: 'tool',
      description: 'Code quality analysis with SonarQube',
      contributes: {
        commands: [
          { command: 'sonar.analyze', title: 'Run SonarQube Analysis' },
          { command: 'sonar.view-report', title: 'View Quality Report' }
        ]
      }
    },
    {
      id: 'code-coverage-visualizer',
      name: 'Code Coverage Visualizer',
      category: 'testing',
      description: 'Visualize code coverage reports',
      contributes: {
        commands: [
          { command: 'coverage.show', title: 'Show Coverage Report' },
          { command: 'coverage.toggle', title: 'Toggle Coverage Highlighting' }
        ]
      }
    }
  ]

  // Plugin installation and management
  async function installPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = await fetchPluginFromMarketplace(pluginId)
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`)
      }

      // Check dependencies
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!isPluginInstalled(dep)) {
            await installPlugin(dep)
          }
        }
      }

      // Download and install
      await downloadPlugin(plugin)
      plugin.installed = true
      plugin.installDate = new Date()

      installedPlugins.value.push(plugin)
      pluginRegistry.set(plugin.id, plugin)

      // Register contributions
      await registerPluginContributions(plugin)

      // Activate if needed
      if (shouldActivatePlugin(plugin)) {
        await activatePlugin(plugin.id)
      }
    } catch (error) {
      console.error(`Failed to install plugin ${pluginId}:`, error)
      throw error
    }
  }

  async function uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.get(pluginId)
    if (!plugin) return

    // Deactivate first
    await deactivatePlugin(pluginId)

    // Unregister contributions
    unregisterPluginContributions(plugin)

    // Remove from registries
    pluginRegistry.delete(pluginId)
    const index = installedPlugins.value.findIndex(p => p.id === pluginId)
    if (index >= 0) {
      installedPlugins.value.splice(index, 1)
    }

    // Clean up files
    await cleanupPluginFiles(plugin)
  }

  async function enablePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.get(pluginId)
    if (!plugin || !plugin.installed) return

    plugin.enabled = true

    if (!enabledPlugins.value.find(p => p.id === pluginId)) {
      enabledPlugins.value.push(plugin)
    }

    // Activate if activation events are met
    if (shouldActivatePlugin(plugin)) {
      await activatePlugin(pluginId)
    }
  }

  async function disablePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.get(pluginId)
    if (!plugin) return

    plugin.enabled = false

    const index = enabledPlugins.value.findIndex(p => p.id === pluginId)
    if (index >= 0) {
      enabledPlugins.value.splice(index, 1)
    }

    await deactivatePlugin(pluginId)
  }

  async function activatePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.get(pluginId)
    if (!plugin || !plugin.enabled || plugin.active) return

    try {
      // Create plugin context
      plugin.context = createPluginContext(plugin)

      // Load plugin module
      if (plugin.main) {
        const module = await import(/* @vite-ignore */ plugin.main)
        plugin.api = module.activate?.(plugin.context)
      }

      plugin.active = true
      console.log(`Activated plugin: ${plugin.name}`)
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error)
      throw error
    }
  }

  async function deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = pluginRegistry.get(pluginId)
    if (!plugin || !plugin.active) return

    try {
      // Call deactivate if available
      if (plugin.api?.deactivate) {
        await plugin.api.deactivate()
      }

      // Dispose subscriptions
      if (plugin.context?.subscriptions) {
        plugin.context.subscriptions.forEach((subscription) => {
          subscription.dispose?.()
        })
      }

      plugin.active = false
      plugin.api = null
      plugin.context = null

      console.log(`Deactivated plugin: ${plugin.name}`)
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error)
    }
  }

  // Plugin contribution registration
  async function registerPluginContributions(plugin: Plugin): Promise<void> {
    const { contributes } = plugin

    if (contributes.commands) {
      contributes.commands.forEach((cmd) => {
        commandRegistry.set(cmd.command, () => {
          plugin.api?.executeCommand?.(cmd.command)
        })
      })
    }

    if (contributes.languages) {
      contributes.languages.forEach((lang) => {
        languageRegistry.set(lang.id, lang)
      })
    }

    if (contributes.themes) {
      contributes.themes.forEach((theme) => {
        themeRegistry.set(theme.id, theme)
      })
    }
  }

  function unregisterPluginContributions(plugin: Plugin): void {
    const { contributes } = plugin

    if (contributes.commands) {
      contributes.commands.forEach((cmd) => {
        commandRegistry.delete(cmd.command)
      })
    }

    if (contributes.languages) {
      contributes.languages.forEach((lang) => {
        languageRegistry.delete(lang.id)
      })
    }

    if (contributes.themes) {
      contributes.themes.forEach((theme) => {
        themeRegistry.delete(theme.id)
      })
    }
  }

  // Plugin marketplace
  async function searchPlugins(query: string, category?: string): Promise<Plugin[]> {
    // Simulate API call to plugin marketplace
    const allPlugins = [...coreLanguagePlugins, ...frameworkPlugins, ...qualityPlugins]

    const results = allPlugins.filter((plugin) => {
      const matchesQuery = !query
        || plugin.name?.toLowerCase().includes(query.toLowerCase())
        || plugin.description?.toLowerCase().includes(query.toLowerCase())
        || plugin.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))

      const matchesCategory = !category || plugin.category === category

      return matchesQuery && matchesCategory
    }) as Plugin[]

    marketplace.searchResults = results
    return results
  }

  async function loadFeaturedPlugins(): Promise<void> {
    // Load featured plugins from marketplace
    marketplace.featured = [
      ...coreLanguagePlugins.slice(0, 4),
      ...frameworkPlugins.slice(0, 2)
    ] as Plugin[]
  }

  async function loadPopularPlugins(): Promise<void> {
    // Load popular plugins based on download count
    marketplace.popular = [
      ...frameworkPlugins,
      ...qualityPlugins
    ] as Plugin[]
  }

  // Utility functions
  function isPluginInstalled(pluginId: string): boolean {
    return pluginRegistry.has(pluginId)
  }

  function isPluginEnabled(pluginId: string): boolean {
    const plugin = pluginRegistry.get(pluginId)
    return plugin?.enabled === true
  }

  function isPluginActive(pluginId: string): boolean {
    const plugin = pluginRegistry.get(pluginId)
    return plugin?.active === true
  }

  function shouldActivatePlugin(plugin: Plugin): boolean {
    // Check activation events
    return plugin.activationEvents.includes('*')
      || plugin.activationEvents.includes('onStartup')
  }

  function createPluginContext(plugin: Plugin): PluginContext {
    return {
      subscriptions: [],
      workspaceState: {},
      globalState: {},
      extensionPath: `/plugins/${plugin.id}`,
      logPath: `/logs/${plugin.id}.log`
    }
  }

  async function fetchPluginFromMarketplace(pluginId: string): Promise<Plugin | null> {
    // Simulate fetching from marketplace API
    const allPlugins = [...coreLanguagePlugins, ...frameworkPlugins, ...qualityPlugins]
    const found = allPlugins.find(p => p.id === pluginId)

    if (found) {
      return {
        ...found,
        version: '1.0.0',
        author: 'Canvas Team',
        keywords: [],
        enabled: false,
        installed: false,
        active: false,
        activationEvents: ['*'],
        displayName: found.name || ''
      } as Plugin
    }

    return null
  }

  async function downloadPlugin(plugin: Plugin): Promise<void> {
    // Simulate plugin download
    console.log(`Downloading plugin: ${plugin.name}`)
  }

  async function cleanupPluginFiles(plugin: Plugin): Promise<void> {
    // Clean up plugin files
    console.log(`Cleaning up plugin files: ${plugin.name}`)
  }

  // Command execution
  async function executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const command = commandRegistry.get(commandId)
    if (command) {
      return await command(...args)
    } else {
      throw new Error(`Command ${commandId} not found`)
    }
  }

  // Initialize core plugins
  async function initializeCorePlugins(): Promise<void> {
    for (const pluginData of [...coreLanguagePlugins, ...frameworkPlugins, ...qualityPlugins]) {
      const plugin: Plugin = {
        ...pluginData,
        version: '1.0.0',
        author: 'Canvas Team',
        keywords: [],
        enabled: true,
        installed: true,
        active: false,
        activationEvents: ['*'],
        displayName: pluginData.name || ''
      } as Plugin

      pluginRegistry.set(plugin.id, plugin)
      installedPlugins.value.push(plugin)
      enabledPlugins.value.push(plugin)

      await registerPluginContributions(plugin)
      await activatePlugin(plugin.id)
    }
  }

  const availableCommands = computed(() =>
    Array.from(commandRegistry.keys())
  )

  const availableLanguages = computed(() =>
    Array.from(languageRegistry.values())
  )

  const availableThemes = computed(() =>
    Array.from(themeRegistry.values())
  )

  const pluginCategories = computed(() => {
    const categories = new Set<string>()
    installedPlugins.value.forEach((plugin) => {
      categories.add(plugin.category)
    })
    return Array.from(categories)
  })

  return {
    installedPlugins,
    enabledPlugins,
    marketplace,
    availableCommands,
    availableLanguages,
    availableThemes,
    pluginCategories,

    // Plugin management
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    activatePlugin,
    deactivatePlugin,

    // Marketplace
    searchPlugins,
    loadFeaturedPlugins,
    loadPopularPlugins,

    // Utilities
    isPluginInstalled,
    isPluginEnabled,
    isPluginActive,
    executeCommand,

    // Initialize
    initializeCorePlugins
  }
}
