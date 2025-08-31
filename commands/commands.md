# Canvas Commands Reference

## Global Commands

### Command Palette
- **Cmd+K** (or **Ctrl+K**) - Open command palette from anywhere in the system

### Workspace Management
| Command | Action |
|---------|--------|
| `workspace` | List and switch between workspaces |
| `create workspace` | Create a new workspace |
| `switch wcorkspace` | Switch to a different workspace |

### Document Management
| Command | Action |
|---------|--------|
| `create document` | Create a new document |
| `new doc` | Create a new document |
| `new tab` | Create a new tab |
| `tabs` | Toggle tabs interface |
| `search` | Search all documents |

## Block Editor Commands

### Block Creation (Slash Commands)
| Command | Block Type |
|---------|-----------|
| `/text` or `/p` | Paragraph |
| `/h1` | Heading 1 |
| `/h2` | Heading 2 |
| `/h3` | Heading 3 |
| `/bullet` | Bullet List |
| `/number` | Numbered List |
| `/quote` | Quote Block |
| `/code` | Code Block |
| `/table` | Table |
| `/image` | Image Upload |
| `/video` | Video Upload |
| `/audio` | Audio Upload |
| `/file` | File Upload |
| `/embed` | Embed Content |
| `/callout` | Callout Box |
| `/divider` | Horizontal Divider |

### Canvas & Layout
| Command | Action |
|---------|--------|
| `/canvas` | Enter infinite canvas mode |
| `/whiteboard` | Enter whiteboard mode |
| `/page` | Create page node (in canvas mode) |
| `/normal` | Normal page width |
| `/landscape` | Landscape page width |
| `/full` | Full page width |

### Page Linking (Graph Mode)
| Syntax | Action |
|--------|--------|
| `[[Page Name]]` | Create link to another page |
| `[[New Page]]` | Create and link to new page |
| Click `[[link]]` | Navigate to linked page |
| Canvas view | Show connections between pages |

### Spacing Controls
| Command | Action |
|---------|--------|
| `/spacing` | Adjust block spacing |
| `spacing 0.5` | Tight spacing (0.5x) |
| `spacing 1` | Normal spacing (1x) |
| `spacing 1.5` | Relaxed spacing (1.5x) |
| `spacing 2` | Loose spacing (2x) |

## Tab System

### Tab Management
| Action | Method |
|--------|--------|
| **Open Tabs Interface** | Click pill button (top-right) |
| **Create New Tab** | Click + New Tab or Cmd+T |
| **Switch Between Tabs** | Click tab in interface |
| **Close Tab** | Click × on tab |
| **Quick Tab Search** | Type "tabs" in Cmd+K |

### Tab Features
- **Multiple Documents**: Work on several pages simultaneously
- **Auto-save**: Each tab saves independently
- **Visual Indicators**: See active tab and block count
- **Keyboard Shortcuts**: Cmd+T for new tabs, Escape to close
- **Persistent State**: Tabs remember content when switching

## Navigation & Editing

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| **Enter** | Create new block |
| **Backspace** | Delete empty block (merge with above) |
| **↑/↓ Arrows** | Navigate between blocks |
| **Escape** | Close slash menu/command palette/tabs |
| **Cmd+K** | Open command palette |
| **Cmd+T** | Create new tab |

### Canvas Mode Controls
| Control | Action |
|---------|--------|
| **Mouse Wheel** | Zoom in/out |
| **Click + Drag** | Pan around canvas |
| **Click Node** | Select page node |
| **Double-click Node** | Enter page node for editing |
| **Drag Node** | Move page node around canvas |
| **+ Button** | Zoom in |
| **- Button** | Zoom out |
| **Reset View** | Return to center at 100% zoom |
| **Exit Canvas** | Return to normal document mode |

## System Commands

### AI Assistant
| Command | Action |
|---------|--------|
| `ask [question]` | Query AI assistant |
| Any text query | Automatically suggests AI query |

### Utilities
| Command | Action |
|---------|--------|
| `width` | Adjust page width |
| `page width` | Change document width |
| `board` | Enter canvas/whiteboard mode |

## Quick Tips

- **Type `/` anywhere** to open the block menu with all available block types
- **Use Cmd+K everywhere** - it works across the entire system
- **Arrow keys work everywhere** - navigate between blocks, command results, etc.
- **Canvas mode** transforms your linear document into a 2D whiteboard
- **Page nodes** in canvas mode are like separate mini-documents you can arrange spatially
- **All commands are searchable** - just start typing in the command palette
- **[[Double brackets]]** create instant links between pages - like Obsidian!
- **Graph connections** automatically appear in canvas mode when pages are linked

## Advanced Features

### Auto-save
- Documents save automatically after 1 second of inactivity
- No manual save required

### Block Spacing
- Contextual spacing based on content type
- Seamless flow between blocks
- No gaps for continuous reading experience

### File Uploads
- Drag & drop support for images, videos, audio, and files
- Progress indicators during upload
- Automatic embedding and preview

### Knowledge Graph
- **Bidirectional linking** - links automatically create backlinks
- **Visual connections** - see relationships between pages in canvas mode
- **Auto-creation** - typing [[New Page]] creates the page instantly
- **Smart navigation** - click any link to jump to connected pages
- **Graph visualization** - canvas mode shows your knowledge network
- **Contextual linking** - links work differently in canvas vs document mode