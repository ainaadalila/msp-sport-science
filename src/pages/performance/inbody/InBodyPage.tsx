import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { logAction } from '../../../lib/audit'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Athlete {
  id: string
  name: string
  sport_id: string
  sport?: { name: string }
}

interface InBodyRecord {
  id: string
  athlete_id: string
  recorded_date: string
  weight: number | null
  smm: number | null
  body_fat_mass: number | null
  bmi: number | null
  fat_pct: number | null
  bmr: number | null
  inbody_score: number | null
  skor: number | null
  ulasan: string | null
  diet_plan_url: string | null
  diet_plan_name: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } }
}

type FormState = Omit<InBodyRecord, 'id' | 'created_at' | 'athlete'>

const emptyForm: FormState = {
  athlete_id: '',
  recorded_date: new Date().toISOString().slice(0, 10),
  weight: null,
  smm: null,
  body_fat_mass: null,
  bmi: null,
  fat_pct: null,
  bmr: null,
  inbody_score: null,
  skor: null,
  ulasan: null,
  diet_plan_url: null,
  diet_plan_name: null,
}

function scoreBadge(score: number | null) {
  if (score == null) return { label: '—', style: 'bg-gray-100 text-[#888] border border-gray-200' }
  if (score >= 80) return { label: `${score}`, style: 'bg-green-50 text-[#3A9E6A] border border-green-200' }
  if (score >= 60) return { label: `${score}`, style: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]' }
  return { label: `${score}`, style: 'bg-red-50 text-[#D44040] border border-red-200' }
}

function n(val: number | null, unit = '', decimals = 1) {
  return val != null ? `${Number(val).toFixed(decimals)}${unit}` : '—'
}

const BADGE_GREEN  = 'bg-green-50 text-[#3A9E6A] border border-green-200'
const BADGE_ORANGE = 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]'
const BADGE_RED    = 'bg-red-50 text-[#D44040] border border-red-200'
const BADGE_GRAY   = 'bg-gray-100 text-[#888] border border-gray-200'

type NormResult = { label: string; style: string }

function sukmaSMM(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v >= 30 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'LEMAH', style: BADGE_RED }
}

function sukmaBMI(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  if (v < 18) return { label: 'RENDAH', style: BADGE_ORANGE }
  if (v <= 24) return { label: 'NORMAL', style: BADGE_GREEN }
  return { label: 'TINGGI', style: BADGE_RED }
}

function sukmaFat(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v <= 15 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'MELEBIHI', style: BADGE_RED }
}

function sukmaScore(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  if (v >= 80) return { label: 'BAIK', style: BADGE_GREEN }
  if (v >= 60) return { label: 'SEDERHANA', style: BADGE_ORANGE }
  return { label: 'LEMAH', style: BADGE_RED }
}

function sukmaFatMass(v: number | null): NormResult {
  if (v == null) return { label: '—', style: BADGE_GRAY }
  return v <= 5 ? { label: 'BAIK', style: BADGE_GREEN } : { label: 'MELEBIHI', style: BADGE_RED }
}

function computeSkor(r: Pick<FormState, 'smm' | 'body_fat_mass' | 'bmi' | 'fat_pct' | 'inbody_score'>): number {
  let s = 0
  if (r.smm != null && r.smm >= 30) s++
  if (r.body_fat_mass != null && r.body_fat_mass <= 5) s++
  if (r.bmi != null && r.bmi >= 18 && r.bmi <= 24) s++
  if (r.fat_pct != null && r.fat_pct <= 15) s++
  if (r.inbody_score != null && r.inbody_score >= 80) s++
  return s
}

function computeUlasan(skor: number): string {
  if (skor >= 4) return 'BAIK'
  if (skor === 3) return 'SEDERHANA'
  return 'LEMAH'
}

