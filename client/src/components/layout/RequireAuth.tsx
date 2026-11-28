import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useStore } from '../../lib/store'
import type { Role } from '../../types'

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { me, authLoading, gate } = useStore()
  const location = useLocation()
  if (authLoading) {
    return <div role="status" className="flex min-h-[50vh] items-center justify-center text-slate-600">Loading…</div>
  }
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(me.role)) return <Navigate to="/dashboard" replace />
  if (gate.termsAcceptanceRequired) return <Navigate to="/accept-terms" replace />
  if (gate.verificationRequired) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}
