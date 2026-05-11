import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  label: string
  path: string
  end?: boolean
}

const expandableGroups: Record<string, NavItem[]> = {
  kecergasan: [
    { label: 'Kekuatan & Kondisioning', path: '/fitness/strength' },
    { label: 'Ujian Kecergasan', path: '/fitness/testing' },
    { label: 'Konfigurasi Ujian', path: '/fitness/config' },
  ],
  prestasi: [
    { label: 'Penilaian InBody', path: '/performance/inbody' },
    { label: 'Pengurusan Suplemen', path: '/performance/supplement' },
  ],
  fisioterapi: [
    { label: 'Saringan Fisioterapi', path: '/rehabilitation/physio', end: true },
    { label: 'Pengurusan Kes', path: '/rehabilitation/physio/cases' },
  ],
}

const expandableGroupPaths: Record<string, string[]> = Object.fromEntries(
  Object.entries(expandableGroups).map(([key, items]) => [key, items.map(i => i.path)])
)

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'

  // Auto-expand group if a child route is active
  function isGroupActive(key: string) {
    return expandableGroupPaths[key]?.some(p => pathname.startsWith(p)) ?? false
  }

  const [open, setOpen] = useState<Record<string, boolean>>({
    kecergasan: isGroupActive('kecergasan'),
    prestasi: isGroupActive('prestasi'),
    fisioterapi: isGroupActive('fisioterapi'),
  })

  // Re-evaluate on route change
  useEffect(() => {
    setOpen(prev => ({
      kecergasan: prev.kecergasan || isGroupActive('kecergasan'),
      prestasi: prev.prestasi || isGroupActive('prestasi'),
      fisioterapi: prev.fisioterapi || isGroupActive('fisioterapi'),
    }))
  }, [pathname])

  function toggle(key: string) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-4 py-4 px-4 border-b border-gray-200 shrink-0">
        <img src="/logo_msp.png" alt="MSP" className="w-14 h-14 rounded-full object-cover shrink-0" />
        <div>
          <span className="block font-bold text-[#F56A00] text-[11px] tracking-widest uppercase whitespace-nowrap">Majlis Sukan Pahang</span>
          <span className="block text-[9px] text-[#888] tracking-wide mt-0.5 whitespace-nowrap">Sport Science Department</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">

        {/* Utama */}
        <div>
          <p className={groupLabelCls}>Utama</p>
          <NavLink to="/" end className={({ isActive }) => navItemCls(isActive)}>Dashboard</NavLink>
          <NavLink to="/athletes" className={({ isActive }) => navItemCls(isActive)}>Profil Atlet</NavLink>
        </div>

        {/* Sains Sukan */}
        <div>
          <p className={groupLabelCls}>Sains Sukan</p>

          {/* Kecergasan */}
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
                <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Prestasi */}
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
                <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          {/* Fisioterapi */}
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
                <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => subNavItemCls(isActive)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Pelaporan */}
        <div>
          <p className={groupLabelCls}>Pelaporan</p>
          <NavLink to="/reports" className={({ isActive }) => navItemCls(isActive)}>Laporan</NavLink>
        </div>

        {/* Pentadbiran */}
        {isAdmin && (
          <div>
            <p className={groupLabelCls}>Pentadbiran</p>
            <NavLink to="/admin/users" className={({ isActive }) => navItemCls(isActive)}>Pengurusan Pengguna</NavLink>
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
  physio: 'Fisioterapis', medical: 'Perubatan', athlete: 'Atlet',
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
