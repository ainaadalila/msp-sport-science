import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole, ModulePermissions } from '../types'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
  module?: keyof ModulePermissions
}

function AccessDeniedPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#111] mb-2">Akses Ditolak</h1>
        <p className="text-[#888] mb-6">Anda tidak mempunyai akses ke laman ini.</p>
        <a href="/" className="inline-block px-6 py-2 bg-[#F56A00] text-white rounded-lg hover:bg-[#E55A00] transition">
          Kembali ke Laman Utama
        </a>
      </div>
    </div>
  )
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
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />

  if (module && profile) {
    const isSuperAdmin = profile.role === 'superadmin'
    const hasExplicitPermission = profile.module_permissions?.[module]
    const hasImplicitPermission = roleModuleMap[profile.role]?.includes(module)

    if (!isSuperAdmin && !hasExplicitPermission && !hasImplicitPermission) {
      return <AccessDeniedPage />
    }
  }

  return <>{children}</>
}
