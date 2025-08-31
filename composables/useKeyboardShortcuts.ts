// Removed unused imports - onMounted and onUnmounted not needed in this composable

interface ShortcutHandler {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
  handler: () => void
  description?: string
}

export const useKeyboardShortcuts = () => {
  const shortcuts: ShortcutHandler[] = []

  const addShortcut = (shortcut: ShortcutHandler) => {
    shortcuts.push(shortcut)
  }

  const removeShortcut = (key: string, modifiers: Partial<ShortcutHandler> = {}) => {
    const index = shortcuts.findIndex(s =>
      s.key === key
      && s.ctrlKey === modifiers.ctrlKey
      && s.shiftKey === modifiers.shiftKey
      && s.altKey === modifiers.altKey
      && s.metaKey === modifiers.metaKey
    )
    if (index > -1) {
      shortcuts.splice(index, 1)
    }
  }

  const handleKeydown = (event: KeyboardEvent) => {
    // Skip if user is typing in an input
    if (event.target instanceof HTMLElement) {
      const tagName = event.target.tagName.toLowerCase()
      const isEditable = event.target.contentEditable === 'true'
      if (['input', 'textarea', 'select'].includes(tagName) || isEditable) {
        // Allow certain shortcuts even in inputs
        const allowInInputs = shortcuts.filter(s =>
          s.key === event.key
          && s.ctrlKey === event.ctrlKey
          && s.shiftKey === event.shiftKey
          && s.altKey === event.altKey
          && s.metaKey === event.metaKey
          && ['s', 'o', 'n', 'p'].includes(s.key.toLowerCase()) // Save, Open, New, Palette
        )
        if (allowInInputs.length === 0) return
      }
    }

    const matchingShortcuts = shortcuts.filter((shortcut) => {
      return shortcut.key === event.key
        && (shortcut.ctrlKey ?? false) === event.ctrlKey
        && (shortcut.shiftKey ?? false) === event.shiftKey
        && (shortcut.altKey ?? false) === event.altKey
        && (shortcut.metaKey ?? false) === event.metaKey
    })

    matchingShortcuts.forEach((shortcut) => {
      if (shortcut.preventDefault !== false) {
        event.preventDefault()
      }
      shortcut.handler()
    })
  }

  const init = () => {
    document.addEventListener('keydown', handleKeydown)
  }

  const cleanup = () => {
    document.removeEventListener('keydown', handleKeydown)
  }

  // Predefined shortcuts for common IDE actions
  const registerIDEShortcuts = (handlers: {
    toggleFileExplorer?: () => void
    toggleTerminal?: () => void
    toggleCommandPalette?: () => void
    saveFile?: () => void
    newFile?: () => void
    closeOverlays?: () => void
  }) => {
    if (handlers.toggleFileExplorer) {
      addShortcut({
        key: 'o',
        ctrlKey: true,
        handler: handlers.toggleFileExplorer,
        description: 'Toggle File Explorer'
      })
    }

    if (handlers.toggleTerminal) {
      addShortcut({
        key: '`',
        ctrlKey: true,
        handler: handlers.toggleTerminal,
        description: 'Toggle Terminal'
      })
    }

    if (handlers.toggleCommandPalette) {
      addShortcut({
        key: 'P',
        ctrlKey: true,
        shiftKey: true,
        handler: handlers.toggleCommandPalette,
        description: 'Open Command Palette'
      })

      addShortcut({
        key: '/',
        handler: handlers.toggleCommandPalette,
        description: 'Open Command Palette'
      })
    }

    if (handlers.saveFile) {
      addShortcut({
        key: 's',
        ctrlKey: true,
        handler: handlers.saveFile,
        description: 'Save File'
      })
    }

    if (handlers.newFile) {
      addShortcut({
        key: 'n',
        ctrlKey: true,
        handler: handlers.newFile,
        description: 'New File'
      })
    }

    if (handlers.closeOverlays) {
      addShortcut({
        key: 'Escape',
        handler: handlers.closeOverlays,
        description: 'Close Overlays'
      })
    }
  }

  return {
    addShortcut,
    removeShortcut,
    registerIDEShortcuts,
    init,
    cleanup,
    shortcuts: () => [...shortcuts] // Return copy for display
  }
}

export type { ShortcutHandler }
