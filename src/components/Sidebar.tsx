import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import type { ModulePermissions } from '../types'

interface NavItem {
  label: string
  path: string
  end?: boolean
  module?: keyof ModulePermissions
}

const expandableGroups: Record<string, NavItem[]> = {
  kecergasan: [
    { label: 'Latihan Suaian Fizikal', path: '/fitness/strength', module: 'strength' },
    { label: 'Ujian Kecergasan', path: '/fitness/testing', module: 'fitness' },
    { label: 'Konfigurasi Ujian', path: '/fitness/config', module: 'fitness_config' },
  ],
  prestasi: [
    { label: 'Penilaian InBody', path: '/performance/inbody', module: 'inbody' },
    { label: 'Pengurusan Suplemen', path: '/performance/supplement', module: 'supplement' },
  ],
  fisioterapi: [
    { label: 'Saringan Fisioterapi', path: '/rehabilitation/physio', end: true, module: 'physio' },
    { label: 'Pengurusan Kes', path: '/rehabilitation/physio/cases', module: 'physio' },
  ],
  psikologi: [
    { label: 'Penilaian Psikologi', path: '/psychology/rating', module: 'psychology' },
  ],
}

const expandableGroupPaths: Record<string, string[]> = Object.fromEntries(
  Object.entries(expandableGroups).map(([key, items]) => [key, items.map(i => i.path)])
)

