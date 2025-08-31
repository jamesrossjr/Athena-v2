import { ref, computed } from 'vue'

export interface Project {
  id: string
  name: string
  description: string
  key: string // Project key/code (e.g., 'PROJ')
  type: 'software' | 'business' | 'marketing' | 'research'
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  visibility: 'private' | 'internal' | 'public'

  // Dates
  createdAt: Date
  updatedAt: Date
  startDate?: Date
  endDate?: Date

  // Team
  owner: TeamMember
  members: TeamMember[]

  // Structure
  repositories: Repository[]
  boards: Board[]
  sprints: Sprint[]
  releases: Release[]

  // Metrics
  progress: number
  budget?: {
    allocated: number
    spent: number
    currency: string
  }

  // Settings
  settings: ProjectSettings
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'product-owner' | 'scrum-master' | 'developer' | 'designer' | 'qa' | 'stakeholder'
  permissions: Permission[]
  workload: number // Hours per week
  status: 'active' | 'inactive' | 'vacation'
}

export interface Permission {
  resource: 'project' | 'board' | 'sprint' | 'issue' | 'repository'
  actions: ('view' | 'edit' | 'delete' | 'admin')[]
  conditions?: Record<string, any>
}

export interface Repository {
  id: string
  name: string
  url: string
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure'
  defaultBranch: string
  languages: string[]
  lastCommit?: {
    hash: string
    message: string
    author: string
    date: Date
  }
}

export interface Board {
  id: string
  name: string
  type: 'kanban' | 'scrum' | 'custom'
  description?: string
  columns: BoardColumn[]
  filters: BoardFilter[]
  issues: Issue[]
  settings: BoardSettings
}

export interface BoardColumn {
  id: string
  name: string
  status: IssueStatus
  wipLimit?: number
  position: number
}

export interface BoardFilter {
  id: string
  name: string
  query: string
  shared: boolean
  favorite: boolean
}

export interface BoardSettings {
  swimlanes: 'none' | 'assignee' | 'priority' | 'component'
  cardFields: string[]
  estimation: 'none' | 'story-points' | 'time' | 'both'
  workingDays: number[]
  hoursPerDay: number
}

export interface Issue {
  id: string
  key: string // PROJECT-123
  title: string
  description: string
  type: IssueType
  status: IssueStatus
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  severity?: 'minor' | 'major' | 'critical' | 'blocker'

  // Assignment
  assignee?: TeamMember
  reporter: TeamMember

  // Hierarchy
  parent?: string
  subtasks: string[]
  linkedIssues: IssueLink[]

  // Metadata
  components: Component[]
  versions: Version[]
  fixVersions: Version[]
  labels: string[]

  // Time tracking
  originalEstimate?: number // hours
  remainingEstimate?: number // hours
  timeSpent?: number // hours
  storyPoints?: number

  // Dates
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  resolutionDate?: Date

  // Workflow
  resolution?: 'fixed' | 'wont-fix' | 'duplicate' | 'invalid' | 'cannot-reproduce'

  // Comments and attachments
  comments: IssueComment[]
  attachments: Attachment[]

  // Custom fields
  customFields: Record<string, any>
}

export interface IssueType {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  subtask: boolean
}

export interface IssueStatus {
  id: string
  name: string
  category: 'to-do' | 'in-progress' | 'done'
  color: string
}

export interface IssueLink {
  id: string
  type: LinkType
  targetIssue: string
  direction: 'inward' | 'outward'
}

export interface LinkType {
  id: string
  name: string
  inward: string // "blocks"
  outward: string // "is blocked by"
}

export interface Component {
  id: string
  name: string
  description?: string
  lead?: TeamMember
  assigneeType: 'project-default' | 'component-lead' | 'project-lead' | 'unassigned'
}

export interface Version {
  id: string
  name: string
  description?: string
  archived: boolean
  released: boolean
  releaseDate?: Date
  startDate?: Date
}

export interface IssueComment {
  id: string
  author: TeamMember
  body: string
  createdAt: Date
  updatedAt?: Date
  visibility?: 'public' | 'internal' | 'private'
}

export interface Attachment {
  id: string
  filename: string
  size: number
  mimeType: string
  url: string
  author: TeamMember
  createdAt: Date
}

export interface Sprint {
  id: string
  name: string
  goal?: string
  state: 'future' | 'active' | 'closed'
  boardId: string

