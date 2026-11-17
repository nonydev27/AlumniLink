import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useStore } from '../../lib/store'
import type { Role } from '../../types'

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { me } = useStore()
  const location = useLocation()
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(me.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
