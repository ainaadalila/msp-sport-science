import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface ReportRow {
  athlete_id: string
  athlete_name: string
  sport: string
  session_count: number
  session_dates: string[]
  latest_pain_scale: number | null
}

interface SlotData {
  athlete_id: string
  slot_date: string
  pain_scale: number | null
  athlete: { name: string; sport?: { name: string } } | null
}

const MONTHS_MY = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']

function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
}

export default function PhysioReportPage() {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [filterSport, setFilterSport] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [rawSlots, setRawSlots] = useState<SlotData[]>([])
  const [sports, setSports] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    fetchSports()
  }, [])

  async function fetchSports() {
    const { data } = await supabase.from('sports').select('name').order('name')
    const sportNames = (data ?? []).map(s => s.name).filter(Boolean) as string[]
    setSports(sportNames)
  }

  function generateReport() {
    if (rawSlots.length === 0) return

    // Filter and group by athlete
    const grouped = new Map<string, ReportRow>()
    rawSlots.forEach(s => {
      if (filterSport && s.athlete?.sport?.name !== filterSport) return
      if (!grouped.has(s.athlete_id)) {
        grouped.set(s.athlete_id, {
          athlete_id: s.athlete_id,
          athlete_name: s.athlete?.name ?? '—',
          sport: s.athlete?.sport?.name ?? '—',
          session_count: 0,
          session_dates: [],
          latest_pain_scale: null,
        })
      }
      const row = grouped.get(s.athlete_id)!
      row.session_count++
      if (!row.session_dates.includes(s.slot_date)) row.session_dates.push(s.slot_date)
      if (s.pain_scale !== null) row.latest_pain_scale = s.pain_scale
    })

    const result = [...grouped.values()].sort((a, b) => a.sport.localeCompare(b.sport) || a.athlete_name.localeCompare(b.athlete_name))
    setRows(result)
  }

  async function handleGenerate() {
    setLoading(true)
    setGenerated(false)

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('physio_slots')
      .select('athlete_id, slot_date, pain_scale, athlete:athletes(name, sport_id, sport:sport_id(name))')
      .gte('slot_date', startDate)
      .lte('slot_date', endDate)
      .not('athlete_id', 'is', null)
      .order('slot_date', { ascending: true }) as any

    if (error) {
      setLoading(false)
      return
    }

    const slots = (data ?? []) as any as SlotData[]
    setRawSlots(slots)
    setLoading(false)
    setGenerated(true)
    generateReport()
  }

  function handleFilterChange(sport: string) {
    setFilterSport(sport)
    if (generated && rawSlots.length > 0) {
      // Re-compute with new filter
      setTimeout(() => {
        const grouped = new Map<string, ReportRow>()
        rawSlots.forEach(s => {
          if (sport && s.athlete?.sport?.name !== sport) return
          if (!grouped.has(s.athlete_id)) {
            grouped.set(s.athlete_id, {
              athlete_id: s.athlete_id,
              athlete_name: s.athlete?.name ?? '—',
              sport: s.athlete?.sport?.name ?? '—',
              session_count: 0,
              session_dates: [],
              latest_pain_scale: null,
            })
          }
          const row = grouped.get(s.athlete_id)!
          row.session_count++
          if (!row.session_dates.includes(s.slot_date)) row.session_dates.push(s.slot_date)
          if (s.pain_scale !== null) row.latest_pain_scale = s.pain_scale
        })
        const result = [...grouped.values()].sort((a, b) => a.sport.localeCompare(b.sport) || a.athlete_name.localeCompare(b.athlete_name))
        setRows(result)
      }, 0)
    }
  }

  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i)
  const totalSessions = rows.reduce((acc, r) => acc + r.session_count, 0)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">Laporan Bulanan Fisioterapi</p>
      </div>

      {/* Filters & Generate Button */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Tahun</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Bulan</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
            >
              {MONTHS_MY.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
            >
              {loading ? 'Memuatkan...' : 'Jana Laporan'}
            </button>
          </div>
        </div>

        {generated && (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Tapis Sukan</label>
            <select
              value={filterSport}
              onChange={e => handleFilterChange(e.target.value)}
              className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
            >
              <option value="">Semua Sukan</option>
              {sports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Report Table */}
      {generated && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-[#888] text-sm">
              Tiada sesi fisioterapi untuk bulan yang dipilih.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Atlet', 'Sukan', 'Bilangan Sesi', 'Tarikh Sesi', 'Skala Kesakitan Terkini'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.athlete_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#111]">{r.athlete_name}</td>
                    <td className="px-4 py-3 text-[#888]">{r.sport}</td>
                    <td className="px-4 py-3 font-semibold text-[#111]">{r.session_count}</td>
                    <td className="px-4 py-3 text-[12px] text-[#555]">
                      <div className="flex flex-wrap gap-1">
                        {r.session_dates.map(d => (
                          <span key={d} className="inline-block">{fmtDateShort(d)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.latest_pain_scale !== null ? (
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#F56A00]">
                          {r.latest_pain_scale} / 10
                        </span>
                      ) : (
                        <span className="text-[#888]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-[#111]">Jumlah</td>
                  <td className="px-4 py-3 text-[#111]">{totalSessions} sesi</td>
                  <td colSpan={2} className="px-4 py-3 text-[#888]"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
