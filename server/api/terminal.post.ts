import { defineEventHandler } from 'h3'

// For now, return a simple response indicating terminal server is ready
// The actual socket.io server will be handled by a separate plugin
export default defineEventHandler(async (_event) => {
  return {
    success: true,
    message: 'Terminal API endpoint ready',
    info: 'Terminal functionality will be available via socket.io plugin'
  }
})
