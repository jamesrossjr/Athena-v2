import { ref, computed, reactive } from 'vue'

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen: Date
  permissions: Permission[]
  currentFile?: string
  cursor?: CursorPosition
}

export interface Permission {
  resource: string
  actions: ('read' | 'write' | 'delete' | 'admin')[]
}

export interface CursorPosition {
  file: string
  line: number
  column: number
  selection?: {
    start: { line: number, column: number }
    end: { line: number, column: number }
  }
}

export interface LiveEdit {
  id: string
  userId: string
  file: string
  timestamp: Date
  operation: 'insert' | 'delete' | 'replace'
  position: { line: number, column: number }
  content: string
  oldContent?: string
}

export interface CodeReview {
  id: string
  title: string
  description: string
  author: TeamMember
  reviewers: TeamMember[]
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'merged'
  createdAt: Date
  updatedAt: Date
  files: ReviewFile[]
  comments: ReviewComment[]
  approval: {
    required: number
    received: number
    approvers: string[]
  }
  branch: string
  targetBranch: string
  commits: GitCommit[]
}

export interface ReviewFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldPath?: string
  diff: FileDiff[]
}

export interface FileDiff {
  type: 'context' | 'addition' | 'deletion'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

export interface ReviewComment {
  id: string
  author: TeamMember
  content: string
  timestamp: Date
  file?: string
  line?: number
  type: 'general' | 'inline' | 'suggestion'
  suggestion?: string
  resolved: boolean
  replies: ReviewComment[]
}

export interface GitCommit {
  id: string
  message: string
  author: {
    name: string
    email: string
  }
  timestamp: Date
  files: string[]
}

export interface ChatMessage {
  id: string
  author: TeamMember
  content: string
  timestamp: Date
  type: 'text' | 'file' | 'code' | 'system'
  file?: string
  codeSnippet?: {
    language: string
    code: string
    file?: string
    startLine?: number
    endLine?: number
  }
  edited?: boolean
  reactions: Reaction[]
}

export interface Reaction {
  emoji: string
  users: string[]
}

export interface WorkspaceSession {
  id: string
  name: string
  participants: TeamMember[]
  host: TeamMember
  startTime: Date
  endTime?: Date
  type: 'pair-programming' | 'code-review' | 'planning' | 'debug'
  sharedFiles: string[]
  recordings?: SessionRecording[]
}

export interface SessionRecording {
  id: string
  startTime: Date
  duration: number
  participants: string[]
  events: SessionEvent[]
}

export interface SessionEvent {
  timestamp: Date
  type: 'edit' | 'cursor' | 'selection' | 'file-open' | 'chat' | 'voice'
  userId: string
  data: any
}

export const useTeamCollaboration = () => {
  const currentUser = ref<TeamMember | null>(null)
  const teamMembers = ref<TeamMember[]>([])
  const activeSession = ref<WorkspaceSession | null>(null)
  const liveEdits = ref<LiveEdit[]>([])
  const codeReviews = ref<CodeReview[]>([])
  const chatMessages = ref<ChatMessage[]>([])
  const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')

  // WebSocket connection for real-time collaboration
  let websocket: WebSocket | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5

  // Real-time collaboration
  async function connectToCollaboration(workspaceId: string, userId: string): Promise<void> {
    try {
      connectionStatus.value = 'connecting'

      // Initialize WebSocket connection
      websocket = new WebSocket(`ws://localhost:3001/collaboration/${workspaceId}`)

      websocket.onopen = () => {
        connectionStatus.value = 'connected'
        reconnectAttempts = 0

        // Authenticate
        sendMessage({
          type: 'auth',
          userId,
          timestamp: new Date()
        })

        // Request initial state
        sendMessage({
          type: 'request-state',
          userId,
          timestamp: new Date()
        })
      }

      websocket.onmessage = (event) => {
        handleIncomingMessage(JSON.parse(event.data))
      }

      websocket.onclose = () => {
        connectionStatus.value = 'disconnected'
        handleReconnection(workspaceId, userId)
      }

      websocket.onerror = (error) => {
        console.error('Collaboration WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to connect to collaboration:', error)
      connectionStatus.value = 'disconnected'
    }
  }

  function disconnectFromCollaboration(): void {
    if (websocket) {
      websocket.close()
      websocket = null
    }
    connectionStatus.value = 'disconnected'
  }

  async function handleReconnection(workspaceId: string, userId: string): Promise<void> {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++
      const delay = Math.pow(2, reconnectAttempts) * 1000 // Exponential backoff

      setTimeout(() => {
        connectToCollaboration(workspaceId, userId)
      }, delay)
    }
  }

  function sendMessage(message: any): void {
    if (websocket?.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(message))
    }
  }

