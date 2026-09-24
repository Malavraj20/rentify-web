import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { AuthUser, Role } from '../types'
import { readJson, writeJson } from '../utils/storage'
import { apiRequest, extractErrorMessage } from '../utils/api'

const REGISTERED_KEY = 'rentify:registeredUsers'
const TOKEN_KEY = 'rentify:token'
const LEGACY_SESSION_KEY = 'rentify:user'
const LEGACY_ROLE_OVERRIDES_KEY = 'rentify:roleOverrides'

export interface SignUpInput {
  name: string
  email: string
  password: string
}

interface AuthContextValue {
  user: AuthUser | null
  role: Role | null
  isAuthenticated: boolean
  authReady: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (input: SignUpInput) => Promise<{ error?: string }>
  requestPasswordReset: (
    email: string,
  ) => Promise<{ error?: string; notice?: string }>
  setRole: (role: Role) => void
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'phone'>>) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function sanitize(user: AuthUser): AuthUser {
  const { password: _password, ...rest } = user
  return rest
}

interface ApiUserPayload {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  createdAt?: string
}

function mapApiUser(apiUser: ApiUserPayload): AuthUser {
  return sanitize({
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role.toLowerCase() as Role,
    phone: apiUser.phone ?? undefined,
    createdAt: apiUser.createdAt
      ? apiUser.createdAt.slice(0, 10)
      : undefined,
  })
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable — token stays in memory for this session only
  }
}

function removeToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

function removeLegacyKeys(): void {
  try {
    window.localStorage.removeItem(LEGACY_SESSION_KEY)
    window.localStorage.removeItem(LEGACY_ROLE_OVERRIDES_KEY)
  } catch {
    // ignore
  }
}

function readRegistered(): AuthUser[] {
  const list = readJson<AuthUser[]>(REGISTERED_KEY, [])
  return Array.isArray(list) ? list : []
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    removeLegacyKeys()

    const token = readToken()
    if (!token) {
      setAuthReady(true)
      return () => {
        cancelled = true
      }
    }

    void apiRequest<{ user?: ApiUserPayload }>(
      'GET',
      '/api/auth/me',
      undefined,
      token,
    )
      .then((result) => {
        if (cancelled) return
        if (result.ok && result.data?.user) {
          setUser(mapApiUser(result.data.user))
        } else if (result.status === 401 || result.status === 403) {
          removeToken()
          setUser(null)
        } else if (result.status === 0) {
          // Backend unreachable — never restore a session from local cache.
          // Keep the token so a later successful call can re-validate it.
          setUser(null)
        } else {
          removeToken()
          setUser(null)
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        return { error: 'Please enter a valid email address.' }
      }
      if (!password) {
        return { error: 'Please enter your password.' }
      }

      const result = await apiRequest<{
        message?: string
        token?: string
        user?: ApiUserPayload
      }>('POST', '/api/auth/login', { email: trimmedEmail, password })

      if (result.ok && result.data?.token && result.data.user) {
        writeToken(result.data.token)
        setUser(mapApiUser(result.data.user))
        return {}
      }

      if (result.status === 0) {
        return {
          error: 'Cannot reach the server. Please try again later.',
        }
      }
      return {
        error: extractErrorMessage(result, 'Invalid email or password.'),
      }
    },
    [],
  )

  const signUp = useCallback(
    async (input: SignUpInput): Promise<{ error?: string }> => {
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      if (name.length < 2) {
        return { error: 'Please enter your full name.' }
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        return { error: 'Please enter a valid email address.' }
      }
      if (input.password.length < 8) {
        return { error: 'Password must be at least 8 characters.' }
      }

      const result = await apiRequest<{
        message?: string
        token?: string
        user?: ApiUserPayload
      }>('POST', '/api/auth/register', {
        name,
        email,
        password: input.password,
        role: 'tenant',
      })

      if (!result.ok || !result.data?.user) {
        return {
          error: extractErrorMessage(
            result,
            'Registration failed. Please try again.',
          ),
        }
      }

      const newUser = mapApiUser(result.data.user)
      if (result.data.token) {
        writeToken(result.data.token)
      }

      writeJson(REGISTERED_KEY, [...readRegistered(), newUser])
      setUser(newUser)
      return {}
    },
    [],
  )

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ error?: string; notice?: string }> => {
      const trimmedEmail = email.trim().toLowerCase()
      if (
        !trimmedEmail ||
        !trimmedEmail.includes('@') ||
        !trimmedEmail.includes('.')
      ) {
        return { error: 'Please enter a valid email address.' }
      }

      const result = await apiRequest<{ message?: string }>(
        'POST',
        '/api/auth/forgot-password',
        { email: trimmedEmail },
      )

      if (result.status === 0) {
        return {
          error: 'Cannot reach the server. Please try again later.',
        }
      }

      if (!result.ok) {
        return {
          error: 'Something went wrong. Please try again in a moment.',
        }
      }

      return {
        notice:
          result.data?.message ??
          "If an account exists for that email, reset instructions have been sent.",
      }
    },
    [],
  )

  const setRole = useCallback((role: Role) => {
    if (role === 'admin') return
    setUser((current) => {
      if (!current) return current
      if (current.role === 'admin') return current
      const next = { ...current, role }
      const registered = readRegistered()
      const index = registered.findIndex((account) => account.id === current.id)
      if (index >= 0) {
        registered[index] = { ...registered[index], role }
        writeJson(REGISTERED_KEY, registered)
      }
      const token = readToken()
      if (token) {
        void apiRequest(
          'PATCH',
          '/api/auth/me',
          { role: role.toUpperCase() },
          token,
        ).then((res) => {
          if (res.status === 401) removeToken()
        })
      }
      return next
    })
  }, [])

  const updateProfile = useCallback(
    (patch: Partial<Pick<AuthUser, 'name' | 'phone'>>) => {
      setUser((current) => {
        if (!current) return current
        const next = { ...current, ...patch }
        const registered = readRegistered()
        const index = registered.findIndex(
          (account) => account.id === current.id,
        )
        if (index >= 0) {
          registered[index] = { ...registered[index], ...patch }
          writeJson(REGISTERED_KEY, registered)
        }
        const token = readToken()
        if (token) {
          const body: { name?: string; phone?: string } = {}
          if (patch.name !== undefined) body.name = patch.name
          if (patch.phone !== undefined) body.phone = patch.phone
          if (Object.keys(body).length > 0) {
            void apiRequest('PATCH', '/api/auth/me', body, token).then(
              (res) => {
                if (res.status === 401) removeToken()
              },
            )
          }
        }
        return next
      })
    },
    [],
  )

  const signOut = useCallback(() => {
    removeToken()
    removeLegacyKeys()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: user !== null,
      authReady,
      signIn,
      signUp,
      requestPasswordReset,
      setRole,
      updateProfile,
      signOut,
    }),
    [
      user,
      authReady,
      signIn,
      signUp,
      requestPasswordReset,
      setRole,
      updateProfile,
      signOut,
    ],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthProvider, useAuth }
export type { AuthContextValue }
