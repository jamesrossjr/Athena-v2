# Canvas Digital Workspace - Architecture Documentation

## System Architecture Overview

Canvas is a modern, AI-powered digital workspace built with a modular, scalable architecture. The system follows a frontend-centric approach with progressive enhancement, enabling rich user experiences across web and mobile platforms.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Web App (Nuxt 4)  │  Mobile PWA  │  Native Apps (Capacitor) │
│  - Vue 3 Components │  - Service   │  - iOS App               │
│  - Nuxt UI/Tailwind │    Workers   │  - Android App           │
│  - Client Routing   │  - Offline   │  - Native APIs           │
│                     │    Storage   │                          │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Features & Business Logic                                   │
│  ├── AI Assistant (Multi-provider)                          │
│  ├── Workspace Views (Blocks, IDE, Database, etc.)         │
│  ├── Real-time Collaboration                                │
│  ├── File System Management                                 │
│  └── Extension Platform                                     │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Backend Services (Nitro Server)                            │
│  ├── API Gateway & Routing                                  │
│  ├── Authentication & Authorization                         │
│  ├── WebSocket Server (Real-time)                          │
│  ├── File Storage & Management                             │
│  └── External Integrations                                 │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Primary)  │  Redis (Cache)  │  IndexedDB (Local)│
│  - User Data           │  - Sessions     │  - Offline Storage │
│  - Documents           │  - Real-time    │  - User Preferences│
│  - Collaborations      │    Events       │  - Draft Changes   │
│  - Audit Logs          │  - AI Cache     │                    │
├─────────────────────────────────────────────────────────────┤
│                   External Services                          │
├─────────────────────────────────────────────────────────────┤
│  AI Providers    │  Cloud Storage  │  CDN & Infrastructure   │
│  - OpenAI        │  - Vercel Blob  │  - Vercel Edge Network  │
│  - Claude        │  - Supabase     │  - Geographic Distribution│
│  - Gemini        │    Storage      │  - Static Asset Caching │
│  - Ollama (Local)│                 │                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **Framework:** Nuxt 4.0 with Vue 3 Composition API
- **UI Library:** Nuxt UI (built on Tailwind CSS)
- **State Management:** Vue Composables pattern
- **Routing:** File-based routing with dynamic imports
- **Build Tool:** Vite with optimized bundling
- **Testing:** Vitest with Vue Testing Library

### Component Architecture

```
app/
├── components/          # Reusable UI components
│   ├── blocks/         # Block editor components
│   │   ├── CodeBlock.vue
│   │   ├── EmbedBlock.vue
│   │   ├── MediaBlock.vue
│   │   └── TableBlock.vue
│   ├── BlockEditor.vue       # Main block editor
│   ├── CleanEditor.vue       # IDE-style editor
│   ├── DatabaseEditor.vue    # Database interface
│   ├── FileExplorer.vue      # File system browser
│   ├── GraphView3D.vue       # 3D visualization
│   ├── IDECodeEditor.vue     # Monaco-based code editor
│   ├── Terminal.vue          # Terminal emulator
│   └── WhiteboardEditor.vue  # Canvas drawing tool
├── features/           # Feature-specific modules
│   └── ai/            # AI functionality
│       ├── components/
│       │   └── AIAssistant.vue    # Universal AI interface
│       └── composables/
│           ├── useAI.js           # AI provider abstraction
│           └── useContextAwareness.js  # Smart context detection
├── pages/             # Route components
│   ├── index.vue      # Landing page
│   └── workspace.vue  # Main application interface
├── composables/       # Shared business logic
│   ├── useFileSystem.ts      # File operations
│   ├── useKeyboardShortcuts.ts # Global shortcuts
│   ├── useLocalWorkspace.ts   # Local state management
│   ├── useOverlayManager.ts   # Modal/overlay system
│   └── useWorkspace.ts        # Workspace state
└── layouts/           # Page layouts
    └── default.vue    # Base application layout
```

### State Management Pattern

Canvas uses Vue 3's Composition API with a composables-based state management pattern instead of a centralized store like Vuex. This approach provides:

1. **Modular State:** Each feature manages its own state
2. **Type Safety:** Full TypeScript support
3. **Tree Shaking:** Only used composables are included
4. **Testing:** Easy unit testing of individual composables

#### Key Composables

