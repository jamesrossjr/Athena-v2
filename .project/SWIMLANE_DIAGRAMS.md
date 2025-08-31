# Canvas Digital Workspace - Swimlane Diagrams

## Overview
This document contains swimlane diagrams representing key user flows and system processes in Canvas. Each diagram shows the interaction between different actors (users, systems, services) across time.

---

## 1. User Onboarding & First Experience

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant A as Auth Service
    participant AI as AI Assistant
    participant S as Storage

    U->>W: Visit Canvas URL
    W->>U: Display landing page
    U->>W: Click "Get Started"
    W->>A: Initialize guest session
    A->>S: Create temporary workspace
    S-->>A: Return workspace ID
    A-->>W: Session established
    W->>U: Show workspace interface
    
    Note over U,W: First-time tour
    W->>U: Display feature highlights
    U->>W: Start with sample document
    W->>U: Show AI assistant (Ctrl+K hint)
    U->>AI: Press Ctrl+K
    AI->>U: Welcome message with suggestions
    U->>AI: Ask "How do I create a heading?"
    AI->>U: Provide tutorial with examples
    
    U->>W: Create first block
    W->>S: Auto-save document
    S-->>W: Confirm save
    W->>U: Show save indicator
    
    Note over U,S: Conversion flow
    W->>U: Suggest account creation
    U->>A: Create account
    A->>S: Migrate guest data to account
    S-->>A: Migration complete
    A-->>U: Account created successfully
```

---

## 2. AI Assistant Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as User Interface
    participant AI as AI Assistant
    participant CA as Context Awareness
    participant AP as AI Providers
    participant S as Storage

    U->>UI: Press Ctrl+K anywhere
    UI->>CA: Get current context
    CA->>CA: Analyze page type, selection, recent actions
    CA-->>AI: Return context data
    AI->>U: Open assistant with context-aware welcome
    
    U->>AI: Type query or command
    AI->>CA: Get relevant suggestions
    CA-->>AI: Context-based command suggestions
    AI->>U: Show smart suggestions dropdown
    
    U->>AI: Submit query
    AI->>AP: Route to appropriate provider
    
    alt OpenAI Selected
        AP->>AP: Call OpenAI API
    else Claude Selected
        AP->>AP: Call Claude API
    else Ollama Selected (Local)
        AP->>AP: Call local Ollama
    else Gemini Selected
        AP->>AP: Call Gemini API
    end
    
    AP-->>AI: Return response
    AI->>S: Save conversation history
    AI->>U: Display response with actions
    
    opt User wants to apply suggestion
        U->>AI: Click "Apply" button
        AI->>UI: Execute command on current context
        UI->>S: Save changes
        UI->>U: Show visual feedback
    end
    
    U->>AI: Close assistant (Esc or click away)
    AI->>S: Persist session state
    AI-->>UI: Hide assistant overlay
```

---

## 3. Multi-View Workspace Navigation

```mermaid
sequenceDiagram
    participant U as User
    participant Nav as Navigation
    participant WS as Workspace State
    participant BV as Block View
    participant IV as IDE View
    participant DV as Database View
    participant WV as Whiteboard View
    participant GV as Graph View

    Note over U,GV: User starts in Block View
    U->>Nav: Click IDE tab
    Nav->>WS: Request view switch
    WS->>BV: Save current state
    BV-->>WS: State saved
    WS->>IV: Initialize IDE view
    IV->>IV: Load file explorer, terminal, editor
    IV-->>U: Display IDE interface
    
    U->>IV: Open file in editor
    IV->>IV: Load syntax highlighting
    IV->>U: Show file content with highlighting
    
    U->>Nav: Switch to Database view
    Nav->>WS: Request view switch
    WS->>IV: Preserve IDE state
    IV-->>WS: State preserved
    WS->>DV: Initialize database view
    DV->>DV: Connect to database
    DV->>U: Show table browser
    
    U->>DV: Select table to edit
    DV->>DV: Load table data
    DV->>U: Show spreadsheet interface
    
    Note over U,GV: Context preserved across switches
    U->>Nav: Return to Block view
    Nav->>WS: Request view switch
    WS->>BV: Restore previous state
    BV-->>U: Show exact previous position
```

