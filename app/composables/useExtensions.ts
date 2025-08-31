import { ref, reactive, computed } from 'vue'

// Extension registry and management system
const extensionRegistry = ref(new Map())
const installedExtensions = ref(new Map())
const activeExtensions = ref(new Set())
const extensionSettings = ref(new Map())

// Extension hooks and event system
const extensionHooks = reactive({
  'editor.beforeSave': [],
  'editor.afterSave': [],
  'editor.selectionChanged': [],
  'editor.contentChanged': [],
  'file.opened': [],
  'file.closed': [],
  'file.created': [],
  'file.deleted': [],
  'workspace.loaded': [],
  'debugger.started': [],
  'debugger.stopped': [],
  'debugger.breakpointHit': [],
  'terminal.output': [],
  'git.statusChanged': [],
  'build.started': [],
  'build.completed': [],
  'test.started': [],
  'test.completed': []
})

// Extension API that extensions can use
const createExtensionAPI = (extensionId) => {
  return {
    // Command registration
    commands: {
      register: (commandId, handler) => {
        registerCommand(`${extensionId}.${commandId}`, handler)
      },
      execute: (commandId, ...args) => {
        return executeCommand(commandId, ...args)
      }
    },

    // Hook registration
    hooks: {
      on: (eventName, handler) => {
        if (extensionHooks[eventName]) {
          extensionHooks[eventName].push({ extensionId, handler })
        }
      },
      emit: (eventName, data) => {
        return emitHook(eventName, data)
      }
    },

    // UI registration
    ui: {
      registerStatusBarItem: (item) => {
        // Add status bar item
        console.log('Registered status bar item:', item)
      },
      registerSidebarPanel: (panel) => {
        // Add sidebar panel
        console.log('Registered sidebar panel:', panel)
      },
      registerCommand: (command) => {
        // Add command to command palette
        console.log('Registered UI command:', command)
      }
    },

    // Settings management
    settings: {
      get: (key, defaultValue) => {
        const extensionSettingsMap = extensionSettings.value.get(extensionId) || {}
        return extensionSettingsMap[key] !== undefined ? extensionSettingsMap[key] : defaultValue
      },
      set: (key, value) => {
        const extensionSettingsMap = extensionSettings.value.get(extensionId) || {}
        extensionSettingsMap[key] = value
        extensionSettings.value.set(extensionId, extensionSettingsMap)
      },
      onChange: (key, _callback) => {
        // Watch for setting changes
        console.log('Registered settings watcher:', key)
      }
    },

    // File system access
    fs: {
      readFile: async (_path) => {
        // Mock file reading
        console.log('Extension reading file:', _path)
        return 'file content'
      },
      writeFile: async (_path, content) => {
        // Mock file writing
        console.log('Extension writing file:', _path, content)
      },
      exists: async (_path) => {
        // Mock file existence check
        return true
      }
    },

    // Editor integration
    editor: {
      getActiveEditor: () => {
        // Return current active editor instance
        return {
          document: {
            getText: () => 'document text',
            getLanguage: () => 'javascript',
            getFilename: () => 'file.js'
          },
          selection: {
            getText: () => 'selected text',
            getRange: () => ({ start: { line: 0, column: 0 }, end: { line: 0, column: 0 } })
          },
          insertText: (text, position) => {
            console.log('Extension inserting text:', text, position)
          },
          replaceText: (range, text) => {
            console.log('Extension replacing text:', range, text)
          }
        }
      },
      onSelectionChanged: (callback) => {
        extensionHooks['editor.selectionChanged'].push({ extensionId, handler: callback })
      },
      onContentChanged: (callback) => {
        extensionHooks['editor.contentChanged'].push({ extensionId, handler: callback })
      }
    },

    // Language server integration
    languageServer: {
      register: (language, serverConfig) => {
        console.log('Extension registering language server:', language, serverConfig)
      },
      sendRequest: (method, params) => {
        console.log('Extension sending LSP request:', method, params)
        return Promise.resolve({})
      }
    },

    // Diagnostics
    diagnostics: {
      set: (uri, diagnostics) => {
        console.log('Extension setting diagnostics:', uri, diagnostics)
      },
      clear: (uri) => {
        console.log('Extension clearing diagnostics:', uri)
      }
    },

    // Terminal integration
    terminal: {
      create: (name, options) => {
        console.log('Extension creating terminal:', name, options)
        return {
          sendText: text => console.log('Terminal send:', text),
          show: () => console.log('Terminal show'),
          dispose: () => console.log('Terminal dispose')
        }
      },
      getActive: () => {
        return {
          sendText: text => console.log('Active terminal send:', text)
        }
      }
    },

    // Git integration
    git: {
      getStatus: () => {
        return Promise.resolve({
          branch: 'main',
          modified: ['file1.js', 'file2.js'],
          staged: ['file3.js'],
          untracked: ['file4.js']
        })
      },
      add: (files) => {
        console.log('Extension git add:', files)
        return Promise.resolve()
      },
      commit: (message) => {
        console.log('Extension git commit:', message)
        return Promise.resolve()
      }
    },

    // Workspace utilities
    workspace: {
      getRootPath: () => '/workspace/root',
      findFiles: (pattern) => {
        console.log('Extension finding files:', pattern)
        return Promise.resolve(['file1.js', 'file2.js'])
      },
      openTextDocument: (path) => {
        console.log('Extension opening document:', path)
        return Promise.resolve({
          getText: () => 'document content',
          getLanguage: () => 'javascript'
        })
      }
    }
  }
}

