import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ReportSkeleton } from '../../components/Skeleton'

type ReportType = 'fitness' | 'inbody' | 'attendance' | 'supplement' | 'physio' | 'psychology'
type PhysioMode = 'ringkasan' | 'terperinci'
type LatihkanMode = 'jadual' | 'program' | 'kehadiran'
type SupplementMode = 'permohonan' | 'stok'

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
    label: 'Laporan Latihan Suaian Fizikal',
    sub: 'Rekod sesi latihan kekuatan & kondisioning atlet',
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
  {
    key: 'psychology',
    label: 'Laporan Psikologi',
    sub: 'Penilaian psikologi atlet merentasi fasa',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>,
  },
]

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

function getCellStyle(reportType: ReportType, col: string, value: unknown): string {
  const strVal = String(value ?? '')

  if (reportType === 'inbody') {
    if (col === 'Skor InBody') {
      const num = parseFloat(strVal)
      if (num >= 80) return 'bg-green-50 text-[#3A9E6A]'
      if (num >= 60) return 'bg-orange-50 text-[#F56A00]'
      return 'bg-red-50 text-[#D44040]'
    }
    if (col === 'BMI') {
      const num = parseFloat(strVal)
      if (num >= 18.5 && num <= 24.9) return 'bg-green-50 text-[#3A9E6A]'
      if ((num >= 25 && num <= 29.9) || num < 18.5) return 'bg-orange-50 text-[#F56A00]'
      return 'bg-red-50 text-[#D44040]'
    }
    if (col === 'Skor SUKMA') {
      const prefix = strVal.split('/')[0]
      const num = parseFloat(prefix)
      if (num >= 3) return 'bg-green-50 text-[#3A9E6A]'
      if (num === 2) return 'bg-orange-50 text-[#F56A00]'
      return 'bg-red-50 text-[#D44040]'
    }
  }

  if (reportType === 'attendance' && col === 'Kehadiran') {
    if (strVal === 'Hadir') return 'bg-green-50 text-[#3A9E6A]'
    if (strVal === 'MC') return 'bg-orange-50 text-[#F56A00]'
    return 'bg-red-50 text-[#D44040]'
  }

  if (reportType === 'supplement' && col === 'Status') {
    if (strVal.includes('Diluluskan')) return 'bg-green-50 text-[#3A9E6A]'
    if (strVal.includes('Menunggu')) return 'bg-yellow-50 text-yellow-700'
    return 'bg-red-50 text-[#D44040]'
  }

  if (reportType === 'physio' && (col === 'Skala Kesakitan Terkini' || col === 'Skala Kesakitan')) {
    const match = strVal.match(/\d+/)
    if (match) {
      const num = parseFloat(match[0])
      if (num <= 3) return 'bg-green-50 text-[#3A9E6A]'
      if (num <= 6) return 'bg-orange-50 text-[#F56A00]'
      return 'bg-red-50 text-[#D44040]'
    }
  }

  if (reportType === 'psychology') {
    if (col === 'Kebimbangan Kognitif') {
      const num = parseFloat(strVal)
      if (num >= 5 && num <= 10) return 'bg-green-50 text-[#3A9E6A]'
      if (num >= 11 && num <= 15) return 'bg-orange-50 text-[#F56A00]'
      if (num >= 16) return 'bg-red-50 text-[#D44040]'
    }
    if (col === 'Kebimbangan Somatik') {
      const num = parseFloat(strVal)
      if (num >= 8 && num <= 14) return 'bg-green-50 text-[#3A9E6A]'
      if (num >= 15 && num <= 21) return 'bg-orange-50 text-[#F56A00]'
      if (num >= 22) return 'bg-red-50 text-[#D44040]'
    }
    if (col === 'Kepercayaan Diri') {
      const num = parseFloat(strVal)
      if (num >= 16) return 'bg-green-50 text-[#3A9E6A]'
      if (num >= 11 && num <= 15) return 'bg-orange-50 text-[#F56A00]'
      if (num >= 5 && num <= 10) return 'bg-red-50 text-[#D44040]'
    }
  }

  return ''
}

