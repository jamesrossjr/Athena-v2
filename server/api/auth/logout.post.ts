import { prisma } from '../../prisma'
import { setCookie, getCookie, createError } from 'h3'

/**
 * POST /api/auth/logout
 *
 * Clears the authToken cookie and revokes the associated UserSession.
 */
export default defineEventHandler(async (event) => {
  try {
    const token = getCookie(event, 'authToken')

    // Clear cookie immediately
    setCookie(event, 'authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })

    if (token) {
      await prisma.userSession.deleteMany({
        where: { token }
      })
    }

    return { success: true }
  } catch (err) {
    console.error('Logout error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
