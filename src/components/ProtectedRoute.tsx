import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole, ModulePermissions } from '../types'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
  module?: keyof ModulePermissions
}

// Roles that implicitly grant module access
const roleModuleMap: Record<UserRole, (keyof ModulePermissions)[]> = {
  superadmin: ['athletes', 'inbody', 'supplement', 'physio', 'fitness', 'strength', 'reports', 'psychology', 'supplement_coordinator', 'supplement_supporter', 'supplement_approver'],
  admin: ['athletes', 'inbody', 'supplement', 'physio', 'fitness', 'strength', 'reports', 'psychology', 'supplement_coordinator', 'supplement_supporter', 'supplement_approver'],
  coach: ['athletes', 'strength'],
  physio: ['athletes', 'physio'],
  psikologis: ['athletes', 'psychology'],
  penolong_pegawai: ['athletes'],
  pegawai_belia_sukan: ['athletes'],
}

export function ProtectedRoute({ children, roles, module }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen text-muted">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <div className="flex items-center justify-center h-screen text-muted">Loading...</div>
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />

  if (module) {
    const isSuperAdmin = profile.role === 'superadmin'
    const perm = profile.module_permissions?.[module]
    const hasExplicitPermission = typeof perm === 'boolean' ? perm : perm?.read
    const hasImplicitPermission = roleModuleMap[profile.role]?.includes(module)

    if (!isSuperAdmin && !hasExplicitPermission && !hasImplicitPermission) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