---

## 4. Collaborative Document Editing

```mermaid
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant UI1 as UI Client 1
    participant UI2 as UI Client 2
    participant WS as WebSocket Server
    participant OT as Operational Transform
    participant DB as Database

    Note over U1,DB: User 1 shares document
    U1->>UI1: Share document
    UI1->>WS: Create share link
    WS->>DB: Store sharing permissions
    WS-->>UI1: Return share link
    UI1->>U1: Show share link
    
    Note over U1,DB: User 2 joins
    U2->>UI2: Open share link
    UI2->>WS: Join document session
    WS->>DB: Verify permissions
    DB-->>WS: Permission granted
    WS->>UI2: Send current document state
    WS->>UI1: Notify User 1 joined
    UI1->>U1: Show User 2 presence indicator
    
    Note over U1,DB: Real-time collaboration
    U1->>UI1: Type in document
    UI1->>WS: Send operation
    WS->>OT: Transform operation
    OT->>DB: Apply to document
    OT->>WS: Broadcast transformed operation
    WS->>UI2: Send operation to User 2
    UI2->>U2: Show User 1's changes
    
    Note over U1,DB: Conflict resolution
    U2->>UI2: Edit same paragraph simultaneously
    UI2->>WS: Send operation
    WS->>OT: Detect conflict
    OT->>OT: Apply operational transformation
    OT->>DB: Resolve and save
    WS->>UI1: Send resolved operation
    WS->>UI2: Send resolved operation
    UI1->>U1: Show resolved text
    UI2->>U2: Show resolved text
```

---

## 5. File System Operations in IDE

```mermaid
sequenceDiagram
    participant U as User
    participant FE as File Explorer
    participant FS as File System API
    participant E as Editor
    participant T as Terminal
    participant S as Storage

    U->>FE: Right-click in explorer
    FE->>U: Show context menu
    U->>FE: Select "New File"
    FE->>FS: Create file dialog
    FS->>U: Prompt for filename
    U->>FS: Enter "components/NewComponent.vue"
    FS->>FS: Validate path and name
    FS->>S: Create file
    S-->>FS: File created
    FS->>FE: Refresh file tree
    FE->>U: Show new file in explorer
    
    U->>FE: Double-click new file
    FE->>E: Open file in editor
    E->>S: Read file content (empty)
    E->>E: Detect file type (.vue)
    E->>E: Load Vue syntax highlighting
    E->>U: Show empty editor with syntax support
    
    U->>E: Start typing code
    E->>E: Provide autocomplete suggestions
    E->>S: Auto-save changes (debounced)
    
    U->>T: Run "npm run dev" in terminal
    T->>T: Execute command
    T->>T: Monitor file changes
    T->>U: Show server output
    
    Note over U,S: File operations continue
    U->>FE: Drag file to different folder
    FE->>FS: Move file operation
    FS->>S: Update file location
    S-->>FS: Move complete
    FS->>FE: Update file tree display
    FE->>E: Update open file path
    E->>U: Show updated file location
```

---

## 6. AI-Powered Code Completion

```mermaid
sequenceDiagram
    participant U as User
    participant E as Code Editor
    participant AI as AI Service
    participant CA as Context Analyzer
    participant LSP as Language Server
    participant C as Cache

    U->>E: Type partial code
    E->>CA: Analyze code context
    CA->>CA: Parse surrounding code, imports, variables
    CA-->>E: Return context analysis
    
    E->>C: Check completion cache
    alt Cache Hit
        C-->>E: Return cached suggestions
    else Cache Miss
        E->>AI: Request code completion
        Note over E,AI: Send context + partial code
        AI->>AI: Generate completions
        AI-->>E: Return completion suggestions
        E->>C: Cache suggestions
    end
    
    E->>U: Show completion popup
    U->>E: Select completion item
    E->>LSP: Validate completion
    LSP-->>E: Validation result
    
    alt Valid Completion
        E->>E: Insert completion
        E->>U: Show completed code
        E->>CA: Update context with new code
    else Invalid Completion
        E->>AI: Request alternative
        AI-->>E: Provide alternative
        E->>U: Show alternative suggestion
    end
    
    Note over U,C: Learning from usage
    E->>AI: Send usage feedback
    AI->>AI: Update completion model
```

