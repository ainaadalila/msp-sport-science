import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen text-muted">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
}
