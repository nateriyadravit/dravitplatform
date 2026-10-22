import { startTransition, useEffect, useState, type ReactNode } from 'react'
import { AuthContext, type CurrentUser } from './auth'

async function readError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => ({})) as { error?: string }
  return payload.error || 'The request could not be completed.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refreshUser(): Promise<CurrentUser | null> {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
      if (!response.ok) {
        startTransition(() => setUser(null))
        return null
      }
      const payload = await response.json() as { user: CurrentUser }
      startTransition(() => setUser(payload.user))
      return payload.user
    } catch {
      startTransition(() => setUser(null))
      return null
    } finally {
      startTransition(() => setLoading(false))
    }
  }

  useEffect(() => { void refreshUser() }, [])

  async function authenticate(path: string, body: Record<string, string>): Promise<CurrentUser> {
    setError('')
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const message = await readError(response)
      setError(message)
      throw new Error(message)
    }
    const payload = await response.json() as { user: CurrentUser }
    setUser(payload.user)
    return payload.user
  }

  async function signIn(email: string, password: string) {
    return authenticate('/api/auth/login', { email, password })
  }

  async function register(name: string, email: string, password: string) {
    return authenticate('/api/auth/register', { name, email, password })
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, error, clearError: () => setError(''), signIn, register, signOut, refreshUser }}>{children}</AuthContext.Provider>
}
