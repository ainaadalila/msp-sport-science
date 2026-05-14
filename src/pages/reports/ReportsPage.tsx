import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ReportSkeleton } from '../../components/Skeleton'
import { ReadOnlyBanner } from '../../components/ReadOnlyBanner'
import { isReadOnlyMode } from '../../lib/readOnlyMode'

type ReportType = 'fitness' | 'inbody' | 'attendance' | 'supplement' | 'physio'

interface ReportConfig {
  key: ReportType
  label: string
  sub: string
  icon: React.ReactNode
}

const REPORTS: ReportConfig[] = [
  {
    key: 'fitness',
    label: 'Laporan Kecergasan',
    sub: 'Keputusan ujian kecergasan atlet',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    key: 'inbody',
    label: 'Laporan Komposisi Badan',
    sub: 'Rekod penilaian InBody atlet',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6m-16.78 7.78l4.24-4.24m2.12-2.12l4.24-4.24"/></svg>,
  },
  {
    key: 'attendance',
    label: 'Laporan Kehadiran',
    sub: 'Kehadiran sesi kekuatan & kondisioning',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
  {
    key: 'supplement',
    label: 'Laporan Suplemen',
    sub: 'Rekod permohonan & penggunaan suplemen',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>,
  },
  {
    key: 'physio',
    label: 'Laporan Fisioterapi',
    sub: 'Sesi dan kehadiran fisioterapi bulanan',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm5-9h-1v2h1V4zm0 15h-1v2h1v-2z"/></svg>,
  },
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
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface StatCard {
  label: string
  value: number | string
  color?: 'default' | 'green' | 'red' | 'orange'
}

function StatCard({ label, value, color = 'default' }: StatCard) {
  const colorClass = {
    default: 'text-[#111]',
    green: 'text-[#3A9E6A]',
    red: 'text-[#D44040]',
    orange: 'text-[#F56A00]',
  }[color]
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">{label}</p>
      <p className={`text-3xl font-bold font-mono ${colorClass} mb-1`}>{value}</p>
    </div>
  )
}

function computeStats(
  reportType: ReportType,
  data: Record<string, unknown>[]
): StatCard[] {
  if (!data.length) return []

  if (reportType === 'fitness') {
    const athletes = new Set(data.map(r => r['Nama Atlet']))
    const sports = new Set(data.map(r => r['Sukan']))
    return [
      { label: 'Total Rekod', value: data.length },
      { label: 'Jumlah Atlet Unik', value: athletes.size },
      { label: 'Bilangan Sukan', value: sports.size },
    ]
  } else if (reportType === 'inbody') {
    const athletes = new Set(data.map(r => r['Nama Atlet']))
    const baik = data.filter(r => r['Ulasan'] === 'BAIK').length
    return [
      { label: 'Total Rekod', value: data.length },
      { label: 'Jumlah Atlet Unik', value: athletes.size },
      { label: 'Skor BAIK', value: baik, color: 'green' },
    ]
  } else if (reportType === 'attendance') {
    const hadir = data.filter(r => r['Kehadiran'] === 'Hadir').length
    const tidakHadir = data.filter(r => r['Kehadiran'] === 'Tidak Hadir').length
    const mc = data.filter(r => r['Kehadiran'] === 'MC').length
    return [
      { label: 'Total Rekod', value: data.length },
      { label: 'Hadir', value: hadir, color: 'green' },
      { label: 'Tidak Hadir + MC', value: tidakHadir + mc, color: 'red' },
    ]
  } else if (reportType === 'supplement') {
    const approved = data.filter(r => r['Status'] === 'Diluluskan').length
    const rejected = data.filter(r => r['Status'] === 'Ditolak').length
    const pending = data.filter(r => r['Status'] === 'Menunggu').length
    return [
      { label: 'Total Permohonan', value: data.length },
      { label: 'Diluluskan', value: approved, color: 'green' },
      { label: 'Ditolak', value: rejected, color: 'red' },
      { label: 'Menunggu', value: pending, color: 'orange' },
    ]
  } else if (reportType === 'physio') {
    const athletes = new Set(data.map(r => r['Nama Atlet']))
    const totalSessions = (data as any[]).reduce((sum, r) => sum + ((r['Bilangan Sesi'] as number) || 0), 0)
    return [
      { label: 'Jumlah Sesi', value: totalSessions },
      { label: 'Jumlah Atlet Unik', value: athletes.size },
    ]
  }
  return []
}

export default function ReportsPage() {
  const readOnly = isReadOnlyMode()
  const [active, setActive] = useState<ReportType>('fitness')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [generated, setGenerated] = useState(false)
  const [sports, setSports] = useState<string[]>([])

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSession, setFilterSession] = useState('')

  const currentDate = new Date()
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear())
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth() + 1)

  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [previewSearch, setPreviewSearch] = useState('')

  useEffect(() => {
    async function fetchSports() {
      const { data: rows } = await supabase.from('athletes').select('sport').order('sport')
      const unique = [...new Set((rows ?? []).map((a: any) => a.sport))].filter(Boolean) as string[]
      setSports(unique)
    }
    fetchSports()
  }, [])

  function resetFilters() {
    setFilterFrom('')
    setFilterTo('')
    setFilterSport('')
    setFilterStatus('')
    setFilterSession('')
    setFilterYear(currentDate.getFullYear())
    setFilterMonth(currentDate.getMonth() + 1)
    setPreviewSearch('')
    setSortCol(null)
    setSortDir('asc')
    setData([])
    setGenerated(false)
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
            'Nama Atlet': r.athlete?.name ?? '—',
            'Sukan': r.athlete?.sport ?? '—',
            'Fasa': r.session,
            'Tahun': r.year,
            'Push Up': r.push_up ?? '',
            'Sit Up': r.sit_up ?? '',
            'Pull Up': r.pull_up ?? '',
            'Plank (s)': r.plank_sec ?? '',
            'Lompat Jauh (cm)': r.standing_broad_jump ?? '',
            'CMJ (cm)': r.counter_movement_jump ?? '',
            'Lontar Bola (m)': r.medicine_ball_throw ?? '',
            'Kekuatan Belakang (kg)': r.back_strength ?? '',
            'Genggaman (kg)': r.handgrip ?? '',
            'Duduk & Jangkau (cm)': r.sit_and_reach ?? '',
            'T-Test (s)': r.t_test ?? '',
            'Sprint 20m (s)': r.sprint_20m ?? '',
            'Sprint 40m (s)': r.sprint_40m ?? '',
            'Bleep Test': r.bleep_test ?? '',
            'Yo-Yo (m)': r.yoyo_test ?? '',
            'Larian 2400m (s)': r.run_2400m ?? '',
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
            'Tarikh': r.recorded_date,
            'Nama Atlet': r.athlete?.name ?? '—',
            'Sukan': r.athlete?.sport ?? '—',
            'Berat (kg)': r.weight ?? '',
            'SMM (kg)': r.smm ?? '',
            'Lemak Badan (kg)': r.body_fat_mass ?? '',
            'BMI': r.bmi ?? '',
            'Lemak (%)': r.fat_pct ?? '',
            'BMR (kcal)': r.bmr ?? '',
            'Skor InBody': r.inbody_score ?? '',
            'Skor SUKMA': r.skor != null ? `${r.skor}/5` : '',
            'Ulasan': r.ulasan ?? '',
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
            'Tarikh': r.session_date,
            'Nama Atlet': r.athlete?.name ?? '—',
            'Sukan': r.athlete?.sport ?? '—',
            'Kehadiran': attendanceMap[r.attendance] ?? r.attendance,
            'Program Latihan': r.training_program ?? '',
            'Nota': r.notes ?? '',
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
          'Tarikh Permohonan': r.request_date,
          'Nama Atlet': r.athlete?.name ?? '—',
          'Sukan': r.athlete?.sport ?? '—',
          'Suplemen': r.supplement?.name ?? '—',
          'Kuantiti': r.quantity,
          'Unit': r.supplement?.unit ?? '',
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
      setSortCol(null)
      setSortDir('asc')
    }
  }

  const displayData = useMemo(() => {
    let d = data
    if (previewSearch) {
      const q = previewSearch.toLowerCase()
      d = d.filter(row =>
        Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
      )
    }
    if (sortCol) {
      d = [...d].sort((a, b) => {
        const av = a[sortCol] ?? ''
        const bv = b[sortCol] ?? ''
        const an = parseFloat(String(av))
        const bn = parseFloat(String(bv))
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return d
  }, [data, previewSearch, sortCol, sortDir])

  const config = REPORTS.find(r => r.key === active)!
  const columns = data.length > 0 ? Object.keys(data[0]) : []
  const stats = computeStats(active, data)

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />
      <p className="text-[12px] text-[#888]">Jana dan eksport laporan mengikut modul</p>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Report type selector */}
        <div className="space-y-2">
          {REPORTS.map(r => (
            <button
              key={r.key}
              onClick={() => { setActive(r.key); resetFilters() }}
              className={`w-full text-left px-4 py-3 rounded-xl border-l-2 transition ${
                active === r.key
                  ? 'bg-[rgba(245,106,0,0.06)] border-l-[#F56A00] border-gray-200'
                  : 'bg-white border-l-transparent border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[#F56A00] opacity-60">{r.icon}</span>
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
                    <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className={inputCls}>
                      <option value="">Semua Sukan</option>
                      {sports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                  <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className={inputCls}>
                    <option value="">Semua Sukan</option>
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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

          {loading && <ReportSkeleton />}

          {generated && (
            <>
              {stats.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                  ))}
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {data.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(245,106,0,0.1)] flex items-center justify-center">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F56A00" strokeWidth="1.6">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#111] mb-1.5">Tiada data untuk penapis yang dipilih</p>
                      <p className="text-[12px] text-[#888] leading-relaxed">Cuba ubah julat tarikh atau pilihan penapis anda.</p>
                    </div>
                    <button onClick={resetFilters} className="text-sm text-[#F56A00] hover:underline font-medium">
                      Kosongkan Penapis
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="Cari di dalam jadual..."
                        value={previewSearch}
                        onChange={e => setPreviewSearch(e.target.value)}
                        className="w-56 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white placeholder-[#bbb]"
                      />
                      <span className="text-[11px] text-[#888]">
                        {displayData.length} / {data.length} rekod
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {columns.map(col => (
                              <th
                                key={col}
                                onClick={() => {
                                  if (sortCol === col) {
                                    setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setSortCol(col)
                                    setSortDir('asc')
                                  }
                                }}
                                className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-50 transition"
                              >
                                <div className="flex items-center gap-1.5">
                                  {col}
                                  {sortCol === col && (
                                    <span className="text-[#F56A00]">
                                      {sortDir === 'asc' ? '▲' : '▼'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.slice(0, 50).map((row, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                              {columns.map(col => (
                                <td key={col} className="px-4 py-2.5 text-[#444] whitespace-nowrap">
                                  {String(row[col] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {displayData.length > 50 && (
                        <p className="px-4 py-3 text-[11px] text-[#888] border-t border-gray-100">
                          Menunjukkan 50 daripada {displayData.length} rekod. Eksport CSV untuk semua data.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'
