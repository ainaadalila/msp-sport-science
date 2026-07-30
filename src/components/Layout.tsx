import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'
import { useAuth } from '../context/AuthContext'
import { useInactivityLogout } from '../hooks/useInactivityLogout'
import { validatePassword, isPasswordValid } from '../lib/passwordValidator'

const routeMeta: Record<string, { title: string; parent?: string }> = {
  '/':                            { title: 'Dashboard' },
  '/profile':                     { title: 'Edit Profil', parent: 'Dashboard' },
  '/athletes':                    { title: 'Profil Atlet', parent: 'Dashboard' },
  '/fitness/strength':            { title: 'Latihan Suaian Fizikal', parent: 'Sains Sukan' },
  '/fitness/testing':             { title: 'Ujian Kecergasan', parent: 'Sains Sukan' },
  '/fitness/config':              { title: 'Konfigurasi Ujian', parent: 'Sains Sukan' },
  '/performance/inbody':          { title: 'Penilaian InBody', parent: 'Sains Sukan' },
  '/performance/supplement':      { title: 'Pengurusan Suplemen', parent: 'Sains Sukan' },
  '/rehabilitation/physio':       { title: 'Saringan Fisioterapi', parent: 'Sains Sukan' },
  '/rehabilitation/physio/cases': { title: 'Pengurusan Kes Fisioterapi', parent: 'Sains Sukan' },
  '/psychology/rating':           { title: 'Penilaian Psikologi', parent: 'Sains Sukan' },
  '/reports':                     { title: 'Laporan', parent: 'Dashboard' },
  '/admin/users':                 { title: 'Pengurusan Pengguna', parent: 'Dashboard' },
  '/admin/audit':                 { title: 'Log Audit', parent: 'Dashboard' },
}

interface AlertCounts { injured: number; pendingSupplements: number }

