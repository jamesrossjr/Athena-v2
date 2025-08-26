import { prisma } from '../../prisma'
import { setCookie, readBody, createError } from 'h3'
import { randomUUID } from 'node:crypto'

/**
 * POST /api/auth/login
 *
 * Expected JSON body: { email: string }
 *
 * Creates a password‑less UserSession token, stores it in the DB,
 * and sets an HttpOnly, Secure, SameSite=Strict cookie (authToken).
 * Returns { success: true } on success.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const email = typeof body?.email === 'string' ? body.email.trim() : null

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: valid email is required'
      })
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email }
    })

    await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() }
      }
    })

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.userSession.create({
      data: {
        token,
        expiresAt,
        userId: user.id
      }
    })

    setCookie(event, 'authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000), // seconds
      path: '/'
    })

    return { success: true }
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) {
      throw err
    }
    console.error('Login error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
