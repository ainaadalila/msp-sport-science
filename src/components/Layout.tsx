import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const routeMeta: Record<string, { title: string; parent?: string }> = {
  '/':                            { title: 'Dashboard' },
  '/athletes':                    { title: 'Profil Atlet', parent: 'Dashboard' },
  '/fitness/strength':            { title: 'Kekuatan & Kondisioning', parent: 'Sains Sukan' },
  '/fitness/testing':             { title: 'Ujian Kecergasan', parent: 'Sains Sukan' },
  '/fitness/config':              { title: 'Konfigurasi Ujian', parent: 'Sains Sukan' },
  '/performance/inbody':          { title: 'Penilaian InBody', parent: 'Sains Sukan' },
  '/performance/supplement':      { title: 'Pengurusan Suplemen', parent: 'Sains Sukan' },
  '/rehabilitation/physio':       { title: 'Saringan Fisioterapi', parent: 'Sains Sukan' },
  '/rehabilitation/physio/cases': { title: 'Pengurusan Kes Fisioterapi', parent: 'Sains Sukan' },
  '/reports':                     { title: 'Laporan', parent: 'Dashboard' },
  '/admin/users':                 { title: 'Pengurusan Pengguna', parent: 'Dashboard' },
}

interface AlertCounts { injured: number; pendingSupplements: number }

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [alerts, setAlerts] = useState<AlertCounts>({ injured: 0, pendingSupplements: 0 })
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

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
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="flex h-screen bg-[#F2F4F7]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
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
                          onClick={() => { setNotifOpen(false); navigate('/rehabilitation/physio') }}
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
                          onClick={() => { setNotifOpen(false); navigate('/performance/supplement') }}
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
    </div>
  )
}
