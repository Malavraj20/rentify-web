import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'

interface RequireAuthProps {
  children: ReactNode
  roles?: Role[]
}

function redirectState(): { from: string } | null {
  return null
}

const RequireAuth = ({ children, roles }: RequireAuthProps) => {
  const { isAuthenticated, role, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return null
  }

  if (!isAuthenticated) {
    const from =
      location.pathname === '/auth'
        ? null
        : `${location.pathname}${location.search}`
    return (
      <Navigate
        to="/auth"
        replace
        state={from ? ({ from } as { from: string }) : redirectState()}
      />
    )
  }

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export { RequireAuth }
export type { RequireAuthProps }