---

## 7. Database Operations Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant DV as Database View
    participant DB as Database Service
    participant Val as Validator
    participant Audit as Audit Log
    participant UI as UI Updates

    U->>DV: Open database view
    DV->>DB: Connect to database
    DB-->>DV: Return connection status
    DV->>DB: Fetch table list
    DB-->>DV: Return available tables
    DV->>U: Show table browser
    
    U->>DV: Select "users" table
    DV->>DB: Query table schema
    DB-->>DV: Return column definitions
    DV->>DB: Fetch table data (paginated)
    DB-->>DV: Return data rows
    DV->>U: Display data grid
    
    Note over U,UI: User edits data
    U->>DV: Double-click cell to edit
    DV->>U: Show inline editor
    U->>DV: Change value and press Enter
    DV->>Val: Validate new value
    Val-->>DV: Validation result
    
    alt Valid Data
        DV->>DB: Update database
        DB->>Audit: Log change
        DB-->>DV: Confirm update
        DV->>UI: Show success indicator
        UI->>U: Visual confirmation
    else Invalid Data
        DV->>U: Show validation error
        DV->>U: Revert to previous value
    end
    
    Note over U,UI: Bulk operations
    U->>DV: Select multiple rows
    DV->>U: Show bulk actions menu
    U->>DV: Choose "Delete selected"
    DV->>U: Show confirmation dialog
    U->>DV: Confirm deletion
    DV->>DB: Execute bulk delete
    DB->>Audit: Log bulk operation
    DB-->>DV: Confirm deletions
    DV->>UI: Refresh data grid
    UI->>U: Show updated data
```

---

## 8. Extension Installation & Management

```mermaid
sequenceDiagram
    participant U as User
    participant EM as Extension Manager
    participant MP as Marketplace
    participant SE as Security Engine
    participant FS as File System
    participant R as Runtime

    U->>EM: Open extension manager
    EM->>MP: Fetch available extensions
    MP-->>EM: Return extension list
    EM->>U: Show marketplace browser
    
    U->>EM: Search for "github-integration"
    EM->>MP: Query extensions
    MP-->>EM: Return search results
    EM->>U: Display matching extensions
    
    U->>EM: Click "Install" on extension
    EM->>MP: Download extension package
    MP-->>EM: Return extension bundle
    EM->>SE: Security scan
    SE->>SE: Check permissions, code analysis
    SE-->>EM: Security approval
    
    EM->>FS: Extract extension files
    FS-->>EM: Files extracted
    EM->>R: Load extension manifest
    R->>R: Validate API usage
    R->>R: Initialize extension sandbox
    R-->>EM: Extension loaded
    
    EM->>U: Show installation success
    EM->>U: Extension available in UI
    
    Note over U,R: Extension usage
    U->>R: Use extension feature
    R->>R: Execute in sandbox
    R->>FS: Access permitted files only
    R->>U: Return extension result
    
    Note over U,R: Extension update
    EM->>MP: Check for updates
    MP-->>EM: New version available
    EM->>U: Show update notification
    U->>EM: Approve update
    EM->>MP: Download new version
    EM->>SE: Re-scan updated extension
    EM->>R: Hot-reload extension
    R-->>U: Extension updated seamlessly