function computeSummaryRow(reportType: ReportType, data: Record<string, unknown>[], latihkanMode?: LatihkanMode): string {
  if (!data.length) return ''

  if (reportType === 'fitness') {
    const athletes = new Set(data.map(r => r['Nama Atlet']))
    return `Jumlah ${data.length} rekod · ${athletes.size} atlet unik`
  }

  if (reportType === 'inbody') {
    const avgBmi = (data as any[]).reduce((sum, r) => sum + (parseFloat(String(r['BMI'] ?? 0)) || 0), 0) / data.length
    const avgScore = (data as any[]).reduce((sum, r) => sum + (parseFloat(String(r['Skor InBody'] ?? 0)) || 0), 0) / data.length
    const baik = data.filter(r => (parseFloat(String(r['Skor InBody'] ?? 0)) || 0) >= 80).length
    const pct = Math.round((baik / data.length) * 100)
    return `Purata BMI: ${avgBmi.toFixed(1)} · Purata Skor: ${avgScore.toFixed(1)} · ${pct}% Skor BAIK`
  }

  if (reportType === 'attendance') {
    if (latihkanMode === 'kehadiran') {
      const hadir = data.filter(r => r['Kehadiran'] === 'Hadir').length
      const tidakHadir = data.filter(r => r['Kehadiran'] === 'Tidak Hadir').length
      const mc = data.filter(r => r['Kehadiran'] === 'MC').length
      const hadirPct = Math.round((hadir / data.length) * 100)
      return `Hadir: ${hadir} (${hadirPct}%) · Tidak Hadir: ${tidakHadir} · MC: ${mc}`
    } else if (latihkanMode === 'jadual') {
      const jurulatihCount = new Set(data.map(r => r['Jurulatih'])).size
      return `Jumlah ${data.length} sesi daripada ${jurulatihCount} jurulatih`
    } else if (latihkanMode === 'program') {
      return `Jumlah ${data.length} program latihan`
    }
  }

  if (reportType === 'supplement') {
    if (data.length > 0 && 'Stok Semasa' in data[0]) {
      const low = data.filter(r => (r['Stok Semasa'] as number) < 10).length
      return `Jumlah ${data.length} suplemen · ${low} stok rendah (<10)`
    }
    const approved = data.filter(r => String(r['Status'] ?? '').includes('Diluluskan')).length
    const rejected = data.filter(r => String(r['Status'] ?? '').includes('Ditolak')).length
    const pending = data.filter(r => String(r['Status'] ?? '').includes('Menunggu')).length
    return `Jumlah ${data.length} · Diluluskan: ${approved} · Ditolak: ${rejected} · Menunggu: ${pending}`
  }

  if (reportType === 'physio') {
    const athletes = new Set(data.map(r => r['Nama Atlet']))
    if ('Bilangan Sesi' in data[0]) {
      const totalSessions = (data as any[]).reduce((sum, r) => sum + ((r['Bilangan Sesi'] as number) || 0), 0)
      return `Jumlah ${totalSessions} sesi · ${athletes.size} atlet`
    }
    return `Jumlah ${data.length} rekod sesi · ${athletes.size} atlet`
  }

  if (reportType === 'psychology') {
    const athletes = new Set(data.map(r => r['Atlet']))
    const avgCog = (data as any[]).reduce((sum, r) => sum + (parseFloat(String(r['Kebimbangan Kognitif'] ?? 0)) || 0), 0) / data.length
    const avgSom = (data as any[]).reduce((sum, r) => sum + (parseFloat(String(r['Kebimbangan Somatik'] ?? 0)) || 0), 0) / data.length
    const avgConf = (data as any[]).reduce((sum, r) => sum + (parseFloat(String(r['Kepercayaan Diri'] ?? 0)) || 0), 0) / data.length
    return `Jumlah ${data.length} rekod · ${athletes.size} atlet · Kognitif: ${avgCog.toFixed(1)} · Somatik: ${avgSom.toFixed(1)} · Keyakinan: ${avgConf.toFixed(1)}`
  }

  return ''
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

  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [previewSearch, setPreviewSearch] = useState('')

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [physioMode, setPhysioMode] = useState<PhysioMode>('ringkasan')
  const [latihkanMode, setLatihkanMode] = useState<LatihkanMode>('kehadiran')
  const [supplementMode, setSupplementMode] = useState<SupplementMode>('permohonan')
  const [dateColumnFilters, setDateColumnFilters] = useState<Record<string, { from: string; to: string }>>({})
  const [columnFilters, setColumnFilters] = useState<Record<string, string | string[]>>({})
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
  const [dropdownSearches, setDropdownSearches] = useState<Record<string, string>>({})

  // Auto-generate report when active report type changes
  useMemo(() => {
    const autoGenerate = async () => {
      setLoading(true)
      setData([])
      try {
        // Call the appropriate query based on active report type
        if (active === 'fitness') {
          let q = supabase
            .from('fitness_test_sessions')
            .select('*, athlete:athletes(name, ic_number, category, sport_id, sport:sport_id(name))')
            .order('recorded_date', { ascending: false }).limit(5000)
          if (filterSession) {
            q = q.eq('session', filterSession)
          }
          const { data: sessions, error: sessError } = await q
          if (sessError) throw sessError

          const sessionIds = (sessions ?? []).map((s: any) => s.id)
          const resultMap = new Map<string, Map<string, string>>()

          if (sessionIds.length > 0) {
            const { data: results } = await supabase
              .from('fitness_test_results')
              .select('session_id, test_id, result_value, test:test_id(test_name)')
              .in('session_id', sessionIds)

            ;(results ?? []).forEach((res: any) => {
              if (!resultMap.has(res.session_id)) {
                resultMap.set(res.session_id, new Map())
              }
              const testName = res.test?.test_name ?? `Test ${res.test_id}`
              resultMap.get(res.session_id)!.set(testName, res.result_value ?? '')
            })
          }

          setData((sessions ?? [])
            .filter(r => !filterSport || r.athlete?.sport?.name === filterSport)
            .map(r => {
              const rowResults = resultMap.get(r.id) || new Map()
              return {
                'Nama Atlet': r.athlete?.name ?? '—',
                'NO. IC': r.athlete?.ic_number ?? '—',
                'Sukan': r.athlete?.sport?.name ?? '—',
                'Kategori': r.athlete?.category ?? '—',
                'Fasa': r.session,
                'Tahun': r.year,
                'Tarikh': r.recorded_date,
                ...Object.fromEntries(rowResults),
              }
            })
          )
        } else if (active === 'inbody') {
          let q = supabase.from('inbody_records').select('recorded_date, weight, smm, bmi, fat_pct, inbody_score, diet_plan_url, athlete:athletes(name, sport_id, sport:sport_id(name))').order('recorded_date', { ascending: false }).limit(5000) as any
          if (filterFrom) q = q.gte('recorded_date', filterFrom)
          if (filterTo) q = q.lte('recorded_date', filterTo)
          const { data: rows } = await q
          setData((rows ?? [])
            .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
            .map((r: any) => ({
              'Tarikh': r.recorded_date,
              'Atlet': r.athlete?.name ?? '—',
              'Sukan': r.athlete?.sport?.name ?? '—',
              'Berat (kg)': r.weight ?? '',
              'BMI': r.bmi ?? '',
              'Lemak (%)': r.fat_pct ?? '',
              'SMM (kg)': r.smm ?? '',
              'Skor InBody': r.inbody_score ?? '',
              'Diet Plan': r.diet_plan_url ? 'Ya' : 'Tidak',
            }))
          )
        } else if (active === 'attendance') {
          if (latihkanMode === 'kehadiran') {
            let q = supabase.from('strength_conditioning').select('session_date, attendance, athlete:athletes(name, sport_id, sport:sport_id(name))').order('session_date', { ascending: false }).limit(5000) as any
            if (filterFrom) q = q.gte('session_date', filterFrom)
            if (filterTo) q = q.lte('session_date', filterTo)
            if (filterStatus) q = q.eq('attendance', filterStatus)
            const { data: rows } = await q
            const attendanceMap: Record<string, string> = { present: 'Hadir', absent: 'Tidak Hadir', mc: 'MC' }
            setData((rows ?? [])
              .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
              .map((r: any) => ({
                'Tarikh': r.session_date,
                'Nama Atlet': r.athlete?.name ?? '—',
                'Sukan': r.athlete?.sport?.name ?? '—',
                'Kehadiran': attendanceMap[r.attendance] ?? r.attendance,
              }))
            )
          } else if (latihkanMode === 'jadual') {
            const { data: schedules, error } = await supabase
              .from('coach_schedules')
              .select('id, sport, repeats, repeat_pattern, coach:profiles(full_name), slots:coach_schedule_slots(slot_date, start_time, end_time)')
              .order('valid_from', { ascending: false }).limit(5000) as any
            if (error) throw error
            const repeatPatternMap: Record<string, string> = { weekly: 'Mingguan', 'bi-weekly': 'Dua Minggu Sekali', custom: 'Kustom' }
            const rows: Record<string, unknown>[] = []
            for (const s of (schedules ?? [])) {
              if (filterSport && s.sport !== filterSport) continue
              const slots = ((s.slots ?? []) as any[]).sort((a: any, b: any) => a.slot_date.localeCompare(b.slot_date))
              const base = {
                'Sukan': s.sport ?? '—',
                'Jurulatih': s.coach?.full_name ?? '—',
                'Berulang': s.repeats ? 'Ya' : 'Tidak',
                'Corak Ulangan': repeatPatternMap[s.repeat_pattern] ?? '—',
              }
              if (slots.length === 0) {
                rows.push({ ...base, 'Tarikh Sesi': '—', 'Masa Mula': '—', 'Masa Tamat': '—' })
              } else {
                slots.forEach((slot: any) => rows.push({ ...base, 'Tarikh Sesi': slot.slot_date, 'Masa Mula': slot.start_time, 'Masa Tamat': slot.end_time }))
              }
            }
            setData(rows)
          } else if (latihkanMode === 'program') {
            const { data: programs, error } = await supabase
              .from('sc_programs')
              .select('id, sport, month, year, start_date, end_date, structured_data, coach_id, coach:profiles(full_name)')
              .order('year', { ascending: false })
              .order('month', { ascending: false }).limit(5000) as any
            if (error) throw error
            const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
            setData((programs ?? [])
              .filter((p: any) => !filterSport || p.sport === filterSport)
              .map((p: any) => {
                const structured = p.structured_data as any
                return {
                  'Sukan': p.sport ?? '—',
                  'Bulan': monthNames[p.month - 1] ?? '—',
                  'Tahun': p.year,
                  'Fasa': structured?.phase ?? '—',
                  'Bilangan Sesi': structured?.sessions?.length ?? 0,
                  'Jurulatih': (p.coach as any)?.full_name ?? '—',
                  'Tarikh Mula': p.start_date ?? '—',
                  'Tarikh Tamat': p.end_date ?? '—',
                }
              })
            )
          }
        } else if (active === 'supplement') {
          if (supplementMode === 'stok') {
            const { data: rows, error } = await supabase.from('supplements').select('name, stock, unit, expiry_date').order('name')
            if (error) throw error
            setData((rows ?? []).map(r => ({
              'Nama Suplemen': r.name,
              'Stok Semasa': r.stock ?? 0,
              'Unit': r.unit ?? '—',
              'Tarikh Luput': r.expiry_date ?? '—',
            })))
          } else {
            let q = supabase.from('supplement_requests')
              .select('*, supplement:supplements(name, unit)')
              .order('created_at', { ascending: false }).limit(5000)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterFrom) q = q.gte('request_date', filterFrom)
            if (filterTo) q = q.lte('request_date', filterTo)
            const { data: rows, error } = await q
            if (error) throw error
            const statusMap: Record<string, string> = {
              pending: 'Menunggu Semakan',
              semakan_lulus: 'Menunggu Sokongan',
              semakan_tolak: 'Ditolak (Penyelaras)',
              approved: 'Diluluskan',
              partial: 'Diluluskan Sebahagian',
              rejected: 'Ditolak',
            }
            setData((rows ?? []).map(r => ({
              'Tarikh Permohonan': r.request_date,
              'Sukan': r.sport ?? '—',
              'Suplemen': (r.supplement as any)?.name ?? '—',
              'Kuantiti': r.quantity,
              'Unit': (r.supplement as any)?.unit ?? '',
              'Status': statusMap[r.status] ?? r.status,
            })))
          }
        } else if (active === 'physio') {
          if (physioMode === 'terperinci') {
            const { data: rows } = await (supabase
              .from('physio_slots')
              .select('slot_date, diagnosis, chief_complaint, injury_type, session_type, treatment_type, target_muscle, pain_scale, duration_minutes, assessment_notes, rehab_plan, progress_notes, referred_by, date_of_injury, athlete_id, athlete:athletes(name, sport_id, sport:sport_id(name)), physio_case:physio_cases(status)')
              .not('athlete_id', 'is', null)
              .order('slot_date', { ascending: false }).limit(5000) as any)
            setData((rows ?? [])
              .filter((s: any) => !filterSport || (Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name) === filterSport)
              .map((s: any) => ({
                'Nama Atlet': (Array.isArray(s.athlete) ? s.athlete[0]?.name : s.athlete?.name) ?? '—',
                'Sukan': (Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name) ?? '—',
                'Tarikh Sesi': s.slot_date,
                'Diagnosis': s.diagnosis ?? '—',
                'Aduan Utama': s.chief_complaint ?? '—',
                'Jenis Kecederaan': s.injury_type ?? '—',
                'Jenis Sesi': s.session_type ?? '—',
                'Jenis Rawatan': s.treatment_type ?? '—',
                'Otot Sasaran': s.target_muscle ?? '—',
                'Skala Kesakitan': s.pain_scale !== null ? `${s.pain_scale} / 10` : '—',
                'Tempoh (min)': s.duration_minutes ?? '—',
                'Dirujuk Oleh': s.referred_by ?? '—',
                'Tarikh Kecederaan': s.date_of_injury ?? '—',
                'Status Kes': (Array.isArray(s.physio_case) ? s.physio_case[0]?.status : s.physio_case?.status) ?? '—',
                'Catatan Penilaian': s.assessment_notes ?? '—',
                'Pelan Pemulihan': s.rehab_plan ?? '—',
                'Catatan Kemajuan': s.progress_notes ?? '—',
              }))
            )
          } else {
            const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
            const endDate = new Date(filterYear, filterMonth, 0).toISOString().slice(0, 10)
            const { data: rows } = await (supabase
              .from('physio_slots')
              .select('athlete_id, slot_date, pain_scale, case_id, athlete:athletes(name, sport_id, sport:sport_id(name)), physio_case:physio_cases(referred_to_doctor)')
              .gte('slot_date', startDate)
              .lte('slot_date', endDate)
              .not('athlete_id', 'is', null)
              .order('slot_date', { ascending: true }).limit(5000) as any)
            const grouped = new Map<string, Record<string, unknown>>()
            ;(rows ?? []).forEach((s: any) => {
              const athleteName = Array.isArray(s.athlete) ? s.athlete[0]?.name : s.athlete?.name
              const athleteSport = Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name
              const isReferred = Array.isArray(s.physio_case) ? s.physio_case[0]?.referred_to_doctor : s.physio_case?.referred_to_doctor
              if (filterSport && athleteSport !== filterSport) return
              if (!grouped.has(s.athlete_id)) {
                grouped.set(s.athlete_id, { 'Nama Atlet': athleteName ?? '—', 'Sukan': athleteSport ?? '—', 'Bilangan Sesi': 0, 'Tarikh Sesi': '', 'Skala Kesakitan Terkini': '—', 'Dirujuk Doktor': isReferred ? 'Ya' : 'Tidak' })
              }
              const row = grouped.get(s.athlete_id)!
              row['Bilangan Sesi'] = (row['Bilangan Sesi'] as number) + 1
              const dates = (row['Tarikh Sesi'] as string).split(', ').filter(Boolean)
              if (!dates.includes(s.slot_date)) dates.push(s.slot_date)
              row['Tarikh Sesi'] = dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })).join(', ')
              if (s.pain_scale !== null) row['Skala Kesakitan Terkini'] = `${s.pain_scale} / 10`
            })
            setData([...grouped.values()].sort((a, b) => (a['Sukan'] as string).localeCompare(b['Sukan'] as string) || (a['Nama Atlet'] as string).localeCompare(b['Nama Atlet'] as string)))
          }
        } else if (active === 'psychology') {
          let q = supabase
            .from('psychology_ratings')
            .select('id, athlete_id, phase, assessment_date, cognitive_anxiety_score, somatic_anxiety_score, self_confidence_score, catatan, athlete:athletes(name, sport_id, sport:sport_id(name))')
            .order('assessment_date', { ascending: false }).limit(5000) as any
          if (filterFrom) q = q.gte('assessment_date', filterFrom)
          if (filterTo) q = q.lte('assessment_date', filterTo)
          const { data: rows, error } = await q
          if (error) throw error
          const phaseMap: Record<string, string> = {
            persediaan: 'Persediaan',
            pertandingan: 'Pertandingan',
            pemulihan: 'Pemulihan',
          }
          setData((rows ?? [])
            .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
            .map((r: any) => ({
              'Atlet': r.athlete?.name ?? '—',
              'Sukan': r.athlete?.sport?.name ?? '—',
              'Fasa': phaseMap[r.phase] ?? r.phase,
              'Tarikh': r.assessment_date,
              'Kebimbangan Kognitif': r.cognitive_anxiety_score ?? '',
              'Kebimbangan Somatik': r.somatic_anxiety_score ?? '',
              'Kepercayaan Diri': r.self_confidence_score ?? '',
              'Catatan': r.catatan ?? '',
            }))
          )
        }
      } finally {
        setLoading(false)
        setGenerated(true)
        setSortCol(null)
        setSortDir('asc')
        if (data.length > 0) {
          const cols = Object.keys(data[0])
          const initialCols: Record<string, boolean> = {}
          cols.forEach(col => { initialCols[col] = true })
          setVisibleColumns(initialCols)
        }
      }
    }
    autoGenerate()
  }, [active, latihkanMode, supplementMode, physioMode])

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
    setVisibleColumns({})
    setShowColumnPicker(false)
    setPhysioMode('ringkasan')
    setLatihkanMode('kehadiran')
    setSupplementMode('permohonan')
    setDateColumnFilters({})
    setColumnFilters({})
    setOpenDropdowns({})
    setDropdownSearches({})
  }

  async function generate() {
    setLoading(true)
    setData([])
    try {
      if (active === 'fitness') {
        let q = supabase
          .from('fitness_test_sessions')
          .select('*, athlete:athletes(name, ic_number, category, sport_id, sport:sport_id(name))')
          .order('recorded_date', { ascending: false }).limit(5000)
        if (filterSession) {
          q = q.eq('session', filterSession)
        }
        const { data: sessions, error: sessError } = await q
        if (sessError) {
          console.error('Fitness sessions error:', sessError)
          throw sessError
        }

        // Fetch results for these sessions
        const sessionIds = (sessions ?? []).map((s: any) => s.id)
        const resultMap = new Map<string, Map<string, string>>()

        if (sessionIds.length > 0) {
          const { data: results } = await supabase
            .from('fitness_test_results')
            .select('session_id, test_id, result_value, test:test_id(test_name)')
            .in('session_id', sessionIds)

          ;(results ?? []).forEach((res: any) => {
            if (!resultMap.has(res.session_id)) {
              resultMap.set(res.session_id, new Map())
            }
            const testName = res.test?.test_name ?? `Test ${res.test_id}`
            resultMap.get(res.session_id)!.set(testName, res.result_value ?? '')
          })
        }

        console.log('Fitness test sessions:', sessions)
        console.log('Fitness test results:', Array.from(resultMap.entries()))
        console.log('Fitness test sessions fetched:', sessions?.length ?? 0, 'sessions with', resultMap.size, 'sessions having results')
        setData((sessions ?? [])
          .filter(r => !filterSport || r.athlete?.sport?.name === filterSport)
          .map(r => {
            const rowResults = resultMap.get(r.id) || new Map()
            return {
              'Nama Atlet': r.athlete?.name ?? '—',
              'NO. IC': r.athlete?.ic_number ?? '—',
              'Sukan': r.athlete?.sport?.name ?? '—',
              'Kategori': r.athlete?.category ?? '—',
              'Fasa': r.session,
              'Tahun': r.year,
              'Tarikh': r.recorded_date,
              ...Object.fromEntries(rowResults),
            }
          })
        )
      } else if (active === 'inbody') {
        let q = supabase.from('inbody_records').select('recorded_date, weight, smm, bmi, fat_pct, inbody_score, ulasan, athlete:athletes(name, sport_id, sport:sport_id(name))').order('recorded_date', { ascending: false }).limit(5000) as any
        if (filterFrom) q = q.gte('recorded_date', filterFrom)
        if (filterTo) q = q.lte('recorded_date', filterTo)
        const { data: rows } = await q
        setData((rows ?? [])
          .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
          .map((r: any) => ({
            'Tarikh': r.recorded_date,
            'Atlet': r.athlete?.name ?? '—',
            'Sukan': r.athlete?.sport?.name ?? '—',
            'Berat (kg)': r.weight ?? '',
            'BMI': r.bmi ?? '',
            'Lemak (%)': r.fat_pct ?? '',
            'SMM (kg)': r.smm ?? '',
            'Skor InBody': r.inbody_score ?? '',
            'Diet Plan': r.ulasan ?? '',
          }))
        )
      } else if (active === 'attendance') {
        if (latihkanMode === 'kehadiran') {
          // Attendance records
          let q = supabase.from('strength_conditioning').select('session_date, attendance, athlete:athletes(name, sport_id, sport:sport_id(name))').order('session_date', { ascending: false }).limit(5000) as any
          if (filterFrom) q = q.gte('session_date', filterFrom)
          if (filterTo) q = q.lte('session_date', filterTo)
          if (filterStatus) q = q.eq('attendance', filterStatus)
          const { data: rows } = await q
          const attendanceMap: Record<string, string> = { present: 'Hadir', absent: 'Tidak Hadir', mc: 'MC' }
          setData((rows ?? [])
            .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
            .map((r: any) => ({
              'Tarikh': r.session_date,
              'Nama Atlet': r.athlete?.name ?? '—',
              'Sukan': r.athlete?.sport?.name ?? '—',
              'Kehadiran': attendanceMap[r.attendance] ?? r.attendance,
            }))
          )
        } else if (latihkanMode === 'jadual') {
          const { data: schedules, error } = await supabase
            .from('coach_schedules')
            .select('id, sport, repeats, repeat_pattern, coach:profiles(full_name), slots:coach_schedule_slots(slot_date, start_time, end_time)')
            .order('valid_from', { ascending: false }).limit(5000) as any
          if (error) throw error
          const repeatPatternMap: Record<string, string> = { weekly: 'Mingguan', 'bi-weekly': 'Dua Minggu Sekali', custom: 'Kustom' }
          const rows: Record<string, unknown>[] = []
          for (const s of (schedules ?? [])) {
            if (filterSport && s.sport !== filterSport) continue
            const slots = ((s.slots ?? []) as any[]).sort((a: any, b: any) => a.slot_date.localeCompare(b.slot_date))
            const base = {
              'Jadual': s.schedule_name,
              'Sukan': s.sport ?? '—',
              'Jurulatih': s.coach?.full_name ?? '—',
              'Bermula': s.valid_from,
              'Berulang': s.repeats ? 'Ya' : 'Tidak',
              'Corak Ulangan': repeatPatternMap[s.repeat_pattern] ?? '—',
              'Sehingga': s.repeat_until ?? '—',
            }
            if (slots.length === 0) {
              rows.push({ ...base, 'Tarikh Sesi': '—', 'Masa Mula': '—', 'Masa Tamat': '—' })
            } else {
              slots.forEach((slot: any) => rows.push({ ...base, 'Tarikh Sesi': slot.slot_date, 'Masa Mula': slot.start_time, 'Masa Tamat': slot.end_time }))
            }
          }
          setData(rows)
        } else if (latihkanMode === 'program') {
          // Training programs
          const { data: programs, error } = await supabase
            .from('sc_programs')
            .select('id, sport, month, year, start_date, end_date, structured_data, coach_id, coach:profiles(full_name)')
            .order('year', { ascending: false })
            .order('month', { ascending: false }).limit(5000) as any
          if (error) {
            console.error('Training programs error:', error)
            throw error
          }
          const monthNames = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
          setData((programs ?? [])
            .filter((p: any) => !filterSport || p.sport === filterSport)
            .map((p: any) => {
              const structured = p.structured_data as any
              return {
                'Sukan': p.sport ?? '—',
                'Bulan': monthNames[p.month - 1] ?? '—',
                'Tahun': p.year,
                'Fasa': structured?.phase ?? '—',
                'Bilangan Sesi': structured?.sessions?.length ?? 0,
                'Jurulatih': (p.coach as any)?.full_name ?? '—',
                'Tarikh Mula': p.start_date ?? '—',
                'Tarikh Tamat': p.end_date ?? '—',
              }
            })
          )
        }
      } else if (active === 'supplement') {
        if (supplementMode === 'stok') {
          const { data: rows, error } = await supabase.from('supplements').select('name, stock, unit, expiry_date').order('name')
          if (error) throw error
          setData((rows ?? []).map(r => ({
            'Nama Suplemen': r.name,
            'Stok Semasa': r.stock ?? 0,
            'Unit': r.unit ?? '—',
            'Tarikh Luput': r.expiry_date ?? '—',
          })))
        } else {
          let q = supabase.from('supplement_requests')
            .select('*, supplement:supplements(name, unit)')
            .order('created_at', { ascending: false }).limit(5000)
          if (filterStatus) q = q.eq('status', filterStatus)
          if (filterFrom) q = q.gte('request_date', filterFrom)
          if (filterTo) q = q.lte('request_date', filterTo)
          const { data: rows, error } = await q
          if (error) throw error
          const statusMap: Record<string, string> = {
            pending: 'Menunggu Semakan',
            semakan_lulus: 'Menunggu Sokongan',
            semakan_tolak: 'Ditolak (Penyelaras)',
            approved: 'Diluluskan',
            partial: 'Diluluskan Sebahagian',
            rejected: 'Ditolak',
          }
          setData((rows ?? []).map(r => ({
            'Tarikh Permohonan': r.request_date,
            'Sukan': r.sport ?? '—',
            'Suplemen': (r.supplement as any)?.name ?? '—',
            'Kuantiti': r.quantity,
            'Unit': (r.supplement as any)?.unit ?? '',
            'Status': statusMap[r.status] ?? r.status,
          })))
        }
      } else if (active === 'physio') {
        if (physioMode === 'terperinci') {
          const { data: rows } = await (supabase
            .from('physio_slots')
            .select('slot_date, diagnosis, chief_complaint, injury_type, session_type, treatment_type, target_muscle, pain_scale, duration_minutes, assessment_notes, rehab_plan, progress_notes, referred_by, date_of_injury, athlete_id, athlete:athletes(name, sport_id, sport:sport_id(name)), physio_case:physio_cases(status)')
            .not('athlete_id', 'is', null)
            .order('slot_date', { ascending: false }).limit(5000) as any)
          setData((rows ?? [])
            .filter((s: any) => !filterSport || (Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name) === filterSport)
            .map((s: any) => ({
              'Nama Atlet': (Array.isArray(s.athlete) ? s.athlete[0]?.name : s.athlete?.name) ?? '—',
              'Sukan': (Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name) ?? '—',
              'Tarikh Sesi': s.slot_date,
              'Diagnosis': s.diagnosis ?? '—',
              'Aduan Utama': s.chief_complaint ?? '—',
              'Jenis Kecederaan': s.injury_type ?? '—',
              'Jenis Sesi': s.session_type ?? '—',
              'Jenis Rawatan': s.treatment_type ?? '—',
              'Otot Sasaran': s.target_muscle ?? '—',
              'Skala Kesakitan': s.pain_scale !== null ? `${s.pain_scale} / 10` : '—',
              'Tempoh (min)': s.duration_minutes ?? '—',
              'Dirujuk Oleh': s.referred_by ?? '—',
              'Tarikh Kecederaan': s.date_of_injury ?? '—',
              'Status Kes': (Array.isArray(s.physio_case) ? s.physio_case[0]?.status : s.physio_case?.status) ?? '—',
              'Catatan Penilaian': s.assessment_notes ?? '—',
              'Pelan Pemulihan': s.rehab_plan ?? '—',
              'Catatan Kemajuan': s.progress_notes ?? '—',
            }))
          )
        } else {
          const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
          const endDate = new Date(filterYear, filterMonth, 0).toISOString().slice(0, 10)
          const { data: rows } = await (supabase
            .from('physio_slots')
            .select('athlete_id, slot_date, pain_scale, case_id, athlete:athletes(name, sport_id, sport:sport_id(name)), physio_case:physio_cases(referred_to_doctor)')
            .gte('slot_date', startDate)
            .lte('slot_date', endDate)
            .not('athlete_id', 'is', null)
            .order('slot_date', { ascending: true }).limit(5000) as any)
          const grouped = new Map<string, Record<string, unknown>>()
          ;(rows ?? []).forEach((s: any) => {
            const athleteName = Array.isArray(s.athlete) ? s.athlete[0]?.name : s.athlete?.name
            const athleteSport = Array.isArray(s.athlete) ? s.athlete[0]?.sport?.name : s.athlete?.sport?.name
            const isReferred = Array.isArray(s.physio_case) ? s.physio_case[0]?.referred_to_doctor : s.physio_case?.referred_to_doctor
            if (filterSport && athleteSport !== filterSport) return
            if (!grouped.has(s.athlete_id)) {
              grouped.set(s.athlete_id, { 'Nama Atlet': athleteName ?? '—', 'Sukan': athleteSport ?? '—', 'Bilangan Sesi': 0, 'Tarikh Sesi': '', 'Skala Kesakitan Terkini': '—', 'Dirujuk Doktor': isReferred ? 'Ya' : 'Tidak' })
            }
            const row = grouped.get(s.athlete_id)!
            row['Bilangan Sesi'] = (row['Bilangan Sesi'] as number) + 1
            const dates = (row['Tarikh Sesi'] as string).split(', ').filter(Boolean)
            if (!dates.includes(s.slot_date)) dates.push(s.slot_date)
            row['Tarikh Sesi'] = dates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })).join(', ')
            if (s.pain_scale !== null) row['Skala Kesakitan Terkini'] = `${s.pain_scale} / 10`
          })
          setData([...grouped.values()].sort((a, b) => (a['Sukan'] as string).localeCompare(b['Sukan'] as string) || (a['Nama Atlet'] as string).localeCompare(b['Nama Atlet'] as string)))
        }
      } else if (active === 'psychology') {
        let q = supabase
          .from('psychology_ratings')
          .select('id, athlete_id, phase, assessment_date, cognitive_anxiety_score, somatic_anxiety_score, self_confidence_score, catatan, athlete:athletes(name, sport_id, sport:sport_id(name))')
          .order('assessment_date', { ascending: false }).limit(5000) as any
        if (filterFrom) q = q.gte('assessment_date', filterFrom)
        if (filterTo) q = q.lte('assessment_date', filterTo)
        const { data: rows, error } = await q
        if (error) {
          console.error('Psychology report error:', error)
          throw error
        }
        console.log('Psychology ratings fetched:', rows?.length ?? 0, 'records')
        const phaseMap: Record<string, string> = {
          persediaan: 'Persediaan',
          pertandingan: 'Pertandingan',
          pemulihan: 'Pemulihan',
        }
        setData((rows ?? [])
          .filter((r: any) => !filterSport || r.athlete?.sport?.name === filterSport)
          .map((r: any) => ({
            'Atlet': r.athlete?.name ?? '—',
            'Sukan': r.athlete?.sport?.name ?? '—',
            'Fasa': phaseMap[r.phase] ?? r.phase,
            'Tarikh': r.assessment_date,
            'Kebimbangan Kognitif': r.cognitive_anxiety_score ?? '',
            'Kebimbangan Somatik': r.somatic_anxiety_score ?? '',
            'Kepercayaan Diri': r.self_confidence_score ?? '',
            'Catatan': r.catatan ?? '',
          }))
        )
      }
    } finally {
      setLoading(false)
      setGenerated(true)
      setSortCol(null)
      setSortDir('asc')
      // Initialize visible columns (all checked by default)
      if (data.length > 0) {
        const cols = Object.keys(data[0])
        setVisibleColumns(Object.fromEntries(cols.map(c => [c, true])))
      }
    }
  }

  const displayData = useMemo(() => {
    let d = data

    // Apply date column filters
    const activeDateFilters = Object.entries(dateColumnFilters).filter(([, v]) => v.from || v.to)
    if (activeDateFilters.length > 0) {
      d = d.filter(row =>
        activeDateFilters.every(([col, { from, to }]) => {
          const val = String(row[col] ?? '')
          if (!val || val === '—') return true
          const effectiveTo = to || from
          return val >= from && val <= effectiveTo
        })
      )
    }

    // Apply column filters
    if (Object.keys(columnFilters).length > 0) {
      d = d.filter(row => {
        return Object.entries(columnFilters).every(([col, filterVal]) => {
          if (!filterVal || filterVal === '' || (Array.isArray(filterVal) && filterVal.length === 0)) return true
          const val = String(row[col] ?? '').toLowerCase()

          if (Array.isArray(filterVal)) {
            return filterVal.some(f => val.includes(f.toLowerCase()))
          } else {
            return val.includes(String(filterVal).toLowerCase())
          }
        })
      })
    }

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
  }, [data, previewSearch, sortCol, sortDir, columnFilters, dateColumnFilters])

  const config = REPORTS.find(r => r.key === active)!
  const columns = useMemo(() => {
    if (data.length === 0) return []
    // Collect all unique columns from ALL rows, not just the first
    const allCols = new Set<string>()
    data.forEach(row => {
      Object.keys(row).forEach(col => allCols.add(col))
    })
    // Return with consistent ordering: standard fields first, then tests
    const standardFields = ['Nama Atlet', 'Sukan', 'Nama', 'Fasa', 'Tahun', 'Tarikh']
    const standardCols = standardFields.filter(f => allCols.has(f))
    const testCols = Array.from(allCols).filter(c => !standardFields.includes(c)).sort()
    return [...standardCols, ...testCols]
  }, [data])

  return (
    <>
      <div className="space-y-4">
        <p className="text-[12px] text-[#888]">Jana dan eksport laporan mengikut modul</p>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Report type selector */}
        <div className="space-y-2 no-print">
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

        {/* Buttons + preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4 space-y-4 no-print">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111]">{config.label}</p>
              {generated && <span className="text-[11px] text-[#888]">{data.length} rekod dijana</span>}
            </div>

            {active === 'physio' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPhysioMode('ringkasan')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                    physioMode === 'ringkasan'
                      ? 'bg-[#F56A00] text-white'
                      : 'bg-gray-100 text-[#444] hover:bg-gray-200'
                  }`}
                >
                  Ringkasan
                </button>
                <button
                  onClick={() => setPhysioMode('terperinci')}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                    physioMode === 'terperinci'
                      ? 'bg-[#F56A00] text-white'
                      : 'bg-gray-100 text-[#444] hover:bg-gray-200'
                  }`}
                >
                  Terperinci
                </button>
              </div>
            )}

            {active === 'attendance' && (
              <div>
                <select value={latihkanMode} onChange={e => { setLatihkanMode(e.target.value as LatihkanMode); setData([]); setGenerated(false) }} className={inputCls}>
                  <option value="kehadiran">Kehadiran Latihan</option>
                  <option value="jadual">Jadual Latihan</option>
                  <option value="program">Program Latihan</option>
                </select>
              </div>
            )}

            {active === 'supplement' && (
              <div>
                <select value={supplementMode} onChange={e => { setSupplementMode(e.target.value as SupplementMode); setData([]); setGenerated(false) }} className={inputCls}>
                  <option value="permohonan">Permohonan Suplemen</option>
                  <option value="stok">Stok Suplemen</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button onClick={generate} disabled={loading} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {loading ? 'Menjana...' : 'Jana Laporan'}
              </button>
              {data.length > 0 && (
                <>
                  <button
                    onClick={() => downloadCSV(`${config.label}_${new Date().toISOString().slice(0, 10)}.csv`, data.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => visibleColumns[k] !== false))))}
                    className="px-5 py-2 border border-gray-200 hover:border-[#F56A00] hover:text-[#F56A00] text-[#444] text-sm font-semibold rounded-lg transition flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Eksport CSV
                  </button>
                </>
              )}
            </div>

            {data.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111]">Penapis & Lajur</p>
                  <button
                    onClick={() => setShowColumnPicker(!showColumnPicker)}
                    className="text-xs text-[#F56A00] hover:underline font-semibold"
                  >
                    {showColumnPicker ? '▲ Tutup Pilih Lajur' : '▾ Buka Pilih Lajur'}
                  </button>
                </div>

                {showColumnPicker && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <p className="text-sm font-semibold text-[#111]">Pilih lajur untuk papar dan eksport</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {columns.map(col => (
                        <label key={col} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col] !== false}
                            onChange={e => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-[#F56A00]"
                          />
                          <span className="text-sm text-[#444]">{col}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {columns.filter(col => visibleColumns[col] !== false).sort((a, b) => {
                    const aIsDate = /tarikh/i.test(a)
                    const bIsDate = /tarikh/i.test(b)
                    return aIsDate === bIsDate ? 0 : aIsDate ? 1 : -1
                  }).map(col => {
                    const isDateCol = /tarikh/i.test(col)

                    if (isDateCol) {
                      const { from = '', to = '' } = dateColumnFilters[col] || {}
                      return (
                        <div key={col} className="col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">{col}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={from}
                              onChange={e => setDateColumnFilters({ ...dateColumnFilters, [col]: { from: e.target.value, to } })}
                              className="bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white"
                            />
                            <span className="text-xs text-[#999]">—</span>
                            <input
                              type="date"
                              value={to}
                              placeholder="Hingga"
                              onChange={e => setDateColumnFilters({ ...dateColumnFilters, [col]: { from, to: e.target.value } })}
                              className="bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white"
                            />
                            {(from || to) && (
                              <button
                                onClick={() => setDateColumnFilters({ ...dateColumnFilters, [col]: { from: '', to: '' } })}
                                className="text-xs text-[#999] hover:text-[#F56A00] transition"
                              >✕</button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    const filterValue = columnFilters[col] || ''
                    const uniqueValues = [...new Set(data.map(r => String(r[col] ?? '').trim()).filter(Boolean))].sort()
                    const isOpen = openDropdowns[col] || false
                    const searchInput = dropdownSearches[col] || ''
                    const filteredOptions = uniqueValues.filter(val => val.toLowerCase().includes(searchInput.toLowerCase()))

                    return (
                      <div key={col} className="relative">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">{col}</label>
                        <button
                          onClick={() => setOpenDropdowns({ ...openDropdowns, [col]: !isOpen })}
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition text-left flex items-center justify-between ${
                            isOpen
                              ? 'border-[#F56A00] bg-orange-50'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <span className={filterValue ? 'text-[#111] font-medium' : 'text-[#999]'}>
                            {filterValue || 'Semua'}
                          </span>
                          <span className="text-xs">▼</span>
                        </button>

                        {isOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#F56A00] rounded-lg shadow-lg z-50">
                            <input
                              autoFocus
                              type="text"
                              placeholder="Cari..."
                              value={searchInput}
                              onChange={e => setDropdownSearches({ ...dropdownSearches, [col]: e.target.value })}
                              className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none"
                            />
                            <div className="max-h-48 overflow-y-auto">
                              <button
                                onClick={() => {
                                  setColumnFilters({ ...columnFilters, [col]: '' })
                                  setOpenDropdowns({ ...openDropdowns, [col]: false })
                                  setDropdownSearches({ ...dropdownSearches, [col]: '' })
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-[#666]"
                              >
                                Semua
                              </button>
                              {filteredOptions.map(val => (
                                <button
                                  key={val}
                                  onClick={() => {
                                    setColumnFilters({ ...columnFilters, [col]: val })
                                    setOpenDropdowns({ ...openDropdowns, [col]: false })
                                    setDropdownSearches({ ...dropdownSearches, [col]: '' })
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm transition ${
                                    filterValue === val
                                      ? 'bg-[#F56A00] text-white font-medium'
                                      : 'hover:bg-gray-50 text-[#444]'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                              {filteredOptions.length === 0 && (
                                <div className="px-3 py-3 text-[12px] text-[#999] text-center">Tiada padanan</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {(Object.values(columnFilters).some(v => v !== '' && v.length > 0) || Object.values(dateColumnFilters).some(v => v.from || v.to)) && (
                  <button
                    onClick={() => { setColumnFilters({}); setDateColumnFilters({}) }}
                    className="text-xs text-[#F56A00] hover:underline font-semibold"
                  >
                    Kosongkan Penapis Lajur
                  </button>
                )}
              </div>
            )}
          </div>

          {loading && <ReportSkeleton />}

          {generated && (
            <>
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
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between no-print">
                      <input
                        type="text"
                        placeholder="Cari di dalam jadual..."
                        value={previewSearch}
                        onChange={e => setPreviewSearch(e.target.value.toUpperCase())}
                        className="w-56 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white placeholder-[#bbb]"
                      />
                      <span className="text-[11px] text-[#888]">
                        {displayData.length} / {data.length} rekod
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            {columns.filter(c => visibleColumns[c] !== false).map(col => (
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
                                className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition"
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
                            <tr key={i} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-100`}>
                              {columns.filter(c => visibleColumns[c] !== false).map(col => {
                                const cellStyle = getCellStyle(active, col, row[col])
                                return (
                                  <td key={col} className={`px-4 py-2.5 text-[#444] whitespace-nowrap ${cellStyle}`}>
                                    {cellStyle ? (
                                      <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                        {String(row[col] ?? '—')}
                                      </span>
                                    ) : (
                                      String(row[col] ?? '—')
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                          {data.length > 0 && (
                            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                              <td colSpan={columns.filter(c => visibleColumns[c] !== false).length} className="px-4 py-3 text-[#111]">
                                {computeSummaryRow(active, data, active === 'attendance' ? latihkanMode : undefined)}
                              </td>
                            </tr>
                          )}
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
    </>
  )
}

const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'