```typescript
// useWorkspace.ts - Main workspace state
interface WorkspaceState {
  currentView: 'blocks' | 'ide' | 'database' | 'whiteboard' | 'graph3d'
  documents: Document[]
  activeDocument: string | null
  isLoading: boolean
  collaborators: User[]
}

// useAI.js - AI integration state
interface AIState {
  isOpen: boolean
  provider: 'openai' | 'claude' | 'gemini' | 'ollama'
  conversation: Message[]
  isLoading: boolean
  settings: ProviderSettings
}

// useFileSystem.ts - File operations
interface FileSystemState {
  currentPath: string
  files: FileNode[]
  selectedFiles: string[]
  clipboard: ClipboardItem[]
}
```

---

## Backend Architecture

### Technology Stack
- **Runtime:** Node.js with Nitro server (Nuxt's backend)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Supabase Auth
- **Real-time:** WebSocket with Socket.io
- **Caching:** Redis for session and data caching
- **File Storage:** Vercel Blob Storage

### API Design

The backend follows RESTful principles with tRPC integration planned for type-safe client-server communication.

```
server/
├── api/                    # API route handlers
│   ├── auth/              # Authentication endpoints
│   │   ├── login.post.ts
│   │   └── logout.post.ts
│   ├── workspace/         # Workspace operations
│   │   ├── documents.get.ts
│   │   ├── documents.post.ts
│   │   └── documents.put.ts
│   ├── ai/               # AI proxy endpoints
│   │   ├── chat.post.ts
│   │   └── providers.get.ts
│   ├── collaboration/     # Real-time collaboration
│   │   ├── rooms.get.ts
│   │   └── operations.post.ts
│   └── files/            # File system operations
│       ├── upload.post.ts
│       └── [path].get.ts
├── middleware/            # Request processing
│   ├── auth.ts           # Authentication middleware
│   ├── cors.ts           # CORS handling
│   └── rateLimit.ts      # Rate limiting
├── utils/                # Shared utilities
│   ├── database.ts       # Database helpers
│   ├── auth.ts          # Auth utilities
│   └── validation.ts    # Input validation
└── websocket/           # Real-time functionality
    ├── collaboration.ts  # Document collaboration
    ├── presence.ts      # User presence
    └── notifications.ts # Real-time notifications
```

### Database Schema

```sql
-- Core Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    title TEXT NOT NULL,
    content JSONB,
    type TEXT DEFAULT 'blocks',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaboration Tables
CREATE TABLE document_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    user_id UUID REFERENCES users(id),
    permission TEXT DEFAULT 'read', -- read, write, admin
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    user_id UUID REFERENCES users(id),
    operation JSONB NOT NULL,
    version INTEGER NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Integration Tables
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    provider TEXT NOT NULL,
    messages JSONB,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extension System Tables
CREATE TABLE extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    version TEXT NOT NULL,
    manifest JSONB NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_extensions (
    user_id UUID REFERENCES users(id),
    extension_id UUID REFERENCES extensions(id),
    enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, extension_id)
);
```

---

## AI Integration Architecture

### Multi-Provider System

The AI integration uses a provider abstraction layer that enables seamless switching between different AI services:

```javascript
// useAI.js - Provider abstraction
class AIProviderManager {
  constructor() {
    this.providers = {
      openai: new OpenAIProvider(),
      claude: new ClaudeProvider(),
      gemini: new GeminiProvider(),
      ollama: new OllamaProvider()
    }
    this.activeProvider = 'ollama' // Default to local
  }

  async sendMessage(message, context) {
    const provider = this.providers[this.activeProvider]
    return await provider.sendMessage(message, context)
  }

  async switchProvider(providerName) {
    if (this.providers[providerName]) {
      this.activeProvider = providerName
      return true
    }
    return false
  }
}
```

### Context Awareness System

```javascript
// useContextAwareness.js
const contextDetection = {
  // Analyze current user context
  analyzeContext() {
    return {
      pageType: this.detectPageType(),
      selectedText: this.getSelectedText(),
      workflowPattern: this.detectWorkflowPattern(),
      recentActions: this.getRecentActions(),
      timeContext: this.getTimeContext()
    }
  },

  // Generate contextual suggestions
  generateSuggestions(context) {
    const suggestions = []
    
    if (context.pageType === 'code') {
      suggestions.push(...this.getCodeSuggestions(context))
    } else if (context.pageType === 'writing') {
      suggestions.push(...this.getWritingSuggestions(context))
    }
    
    return suggestions
  }
}
```

---

## Real-Time Collaboration Architecture

### Operational Transformation

Canvas uses operational transformation to handle concurrent edits in real-time collaboration:

```javascript
// Operational Transform Engine
class OperationalTransform {
  transform(op1, op2) {
    // Transform operations based on type
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(op1, op2)
    }
    if (op1.type === 'delete' && op2.type === 'delete') {
      return this.transformDeleteDelete(op1, op2)
    }
    // Handle all operation combinations
  }

  apply(document, operations) {
    let result = document
    for (const op of operations) {
      result = this.applyOperation(result, op)
    }
    return result
  }
}
```

### WebSocket Event Flow

```javascript
// Real-time collaboration flow
const collaborationServer = {
  // Handle new document operation
  onDocumentOperation: (socket, data) => {
    const { documentId, operation, version } = data
    
    // Transform operation against concurrent operations
    const transformedOp = this.transformOperation(operation, version)
    
    // Apply to document
    this.applyToDocument(documentId, transformedOp)
    
    // Broadcast to other collaborators
    socket.to(documentId).emit('operation', transformedOp)
    
    // Store in operation log
    this.storeOperation(documentId, transformedOp)
  },

  // Handle user presence
  onUserPresence: (socket, data) => {
    const { documentId, cursor, selection } = data
    
    // Update user presence
    this.updatePresence(socket.userId, data)
    
    // Broadcast to other users
    socket.to(documentId).emit('presence', {
      userId: socket.userId,
      cursor,
      selection
    })
  }
}
```

---

## Performance Architecture

### Frontend Performance

1. **Code Splitting:** Automatic route-based code splitting with Nuxt
2. **Component Lazy Loading:** Dynamic imports for large components
3. **Virtual Scrolling:** For large lists and documents
4. **Memoization:** Vue computed properties and watchEffect optimization
5. **Bundle Optimization:** Tree shaking and dead code elimination

```javascript
// Lazy loading example
const GraphView3D = defineAsyncComponent(() => 
  import('~/components/GraphView3D.vue')
)

// Virtual scrolling for large documents
const VirtualizedBlockList = {
  setup() {
    const { items, containerRef, visibleItems } = useVirtualList(
      blocks,
      { itemHeight: 60, overscan: 5 }
    )
    return { items, containerRef, visibleItems }
  }
}
```

### Backend Performance

1. **Database Optimization:** Indexed queries and connection pooling
2. **Caching Strategy:** Multi-layer caching (Redis, CDN, Browser)
3. **API Rate Limiting:** Prevent abuse and ensure fair usage
4. **Background Jobs:** Queue processing for heavy operations

```javascript
// Caching strategy
const cacheStrategy = {
  // L1: Browser cache (immediate)
  browserCache: 'max-age=300', // 5 minutes
  
  // L2: CDN cache (edge locations)
  cdnCache: 'max-age=3600', // 1 hour
  
  // L3: Redis cache (application level)
  redisCache: {
    ttl: 1800, // 30 minutes
    keyPrefix: 'canvas:',
    serializer: 'json'
  },
  
  // L4: Database (persistent)
  database: {
    connectionPool: 20,
    queryTimeout: 5000
  }
}
```

---

## Security Architecture

### Authentication & Authorization

```javascript
// JWT-based authentication with Supabase
const authSystem = {
  // Token validation middleware
  validateToken: async (token) => {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await getUserById(payload.sub)
      return { valid: true, user }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  },

  // Permission checking
  checkPermission: async (userId, resource, action) => {
    const permissions = await getUserPermissions(userId)
    return permissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    )
  }
}
```

### Data Security

1. **Encryption at Rest:** Database-level encryption
2. **Encryption in Transit:** HTTPS/WSS for all communications
3. **Input Validation:** Server-side validation for all inputs
4. **XSS Prevention:** Content Security Policy headers
5. **API Security:** Rate limiting and request validation

```javascript
// Input validation example
const validateDocumentUpdate = {
  title: z.string().min(1).max(200),
  content: z.object({
    blocks: z.array(z.object({
      id: z.string().uuid(),
      type: z.enum(['paragraph', 'heading', 'code', 'image']),
      content: z.string(),
      metadata: z.record(z.any()).optional()
    }))
  }),
  version: z.number().int().positive()
}
```

---

## Mobile Architecture

### Cross-Platform Strategy

Canvas uses a progressive enhancement approach for mobile:

1. **Progressive Web App (PWA):** Core functionality works in mobile browsers
2. **Capacitor Native Apps:** Enhanced features with native API access
3. **Responsive Design:** Tailwind CSS for adaptive layouts
4. **Touch Optimizations:** Gesture handling and touch-friendly interfaces

```javascript
// Capacitor integration
import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { Camera } from '@capacitor/camera'

const mobileFeatures = {
  // Check if running as native app
  isNative: () => Capacitor.isNativePlatform(),
  
  // Native file access
  saveFile: async (filename, data) => {
    if (this.isNative()) {
      return await Filesystem.writeFile({
        path: filename,
        data: data,
        directory: Directory.Documents
      })
    } else {
      // Fall back to web File System Access API
      return await this.webSaveFile(filename, data)
    }
  },
  
  // Camera integration
  capturePhoto: async () => {
    if (this.isNative()) {
      return await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri
      })
    } else {
      // Web camera API fallback
      return await this.webCapturePhoto()
    }
  }
}
```

---

## Extension Architecture

### Plugin System Design

```javascript
// Extension API
class ExtensionAPI {
  constructor(extensionId) {
    this.extensionId = extensionId
    this.sandbox = new ExtensionSandbox(extensionId)
  }

  // Workspace API
  workspace = {
    getCurrentDocument: () => this.sandbox.call('workspace.getCurrentDocument'),
    createBlock: (type, content) => this.sandbox.call('workspace.createBlock', { type, content }),
    onDocumentChange: (callback) => this.sandbox.subscribe('document.change', callback)
  }

  // UI API
  ui = {
    addCommand: (command) => this.sandbox.call('ui.addCommand', command),
    showNotification: (message) => this.sandbox.call('ui.showNotification', message),
    addMenuItem: (item) => this.sandbox.call('ui.addMenuItem', item)
  }

  // AI API (restricted)
  ai = {
    sendMessage: (message) => this.sandbox.call('ai.sendMessage', message),
    getContext: () => this.sandbox.call('ai.getContext')
  }
}

// Extension manifest
interface ExtensionManifest {
  name: string
  version: string
  description: string
  author: string
  permissions: string[]
  main: string
  activationEvents: string[]
  contributes: {
    commands?: CommandContribution[]
    menus?: MenuContribution[]
    themes?: ThemeContribution[]
  }
}
```

---

## Deployment Architecture

### Infrastructure

```yaml
# Docker Compose for development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@db:5432/canvas
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: canvas
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Deployment (Vercel)

```javascript
// vercel.json
{
  "builds": [
    {
      "src": "nuxt.config.ts",
      "use": "@nuxtjs/vercel-builder"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NUXT_SECRET_KEY": "@nuxt-secret-key",
    "DATABASE_URL": "@database-url",
    "REDIS_URL": "@redis-url"
  }
}
```

---

## Monitoring & Observability

### Logging Strategy

```javascript
// Structured logging
const logger = {
  info: (message, context) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      traceId: context.traceId
    }))
  },
  
  error: (message, error, context) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      traceId: context.traceId
    }))
  }
}
```

### Performance Monitoring

```javascript
// Client-side performance tracking
const performanceMonitor = {
  // Core Web Vitals
  measureCoreWebVitals: () => {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lcp = entries[entries.length - 1]
      this.reportMetric('lcp', lcp.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })
    
    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let cls = 0
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      }
      this.reportMetric('cls', cls)
    }).observe({ entryTypes: ['layout-shift'] })
  },
  
  // Custom application metrics
  measureFeatureUsage: (feature) => {
    const startTime = performance.now()
    return () => {
      const duration = performance.now() - startTime
      this.reportMetric('feature_usage', { feature, duration })
    }
  }
}
```

---

## Future Architecture Considerations

### Scalability Improvements

1. **Microservices Migration:** Break monolithic backend into services
2. **Event-Driven Architecture:** Implement event sourcing and CQRS
3. **GraphQL API:** Type-safe, efficient data fetching
4. **Edge Computing:** Move computation closer to users

### Technology Upgrades

1. **Server Components:** Leverage React/Vue server components
2. **Streaming:** Implement streaming for large document loading
3. **WebAssembly:** Performance-critical operations in WASM
4. **AI Infrastructure:** Self-hosted AI models for privacy

---

**Document Version:** 1.0  
**Last Updated:** August 26, 2025  
**Architecture Review Date:** October 1, 2025  

*This architecture documentation should be updated as the system evolves and new technologies are integrated. Regular architecture reviews ensure the system remains scalable, maintainable, and secure.*