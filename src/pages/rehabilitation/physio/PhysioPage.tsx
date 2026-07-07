import { useEffect, useState, useMemo, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { useSports } from '../../../hooks/useSports'
import { logAction } from '../../../lib/audit'

interface Athlete {
  id: string
  name: string
  ic_number: string
  sport_id: string
  status: string
  sport?: { name: string }
}

interface PhysioSlot {
  id: string
  slot_date: string
  athlete_id: string | null
  diagnosis: string | null
  date_of_injury: string | null
  referred_by: string | null
  chief_complaint: string | null
  injury_type: string | null
  assessment_notes: string | null
  rehab_plan: string | null
  physiotherapist_id: string | null
  pain_scale: number | null
  target_muscle: string | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  case_id: string | null
  created_at: string
  athlete?: { name: string; sport?: { name: string } } | null
}

interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed'
  referred_to_doctor: boolean
  referred_date: string | null
  athlete?: { name: string; sport?: { name: string } } | null
}

type BookingFormState = {
  slot_date: string
  athlete_id: string
  case_id: string
}

type AssessmentFormState = {
  diagnosis: string
  date_of_injury: string
  referred_by: string
  chief_complaint: string
  injury_type: string
  assessment_notes: string
  rehab_plan: string
  pain_scale: string
  target_muscle: string
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
}

const attendanceLabel: Record<string, string> = { scheduled: 'Dijadual', arrived: 'Hadir', completed: 'Selesai', no_show: 'Tidak Hadir' }
const attendanceStyle: Record<string, string> = {
  scheduled: 'bg-gray-100 text-[#888]',
  arrived: 'bg-blue-50 text-[#3A7EC8]',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-red-50 text-[#D44040]',
}


function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function handlePrintCatatan(slot: PhysioSlot) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = pdf.internal.pageSize.getWidth()
  const M = 16
  const CW = PW - M * 2
  let y = M

  // Header
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(245, 106, 0)
  pdf.text('CATATAN SESI FISIOTERAPI', M, y); y += 7

  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
  pdf.text(slot.athlete?.name ?? 'Tiada Atlet', M, y); y += 7

  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
  const sportName = slot.athlete?.sport?.name ?? ''
  const slotDate = fmtDate(slot.slot_date)
  pdf.text(`${sportName}   ${slotDate}`, M, y); y += 5

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 8

  // Helper: section label
  function sectionLabel(text: string) {
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text(text, M, y); y += 5
  }

  // Helper: field row
  function fieldRow(label: string, value: string | null | undefined, multiline = false) {
    if (!value && value !== '0') return
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text(label.toUpperCase(), M, y); y += 4
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(34, 34, 34)
    if (multiline) {
      const lines = pdf.splitTextToSize(value, CW)
      pdf.text(lines, M, y); y += lines.length * 5 + 3
    } else {
      pdf.text(value, M, y); y += 7
    }
  }

  // Maklumat Sesi
  sectionLabel('MAKLUMAT SESI')
  fieldRow('Diagnosis', slot.diagnosis)
  fieldRow('Tarikh Kecederaan', slot.date_of_injury ? fmtDate(slot.date_of_injury) : null)
  fieldRow('Dirujuk Oleh', slot.referred_by)
  y += 2

  // Catatan Sesi
  pdf.setDrawColor(240, 240, 240); pdf.setLineWidth(0.3); pdf.line(M, y, PW - M, y); y += 6
  sectionLabel('CATATAN SESI')
  fieldRow('Keluhan Utama (COC)', slot.chief_complaint, true)
  fieldRow('Jenis Kecederaan', slot.injury_type, true)
  fieldRow('Nota Penilaian', slot.assessment_notes, true)
  fieldRow('Pelan Rehabilitasi', slot.rehab_plan, true)

  // Stats row
  const hasScale = slot.pain_scale !== null
  const statusLabel: Record<string, string> = { scheduled: 'Dijadual', arrived: 'Hadir', completed: 'Selesai', no_show: 'Tidak Hadir' }
  const colW = (CW - 4) / 2
  if (hasScale) {
    pdf.setFillColor(245, 245, 247); pdf.roundedRect(M, y, colW, 14, 1.5, 1.5, 'F')
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text('SKALA KESAKITAN', M + 3, y + 5.5)
    pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
    pdf.text(`${slot.pain_scale} / 10`, M + 3, y + 12)
  }
  pdf.setFillColor(245, 245, 247); pdf.roundedRect(M + colW + 4, y, colW, 14, 1.5, 1.5, 'F')
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
  pdf.text('STATUS KEHADIRAN', M + colW + 7, y + 5.5)
  pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
  pdf.text(statusLabel[slot.attendance_status ?? 'scheduled'], M + colW + 7, y + 12)
  y += 20

  fieldRow('Otot Sasaran', slot.target_muscle, true)

  pdf.save(`Catatan_Fisioterapi_${slot.athlete?.name ?? 'Atlet'}_${slot.slot_date}.pdf`)
}

