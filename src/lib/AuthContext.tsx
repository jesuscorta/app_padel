import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiGet, apiPost } from './api'

export type AppRole = 'participant' | 'admin'

interface AuthContextValue {
  role: AppRole | null
  loading: boolean
  isAdmin: boolean
  isParticipant: boolean
  login: (role: AppRole, code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiGet<{ role: AppRole | null }>('/api/session')
      .then((payload) => {
        if (!cancelled) setRole(payload.role)
      })
      .catch(() => {
        if (!cancelled) setRole(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function login(nextRole: AppRole, code: string) {
    const payload = await apiPost<{ role: AppRole }>('/api/access', { role: nextRole, code })
    setRole(payload.role)
  }

  async function logout() {
    await apiPost('/api/logout', {})
    setRole(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      loading,
      isAdmin: role === 'admin',
      isParticipant: role === 'participant',
      login,
      logout,
    }),
    [loading, role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
