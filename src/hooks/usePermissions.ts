import { useAuth } from '../context/AuthContext'
import type { SubmoduleKey, SubmoduleCRUD } from '../types'

export function usePermissions() {
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'superadmin'

  function can(mod: SubmoduleKey, action: keyof SubmoduleCRUD = 'read'): boolean {
    if (isSuperAdmin) return true
    const perm = profile?.module_permissions?.[mod]
    if (typeof perm === 'boolean') return perm
    return (perm as SubmoduleCRUD | undefined)?.[action] ?? false
  }

  return { can }
}
