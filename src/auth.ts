import { createContext, useContext } from 'react'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: 'customer' | 'admin'
  created_at: string
}

export type AuthContextValue = {
  user: CurrentUser | null
  loading: boolean
  error: string
  clearError: () => void
  signIn: (email: string, password: string) => Promise<CurrentUser>
  register: (name: string, email: string, password: string) => Promise<CurrentUser>
  signOut: () => Promise<void>
  refreshUser: () => Promise<CurrentUser | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
