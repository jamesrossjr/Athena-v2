import { ref, onUnmounted } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export interface TerminalSession {
  id: string
  terminal: Terminal
  fitAddon: FitAddon
  element: HTMLElement | null
  isConnected: boolean
}

export function useTerminal() {
  const terminals = ref(new Map<string, TerminalSession>())
  const activeTerminalId = ref<string | null>(null)

  // Create a new terminal session
  const createTerminal = async (containerId: string, sessionId?: string): Promise<string> => {
    const id = sessionId || `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Get the container element
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Terminal container ${containerId} not found`)
    }

    // Create terminal instance
    const terminal = new Terminal({
      cols: 80,
      rows: 24,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#ffffff',
        foreground: '#374151',
        cursor: '#374151',
        cursorAccent: '#ffffff',
        selection: '#e5e7eb',
        black: '#000000',
        red: '#dc2626',
        green: '#059669',
        yellow: '#d97706',
        blue: '#2563eb',
        magenta: '#7c3aed',
        cyan: '#0891b2',
        white: '#6b7280',
        brightBlack: '#374151',
        brightRed: '#ef4444',
        brightGreen: '#10b981',
        brightYellow: '#f59e0b',
        brightBlue: '#3b82f6',
        brightMagenta: '#8b5cf6',
        brightCyan: '#06b6d4',
        brightWhite: '#111827'
      },
      cursorBlink: true,
      scrollback: 1000,
      tabStopWidth: 4,
      scrollbarVisibility: 'hidden', // Hide the built-in scrollbar
      overviewRuler: false // Disable overview ruler
    })

    // Create addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    // Open terminal in container
    terminal.open(container)

    // Fit terminal to container
    setTimeout(() => {
      fitAddon.fit()
    }, 0)

    // Create session object
    const session: TerminalSession = {
      id,
      terminal,
      fitAddon,
      element: container,
      isConnected: false
    }

    // Store session
    terminals.value.set(id, session)
    activeTerminalId.value = id

    // Initialize with welcome message
    terminal.write('Welcome to Canvas Terminal!\r\n')
    terminal.write('Terminal server integration in progress...\r\n')
    terminal.write('$ ')

    // Mock terminal functionality for now
    let currentLine = ''

    terminal.onData((data) => {
      // Handle special keys
      if (data === '\r') {
        // Enter key
        terminal.write('\r\n')
        if (currentLine.trim()) {
          simulateCommand(currentLine.trim(), terminal)
        }
        currentLine = ''
        terminal.write('$ ')
      } else if (data === '\x7f') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          terminal.write('\b \b')
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\n$ ')
        currentLine = ''
      } else {
        // Regular character
        currentLine += data
        terminal.write(data)
      }
    })

    // Handle terminal resize
    terminal.onResize(({ cols, rows }) => {
      // Future: send resize to backend
      console.log(`Terminal resized to ${cols}x${rows}`)
    })

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(container)

    // Store resize observer for cleanup
    ;(session as any).resizeObserver = resizeObserver

    return id
  }

  // Simulate command execution
  const simulateCommand = (command: string, terminal: Terminal) => {
    const cmd = command.toLowerCase().trim()

    switch (cmd) {
      case 'help':
        terminal.write('Available commands:\r\n')
        terminal.write('  help     - Show this help\r\n')
        terminal.write('  clear    - Clear terminal\r\n')
        terminal.write('  echo     - Echo text\r\n')
        terminal.write('  ls       - List files\r\n')
        terminal.write('  pwd      - Print working directory\r\n')
        terminal.write('  date     - Show current date\r\n')
        terminal.write('  whoami   - Show current user\r\n')
        break

      case 'clear':
        terminal.clear()
        terminal.write('$ ')
        return

      case 'ls':
        terminal.write('components/    pages/         package.json\r\n')
        terminal.write('composables/   plugins/       nuxt.config.ts\r\n')
        terminal.write('assets/        server/        README.md\r\n')
        break

      case 'pwd':
        terminal.write('/workspace/canvas\r\n')
        break

      case 'date':
        terminal.write(new Date().toString() + '\r\n')
        break

      case 'whoami':
        terminal.write('developer\r\n')
        break

      default:
        if (cmd.startsWith('echo ')) {
          terminal.write(command.substring(5) + '\r\n')
        } else if (cmd) {
          terminal.write(`Command not found: ${cmd}\r\n`)
          terminal.write('Type "help" for available commands.\r\n')
        }
    }
  }

  // Destroy a terminal session
  const destroyTerminal = (sessionId: string) => {
    const session = terminals.value.get(sessionId)
    if (!session) return

    // Clean up resize observer
    const resizeObserver = (session as any).resizeObserver
    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    // Dispose terminal
    session.terminal.dispose()

    // Remove from map
    terminals.value.delete(sessionId)

    // Clear active terminal if this was it
    if (activeTerminalId.value === sessionId) {
      activeTerminalId.value = null
    }
  }

  // Resize terminal to fit container
  const resizeTerminal = (sessionId: string) => {
    const session = terminals.value.get(sessionId)
    if (session) {
      session.fitAddon.fit()
    }
  }

  // Focus a terminal
  const focusTerminal = (sessionId: string) => {
    const session = terminals.value.get(sessionId)
    if (session) {
      session.terminal.focus()
      activeTerminalId.value = sessionId
    }
  }

  // Write text to terminal
  const writeToTerminal = (sessionId: string, text: string) => {
    const session = terminals.value.get(sessionId)
    if (session) {
      session.terminal.write(text)
    }
  }

  // Clear terminal
  const clearTerminal = (sessionId: string) => {
    const session = terminals.value.get(sessionId)
    if (session) {
      session.terminal.clear()
    }
  }

  // Get terminal session
  const getTerminal = (sessionId: string): TerminalSession | undefined => {
    return terminals.value.get(sessionId)
  }

  // Get all terminal IDs
  const getTerminalIds = (): string[] => {
    return Array.from(terminals.value.keys())
  }

  // Cleanup on unmount
  onUnmounted(() => {
    for (const sessionId of terminals.value.keys()) {
      destroyTerminal(sessionId)
    }
  })

  return {
    terminals: readonly(terminals),
    activeTerminalId: readonly(activeTerminalId),
    createTerminal,
    destroyTerminal,
    resizeTerminal,
    focusTerminal,
    writeToTerminal,
    clearTerminal,
    getTerminal,
    getTerminalIds
  }
}
