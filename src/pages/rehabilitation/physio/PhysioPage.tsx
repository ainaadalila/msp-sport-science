import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { logAction } from '../../../lib/audit'

interface Athlete {
  id: string
  name: string
  sport: string
}

interface PhysioSlot {
  id: string
  slot_date: string
  time_slot: string
  athlete_id: string | null
  diagnosis: string | null
  date_of_injury: string | null
  referred_by: string | null
  chief_complaint: string | null
  injury_type: string | null
  session_type: 'standard' | 'manual' | 'injury' | null
  assessment_notes: string | null
  rehab_plan: string | null
  progress_notes: string | null
  physiotherapist_id: string | null
  pain_scale: number | null
  target_muscle: string | null
  treatment_type: string | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  case_id: string | null
  created_at: string
  athlete?: { name: string; sport: string } | null
}

interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed' | 'referred'
  athlete?: { name: string; sport: string } | null
}

type BookingFormState = {
  slot_date: string
  time_slot: string
  athlete_id: string
  diagnosis: string
  date_of_injury: string
  referred_by: string
  session_type: 'standard' | 'manual' | 'injury' | ''
  case_id: string
}

type AssessmentFormState = {
  chief_complaint: string
  injury_type: string
  assessment_notes: string
  rehab_plan: string
  progress_notes: string
  pain_scale: string
  target_muscle: string
  treatment_type: string
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
}

type Tab = 'schedule' | 'records'

const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00']
const DAY_NAMES = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad']

const sessionLabel: Record<string, string> = { standard: 'PENILAIAN', manual: 'SUSULAN', injury: 'KRISIS' }
const sessionStyle: Record<string, string> = {
  standard: 'bg-[rgba(245,106,0,0.1)] text-[#F56A00] border border-[rgba(245,106,0,0.25)]',
  manual: 'bg-blue-50 text-[#3A7EC8] border border-blue-200',
  injury: 'bg-red-50 text-[#D44040] border border-red-200',
}

