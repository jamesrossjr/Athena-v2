// File system operations for IDE mode
import { ref, computed } from 'vue'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  content?: string
  language?: string
  children?: FileNode[]
  isOpen?: boolean
  size?: number
  modified?: Date
}

export interface ProjectConfig {
  name: string
  type: 'vanilla' | 'nuxt' | 'next' | 'vue' | 'react' | 'node' | 'custom'
  packageManager: 'npm' | 'pnpm' | 'yarn'
  rootPath: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  scripts: Record<string, string>
}

export const useFileSystem = () => {
  const currentProject = ref<ProjectConfig | null>(null)
  const fileTree = ref<FileNode[]>([])
  const openFiles = ref<Map<string, FileNode>>(new Map())
  const activeFile = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // File operations
  const createFile = async (parentPath: string, fileName: string, content = ''): Promise<FileNode> => {
    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName
    const extension = fileName.split('.').pop()?.toLowerCase()

    const file: FileNode = {
      name: fileName,
      path: filePath,
      type: 'file',
      content,
      language: getLanguageFromExtension(extension || ''),
      modified: new Date()
    }

    // Add to parent folder or root
    if (parentPath) {
      const parent = findNodeByPath(fileTree.value, parentPath)
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || []
        parent.children.push(file)
        parent.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      }
    } else {
      fileTree.value.push(file)
      fileTree.value.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }

    return file
  }

  const createFolder = async (parentPath: string, folderName: string): Promise<FileNode> => {
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName

    const folder: FileNode = {
      name: folderName,
      path: folderPath,
      type: 'folder',
      children: [],
      isOpen: false,
      modified: new Date()
    }

    // Add to parent folder or root
    if (parentPath) {
      const parent = findNodeByPath(fileTree.value, parentPath)
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || []
        parent.children.push(folder)
        parent.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      }
    } else {
      fileTree.value.push(folder)
      fileTree.value.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }

    return folder
  }

  const deleteNode = async (path: string): Promise<boolean> => {
    const pathParts = path.split('/')
    const fileName = pathParts.pop()!
    const parentPath = pathParts.join('/')

    if (parentPath) {
      const parent = findNodeByPath(fileTree.value, parentPath)
      if (parent && parent.children) {
        const index = parent.children.findIndex(child => child.name === fileName)
        if (index !== -1) {
          parent.children.splice(index, 1)
          return true
        }
      }
    } else {
      const index = fileTree.value.findIndex(node => node.name === fileName)
      if (index !== -1) {
        fileTree.value.splice(index, 1)
        return true
      }
    }
    return false
  }

  const renameNode = async (oldPath: string, newName: string): Promise<boolean> => {
    const node = findNodeByPath(fileTree.value, oldPath)
    if (node) {
      const pathParts = oldPath.split('/')
      pathParts[pathParts.length - 1] = newName
      node.name = newName
      node.path = pathParts.join('/')
      node.modified = new Date()
      return true
    }
    return false
  }

  const saveFile = async (path: string, content: string): Promise<boolean> => {
    const node = findNodeByPath(fileTree.value, path)
    if (node && node.type === 'file') {
      node.content = content
      node.modified = new Date()
      return true
    }
    return false
  }

  const openFile = (path: string) => {
    const node = findNodeByPath(fileTree.value, path)
    if (node && node.type === 'file') {
      openFiles.value.set(path, node)
      activeFile.value = path
    }
  }

  const closeFile = (path: string) => {
    openFiles.value.delete(path)
    if (activeFile.value === path) {
      const remaining = Array.from(openFiles.value.keys())
      activeFile.value = remaining.length > 0 ? remaining[remaining.length - 1] : null
    }
  }

  const toggleFolder = (path: string) => {
    const node = findNodeByPath(fileTree.value, path)
    if (node && node.type === 'folder') {
      node.isOpen = !node.isOpen
    }
  }

  // Project operations
  const initializeProject = async (config: Partial<ProjectConfig>): Promise<ProjectConfig> => {
    const projectConfig: ProjectConfig = {
      name: config.name || 'My Project',
      type: config.type || 'vanilla',
      packageManager: config.packageManager || 'npm',
      rootPath: config.rootPath || '',
      dependencies: config.dependencies || {},
      devDependencies: config.devDependencies || {},
      scripts: config.scripts || getDefaultScripts(config.type || 'vanilla')
    }

    currentProject.value = projectConfig
    fileTree.value = []

    // Create initial project structure based on type
    await createProjectStructure(projectConfig)

    return projectConfig
  }

  const installPackage = async (packageName: string, isDev = false): Promise<boolean> => {
    if (!currentProject.value) return false

    try {
      // Simulate package installation (in real implementation, would use Node.js APIs)
      const version = await getLatestPackageVersion(packageName)

      if (isDev) {
        currentProject.value.devDependencies[packageName] = `^${version}`
      } else {
        currentProject.value.dependencies[packageName] = `^${version}`
      }

      // Update package.json file
      const packageJsonNode = findNodeByPath(fileTree.value, 'package.json')
      if (packageJsonNode) {
        const packageJson = {
          name: currentProject.value.name,
          version: '1.0.0',
          scripts: currentProject.value.scripts,
          dependencies: currentProject.value.dependencies,
          devDependencies: currentProject.value.devDependencies
        }
        packageJsonNode.content = JSON.stringify(packageJson, null, 2)
        packageJsonNode.modified = new Date()
      }

      return true
    } catch (error) {
      console.error('Failed to install package:', error)
      return false
    }
  }

  const runScript = async (scriptName: string): Promise<{ success: boolean, output: string }> => {
    if (!currentProject.value || !currentProject.value.scripts[scriptName]) {
      return { success: false, output: `Script "${scriptName}" not found` }
    }

    const command = currentProject.value.scripts[scriptName]

    // Simulate script execution
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          output: `> ${command}\n\nScript "${scriptName}" executed successfully!`
        })
      }, 1000)
    })
  }

  // Helper functions
  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node
      if (node.type === 'folder' && node.children) {
        const found = findNodeByPath(node.children, path)
        if (found) return found
      }
    }
    return null
  }

  const getLanguageFromExtension = (ext: string): string => {
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      vue: 'vue',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      md: 'markdown',
      py: 'python',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      ini: 'ini',
      sh: 'shell',
      bash: 'shell',
      ps1: 'powershell',
      sql: 'sql'
    }
    return languageMap[ext] || 'plaintext'
  }

  const getDefaultScripts = (projectType: string): Record<string, string> => {
    const scripts: Record<string, Record<string, string>> = {
      vanilla: {
        start: 'serve -s .',
        build: 'echo "No build process configured"',
        test: 'echo "No tests configured"'
      },
      nuxt: {
        build: 'nuxt build',
        dev: 'nuxt dev',
        generate: 'nuxt generate',
        preview: 'nuxt preview',
        postinstall: 'nuxt prepare'
      },
      next: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      vue: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      react: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      },
      node: {
        start: 'node index.js',
        dev: 'nodemon index.js',
        test: 'jest'
      }
    }
    return scripts[projectType] || scripts.vanilla
  }

  const createProjectStructure = async (config: ProjectConfig) => {
    switch (config.type) {
      case 'nuxt':
        await createNuxtStructure()
        break
      case 'next':
        await createNextStructure()
        break
      case 'vue':
        await createVueStructure()
        break
      case 'react':
        await createReactStructure()
        break
      case 'node':
        await createNodeStructure()
        break
      default:
        await createVanillaStructure()
    }
  }

  const createNuxtStructure = async () => {
    // Create Nuxt 3 project structure
    await createFolder('', 'components')
    await createFolder('', 'composables')
    await createFolder('', 'layouts')
    await createFolder('', 'middleware')
    await createFolder('', 'pages')
    await createFolder('', 'plugins')
    await createFolder('', 'public')
    await createFolder('', 'server')
    await createFolder('server', 'api')
    await createFolder('', 'assets')
    await createFolder('assets', 'css')

    // Create files
    await createFile('', 'nuxt.config.ts', getNuxtConfig())
    await createFile('', 'app.vue', getNuxtAppVue())
    await createFile('pages', 'index.vue', getNuxtIndexPage())
    await createFile('', 'package.json', getPackageJson('nuxt'))
    await createFile('assets/css', 'main.css', getMainCSS())
    await createFile('', 'README.md', getReadmeContent('nuxt'))
    await createFile('', '.gitignore', getGitignore('nuxt'))
  }

  const createNextStructure = async () => {
    // Create Next.js project structure
    await createFolder('', 'pages')
    await createFolder('', 'components')
    await createFolder('', 'styles')
    await createFolder('', 'public')
    await createFolder('', 'lib')
    await createFolder('pages', 'api')

    // Create files
    await createFile('', 'next.config.js', getNextConfig())
    await createFile('pages', 'index.tsx', getNextIndexPage())
    await createFile('pages', '_app.tsx', getNextApp())
    await createFile('', 'package.json', getPackageJson('next'))
    await createFile('styles', 'globals.css', getGlobalCSS())
    await createFile('', 'README.md', getReadmeContent('next'))
    await createFile('', '.gitignore', getGitignore('next'))
  }

  const createVueStructure = async () => {
    // Create Vue 3 + Vite project structure
    await createFolder('', 'src')
    await createFolder('src', 'components')
    await createFolder('src', 'views')
    await createFolder('src', 'assets')
    await createFolder('src', 'router')
    await createFolder('src', 'stores')
    await createFolder('', 'public')

    // Create files
    await createFile('', 'vite.config.ts', getViteConfig())
    await createFile('src', 'main.ts', getVueMain())
    await createFile('src', 'App.vue', getVueApp())
    await createFile('src/views', 'HomeView.vue', getVueHome())
    await createFile('', 'package.json', getPackageJson('vue'))
    await createFile('', 'index.html', getVueIndexHtml())
    await createFile('', 'README.md', getReadmeContent('vue'))
    await createFile('', '.gitignore', getGitignore('vue'))
  }

  const createReactStructure = async () => {
    // Create React project structure
    await createFolder('', 'src')
    await createFolder('src', 'components')
    await createFolder('src', 'hooks')
    await createFolder('src', 'utils')
    await createFolder('src', 'styles')
    await createFolder('', 'public')

    // Create files
    await createFile('src', 'index.tsx', getReactIndex())
    await createFile('src', 'App.tsx', getReactApp())
    await createFile('src', 'App.css', getReactAppCSS())
    await createFile('', 'package.json', getPackageJson('react'))
    await createFile('public', 'index.html', getReactIndexHtml())
    await createFile('', 'README.md', getReadmeContent('react'))
    await createFile('', '.gitignore', getGitignore('react'))
  }

  const createNodeStructure = async () => {
    // Create Node.js project structure
    await createFolder('', 'src')
    await createFolder('src', 'routes')
    await createFolder('src', 'middleware')
    await createFolder('src', 'models')
    await createFolder('src', 'controllers')
    await createFolder('src', 'utils')
    await createFolder('', 'tests')

    // Create files
    await createFile('', 'index.js', getNodeIndex())
    await createFile('src', 'app.js', getNodeApp())
    await createFile('', 'package.json', getPackageJson('node'))
    await createFile('', 'README.md', getReadmeContent('node'))
    await createFile('', '.gitignore', getGitignore('node'))
    await createFile('', '.env.example', getEnvExample())
  }

  const createVanillaStructure = async () => {
    // Create basic web project structure
    await createFolder('', 'css')
    await createFolder('', 'js')
    await createFolder('', 'images')

    // Create files
    await createFile('', 'index.html', getVanillaHTML())
    await createFile('css', 'style.css', getVanillaCSS())
    await createFile('js', 'script.js', getVanillaJS())
    await createFile('', 'package.json', getPackageJson('vanilla'))
    await createFile('', 'README.md', getReadmeContent('vanilla'))
  }

  const getLatestPackageVersion = async (packageName: string): Promise<string> => {
    // In a real implementation, this would call npm registry API
    // For now, return mock versions
    const mockVersions: Record<string, string> = {
      'nuxt': '3.8.0',
      'next': '14.0.0',
      'vue': '3.3.0',
      'react': '18.2.0',
      'express': '4.18.0',
      'lodash': '4.17.21',
      'axios': '1.6.0',
      'typescript': '5.2.0',
      '@types/node': '20.8.0'
    }
    return mockVersions[packageName] || '1.0.0'
  }

  // Template content generators (these would be extensive in a real implementation)
  const getNuxtConfig = () => `export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css']
})`

  const getNuxtAppVue = () => `<template>
  <div>
    <NuxtWelcome />
  </div>
</template>`

  const getNuxtIndexPage = () => `<template>
  <div>
    <h1>Welcome to Nuxt!</h1>
    <p>Get started by editing this page</p>
  </div>
</template>

<script setup>
// Page logic here
</script>

<style scoped>
h1 {
  color: #00DC82;
}
</style>`

  const getPackageJson = (type: string) => {
    const basePackage = {
      name: currentProject.value?.name || 'my-project',
      version: '1.0.0',
      scripts: getDefaultScripts(type),
      dependencies: {},
      devDependencies: {}
    }

    // Add framework-specific dependencies
    switch (type) {
      case 'nuxt':
        basePackage.dependencies = { nuxt: '^3.8.0' }
        basePackage.devDependencies = { '@nuxt/devtools': 'latest' }
        break
      case 'next':
        basePackage.dependencies = { 'next': '^14.0.0', 'react': '^18.2.0', 'react-dom': '^18.2.0' }
        basePackage.devDependencies = { '@types/node': '^20.8.0', '@types/react': '^18.2.0', 'typescript': '^5.2.0' }
        break
      case 'vue':
        basePackage.dependencies = { vue: '^3.3.0' }
        basePackage.devDependencies = { '@vitejs/plugin-vue': '^4.4.0', 'vite': '^4.4.0', 'typescript': '^5.2.0' }
        break
      case 'react':
        basePackage.dependencies = { 'react': '^18.2.0', 'react-dom': '^18.2.0' }
        basePackage.devDependencies = { '@types/react': '^18.2.0', '@vitejs/plugin-react': '^4.1.0', 'vite': '^4.4.0' }
        break
      case 'node':
        basePackage.dependencies = { express: '^4.18.0' }
        basePackage.devDependencies = { '@types/node': '^20.8.0', 'nodemon': '^3.0.0', 'typescript': '^5.2.0' }
        break
    }

    return JSON.stringify(basePackage, null, 2)
  }

  const getReadmeContent = (type: string) => `# ${currentProject.value?.name || 'My Project'}

A ${type} project created with Canvas IDE.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser and start coding!

## Project Structure

- Built with ${type}
- Ready for development
- Configured with best practices

Happy coding! 🚀`

  const getMainCSS = () => `/* Main styles */
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}`

  const getGitignore = (type: string) => {
    const common = `node_modules/
.env
.env.local
.DS_Store
*.log`

    const typeSpecific: Record<string, string> = {
      nuxt: `.nuxt/
.output/
dist/`,
      next: `.next/
out/`,
      vue: `dist/
.vite/`,
      react: `build/
.vite/`
    }

    return common + '\n' + (typeSpecific[type] || '')
  }

  // More template generators would go here...
  const getVanillaHTML = () => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentProject.value?.name || 'My Project'}</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Project!</h1>
        <p>Start building something amazing!</p>
    </div>
    <script src="js/script.js"></script>