  // Dates
  startDate: Date
  endDate: Date
  completeDate?: Date

  // Issues
  issues: string[]
  committedIssues: string[]

  // Metrics
  velocity?: number
  commitment?: number
  completed?: number

  // Retrospective
  retrospective?: {
    whatWentWell: string[]
    whatCouldImprove: string[]
    actionItems: ActionItem[]
  }
}

export interface ActionItem {
  id: string
  description: string
  assignee?: TeamMember
  dueDate?: Date
  status: 'open' | 'in-progress' | 'done'
}

export interface Release {
  id: string
  name: string
  version: string
  description?: string
  status: 'planning' | 'in-progress' | 'ready' | 'released'

  // Dates
  targetDate?: Date
  releaseDate?: Date

  // Content
  features: string[]
  fixVersions: string[]

  // Deployment
  environments: {
    name: string
    deployed: boolean
    deployedAt?: Date
    version?: string
  }[]

  // Documentation
  releaseNotes?: string
  changelog?: string

  // Metrics
  burndown?: BurndownPoint[]
}

export interface BurndownPoint {
  date: Date
  remaining: number
  ideal: number
  actual: number
}

export interface ProjectSettings {
  workflow: WorkflowSettings
  notifications: NotificationSettings
  integrations: IntegrationSettings
  permissions: PermissionSettings
}

export interface WorkflowSettings {
  defaultAssignee: 'project-lead' | 'component-lead' | 'unassigned'
  issueTypes: IssueType[]
  statuses: IssueStatus[]
  transitions: WorkflowTransition[]
  resolutions: Resolution[]
}

export interface WorkflowTransition {
  id: string
  name: string
  from: string[]
  to: string
  conditions?: string[]
  validators?: string[]
  postFunctions?: string[]
}

export interface Resolution {
  id: string
  name: string
  description?: string
}

export interface NotificationSettings {
  email: {
    enabled: boolean
    events: string[]
    frequency: 'instant' | 'daily' | 'weekly'
  }
  inApp: {
    enabled: boolean
    events: string[]
  }
  webhook?: {
    url: string
    events: string[]
    secret?: string
  }
}

export interface IntegrationSettings {
  git: {
    enabled: boolean
    repositories: string[]
    smartCommits: boolean
    branchNaming: string
  }
  cicd: {
    enabled: boolean
    providers: string[]
    deploymentTracking: boolean
  }
  monitoring: {
    enabled: boolean
    tools: string[]
    errorTracking: boolean
  }
}

export interface PermissionSettings {
  scheme: string
  roles: ProjectRole[]
  globalPermissions: string[]
}

export interface ProjectRole {
  id: string
  name: string
  description?: string
  permissions: string[]
}