const attendanceLabel: Record<string, string> = { scheduled: 'Dijadual', arrived: 'Hadir', completed: 'Selesai', no_show: 'Tidak Hadir' }
const attendanceStyle: Record<string, string> = {
  scheduled: 'bg-gray-100 text-[#888]',
  arrived: 'bg-blue-50 text-[#3A7EC8]',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-red-50 text-[#D44040]',
}
const attendanceDot: Record<string, string> = {
  scheduled: 'bg-gray-300',
  arrived: 'bg-blue-400',
  completed: 'bg-green-500',
  no_show: 'bg-red-400',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getWeekStart(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function toDateStr(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const emptyBookingForm: BookingFormState = {
  slot_date: new Date().toISOString().slice(0, 10),
  time_slot: '08:00',
  athlete_id: '',
  diagnosis: '',
  date_of_injury: '',
  referred_by: '',
  session_type: '',
  case_id: '',
}

const emptyAssessmentForm: AssessmentFormState = {
  chief_complaint: '',
  injury_type: '',
  assessment_notes: '',
  rehab_plan: '',
  progress_notes: '',
  pain_scale: '',
  target_muscle: '',
  treatment_type: '',
  attendance_status: 'scheduled',
}

export default function PhysioPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'
  const isPhysio = profile?.role === 'physio'

  const [tab, setTab] = useState<Tab>('schedule')
  const [slots, setSlots] = useState<PhysioSlot[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [cases, setCases] = useState<PhysioCase[]>([])
  const [loading, setLoading] = useState(true)

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [filterAthlete, setFilterAthlete] = useState('')
  const [filterSession, setFilterSession] = useState('')

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

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [slotRes, athRes, caseRes] = await Promise.all([
      supabase.from('physio_slots')
        .select('*, athlete:athletes(name, sport)')
        .order('slot_date', { ascending: false })
        .order('time_slot'),
      supabase.from('athletes').select('id, name, sport').order('name'),
      supabase.from('physio_cases')
        .select('*, athlete:athletes(name, sport)')
        .eq('status', 'active')
        .order('open_date', { ascending: false }),
    ])
    setSlots(slotRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setCases(caseRes.data ?? [])
    setLoading(false)
  }

  function openBookingAdd(prefillDate?: string, prefillTime?: string) {
    setBookingEditing(null)
    setBookingForm({
      ...emptyBookingForm,
      slot_date: prefillDate ?? new Date().toISOString().slice(0, 10),
      time_slot: prefillTime ?? '08:00',
    })
    setFormSport('')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openBookingEdit(s: PhysioSlot) {
    setBookingEditing(s)
    setBookingForm({
      slot_date: s.slot_date,
      time_slot: s.time_slot,
      athlete_id: s.athlete_id ?? '',
      diagnosis: s.diagnosis ?? '',
      date_of_injury: s.date_of_injury ?? '',
      referred_by: s.referred_by ?? '',
      session_type: s.session_type ?? '',
      case_id: s.case_id ?? '',
    })
    setFormSport(s.athlete?.sport ?? '')
    setBookingError(null)
    setBookingModalOpen(true)
  }

  function openAssessmentEdit(s: PhysioSlot) {
    setAssessmentEditing(s)
    setAssessmentForm({
      chief_complaint: s.chief_complaint ?? '',
      injury_type: s.injury_type ?? '',
      assessment_notes: s.assessment_notes ?? '',
      rehab_plan: s.rehab_plan ?? '',
      progress_notes: s.progress_notes ?? '',
      pain_scale: s.pain_scale !== null ? String(s.pain_scale) : '',
      target_muscle: s.target_muscle ?? '',
      treatment_type: s.treatment_type ?? '',
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
    if (!bookingForm.slot_date || !bookingForm.time_slot) {
      setBookingError('Tarikh dan masa slot wajib diisi.')
      return
    }
    setBookingSaving(true)
    setBookingError(null)

    const payload = {
      slot_date: bookingForm.slot_date,
      time_slot: bookingForm.time_slot,
      athlete_id: bookingForm.athlete_id || null,
      diagnosis: bookingForm.diagnosis || null,
      date_of_injury: bookingForm.date_of_injury || null,
      referred_by: bookingForm.referred_by || null,
      session_type: bookingForm.session_type || null,
      case_id: bookingForm.case_id || null,
      physiotherapist_id: profile?.id,
    }

    if (bookingEditing) {
      const { error } = await supabase.from('physio_slots').update(payload).eq('id', bookingEditing.id)
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'update_physio_slot', 'physio_slots', bookingEditing.id)
    } else {
      const { data, error } = await supabase.from('physio_slots').insert(payload).select('id').single()
      if (error) { setBookingError(error.message); setBookingSaving(false); return }
      await logAction(profile!.id, 'create_physio_slot', 'physio_slots', data.id)
    }

    setBookingSaving(false)
    setBookingModalOpen(false)
    fetchAll()
  }

  async function handleAssessmentSave() {
    setAssessmentSaving(true)
    setAssessmentError(null)

    const payload = {
      chief_complaint: assessmentForm.chief_complaint || null,
      injury_type: assessmentForm.injury_type || null,
      assessment_notes: assessmentForm.assessment_notes || null,
      rehab_plan: assessmentForm.rehab_plan || null,
      progress_notes: assessmentForm.progress_notes || null,
      pain_scale: assessmentForm.pain_scale !== '' ? parseInt(assessmentForm.pain_scale, 10) : null,
      target_muscle: assessmentForm.target_muscle || null,
      treatment_type: assessmentForm.treatment_type || null,
      attendance_status: assessmentForm.attendance_status || 'scheduled',
    }

    const { error } = await supabase.from('physio_slots').update(payload).eq('id', assessmentEditing!.id)
    if (error) { setAssessmentError(error.message); setAssessmentSaving(false); return }
    await logAction(profile!.id, 'update_physio_slot', 'physio_slots', assessmentEditing!.id)

    setAssessmentSaving(false)
    setAssessmentModalOpen(false)
    if (detailSlot?.id === assessmentEditing?.id) {
      const updated = await supabase.from('physio_slots').select('*').eq('id', assessmentEditing!.id).single()
      if (updated.data) setDetailSlot(updated.data)
    }
    fetchAll()
  }

  async function handleDelete(s: PhysioSlot) {
    await supabase.from('physio_slots').delete().eq('id', s.id)
    await logAction(profile!.id, 'delete_physio_slot', 'physio_slots', s.id)
    setConfirmDelete(null)
    setDetailSlot(null)
    fetchAll()
  }

  async function handleMarkArrived(s: PhysioSlot) {
    if (s.attendance_status !== 'scheduled') return
    await supabase.from('physio_slots').update({ attendance_status: 'arrived' }).eq('id', s.id)
    await logAction(profile!.id, 'mark_arrived_physio_slot', 'physio_slots', s.id)
    const updated = await supabase.from('physio_slots').select('*').eq('id', s.id).single()
    if (updated.data) setDetailSlot(updated.data)
    fetchAll()
  }

  // Schedule view: weekly slot map
  const weekDays = getWeekDays(weekStart)
  const weekSlotMap: Record<string, Record<string, PhysioSlot>> = {}
  slots.forEach(s => {
    if (!weekSlotMap[s.slot_date]) weekSlotMap[s.slot_date] = {}
    weekSlotMap[s.slot_date][s.time_slot] = s
  })
  const weekSlotsCount = weekDays.filter(d => weekSlotMap[toDateStr(d)]).reduce((acc, d) => acc + Object.keys(weekSlotMap[toDateStr(d)] ?? {}).length, 0)
  const todayStr = toDateStr(new Date())

  // Records view
  const filteredSlots = slots.filter(s => {
    const matchAthlete = !filterAthlete || s.athlete_id === filterAthlete
    const matchSession = !filterSession || s.session_type === filterSession
    return matchAthlete && matchSession
  })

  const canEdit = isAdmin || isPhysio
  const allSports = [...new Set(athletes.map(a => a.sport))].sort()
  const modalAthletes = formSport ? athletes.filter(a => a.sport === formSport) : athletes

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{slots.length} rekod slot</p>
        {canEdit && (
          <button onClick={() => openBookingAdd()} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Tempah Slot
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['schedule', 'records'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#888] hover:text-[#444]'}`}
          >
            {t === 'schedule' ? 'Jadual Mingguan' : 'Semua Rekod'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : tab === 'schedule' ? (

        // ── Schedule Tab (Weekly) ─────────────────────────────
        <div className="space-y-3">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#111]">
              {weekDays[0].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setWeekStart(d => { const prev = new Date(d); prev.setDate(d.getDate() - 7); return prev })}
                className="px-3 py-1.5 text-sm text-[#555] hover:text-[#F56A00] rounded-md hover:bg-white transition"
              >
                ← Lepas
              </button>
              <button
                onClick={() => setWeekStart(getWeekStart(new Date()))}
                className="px-3 py-1.5 text-sm text-[#555] hover:text-[#F56A00] rounded-md hover:bg-white transition"
              >
                Minggu Ini
              </button>
              <button
                onClick={() => setWeekStart(d => { const next = new Date(d); next.setDate(d.getDate() + 7); return next })}
                className="px-3 py-1.5 text-sm text-[#555] hover:text-[#F56A00] rounded-md hover:bg-white transition"
              >
                Depan →
              </button>
            </div>
            <span className="text-[12px] text-[#888]">{weekSlotsCount} slot minggu ini</span>
          </div>

          {/* Weekly grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-16 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] bg-gray-50"></th>
                  {weekDays.map((d, i) => {
                    const dateStr = toDateStr(d)
                    const isToday = dateStr === todayStr
                    return (
                      <th key={dateStr} className={`px-2 py-3 text-center min-w-[110px] border-l border-gray-200 ${isToday ? 'bg-[rgba(245,106,0,0.06)]' : 'bg-gray-50'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest block ${isToday ? 'text-[#F56A00]' : 'text-[#888]'}`}>{DAY_NAMES[i]}</span>
                        <span className={`text-[18px] font-bold leading-none mt-0.5 block ${isToday ? 'text-[#F56A00]' : 'text-[#111]'}`}>
                          {d.getDate()}
                        </span>
                        <span className={`text-[10px] ${isToday ? 'text-[#F56A00]' : 'text-[#888]'}`}>
                          {d.toLocaleDateString('ms-MY', { month: 'short' })}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, ri) => (
                  <tr key={time} className={ri < TIME_SLOTS.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#aaa] whitespace-nowrap align-top pt-2 bg-gray-50 border-r border-gray-200">{time}</td>
                    {weekDays.map((d) => {
                      const dateStr = toDateStr(d)
                      const booked = weekSlotMap[dateStr]?.[time]
                      const isToday = dateStr === todayStr
                      return (
                        <td key={dateStr} className={`px-1.5 py-1.5 align-top border-l border-gray-100 ${isToday ? 'bg-[rgba(245,106,0,0.025)]' : ''}`}>
                          {booked ? (
                            <button
                              onClick={() => { setDetailSlot(booked); setDetailView('booking') }}
                              className={`w-full text-left rounded-lg px-2 py-1.5 border text-[11px] transition hover:opacity-80 ${booked.session_type ? sessionStyle[booked.session_type] : 'bg-gray-50 text-[#444] border-gray-200'}`}
                            >
                              <p className="font-mono font-semibold text-[10px] opacity-60">{booked.time_slot}</p>
                              <p className="font-semibold truncate leading-tight mt-0.5">{booked.athlete?.name ?? 'Tiada atlet'}</p>
                              {booked.athlete?.sport && <p className="opacity-60 text-[10px] truncate">{booked.athlete.sport}</p>}
                              {booked.session_type && <p className="opacity-60 text-[10px] mt-0.5 font-semibold tracking-wide">{sessionLabel[booked.session_type]}</p>}
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full inline-block ${attendanceDot[booked.attendance_status ?? 'scheduled']}`} />
                                <span className="text-[9px] opacity-50">{attendanceLabel[booked.attendance_status ?? 'scheduled']}</span>
                              </div>
                            </button>
                          ) : canEdit ? (
                            <button
                              onClick={() => openBookingAdd(dateStr, time)}
                              className="w-full h-full min-h-[48px] rounded-lg border border-dashed border-transparent hover:border-[#F56A00] hover:bg-orange-50/40 text-transparent hover:text-[#F56A00] text-[11px] transition flex items-center justify-center"
                            >
                              +
                            </button>
                          ) : (
                            <div className="min-h-[48px]" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Legend */}
            <div className="flex items-center gap-5 px-4 py-3 border-t border-gray-100 flex-wrap">
              {(['standard', 'manual', 'injury'] as const).map(type => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${type === 'standard' ? 'bg-[#F56A00]' : type === 'manual' ? 'bg-[#3A7EC8]' : 'bg-[#D44040]'}`} />
                  <span className="text-[11px] text-[#888]">{sessionLabel[type]}</span>
                </div>
              ))}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              {(['scheduled', 'arrived', 'completed', 'no_show'] as const).map(status => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full inline-block ${attendanceDot[status]}`} />
                  <span className="text-[10px] text-[#888]">{attendanceLabel[status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (

        // ── All Records Tab ──────────────────────────────────
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={filterAthlete} onChange={e => setFilterAthlete(e.target.value)} className={filterCls}>
              <option value="">Semua Atlet</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterSession} onChange={e => setFilterSession(e.target.value)} className={filterCls}>
              <option value="">Semua Jenis Sesi</option>
              <option value="standard">PENILAIAN</option>
              <option value="manual">SUSULAN</option>
              <option value="injury">KRISIS</option>
            </select>
            {(filterAthlete || filterSession) && (
              <button onClick={() => { setFilterAthlete(''); setFilterSession('') }} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
                Kosongkan Penapis
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredSlots.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">
                {slots.length === 0 ? 'Tiada rekod slot lagi.' : 'Tiada rekod sepadan penapis.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Tarikh', 'Masa', 'Atlet', 'Jenis Sesi', 'Kecederaan', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{fmtDate(s.slot_date)}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-[#444]">{s.time_slot}</td>
                      <td className="px-4 py-3 font-medium text-[#111]">{s.athlete?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.session_type
                          ? <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${sessionStyle[s.session_type]}`}>{sessionLabel[s.session_type]}</span>
                          : <span className="text-[#888]">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-[#888]">{s.injury_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end text-xs">
                          <button onClick={() => { setDetailSlot(s); setDetailView('booking') }} className="text-[#3A7EC8] hover:underline font-medium">Lihat</button>
                          <button onClick={() => { setDetailSlot(s); setDetailView('full') }} className="text-[#F56A00] hover:underline font-medium">Catatan</button>
                          {canEdit && <button onClick={() => openBookingEdit(s)} className="text-[#555] hover:underline font-medium">Edit</button>}
                          {isAdmin && <button onClick={() => setConfirmDelete(s)} className="text-[#D44040] hover:underline font-medium">Padam</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">{bookingEditing ? 'Edit Slot Fisioterapi' : 'Rekod Slot Baharu'}</h3>
              <button onClick={() => setBookingModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {bookingError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{bookingError}</div>}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh" required>
                    <input type="date" value={bookingForm.slot_date} onChange={e => setBookingField('slot_date', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Masa Slot" required>
                    <select value={bookingForm.time_slot} onChange={e => setBookingField('time_slot', e.target.value)} className={inputCls}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sukan">
                    <select value={formSport} onChange={e => { setFormSport(e.target.value); setBookingField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Semua Sukan —</option>
                      {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Atlet" required>
                    <select value={bookingForm.athlete_id} onChange={e => setBookingField('athlete_id', e.target.value)} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {modalAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Kes (Opsional)">
                  <select value={bookingForm.case_id} onChange={e => setBookingField('case_id', e.target.value)} className={inputCls}>
                    <option value="">— Tanpa kes —</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.athlete?.name}{c.injury_type ? ` - ${c.injury_type}` : ''} - {new Date(c.open_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</option>)}
                  </select>
                </Field>
                <Field label="Diagnosis">
                  <input value={bookingForm.diagnosis} onChange={e => setBookingField('diagnosis', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. STRAIN HAMSTRING" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh Kecederaan">
                    <input type="date" value={bookingForm.date_of_injury} onChange={e => setBookingField('date_of_injury', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Dirujuk Oleh">
                    <input value={bookingForm.referred_by} onChange={e => setBookingField('referred_by', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. DOKTOR" />
                  </Field>
                </div>
                <Field label="Jenis Sesi">
                  <select value={bookingForm.session_type} onChange={e => setBookingField('session_type', e.target.value as BookingFormState['session_type'])} className={inputCls}>
                    <option value="">— Pilih —</option>
                    <option value="standard">PENILAIAN</option>
                    <option value="manual">SUSULAN</option>
                    <option value="injury">KRISIS</option>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">Catatan Sesi</h3>
              <button onClick={() => setAssessmentModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {assessmentError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{assessmentError}</div>}

              <div className="space-y-3">
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
                <Field label="Nota Kemajuan">
                  <textarea value={assessmentForm.progress_notes} onChange={e => setAssessmentField('progress_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PERKEMBANGAN SEMASA..." />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Skala Kesakitan (0–10)">
                    <input type="number" min={0} max={10} value={assessmentForm.pain_scale} onChange={e => setAssessmentField('pain_scale', e.target.value)} className={inputCls} placeholder="0–10" />
                  </Field>
                  <Field label="Status Kehadiran">
                    <select value={assessmentForm.attendance_status} onChange={e => setAssessmentField('attendance_status', e.target.value as AssessmentFormState['attendance_status'])} className={inputCls}>
                      <option value="scheduled">Dijadual</option>
                      <option value="arrived">Hadir</option>
                      <option value="completed">Selesai</option>
                      <option value="no_show">Tidak Hadir</option>
                    </select>
                  </Field>
                </div>
                <Field label="Otot Sasaran">
                  <input value={assessmentForm.target_muscle} onChange={e => setAssessmentField('target_muscle', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. HAMSTRING, QUADRICEPS" />
                </Field>
                <Field label="Jenis Rawatan">
                  <input value={assessmentForm.treatment_type} onChange={e => setAssessmentField('treatment_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. ULTRASOUND, TENS, MANUAL THERAPY" />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111]">{detailSlot.athlete?.name ?? 'Tiada Atlet'}</h3>
                <p className="text-[12px] text-[#888]">{fmtDate(detailSlot.slot_date)} · {detailSlot.time_slot} · {detailSlot.athlete?.sport ?? ''}</p>
              </div>
              <button onClick={() => setDetailSlot(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {detailView === 'booking' ? (
                // Modal 1: Booking View
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Maklumat Tempahan</p>
                  <div className="space-y-2">
                    {[
                      ['Diagnosis', detailSlot.diagnosis],
                      ['Tarikh Kecederaan', detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : null],
                      ['Dirujuk Oleh', detailSlot.referred_by],
                      ['Kes', detailSlot.case_id ? cases.find(c => c.id === detailSlot.case_id)?.athlete?.name : null],
                      ['Jenis Sesi', detailSlot.session_type ? sessionLabel[detailSlot.session_type] : null],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between">
                        <p className="text-[10px] text-[#888]">{label}</p>
                        <p className="text-sm font-medium text-[#111]">{val ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Modal 2: Full Session View
                <>
                  {/* Booking Summary */}
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-[#888]">TEMPAHAN</p>
                    <div className="text-sm text-[#444] space-y-0.5">
                      <p><span className="text-[#888]">Diagnosis:</span> {detailSlot.diagnosis || '—'}</p>
                      <p><span className="text-[#888]">Tarikh Kecederaan:</span> {detailSlot.date_of_injury ? fmtDate(detailSlot.date_of_injury) : '—'}</p>
                      <p><span className="text-[#888]">Dirujuk Oleh:</span> {detailSlot.referred_by || '—'}</p>
                      <p><span className="text-[#888]">Jenis Sesi:</span> {detailSlot.session_type ? sessionLabel[detailSlot.session_type] : '—'}</p>
                    </div>
                  </div>

                  {/* Assessment Details */}
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
                      ['Nota Kemajuan', detailSlot.progress_notes],
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
                    {detailSlot.treatment_type && (
                      <div>
                        <p className="text-[10px] text-[#888] mb-1">Jenis Rawatan</p>
                        <p className="text-sm text-[#444] bg-gray-50 rounded px-3 py-2">{detailSlot.treatment_type}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 flex-wrap">
              {detailView === 'booking' ? (
                <>
                  {isAdmin && (
                    <button onClick={() => { setConfirmDelete(detailSlot); setDetailSlot(null) }} className="px-4 py-2 text-sm text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 transition">Padam</button>
                  )}
                  {canEdit && detailSlot.attendance_status === 'scheduled' && (
                    <button onClick={() => handleMarkArrived(detailSlot)} className="px-4 py-2 text-sm font-semibold text-white bg-[#3A7EC8] hover:bg-blue-700 rounded-lg transition">
                      Tandai Hadir
                    </button>
                  )}
                  <button onClick={() => setDetailView('full')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Catatan Sesi
                  </button>
                  {canEdit && (
                    <button onClick={() => { openBookingEdit(detailSlot); setDetailSlot(null) }} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition">Edit</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setDetailView('booking')} className="px-4 py-2 text-sm font-semibold bg-[#F5F5F7] text-[#111] hover:bg-gray-100 rounded-lg transition">
                    Kembali
                  </button>
                  {canEdit && (
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
            <p className="text-sm font-semibold text-[#111] mb-1">Padam slot ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{fmtDate(confirmDelete.slot_date)} {confirmDelete.time_slot} · {confirmDelete.athlete?.name ?? 'Tiada atlet'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
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