// Core extension management functions
export function useExtensions() {
  // Register a new extension
  const registerExtension = (extension) => {
    const { id, name, version, main, contributes } = extension

    extensionRegistry.value.set(id, {
      id,
      name,
      version,
      main,
      contributes: contributes || {},
      api: createExtensionAPI(id),
      instance: null,
      active: false
    })

    console.log('Registered extension:', name)
  }

  // Activate an extension
  const activateExtension = async (extensionId) => {
    const extension = extensionRegistry.value.get(extensionId)
    if (!extension || extension.active) return

    try {
      // Load extension main module
      if (extension.main) {
        // In a real implementation, this would dynamically import the extension
        // For now, we'll simulate activation
        extension.instance = {
          activate: (_api) => {
            console.log(`Activating extension: ${extension.name}`)
            // Mock activation logic
            return {
              deactivate: () => console.log(`Deactivating extension: ${extension.name}`)
            }
          }
        }

        // Call activate with extension API
        const activationResult = extension.instance.activate(extension.api)
        extension.deactivate = activationResult?.deactivate

        extension.active = true
        activeExtensions.value.add(extensionId)

        // Register contributions
        registerContributions(extensionId, extension.contributes)

        console.log('Activated extension:', extension.name)
      }
    } catch (error) {
      console.error('Failed to activate extension:', extension.name, error)
    }
  }

  // Deactivate an extension
  const deactivateExtension = async (extensionId) => {
    const extension = extensionRegistry.value.get(extensionId)
    if (!extension || !extension.active) return

    try {
      // Call deactivate if available
      if (extension.deactivate) {
        await extension.deactivate()
      }

      // Remove contributions
      unregisterContributions(extensionId)

      extension.active = false
      activeExtensions.value.delete(extensionId)

      console.log('Deactivated extension:', extension.name)
    } catch (error) {
      console.error('Failed to deactivate extension:', extension.name, error)
    }
  }

  // Register extension contributions (commands, menus, etc.)
  const registerContributions = (extensionId, contributes) => {
    // Register commands
    if (contributes.commands) {
      contributes.commands.forEach((command) => {
        registerCommand(command.command, () => {
          console.log('Executing contributed command:', command.command)
        })
      })
    }

    // Register menu items
    if (contributes.menus) {
      Object.entries(contributes.menus).forEach(([menuId, items]) => {
        items.forEach((item) => {
          console.log('Registered menu item:', menuId, item)
        })
      })
    }

    // Register language configurations
    if (contributes.languages) {
      contributes.languages.forEach((lang) => {
        console.log('Registered language:', lang.id)
      })
    }

    // Register themes
    if (contributes.themes) {
      contributes.themes.forEach((theme) => {
        console.log('Registered theme:', theme.id)
      })
    }
  }

  // Remove extension contributions
  const unregisterContributions = (extensionId) => {
    // Remove commands, menus, etc. registered by this extension
    console.log('Unregistered contributions for:', extensionId)
  }

  // Command system
  const commands = new Map()

  const registerCommand = (commandId, handler) => {
    commands.set(commandId, handler)
  }

  const executeCommand = async (commandId, ...args) => {
    const handler = commands.get(commandId)
    if (handler) {
      try {
        return await handler(...args)
      } catch (error) {
        console.error('Command execution failed:', commandId, error)
      }
    } else {
      console.warn('Unknown command:', commandId)
    }
  }

  // Hook system
  const emitHook = async (eventName, data) => {
    const handlers = extensionHooks[eventName] || []
    const results = []

    for (const { extensionId, handler } of handlers) {
      try {
        const result = await handler(data)
        results.push({ extensionId, result })
      } catch (error) {
        console.error(`Hook handler error in ${extensionId}:`, error)
      }
    }

    return results
  }

  // Extension marketplace simulation
  const installExtension = async (extensionId, source = 'marketplace') => {
    console.log('Installing extension:', extensionId, 'from:', source)

    // Mock installation process
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock extension manifest
    const mockExtension = {
      id: extensionId,
      name: `Extension ${extensionId}`,
      version: '1.0.0',
      main: './main.js',
      contributes: {
        commands: [
          {
            command: `${extensionId}.hello`,
            title: 'Hello World'
          }
        ]
      }
    }

    registerExtension(mockExtension)
    installedExtensions.value.set(extensionId, mockExtension)

    console.log('Installed extension:', extensionId)
    return mockExtension
  }

  const uninstallExtension = async (extensionId) => {
    await deactivateExtension(extensionId)
    extensionRegistry.value.delete(extensionId)
    installedExtensions.value.delete(extensionId)
    extensionSettings.value.delete(extensionId)

    console.log('Uninstalled extension:', extensionId)
  }

  // Get all extensions
  const getAllExtensions = () => {
    return Array.from(extensionRegistry.value.values())
  }

  // Get installed extensions
  const getInstalledExtensions = () => {
    return Array.from(installedExtensions.value.values())
  }

  // Get active extensions
  const getActiveExtensions = () => {
    return Array.from(activeExtensions.value).map(id =>
      extensionRegistry.value.get(id)
    ).filter(Boolean)
  }

  // Extension settings
  const getExtensionSetting = (extensionId, key, defaultValue) => {
    const settings = extensionSettings.value.get(extensionId) || {}
    return settings[key] !== undefined ? settings[key] : defaultValue
  }

  const setExtensionSetting = (extensionId, key, value) => {
    const settings = extensionSettings.value.get(extensionId) || {}
    settings[key] = value
    extensionSettings.value.set(extensionId, settings)
  }

  // Computed properties
  const extensionCount = computed(() => extensionRegistry.value.size)
  const activeExtensionCount = computed(() => activeExtensions.value.size)

  return {
    // State
    extensionRegistry: extensionRegistry.value,
    installedExtensions: installedExtensions.value,
    activeExtensions: activeExtensions.value,
    extensionSettings: extensionSettings.value,
    extensionHooks,

    // Methods
    registerExtension,
    activateExtension,
    deactivateExtension,
    installExtension,
    uninstallExtension,
    getAllExtensions,
    getInstalledExtensions,
    getActiveExtensions,
    getExtensionSetting,
    setExtensionSetting,
    registerCommand,
    executeCommand,
    emitHook,

    // Computed
    extensionCount,
    activeExtensionCount,

    // API factory
    createExtensionAPI
  }
}