export default function Sidebar({ onSignOut, isOpen, onClose }: { onSignOut?: () => void; isOpen?: boolean; onClose?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isSuperAdmin = profile?.role === 'superadmin'

  const can = (mod: keyof ModulePermissions) => {
    if (isSuperAdmin) return true
    const perm = profile?.module_permissions?.[mod]
    if (typeof perm === 'boolean') return perm
    return perm?.read ?? false
  }

  // Auto-expand group if a child route is active
  function isGroupActive(key: string) {
    return expandableGroupPaths[key]?.some(p => pathname.startsWith(p)) ?? false
  }

  const [open, setOpen] = useState<Record<string, boolean>>({
    kecergasan: isGroupActive('kecergasan'),
    prestasi: isGroupActive('prestasi'),
    fisioterapi: isGroupActive('fisioterapi'),
    psikologi: isGroupActive('psikologi'),
  })

  // Re-evaluate on route change; also close sidebar on tablet when navigating
  useEffect(() => {
    setOpen(prev => ({
      kecergasan: prev.kecergasan || isGroupActive('kecergasan'),
      prestasi: prev.prestasi || isGroupActive('prestasi'),
      fisioterapi: prev.fisioterapi || isGroupActive('fisioterapi'),
      psikologi: prev.psikologi || isGroupActive('psikologi'),
    }))
    onClose?.()
  }, [pathname])

  function toggle(key: string) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSignOut() {
    if (onSignOut) { onSignOut(); return }
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={`w-[280px] bg-white border-r border-gray-200 flex flex-col h-full shrink-0 no-print fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Logo */}
      <div className="flex items-center gap-4 py-4 px-4 border-b border-gray-200 shrink-0">
        <img src="/logo_msp.png" alt="MSP" className="w-14 h-14 rounded-full object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="block font-bold text-[#F56A00] text-[11px] tracking-widest uppercase whitespace-nowrap">Majlis Sukan Pahang</span>
          <span className="block text-[9px] text-[#888] tracking-wide mt-0.5 whitespace-nowrap">Sport Science Department</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-[#888] hover:text-[#111] hover:bg-gray-100 transition shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">

        {/* Utama */}
        <div>
          <p className={groupLabelCls}>Utama</p>
          <NavLink to="/" end className={({ isActive }) => navItemCls(isActive)}>Dashboard</NavLink>
          {can('athletes') && (
            <NavLink to="/athletes" className={({ isActive }) => navItemCls(isActive)}>Profil Atlet</NavLink>
          )}
        </div>

        {/* Sains Sukan */}
        <div>
          <p className={groupLabelCls}>Sains Sukan</p>

          {/* Kecergasan */}
          {expandableGroups.kecergasan.some(item => item.module && can(item.module)) && (
            <>
              <button
                onClick={() => toggle('kecergasan')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isGroupActive('kecergasan') ? 'text-[#F56A00]' : 'text-[#444] hover:bg-gray-100'}`}
              >
                <span>Kecergasan</span>
                <svg className={`w-3.5 h-3.5 text-[#aaa] transition-transform ${open.kecergasan ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {open.kecergasan && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {expandableGroups.kecergasan.map(item => (
                    item.module && can(item.module) && (
                      <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                        {item.label}
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </>
          )}

          {/* Prestasi */}
          {expandableGroups.prestasi.some(item => item.module && can(item.module)) && (
            <>
              <button
                onClick={() => toggle('prestasi')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isGroupActive('prestasi') ? 'text-[#F56A00]' : 'text-[#444] hover:bg-gray-100'}`}
              >
                <span>Prestasi</span>
                <svg className={`w-3.5 h-3.5 text-[#aaa] transition-transform ${open.prestasi ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {open.prestasi && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {expandableGroups.prestasi.map(item => (
                    item.module && can(item.module) && (
                      <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                        {item.label}
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </>
          )}

          {/* Fisioterapi */}
          {expandableGroups.fisioterapi.some(item => item.module && can(item.module)) && (
            <>
              <button
                onClick={() => toggle('fisioterapi')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isGroupActive('fisioterapi') ? 'text-[#F56A00]' : 'text-[#444] hover:bg-gray-100'}`}
              >
                <span>Fisioterapi</span>
                <svg className={`w-3.5 h-3.5 text-[#aaa] transition-transform ${open.fisioterapi ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {open.fisioterapi && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {expandableGroups.fisioterapi.map(item => (
                    item.module && can(item.module) && (
                      <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                        {item.label}
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </>
          )}

          {/* Psikologi */}
          {expandableGroups.psikologi.some(item => !item.module || can(item.module)) && (
            <>
              <button
                onClick={() => toggle('psikologi')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isGroupActive('psikologi') ? 'text-[#F56A00]' : 'text-[#444] hover:bg-gray-100'}`}
              >
                <span>Psikologi</span>
                <svg className={`w-3.5 h-3.5 text-[#aaa] transition-transform ${open.psikologi ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {open.psikologi && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {expandableGroups.psikologi.map(item => (
                    (!item.module || can(item.module)) && (
                      <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                        {item.label}
                      </NavLink>
                    )
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pelaporan */}
        {can('reports') && (
          <div>
            <p className={groupLabelCls}>Pelaporan</p>
            <NavLink to="/reports" className={({ isActive }) => navItemCls(isActive)}>Laporan</NavLink>
          </div>
        )}

        {/* Pentadbiran — superadmin sahaja */}
        {isSuperAdmin && (
          <div>
            <p className={groupLabelCls}>Pentadbiran</p>
            <NavLink to="/admin/users" className={({ isActive }) => navItemCls(isActive)}>Pengurusan Pengguna</NavLink>
            <NavLink to="/admin/audit" className={({ isActive }) => navItemCls(isActive)}>Log Audit</NavLink>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 px-4 py-3 shrink-0">
        <p className="text-xs font-semibold text-[#111] truncate">{profile?.full_name || '—'}</p>
        <p className="text-[11px] text-[#888] capitalize mt-0.5">{profile?.role ? roleLabel[profile.role] : '—'}</p>
        <button onClick={handleSignOut} className="mt-2 text-xs text-[#888] hover:text-[#F56A00] transition-colors">
          Log Keluar
        </button>
      </div>
    </aside>
  )
}

const roleLabel: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Admin', coach: 'Jurulatih',
  physio: 'Fisioterapis', psikologis: 'Psikologis', penolong_pegawai: 'Penolong Pegawai Belia & Sukan', pegawai_belia_sukan: 'Pegawai Belia & Sukan',
}

const groupLabelCls = 'text-[10px] font-semibold uppercase tracking-widest text-[#aaa] px-3 mb-1'

function navItemCls(isActive: boolean) {
  return `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors w-full ${
    isActive ? 'bg-[rgba(245,106,0,0.1)] text-[#F56A00]' : 'text-[#444] hover:bg-gray-100'
  }`
}

function subNavItemCls(isActive: boolean) {
  return `flex items-center px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors w-full ${
    isActive ? 'text-[#F56A00] bg-[rgba(245,106,0,0.07)]' : 'text-[#666] hover:text-[#111] hover:bg-gray-50'
  }`
}