  function handleIncomingMessage(message: any): void {
    switch (message.type) {
      case 'user-joined':
        handleUserJoined(message.user)
        break
      case 'user-left':
        handleUserLeft(message.userId)
        break
      case 'live-edit':
        handleLiveEdit(message.edit)
        break
      case 'cursor-update':
        handleCursorUpdate(message.userId, message.position)
        break
      case 'chat-message':
        handleChatMessage(message.message)
        break
      case 'file-opened':
        handleFileOpened(message.userId, message.file)
        break
      case 'state-update':
        handleStateUpdate(message.state)
        break
    }
  }

  // Live editing
  function broadcastEdit(file: string, operation: LiveEdit['operation'], position: CursorPosition, content: string, oldContent?: string): void {
    const edit: LiveEdit = {
      id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.value?.id || '',
      file,
      timestamp: new Date(),
      operation,
      position: { line: position.line, column: position.column },
      content,
      oldContent
    }

    liveEdits.value.push(edit)

    sendMessage({
      type: 'live-edit',
      edit,
      timestamp: new Date()
    })
  }

  function handleLiveEdit(edit: LiveEdit): void {
    // Apply edit to local document
    liveEdits.value.push(edit)

    // Emit event for editor to apply changes
    document.dispatchEvent(new CustomEvent('live-edit', { detail: edit }))
  }

  function broadcastCursorUpdate(file: string, position: CursorPosition): void {
    if (currentUser.value) {
      currentUser.value.currentFile = file
      currentUser.value.cursor = position

      sendMessage({
        type: 'cursor-update',
        userId: currentUser.value.id,
        position,
        file,
        timestamp: new Date()
      })
    }
  }

  function handleCursorUpdate(userId: string, position: CursorPosition): void {
    const member = teamMembers.value.find(m => m.id === userId)
    if (member) {
      member.cursor = position
      member.currentFile = position.file
    }
  }

  // Chat system
  function sendChatMessage(content: string, type: ChatMessage['type'] = 'text', metadata?: any): void {
    if (!currentUser.value) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: currentUser.value,
      content,
      timestamp: new Date(),
      type,
      reactions: [],
      ...metadata
    }

    chatMessages.value.push(message)