// Global extension system instance
let globalExtensionSystem = null

export function getExtensionSystem() {
  if (!globalExtensionSystem) {
    globalExtensionSystem = useExtensions()
  }
  return globalExtensionSystem
}

// Helper function to load built-in extensions
export async function loadBuiltinExtensions() {
  const extensionSystem = getExtensionSystem()

  // Load some built-in extensions
  const builtinExtensions = [
    {
      id: 'builtin.language-support',
      name: 'Language Support',
      version: '1.0.0',
      main: './language-support.js',
      contributes: {
        languages: [
          { id: 'javascript', extensions: ['.js', '.jsx'] },
          { id: 'typescript', extensions: ['.ts', '.tsx'] },
          { id: 'python', extensions: ['.py'] },
          { id: 'json', extensions: ['.json'] }
        ]
      }
    },
    {
      id: 'builtin.git-integration',
      name: 'Git Integration',
      version: '1.0.0',
      main: './git-integration.js',
      contributes: {
        commands: [
          { command: 'git.commit', title: 'Git: Commit' },
          { command: 'git.push', title: 'Git: Push' },
          { command: 'git.pull', title: 'Git: Pull' }
        ]
      }
    },
    {
      id: 'builtin.file-explorer',
      name: 'File Explorer',
      version: '1.0.0',
      main: './file-explorer.js',
      contributes: {
        views: {
          explorer: [
            {
              id: 'fileExplorer',
              name: 'Files',
              when: 'workbenchState != empty'
            }
          ]
        }
      }
    }
  ]

  for (const extension of builtinExtensions) {
    extensionSystem.registerExtension(extension)
    await extensionSystem.activateExtension(extension.id)
  }

  console.log('Loaded built-in extensions')
}
