import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type ReportType = 'fitness' | 'inbody' | 'attendance' | 'supplement' | 'physio'

interface ReportConfig {
  key: ReportType
  label: string
  sub: string
  icon: string
}

const REPORTS: ReportConfig[] = [
  { key: 'fitness', label: 'Laporan Kecergasan', sub: 'Keputusan ujian kecergasan atlet', icon: '📊' },
  { key: 'inbody', label: 'Laporan Komposisi Badan', sub: 'Rekod penilaian InBody atlet', icon: '⚖️' },
  { key: 'attendance', label: 'Laporan Kehadiran', sub: 'Kehadiran sesi kekuatan & kondisioning', icon: '📋' },
  { key: 'supplement', label: 'Laporan Suplemen', sub: 'Rekod permohonan & penggunaan suplemen', icon: '💊' },
  { key: 'physio', label: 'Laporan Fisioterapi', sub: 'Sesi dan kehadiran fisioterapi bulanan', icon: '🏥' },
]

const MONTHS_MY = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
      }).join(',')
    ),
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [active, setActive] = useState<ReportType>('fitness')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [generated, setGenerated] = useState(false)

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSession, setFilterSession] = useState('')

  const currentDate = new Date()
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear())
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1)

  function resetFilters() {
    setFilterFrom(''); setFilterTo(''); setFilterSport('')
    setFilterStatus(''); setFilterSession('')
    setFilterYear(currentDate.getFullYear()); setFilterMonth(currentDate.getMonth() + 1)
    setData([]); setGenerated(false)
  }

  async function generate() {
    setLoading(true)
    setData([])
    try {
      if (active === 'fitness') {
        let q = supabase.from('fitness_tests').select('*, athlete:athletes(name, sport)').order('year', { ascending: false })
        if (filterSession) q = q.eq('session', filterSession)
        const { data: rows } = await q
        setData((rows ?? [])
          .filter(r => !filterSport || r.athlete?.sport === filterSport)
          .map(r => ({
            'Nama Atlet': r.athlete?.name ?? '—', 'Sukan': r.athlete?.sport ?? '—',
            'Fasa': r.session, 'Tahun': r.year,
            'Push Up': r.push_up ?? '', 'Sit Up': r.sit_up ?? '', 'Pull Up': r.pull_up ?? '',
            'Plank (s)': r.plank_sec ?? '', 'Lompat Jauh (cm)': r.standing_broad_jump ?? '',
            'CMJ (cm)': r.counter_movement_jump ?? '', 'Lontar Bola (m)': r.medicine_ball_throw ?? '',
            'Kekuatan Belakang (kg)': r.back_strength ?? '', 'Genggaman (kg)': r.handgrip ?? '',
            'Duduk & Jangkau (cm)': r.sit_and_reach ?? '',
            'T-Test (s)': r.t_test ?? '', 'Sprint 20m (s)': r.sprint_20m ?? '', 'Sprint 40m (s)': r.sprint_40m ?? '',
            'Bleep Test': r.bleep_test ?? '', 'Yo-Yo (m)': r.yoyo_test ?? '', 'Larian 2400m (s)': r.run_2400m ?? '',
          }))
        )
      } else if (active === 'inbody') {
        let q = supabase.from('inbody_records').select('*, athlete:athletes(name, sport)').order('recorded_date', { ascending: false })
        if (filterFrom) q = q.gte('recorded_date', filterFrom)
        if (filterTo) q = q.lte('recorded_date', filterTo)
        const { data: rows } = await q
        setData((rows ?? [])
          .filter(r => !filterSport || r.athlete?.sport === filterSport)
          .map(r => ({
            'Tarikh': r.recorded_date, 'Nama Atlet': r.athlete?.name ?? '—', 'Sukan': r.athlete?.sport ?? '—',
            'Berat (kg)': r.weight ?? '', 'SMM (kg)': r.smm ?? '', 'Lemak Badan (kg)': r.body_fat_mass ?? '',
            'BMI': r.bmi ?? '', 'Lemak (%)': r.fat_pct ?? '', 'BMR (kcal)': r.bmr ?? '',
            'Skor InBody': r.inbody_score ?? '', 'Skor SUKMA': r.skor != null ? `${r.skor}/5` : '', 'Ulasan': r.ulasan ?? '',
          }))
        )
      } else if (active === 'attendance') {
        let q = supabase.from('strength_conditioning').select('*, athlete:athletes(name, sport)').order('session_date', { ascending: false })
        if (filterFrom) q = q.gte('session_date', filterFrom)
        if (filterTo) q = q.lte('session_date', filterTo)
        if (filterStatus) q = q.eq('attendance', filterStatus)
        const { data: rows } = await q
        const attendanceMap: Record<string, string> = { present: 'Hadir', absent: 'Tidak Hadir', mc: 'MC' }
        setData((rows ?? [])
          .filter(r => !filterSport || r.athlete?.sport === filterSport)
          .map(r => ({
            'Tarikh': r.session_date, 'Nama Atlet': r.athlete?.name ?? '—', 'Sukan': r.athlete?.sport ?? '—',
            'Kehadiran': attendanceMap[r.attendance] ?? r.attendance,
            'Program Latihan': r.training_program ?? '', 'Nota': r.notes ?? '',
          }))
        )
      } else if (active === 'supplement') {
        let q = supabase.from('supplement_requests')
          .select('*, athlete:athletes(name, sport), supplement:supplements(name, unit)')
          .order('created_at', { ascending: false })
        if (filterStatus) q = q.eq('status', filterStatus)
        if (filterFrom) q = q.gte('request_date', filterFrom)
        if (filterTo) q = q.lte('request_date', filterTo)
        const { data: rows } = await q
        const statusMap: Record<string, string> = { pending: 'Menunggu', approved: 'Diluluskan', rejected: 'Ditolak' }
        setData((rows ?? []).map(r => ({
          'Tarikh Permohonan': r.request_date, 'Nama Atlet': r.athlete?.name ?? '—', 'Sukan': r.athlete?.sport ?? '—',
          'Suplemen': r.supplement?.name ?? '—', 'Kuantiti': r.quantity, 'Unit': r.supplement?.unit ?? '',
          'Status': statusMap[r.status] ?? r.status,
        })))
      } else if (active === 'physio') {
        const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
        const endDate = new Date(filterYear, filterMonth, 0).toISOString().slice(0, 10)
        const { data: rows } = await supabase
          .from('physio_slots')
          .select('athlete_id, slot_date, pain_scale, athlete:athletes(name, sport)')
          .gte('slot_date', startDate)
          .lte('slot_date', endDate)
          .not('athlete_id', 'is', null)
          .order('slot_date', { ascending: true })

        const grouped = new Map<string, Record<string, unknown>>()
        ;(rows ?? []).forEach((s: any) => {
          const athleteName = Array.isArray(s.athlete) ? s.athlete[0]?.name : s.athlete?.name
          const athleteSport = Array.isArray(s.athlete) ? s.athlete[0]?.sport : s.athlete?.sport
          if (filterSport && athleteSport !== filterSport) return
          if (!grouped.has(s.athlete_id)) {
            grouped.set(s.athlete_id, {
              'Nama Atlet': athleteName ?? '—',
              'Sukan': athleteSport ?? '—',
              'Bilangan Sesi': 0,
              'Tarikh Sesi': '',
              'Skala Kesakitan Terkini': '—',
            })
          }
          const row = grouped.get(s.athlete_id)!
          const count = (row['Bilangan Sesi'] as number) + 1
          const dates = (row['Tarikh Sesi'] as string).split(', ').filter(Boolean)
          if (!dates.includes(s.slot_date)) dates.push(s.slot_date)
          row['Bilangan Sesi'] = count
          row['Tarikh Sesi'] = dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })).join(', ')
          if (s.pain_scale !== null) row['Skala Kesakitan Terkini'] = `${s.pain_scale} / 10`
        })
        setData([...grouped.values()].sort((a, b) => (a['Sukan'] as string).localeCompare(b['Sukan'] as string) || (a['Nama Atlet'] as string).localeCompare(b['Nama Atlet'] as string)))
      }
    } finally {
      setLoading(false)
      setGenerated(true)
    }
  }

  const config = REPORTS.find(r => r.key === active)!
  const columns = data.length > 0 ? Object.keys(data[0]) : []

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#888]">Jana dan eksport laporan mengikut modul</p>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">

        {/* Report type selector */}
        <div className="space-y-2">
          {REPORTS.map(r => (
            <button
              key={r.key}
              onClick={() => { setActive(r.key); resetFilters() }}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${active === r.key ? 'bg-[rgba(245,106,0,0.06)] border-[rgba(245,106,0,0.25)]' : 'bg-white border-gray-200 hover:border-[#F56A00]'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{r.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${active === r.key ? 'text-[#F56A00]' : 'text-[#111]'}`}>{r.label}</p>
                  <p className="text-[11px] text-[#888] mt-0.5">{r.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Filters + preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111]">{config.label}</p>
              {generated && <span className="text-[11px] text-[#888]">{data.length} rekod dijana</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {active === 'fitness' && (
                <div>
                  <label className={labelCls}>Fasa</label>
                  <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className={inputCls}>
                    <option value="">Semua Fasa</option>
                    <option value="Jan">Fasa Jan</option>
                    <option value="Apr">Fasa Apr</option>
                    <option value="Jul">Fasa Jul</option>
                    <option value="Oct">Fasa Okt</option>
                  </select>
                </div>
              )}
              {active === 'physio' && (
                <>
                  <div>
                    <label className={labelCls}>Tahun</label>
                    <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className={inputCls}>
                      {Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Bulan</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className={inputCls}>
                      {MONTHS_MY.map((month, idx) => (
                        <option key={idx} value={idx + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Sukan</label>
                    <input value={filterSport} onChange={e => setFilterSport(e.target.value)} className={inputCls} placeholder="cth. Badminton" />
                  </div>
                </>
              )}
              {(active === 'attendance' || active === 'inbody' || active === 'supplement') && (
                <>
                  <div>
                    <label className={labelCls}>Dari Tarikh</label>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Hingga Tarikh</label>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputCls} />
                  </div>
                </>
              )}
              {(active === 'fitness' || active === 'inbody' || active === 'attendance') && (
                <div>
                  <label className={labelCls}>Sukan</label>
                  <input value={filterSport} onChange={e => setFilterSport(e.target.value)} className={inputCls} placeholder="cth. Badminton" />
                </div>
              )}
              {active === 'attendance' && (
                <div>
                  <label className={labelCls}>Kehadiran</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
                    <option value="">Semua</option>
                    <option value="present">Hadir</option>
                    <option value="absent">Tidak Hadir</option>
                    <option value="mc">MC</option>
                  </select>
                </div>
              )}
              {active === 'supplement' && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
                    <option value="">Semua</option>
                    <option value="pending">Menunggu</option>
                    <option value="approved">Diluluskan</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={generate} disabled={loading} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {loading ? 'Menjana...' : 'Jana Laporan'}
              </button>
              {data.length > 0 && (
                <button
                  onClick={() => downloadCSV(`${config.label}_${new Date().toISOString().slice(0, 10)}.csv`, data)}
                  className="px-5 py-2 border border-gray-200 hover:border-[#F56A00] hover:text-[#F56A00] text-[#444] text-sm font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Eksport CSV
                </button>
              )}
            </div>
          </div>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {data.length === 0 ? (
                <div className="py-12 text-center text-[#888] text-sm">Tiada data untuk penapis yang dipilih.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {columns.map(col => (
                          <th key={col} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          {columns.map(col => (
                            <td key={col} className="px-4 py-2.5 text-[#444] whitespace-nowrap">{String(row[col] ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 50 && (
                    <p className="px-4 py-3 text-[11px] text-[#888] border-t border-gray-100">
                      Menunjukkan 50 daripada {data.length} rekod. Eksport CSV untuk semua data.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'
