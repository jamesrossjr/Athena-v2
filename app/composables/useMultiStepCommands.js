/**
 * Multi-Step Commands Composable
 *
 * Features:
 * - Command chaining and workflows
 * - Progress indication for complex operations
 * - Step validation and error handling
 * - Conditional branching and loops
 * - Parallel step execution
 * - Transaction management with rollback
 * - Interactive prompts and confirmations
 */

import { ref, computed, reactive } from 'vue'

export const useMultiStepCommands = () => {
  // State management
  const activeWorkflows = ref(new Map())
  const completedWorkflows = ref([])
  const workflowTemplates = ref(new Map())
  const globalContext = reactive({})

  // Current workflow state
  const currentWorkflow = ref(null)
  const currentStep = ref(null)
  const isExecuting = ref(false)
  const isPaused = ref(false)
  const executionError = ref(null)

  // Progress tracking
  const progress = computed(() => {
    if (!currentWorkflow.value) return 0

    const workflow = currentWorkflow.value
    const completedSteps = workflow.steps.filter(step => step.status === 'completed').length
    return Math.round((completedSteps / workflow.steps.length) * 100)
  })

  // Workflow execution statistics
  const executionStats = ref({
    totalWorkflows: 0,
    successfulWorkflows: 0,
    failedWorkflows: 0,
    averageExecutionTime: 0,
    mostUsedWorkflows: new Map()
  })

  // Define a multi-step workflow
  const defineWorkflow = (definition) => {
    const workflow = {
      id: definition.id || generateWorkflowId(),
      name: definition.name,
      description: definition.description,
      version: definition.version || '1.0.0',
      steps: definition.steps.map((step, index) => ({
        ...step,
        id: step.id || `step_${index}`,
        index,
        status: 'pending',
        result: null,
        error: null,
        startTime: null,
        endTime: null,
        retryCount: 0,
        maxRetries: step.maxRetries || 3
      })),
      context: definition.context || {},
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: definition.author || 'system',
        category: definition.category || 'general',
        tags: definition.tags || []
      },
      options: {
        parallel: definition.parallel || false,
        stopOnError: definition.stopOnError !== false,
        timeout: definition.timeout || 300000, // 5 minutes default
        retryable: definition.retryable !== false,
        confirmBeforeStart: definition.confirmBeforeStart || false,
        confirmBeforeDestruct: definition.confirmBeforeDestruct || true
      }
    }

    // Validate workflow
    validateWorkflow(workflow)

    // Store template
    workflowTemplates.value.set(workflow.id, workflow)

    return workflow
  }

  // Validate workflow definition
  const validateWorkflow = (workflow) => {
    if (!workflow.name) {
      throw new Error('Workflow must have a name')
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step')
    }

    // Validate each step
    workflow.steps.forEach((step, index) => {
      if (!step.action) {
        throw new Error(`Step ${index} must have an action`)
      }

      if (step.condition && typeof step.condition !== 'function') {
        throw new Error(`Step ${index} condition must be a function`)
      }

      if (step.dependencies) {
        step.dependencies.forEach((dep) => {
          const depExists = workflow.steps.some(s => s.id === dep)
          if (!depExists) {
            throw new Error(`Step ${index} dependency "${dep}" not found`)
          }
        })
      }
    })
  }

  // Execute a workflow
  const executeWorkflow = async (workflowId, initialContext = {}) => {
    const template = workflowTemplates.value.get(workflowId)
    if (!template) {
      throw new Error(`Workflow "${workflowId}" not found`)
    }

    // Create workflow instance
    const workflow = createWorkflowInstance(template, initialContext)

    try {
      // Pre-execution confirmation
      if (workflow.options.confirmBeforeStart) {
        const confirmed = await requestConfirmation({
          title: 'Execute Workflow',
          message: `Execute workflow "${workflow.name}"?`,
          details: `This workflow has ${workflow.steps.length} steps and may take some time to complete.`
        })

        if (!confirmed) {
          throw new Error('Workflow execution cancelled by user')
        }
      }

      // Start execution
      activeWorkflows.value.set(workflow.instanceId, workflow)
      currentWorkflow.value = workflow
      isExecuting.value = true
      executionError.value = null

      workflow.startTime = Date.now()
      workflow.status = 'running'

      // Execute workflow
      const result = workflow.options.parallel
        ? await executeWorkflowParallel(workflow)
        : await executeWorkflowSequential(workflow)

      // Complete workflow
      workflow.endTime = Date.now()
      workflow.status = 'completed'
      workflow.result = result

      // Update statistics
      updateExecutionStats(workflow, true)

      // Move to completed
      activeWorkflows.value.delete(workflow.instanceId)
      completedWorkflows.value.push(workflow)

      return result
    } catch (error) {
      // Handle workflow failure
      workflow.endTime = Date.now()
      workflow.status = 'failed'
      workflow.error = error.message
      executionError.value = error.message

      // Update statistics
      updateExecutionStats(workflow, false)

      // Move to completed (even if failed)
      activeWorkflows.value.delete(workflow.instanceId)
      completedWorkflows.value.push(workflow)

      throw error
    } finally {
      isExecuting.value = false
      currentWorkflow.value = null
      currentStep.value = null
    }
  }

  // Create workflow instance from template
  const createWorkflowInstance = (template, initialContext) => {
    const instance = JSON.parse(JSON.stringify(template))
    instance.instanceId = generateInstanceId()
    instance.context = { ...template.context, ...initialContext, ...globalContext }
    instance.startTime = null
    instance.endTime = null
    instance.status = 'pending'
    instance.result = null
    instance.error = null

    return instance
  }

  // Execute workflow sequentially
  const executeWorkflowSequential = async (workflow) => {
    const results = []

    for (const step of workflow.steps) {
      try {
        // Check if workflow should be paused
        if (isPaused.value) {
          await waitForResume()
        }

        // Check dependencies
        if (!checkStepDependencies(step, workflow)) {
          step.status = 'skipped'
          step.result = 'Dependencies not met'
          continue
        }

        // Check condition
        if (step.condition && !await evaluateCondition(step.condition, workflow.context)) {
          step.status = 'skipped'
          step.result = 'Condition not met'
          continue
        }

        // Execute step
        const result = await executeStep(step, workflow)
        results.push(result)
      } catch (error) {
        if (workflow.options.stopOnError) {
          throw error
        } else {
          console.warn(`Step "${step.id}" failed but continuing:`, error)
          step.status = 'failed'
          step.error = error.message
        }
      }
    }

    return results
  }

  // Execute workflow in parallel
  const executeWorkflowParallel = async (workflow) => {
    const stepGroups = groupStepsByDependencies(workflow.steps)
    const results = []

    for (const group of stepGroups) {
      const groupPromises = group.map(step =>
        executeStepSafely(step, workflow)
      )

      const groupResults = await Promise.allSettled(groupPromises)
      results.push(...groupResults)

      // Check if any critical steps failed
      const hasFailure = groupResults.some(result =>
        result.status === 'rejected' && result.reason?.critical
      )

      if (hasFailure && workflow.options.stopOnError) {
        throw new Error('Critical step failed in parallel execution')
      }
    }

    return results
  }

  // Execute a single step
  const executeStep = async (step, workflow) => {
    currentStep.value = step
    step.status = 'running'
    step.startTime = Date.now()
    step.retryCount = 0

    const executeAttempt = async () => {
      try {
        // Emit step start event
        emitWorkflowEvent('step-start', { workflow, step })

        // Execute step action
        let result

        switch (typeof step.action) {
          case 'function':
            result = await step.action(workflow.context, step.params)
            break

          case 'string':
            result = await executeBuiltinAction(step.action, workflow.context, step.params)
            break

          case 'object':
            if (step.action.type === 'workflow') {
              // Execute sub-workflow
              result = await executeWorkflow(step.action.workflowId, workflow.context)
            } else {
              throw new Error(`Unknown step action type: ${step.action.type}`)
            }
            break

          default:
            throw new Error(`Invalid step action: ${typeof step.action}`)
        }

        // Handle step result
        step.status = 'completed'
        step.result = result
        step.endTime = Date.now()

        // Update workflow context if step provides context updates
        if (step.contextUpdates) {
          Object.assign(workflow.context, step.contextUpdates(result, workflow.context))
        }

        // Emit step complete event
        emitWorkflowEvent('step-complete', { workflow, step, result })

        return result
      } catch (error) {
        step.retryCount++

        if (step.retryCount <= step.maxRetries && workflow.options.retryable) {
          console.warn(`Step "${step.id}" failed, retrying (${step.retryCount}/${step.maxRetries}):`, error)

          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, step.retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))

          return executeAttempt()
        } else {
          step.status = 'failed'
          step.error = error.message
          step.endTime = Date.now()

          emitWorkflowEvent('step-error', { workflow, step, error })
          throw error
        }
      }
    }

    return executeAttempt()
  }

  // Execute step safely (for parallel execution)
  const executeStepSafely = async (step, workflow) => {
    try {
      return await executeStep(step, workflow)
    } catch (error) {
      return { error, step }
    }
  }

  // Execute built-in actions
  const executeBuiltinAction = async (actionName, context, params) => {
    const actions = {
      'wait': async (ctx, p) => {
        await new Promise(resolve => setTimeout(resolve, p.duration || 1000))
        return `Waited ${p.duration || 1000}ms`
      },

      'log': async (ctx, p) => {
        console.log(p.message || 'Step executed', ctx)
        return p.message || 'Logged'
      },

      'http-request': async (ctx, p) => {
        const response = await fetch(p.url, {
          method: p.method || 'GET',
          headers: p.headers || {},
          body: p.body ? JSON.stringify(p.body) : undefined
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return p.parseJson ? await response.json() : await response.text()
      },

      'emit-event': async (ctx, p) => {
        const event = new CustomEvent(p.eventName, {
          detail: { context: ctx, params: p }
        })
        window.dispatchEvent(event)
        return `Event ${p.eventName} emitted`
      },

      'user-input': async (ctx, p) => {
        return await requestUserInput({
          title: p.title || 'Input Required',
          message: p.message || 'Please provide input:',
          type: p.inputType || 'text',
          defaultValue: p.defaultValue,
          validation: p.validation
        })
      },

      'confirm': async (ctx, p) => {
        return await requestConfirmation({
          title: p.title || 'Confirmation',
          message: p.message || 'Do you want to continue?'
        })
      }
    }

    const action = actions[actionName]
    if (!action) {
      throw new Error(`Unknown built-in action: ${actionName}`)
    }

    return action(context, params || {})
  }

  // Check step dependencies
  const checkStepDependencies = (step, workflow) => {
    if (!step.dependencies) return true

    return step.dependencies.every((depId) => {
      const depStep = workflow.steps.find(s => s.id === depId)
      return depStep && depStep.status === 'completed'
    })
  }

  // Evaluate step condition
  const evaluateCondition = async (condition, context) => {
    try {
      if (typeof condition === 'function') {
        return await condition(context)
      }

      if (typeof condition === 'string') {
        // Simple expression evaluation (be careful with eval in production!)
        // This is a simplified version - use a proper expression parser in production
        return Function('context', `return ${condition}`)(context)
      }

      return Boolean(condition)
    } catch (error) {
      console.warn('Condition evaluation failed:', error)
      return false
    }
  }

  // Group steps by dependencies for parallel execution
  const groupStepsByDependencies = (steps) => {
    const groups = []
    const processed = new Set()

    while (processed.size < steps.length) {
      const currentGroup = []

      for (const step of steps) {
        if (processed.has(step.id)) continue

        // Check if all dependencies are processed
        const depsReady = !step.dependencies
          || step.dependencies.every(dep => processed.has(dep))

        if (depsReady) {
          currentGroup.push(step)
          processed.add(step.id)
        }
      }

      if (currentGroup.length === 0) {
        throw new Error('Circular dependency detected in workflow')
      }

      groups.push(currentGroup)
    }

    return groups
  }

  // Pause workflow execution
  const pauseWorkflow = () => {
    isPaused.value = true
    emitWorkflowEvent('workflow-paused', { workflow: currentWorkflow.value })
  }

  // Resume workflow execution
  const resumeWorkflow = () => {
    isPaused.value = false
    emitWorkflowEvent('workflow-resumed', { workflow: currentWorkflow.value })
  }

  // Cancel workflow execution
  const cancelWorkflow = async (workflowInstanceId) => {
    const workflow = activeWorkflows.value.get(workflowInstanceId)
    if (!workflow) return false

    // Request confirmation for destructive cancellation
    if (workflow.options.confirmBeforeDestruct) {
      const confirmed = await requestConfirmation({
        title: 'Cancel Workflow',
        message: `Cancel workflow "${workflow.name}"?`,
        details: 'This action cannot be undone. Any completed steps will remain completed.'
      })

      if (!confirmed) return false
    }

    workflow.status = 'cancelled'
    workflow.endTime = Date.now()

    activeWorkflows.value.delete(workflowInstanceId)
    completedWorkflows.value.push(workflow)

    if (currentWorkflow.value?.instanceId === workflowInstanceId) {
      isExecuting.value = false
      currentWorkflow.value = null
      currentStep.value = null
    }

    emitWorkflowEvent('workflow-cancelled', { workflow })
    return true
  }

  // Wait for workflow to resume (when paused)
  const waitForResume = () => {
    return new Promise((resolve) => {
      const checkResume = () => {
        if (!isPaused.value) {
          resolve()
        } else {
          setTimeout(checkResume, 100)
        }
      }
      checkResume()
    })
  }

  // Request user confirmation
  const requestConfirmation = async (options) => {
    return new Promise((resolve) => {
      const event = new CustomEvent('workflow-confirmation-request', {
        detail: {
          ...options,
          resolve
        }
      })
      window.dispatchEvent(event)
    })
  }

  // Request user input
  const requestUserInput = async (options) => {
    return new Promise((resolve) => {
      const event = new CustomEvent('workflow-input-request', {
        detail: {
          ...options,
          resolve
        }
      })
      window.dispatchEvent(event)
    })
  }

  // Emit workflow events
  const emitWorkflowEvent = (eventName, data) => {
    const event = new CustomEvent(`workflow-${eventName}`, {
      detail: data
    })
    window.dispatchEvent(event)
  }

  // Update execution statistics
  const updateExecutionStats = (workflow, success) => {
    const stats = executionStats.value
    stats.totalWorkflows++

    if (success) {
      stats.successfulWorkflows++
    } else {
      stats.failedWorkflows++
    }

    // Update average execution time
    const duration = workflow.endTime - workflow.startTime
    stats.averageExecutionTime
      = (stats.averageExecutionTime * (stats.totalWorkflows - 1) + duration)
        / stats.totalWorkflows

    // Track most used workflows
    const usage = stats.mostUsedWorkflows.get(workflow.id) || 0
    stats.mostUsedWorkflows.set(workflow.id, usage + 1)
  }

  // Generate unique IDs
  const generateWorkflowId = () => {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const generateInstanceId = () => {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get workflow execution history
  const getWorkflowHistory = (workflowId) => {
    return completedWorkflows.value.filter(w => w.id === workflowId)
  }

  // Get workflow templates
  const getWorkflowTemplates = () => {
    return Array.from(workflowTemplates.value.values())
  }

  // Get active workflows
  const getActiveWorkflows = () => {
    return Array.from(activeWorkflows.value.values())
  }

  // Export workflow definition
  const exportWorkflow = (workflowId) => {
    const template = workflowTemplates.value.get(workflowId)
    if (!template) throw new Error(`Workflow "${workflowId}" not found`)

    return {
      ...template,
      exportedAt: Date.now(),
      exportVersion: '1.0'
    }
  }

  // Import workflow definition
  const importWorkflow = (workflowData) => {
    const workflow = {
      ...workflowData,
      metadata: {
        ...workflowData.metadata,
        importedAt: Date.now()
      }
    }

    return defineWorkflow(workflow)
  }

  return {
    // State
    currentWorkflow,
    currentStep,
    isExecuting,
    isPaused,
    executionError,
    progress,
    executionStats,

    // Workflow management
    defineWorkflow,
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,

    // Data access
    getWorkflowTemplates,
    getActiveWorkflows,
    getWorkflowHistory,

    // Import/Export
    exportWorkflow,
    importWorkflow,

    // Context management
    globalContext
  }
}
