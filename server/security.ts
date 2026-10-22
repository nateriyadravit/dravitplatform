import { createHash, randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { first, run } from './database.js'

export type UserRole = 'customer' | 'admin'

export type PublicUser = {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

type SessionRow = PublicUser & { expires_at: string }

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
      sessionToken?: string
    }
  }
}

const cookieName = 'dravit_session'
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000
const cookieSettings = [
  `${cookieName}=`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  `Max-Age=${Math.floor(sessionDurationMs / 1000)}`,
]

function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(userId: string, response: Response): void {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString()
  run('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', [
    tokenDigest(token),
    userId,
    expiresAt,
    new Date().toISOString(),
  ])
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${cookieName}=${token}; ${cookieSettings.slice(1).join('; ')}${secureFlag}`)
}

export function clearSession(request: Request, response: Response): void {
  if (request.sessionToken) {
    run('DELETE FROM sessions WHERE token_hash = ?', [tokenDigest(request.sessionToken)])
  }
  response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
}

export function authenticate(request: Request, response: Response, next: NextFunction): void {
  const cookieHeader = request.headers.cookie ?? ''
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

  if (!token || token.length > 128) {
    response.status(401).json({ error: 'Sign in to continue.' })
    return
  }

  const session = first<SessionRow>(
    `SELECT users.id, users.name, users.email, users.role, users.created_at, sessions.expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?`,
    [tokenDigest(token)],
  )

  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    if (session) run('DELETE FROM sessions WHERE token_hash = ?', [tokenDigest(token)])
    response.status(401).json({ error: 'Your session has expired. Sign in again.' })
    return
  }

  request.user = {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    created_at: session.created_at,
  }
  request.sessionToken = token
  next()
}

export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ error: 'Administrator access is required.' })
    return
  }
  next()
}

export function requireSameOrigin(request: Request, response: Response, next: NextFunction): void {
  const origin = request.get('origin')
  if (!origin) {
    next()
    return
  }

  try {
    const originUrl = new URL(origin)
    const originHost = originUrl.host
    const requestHost = request.get('host')
    const isSameHost = originHost === requestHost
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
      && ['localhost', '127.0.0.1', '[::1]'].includes(originUrl.host.split(':')[0])
      && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${requestHost}`).hostname)

    if (!isSameHost && !isLocalDevelopmentOrigin) {
      response.status(403).json({ error: 'Request origin is not allowed.' })
      return
    }
  } catch {
    response.status(403).json({ error: 'Request origin is not allowed.' })
    return
  }

  next()
}