```

---

## 9. Voice Input Processing

```mermaid
sequenceDiagram
    participant U as User
    participant VA as Voice Assistant
    participant WSR as Web Speech Recognition
    participant NLP as NLP Processor
    participant AI as AI Service
    participant E as Editor

    U->>VA: Click voice input button
    VA->>WSR: Request microphone access
    WSR->>U: Browser permission dialog
    U->>WSR: Grant permission
    WSR-->>VA: Permission granted
    
    VA->>U: Show "Listening..." indicator
    VA->>WSR: Start recording
    U->>WSR: Speak: "Create a new heading that says hello world"
    WSR->>WSR: Convert speech to text
    WSR-->>VA: Return transcription
    
    VA->>NLP: Parse voice command
    NLP->>NLP: Extract intent and entities
    NLP-->>VA: Command: "create_heading", text: "hello world"
    
    VA->>AI: Process structured command
    AI->>AI: Generate appropriate action
    AI-->>VA: Return action: insert_block(type: "heading", content: "Hello World")
    
    VA->>E: Execute action
    E->>E: Create heading block
    E->>U: Insert "Hello World" heading
    
    VA->>U: Show completion feedback
    VA->>WSR: Stop recording
    
    Note over U,E: Continuous voice mode
    alt Voice Mode Active
        U->>WSR: Continue speaking
        WSR->>VA: Stream partial results
        VA->>U: Show live transcription
        U->>WSR: Finish speaking
        WSR-->>VA: Final transcription
        VA->>NLP: Process next command
    else Voice Mode Inactive
        VA->>U: Hide voice interface
    end
```

---

## 10. Cross-Platform Synchronization

```mermaid
sequenceDiagram
    participant MW as Mobile Web
    participant DA as Desktop App
    participant WA as Web App
    participant S as Sync Service
    participant DB as Database
    participant CDN as Content Delivery

    Note over MW,CDN: User edits on mobile
    MW->>S: Document change event
    S->>DB: Store change with timestamp
    S->>S: Generate sync manifest
    S->>CDN: Update cached content
    
    Note over MW,CDN: Desktop app syncs
    DA->>S: Request sync status
    S->>DB: Check for updates
    DB-->>S: Return change manifest
    S-->>DA: Send update manifest
    
    DA->>CDN: Download updated content
    CDN-->>DA: Return content delta
    DA->>DA: Apply changes locally
    DA->>DA: Resolve any conflicts
    DA->>S: Confirm sync complete
    
    Note over MW,CDN: Web app real-time updates
    WA->>S: Establish WebSocket connection
    S-->>WA: Connected
    
    MW->>S: Make another change
    S->>DB: Store change
    S->>WA: Push real-time update
    WA->>WA: Apply change immediately
    WA->>WA: Show sync indicator
    
    Note over MW,CDN: Offline handling
    MW->>MW: Detect offline state
    MW->>MW: Store changes locally
    MW->>MW: Show offline indicator
    
    MW->>MW: Detect online state
    MW->>S: Batch upload offline changes
    S->>DB: Process change batch
    S->>S: Resolve conflicts
    S-->>MW: Return sync results
    MW->>MW: Update local state
    MW->>MW: Show sync complete
```

---

## Process Flow Summary

### Key Insights from Swimlanes

1. **User Experience Flows**
   - Consistent AI assistant access (Ctrl+K) across all contexts
   - Context-aware suggestions improve user productivity
   - Seamless view switching maintains user flow state

2. **Technical Integration Points**
   - WebSocket connections enable real-time collaboration
   - Operational transformation ensures conflict-free editing
   - Extension sandbox provides security while enabling extensibility

3. **Performance Considerations**
   - Caching strategies reduce AI response times
   - Debounced auto-save prevents performance issues
   - Progressive loading improves initial user experience

4. **Security & Reliability**
   - Permission validation at multiple layers
   - Audit logging for all data changes
   - Graceful fallback handling for service failures

5. **Cross-Platform Consistency**
   - Unified sync mechanism across all platforms
   - Consistent UI patterns and interactions
   - Offline-first architecture with conflict resolution

---

**Document Version:** 1.0  
**Last Updated:** August 26, 2025  
**Diagrams Created:** 10  
**Next Review:** September 10, 2025  

*These swimlane diagrams should be updated as new features are implemented and user flows evolve. Consider creating sequence diagrams for specific technical implementations during development.*