import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Stats {
  totalAthletes: number
  activeAthletes: number
  injuredAthletes: number
  pendingSupplements: number
}

interface RecentLog {
  id: string
  user_name: string
  activity: string
  date: string
}

const alertStyles: Record<string, string> = {
  danger: 'bg-red-50 border-red-200',
  warning: 'bg-[rgba(245,106,0,0.06)] border-[rgba(245,106,0,0.2)]',
}
const alertIconColor: Record<string, string> = {
  danger: 'text-[#D44040]',
  warning: 'text-[#F56A00]',
}

const quickLinks = [
  {
    label: 'Profil Atlet',
    sub: 'Daftar & urus atlet',
    href: '/athletes',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  },
  {
    label: 'Ujian Kecergasan',
    sub: 'Rekod keputusan ujian',
    href: '/fitness/testing',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    label: 'Penilaian InBody',
    sub: 'Rekod komposisi badan',
    href: '/performance/inbody',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6m-16.78 7.78l4.24-4.24m2.12-2.12l4.24-4.24"/></svg>,
  },
  {
    label: 'Pengurusan Suplemen',
    sub: 'Urus inventori & permohonan',
    href: '/performance/supplement',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>,
  },
  {
    label: 'Saringan Fisioterapi',
    sub: 'Tempah & urus sesi',
    href: '/rehabilitation/physio',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm5-9h-1v2h1V4zm0 15h-1v2h1v-2z"/></svg>,
  },
  {
    label: 'Laporan',
    sub: 'Jana & eksport laporan',
    href: '/reports',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
]

function formatAction(action: string) {
  const map: Record<string, string> = {
    create_athlete: 'Daftar atlet',
    update_athlete: 'Kemaskini atlet',
    delete_athlete: 'Padam atlet',
    create_sc_session: 'Rekod sesi S&C',
    update_sc_session: 'Kemaskini sesi S&C',
    create_fitness_test: 'Rekod ujian kecergasan',
    update_fitness_test: 'Kemaskini ujian kecergasan',
    create_inbody: 'Rekod InBody',
    update_inbody: 'Kemaskini InBody',
    create_supplement: 'Tambah suplemen',
    update_supplement: 'Kemaskini suplemen',
    submit_supplement_request: 'Mohon suplemen',
    approve_supplement: 'Luluskan suplemen',
    reject_supplement: 'Tolak suplemen',
    create_physio_slot: 'Rekod slot fisioterapi',
    update_physio_slot: 'Kemaskini slot fisioterapi',
  }
  return map[action] ?? action
}

export default function DashboardPage() {
  const { session, profile } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalAthletes: 0,
    activeAthletes: 0,
    injuredAthletes: 0,
    pendingSupplements: 0,
  })
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    async function fetchDashboard() {
      try {
        const [athleteRes, pendingRes, logsRes] = await Promise.all([
          supabase.from('athletes').select('id, status'),
          supabase.from('supplement_requests').select('count', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('audit_logs').select('id, action, created_at, profile:user_id(full_name)').order('created_at', { ascending: false }).limit(5),
        ])

        const all = athleteRes.data ?? []
        setStats({
          totalAthletes: all.length,
          activeAthletes: all.filter(a => a.status === 'active').length,
          injuredAthletes: all.filter(a => a.status === 'injured').length,
          pendingSupplements: pendingRes.count ?? 0,
        })

        setRecentLogs(
          (logsRes.data ?? []).map((log: any) => ({
            id: log.id,
            user_name: (log.profile as any)?.full_name || '—',
            activity: formatAction(log.action),
            date: new Date(log.created_at).toLocaleDateString('ms-MY', {
              day: '2-digit', month: 'short', year: 'numeric',
            }),
          }))
        )
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [session])

  const statCards = [
    {
      label: 'Jumlah Atlet',
      value: stats.totalAthletes,
      sub: 'Terdaftar dalam sistem',
      valueColor: 'text-[#111]',
      href: '/athletes',
    },
    {
      label: 'Atlet Aktif',
      value: stats.activeAthletes,
      sub: `${stats.totalAthletes > 0 ? Math.round((stats.activeAthletes / stats.totalAthletes) * 100) : 0}% daripada jumlah`,
      valueColor: 'text-[#3A9E6A]',
      href: '/athletes',
    },
    {
      label: 'Kecederaan',
      value: stats.injuredAthletes,
      sub: 'Atlet berstatus cedera',
      valueColor: stats.injuredAthletes > 0 ? 'text-[#D44040]' : 'text-[#111]',
      href: '/rehabilitation/physio',
    },
    {
      label: 'Permohonan Suplemen',
      value: stats.pendingSupplements,
      sub: 'Menunggu kelulusan',
      valueColor: stats.pendingSupplements > 0 ? 'text-[#F56A00]' : 'text-[#111]',
      href: '/performance/supplement',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#888] text-sm">
        Memuatkan...
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link
            key={card.label}
            to={card.href}
            className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4 hover:border-[#F56A00] hover:shadow-sm transition"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">
              {card.label}
            </p>
            <p className={`text-3xl font-bold font-mono mb-1 ${card.valueColor}`}>
              {card.value}
            </p>
            <p className="text-[11px] text-[#888]">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* Recent activity - admin only */}
        {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#111]">Aktiviti Terkini</h3>
          </div>
          {recentLogs.length === 0 ? (
            <div className="px-5 py-10 text-center text-[#888] text-sm">
              Tiada aktiviti lagi.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Pengguna', 'Aktiviti', 'Tarikh'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(row => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[#111]">{row.user_name}</td>
                    <td className="px-5 py-3 text-[#444]">{row.activity}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-[#888]">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}

        {/* Right col */}
        <div className="flex flex-col gap-4">

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#111]">Makluman</h3>
            </div>
            <div className="px-4 py-3 space-y-2">
              {stats.injuredAthletes > 0 && (
                <div className={`flex gap-3 items-start px-3 py-2.5 rounded-lg border ${alertStyles.danger}`}>
                  <span className={`text-sm shrink-0 ${alertIconColor.danger}`}>⚠</span>
                  <div>
                    <p className="text-xs font-semibold text-[#111]">{stats.injuredAthletes} Atlet Cedera</p>
                    <p className="text-[11px] text-[#888]">Semak modul Rehabilitasi</p>
                  </div>
                </div>
              )}
              {stats.pendingSupplements > 0 && (
                <div className={`flex gap-3 items-start px-3 py-2.5 rounded-lg border ${alertStyles.warning}`}>
                  <span className={`text-sm shrink-0 ${alertIconColor.warning}`}>◉</span>
                  <div>
                    <p className="text-xs font-semibold text-[#111]">{stats.pendingSupplements} Permohonan Suplemen</p>
                    <p className="text-[11px] text-[#888]">Menunggu kelulusan pentadbir</p>
                  </div>
                </div>
              )}
              {stats.injuredAthletes === 0 && stats.pendingSupplements === 0 && (
                <p className="text-xs text-[#888] py-2 text-center">Tiada makluman.</p>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#111]">Akses Pantas</h3>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {quickLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex flex-col gap-1 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-[#F56A00] hover:bg-[rgba(245,106,0,0.04)] transition"
                >
                  <div className="text-[#F56A00] opacity-60">{link.icon}</div>
                  <span className="text-[11px] font-semibold text-[#111] leading-tight">{link.label}</span>
                  <span className="text-[10px] text-[#888] leading-tight">{link.sub}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
