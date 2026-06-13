import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
import { useSports } from '../../../hooks/useSports'
import { logAction } from '../../../lib/audit'
import StructuredProgramBuilder from './StructuredProgramBuilder'
import type { StructuredProgramData } from '../../../types'

interface Athlete { id: string; name: string; ic_number?: string; sport_id: string; sport?: { name: string } }
interface Coach { id: string; full_name: string }

interface SCRecord {
  id: string; athlete_id: string; session_date: string
  attendance: 'present' | 'absent' | 'mc'
  training_program: string | null; notes: string | null
}

interface SCProgram {
  id: string; sport: string; month: number; year: number
  coach_id: string | null
  program_type: 'structured'
  structured_data: StructuredProgramData | null
  start_date: string | null
  end_date: string | null
  coach?: { full_name: string }
}

interface CoachSchedule {
  id: string; coach_id: string; sport: string
  schedule_name: string; valid_from: string
  repeats: boolean; repeat_pattern: 'weekly' | 'bi-weekly' | 'custom' | null
  repeat_until: string | null
  slots?: CoachScheduleSlot[]
}

interface CoachScheduleSlot {
  id: string; schedule_id: string
  slot_date: string; start_time: string; end_time: string
}

interface ScheduleForm {
  coach_id: string; valid_from: string
  repeats: boolean; repeat_pattern: 'weekly' | 'bi-weekly' | 'custom'
  repeat_until: string; sport: string
  selected_days: string[] // For weekly/bi-weekly: ['mon', 'tue', 'wed', etc]
}

interface ScheduleSlotForm {
  slot_date: string; start_time: string; end_time: string
}

interface AttendanceForm {
  athlete_id: string; session_date: string
  attendance: 'present' | 'absent' | 'mc'
  training_program: string; notes: string
}

interface ProgramForm {
  sport: string; month: number; year: number
  program_type: 'structured'
  structured_data: StructuredProgramData
  start_date: string
  end_date: string
}

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
const DAY_NAMES = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad']

const attendanceLabel: Record<string, string> = { present: 'Hadir', absent: 'Tidak Hadir', mc: 'MC' }
const attendanceStyle: Record<string, string> = {
  present: 'bg-green-50 text-[#3A9E6A] border border-green-200',
  absent: 'bg-red-50 text-[#D44040] border border-red-200',
  mc: 'bg-blue-50 text-[#3A7EC8] border border-blue-200',
}

const emptyAttendanceForm: AttendanceForm = {
  athlete_id: '', session_date: new Date().toISOString().slice(0, 10),
  attendance: 'present', training_program: '', notes: '',
}
const emptyStructuredData: StructuredProgramData = { phase: '', training_goals: [''], sessions: [] }

function convert24To12(time24: string): { hour: string; minute: string; ampm: 'AM' | 'PM' } {
  if (!time24) return { hour: '9', minute: '00', ampm: 'AM' }
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return { hour: String(hour12), minute: minutes, ampm }
}

