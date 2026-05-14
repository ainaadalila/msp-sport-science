import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { logAction } from '../../../lib/audit'
import { ReadOnlyBanner } from '../../../components/ReadOnlyBanner'
import { isReadOnlyMode } from '../../../lib/readOnlyMode'

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

type FormState = {
  slot_date: string
  time_slot: string
  athlete_id: string
  diagnosis: string
  date_of_injury: string
  referred_by: string
  chief_complaint: string
  injury_type: string
  session_type: 'standard' | 'manual' | 'injury' | ''
  assessment_notes: string
  rehab_plan: string
  progress_notes: string
  pain_scale: string
  target_muscle: string
  treatment_type: string
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show' | ''
  case_id: string
}

interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed' | 'referred'
  athlete?: { name: string; sport: string } | null
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
  return d.toISOString().slice(0, 10)
}

const emptyForm: FormState = {
  slot_date: new Date().toISOString().slice(0, 10),
  time_slot: '08:00',
  athlete_id: '',
  diagnosis: '',
  date_of_injury: '',
  referred_by: '',
  chief_complaint: '',
  injury_type: '',
  session_type: '',
  assessment_notes: '',
  rehab_plan: '',
  progress_notes: '',
  pain_scale: '',
  target_muscle: '',
  treatment_type: '',
  attendance_status: 'scheduled',
  case_id: '',
}