export const useProjectManagement = () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const issues = ref<Issue[]>([])
  const sprints = ref<Sprint[]>([])
  const releases = ref<Release[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Project management
  async function loadProjects(): Promise<void> {
    try {
      isLoading.value = true
      error.value = null

      const data = await fetchProjects()
      projects.value = data
    } catch (err) {
      error.value = `Failed to load projects: ${err.message}`
      console.error(err)
    } finally {
      isLoading.value = false
    }
  }

  async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'progress'>): Promise<string> {
    try {
      const project = await createProjectRecord(projectData)
      projects.value.push(project)
      return project.id
    } catch (err) {
      error.value = `Failed to create project: ${err.message}`
      throw err
    }
  }

  async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      await updateProjectRecord(projectId, updates)

      const project = projects.value.find(p => p.id === projectId)
      if (project) {
        Object.assign(project, updates)
        project.updatedAt = new Date()
      }
    } catch (err) {
      error.value = `Failed to update project: ${err.message}`
      throw err
    }
  }

  async function deleteProject(projectId: string): Promise<void> {
    try {
      await deleteProjectRecord(projectId)

      const index = projects.value.findIndex(p => p.id === projectId)
      if (index >= 0) {
        projects.value.splice(index, 1)
      }

      if (currentProject.value?.id === projectId) {
        currentProject.value = null
      }
    } catch (err) {
      error.value = `Failed to delete project: ${err.message}`
      throw err
    }
  }

  async function selectProject(projectId: string): Promise<void> {
    try {
      const project = await fetchProjectDetails(projectId)
      currentProject.value = project

      // Load project data
      await Promise.all([
        loadProjectIssues(projectId),
        loadProjectSprints(projectId),
        loadProjectReleases(projectId)
      ])
    } catch (err) {
      error.value = `Failed to select project: ${err.message}`
      throw err
    }
  }

  // Issue management
  async function loadProjectIssues(projectId: string, filters?: {
    status?: string[]
    assignee?: string
    sprint?: string
    type?: string[]
    priority?: string[]
  }): Promise<void> {
    try {
      const data = await fetchIssues(projectId, filters)
      issues.value = data
    } catch (err) {
      error.value = `Failed to load issues: ${err.message}`
      console.error(err)
    }
  }

  async function createIssue(issueData: Omit<Issue, 'id' | 'key' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const issue = await createIssueRecord(issueData)
      issues.value.unshift(issue)
      return issue.id
    } catch (err) {
      error.value = `Failed to create issue: ${err.message}`
      throw err
    }
  }

  async function updateIssue(issueId: string, updates: Partial<Issue>): Promise<void> {
    try {
      await updateIssueRecord(issueId, updates)

      const issue = issues.value.find(i => i.id === issueId)
      if (issue) {
        Object.assign(issue, updates)
        issue.updatedAt = new Date()
      }
    } catch (err) {
      error.value = `Failed to update issue: ${err.message}`
      throw err
    }
  }

  async function deleteIssue(issueId: string): Promise<void> {
    try {
      await deleteIssueRecord(issueId)

      const index = issues.value.findIndex(i => i.id === issueId)
      if (index >= 0) {
        issues.value.splice(index, 1)
      }
    } catch (err) {
      error.value = `Failed to delete issue: ${err.message}`
      throw err
    }
  }

  async function transitionIssue(issueId: string, transitionId: string): Promise<void> {
    try {
      await executeIssueTransition(issueId, transitionId)

      // Reload issue to get updated status
      const updatedIssue = await fetchIssueDetails(issueId)
      const index = issues.value.findIndex(i => i.id === issueId)
      if (index >= 0) {
        issues.value[index] = updatedIssue
      }
    } catch (err) {
      error.value = `Failed to transition issue: ${err.message}`
      throw err
    }
  }

  async function assignIssue(issueId: string, assigneeId?: string): Promise<void> {
    try {
      await assignIssueToUser(issueId, assigneeId)

      const issue = issues.value.find(i => i.id === issueId)
      if (issue && currentProject.value) {
        issue.assignee = assigneeId
          ? currentProject.value.members.find(m => m.id === assigneeId)
          : undefined
        issue.updatedAt = new Date()
      }
    } catch (err) {
      error.value = `Failed to assign issue: ${err.message}`
      throw err
    }
  }

  async function logWork(issueId: string, timeSpent: number, comment?: string): Promise<void> {
    try {
      await logWorkOnIssue(issueId, timeSpent, comment)

      const issue = issues.value.find(i => i.id === issueId)
      if (issue) {
        issue.timeSpent = (issue.timeSpent || 0) + timeSpent
        if (issue.remainingEstimate && issue.remainingEstimate > timeSpent) {
          issue.remainingEstimate -= timeSpent
        }
        issue.updatedAt = new Date()
      }
    } catch (err) {
      error.value = `Failed to log work: ${err.message}`
      throw err
    }
  }

  // Sprint management
  async function loadProjectSprints(projectId: string): Promise<void> {
    try {
      const data = await fetchSprints(projectId)
      sprints.value = data
    } catch (err) {
      error.value = `Failed to load sprints: ${err.message}`
      console.error(err)
    }
  }

  async function createSprint(sprintData: Omit<Sprint, 'id'>): Promise<string> {
    try {
      const sprint = await createSprintRecord(sprintData)
      sprints.value.push(sprint)
      return sprint.id
    } catch (err) {
      error.value = `Failed to create sprint: ${err.message}`
      throw err
    }
  }

  async function startSprint(sprintId: string): Promise<void> {
    try {
      await startSprintExecution(sprintId)

      const sprint = sprints.value.find(s => s.id === sprintId)
      if (sprint) {
        sprint.state = 'active'
      }
    } catch (err) {
      error.value = `Failed to start sprint: ${err.message}`
      throw err
    }
  }

  async function completeSprint(sprintId: string): Promise<void> {
    try {
      await completeSprintExecution(sprintId)

      const sprint = sprints.value.find(s => s.id === sprintId)
      if (sprint) {
        sprint.state = 'closed'
        sprint.completeDate = new Date()
      }
    } catch (err) {
      error.value = `Failed to complete sprint: ${err.message}`
      throw err
    }
  }

  async function addIssueToSprint(issueId: string, sprintId: string): Promise<void> {
    try {
      await addIssueToSprintRecord(issueId, sprintId)

      const sprint = sprints.value.find(s => s.id === sprintId)
      if (sprint && !sprint.issues.includes(issueId)) {
        sprint.issues.push(issueId)
      }
    } catch (err) {
      error.value = `Failed to add issue to sprint: ${err.message}`
      throw err
    }
  }

  async function removeIssueFromSprint(issueId: string, sprintId: string): Promise<void> {
    try {
      await removeIssueFromSprintRecord(issueId, sprintId)

      const sprint = sprints.value.find(s => s.id === sprintId)
      if (sprint) {
        const index = sprint.issues.indexOf(issueId)
        if (index >= 0) {
          sprint.issues.splice(index, 1)
        }
      }
    } catch (err) {
      error.value = `Failed to remove issue from sprint: ${err.message}`
      throw err
    }
  }

  // Release management
  async function loadProjectReleases(projectId: string): Promise<void> {
    try {
      const data = await fetchReleases(projectId)
      releases.value = data
    } catch (err) {
      error.value = `Failed to load releases: ${err.message}`
      console.error(err)
    }
  }

  async function createRelease(releaseData: Omit<Release, 'id'>): Promise<string> {
    try {
      const release = await createReleaseRecord(releaseData)
      releases.value.push(release)
      return release.id
    } catch (err) {
      error.value = `Failed to create release: ${err.message}`
      throw err
    }
  }

  async function updateRelease(releaseId: string, updates: Partial<Release>): Promise<void> {
    try {
      await updateReleaseRecord(releaseId, updates)

      const release = releases.value.find(r => r.id === releaseId)
      if (release) {
        Object.assign(release, updates)
      }
    } catch (err) {
      error.value = `Failed to update release: ${err.message}`
      throw err
    }
  }

  async function deployRelease(releaseId: string, environment: string): Promise<void> {
    try {
      await deployReleaseToEnvironment(releaseId, environment)

      const release = releases.value.find(r => r.id === releaseId)
      if (release) {
        const env = release.environments.find(e => e.name === environment)
        if (env) {
          env.deployed = true
          env.deployedAt = new Date()
          env.version = release.version
        }
      }
    } catch (err) {
      error.value = `Failed to deploy release: ${err.message}`
      throw err
    }
  }

  // Analytics and reporting
  async function getProjectVelocity(projectId: string, sprints: number = 5): Promise<number[]> {
    try {
      return await calculateProjectVelocity(projectId, sprints)
    } catch (err) {
      error.value = `Failed to get velocity: ${err.message}`
      return []
    }
  }

  async function getBurndownData(sprintId: string): Promise<BurndownPoint[]> {
    try {
      return await generateBurndownChart(sprintId)
    } catch (err) {
      error.value = `Failed to get burndown data: ${err.message}`
      return []
    }
  }

  async function getTeamWorkload(projectId: string): Promise<{ member: TeamMember, workload: number, capacity: number }[]> {
    try {
      return await calculateTeamWorkload(projectId)
    } catch (err) {
      error.value = `Failed to get team workload: ${err.message}`
      return []
    }
  }

  // Mock API implementations (would be replaced with real backend calls)
  async function fetchProjects(): Promise<Project[]> {
    // Mock implementation
    return []
  }

  async function createProjectRecord(projectData: any): Promise<Project> {
    // Mock implementation
    return {
      ...projectData,
      id: 'proj-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0
    }
  }

  async function updateProjectRecord(projectId: string, updates: any): Promise<void> {
    // Mock implementation
  }

  async function deleteProjectRecord(projectId: string): Promise<void> {
    // Mock implementation
  }

  async function fetchProjectDetails(projectId: string): Promise<Project> {
    // Mock implementation
    const project = projects.value.find(p => p.id === projectId)
    return project || await createProjectRecord({ name: 'Mock Project', key: 'MOCK' })
  }

  async function fetchIssues(projectId: string, filters?: any): Promise<Issue[]> {
    // Mock implementation
    return []
  }

  async function createIssueRecord(issueData: any): Promise<Issue> {
    // Mock implementation
    return {
      ...issueData,
      id: 'issue-' + Date.now(),
      key: 'PROJ-' + Math.floor(Math.random() * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      attachments: [],
      customFields: {}
    }
  }

  async function updateIssueRecord(issueId: string, updates: any): Promise<void> {
    // Mock implementation
  }

  async function deleteIssueRecord(issueId: string): Promise<void> {
    // Mock implementation
  }

  async function executeIssueTransition(issueId: string, transitionId: string): Promise<void> {
    // Mock implementation
  }

  async function fetchIssueDetails(issueId: string): Promise<Issue> {
    // Mock implementation
    return issues.value.find(i => i.id === issueId) || await createIssueRecord({ title: 'Mock Issue' })
  }

  async function assignIssueToUser(issueId: string, assigneeId?: string): Promise<void> {
    // Mock implementation
  }

  async function logWorkOnIssue(issueId: string, timeSpent: number, comment?: string): Promise<void> {
    // Mock implementation
  }

  async function fetchSprints(projectId: string): Promise<Sprint[]> {
    // Mock implementation
    return []
  }

  async function createSprintRecord(sprintData: any): Promise<Sprint> {
    // Mock implementation
    return {
      ...sprintData,
      id: 'sprint-' + Date.now()
    }
  }

  async function startSprintExecution(sprintId: string): Promise<void> {
    // Mock implementation
  }

  async function completeSprintExecution(sprintId: string): Promise<void> {
    // Mock implementation
  }

  async function addIssueToSprintRecord(issueId: string, sprintId: string): Promise<void> {
    // Mock implementation
  }

  async function removeIssueFromSprintRecord(issueId: string, sprintId: string): Promise<void> {
    // Mock implementation
  }

  async function fetchReleases(projectId: string): Promise<Release[]> {
    // Mock implementation
    return []
  }

  async function createReleaseRecord(releaseData: any): Promise<Release> {
    // Mock implementation
    return {
      ...releaseData,
      id: 'release-' + Date.now()
    }
  }

  async function updateReleaseRecord(releaseId: string, updates: any): Promise<void> {
    // Mock implementation
  }

  async function deployReleaseToEnvironment(releaseId: string, environment: string): Promise<void> {
    // Mock implementation
  }

  async function calculateProjectVelocity(projectId: string, sprints: number): Promise<number[]> {
    // Mock implementation
    return Array.from({ length: sprints }, () => Math.floor(Math.random() * 50) + 10)
  }

  async function generateBurndownChart(sprintId: string): Promise<BurndownPoint[]> {
    // Mock implementation
    return []
  }

  async function calculateTeamWorkload(projectId: string): Promise<any[]> {
    // Mock implementation
    return []
  }

  const activeProjects = computed(() =>
    projects.value.filter(p => p.status === 'active')
  )

  const myIssues = computed(() =>
    issues.value.filter(i => i.assignee?.id === 'current-user-id')
  )

  const activeSprint = computed(() =>
    sprints.value.find(s => s.state === 'active')
  )

  const upcomingReleases = computed(() =>
    releases.value.filter(r => r.status === 'in-progress' && r.targetDate && r.targetDate > new Date())
      .sort((a, b) => (a.targetDate!.getTime() - b.targetDate!.getTime()))
  )

  const overdueTasks = computed(() =>
    issues.value.filter(i => i.dueDate && i.dueDate < new Date() && i.status.category !== 'done')
  )

  return {
    projects,
    currentProject,
    issues,
    sprints,
    releases,
    isLoading,
    error,
    activeProjects,
    myIssues,
    activeSprint,
    upcomingReleases,
    overdueTasks,

    // Project methods
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,

    // Issue methods
    loadProjectIssues,
    createIssue,
    updateIssue,
    deleteIssue,
    transitionIssue,
    assignIssue,
    logWork,

    // Sprint methods
    loadProjectSprints,
    createSprint,
    startSprint,
    completeSprint,
    addIssueToSprint,
    removeIssueFromSprint,

    // Release methods
    loadProjectReleases,
    createRelease,
    updateRelease,
    deployRelease,

    // Analytics
    getProjectVelocity,
    getBurndownData,
    getTeamWorkload
  }
}