function convert12To24(hour: string, minute: string, ampm: 'AM' | 'PM'): string {
  let h = parseInt(hour)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${minute}`
}

const emptyProgramForm: ProgramForm = {
  sport: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  program_type: 'structured', structured_data: emptyStructuredData, start_date: '', end_date: '',
}

export default function StrengthPage() {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { sports } = useSports()
  const [searchParams] = useSearchParams()
  const athleteIdParam = searchParams.get('athlete')
  const tabParam = searchParams.get('tab') as 'kehadiran' | 'program' | 'jadual' | null

  // Ensure component re-renders when sports data arrives
  useEffect(() => {
    // This effect ensures the component subscribes to sports state changes
  }, [sports])

  const [activeTab, setActiveTab] = useState<'kehadiran' | 'program' | 'jadual'>('jadual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])

  // Tab 1 — Kehadiran
  const [records, setRecords] = useState<SCRecord[]>([])
  const [filterSport, setFilterSport] = useState('')
  const [search, setSearch] = useState('')
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SCRecord | null>(null)
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendanceForm)
  const [modalFilterSport, setModalFilterSport] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<SCRecord | null>(null)

  // Tab 2 — Program Bulanan
  const [programs, setPrograms] = useState<SCProgram[]>([])
  const [filterProgramSport, setFilterProgramSport] = useState('')
  const [filterProgramYear, setFilterProgramYear] = useState(String(new Date().getFullYear()))
  const [programModalOpen, setProgramModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<SCProgram | null>(null)
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgramForm)
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState<SCProgram | null>(null)
  const [viewProgram, setViewProgram] = useState<SCProgram | null>(null)

  // Tab 3 — Jadual Jurulatih (Coach Schedules)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.getFullYear(), today.getMonth(), diff)
  })
  const [schedules, setSchedules] = useState<CoachSchedule[]>([])
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<CoachSchedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    coach_id: '', valid_from: new Date().toISOString().slice(0, 10),
    repeats: false, repeat_pattern: 'weekly', repeat_until: '', sport: '', selected_days: [],
  })
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlotForm[]>([
    { slot_date: new Date().toISOString().slice(0, 10), start_time: '09:00', end_time: '11:00' },
  ])
  const [confirmDeleteSchedule, setConfirmDeleteSchedule] = useState<CoachSchedule | null>(null)
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<{ schedule: CoachSchedule; slot: CoachScheduleSlot } | null>(null)
  const [deletingAttendance, setDeletingAttendance] = useState(false)
  const [deletingProgram, setDeletingProgram] = useState(false)
  const [deletingSchedule, setDeletingSchedule] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ dateStr: string; startTime: string; endTime: string; slots: Array<{ schedule: CoachSchedule; slot: CoachScheduleSlot }> } | null>(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (athleteIdParam) {
      setExpandedAthleteId(athleteIdParam)
    }
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [athleteIdParam, tabParam])

  async function fetchAll() {
    setLoading(true)
    const [recRes, athRes, progRes, schedRes, coachRes] = await Promise.all([
      supabase.from('strength_conditioning').select('id, athlete_id, session_date, attendance, training_program, notes'),
      supabase.from('athletes').select('id, name, ic_number, sport_id, sport:sport_id(name)').order('name'),
      supabase.from('sc_programs').select('id, sport, month, year, program_type, coach_id, structured_data, start_date, end_date, coach:profiles(full_name)').order('year', { ascending: false }).order('month'),
      supabase.from('coach_schedules').select('id, coach_id, sport, schedule_name, valid_from, repeats, repeat_pattern, repeat_until, slots:coach_schedule_slots(id, schedule_id, slot_date, start_time, end_time)').order('valid_from', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
    ]) as any
    setRecords(recRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setPrograms(progRes.data ?? [])
    setSchedules(schedRes.data ?? [])
    setCoaches(coachRes.data ?? [])
    setLoading(false)
  }

  const allSports = sports.map(s => s.name)

  // --- ATTENDANCE ---
  function openAddAttendance() {
    setEditingRecord(null); setAttendanceForm(emptyAttendanceForm); setModalFilterSport(''); setError(null); setAttendanceModalOpen(true)
  }
  function openEditAttendance(rec: SCRecord) {
    setEditingRecord(rec)
    setAttendanceForm({ athlete_id: rec.athlete_id, session_date: rec.session_date, attendance: rec.attendance, training_program: rec.training_program ?? '', notes: rec.notes ?? '' })
    setError(null); setAttendanceModalOpen(true)
  }
  async function handleSaveAttendance() {
    if (!attendanceForm.athlete_id || !attendanceForm.session_date) { setError('Atlet dan tarikh sesi wajib dipilih.'); return }
    setSaving(true); setError(null)
    const payload = { athlete_id: attendanceForm.athlete_id, session_date: attendanceForm.session_date, attendance: attendanceForm.attendance, training_program: attendanceForm.training_program || null, notes: attendanceForm.notes || null, recorded_by: profile?.id }
    if (editingRecord) {
      const { error } = await supabase.from('strength_conditioning').update(payload).eq('id', editingRecord.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_sc_session', 'strength_conditioning', editingRecord.id)
    } else {
      const { data, error } = await supabase.from('strength_conditioning').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_sc_session', 'strength_conditioning', data.id)
    }
    setSaving(false); setAttendanceModalOpen(false); fetchAll()
  }
  async function handleDeleteAttendance(rec: SCRecord) {
    try {
      setDeletingAttendance(true)
      await supabase.from('strength_conditioning').delete().eq('id', rec.id)
      setConfirmDelete(null); await fetchAll()
    } finally {
      setDeletingAttendance(false)
    }
  }

  // --- PROGRAM ---
  function openAddProgram() {
    setEditingProgram(null)
    setProgramForm(emptyProgramForm)
    setError(null); setProgramModalOpen(true)
  }
  function openEditProgram(p: SCProgram) {
    setEditingProgram(p)
    setProgramForm({
      sport: p.sport, month: p.month, year: p.year,
      program_type: 'structured',
      structured_data: p.structured_data ?? { phase: '', training_goals: [''], sessions: [] },
      start_date: p.start_date ?? '', end_date: p.end_date ?? '',
    })
    setError(null); setProgramModalOpen(true)
  }
  async function handleSaveProgram() {
    if (!programForm.sport) { setError('Sukan wajib dipilih.'); return }
    if (programForm.structured_data.sessions.length === 0) { setError('Sila tambah sekurang-kurangnya satu sesi mingguan.'); return }
    setSaving(true); setError(null)
    const payload = {
      sport: programForm.sport, month: programForm.month, year: programForm.year,
      program_type: 'structured',
      structured_data: programForm.structured_data,
      start_date: programForm.start_date || null, end_date: programForm.end_date || null,
      coach_id: profile?.id ?? null,
    }
    if (editingProgram) {
      const { error } = await supabase.from('sc_programs').update(payload).eq('id', editingProgram.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_sc_program', 'sc_programs', editingProgram.id)
    } else {
      const { data, error } = await supabase.from('sc_programs').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_sc_program', 'sc_programs', data.id)
    }
    setSaving(false); setProgramModalOpen(false); fetchAll()
  }
  async function handleDeleteProgram(p: SCProgram) {
    try {
      setDeletingProgram(true)
      await supabase.from('sc_programs').delete().eq('id', p.id)
      setConfirmDeleteProgram(null); await fetchAll()
    } finally {
      setDeletingProgram(false)
    }
  }

  // --- SCHEDULE SLOTS ---
  function addScheduleSlot() {
    const today = new Date().toISOString().slice(0, 10)
    setScheduleSlots([...scheduleSlots, { slot_date: today, start_time: '09:00', end_time: '11:00' }])
  }
  function removeScheduleSlot(index: number) {
    setScheduleSlots(scheduleSlots.filter((_, i) => i !== index))
  }
  function updateScheduleSlot(index: number, field: 'slot_date' | 'start_time' | 'end_time', value: any) {
    const updated = [...scheduleSlots]
    updated[index] = { ...updated[index], [field]: value }
    setScheduleSlots(updated)
  }

  // --- SCHEDULE ---
  function expandRecurringSlots(
    slots: ScheduleSlotForm[],
    repeats: boolean,
    repeatPattern: 'weekly' | 'bi-weekly' | 'custom' | null,
    repeatUntil: string,
    selectedDays?: string[]
  ): ScheduleSlotForm[] {
    if (!repeats || !repeatPattern || slots.length === 0) {
      return slots
    }

    // Custom pattern: just return slots as-is (no auto-expansion)
    if (repeatPattern === 'custom') {
      return slots
    }

    const expanded: ScheduleSlotForm[] = []
    const increment = repeatPattern === 'weekly' ? 7 : 14

    for (const slot of slots) {
      let currentDate = new Date(slot.slot_date)
      const untilDate = new Date(repeatUntil)
      const startDate = new Date(slot.slot_date)

      // Iterate through each week/bi-week period
      while (currentDate <= untilDate) {
        // For each selected day, add a slot at that day in this cycle
        if (selectedDays && selectedDays.length > 0) {
          for (const dayKey of selectedDays) {
            const dayNum = dayKey === 'mon' ? 1 : dayKey === 'tue' ? 2 : dayKey === 'wed' ? 3 : dayKey === 'thu' ? 4 : dayKey === 'fri' ? 5 : dayKey === 'sat' ? 6 : 0
            const daysFromStart = dayNum - startDate.getDay()
            let targetDate = new Date(currentDate)
            targetDate.setDate(targetDate.getDate() + daysFromStart + (daysFromStart < 0 ? 7 : 0))

            if (targetDate <= untilDate) {
              expanded.push({
                slot_date: targetDate.toISOString().split('T')[0],
                start_time: slot.start_time,
                end_time: slot.end_time,
              })
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + increment)
      }
    }

    // Sort by date to ensure chronological order
    expanded.sort((a, b) => a.slot_date.localeCompare(b.slot_date))
    return expanded
  }

  function openAddSchedule() {
    setEditingSchedule(null)
    const today = new Date().toISOString().slice(0, 10)
    setScheduleForm({ coach_id: '', valid_from: today, repeats: true, repeat_pattern: 'weekly', repeat_until: '', sport: '', selected_days: [] })
    setScheduleSlots([{ slot_date: today, start_time: '09:00', end_time: '11:00' }])
    setError(null)
    setScheduleModalOpen(true)
  }
async function handleSaveSchedule() {
    if (!scheduleForm.coach_id || !scheduleForm.valid_from || !scheduleForm.sport) {
      setError('Jurulatih, tarikh mula, dan sukan wajib dipilih.')
      return
    }
    if (scheduleSlots.length === 0) { setError('Sila tambah sekurang-kurangnya satu slot hari/masa.'); return }
    if (scheduleForm.repeats && !scheduleForm.repeat_until) { setError('Sila tentukan tarikh akhir untuk jadual berulang.'); return }
    setSaving(true); setError(null)

    const coach = coaches.find(c => c.id === scheduleForm.coach_id)
    const scheduleName = coach ? coach.full_name : scheduleForm.sport

    const payload = {
      coach_id: scheduleForm.coach_id,
      sport: scheduleForm.sport,
      schedule_name: scheduleName,
      valid_from: scheduleForm.valid_from,
      repeats: scheduleForm.repeats,
      repeat_pattern: scheduleForm.repeats ? scheduleForm.repeat_pattern : null,
      repeat_until: scheduleForm.repeats ? scheduleForm.repeat_until : null,
    }

    const finalSlots = expandRecurringSlots(
      scheduleSlots,
      scheduleForm.repeats,
      scheduleForm.repeats ? scheduleForm.repeat_pattern : null,
      scheduleForm.repeat_until,
      scheduleForm.selected_days
    )

    try {
      if (editingSchedule) {
        const { error } = await supabase.from('coach_schedules').update(payload).eq('id', editingSchedule.id)
        if (error) throw new Error(`Update failed: ${error.message}`)

        await supabase.from('coach_schedule_slots').delete().eq('schedule_id', editingSchedule.id)

        const slotsPayload = finalSlots.map(slot => ({
          schedule_id: editingSchedule.id,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))
        const { error: slotsError } = await supabase.from('coach_schedule_slots').insert(slotsPayload)
        if (slotsError) throw new Error(`Insert slots failed: ${slotsError.message}`)

        await logAction(profile!.id, 'update_coach_schedule', 'coach_schedules', editingSchedule.id)
        setSaving(false); setScheduleModalOpen(false); fetchAll()
      } else {
        const { data: schedule, error: schedError } = await supabase
          .from('coach_schedules')
          .insert([payload])
          .select('id')

        if (schedError) throw new Error(`Insert schedule failed: ${schedError.message}`)
        if (!schedule || schedule.length === 0) throw new Error('No schedule returned from insert')

        const scheduleId = schedule[0].id
        const slotsPayload = finalSlots.map(slot => ({
          schedule_id: scheduleId,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))

        const { error: slotsError } = await supabase.from('coach_schedule_slots').insert(slotsPayload)
        if (slotsError) throw new Error(`Insert slots failed: ${slotsError.message}`)

        await logAction(profile!.id, 'create_coach_schedule', 'coach_schedules', scheduleId)
        setSaving(false); setScheduleModalOpen(false); fetchAll()
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(`Error: ${errorMsg}`)
      setSaving(false)
    }
  }
  async function handleDeleteSchedule(s: CoachSchedule) {
    try {
      setDeletingSchedule(true)
      await supabase.from('coach_schedules').delete().eq('id', s.id)
      await logAction(profile!.id, 'delete_coach_schedule', 'coach_schedules', s.id)
      setConfirmDeleteSchedule(null)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting schedule')
    } finally {
      setDeletingSchedule(false)
    }
  }

  async function handleDeleteSlot(_schedule: CoachSchedule, slot: CoachScheduleSlot) {
    try {
      setSaving(true)
      setDeletingSlot(true)
      setError(null)
      const { error: deleteError } = await supabase.from('coach_schedule_slots').delete().eq('id', slot.id)
      if (deleteError) {
        console.error('Supabase delete error:', deleteError)
        setError(`Failed to delete: ${deleteError.message}`)
        setSaving(false)
        setDeletingSlot(false)
        return
      }
      await logAction(profile!.id, 'delete_coach_schedule_slot', 'coach_schedule_slots', slot.id)
      setSaving(false)
      setDeletingSlot(false)
      setConfirmDeleteSlot(null)
      await fetchAll()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Error deleting slot')
      setSaving(false)
    }
  }

  async function handleDeleteScheduleFromModal(schedule: CoachSchedule) {
    try {
      await handleDeleteSchedule(schedule)
      setConfirmDeleteSlot(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting schedule')
    }
  }

  // --- DERIVED ---
  const recordsByAthlete = useMemo(() => {
    const m = new Map<string, SCRecord[]>()
    athletes.forEach(a => m.set(a.id, []))
    records.forEach(r => { const list = m.get(r.athlete_id); if (list) list.push(r) })
    m.forEach(list => list.sort((a, b) => b.session_date.localeCompare(a.session_date)))
    return m
  }, [athletes, records])

  const filteredAthletes = useMemo(() => {
    const q = search.toLowerCase()
    return athletes.filter(a => {
      if (filterSport && a.sport?.name !== filterSport) return false
      if (search && !a.name.toLowerCase().includes(q) && !a.ic_number?.toLowerCase().includes(q) && !a.sport?.name?.toLowerCase().includes(q)) return false
      return true
    })
  }, [athletes, filterSport, search])

  const filteredAthleteIds = useMemo(() => new Set(filteredAthletes.map(a => a.id)), [filteredAthletes])

  const visiblePrograms = programs.filter(p =>
    (!filterProgramSport || p.sport === filterProgramSport) &&
    (!filterProgramYear || p.year === +filterProgramYear)
  )

  const programYears = [...new Set(programs.map(p => p.year))].sort((a, b) => b - a)
  const summary = useMemo(() => {
    const vis = records.filter(r => filteredAthleteIds.has(r.athlete_id))
    return {
      present: vis.filter(r => r.attendance === 'present').length,
      absent: vis.filter(r => r.attendance === 'absent').length,
      mc: vis.filter(r => r.attendance === 'mc').length,
    }
  }, [records, filteredAthleteIds])

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'jadual', label: 'Jadual Jurulatih' },
          { key: 'program', label: 'Program Bulanan' },
          { key: 'kehadiran', label: 'Kehadiran' },
        ] as const).map((tab: { key: 'kehadiran' | 'program' | 'jadual'; label: string }) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === tab.key ? 'bg-white text-[#F56A00] shadow-sm' : 'text-[#888] hover:text-[#444]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: KEHADIRAN ── */}
      {activeTab === 'kehadiran' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#888]">{records.length} rekod sesi · {athletes.length} atlet</p>
            {can('strength', 'create') && (
              <button onClick={openAddAttendance} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + Rekod Sesi
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Hadir', value: summary.present, color: 'text-[#3A9E6A]' },
              { label: 'Tidak Hadir', value: summary.absent, color: 'text-[#D44040]' },
              { label: 'MC', value: summary.mc, color: 'text-[#3A7EC8]' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Cari nama, No. IC atau sukan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-[#111] outline-none transition focus:border-[#F56A00]"
            />
            <select
              value={filterSport}
              onChange={e => setFilterSport(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00] min-w-[180px]"
            >
              <option value="">Semua Sukan</option>
              {allSports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
            ) : filteredAthletes.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">Tiada atlet sepadan penapis.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Atlet', 'Sukan', 'Sesi Terkini', 'Jumlah Sesi', 'Hadir', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAthletes.map(a => {
                    const athRecords = recordsByAthlete.get(a.id) ?? []
                    const latestRecord = athRecords[0]
                    const presentCount = athRecords.filter(r => r.attendance === 'present').length
                    const isExpanded = expandedAthleteId === a.id
                    return (
                      <>
                        <tr
                          key={a.id}
                          onClick={() => setExpandedAthleteId(id => id === a.id ? null : a.id)}
                          className={`border-b border-gray-50 cursor-pointer transition hover:bg-gray-50 ${isExpanded ? 'bg-orange-50' : ''}`}
                        >
                          <td className="px-4 py-3 font-medium text-[#111]">{a.name}</td>
                          <td className="px-4 py-3 text-[#888]">{a.sport?.name ?? '—'}</td>
                          <td className="px-4 py-3 font-mono text-[12px] text-[#888]">
                            {latestRecord ? new Date(latestRecord.session_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-[#111] font-mono">{athRecords.length}</span>
                            {athRecords.length > 0 && <span className="text-[#888] text-[11px] ml-1">sesi</span>}
                          </td>
                          <td className="px-4 py-3">
                            {athRecords.length > 0 ? (
                              <span className="text-[#3A9E6A] font-semibold">{presentCount}/{athRecords.length}</span>
                            ) : <span className="text-[#bbb]">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <svg className={`w-4 h-4 text-[#888] transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`exp-${a.id}`} className="bg-orange-50">
                            <td colSpan={6} className="px-0 py-0">
                              {athRecords.length === 0 ? (
                                <div className="px-8 py-6 text-center text-[#888] text-sm">Tiada rekod sesi untuk atlet ini.</div>
                              ) : (
                                <table className="w-full text-sm border-t-2 border-[#F56A00]/20">
                                  <thead>
                                    <tr className="bg-[rgba(245,106,0,0.06)]">
                                      {['Tarikh', 'Kehadiran', 'Program Latihan', 'Nota', ''].map(h => (
                                        <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-2">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {athRecords.map(r => (
                                      <tr key={r.id} className="border-t border-[rgba(245,106,0,0.1)] hover:bg-[rgba(245,106,0,0.04)]">
                                        <td className="px-4 py-2.5 font-mono text-[12px] text-[#444] whitespace-nowrap">
                                          {new Date(r.session_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${attendanceStyle[r.attendance]}`}>
                                            {attendanceLabel[r.attendance]}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-[#444] max-w-[180px] truncate">{r.training_program ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-[#888] max-w-[180px] truncate">{r.notes ?? '—'}</td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex gap-3 justify-end">
                                            {can('strength', 'update') && <button onClick={e => { e.stopPropagation(); openEditAttendance(r) }} className="text-xs text-[#F56A00] hover:underline font-medium">Edit</button>}
                                            {can('strength', 'delete') && <button onClick={e => { e.stopPropagation(); setConfirmDelete(r) }} className="text-xs text-[#D44040] hover:underline font-medium">Padam</button>}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: PROGRAM BULANAN ── */}
      {activeTab === 'program' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#888]">{visiblePrograms.length} program</p>
            {can('strength', 'create') && (
              <button onClick={openAddProgram} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + Program Baharu
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={filterProgramSport} onChange={e => setFilterProgramSport(e.target.value)} className={filterCls}>
              <option value="">Semua Sukan</option>
              {allSports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterProgramYear} onChange={e => setFilterProgramYear(e.target.value)} className={filterCls}>
              {(programYears.length > 0 ? programYears : [new Date().getFullYear()]).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {filterProgramSport && (
              <button onClick={() => setFilterProgramSport('')} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
                Kosongkan Penapis
              </button>
            )}
          </div>

          {/* 12-month grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MONTHS.map((monthName, idx) => {
              const month = idx + 1
              const monthPrograms = visiblePrograms.filter(p => p.month === month)
              return (
                <div key={month} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">
                    {monthName} {filterProgramYear || new Date().getFullYear()}
                  </p>
                  {monthPrograms.length === 0 ? (
                    <p className="text-[12px] text-[#bbb] italic">Tiada program</p>
                  ) : (
                    <div className="space-y-3">
                      {monthPrograms.map(p => (
                        <div key={p.id} className="group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[11px] font-semibold text-[#F56A00]">{p.sport}</p>
                                {p.program_type === 'structured' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(245,106,0,0.1)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]">MINGGUAN</span>
                                )}
                              </div>
                              {p.structured_data && (
                                <>
                                  {p.structured_data.phase && <p className="text-[11px] font-medium text-[#444]">{p.structured_data.phase}</p>}
                                  {(p.start_date || p.end_date) && (
                                    <p className="text-[11px] text-[#888] mt-0.5">
                                      {p.start_date ? fmtProgramDate(p.start_date) : '—'} → {p.end_date ? fmtProgramDate(p.end_date) : '—'}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-[#888] mt-0.5">{p.structured_data.sessions.length} sesi</p>
                                </>
                              )}
                              {p.coach?.full_name && (
                                <p className="text-[10px] text-[#aaa] mt-1">{p.coach.full_name}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition items-end">
                              <button onClick={() => setViewProgram(p)} className="text-xs text-[#3A7EC8] hover:underline font-medium">Lihat</button>
                              {can('strength', 'update') && <button onClick={() => openEditProgram(p)} className="text-xs text-[#F56A00] hover:underline">Edit</button>}
                              {can('strength', 'delete') && <button onClick={() => setConfirmDeleteProgram(p)} className="text-xs text-[#D44040] hover:underline">Padam</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── TAB 3: JADUAL JURULATIH (WEEKLY VIEW) ── */}
      {activeTab === 'jadual' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekStartDate(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() - 7))}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#F56A00] text-[#888] hover:text-[#F56A00] transition text-sm leading-none"
              >‹</button>
              <p className="text-sm font-semibold text-[#111] w-56 text-center">
                Minggu {weekStartDate.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })} hingga {new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <button
                onClick={() => setWeekStartDate(new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 7))}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#F56A00] text-[#888] hover:text-[#F56A00] transition text-sm leading-none"
              >›</button>
            </div>
            {can('strength', 'create') && (
              <button onClick={openAddSchedule} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + Jadual Baharu
              </button>
            )}
          </div>

          {/* Weekly Grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              {/* Header: Days of week */}
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] w-16 border-r border-gray-100">MASA</th>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(weekStartDate)
                    date.setDate(date.getDate() + i)
                    const dayOfWeek = (date.getDay() + 6) % 7
                    return (
                      <th key={i} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#111] border-r border-gray-100 last:border-0">
                        <div>{DAY_NAMES[dayOfWeek]}</div>
                        <div className="text-[11px] font-normal text-[#888]">{date.getDate()}/{date.getMonth() + 1}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Time slots: 08:00 - 18:00 */}
              <tbody>
                {Array.from({ length: 11 }).map((_, hourIdx) => {
                  const hour = 8 + hourIdx
                  const timeStr = `${String(hour).padStart(2, '0')}:00`

                  return (
                    <tr key={hour} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      {/* Time label */}
                      <td className="px-3 py-3 text-[11px] font-semibold text-[#888] border-r border-gray-100 bg-gray-50/50" style={{ height: '60px' }}>
                        {timeStr}
                      </td>

                      {/* Days */}
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const date = new Date(weekStartDate)
                        date.setDate(date.getDate() + dayIdx)
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

                        // Find ALL slots for this date
                        const slotsForDate = schedules.flatMap(s =>
                          (s.slots ?? [])
                            .filter(sl => sl.slot_date === dateStr)
                            .map(sl => ({ schedule: s, slot: sl }))
                        )

                        // Filter to only slots that include this hour
                        const slotsInHour = slotsForDate.filter(({ slot }) => {
                          const [startHour] = slot.start_time.split(':').map(Number)
                          const [endHour] = slot.end_time.split(':').map(Number)
                          return startHour <= hour && endHour > hour
                        })

                        // Group slots by time
                        const slotsByTime: { [key: string]: typeof slotsInHour } = {}
                        slotsInHour.forEach(item => {
                          const key = `${item.slot.start_time}-${item.slot.end_time}`
                          if (!slotsByTime[key]) slotsByTime[key] = []
                          slotsByTime[key].push(item)
                        })

                        return (
                          <td
                            key={dayIdx}
                            style={{ height: '60px', padding: '4px 0', position: 'relative' }}
                            className="border-r border-gray-100 last:border-0"
                          >
                            {Object.entries(slotsByTime).map(([timeKey, slots], timeSlotIndex) => {
                              const [startTime, endTime] = timeKey.split('-')
                              const [startHour] = startTime.split(':').map(Number)
                              const [endHour] = endTime.split(':').map(Number)
                              const slotHeight = (endHour - startHour) * 60
                              const topOffset = startHour === hour ? 0 : -(hour - startHour) * 60
                              const hasMultiple = slots.length > 1
                              const opacityValue = Math.max(0.4, 1 - timeSlotIndex * 0.25)

                              return (
                                <div
                                  key={timeKey}
                                  onClick={() => hasMultiple && setSelectedTimeSlot({ dateStr, startTime, endTime, slots })}
                                  style={{
                                    position: 'absolute',
                                    top: `${topOffset}px`,
                                    left: '4px',
                                    right: '4px',
                                    height: `${slotHeight}px`,
                                    zIndex: 10,
                                    opacity: opacityValue
                                  }}
                                  className={`border border-[rgba(245,106,0,0.3)] rounded px-1.5 py-0.5 text-[11px] transition overflow-hidden ${hasMultiple ? 'bg-[#F56A00] text-white cursor-pointer hover:bg-[#D45A00]' : 'bg-[rgba(245,106,0,0.1)] cursor-pointer hover:bg-[rgba(245,106,0,0.15)] group'}`}
                                >
                                  {hasMultiple ? (
                                    <div className="flex items-center justify-center h-full">
                                      <span className="font-bold text-base">{slots.length} slots</span>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="font-semibold text-[#F56A00] truncate leading-tight text-xs">{slots[0].schedule.schedule_name}</p>
                                      <p className="text-[10px] text-[#666] leading-tight">{slots[0].schedule.sport}</p>
                                      <p className="text-[9px] text-[#888] font-mono leading-tight">{startTime}–{endTime}</p>
                                      <div className="hidden group-hover:flex gap-1 mt-0.5 pt-0.5 border-t border-[rgba(245,106,0,0.2)]">
                                        {can('strength', 'delete') && (
                                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSlot({ schedule: slots[0].schedule, slot: slots[0].slot }) }} className="flex-1 px-1 py-0.5 text-[8px] font-semibold text-[#D44040] hover:underline">Padam</button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODAL: TIME SLOT DETAILS ── */}
      {selectedTimeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Jadual pada {selectedTimeSlot.startTime}–{selectedTimeSlot.endTime}</h3>
              <button onClick={() => setSelectedTimeSlot(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedTimeSlot.slots.map(({ schedule: s, slot }, idx) => (
                <div key={idx} className="p-3 bg-[rgba(245,106,0,0.05)] border border-[rgba(245,106,0,0.2)] rounded-lg">
                  <p className="font-semibold text-[#F56A00]">{s.schedule_name}</p>
                  <p className="text-sm text-[#666] mt-1">{s.sport}</p>
                  <p className="text-[12px] text-[#888] font-mono mt-1">{slot.start_time}–{slot.end_time}</p>
                  {can('strength', 'delete') && (
                    <button
                      onClick={() => { setConfirmDeleteSlot({ schedule: s, slot }); setSelectedTimeSlot(null) }}
                      className="mt-2 w-full px-3 py-1.5 text-xs font-semibold text-[#D44040] hover:bg-red-50 rounded transition"
                    >
                      Padam
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ATTENDANCE ── */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editingRecord ? 'Edit Rekod Sesi' : 'Rekod Sesi Baharu'}</h3>
              <button onClick={() => setAttendanceModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <Field label="Sukan">
                <select value={modalFilterSport} onChange={e => { setModalFilterSport(e.target.value); setAttendanceForm(f => ({ ...f, athlete_id: '' })) }} className={inputCls}>
                  <option value="">Semua Sukan</option>
                  {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Atlet" required>
                <select value={attendanceForm.athlete_id} onChange={e => setAttendanceForm(f => ({ ...f, athlete_id: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih atlet —</option>
                  {(modalFilterSport ? athletes.filter(a => a.sport?.name === modalFilterSport) : athletes).map(a => <option key={a.id} value={a.id}>{a.name} ({a.sport?.name})</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tarikh Sesi" required>
                  <input type="date" value={attendanceForm.session_date} onChange={e => setAttendanceForm(f => ({ ...f, session_date: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Kehadiran" required>
                  <select value={attendanceForm.attendance} onChange={e => setAttendanceForm(f => ({ ...f, attendance: e.target.value as AttendanceForm['attendance'] }))} className={inputCls}>
                    <option value="present">Hadir</option>
                    <option value="absent">Tidak Hadir</option>
                    <option value="mc">MC</option>
                  </select>
                </Field>
              </div>
              <Field label="Program Latihan">
                <input value={attendanceForm.training_program} onChange={e => setAttendanceForm(f => ({ ...f, training_program: e.target.value.toUpperCase() }))} className={inputCls} placeholder="cth. FASA KEKUATAN 1" />
              </Field>
              <Field label="Nota">
                <textarea value={attendanceForm.notes} onChange={e => setAttendanceForm(f => ({ ...f, notes: e.target.value.toUpperCase() }))} className={`${inputCls} resize-none`} rows={3} placeholder="CATATAN TAMBAHAN..." />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setAttendanceModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveAttendance} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PROGRAM ── */}
      {programModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full flex flex-col max-h-[90vh] ${programForm.program_type === 'structured' ? 'max-w-4xl' : 'max-w-lg'}`}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">{editingProgram ? 'Edit Program' : 'Program Baharu'}</h3>
              <button onClick={() => setProgramModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Sukan" required>
                  <select value={programForm.sport} onChange={e => setProgramForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                    <option value="">— Pilih —</option>
                    {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Bulan" required>
                  <select value={programForm.month} onChange={e => {
                    const month = +e.target.value
                    const { start, end } = getMonthDateRange(month, programForm.year)
                    setProgramForm(f => ({ ...f, month, start_date: start, end_date: end }))
                  }} className={inputCls}>
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Tahun" required>
                  <input type="number" value={programForm.year} onChange={e => {
                    const year = +e.target.value
                    const { start, end } = getMonthDateRange(programForm.month, year)
                    setProgramForm(f => ({ ...f, year, start_date: start, end_date: end }))
                  }} className={inputCls} placeholder="2026" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tarikh Mula">
                  <input type="date" value={programForm.start_date} onChange={e => {
                    const start = e.target.value
                    setProgramForm(f => {
                      const end = f.end_date && start > f.end_date ? start : f.end_date
                      return { ...f, start_date: start, end_date: end }
                    })
                  }} className={inputCls} />
                </Field>
                <Field label="Tarikh Tamat">
                  <input type="date" value={programForm.end_date} onChange={e => setProgramForm(f => ({ ...f, end_date: e.target.value }))} min={programForm.start_date} className={inputCls} />
                </Field>
              </div>
              <StructuredProgramBuilder
                value={programForm.structured_data}
                onChange={sd => setProgramForm(f => ({ ...f, structured_data: sd }))}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setProgramModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveProgram} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SCHEDULE ── */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-[#111]">{editingSchedule ? 'Edit Jadual' : 'Jadual Baharu'}</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

              {/* Top Section: Jurulatih & Sukan */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Jurulatih" required>
                      <select value={scheduleForm.coach_id} onChange={e => setScheduleForm(f => ({ ...f, coach_id: e.target.value }))} className={inputCls}>
                        <option value="">— Pilih Jurulatih —</option>
                        {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                    </Field>
                    <Field label="Sukan" required>
                      <select value={scheduleForm.sport} onChange={e => setScheduleForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                        <option value="">— Pilih —</option>
                        {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>

                  {/* Pattern Selection (Always shown) */}
                  <Field label="Corak Pengulangan" required>
                    <div className="flex gap-2">
                      {(['weekly', 'bi-weekly', 'custom'] as const).map(pattern => (
                        <label key={pattern} className={`flex-1 px-3 py-2.5 rounded-lg border text-[12px] font-semibold cursor-pointer transition text-center ${scheduleForm.repeat_pattern === pattern ? 'bg-[#F56A00] border-[#F56A00] text-white' : 'bg-white border-[#E8E8E8] text-[#888] hover:border-[#D0D0D0]'}`}>
                          <input type="radio" name="pattern" value={pattern} checked={scheduleForm.repeat_pattern === pattern} onChange={() => setScheduleForm(f => ({ ...f, repeat_pattern: pattern, selected_days: [] }))} className="hidden" />
                          {pattern === 'weekly' ? 'Mingguan' : pattern === 'bi-weekly' ? 'Dua Mingguan' : 'Tersuai'}
                        </label>
                      ))}
                    </div>
                  </Field>

                  {/* Conditional Fields Based on Pattern */}
                  {scheduleForm.repeat_pattern === 'weekly' || scheduleForm.repeat_pattern === 'bi-weekly' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Tarikh Mula" required>
                          <input type="date" value={scheduleForm.valid_from} onChange={e => setScheduleForm(f => ({ ...f, valid_from: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Tarikh Akhir" required>
                          <input type="date" value={scheduleForm.repeat_until} onChange={e => setScheduleForm(f => ({ ...f, repeat_until: e.target.value }))} className={inputCls} />
                        </Field>
                      </div>

                      <Field label="Waktu" required>
                        {scheduleSlots[0] && (
                          <div className="flex gap-2">
                            <input
                              type="time"
                              value={scheduleSlots[0].start_time}
                              onChange={e => setScheduleSlots(s => [{ ...s[0], start_time: e.target.value }, ...s.slice(1)])}
                              className={inputCls}
                            />
                            <span className="text-center py-2 text-[#888]">hingga</span>
                            <input
                              type="time"
                              value={scheduleSlots[0].end_time}
                              onChange={e => setScheduleSlots(s => [{ ...s[0], end_time: e.target.value }, ...s.slice(1)])}
                              className={inputCls}
                            />
                          </div>
                        )}
                      </Field>

                      <Field label={`Hari Penulangan (${scheduleForm.repeat_pattern === 'weekly' ? 'Mingguan' : 'Dua Mingguan'})`} required>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { key: 'mon', name: 'Isnin' },
                            { key: 'tue', name: 'Selasa' },
                            { key: 'wed', name: 'Rabu' },
                            { key: 'thu', name: 'Khamis' },
                            { key: 'fri', name: 'Jumaat' },
                            { key: 'sat', name: 'Sabtu' },
                            { key: 'sun', name: 'Ahad' }
                          ].map(day => (
                            <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={scheduleForm.selected_days.includes(day.key)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setScheduleForm(f => ({ ...f, selected_days: [...f.selected_days, day.key] }))
                                  } else {
                                    setScheduleForm(f => ({ ...f, selected_days: f.selected_days.filter(d => d !== day.key) }))
                                  }
                                }}
                                className="w-4 h-4 rounded border-[#E8E8E8] cursor-pointer accent-[#F56A00]"
                              />
                              <span className="text-[12px] font-medium text-[#111]">
                                {day.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </Field>
                    </>
                  ) : scheduleForm.repeat_pattern === 'custom' ? (
                    <>
                      <Field label="Slot Tarikh/Masa">
                        <div className="space-y-4">
                          {scheduleSlots.map((slot, idx) => (
                            <div key={idx} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Tarikh</label>
                                <input type="date" value={slot.slot_date} onChange={e => updateScheduleSlot(idx, 'slot_date', e.target.value)} className="w-full bg-white border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none focus:border-[#F56A00]" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Masa Mula</label>
                                  <TimeInput12h value={slot.start_time} onChange={t => updateScheduleSlot(idx, 'start_time', t)} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Masa Akhir</label>
                                  <TimeInput12h value={slot.end_time} onChange={t => updateScheduleSlot(idx, 'end_time', t)} />
                                </div>
                              </div>
                              {scheduleSlots.length > 1 && (
                                <button type="button" onClick={() => removeScheduleSlot(idx)} className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium">
                                  ✕ Buang Slot Ini
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={addScheduleSlot} className="text-[13px] text-[#F56A00] hover:text-[#D45A00] font-semibold transition">
                            + Tambah Slot
                          </button>
                        </div>
                      </Field>
                    </>
                  ) : null}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setScheduleModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveSchedule} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW STRUCTURED PROGRAM ── */}
      {viewProgram && viewProgram.structured_data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#111]">{viewProgram.sport}</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[rgba(245,106,0,0.1)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]">MINGGUAN</span>
                </div>
                {viewProgram.structured_data.phase && (
                  <p className="text-[13px] font-semibold text-[#F56A00]">{viewProgram.structured_data.phase}</p>
                )}
                <p className="text-[12px] text-[#888] mt-0.5">
                  {MONTHS[viewProgram.month - 1]} {viewProgram.year}
                  {viewProgram.start_date && ` • ${fmtProgramDate(viewProgram.start_date)}`}
                  {viewProgram.end_date && ` – ${fmtProgramDate(viewProgram.end_date)}`}
                </p>
                {viewProgram.structured_data.training_goals.filter(Boolean).length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {viewProgram.structured_data.training_goals.filter(Boolean).map((g, i) => (
                      <li key={i} className="text-[11px] text-[#444]">{i + 1}. {g}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => { setViewProgram(null); openEditProgram(viewProgram) }} className="text-sm text-[#F56A00] hover:underline font-medium">Edit</button>
                <button onClick={() => setViewProgram(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {viewProgram.structured_data.sessions.map(session => (
                <div key={session.session_number} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#F56A00]">SESI #{session.session_number}</span>
                    <span className="text-[12px] font-semibold text-[#111]">{session.day}</span>
                    {session.session_type && <span className="text-[11px] text-[#888]">— {session.session_type}</span>}
                  </div>
                  <div className="p-4 space-y-4">
                    {session.warmup.filter(Boolean).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">Pemanasan</p>
                        <ol className="space-y-0.5">
                          {session.warmup.filter(Boolean).map((w, i) => (
                            <li key={i} className="text-[12px] text-[#444]">{i + 1}. {w}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {session.exercises.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">Latihan</p>
                        <div className="overflow-x-auto rounded-lg border border-gray-100">
                          <table className="w-full text-[12px] min-w-[500px]">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#888] w-[180px]">Latihan</th>
                                {[1, 2, 3, 4].map(w => (
                                  <th key={w} className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#F56A00]">Minggu {w}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {session.exercises.map((ex, ei) => (
                                <tr key={ei} className="border-b border-gray-50 last:border-0">
                                  <td className="px-3 py-2 font-medium text-[#111]">{ex.name || '—'}</td>
                                  {ex.weeks.map((week, wi) => {
                                    const parts = [
                                      week.reps && week.sets ? `${week.reps}x${week.sets}` : (week.reps || week.sets || ''),
                                      week.rest,
                                      week.intensity,
                                    ].filter(Boolean)
                                    return (
                                      <td key={wi} className="px-3 py-2 text-center text-[#444] font-mono text-[11px]">
                                        {parts.join(' / ') || '—'}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {session.core.filter(Boolean).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1.5">Core</p>
                        <ol className="space-y-0.5">
                          {session.core.filter(Boolean).map((c, i) => (
                            <li key={i} className="text-[12px] text-[#444]">{i + 1}. {c}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE: ATTENDANCE ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam rekod ini?</p>
            <p className="text-[13px] text-[#888] mb-6">
              {athletes.find(a => a.id === confirmDelete.athlete_id)?.name} — {new Date(confirmDelete.session_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteAttendance(confirmDelete)} disabled={deletingAttendance} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">{deletingAttendance ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE: PROGRAM ── */}
      {confirmDeleteProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam program ini?</p>
            <p className="text-[13px] text-[#888] mb-6">
              {confirmDeleteProgram.sport} — {MONTHS[confirmDeleteProgram.month - 1]} {confirmDeleteProgram.year}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteProgram(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteProgram(confirmDeleteProgram)} disabled={deletingProgram} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">{deletingProgram ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE: SCHEDULE ── */}
      {confirmDeleteSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam jadual ini?</p>
            <p className="text-[13px] text-[#888] mb-6">
              {confirmDeleteSchedule.schedule_name}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteSchedule(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteSchedule(confirmDeleteSchedule)} disabled={deletingSchedule} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 disabled:opacity-60 rounded-lg transition">{deletingSchedule ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE: SLOT ── */}
      {confirmDeleteSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam slot ini?</p>
            <p className="text-[13px] text-[#888] mb-2">
              {confirmDeleteSlot.schedule.schedule_name}
            </p>
            <p className="text-[12px] text-[#666] mb-6">
              {new Date(confirmDeleteSlot.slot.slot_date + 'T00:00:00').toLocaleDateString('ms-MY', { weekday: 'long', day: '2-digit', month: 'short' })} {confirmDeleteSlot.slot.start_time}–{confirmDeleteSlot.slot.end_time}
            </p>

            {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 mb-4">{error}</div>}

            <div className="space-y-3">
              <p className="text-[11px] text-[#888] font-semibold">Pilih tindakan:</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDeleteSlot(null)} disabled={saving} className="flex-1 px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition disabled:opacity-50">Batal</button>
                <button onClick={() => handleDeleteSlot(confirmDeleteSlot.schedule, confirmDeleteSlot.slot)} disabled={saving || deletingSlot} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#F56A00] hover:bg-[#D45A00] rounded-lg transition disabled:opacity-50">{deletingSlot ? 'Padam...' : 'Padam Slot Sahaja'}</button>
                <button
                  onClick={() => handleDeleteScheduleFromModal(confirmDeleteSlot.schedule)}
                  disabled={(confirmDeleteSlot.schedule.slots?.length ?? 0) <= 1 || saving}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D44040]"
                >
                  {saving ? 'Memuatkan...' : 'Padam Seluruh Jadual'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const filterCls = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'

function fmtProgramDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getMonthDateRange(month: number, year: number): { start: string; end: string } {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const start = `${year}-${String(month).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  return { start, end }
}

function TimeInput12h({ value, onChange }: { value: string; onChange: (time24: string) => void }) {
  const { hour, minute, ampm } = convert24To12(value)
  return (
    <div className="flex gap-2 items-center">
      <select value={hour} onChange={e => onChange(convert12To24(e.target.value, minute, ampm))} className="w-16 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-2 py-2.5 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-[#888]">:</span>
      <select value={minute} onChange={e => onChange(convert12To24(hour, e.target.value, ampm))} className="w-16 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-2 py-2.5 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white">
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={ampm} onChange={e => onChange(convert12To24(hour, minute, e.target.value as 'AM' | 'PM'))} className="w-20 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-2 py-2.5 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

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
