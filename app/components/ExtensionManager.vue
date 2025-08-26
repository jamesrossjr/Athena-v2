<template>
  <div class="h-full flex flex-col bg-gray-900 text-white">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-700">
      <div class="flex items-center space-x-2">
        <h2 class="text-lg font-semibold">
          Extensions
        </h2>
        <span class="text-xs text-gray-400">({{ installedExtensions.length }} installed)</span>
      </div>
      <div class="flex items-center space-x-2">
        <button
          class="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
          title="Refresh extensions"
          @click="refreshExtensions"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium"
          @click="showInstallDialog = true"
        >
          Install Extension
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-700">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab.id
          ? 'text-blue-400 border-blue-400'
          : 'text-gray-400 hover:text-white border-transparent hover:border-gray-500'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
      <!-- Installed Extensions -->
      <div
        v-if="activeTab === 'installed'"
        class="p-4 space-y-4"
      >
        <div
          v-for="extension in installedExtensions"
          :key="extension.id"
          class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <h3 class="font-semibold text-white">
                  {{ extension.name }}
                </h3>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="extension.enabled ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-300'"
                >
                  {{ extension.enabled ? 'Enabled' : 'Disabled' }}
                </span>
                <span class="text-xs text-gray-400">v{{ extension.version }}</span>
              </div>
              <p class="text-gray-300 text-sm mb-3">
                {{ extension.description }}
              </p>
              <div class="flex items-center space-x-4 text-xs text-gray-400">
                <span>{{ extension.author }}</span>
                <span>•</span>
                <span>{{ extension.downloads.toLocaleString() }} downloads</span>
                <span>•</span>
                <span>Updated {{ formatDate(extension.lastUpdated) }}</span>
              </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
              <button
                class="text-xs px-3 py-1.5 rounded transition-colors"
                :class="extension.enabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'"
                @click="toggleExtension(extension.id)"
              >
                {{ extension.enabled ? 'Disable' : 'Enable' }}
              </button>
              <button
                class="text-xs px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-700 text-white"
                @click="uninstallExtension(extension.id)"
              >
                Uninstall
              </button>
              <button
                class="text-xs px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-700 text-white"
                @click="configureExtension(extension)"
              >
                Configure
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="installedExtensions.length === 0"
          class="text-center py-8 text-gray-400"
        >
          <p>No extensions installed yet.</p>
          <p class="text-sm mt-2">
            Browse the marketplace to find extensions for your development workflow.
          </p>
        </div>
      </div>

      <!-- Marketplace -->
      <div
        v-if="activeTab === 'marketplace'"
        class="p-4"
      >
        <!-- Search Bar -->
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search extensions..."
              class="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
            <svg
              class="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <!-- Categories -->
        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category"
            class="text-xs px-3 py-1.5 rounded border transition-colors"
            :class="selectedCategory === category
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'"
            @click="selectedCategory = selectedCategory === category ? '' : category"
          >
            {{ category }}
          </button>
        </div>

        <!-- Extension Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            v-for="extension in filteredMarketplaceExtensions"
            :key="extension.id"
            class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="font-semibold text-white mb-1">
                  {{ extension.name }}
                </h3>
                <p class="text-gray-300 text-sm mb-2">
                  {{ extension.description }}
                </p>
                <div class="flex items-center space-x-4 text-xs text-gray-400 mb-2">
                  <span>{{ extension.author }}</span>
                  <span>•</span>
                  <span>{{ extension.downloads.toLocaleString() }} downloads</span>
                  <span>•</span>
                  <span class="flex items-center space-x-1">
                    <span>★ {{ extension.rating }}</span>
                  </span>
                </div>
                <div class="flex flex-wrap gap-1 mb-2">
                  <span
                    v-for="tag in extension.tags"
                    :key="tag"
                    class="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-400">v{{ extension.version }}</span>
              <button
                :disabled="isInstalled(extension.id) || installingExtensions.has(extension.id)"
                class="text-xs px-4 py-2 rounded font-medium transition-colors"
                :class="isInstalled(extension.id)
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : installingExtensions.has(extension.id)
                    ? 'bg-blue-800 text-blue-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'"
                @click="installExtension(extension)"
              >
                {{ isInstalled(extension.id) ? 'Installed'
                  : installingExtensions.has(extension.id) ? 'Installing...' : 'Install' }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="filteredMarketplaceExtensions.length === 0"
          class="text-center py-8 text-gray-400"
        >
          <p>No extensions found matching your search criteria.</p>
        </div>
      </div>

      <!-- Development -->
      <div
        v-if="activeTab === 'development'"
        class="p-4"
      >
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 class="text-lg font-semibold mb-4">
            Develop Extensions
          </h3>
          <p class="text-gray-300 mb-4">
            Create your own extensions to customize and extend the IDE functionality.
          </p>
          <div class="space-y-4">
            <button
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
              @click="createNewExtension"
            >
              Create New Extension
            </button>
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium ml-3"
              @click="loadExtensionFromFile"
            >
              Load Extension from File
            </button>
          </div>

          <!-- Development Extensions -->
          <div
            v-if="developmentExtensions.length > 0"
            class="mt-6"
          >
            <h4 class="font-medium mb-3">
              Development Extensions
            </h4>
            <div class="space-y-3">
              <div
                v-for="ext in developmentExtensions"
                :key="ext.id"
                class="flex items-center justify-between p-3 bg-gray-700 rounded border border-gray-600"
              >
                <div>
                  <span class="font-medium text-white">{{ ext.name }}</span>
                  <span class="text-xs text-gray-400 ml-2">{{ ext.path }}</span>
                </div>
                <div class="flex space-x-2">
                  <button
                    class="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                    @click="reloadExtension(ext.id)"
                  >
                    Reload
                  </button>
                  <button
                    class="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white"
                    @click="removeDevExtension(ext.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Install Extension Dialog -->
    <div
      v-if="showInstallDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="showInstallDialog = false"
    >
      <div
        class="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700"
        @click.stop
      >
        <h3 class="text-lg font-semibold mb-4">
          Install Extension
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Extension ID or URL</label>
            <input
              v-model="installInput"
              type="text"
              placeholder="e.g., publisher.extension-name"
              class="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
          </div>
          <div class="flex justify-end space-x-3">
            <button
              class="px-4 py-2 text-sm text-gray-300 hover:text-white"
              @click="showInstallDialog = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
              @click="installFromInput"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extension Configuration Dialog -->
    <div
      v-if="configDialog.show"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="configDialog.show = false"
    >
      <div
        class="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto border border-gray-700"
        @click.stop
      >
        <h3 class="text-lg font-semibold mb-4">
          Configure {{ configDialog.extension?.name }}
        </h3>
        <div class="space-y-4">
          <div
            v-for="setting in configDialog.extension?.settings || []"
            :key="setting.key"
            class="space-y-2"
          >
            <label class="block text-sm font-medium text-gray-300">{{ setting.label }}</label>
            <input
              v-if="setting.type === 'text'"
              v-model="setting.value"
              type="text"
              class="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
              :placeholder="setting.placeholder"
            >
            <select
              v-else-if="setting.type === 'select'"
              v-model="setting.value"
              class="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option
                v-for="option in setting.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <label
              v-else-if="setting.type === 'boolean'"
              class="flex items-center space-x-2"
            >
              <input
                v-model="setting.value"
                type="checkbox"
                class="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-300">{{ setting.description }}</span>
            </label>
          </div>
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              class="px-4 py-2 text-sm text-gray-300 hover:text-white"
              @click="configDialog.show = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
              @click="saveExtensionConfig"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Reactive state
const activeTab = ref('installed')
const searchQuery = ref('')
const selectedCategory = ref('')
const showInstallDialog = ref(false)
const installInput = ref('')
const installingExtensions = ref(new Set())
const configDialog = ref({ show: false, extension: null })

// Tabs configuration
const tabs = [
  { id: 'installed', label: 'Installed' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'development', label: 'Development' }
]

// Categories for marketplace
const categories = [
  'Language Support',
  'Themes',
  'Debuggers',
  'Formatters',
  'Linters',
  'Git Tools',
  'AI/ML',
  'Productivity',
  'Testing'
]

// Mock installed extensions
const installedExtensions = ref([
  {
    id: 'ms-vscode.vscode-typescript-next',
    name: 'TypeScript Hero',
    description: 'Advanced TypeScript language support with IntelliSense, debugging, and more.',
    author: 'Microsoft',
    version: '4.9.5',
    enabled: true,
    downloads: 5234567,
    lastUpdated: new Date('2024-01-15'),
    settings: [
      {
        key: 'typescript.preferences.includePackageJsonAutoImports',
        label: 'Include Package JSON Auto Imports',
        type: 'select',
        value: 'auto',
        options: [
          { value: 'auto', label: 'Auto' },
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' }
        ]
      },
      {
        key: 'typescript.suggest.autoImports',
        label: 'Enable Auto Imports',
        type: 'boolean',
        value: true,
        description: 'Enable auto import suggestions'
      }
    ]
  },
  {
    id: 'esbenp.prettier-vscode',
    name: 'Prettier - Code Formatter',
    description: 'Code formatter using prettier for consistent code styling.',
    author: 'Prettier',
    version: '9.10.4',
    enabled: true,
    downloads: 15234567,
    lastUpdated: new Date('2024-01-20'),
    settings: [
      {
        key: 'prettier.singleQuote',
        label: 'Use Single Quotes',
        type: 'boolean',
        value: false,
        description: 'Use single quotes instead of double quotes'
      },
      {
        key: 'prettier.tabWidth',
        label: 'Tab Width',
        type: 'text',
        value: '2',
        placeholder: '2'
      }
    ]
  },
  {
    id: 'github.github-vscode-theme',
    name: 'GitHub Theme',
    description: 'GitHub theme for Visual Studio Code',
    author: 'GitHub',
    version: '6.3.4',
    enabled: false,
    downloads: 2345678,
    lastUpdated: new Date('2023-12-10'),
    settings: []
  }
])

// Mock marketplace extensions
const marketplaceExtensions = ref([
  {
    id: 'ms-python.python',
    name: 'Python',
    description: 'Rich support for the Python language including IntelliSense, linting, debugging, code navigation, code formatting.',
    author: 'Microsoft',
    version: '2024.2.1',
    downloads: 50234567,
    rating: 4.8,
    tags: ['Language Support', 'Python', 'Debuggers'],
    category: 'Language Support'
  },
  {
    id: 'rust-lang.rust-analyzer',
    name: 'rust-analyzer',
    description: 'Rust language server providing IDE features for Rust',
    author: 'The Rust Programming Language',
    version: '0.3.1810',
    downloads: 5234567,
    rating: 4.7,
    tags: ['Language Support', 'Rust', 'LSP'],
    category: 'Language Support'
  },
  {
    id: 'ms-vscode.vscode-json',
    name: 'JSON Language Features',
    description: 'JSON Language Support with IntelliSense, validation, and formatting',
    author: 'Microsoft',
    version: '1.0.0',
    downloads: 12345678,
    rating: 4.6,
    tags: ['Language Support', 'JSON'],
    category: 'Language Support'
  },
  {
    id: 'dracula-theme.theme-dracula',
    name: 'Dracula Official',
    description: 'Official Dracula Theme. A dark theme for many editors, shells, and more.',
    author: 'Dracula Theme',
    version: '2.24.2',
    downloads: 8234567,
    rating: 4.5,
    tags: ['Themes', 'Dark'],
    category: 'Themes'
  },
  {
    id: 'github.copilot',
    name: 'GitHub Copilot',
    description: 'AI pair programmer that suggests code completions',
    author: 'GitHub',
    version: '1.156.0',
    downloads: 15234567,
    rating: 4.4,
    tags: ['AI/ML', 'Productivity', 'Code Generation'],
    category: 'AI/ML'
  },
  {
    id: 'ms-vscode.test-adapter-converter',
    name: 'Test Adapter Converter',
    description: 'Converter for Test Explorer UI extensions to native VS Code testing',
    author: 'Microsoft',
    version: '0.1.8',
    downloads: 234567,
    rating: 4.2,
    tags: ['Testing', 'Productivity'],
    category: 'Testing'
  }
])

// Development extensions
const developmentExtensions = ref([])

// Computed properties
const filteredMarketplaceExtensions = computed(() => {
  let filtered = marketplaceExtensions.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(ext =>
      ext.name.toLowerCase().includes(query)
      || ext.description.toLowerCase().includes(query)
      || ext.author.toLowerCase().includes(query)
      || ext.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(ext =>
      ext.category === selectedCategory.value
      || ext.tags.includes(selectedCategory.value)
    )
  }

  return filtered
})

// Methods
const refreshExtensions = async () => {
  console.log('Refreshing extensions...')
  // Mock refresh logic
}

const toggleExtension = async (extensionId) => {
  const extension = installedExtensions.value.find(ext => ext.id === extensionId)
  if (extension) {
    extension.enabled = !extension.enabled
    console.log(`${extension.enabled ? 'Enabled' : 'Disabled'} extension:`, extension.name)
  }
}

const uninstallExtension = async (extensionId) => {
  const index = installedExtensions.value.findIndex(ext => ext.id === extensionId)
  if (index > -1) {
    const extension = installedExtensions.value[index]
    if (confirm(`Are you sure you want to uninstall "${extension.name}"?`)) {
      installedExtensions.value.splice(index, 1)
      console.log('Uninstalled extension:', extension.name)
    }
  }
}

const installExtension = async (extension) => {
  if (isInstalled(extension.id) || installingExtensions.value.has(extension.id)) {
    return
  }

  installingExtensions.value.add(extension.id)

  try {
    // Mock installation process
    await new Promise(resolve => setTimeout(resolve, 2000))

    installedExtensions.value.push({
      ...extension,
      enabled: true,
      lastUpdated: new Date(),
      settings: []
    })

    console.log('Installed extension:', extension.name)
  } catch (error) {
    console.error('Failed to install extension:', error)
    alert('Failed to install extension')
  } finally {
    installingExtensions.value.delete(extension.id)
  }
}

const isInstalled = (extensionId) => {
  return installedExtensions.value.some(ext => ext.id === extensionId)
}

const installFromInput = async () => {
  if (!installInput.value.trim()) return

  // Mock installation from ID/URL
  console.log('Installing extension from input:', installInput.value)

  // Create mock extension for demo
  const newExtension = {
    id: installInput.value,
    name: `Custom Extension (${installInput.value})`,
    description: 'Extension installed from custom input',
    author: 'Unknown',
    version: '1.0.0',
    enabled: true,
    downloads: 0,
    lastUpdated: new Date(),
    settings: []
  }

  installedExtensions.value.push(newExtension)
  showInstallDialog.value = false
  installInput.value = ''
}

const configureExtension = (extension) => {
  configDialog.value = {
    show: true,
    extension: JSON.parse(JSON.stringify(extension)) // Deep copy
  }
}

const saveExtensionConfig = () => {
  const extension = installedExtensions.value.find(ext => ext.id === configDialog.value.extension.id)
  if (extension) {
    extension.settings = configDialog.value.extension.settings
    console.log('Saved configuration for:', extension.name)
  }
  configDialog.value.show = false
}

const createNewExtension = () => {
  // Mock extension creation
  const extensionName = prompt('Enter extension name:')
  if (extensionName) {
    const newExt = {
      id: `dev.${extensionName.toLowerCase().replace(/\s+/g, '-')}`,
      name: extensionName,
      path: `/dev/extensions/${extensionName}`,
      status: 'development'
    }
    developmentExtensions.value.push(newExt)
    console.log('Created development extension:', extensionName)
  }
}

const loadExtensionFromFile = () => {
  // Mock file loading
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.js,.json,.zip'
  input.onchange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const newExt = {
        id: `file.${file.name}`,
        name: file.name,
        path: file.name,
        status: 'loaded'
      }
      developmentExtensions.value.push(newExt)
      console.log('Loaded extension from file:', file.name)
    }
  }
  input.click()
}

const reloadExtension = (extensionId) => {
  console.log('Reloading development extension:', extensionId)
}

const removeDevExtension = (extensionId) => {
  const index = developmentExtensions.value.findIndex(ext => ext.id === extensionId)
  if (index > -1) {
    developmentExtensions.value.splice(index, 1)
  }
}

const formatDate = (date) => {
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`
  return `${Math.floor(diff / 365)} years ago`
}

// Initialization
onMounted(() => {
  console.log('Extension Manager initialized')
})
</script>

<style scoped>
/* Component-specific styles */
.extension-manager {
  /* Custom scrollbar for extension lists */
}

.extension-manager ::-webkit-scrollbar {
  width: 6px;
}

.extension-manager ::-webkit-scrollbar-track {
  background: #374151;
}

.extension-manager ::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 3px;
}

.extension-manager ::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