</body>
</html>`

  const getVanillaCSS = () => `/* Project styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}

h1 {
    color: #2563eb;
    margin-bottom: 1rem;
}

p {
    font-size: 1.1rem;
    color: #666;
}`

  const getVanillaJS = () => `// Project JavaScript
console.log('Project loaded successfully!');

// Add your code here
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM is ready');
    
    // Your initialization code
});`

  // Computed properties
  const flatFileList = computed(() => {
    const flatten = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = []
      for (const node of nodes) {
        if (node.type === 'file') {
          result.push(node)
        }
        if (node.type === 'folder' && node.children) {
          result.push(...flatten(node.children))
        }
      }
      return result
    }
    return flatten(fileTree.value)
  })

  const openFilesList = computed(() => Array.from(openFiles.value.values()))

  const currentFile = computed(() => {
    if (!activeFile.value) return null
    return openFiles.value.get(activeFile.value) || null
  })

  return {
    // State
    currentProject,
    fileTree,
    openFiles,
    activeFile,
    isLoading,
    error,

    // Computed
    flatFileList,
    openFilesList,
    currentFile,

    // File operations
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    saveFile,
    openFile,
    closeFile,
    toggleFolder,

    // Project operations
    initializeProject,
    installPackage,
    runScript,

    // Utilities
    findNodeByPath,
    getLanguageFromExtension
  }
}