    sendMessage({
      type: 'chat-message',
      message,
      timestamp: new Date()
    })
  }

  function sendCodeSnippet(code: string, language: string, file?: string, startLine?: number, endLine?: number): void {
    sendChatMessage('', 'code', {
      codeSnippet: {
        code,
        language,
        file,
        startLine,
        endLine
      }
    })
  }

  function addReaction(messageId: string, emoji: string): void {
    const message = chatMessages.value.find(m => m.id === messageId)
    if (message && currentUser.value) {
      let reaction = message.reactions.find(r => r.emoji === emoji)

      if (!reaction) {
        reaction = { emoji, users: [] }
        message.reactions.push(reaction)
      }

      if (!reaction.users.includes(currentUser.value.id)) {
        reaction.users.push(currentUser.value.id)
      }

      sendMessage({
        type: 'reaction',
        messageId,
        emoji,
        userId: currentUser.value.id,
        timestamp: new Date()
      })
    }
  }

  function handleChatMessage(message: ChatMessage): void {
    chatMessages.value.push(message)
  }

  // Code review system
  async function createCodeReview(title: string, description: string, branch: string, targetBranch: string = 'main'): Promise<string> {
    if (!currentUser.value) throw new Error('User not authenticated')

    // Get commits for the branch
    const commits = await getCommitsForBranch(branch, targetBranch)
    const files = await getChangedFiles(branch, targetBranch)

    const review: CodeReview = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      author: currentUser.value,
      reviewers: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      files,
      comments: [],
      approval: {
        required: 1,
        received: 0,
        approvers: []
      },
      branch,
      targetBranch,
      commits
    }

    codeReviews.value.push(review)

    // Sync with server
    await syncCodeReview(review)

    return review.id
  }

  async function requestReview(reviewId: string, reviewerIds: string[]): Promise<void> {
    const review = codeReviews.value.find(r => r.id === reviewId)
    if (!review) return

    const reviewers = teamMembers.value.filter(m => reviewerIds.includes(m.id))
    review.reviewers = reviewers
    review.status = 'pending'
    review.updatedAt = new Date()

    // Notify reviewers
    sendMessage({
      type: 'review-request',
      reviewId,
      reviewers: reviewerIds,
      timestamp: new Date()
    })

    await syncCodeReview(review)
  }

  async function addReviewComment(reviewId: string, content: string, file?: string, line?: number, suggestion?: string): Promise<void> {
    if (!currentUser.value) return

    const review = codeReviews.value.find(r => r.id === reviewId)
    if (!review) return

    const comment: ReviewComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      author: currentUser.value,
      content,
      timestamp: new Date(),
      file,
      line,
      type: suggestion ? 'suggestion' : (file ? 'inline' : 'general'),
      suggestion,
      resolved: false,
      replies: []
    }

    review.comments.push(comment)
    review.updatedAt = new Date()

    sendMessage({
      type: 'review-comment',
      reviewId,
      comment,
      timestamp: new Date()
    })

    await syncCodeReview(review)
  }

  async function approveReview(reviewId: string): Promise<void> {
    if (!currentUser.value) return

    const review = codeReviews.value.find(r => r.id === reviewId)
    if (!review) return

    if (!review.approval.approvers.includes(currentUser.value.id)) {
      review.approval.approvers.push(currentUser.value.id)
      review.approval.received++
    }

    if (review.approval.received >= review.approval.required) {
      review.status = 'approved'
    }

    review.updatedAt = new Date()

    sendMessage({
      type: 'review-approval',
      reviewId,
      approverId: currentUser.value.id,
      timestamp: new Date()
    })

    await syncCodeReview(review)
  }

  async function mergeReview(reviewId: string): Promise<void> {
    const review = codeReviews.value.find(r => r.id === reviewId)
    if (!review || review.status !== 'approved') return

    // Perform merge operation
    await mergeBranch(review.branch, review.targetBranch)

    review.status = 'merged'
    review.updatedAt = new Date()

    sendMessage({
      type: 'review-merged',
      reviewId,
      timestamp: new Date()
    })

    await syncCodeReview(review)
  }

  // Session management
  async function startSession(name: string, type: WorkspaceSession['type']): Promise<string> {
    if (!currentUser.value) throw new Error('User not authenticated')

    const session: WorkspaceSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      participants: [currentUser.value],
      host: currentUser.value,
      startTime: new Date(),
      type,
      sharedFiles: []
    }

    activeSession.value = session

    sendMessage({
      type: 'session-start',
      session,
      timestamp: new Date()
    })

    return session.id
  }

  async function joinSession(sessionId: string): Promise<void> {
    if (!currentUser.value) return

    sendMessage({
      type: 'session-join',
      sessionId,
      userId: currentUser.value.id,
      timestamp: new Date()
    })
  }

  async function leaveSession(): Promise<void> {
    if (!currentUser.value || !activeSession.value) return

    sendMessage({
      type: 'session-leave',
      sessionId: activeSession.value.id,
      userId: currentUser.value.id,
      timestamp: new Date()
    })

    activeSession.value = null
  }

  // Event handlers
  function handleUserJoined(user: TeamMember): void {
    if (!teamMembers.value.find(m => m.id === user.id)) {
      teamMembers.value.push(user)
    }
  }

  function handleUserLeft(userId: string): void {
    const index = teamMembers.value.findIndex(m => m.id === userId)
    if (index >= 0) {
      teamMembers.value.splice(index, 1)
    }
  }

  function handleFileOpened(userId: string, file: string): void {
    const member = teamMembers.value.find(m => m.id === userId)
    if (member) {
      member.currentFile = file
    }
  }

  function handleStateUpdate(state: any): void {
    if (state.teamMembers) {
      teamMembers.value = state.teamMembers
    }
    if (state.chatMessages) {
      chatMessages.value = state.chatMessages
    }
    if (state.activeSession) {
      activeSession.value = state.activeSession
    }
  }

  // Utility functions
  async function getCommitsForBranch(branch: string, baseBranch: string): Promise<GitCommit[]> {
    // Implementation would integrate with Git API
    return []
  }

  async function getChangedFiles(branch: string, baseBranch: string): Promise<ReviewFile[]> {
    // Implementation would integrate with Git API
    return []
  }

  async function mergeBranch(sourceBranch: string, targetBranch: string): Promise<void> {
    // Implementation would integrate with Git API
  }

  async function syncCodeReview(review: CodeReview): Promise<void> {
    // Sync with server API
  }

  const onlineMembers = computed(() =>
    teamMembers.value.filter(m => m.status === 'online')
  )

  const pendingReviews = computed(() =>
    codeReviews.value.filter(r => r.status === 'pending')
  )

  const myReviews = computed(() =>
    codeReviews.value.filter(r =>
      r.author.id === currentUser.value?.id
      || r.reviewers.some(rev => rev.id === currentUser.value?.id)
    )
  )

  const recentMessages = computed(() =>
    chatMessages.value.slice(-50)
  )

  return {
    currentUser,
    teamMembers,
    activeSession,
    liveEdits,
    codeReviews,
    chatMessages,
    connectionStatus,
    onlineMembers,
    pendingReviews,
    myReviews,
    recentMessages,

    // Connection
    connectToCollaboration,
    disconnectFromCollaboration,

    // Live editing
    broadcastEdit,
    broadcastCursorUpdate,

    // Chat
    sendChatMessage,
    sendCodeSnippet,
    addReaction,

    // Code review
    createCodeReview,
    requestReview,
    addReviewComment,
    approveReview,
    mergeReview,

    // Sessions
    startSession,
    joinSession,
    leaveSession
  }
}
