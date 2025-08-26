<template>
  <div class="enterprise-dashboard h-full bg-gray-50 p-6 overflow-y-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Enterprise Features
      </h1>
      <p class="text-gray-600">
        Advanced development tools and enterprise capabilities
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              🔍
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              Code Issues
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ codeIssues.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              🚀
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              Deployments
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ runningPipelines.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              🔧
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              Active Plugins
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ enabledPlugins.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              👥
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              Team Members
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ onlineMembers.length }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Cards Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Advanced Code Intelligence -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">🧠</span>
            Advanced Code Intelligence
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Deep static analysis and intelligent refactoring
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Code Quality Score</span>
              <div class="flex items-center">
                <div class="w-16 h-2 bg-gray-200 rounded-full mr-3">
                  <div
                    class="h-2 bg-green-500 rounded-full"
                    style="width: 85%"
                  />
                </div>
                <span class="text-sm font-medium">85/100</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Critical Issues</span>
                <span class="text-red-600 font-medium">{{ criticalIssues.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Security Issues</span>
                <span class="text-yellow-600 font-medium">{{ securityIssues.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Auto-fixable</span>
                <span class="text-green-600 font-medium">{{ fixableIssues.length }}</span>
              </div>
            </div>

            <div class="pt-4">
              <button
                class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                :disabled="isAnalyzing"
                @click="runCodeAnalysis"
              >
                {{ isAnalyzing ? 'Analyzing...' : 'Run Full Analysis' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Debugging -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">🐛</span>
            Advanced Debugging
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Multi-language debugging with breakpoints and inspection
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Debug Session</span>
              <span
                class="text-sm font-medium"
                :class="debuggerAttached ? 'text-green-600' : 'text-gray-400'"
              >
                {{ debuggerAttached ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Breakpoints</span>
                <span class="font-medium">{{ activeBreakpoints.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Watch Expressions</span>
                <span class="font-medium">{{ enabledWatchExpressions.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Call Stack Depth</span>
                <span class="font-medium">{{ callStack.length }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <button
                class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                :disabled="isDebugging"
                @click="startDebugging"
              >
                {{ isDebugging ? 'Debugging...' : 'Start Debug Session' }}
              </button>
              <button
                v-if="isDebugging"
                class="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                @click="stopDebugging"
              >
                Stop Debugging
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Plugin Ecosystem -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">🔌</span>
            Plugin Ecosystem
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Language support, frameworks, and productivity tools
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-2xl font-bold text-blue-600">
                  {{ installedPlugins.length }}
                </p>
                <p class="text-xs text-gray-500">
                  Installed
                </p>
              </div>
              <div>
                <p class="text-2xl font-bold text-green-600">
                  {{ enabledPlugins.length }}
                </p>
                <p class="text-xs text-gray-500">
                  Enabled
                </p>
              </div>
              <div>
                <p class="text-2xl font-bold text-purple-600">
                  {{ availableLanguages.length }}
                </p>
                <p class="text-xs text-gray-500">
                  Languages
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-sm text-gray-600">
                Featured Plugins:
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="plugin in marketplace.featured.slice(0, 4)"
                  :key="plugin.id"
                  class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                >
                  {{ plugin.name }}
                </span>
              </div>
            </div>

            <div class="pt-4">
              <button class="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                Browse Plugin Marketplace
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Team Collaboration -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">👥</span>
            Team Collaboration
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Real-time editing, code reviews, and team chat
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Connection Status</span>
              <span
                class="text-sm font-medium"
                :class="connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'"
              >
                {{ connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1) }}
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Online Members</span>
                <span class="font-medium">{{ onlineMembers.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Pending Reviews</span>
                <span class="font-medium">{{ pendingReviews.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Active Sessions</span>
                <span class="font-medium">{{ activeSession ? 1 : 0 }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Start Pair Programming
              </button>
              <button class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Create Code Review
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Git Integration -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">🌿</span>
            Advanced Git Integration
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Comprehensive version control with advanced workflows
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">Current Branch</span>
              <span class="text-sm font-medium text-blue-600">{{ currentBranch || 'No repository' }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Local Branches</span>
                <span class="font-medium">{{ branches.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Stashes</span>
                <span class="font-medium">{{ stashes.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Status</span>
                <span
                  class="font-medium"
                  :class="isClean ? 'text-green-600' : 'text-yellow-600'"
                >
                  {{ isClean ? 'Clean' : 'Modified' }}
                </span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <button class="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                Git History & Blame
              </button>
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Interactive Rebase
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CI/CD Pipeline Integration -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">🚀</span>
            CI/CD Integration
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Automated pipelines and deployment management
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <p class="text-xl font-bold text-green-600">
                  {{ pipelines.filter(p => p.status === 'success').length }}
                </p>
                <p class="text-xs text-gray-500">
                  Successful
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-bold text-red-600">
                  {{ failedPipelines.length }}
                </p>
                <p class="text-xs text-gray-500">
                  Failed
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Running Pipelines</span>
                <span class="font-medium">{{ runningPipelines.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Pending Deployments</span>
                <span class="font-medium">{{ pendingDeployments.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Environments</span>
                <span class="font-medium">{{ environments.length }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <button class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Trigger Pipeline
              </button>
              <button class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Deploy to Staging
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Management -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">📊</span>
            Project Management
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Agile project tracking with sprints and releases
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <p class="text-xl font-bold text-blue-600">
                  {{ activeProjects.length }}
                </p>
                <p class="text-xs text-gray-500">
                  Active Projects
                </p>
              </div>
              <div class="text-center">
                <p class="text-xl font-bold text-purple-600">
                  {{ myIssues.length }}
                </p>
                <p class="text-xs text-gray-500">
                  My Issues
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Current Sprint</span>
                <span class="font-medium">{{ activeSprint?.name || 'None' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Upcoming Releases</span>
                <span class="font-medium">{{ upcomingReleases.length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Overdue Tasks</span>
                <span class="font-medium text-red-600">{{ overdueTasks.length }}</span>
              </div>
            </div>

            <div class="pt-4 space-y-2">
              <button class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                View Sprint Board
              </button>
              <button class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Create New Issue
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Framework & Language Support -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="p-6 border-b">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center">
            <span class="mr-3">⚡</span>
            Framework & Language Support
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Comprehensive tooling for modern development stacks
          </p>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600 mb-2">
                  Languages
                </p>
                <div class="flex flex-wrap gap-1">
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">TypeScript</span>
                  <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Python</span>
                  <span class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Java</span>
                  <span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Go</span>
                </div>
              </div>
              <div>
                <p class="text-sm text-gray-600 mb-2">
                  Frameworks
                </p>
                <div class="flex flex-wrap gap-1">
                  <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Spring Boot</span>
                  <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">React Native</span>
                  <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">Android</span>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors">
                Configure Development Stack
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Center -->
    <div class="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
      <h3 class="text-xl font-semibold mb-4">
        Ready to Get Started?
      </h3>
      <p class="mb-6">
        Unlock the full potential of enterprise-grade development with these advanced tools.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button class="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Setup Team Workspace
        </button>
        <button class="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Configure CI/CD Pipeline
        </button>
        <button class="bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Install Development Tools
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCodeAnalysis } from '../../code-intelligence/composables/useCodeAnalysis'
import { useAdvancedDebugging } from '../../code-intelligence/composables/useAdvancedDebugging'
import { usePluginSystem } from '../../plugins/composables/usePluginSystem'
import { useTeamCollaboration } from '../../collaboration/composables/useTeamCollaboration'
import { useAdvancedGit } from '../../version-control/composables/useAdvancedGit'
import { useCICD } from '../../cicd/composables/useCICD'
import { useProjectManagement } from '../../project-management/composables/useProjectManagement'

// Initialize all composables
const {
  issues: codeIssues,
  criticalIssues,
  securityIssues,
  fixableIssues,
  isAnalyzing,
  analyzeCode
} = useCodeAnalysis()

const {
  activeBreakpoints,
  enabledWatchExpressions,
  callStack,
  isDebugging,
  debuggerAttached,
  startDebugging,
  stopDebugging
} = useAdvancedDebugging()

const {
  installedPlugins,
  enabledPlugins,
  marketplace,
  availableLanguages,
  initializeCorePlugins
} = usePluginSystem()

const {
  onlineMembers,
  pendingReviews,
  activeSession,
  connectionStatus
} = useTeamCollaboration()

const {
  currentBranch,
  branches,
  stashes,
  isClean
} = useAdvancedGit()

const {
  pipelines,
  runningPipelines,
  failedPipelines,
  pendingDeployments,
  environments
} = useCICD()

const {
  activeProjects,
  myIssues,
  activeSprint,
  upcomingReleases,
  overdueTasks
} = useProjectManagement()

// Demo actions
const runCodeAnalysis = async () => {
  try {
    await analyzeCode(`
      function example() {
        const unused = 'test';
        console.log('debugging');
        return true;
      }
    `, 'typescript', 'example.ts')
  } catch (error) {
    console.error('Analysis failed:', error)
  }
}

onMounted(async () => {
  // Initialize plugins and load demo data
  await initializeCorePlugins()

  // Run initial code analysis for demo
  setTimeout(() => {
    runCodeAnalysis()
  }, 1000)
})
</script>

<style scoped>
.enterprise-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.enterprise-dashboard :deep(.transition-colors) {
  transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
}
</style>