const emptyBookingForm: BookingFormState = {
  slot_date: new Date().toLocaleDateString('en-CA'),
  athlete_id: '',
  case_id: '',
}

const emptyAssessmentForm: AssessmentFormState = {
  diagnosis: '',
  date_of_injury: '',
  referred_by: '',
  chief_complaint: '',
  injury_type: '',
  assessment_notes: '',
  rehab_plan: '',
  pain_scale: '',
  target_muscle: '',
  attendance_status: 'scheduled',
}

export default function PhysioPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { sports } = useSports()
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')

  const [slots, setSlots] = useState<PhysioSlot[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [cases, setCases] = useState<PhysioCase[]>([])
  const [loading, setLoading] = useState(true)

  // Athlete-first filters
  const [search, setSearch] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null)

  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [detailSlot, setDetailSlot] = useState<PhysioSlot | null>(null)
  const [detailView, setDetailView] = useState<'booking' | 'full'>('booking')

  const [bookingEditing, setBookingEditing] = useState<PhysioSlot | null>(null)
  const [bookingForm, setBookingForm] = useState<BookingFormState>(emptyBookingForm)
  const [formSport, setFormSport] = useState('')
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const [assessmentEditing, setAssessmentEditing] = useState<PhysioSlot | null>(null)
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormState>(emptyAssessmentForm)
  const [assessmentSaving, setAssessmentSaving] = useState(false)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<PhysioSlot | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ATHLETES_PER_PAGE = 25

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (athleteIdParam && athletes.length > 0) {
      setExpandedAthleteId(athleteIdParam)
    }
  }, [athleteIdParam, athletes])

  useEffect(() => {
    setCurrentPage(1)
    setExpandedAthleteId(null)
  }, [search, filterSport])

  async function fetchAll() {
    setLoading(true)
    const [slotRes, athRes, caseRes] = await Promise.all([
      supabase.from('physio_slots')
        .select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, referred_by, target_muscle, rehab_plan, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .order('slot_date', { ascending: false }) as any,
      supabase.from('athletes')
        .select('id, name, ic_number, sport_id, status, sport:sport_id(name)')
        .order('name') as any,
      supabase.from('physio_cases')
        .select('id, athlete_id, injury_type, open_date, status, referred_to_doctor, athlete:athletes(name, sport_id, sport:sport_id(name))')
        .eq('status', 'active')
        .order('open_date', { ascending: false }) as any,
    ])
    setSlots(slotRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setCases(caseRes.data ?? [])
    setLoading(false)
  }

  function openBookingAdd() {
    setBookingEditing(null)
    setBookingForm(emptyBookingForm)
    setFormSport('')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openBookingAddForAthlete(a: Athlete) {
    setBookingEditing(null)
    setBookingForm({ ...emptyBookingForm, athlete_id: a.id })
    setFormSport(a.sport?.name ?? '')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openBookingEdit(s: PhysioSlot) {
    setBookingEditing(s)
    setBookingForm({
      slot_date: s.slot_date,
      athlete_id: s.athlete_id ?? '',
      case_id: s.case_id ?? '',
    })
    setFormSport(s.athlete?.sport?.name ?? '')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openAssessmentEdit(s: PhysioSlot) {
    setAssessmentEditing(s)
    setAssessmentForm({
      diagnosis: s.diagnosis ?? '',
      date_of_injury: s.date_of_injury ?? '',
      referred_by: s.referred_by ?? '',
      chief_complaint: s.chief_complaint ?? '',
      injury_type: s.injury_type ?? '',
      assessment_notes: s.assessment_notes ?? '',
      rehab_plan: s.rehab_plan ?? '',
      pain_scale: s.pain_scale !== null ? String(s.pain_scale) : '',
      target_muscle: s.target_muscle ?? '',
      attendance_status: s.attendance_status ?? 'scheduled',
    })
    setAssessmentError(null)
    setAssessmentModalOpen(true)
  }

  function setBookingField<K extends keyof BookingFormState>(key: K, val: BookingFormState[K]) {
    setBookingForm(f => ({ ...f, [key]: val }))
  }

  function setAssessmentField<K extends keyof AssessmentFormState>(key: K, val: AssessmentFormState[K]) {
    setAssessmentForm(f => ({ ...f, [key]: val }))
  }

  async function handleBookingSave() {
    if (!bookingForm.slot_date) {
      setBookingError('Tarikh sesi wajib diisi.')
      return
    }
    setBookingSaving(true)
    setBookingError(null)

    const payload = {
      slot_date: bookingForm.slot_date,
      athlete_id: bookingForm.athlete_id || null,
      case_id: bookingForm.case_id || null,
      physiotherapist_id: profile?.id,
    }

    if (bookingEditing) {
      const { error } = await supabase.from('physio_slots').update(payload).eq('id', bookingEditing.id)
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'update_physio_slot', 'physio_slots', bookingEditing.id)
      setBookingSaving(false)
      setBookingModalOpen(false)
      fetchAll()
    } else {
      const { data, error } = await supabase.from('physio_slots').insert(payload).select('id').single()
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'create_physio_slot', 'physio_slots', data.id)
      setBookingSaving(false)
      setBookingModalOpen(false)
      const newId = data.id
      await fetchAll()
      setSlots(prev => { const n = prev.find(s => s.id === newId); return n ? [n, ...prev.filter(s => s.id !== newId)] : prev })
    }
  }

  async function handleAssessmentSave() {
    setAssessmentSaving(true)
    setAssessmentError(null)

    const payload = {
      diagnosis: assessmentForm.diagnosis || null,
      date_of_injury: assessmentForm.date_of_injury || null,
      referred_by: assessmentForm.referred_by || null,
      chief_complaint: assessmentForm.chief_complaint || null,
      injury_type: assessmentForm.injury_type || null,
      assessment_notes: assessmentForm.assessment_notes || null,
      rehab_plan: assessmentForm.rehab_plan || null,
      pain_scale: assessmentForm.pain_scale !== '' ? parseInt(assessmentForm.pain_scale, 10) : null,
      target_muscle: assessmentForm.target_muscle || null,
      attendance_status: assessmentForm.attendance_status || 'scheduled',
    }

    const { error } = await supabase.from('physio_slots').update(payload).eq('id', assessmentEditing!.id)
    if (error) { setAssessmentError(error.message); setAssessmentSaving(false); return }
    await logAction(profile!.id, 'update_physio_slot', 'physio_slots', assessmentEditing!.id)

    setAssessmentSaving(false)
    setAssessmentModalOpen(false)
    if (detailSlot?.id === assessmentEditing?.id) {
      const updated = await (supabase.from('physio_slots').select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, referred_by, target_muscle, rehab_plan, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))').eq('id', assessmentEditing!.id).single() as any)
      if (updated.data) setDetailSlot(updated.data)
    }
    fetchAll()
  }

  async function handleDelete(s: PhysioSlot) {
    try {
      setDeleting(true)
      await supabase.from('physio_slots').delete().eq('id', s.id)
      await logAction(profile!.id, 'delete_physio_slot', 'physio_slots', s.id)
      setConfirmDelete(null)
      setDetailSlot(null)
      await fetchAll()
    } finally {
      setDeleting(false)
    }
  }

  async function handleMarkArrived(s: PhysioSlot) {
    if (s.attendance_status !== 'scheduled') return
    await supabase.from('physio_slots').update({ attendance_status: 'arrived' }).eq('id', s.id)
    await logAction(profile!.id, 'mark_arrived_physio_slot', 'physio_slots', s.id)
    const updated = await (supabase.from('physio_slots').select('id, athlete_id, case_id, slot_date, pain_scale, chief_complaint, injury_type, date_of_injury, diagnosis, referred_by, target_muscle, rehab_plan, assessment_notes, attendance_status, athlete:athletes(name, sport_id, sport:sport_id(name))').eq('id', s.id).single() as any)
    if (updated.data) setDetailSlot(updated.data)
    fetchAll()
  }

  // Group slots by athlete
  const slotsByAthlete = useMemo(() => {
    const map = new Map<string, PhysioSlot[]>()
    for (const s of slots) {
      if (!s.athlete_id) continue
      if (!map.has(s.athlete_id)) map.set(s.athlete_id, [])
      map.get(s.athlete_id)!.push(s)
    }
    return map
  }, [slots])

  // Active cases by athlete
  const activeCaseAthletes = useMemo(() => new Set(cases.map(c => c.athlete_id)), [cases])

  // Filter athletes using AthletesPage-style filters
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const q = search.toLowerCase()
      const sportName = a.sport?.name?.toLowerCase() || ''
      const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.ic_number || '').toLowerCase().includes(q) || sportName.includes(q)
      const matchSport = !filterSport || a.sport_id === filterSport
      return matchSearch && matchSport
    })
  }, [athletes, search, filterSport])

  const totalPages = Math.ceil(filteredAthletes.length / ATHLETES_PER_PAGE)
  const paginatedAthletes = filteredAthletes.slice(
    (currentPage - 1) * ATHLETES_PER_PAGE,
    currentPage * ATHLETES_PER_PAGE
  )

  // Stats based on filtered athletes
  const filteredIds = useMemo(() => new Set(filteredAthletes.map(a => a.id)), [filteredAthletes])
  const filteredSlots = useMemo(() => slots.filter(s => s.athlete_id && filteredIds.has(s.athlete_id)), [slots, filteredIds])
  const filteredActiveCases = useMemo(() => cases.filter(c => c.athlete_id && filteredIds.has(c.athlete_id)), [cases, filteredIds])

  const allSports = [...new Set(athletes.map(a => a.sport?.name))].filter(Boolean).sort()
  const modalAthletes = formSport ? athletes.filter(a => a.sport?.name === formSport) : athletes

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{athletes.length} atlet • {slots.length} rekod sesi</p>
        {can('physio', 'create') && (
          <button onClick={openBookingAdd} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Rekod Sesi Baharu
          </button>
        )}
      </div>

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Kes Aktif</p>
            <p className="text-3xl font-bold text-[#111]">{filteredActiveCases.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Jumlah Sesi</p>
            <p className="text-3xl font-bold text-[#111]">{filteredSlots.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-2">Purata Kesakitan</p>
            <p className="text-3xl font-bold text-[#111]">
              {(() => {
                const withPain = filteredSlots.filter(s => s.pain_scale !== null)
                return withPain.length > 0
                  ? (withPain.reduce((sum, s) => sum + (s.pain_scale ?? 0), 0) / withPain.length).toFixed(1)
                  : '—'
              })()}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : (
        <div className="space-y-3">

          {/* Filters — AthletesPage style */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Cari nama, IC, sukan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`${filterCls} min-w-[200px]`}
            />
            <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className={filterCls}>
              <option value="">Semua Sukan</option>
              {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {(search || filterSport) && (
              <button
                onClick={() => { setSearch(''); setFilterSport('') }}
                className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition"
              >
                Kosongkan Penapis
              </button>
            )}
          </div>

          {/* Athlete-first table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-sm text-[#888]">
              <span>{filteredAthletes.length} atlet</span>
            </div>
            {filteredAthletes.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">Tiada atlet sepadan penapis.</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Atlet', 'Sukan', 'Kes Aktif', 'Sesi Terkini', 'Jumlah Sesi', ''].map(h => (
                        <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAthletes.map(a => {
                      const athleteSlots = (slotsByAthlete.get(a.id) ?? [])
                        .sort((x, y) => y.slot_date.localeCompare(x.slot_date))
                      const latestSlot = athleteSlots[0] ?? null
                      const hasActiveCase = activeCaseAthletes.has(a.id)
                      const isExpanded = expandedAthleteId === a.id

                      return (
                        <Fragment key={a.id}>
                          <tr
                            onClick={() => setExpandedAthleteId(isExpanded ? null : a.id)}
                            className={`border-b border-gray-50 cursor-pointer ${isExpanded ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3 font-medium text-[#111]">{a.name}</td>
                            <td className="px-4 py-3 text-[#888]">{a.sport?.name ?? '—'}</td>
                            <td className="px-4 py-3">
                              {hasActiveCase
                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#D44040] border border-red-200">Aktif</span>
                                : <span className="text-[#888] text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] text-[#444]">
                              {latestSlot ? fmtDate(latestSlot.slot_date) : '—'}
                            </td>
                            <td className="px-4 py-3 text-[#888] text-xs">
                              {athleteSlots.length > 0 ? `${athleteSlots.length} sesi` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-[#888] text-xs select-none">
                              {isExpanded ? '▲' : '▼'}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${a.id}-detail`}>
                              <td colSpan={6} className="px-4 pb-4 pt-0 bg-orange-50/40">
                                <div className="border border-orange-100 rounded-xl overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-2 bg-orange-50 border-b border-orange-100">
                                    <span className="text-xs font-semibold text-[#F56A00]">
                                      Sesi Fisioterapi — {a.name}
                                    </span>
                                    {can('physio', 'create') && (
                                      <button
                                        onClick={e => { e.stopPropagation(); openBookingAddForAthlete(a) }}
                                        className="text-xs font-semibold text-white bg-[#F56A00] hover:bg-[#D45A00] px-3 py-1 rounded-lg transition"
                                      >
                                        + Tambah Sesi
                                      </button>
                                    )}
                                  </div>
                                  {athleteSlots.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-[#888] text-xs">
                                      Tiada rekod sesi fisioterapi untuk atlet ini.
                                    </div>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-orange-100">
                                          {['Tarikh', 'Kecederaan', 'Status', ''].map(h => (
                                            <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-3 py-2">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {athleteSlots.map(s => (
                                          <tr key={s.id} className="border-b border-orange-50 last:border-0 hover:bg-orange-50">
                                            <td className="px-3 py-2 font-mono text-[#444]">{fmtDate(s.slot_date)}</td>
                                            <td className="px-3 py-2 text-[#888]">{s.injury_type ?? '—'}</td>
                                            <td className="px-3 py-2">
                                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${attendanceStyle[s.attendance_status ?? 'scheduled']}`}>
                                                {attendanceLabel[s.attendance_status ?? 'scheduled']}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <div className="flex gap-2 justify-end">
                                                <button onClick={e => { e.stopPropagation(); setDetailSlot(s); setDetailView('full') }} className="text-[#F56A00] hover:underline font-medium">Catatan</button>
                                                {can('physio', 'update') && <button onClick={e => { e.stopPropagation(); openBookingEdit(s) }} className="text-[#555] hover:underline font-medium">Edit</button>}
                                                {can('physio', 'delete') && <button onClick={e => { e.stopPropagation(); setConfirmDelete(s) }} className="text-[#D44040] hover:underline font-medium">Padam</button>}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[11px] text-[#888]">Halaman {currentPage} daripada {totalPages}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">← Sebelumnya</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((page, idx, arr) => (
                        <span key={page} className="flex items-center">
                          {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-[#888] text-[11px]">…</span>}
                          <button onClick={() => setCurrentPage(page)} className={`w-7 h-7 text-[11px] rounded-lg ${currentPage === page ? 'bg-[#F56A00] text-white font-semibold' : 'text-[#444] border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                        </span>
                      ))}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Seterusnya →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">{bookingEditing ? 'Edit Sesi Fisioterapi' : 'Rekod Sesi Fisioterapi Baharu'}</h3>
              <button onClick={() => setBookingModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {bookingError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{bookingError}</div>}
              <div className="space-y-3">
                <Field label="Tarikh Sesi" required>
                  <input type="date" value={bookingForm.slot_date} onChange={e => setBookingField('slot_date', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sukan">
                    <select value={formSport} onChange={e => { setFormSport(e.target.value); setBookingField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Semua Sukan —</option>
                      {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Atlet" required>
                    <select value={bookingForm.athlete_id} onChange={e => { setBookingField('athlete_id', e.target.value); setBookingField('case_id', '') }} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {modalAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Kes (Opsional)">
                  <select value={bookingForm.case_id} onChange={e => setBookingField('case_id', e.target.value)} className={inputCls} disabled={!bookingForm.athlete_id}>
                    <option value="">— Tanpa kes —</option>
                    {cases
                      .filter(c => c.athlete_id === bookingForm.athlete_id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.injury_type ?? 'Tiada diagnosis'} — {new Date(c.open_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </option>
                      ))
                    }
                  </select>
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setBookingModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleBookingSave} disabled={bookingSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {bookingSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Modal */}
      {assessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">Catatan Sesi</h3>
              <button onClick={() => setAssessmentModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {assessmentError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{assessmentError}</div>}
              <div className="space-y-3">
                <Field label="Diagnosis">
                  <input value={assessmentForm.diagnosis} onChange={e => setAssessmentField('diagnosis', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. STRAIN HAMSTRING" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh Kecederaan">
                    <input type="date" value={assessmentForm.date_of_injury} onChange={e => setAssessmentField('date_of_injury', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Dirujuk Oleh">
                    <input value={assessmentForm.referred_by} onChange={e => setAssessmentField('referred_by', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. DOKTOR" />
                  </Field>
                </div>
                <Field label="Keluhan Utama (COC)">
                  <textarea value={assessmentForm.chief_complaint} onChange={e => setAssessmentField('chief_complaint', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="HURAIAN KELUHAN UTAMA..." />
                </Field>
                <Field label="Jenis Kecederaan">
                  <input value={assessmentForm.injury_type} onChange={e => setAssessmentField('injury_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. LIGAMEN LUTUT" />
                </Field>
                <Field label="Nota Penilaian">
                  <textarea value={assessmentForm.assessment_notes} onChange={e => setAssessmentField('assessment_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="DAPATAN SARINGAN..." />
                </Field>
                <Field label="Pelan Rehabilitasi">
                  <textarea value={assessmentForm.rehab_plan} onChange={e => setAssessmentField('rehab_plan', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PELAN RAWATAN & LATIHAN..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Skala Kesakitan (0–10)">
                    <input type="number" min={0} max={10} value={assessmentForm.pain_scale} onChange={e => setAssessmentField('pain_scale', e.target.value)} className={inputCls} placeholder="0–10" />
                  </Field>
                  <Field label="Status Kehadiran">
                    <select value={assessmentForm.attendance_status} onChange={e => setAssessmentField('attendance_status', e.target.value as AssessmentFormState['attendance_status'])} className={inputCls}>
                      <option value="arrived">Hadir</option>
                      <option value="no_show">Tidak Hadir</option>
                    </select>
                  </Field>
                </div>
                <Field label="Otot Sasaran">
                  <input value={assessmentForm.target_muscle} onChange={e => setAssessmentField('target_muscle', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. HAMSTRING, QUADRICEPS" />
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAssessmentModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleAssessmentSave} disabled={assessmentSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {assessmentSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {detailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111]">{detailSlot.athlete?.name ?? 'Tiada Atlet'}</h3>
                <p className="text-[12px] text-[#888]">{fmtDate(detailSlot.slot_date)} · {detailSlot.athlete?.sport?.name ?? ''}</p>
              </div>
              <button onClick={() => setDetailSlot(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {detailView === 'booking' ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Maklumat Sesi</p>
                  <div className="space-y-2">
                    {[
                      ['Diagnosis', detailSlot.diagnosis],
                      ['Tarikh Kecederaan', detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : null],
                      ['Dirujuk Oleh', detailSlot.referred_by],
                      ['Kes', detailSlot.case_id ? cases.find(c => c.id === detailSlot.case_id)?.athlete?.name : null],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between">
                        <p className="text-[10px] text-[#888]">{label}</p>
                        <p className="text-sm font-medium text-[#111]">{val ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-[#888]">MAKLUMAT SESI</p>
                    <div className="text-sm text-[#444] space-y-0.5">
                      <p><span className="text-[#888]">Diagnosis:</span> {detailSlot.diagnosis || '—'}</p>
                      <p><span className="text-[#888]">Tarikh Kecederaan:</span> {detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : '—'}</p>
                      <p><span className="text-[#888]">Dirujuk Oleh:</span> {detailSlot.referred_by || '—'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Catatan Sesi</p>
                    {[
                      ['Keluhan Utama (COC)', detailSlot.chief_complaint],
                      ['Jenis Kecederaan', detailSlot.injury_type],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <p className="text-[10px] text-[#888] mb-1">{label}</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{val || '—'}</p>
                      </div>
                    ))}
                    {[
                      ['Nota Penilaian', detailSlot.assessment_notes],
                      ['Pelan Rehabilitasi', detailSlot.rehab_plan],
                    ].map(([label, val]) => (
                      val && (
                        <div key={label as string}>
                          <p className="text-[10px] text-[#888] mb-1 font-semibold">{label}</p>
                          <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap">{val}</p>
                        </div>
                      )
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      {detailSlot.pain_scale !== null && (
                        <div className="bg-[#F5F5F7] rounded px-3 py-2">
                          <p className="text-[10px] text-[#888] mb-0.5">Skala Kesakitan</p>
                          <p className="text-sm font-bold text-[#111]">{detailSlot.pain_scale} / 10</p>
                        </div>
                      )}
                      <div className="bg-[#F5F5F7] rounded px-3 py-2">
                        <p className="text-[10px] text-[#888] mb-0.5">Status Kehadiran</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${attendanceStyle[detailSlot.attendance_status ?? 'scheduled']}`}>
                          {attendanceLabel[detailSlot.attendance_status ?? 'scheduled']}
                        </span>
                      </div>
                    </div>
                    {detailSlot.target_muscle && (
                      <div>
                        <p className="text-[10px] text-[#888] mb-1">Otot Sasaran</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{detailSlot.target_muscle}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 flex-wrap">
              {detailView === 'booking' ? (
                <>
                  {can('physio', 'delete') && (
                    <button onClick={() => { setConfirmDelete(detailSlot); setDetailSlot(null) }} className="px-4 py-2 text-sm text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 transition">Padam</button>
                  )}
                  {can('physio', 'update') && detailSlot.attendance_status === 'scheduled' && (
                    <button onClick={() => handleMarkArrived(detailSlot)} className="px-4 py-2 text-sm font-semibold text-white bg-[#3A7EC8] hover:bg-blue-700 rounded-lg transition">
                      Tandai Hadir
                    </button>
                  )}
                  <button onClick={() => setDetailView('full')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Catatan Sesi
                  </button>
                  {can('physio', 'update') && (
                    <button onClick={() => { openBookingEdit(detailSlot); setDetailSlot(null) }} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition">Edit</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setDetailView('booking')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Kembali
                  </button>
                  <button onClick={() => handlePrintCatatan(detailSlot)} className="px-4 py-2 text-sm font-semibold border border-gray-200 text-[#444] hover:bg-gray-50 rounded-lg transition">
                    Cetak
                  </button>
                  {can('physio', 'update') && (
                    <button onClick={() => { openAssessmentEdit(detailSlot); setDetailSlot(null) }} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition">Edit Catatan</button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam sesi ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{fmtDate(confirmDelete.slot_date)} · {confirmDelete.athlete?.name ?? 'Tiada atlet'}</p>
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