export default function Layout() {
  useInactivityLogout()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [alerts, setAlerts] = useState<AlertCounts>({ injured: 0, pendingSupplements: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [cpForm, setCpForm] = useState({ currentPassword: '', password: '', confirm: '', showPw: false })
  const [signingOut, setSigningOut] = useState(false)
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState<string | null>(null)
  const [cpSuccess, setCpSuccess] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@media print { .no-print { display: none !important; } }'
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  const athleteProfileMatch = pathname.match(/^\/athletes\/[^/]+$/)
  const meta = routeMeta[pathname] ?? (athleteProfileMatch ? { title: 'Profil Atlet', parent: 'Atlet' } : { title: 'MSP Sains Sukan' })
  const totalAlerts = alerts.injured + alerts.pendingSupplements

  useEffect(() => {
    async function fetchAlerts() {
      const [athRes, suppRes] = await Promise.all([
        supabase.from('athletes').select('id', { count: 'exact' }).eq('status', 'injured'),
        supabase.from('supplement_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
      ])
      setAlerts({ injured: athRes.count ?? 0, pendingSupplements: suppRes.count ?? 0 })
    }
    fetchAlerts()
  }, [pathname])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSignOut() {
    setUserOpen(false)
    setSigningOut(true)
    if (profile) await logAction(profile.id, 'logout')
    await signOut()
    navigate('/login')
  }

  async function handleChangePassword() {
    setCpError(null)

    if (!cpForm.currentPassword) {
      setCpError('Sila masukkan kata laluan semasa.')
      return
    }

    // Validate password strength
    if (!isPasswordValid(cpForm.password)) {
      const strength = validatePassword(cpForm.password)
      setCpError(strength.errors[0] || 'Kata laluan tidak memenuhi persyaratan keamanan.')
      return
    }

    if (cpForm.password !== cpForm.confirm) {
      setCpError('Kata laluan tidak sepadan.')
      return
    }

    setCpLoading(true)

    // Password changes go through the change-password Edge Function, not
    // supabase.auth.updateUser() directly. Calling updateUser() hits
    // Supabase Auth's raw PUT /auth/v1/user endpoint, which — as REHACK's
    // retest proved — accepts a password change from any valid session
    // token with zero verification, regardless of what checks the
    // frontend does first (a stolen/replayed token was enough). The
    // Edge Function re-verifies the current password server-side, where
    // it can't be bypassed by calling the endpoint directly with curl.
    const { error } = await supabase.functions.invoke('change-password', {
      body: {
        current_password: cpForm.currentPassword,
        new_password: cpForm.password,
      },
    })
    setCpLoading(false)
    if (error) {
      // error.message from invoke() is just a generic "non-2xx status
      // code" string — the actual message our function returns
      // (e.g. "Kata laluan semasa tidak tepat.") is in the response body,
      // reachable via error.context.
      const detail = await error.context?.clone().json().catch(() => null)
      setCpError(detail?.error || 'Kata laluan semasa tidak tepat.')
      return
    }
    setCpSuccess(true)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen bg-[#F2F4F7]">
      {/* Overlay for tablet/mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar onSignOut={handleSignOut} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Hamburger — visible only on tablet/mobile */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="lg:hidden mr-2 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-[#888] shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {meta.parent && (
              <>
                <span
                  className="text-[13px] text-[#888] cursor-pointer hover:text-[#F56A00] transition whitespace-nowrap"
                  onClick={() => navigate(-1)}
                >
                  {meta.parent}
                </span>
                <svg className="w-3 h-3 text-[#bbb] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
            <h1 className="text-[15px] font-bold text-[#111] truncate">{meta.title}</h1>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-[#888] hover:text-[#111]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D44040] rounded-full border-2 border-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute top-11 right-0 w-[260px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 text-[12px] font-semibold text-[#111]">Makluman</div>
                  {totalAlerts === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-[#888]">Tiada makluman.</div>
                  ) : (
                    <div>
                      {alerts.injured > 0 && (
                        <button
                          onClick={() => { setNotifOpen(false); navigate('/athletes?status=injured') }}
                          className="w-full flex gap-3 items-start px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D44040] mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-semibold text-[#111]">{alerts.injured} Atlet Cedera</p>
                            <p className="text-[11px] text-[#888] mt-0.5">Semak modul Rehabilitasi</p>
                          </div>
                        </button>
                      )}
                      {alerts.pendingSupplements > 0 && (
                        <button
                          onClick={() => { setNotifOpen(false); navigate('/performance/supplement?status=pending') }}
                          className="w-full flex gap-3 items-start px-4 py-3 hover:bg-gray-50 transition text-left"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F56A00] mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-semibold text-[#111]">{alerts.pendingSupplements} Permohonan Suplemen</p>
                            <p className="text-[11px] text-[#888] mt-0.5">Menunggu kelulusan pentadbir</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User chip */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(o => !o)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-[#F56A00] transition"
              >
                <div className="w-6 h-6 rounded-full bg-[rgba(245,106,0,0.12)] text-[#F56A00] text-[9px] font-bold flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <span className="text-[12px] font-medium text-[#444] max-w-[110px] truncate">
                  {profile?.full_name ?? '—'}
                </span>
                <svg className="w-3 h-3 text-[#bbb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {userOpen && (
                <div className="absolute top-11 right-0 w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[12px] font-semibold text-[#111] truncate">{profile?.full_name}</p>
                    <p className="text-[11px] text-[#888] capitalize mt-0.5">{profile?.role}</p>
                  </div>
                  <button
                    onClick={() => { setUserOpen(false); navigate('/profile') }}
                    className="w-full text-left px-4 py-3 text-[13px] text-[#888] hover:text-[#111] hover:bg-gray-50 transition border-b border-gray-50"
                  >
                    Profil Pengguna
                  </button>
                  <button
                    onClick={() => { setUserOpen(false); setChangePasswordOpen(true) }}
                    className="w-full text-left px-4 py-3 text-[13px] text-[#888] hover:text-[#111] hover:bg-gray-50 transition border-b border-gray-50"
                  >
                    Tukar Kata Laluan
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-[13px] text-[#888] hover:text-[#D44040] hover:bg-gray-50 transition"
                  >
                    Log Keluar
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {signingOut && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-8 h-8 text-[#F56A00]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-[#888]">Log keluar...</p>
          </div>
        </div>
      )}

      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Tukar Kata Laluan</h3>
              <button onClick={() => { setChangePasswordOpen(false); setCpForm({ currentPassword: '', password: '', confirm: '', showPw: false }); setCpError(null); setCpSuccess(false) }}
                className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {cpError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{cpError}</div>}
              {cpSuccess && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-700">Kata laluan berjaya dikemas kini.</div>}

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Kata Laluan Semasa</label>
                <input
                  type={cpForm.showPw ? 'text' : 'password'}
                  value={cpForm.currentPassword}
                  onChange={e => setCpForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Kata Laluan Baharu</label>
                <div className="relative">
                  <input
                    type={cpForm.showPw ? 'text' : 'password'}
                    value={cpForm.password}
                    onChange={e => setCpForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 12 aksara, huruf besar, kecil, nombor, dan aksara khas"
                    className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 pr-10 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCpForm(f => ({ ...f, showPw: !f.showPw }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#111] text-[11px] font-medium"
                  >
                    {cpForm.showPw ? 'Sembunyi' : 'Tunjuk'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Sahkan Kata Laluan</label>
                <input
                  type={cpForm.showPw ? 'text' : 'password'}
                  value={cpForm.confirm}
                  onChange={e => setCpForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>
            </div>
            {!cpSuccess && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => { setChangePasswordOpen(false); setCpForm({ currentPassword: '', password: '', confirm: '', showPw: false }); setCpError(null); setCpSuccess(false) }} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
                <button onClick={handleChangePassword} disabled={cpLoading || cpSuccess} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                  {cpLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