function InBodyScoreGauge({ score }: { score: number | null }) {
  const pct = score != null ? Math.min(Math.max(score, 0), 100) : null
  if (pct == null) return <p className="text-sm text-[#888]">—</p>
  const color = pct >= 80 ? '#3A9E6A' : pct >= 60 ? '#F56A00' : '#D44040'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">Skor InBody</p>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-bold font-mono" style={{ color }}>{pct}</span>
        <span className="text-[11px] text-[#888] mb-1">/ 100</span>
      </div>
      <div className="relative h-3 rounded-full overflow-visible"
           style={{ background: 'linear-gradient(to right, #D44040 0%, #F56A00 40%, #FFD600 70%, #3A9E6A 100%)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#111] rounded-full shadow"
             style={{ left: `calc(${pct}% - 8px)` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[#888]">
        <span>0 — Lemah</span><span>40 — Sederhana</span><span>70 — Baik</span>
      </div>
    </div>
  )
}

export default function InBodyPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')

  const [records, setRecords] = useState<InBodyRecord[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  const [filterSport, setFilterSport] = useState('')
  const [filterAthlete, setFilterAthlete] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [viewRecord, setViewRecord] = useState<InBodyRecord | null>(null)
  const [editing, setEditing] = useState<InBodyRecord | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<InBodyRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formSportFilter, setFormSportFilter] = useState<string>('')

  type ViewTab = 'jadual' | 'profil'
  const [activeTab, setActiveTab] = useState<ViewTab>('jadual')
  const [profilSport, setProfilSport] = useState<string>('')
  const [profilAthlete, setProfilAthlete] = useState<string>('')
  const [profilRecords, setProfilRecords] = useState<InBodyRecord[]>([])
  const [profilLoading, setProfilLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const RECORDS_PER_PAGE = 25

  // Diet plan upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingDietPlan, setUploadingDietPlan] = useState(false)
  const [dietPlanError, setDietPlanError] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    fetchAthleteRecords(profilAthlete)
  }, [profilAthlete])

  useEffect(() => {
    if (athleteIdParam && athletes.length > 0) {
      setFilterAthlete(athleteIdParam)
    }
  }, [athleteIdParam, athletes])

  async function fetchAll() {
    setLoading(true)
    const [recRes, athRes] = await Promise.all([
      supabase
        .from('inbody_records')
        .select('id, athlete_id, recorded_date, weight, smm, body_fat_mass, bmi, fat_pct, inbody_score, diet_plan_url, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .order('recorded_date', { ascending: false }),
      supabase.from('athletes').select('id, name, sport_id, sport:sport_id(name)').order('name'),
    ]) as any
    setRecords(recRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setLoading(false)
  }

  async function fetchAthleteRecords(athleteId: string) {
    if (!athleteId) { setProfilRecords([]); return }
    setProfilLoading(true)
    const { data } = await supabase
      .from('inbody_records')
      .select('id, athlete_id, recorded_date, weight, smm, body_fat_mass, bmi, fat_pct, inbody_score, diet_plan_url, athlete:athletes(name, sport_id, sport:sport_id(name))')
      .eq('athlete_id', athleteId)
      .order('recorded_date', { ascending: true }) as any
    setProfilRecords(data ?? [])
    setProfilLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormSportFilter('')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(r: InBodyRecord) {
    setEditing(r)
    const { id, created_at, athlete, ...rest } = r
    setForm(rest)
    setFormSportFilter(r.athlete?.sport?.name ?? '')
    setError(null)
    setModalOpen(true)
  }

  function setField(key: keyof FormState, val: string | number | null) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.athlete_id || !form.recorded_date) {
      setError('Atlet dan tarikh rekod wajib dipilih.')
      return
    }
    setSaving(true)
    setError(null)

    const skor = computeSkor(form)
    const ulasan = computeUlasan(skor)
    const payload = { ...form, skor, ulasan, recorded_by: profile?.id }

    if (editing) {
      const { error } = await supabase.from('inbody_records').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_inbody', 'inbody_records', editing.id)
    } else {
      const { data, error } = await supabase.from('inbody_records').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_inbody', 'inbody_records', data.id)
    }

    setSaving(false)
    setModalOpen(false)
    fetchAll()
    if (profilAthlete) fetchAthleteRecords(profilAthlete)
  }

  async function handleDelete(r: InBodyRecord) {
    try {
      setDeleting(true)
      await supabase.from('inbody_records').delete().eq('id', r.id)
      setConfirmDelete(null)
      setViewRecord(null)
      await fetchAll()
      if (profilAthlete) await fetchAthleteRecords(profilAthlete)
    } finally {
      setDeleting(false)
    }
  }

  async function handleDietPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !viewRecord) return

    setUploadingDietPlan(true)
    setDietPlanError(null)

    try {
      const fileName = `inbody_diet_${viewRecord.id}_${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('inbody_diet_plans')
        .upload(fileName, file)

      if (uploadError) {
        setDietPlanError(uploadError.message)
        setUploadingDietPlan(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('inbody_diet_plans')
        .getPublicUrl(fileName)

      await supabase.from('inbody_records')
        .update({ diet_plan_url: publicUrl, diet_plan_name: file.name })
        .eq('id', viewRecord.id)

      await logAction(profile!.id, 'upload_inbody_diet_plan', 'inbody_records', viewRecord.id)

      setViewRecord({ ...viewRecord, diet_plan_url: publicUrl, diet_plan_name: file.name })
      fetchAll()
      if (profilAthlete) fetchAthleteRecords(profilAthlete)
    } catch (err) {
      setDietPlanError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingDietPlan(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDietPlan() {
    if (!viewRecord?.diet_plan_url) return

    setUploadingDietPlan(true)
    setDietPlanError(null)

    try {
      // Extract file name from URL
      const fileName = viewRecord.diet_plan_url.split('/').pop() || ''
      if (fileName) {
        await supabase.storage.from('inbody_diet_plans').remove([fileName])
      }

      await supabase.from('inbody_records')
        .update({ diet_plan_url: null, diet_plan_name: null })
        .eq('id', viewRecord.id)

      await logAction(profile!.id, 'delete_inbody_diet_plan', 'inbody_records', viewRecord.id)

      setViewRecord({ ...viewRecord, diet_plan_url: null, diet_plan_name: null })
      fetchAll()
      if (profilAthlete) fetchAthleteRecords(profilAthlete)
    } catch (err) {
      setDietPlanError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setUploadingDietPlan(false)
    }
  }

  const filtered = records.filter(r => {
    const matchSport = !filterSport || r.athlete?.sport?.name === filterSport
    const matchAthlete = !filterAthlete || r.athlete_id === filterAthlete
    const matchFrom = !filterFrom || r.recorded_date >= filterFrom
    const matchTo = !filterTo || r.recorded_date <= filterTo
    return matchSport && matchAthlete && matchFrom && matchTo
  })

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSport, filterAthlete, filterFrom, filterTo])

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / RECORDS_PER_PAGE)
  const startIdx = (currentPage - 1) * RECORDS_PER_PAGE
  const endIdx = startIdx + RECORDS_PER_PAGE
  const paginatedRecords = filtered.slice(startIdx, endIdx)

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const latestRecord = profilRecords.length > 0 ? profilRecords[profilRecords.length - 1] : null

  const chartData = profilRecords.slice(-10).map(r => ({
    date: new Date(r.recorded_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
    smm: r.smm ?? 0,
    fatMass: r.body_fat_mass ?? 0,
  }))

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{records.length} rekod penilaian</p>
        {can('inbody', 'create') && (
          <button onClick={openAdd} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Rekod InBody
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['jadual', 'profil'] as ViewTab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#888] hover:text-[#444]'
            }`}>
            {t === 'jadual' ? 'Semua Rekod' : 'Profil InBody'}
          </button>
        ))}
      </div>

      {activeTab === 'jadual' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterSport} onChange={e => { setFilterSport(e.target.value); setFilterAthlete('') }} className={filterCls}>
              <option value="">Semua Sukan</option>
              {Array.from(new Set(athletes.map(a => a.sport?.name))).sort().map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            <select value={filterAthlete} onChange={e => setFilterAthlete(e.target.value)} className={filterCls}>
              <option value="">Semua Atlet</option>
              {athletes.filter(a => !filterSport || a.sport?.name === filterSport).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={filterCls} placeholder="Dari" />
              <span className="text-[#888] text-xs">—</span>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={filterCls} placeholder="Hingga" />
            </div>
            {(filterSport || filterAthlete || filterFrom || filterTo) && (
              <button onClick={() => { setFilterSport(''); setFilterAthlete(''); setFilterFrom(''); setFilterTo('') }} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
                Kosongkan Penapis
              </button>
            )}
          </div>

          {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#888] text-sm">
            {records.length === 0 ? 'Tiada rekod InBody lagi.' : 'Tiada rekod sepadan penapis.'}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm text-[#888]">
              <span>{filtered.length} rekod ({currentPage} dari {totalPages} halaman)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Tarikh', 'Atlet', 'Sukan', 'Berat (kg)', 'BMI', 'Lemak (%)', 'SMM (kg)', 'Skor InBody', 'Diet Plan', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map(r => {
                const badge = scoreBadge(r.inbody_score)
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{fmtDate(r.recorded_date)}</td>
                    <td className="px-4 py-3 font-medium">
                      {r.athlete?.name ? (
                        <button
                          onClick={() => { setActiveTab('profil'); setProfilAthlete(r.athlete_id); setProfilSport(r.athlete?.sport?.name || '') }}
                          className="text-[#F56A00] hover:underline font-medium cursor-pointer"
                        >
                          {r.athlete.name}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#888]">{r.athlete?.sport?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#444]">{n(r.weight, ' kg')}</td>
                    <td className="px-4 py-3 text-[#444]">{n(r.bmi)}</td>
                    <td className="px-4 py-3 text-[#444]">{n(r.fat_pct, '%')}</td>
                    <td className="px-4 py-3 text-[#444]">{n(r.smm, ' kg')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.style}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.diet_plan_url ? (
                        <span className="text-lg">✓</span>
                      ) : (
                        <span className="text-[#888]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        {can('inbody', 'update') && <button onClick={() => openEdit(r)} className="text-xs text-[#F56A00] hover:underline font-medium">Edit</button>}
                        {can('inbody', 'delete') && <button onClick={() => setConfirmDelete(r)} className="text-xs text-[#D44040] hover:underline font-medium">Padam</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 bg-white border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm text-[#F56A00] border border-gray-300 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ← Sebelumnya
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg transition ${
                        currentPage === page
                          ? 'bg-[#F56A00] text-white font-semibold'
                          : 'text-[#444] border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm text-[#F56A00] border border-gray-300 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Seterusnya →
                </button>
              </div>
            )}
          </>
        )}
      </div>
        </>
      ) : (
        <div className="space-y-5">
          {/* A. Sport and Athlete selectors */}
          <div className="flex gap-2">
            <select value={profilSport} onChange={e => { setProfilSport(e.target.value); setProfilAthlete('') }} className={filterCls} style={{ flex: 1 }}>
              <option value="">— Semua Sukan —</option>
              {Array.from(new Set(athletes.map(a => a.sport?.name))).sort().map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            <select value={profilAthlete} onChange={e => setProfilAthlete(e.target.value)} className={filterCls} style={{ flex: 2 }}>
              <option value="">— Pilih Atlet —</option>
              {athletes.filter(a => !profilSport || a.sport?.name === profilSport).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {profilLoading ? (
            <div className="text-sm text-[#888]">Memuatkan...</div>
          ) : !latestRecord ? (
            <div className="text-sm text-[#888]">Pilih atlet untuk melihat profil.</div>
          ) : (
            <>
              {/* B. 4 metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Berat Badan',      val: n(latestRecord.weight, ' kg'), color: 'text-[#111]' },
                  { label: 'Jisim Otot (SMM)', val: n(latestRecord.smm, ' kg'),   color: 'text-[#F56A00]' },
                  { label: 'BMI',              val: n(latestRecord.bmi),           color: 'text-[#3A7EC8]' },
                  { label: 'Lemak Badan',      val: n(latestRecord.fat_pct, '%'),  color: 'text-[#D44040]' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">{label}</p>
                    <p className={`text-3xl font-bold font-mono ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* C+D. Chart | Gauge+Norms */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">Komposisi Badan (Trend)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} unit=" kg" />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #eee' }}
                      />
                      <Legend formatter={(v: string) => v === 'smm' ? 'Jisim Otot' : 'Lemak Badan'} iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="smm"     stackId="a" fill="#F56A00" radius={[0,0,0,0]} name="smm" />
                      <Bar dataKey="fatMass" stackId="a" fill="#FFB3A7" radius={[4,4,0,0]} name="fatMass" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
                  <InBodyScoreGauge score={latestRecord.inbody_score ?? null} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">Piawaian SUKMA</p>
                    <div className="space-y-2">
                      {([
                        ['SMM',                sukmaSMM(latestRecord.smm),              n(latestRecord.smm, ' kg')],
                        ['Lemak Badan (kg)',   sukmaFatMass(latestRecord.body_fat_mass), n(latestRecord.body_fat_mass, ' kg')],
                        ['BMI',                sukmaBMI(latestRecord.bmi),              n(latestRecord.bmi)],
                        ['Lemak Badan %',      sukmaFat(latestRecord.fat_pct),          n(latestRecord.fat_pct, '%')],
                        ['Skor InBody',        sukmaScore(latestRecord.inbody_score ?? null), n(latestRecord.inbody_score, '', 0)],
                      ] as [string, NormResult, string][]).map(([metric, norm, val]) => (
                        <div key={metric} className="flex items-center justify-between">
                          <span className="text-sm text-[#444]">{metric}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-[#888]">{val}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${norm.style}`}>{norm.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* E. Latest record detail */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">
                  Rekod Terkini — {new Date(latestRecord.recorded_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    ['Berat Badan',       n(latestRecord.weight, ' kg')],
                    ['Jisim Otot (SMM)',  n(latestRecord.smm, ' kg')],
                    ['Lemak Badan (kg)',  n(latestRecord.body_fat_mass, ' kg')],
                    ['BMI',               n(latestRecord.bmi)],
                    ['% Lemak',           n(latestRecord.fat_pct, '%')],
                    ['BMR',               n(latestRecord.bmr, ' kcal', 0)],
                    ['Skor InBody',       n(latestRecord.inbody_score, '', 0)],
                    ['Skor SUKMA',        latestRecord.skor != null ? `${latestRecord.skor}/5 — ${latestRecord.ulasan}` : '—'],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                      <p className="text-[10px] text-[#888] mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-[#111]">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* F. Diet Plan Section */}
              {latestRecord && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-4">Pelan Diet</p>
                  {dietPlanError && (
                    <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">{dietPlanError}</div>
                  )}
                  {latestRecord.diet_plan_url ? (
                    <div className="space-y-3">
                      <div className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                        <p className="text-[12px] text-[#888] mb-1">Fail Dimuat Naik</p>
                        <p className="text-sm font-medium text-[#111] truncate">{latestRecord.diet_plan_name || 'Diet Plan File'}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={latestRecord.diet_plan_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#3A7EC8] border border-[#3A7EC8] rounded-lg hover:bg-blue-50 transition text-center"
                        >
                          Muat Turun
                        </a>
                        <button
                          onClick={() => {
                            setViewRecord(latestRecord)
                            fileInputRef.current?.click()
                          }}
                          disabled={uploadingDietPlan}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#F56A00] border border-[#F56A00] rounded-lg hover:bg-orange-50 disabled:opacity-60 transition"
                        >
                          {uploadingDietPlan ? 'Memuat...' : 'Ganti'}
                        </button>
                        <button
                          onClick={() => {
                            setViewRecord(latestRecord)
                            handleDeleteDietPlan()
                          }}
                          disabled={uploadingDietPlan}
                          className="flex-1 px-3 py-2 text-xs font-semibold text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 transition"
                        >
                          Buang
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setViewRecord(latestRecord)
                        fileInputRef.current?.click()
                      }}
                      disabled={uploadingDietPlan}
                      className="w-full px-4 py-3 text-sm font-semibold text-white bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 rounded-lg transition"
                    >
                      {uploadingDietPlan ? 'Memuat Naik...' : '+ Muat Naik Pelan Diet'}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                    onChange={handleDietPlanUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editing ? 'Edit Rekod InBody' : 'Rekod InBody Baharu'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Sukan" required>
                    <select value={formSportFilter} onChange={e => { setFormSportFilter(e.target.value); setField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Pilih sukan —</option>
                      {[...new Set(athletes.map(a => a.sport?.name))].sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Atlet" required>
                    <select value={form.athlete_id} onChange={e => setField('athlete_id', e.target.value)} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {athletes.filter(a => !formSportFilter || a.sport?.name === formSportFilter).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Tarikh Rekod" required>
                    <input type="date" value={form.recorded_date} onChange={e => setField('recorded_date', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <NumField label="Berat (kg)" val={form.weight} onChange={v => setField('weight', v)} />
                <NumField label="SMM — Jisim Otot Rangka (kg)" val={form.smm} onChange={v => setField('smm', v)} />
                <NumField label="Lemak Badan (kg)" val={form.body_fat_mass} onChange={v => setField('body_fat_mass', v)} />
                <NumField label="BMI" val={form.bmi} onChange={v => setField('bmi', v)} />
                <NumField label="Peratusan Lemak (%)" val={form.fat_pct} onChange={v => setField('fat_pct', v)} />
                <NumField label="BMR (kcal)" val={form.bmr} onChange={v => setField('bmr', v)} />
                <NumField label="Skor InBody" val={form.inbody_score} onChange={v => setField('inbody_score', v)} />
                {(form.smm != null || form.body_fat_mass != null || form.bmi != null || form.fat_pct != null || form.inbody_score != null) && (
                  <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-[#F5F5F7] rounded-lg">
                    <p className="text-[10px] text-[#888] font-semibold uppercase tracking-widest">Skor SUKMA (dikira):</p>
                    <span className="text-sm font-bold text-[#111]">{computeSkor(form)}/5</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      computeUlasan(computeSkor(form)) === 'BAIK' ? BADGE_GREEN :
                      computeUlasan(computeSkor(form)) === 'SEDERHANA' ? BADGE_ORANGE : BADGE_RED
                    }`}>{computeUlasan(computeSkor(form))}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam rekod ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{confirmDelete.athlete?.name} — {fmtDate(confirmDelete.recorded_date)}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">{deleting ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const filterCls = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
        {label}{required && <span className="text-[#D44040] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function NumField({ label, val, onChange }: { label: string; val: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="0.1"
        value={val ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : +e.target.value)}
        className={inputCls}
        placeholder="—"
      />
    </Field>
  )
}