export default function PhysioPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'
  const isPhysio = profile?.role === 'physio'
  const readOnly = isReadOnlyMode()

  const [tab, setTab] = useState<Tab>('schedule')
  const [slots, setSlots] = useState<PhysioSlot[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [cases, setCases] = useState<PhysioCase[]>([])
  const [loading, setLoading] = useState(true)

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [filterAthlete, setFilterAthlete] = useState('')
  const [filterSession, setFilterSession] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailSlot, setDetailSlot] = useState<PhysioSlot | null>(null)
  const [editing, setEditing] = useState<PhysioSlot | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formSport, setFormSport] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  function openAdd(prefillDate?: string, prefillTime?: string) {
    setEditing(null)
    setForm({
      ...emptyForm,
      slot_date: prefillDate ?? new Date().toISOString().slice(0, 10),
      time_slot: prefillTime ?? '08:00',
    })
    setFormSport('')
    setError(null)
    setModalOpen(true)
  }

  function openEdit(s: PhysioSlot) {
    setEditing(s)
    setForm({
      slot_date: s.slot_date,
      time_slot: s.time_slot,
      athlete_id: s.athlete_id ?? '',
      diagnosis: s.diagnosis ?? '',
      date_of_injury: s.date_of_injury ?? '',
      referred_by: s.referred_by ?? '',
      chief_complaint: s.chief_complaint ?? '',
      injury_type: s.injury_type ?? '',
      session_type: s.session_type ?? '',
      assessment_notes: s.assessment_notes ?? '',
      rehab_plan: s.rehab_plan ?? '',
      progress_notes: s.progress_notes ?? '',
      pain_scale: s.pain_scale !== null ? String(s.pain_scale) : '',
      target_muscle: s.target_muscle ?? '',
      treatment_type: s.treatment_type ?? '',
      attendance_status: s.attendance_status ?? 'scheduled',
      case_id: s.case_id ?? '',
    })
    setFormSport(s.athlete?.sport ?? '')
    setError(null)
    setModalOpen(true)
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.slot_date || !form.time_slot) {
      setError('Tarikh dan masa slot wajib diisi.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      slot_date: form.slot_date,
      time_slot: form.time_slot,
      athlete_id: form.athlete_id || null,
      diagnosis: form.diagnosis || null,
      date_of_injury: form.date_of_injury || null,
      referred_by: form.referred_by || null,
      chief_complaint: form.chief_complaint || null,
      injury_type: form.injury_type || null,
      session_type: form.session_type || null,
      assessment_notes: form.assessment_notes || null,
      rehab_plan: form.rehab_plan || null,
      progress_notes: form.progress_notes || null,
      pain_scale: form.pain_scale !== '' ? parseInt(form.pain_scale, 10) : null,
      target_muscle: form.target_muscle || null,
      treatment_type: form.treatment_type || null,
      attendance_status: form.attendance_status || 'scheduled',
      case_id: form.case_id || null,
      physiotherapist_id: profile?.id,
    }

    if (editing) {
      const { error } = await supabase.from('physio_slots').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_physio_slot', 'physio_slots', editing.id)
    } else {
      const { data, error } = await supabase.from('physio_slots').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_physio_slot', 'physio_slots', data.id)
    }

    setSaving(false)
    setModalOpen(false)
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
    setDetailSlot(prev => prev ? { ...prev, attendance_status: 'arrived' } : null)
    fetchAll()
  }

  // Schedule view: weekly slot map [date][time] -> PhysioSlot
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
      <ReadOnlyBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{slots.length} rekod slot</p>
        {canEdit && (
          <button onClick={() => openAdd()} disabled={readOnly} className="bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
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
                              onClick={() => setDetailSlot(booked)}
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
                              onClick={() => openAdd(dateStr, time)}
                              disabled={readOnly}
                              className="w-full h-full min-h-[48px] rounded-lg border border-dashed border-transparent hover:border-[#F56A00] hover:bg-orange-50/40 text-transparent hover:text-[#F56A00] text-[11px] transition flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
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
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => setDetailSlot(s)} className="text-xs text-[#3A7EC8] hover:underline font-medium">Lihat</button>
                          {canEdit && <button onClick={() => openEdit(s)} disabled={readOnly} className="text-xs text-[#F56A00] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Edit</button>}
                          {isAdmin && <button onClick={() => setConfirmDelete(s)} disabled={readOnly} className="text-xs text-[#D44040] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Padam</button>}
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">{editing ? 'Edit Slot Fisioterapi' : 'Rekod Slot Baharu'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-6">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

              {/* SCHEDULING SECTION */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Jadual Slot</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh" required>
                    <input type="date" value={form.slot_date} onChange={e => setField('slot_date', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Masa Slot" required>
                    <select value={form.time_slot} onChange={e => setField('time_slot', e.target.value)} className={inputCls}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sukan">
                    <select value={formSport} onChange={e => { setFormSport(e.target.value); setField('athlete_id', '') }} className={inputCls}>
                      <option value="">— Semua Sukan —</option>
                      {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Atlet" required>
                    <select value={form.athlete_id} onChange={e => setField('athlete_id', e.target.value)} className={inputCls}>
                      <option value="">— Pilih atlet —</option>
                      {modalAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Kes (Opsional)">
                  <select value={form.case_id} onChange={e => setField('case_id', e.target.value)} className={inputCls}>
                    <option value="">— Tanpa kes —</option>
                    {cases.map(c => <option key={c.id} value={c.id}>{c.athlete?.name}{c.injury_type ? ` - ${c.injury_type}` : ''} - {new Date(c.open_date + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: '2-digit' })}</option>)}
                  </select>
                </Field>
              </div>

              {/* ASSESSMENT SECTION */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Saringan Fisioterapi</p>
                <Field label="Diagnosis">
                  <input value={form.diagnosis} onChange={e => setField('diagnosis', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. STRAIN HAMSTRING" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tarikh Kecederaan">
                    <input type="date" value={form.date_of_injury} onChange={e => setField('date_of_injury', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Dirujuk Oleh">
                    <input value={form.referred_by} onChange={e => setField('referred_by', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. DOKTOR" />
                  </Field>
                </div>
                <Field label="Keluhan Utama (COC)">
                  <textarea value={form.chief_complaint} onChange={e => setField('chief_complaint', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="HURAIAN KELUHAN UTAMA..." />
                </Field>
                <Field label="Jenis Kecederaan">
                  <input value={form.injury_type} onChange={e => setField('injury_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. LIGAMEN LUTUT" />
                </Field>
              </div>

              {/* SESSION & NOTES SECTION */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Sesi & Catatan</p>
                <Field label="Jenis Sesi">
                  <select value={form.session_type} onChange={e => setField('session_type', e.target.value as FormState['session_type'])} className={inputCls}>
                    <option value="">— Pilih —</option>
                    <option value="standard">PENILAIAN</option>
                    <option value="manual">SUSULAN</option>
                    <option value="injury">KRISIS</option>
                  </select>
                </Field>
                <Field label="Nota Penilaian">
                  <textarea value={form.assessment_notes} onChange={e => setField('assessment_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="DAPATAN SARINGAN..." />
                </Field>
                <Field label="Pelan Rehabilitasi">
                  <textarea value={form.rehab_plan} onChange={e => setField('rehab_plan', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PELAN RAWATAN & LATIHAN..." />
                </Field>
                <Field label="Nota Kemajuan">
                  <textarea value={form.progress_notes} onChange={e => setField('progress_notes', e.target.value.toUpperCase())} className={`${inputCls} resize-none`} rows={2} placeholder="PERKEMBANGAN SEMASA..." />
                </Field>
              </div>

              {/* TREATMENT & ATTENDANCE SECTION */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Rawatan & Kehadiran</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Skala Kesakitan (0–10)">
                    <input
                      type="number" min={0} max={10}
                      value={form.pain_scale}
                      onChange={e => setField('pain_scale', e.target.value)}
                      className={inputCls}
                      placeholder="0–10"
                    />
                  </Field>
                  <Field label="Status Kehadiran">
                    <select value={form.attendance_status} onChange={e => setField('attendance_status', e.target.value as FormState['attendance_status'])} className={inputCls}>
                      <option value="scheduled">Dijadual</option>
                      <option value="arrived">Hadir</option>
                      <option value="completed">Selesai</option>
                      <option value="no_show">Tidak Hadir</option>
                    </select>
                  </Field>
                </div>
                <Field label="Otot Sasaran">
                  <input value={form.target_muscle} onChange={e => setField('target_muscle', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. HAMSTRING, QUADRICEPS" />
                </Field>
                <Field label="Jenis Rawatan">
                  <input value={form.treatment_type} onChange={e => setField('treatment_type', e.target.value.toUpperCase())} className={inputCls} placeholder="cth. ULTRASOUND, TENS, MANUAL THERAPY" />
                </Field>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving || readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
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
              {/* Assessment Section */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Saringan Fisioterapi</p>
                <div className="space-y-2">
                  {[
                    ['Diagnosis', detailSlot.diagnosis],
                    ['Tarikh Kecederaan', detailSlot.date_of_injury ? new Date(detailSlot.date_of_injury + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : null],
                    ['Dirujuk Oleh', detailSlot.referred_by],
                    ['Jenis Kecederaan', detailSlot.injury_type],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <p className="text-[10px] text-[#888]">{label}</p>
                      <p className="text-sm font-medium text-[#111]">{val ?? '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">Keluhan Utama (COC)</p>
                  <p className="text-sm text-[#444] whitespace-pre-wrap">{detailSlot.chief_complaint || '—'}</p>
                </div>
              </div>

              {/* Session & Notes Section */}
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Sesi & Catatan</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                    <p className="text-[10px] text-[#888] mb-0.5">Jenis Sesi</p>
                    <p className="text-sm font-medium text-[#111]">{detailSlot.session_type ? sessionLabel[detailSlot.session_type] : '—'}</p>
                  </div>
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                    <p className="text-[10px] text-[#888] mb-0.5">Status Kehadiran</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${attendanceStyle[detailSlot.attendance_status ?? 'scheduled']}`}>
                      {attendanceLabel[detailSlot.attendance_status ?? 'scheduled']}
                    </span>
                  </div>
                </div>
                {detailSlot.pain_scale !== null && (
                  <div className="bg-[#F5F5F7] rounded-lg px-4 py-3">
                    <p className="text-[10px] text-[#888] mb-0.5">Skala Kesakitan (VAS)</p>
                    <p className="text-sm font-bold text-[#111]">{detailSlot.pain_scale} / 10</p>
                  </div>
                )}
                {[
                  ['Nota Penilaian', detailSlot.assessment_notes],
                  ['Pelan Rehabilitasi', detailSlot.rehab_plan],
                  ['Nota Kemajuan', detailSlot.progress_notes],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">{label}</p>
                    <p className="text-sm text-[#444] whitespace-pre-wrap">{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              {isAdmin && (
                <button onClick={() => { setConfirmDelete(detailSlot); setDetailSlot(null) }} disabled={readOnly} className="px-4 py-2 text-sm text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition">Padam</button>
              )}
              {canEdit && detailSlot.attendance_status === 'scheduled' && (
                <button
                  onClick={() => handleMarkArrived(detailSlot)}
                  disabled={readOnly}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#3A7EC8] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition"
                >
                  Tandai Hadir
                </button>
              )}
              {canEdit && (
                <button onClick={() => { openEdit(detailSlot); setDetailSlot(null) }} disabled={readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">Edit</button>
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
              <button onClick={() => handleDelete(confirmDelete)} disabled={readOnly} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">Padam</button>
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
