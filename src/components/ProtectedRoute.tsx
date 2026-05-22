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

export function ProtectedRoute({ children, roles, module }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen text-muted">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" replace />

  const isSuperAdmin = profile?.role === 'superadmin'
  if (module && !isSuperAdmin && profile && !profile.module_permissions?.[module]) {
    return <AccessDeniedPage />
  }

  return <>{children}</>
}
