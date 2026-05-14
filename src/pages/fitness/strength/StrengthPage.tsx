import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { logAction } from '../../../lib/audit'
import { ReadOnlyBanner } from '../../../components/ReadOnlyBanner'
import { isReadOnlyMode } from '../../../lib/readOnlyMode'

interface Athlete { id: string; name: string; sport: string }
interface Coach { id: string; full_name: string }

interface SCRecord {
  id: string; athlete_id: string; session_date: string
  attendance: 'present' | 'absent' | 'mc'
  training_program: string | null; notes: string | null
  athlete?: { name: string; sport: string }
}

interface SCProgram {
  id: string; sport: string; month: number; year: number
  content: string; coach_id: string | null
  coach?: { full_name: string }
}

interface CoachAssignment {
  id: string; coach_id: string; sport: string
  days_of_week: string[] | null; notes: string | null
  coach?: { full_name: string }
}

interface AttendanceForm {
  athlete_id: string; session_date: string
  attendance: 'present' | 'absent' | 'mc'
  training_program: string; notes: string
}

interface ProgramForm {
  sport: string; month: number; year: number; content: string
}

interface AssignmentForm {
  coach_id: string; sport: string; days_of_week: string[]; notes: string
}

const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis']
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
const emptyProgramForm: ProgramForm = {
  sport: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), content: '',
}
const emptyAssignmentForm: AssignmentForm = {
  coach_id: '', sport: '', days_of_week: [], notes: '',
}

export default function StrengthPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'
  const isCoach = profile?.role === 'coach'
  const readOnly = isReadOnlyMode()

  const [activeTab, setActiveTab] = useState<'kehadiran' | 'program' | 'jadual'>('jadual')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [assignments, setAssignments] = useState<CoachAssignment[]>([])

  // Tab 1 — Kehadiran
  const [records, setRecords] = useState<SCRecord[]>([])
  const [filterSport, setFilterSport] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterAthlete, setFilterAthlete] = useState('')
  const [filterAttendance, setFilterAttendance] = useState('')
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SCRecord | null>(null)
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendanceForm)
  const [confirmDelete, setConfirmDelete] = useState<SCRecord | null>(null)

  // Tab 2 — Program Bulanan
  const [programs, setPrograms] = useState<SCProgram[]>([])
  const [filterProgramSport, setFilterProgramSport] = useState('')
  const [filterProgramYear, setFilterProgramYear] = useState(String(new Date().getFullYear()))
  const [programModalOpen, setProgramModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<SCProgram | null>(null)
  const [programForm, setProgramForm] = useState<ProgramForm>(emptyProgramForm)
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState<SCProgram | null>(null)

  // Tab 3 — Jadual Jurulatih
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<CoachAssignment | null>(null)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignmentForm)
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState<CoachAssignment | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [recRes, athRes, progRes, assignRes, coachRes] = await Promise.all([
      supabase.from('strength_conditioning').select('*, athlete:athletes(name, sport)').order('session_date', { ascending: false }),
      supabase.from('athletes').select('id, name, sport').order('name'),
      supabase.from('sc_programs').select('*, coach:profiles(full_name)').order('year', { ascending: false }).order('month'),
      supabase.from('coach_assignments').select('*, coach:profiles(full_name)').order('sport'),
      supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
    ])
    setRecords(recRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setPrograms(progRes.data ?? [])
    setAssignments(assignRes.data ?? [])
    setCoaches(coachRes.data ?? [])
    setLoading(false)
  }

  const allSports = [...new Set(athletes.map(a => a.sport))].sort()
  const myAssignedSports = isCoach
    ? assignments.filter(a => a.coach_id === profile?.id).map(a => a.sport)
    : allSports

  // --- ATTENDANCE ---
  function openAddAttendance() {
    setEditingRecord(null); setAttendanceForm(emptyAttendanceForm); setError(null); setAttendanceModalOpen(true)
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
    await supabase.from('strength_conditioning').delete().eq('id', rec.id)
    setConfirmDelete(null); fetchAll()
  }

  // --- PROGRAM ---
  function openAddProgram() {
    setEditingProgram(null)
    setProgramForm({ ...emptyProgramForm, sport: myAssignedSports[0] ?? '' })
    setError(null); setProgramModalOpen(true)
  }
  function openEditProgram(p: SCProgram) {
    setEditingProgram(p)
    setProgramForm({ sport: p.sport, month: p.month, year: p.year, content: p.content })
    setError(null); setProgramModalOpen(true)
  }
  async function handleSaveProgram() {
    if (!programForm.sport || !programForm.content) { setError('Sukan dan kandungan program wajib diisi.'); return }
    setSaving(true); setError(null)
    const payload = { sport: programForm.sport, month: programForm.month, year: programForm.year, content: programForm.content, coach_id: profile?.id ?? null }
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
    await supabase.from('sc_programs').delete().eq('id', p.id)
    setConfirmDeleteProgram(null); fetchAll()
  }

  // --- ASSIGNMENT ---
  function openAddAssignment() {
    setEditingAssignment(null); setAssignmentForm(emptyAssignmentForm); setError(null); setAssignmentModalOpen(true)
  }
  function openEditAssignment(a: CoachAssignment) {
    setEditingAssignment(a)
    setAssignmentForm({ coach_id: a.coach_id, sport: a.sport, days_of_week: a.days_of_week ?? [], notes: a.notes ?? '' })
    setError(null); setAssignmentModalOpen(true)
  }
  async function handleSaveAssignment() {
    if (!assignmentForm.coach_id || !assignmentForm.sport) { setError('Jurulatih dan sukan wajib dipilih.'); return }
    setSaving(true); setError(null)
    const payload = { coach_id: assignmentForm.coach_id, sport: assignmentForm.sport, days_of_week: assignmentForm.days_of_week || null, notes: assignmentForm.notes || null }
    if (editingAssignment) {
      const { error } = await supabase.from('coach_assignments').update(payload).eq('id', editingAssignment.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_coach_assignment', 'coach_assignments', editingAssignment.id)
    } else {
      const { data, error } = await supabase.from('coach_assignments').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_coach_assignment', 'coach_assignments', data.id)
    }
    setSaving(false); setAssignmentModalOpen(false); fetchAll()
  }
  async function handleDeleteAssignment(a: CoachAssignment) {
    await supabase.from('coach_assignments').delete().eq('id', a.id)
    setConfirmDeleteAssignment(null); fetchAll()
  }

  // --- DERIVED ---
  const filteredAthletes = filterSport ? athletes.filter(a => a.sport === filterSport) : athletes
  const filteredAthleteIds = new Set(filteredAthletes.map(a => a.id))

  const filteredAttendance = records.filter(r => {
    const matchSport = !filterSport || filteredAthleteIds.has(r.athlete_id)
    const matchDate = !filterDate || r.session_date === filterDate
    const matchAthlete = !filterAthlete || r.athlete_id === filterAthlete
    const matchAttendance = !filterAttendance || r.attendance === filterAttendance
    return matchSport && matchDate && matchAthlete && matchAttendance
  })

  const visiblePrograms = programs.filter(p =>
    (!isCoach || myAssignedSports.includes(p.sport)) &&
    (!filterProgramSport || p.sport === filterProgramSport) &&
    (!filterProgramYear || p.year === +filterProgramYear)
  )

  const programYears = [...new Set(programs.map(p => p.year))].sort((a, b) => b - a)
  const summary = {
    present: records.filter(r => r.attendance === 'present').length,
    absent: records.filter(r => r.attendance === 'absent').length,
    mc: records.filter(r => r.attendance === 'mc').length,
  }

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

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
            <p className="text-[12px] text-[#888]">{records.length} rekod sesi</p>
            <button onClick={openAddAttendance} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Rekod Sesi
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hadir', value: summary.present, color: 'text-[#3A9E6A]' },
              { label: 'Tidak Hadir', value: summary.absent, color: 'text-[#D44040]' },
              { label: 'MC', value: summary.mc, color: 'text-[#3A7EC8]' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={filterSport} onChange={e => { setFilterSport(e.target.value); setFilterAthlete('') }} className={filterCls}>
              <option value="">Semua Sukan</option>
              {allSports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterAthlete} onChange={e => setFilterAthlete(e.target.value)} className={filterCls}>
              <option value="">Semua Atlet</option>
              {filteredAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterAttendance} onChange={e => setFilterAttendance(e.target.value)} className={filterCls}>
              <option value="">Semua Kehadiran</option>
              <option value="present">Hadir</option>
              <option value="absent">Tidak Hadir</option>
              <option value="mc">MC</option>
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className={filterCls} />
            {(filterSport || filterDate || filterAthlete || filterAttendance) && (
              <button onClick={() => { setFilterSport(''); setFilterDate(''); setFilterAthlete(''); setFilterAttendance('') }} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
                Kosongkan Penapis
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
            ) : filteredAttendance.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">
                {records.length === 0 ? 'Tiada rekod sesi lagi.' : 'Tiada rekod sepadan penapis.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Tarikh', 'Atlet', 'Sukan', 'Kehadiran', 'Program Latihan', 'Nota', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">
                        {new Date(r.session_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111]">{r.athlete?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-[#888]">{r.athlete?.sport ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${attendanceStyle[r.attendance]}`}>
                          {attendanceLabel[r.attendance]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#444] max-w-[160px] truncate">{r.training_program ?? '—'}</td>
                      <td className="px-4 py-3 text-[#888] max-w-[160px] truncate">{r.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => openEditAttendance(r)} disabled={readOnly} className="text-xs text-[#F56A00] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Edit</button>
                          {isAdmin && <button onClick={() => setConfirmDelete(r)} disabled={readOnly} className="text-xs text-[#D44040] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Padam</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <button onClick={openAddProgram} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Program Baharu
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <select value={filterProgramSport} onChange={e => setFilterProgramSport(e.target.value)} className={filterCls}>
              <option value="">Semua Sukan</option>
              {(isCoach ? myAssignedSports : allSports).map(s => <option key={s} value={s}>{s}</option>)}
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
                              <p className="text-[11px] font-semibold text-[#F56A00]">{p.sport}</p>
                              <p className="text-[12px] text-[#444] mt-0.5 line-clamp-3">{p.content}</p>
                              {p.coach?.full_name && (
                                <p className="text-[10px] text-[#aaa] mt-1">{p.coach.full_name}</p>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => openEditProgram(p)} disabled={readOnly} className="text-xs text-[#F56A00] hover:underline disabled:opacity-60 disabled:cursor-not-allowed">Edit</button>
                              {isAdmin && <button onClick={() => setConfirmDeleteProgram(p)} disabled={readOnly} className="text-xs text-[#D44040] hover:underline disabled:opacity-60 disabled:cursor-not-allowed">Padam</button>}
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

      {/* ── TAB 3: JADUAL JURULATIH ── */}
      {activeTab === 'jadual' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { const d = new Date(calendarYear, calendarMonth - 2); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()) }}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#F56A00] text-[#888] hover:text-[#F56A00] transition text-sm leading-none"
              >‹</button>
              <p className="text-sm font-semibold text-[#111] w-32 text-center">
                {MONTHS[calendarMonth - 1]} {calendarYear}
              </p>
              <button
                onClick={() => { const d = new Date(calendarYear, calendarMonth); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()) }}
                className="p-1.5 rounded-lg border border-gray-200 hover:border-[#F56A00] text-[#888] hover:text-[#F56A00] transition text-sm leading-none"
              >›</button>
            </div>
            {isAdmin && (
              <button onClick={openAddAssignment} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                + Tambah Tugasan
              </button>
            )}
          </div>

          {/* Calendar grid */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES.map(d => (
                <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#888]">{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {buildCalendarWeeks(calendarYear, calendarMonth).map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-0">
                {week.map((day, di) => {
                  const dayName = day ? DAY_NAMES[(new Date(calendarYear, calendarMonth - 1, day).getDay() + 6) % 7] : null
                  const dayAssignments = dayName ? assignments.filter(a => a.days_of_week?.includes(dayName)) : []
                  return (
                    <div key={di} className={`min-h-[80px] p-2 border-r border-gray-50 last:border-0 ${!day ? 'bg-gray-50/50' : ''}`}>
                      {day && (
                        <>
                          <p className="text-[11px] font-mono text-[#aaa] mb-1">{day}</p>
                          <div className="space-y-1">
                            {dayAssignments.map(a => (
                              <div key={a.id} className="group relative">
                                <div className="text-[10px] leading-tight bg-[rgba(245,106,0,0.08)] border border-[rgba(245,106,0,0.2)] text-[#F56A00] rounded px-1.5 py-1">
                                  <p className="font-semibold truncate">{a.sport}</p>
                                  <p className="text-[#888] truncate">{a.coach?.full_name?.split(' ')[0]}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Assignments legend */}
          {assignments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-3">Senarai Tugasan</p>
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)] shrink-0">{a.sport}</span>
                      <span className="text-[12px] text-[#444] truncate">{a.coach?.full_name ?? '—'}</span>
                      <span className="text-[11px] text-[#aaa]">{a.days_of_week?.join(', ') ?? '—'}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => openEditAssignment(a)} disabled={readOnly} className="text-xs text-[#F56A00] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Edit</button>
                        <button onClick={() => setConfirmDeleteAssignment(a)} disabled={readOnly} className="text-xs text-[#D44040] hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed">Padam</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL: ATTENDANCE ── */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editingRecord ? 'Edit Rekod Sesi' : 'Rekod Sesi Baharu'}</h3>
              <button onClick={() => setAttendanceModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <Field label="Atlet" required>
                <select value={attendanceForm.athlete_id} onChange={e => setAttendanceForm(f => ({ ...f, athlete_id: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih atlet —</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.name} ({a.sport})</option>)}
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
              <button onClick={handleSaveAttendance} disabled={saving || readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PROGRAM ── */}
      {programModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editingProgram ? 'Edit Program' : 'Program Baharu'}</h3>
              <button onClick={() => setProgramModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Sukan" required>
                  <select value={programForm.sport} onChange={e => setProgramForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                    <option value="">— Pilih —</option>
                    {(isCoach ? myAssignedSports : allSports).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Bulan" required>
                  <select value={programForm.month} onChange={e => setProgramForm(f => ({ ...f, month: +e.target.value }))} className={inputCls}>
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Tahun" required>
                  <input type="number" value={programForm.year} onChange={e => setProgramForm(f => ({ ...f, year: +e.target.value }))} className={inputCls} placeholder="2026" />
                </Field>
              </div>
              <Field label="Kandungan Program" required>
                <textarea
                  value={programForm.content}
                  onChange={e => setProgramForm(f => ({ ...f, content: e.target.value.toUpperCase() }))}
                  className={`${inputCls} resize-none`}
                  rows={6}
                  placeholder="HURAIKAN PROGRAM LATIHAN UNTUK BULAN INI..."
                />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setProgramModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveProgram} disabled={saving || readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ASSIGNMENT ── */}
      {assignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editingAssignment ? 'Edit Tugasan' : 'Tugasan Baharu'}</h3>
              <button onClick={() => setAssignmentModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}
              <Field label="Jurulatih S&C" required>
                <select value={assignmentForm.coach_id} onChange={e => setAssignmentForm(f => ({ ...f, coach_id: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih —</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </Field>
              <Field label="Sukan" required>
                <select value={assignmentForm.sport} onChange={e => setAssignmentForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih —</option>
                  {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Hari">
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map(day => (
                    <label key={day} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium cursor-pointer transition ${assignmentForm.days_of_week.includes(day) ? 'bg-[rgba(245,106,0,0.08)] border-[rgba(245,106,0,0.4)] text-[#F56A00]' : 'bg-[#F5F5F7] border-[#E8E8E8] text-[#888]'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={assignmentForm.days_of_week.includes(day)}
                        onChange={e => setAssignmentForm(f => ({
                          ...f,
                          days_of_week: e.target.checked
                            ? [...f.days_of_week, day]
                            : f.days_of_week.filter(d => d !== day)
                        }))}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Nota">
                <textarea value={assignmentForm.notes} onChange={e => setAssignmentForm(f => ({ ...f, notes: e.target.value.toUpperCase() }))} className={`${inputCls} resize-none`} rows={3} placeholder="MAKLUMAT TAMBAHAN..." />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setAssignmentModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveAssignment} disabled={saving || readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
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
              {confirmDelete.athlete?.name} — {new Date(confirmDelete.session_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteAttendance(confirmDelete)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
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
              <button onClick={() => handleDeleteProgram(confirmDeleteProgram)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE: ASSIGNMENT ── */}
      {confirmDeleteAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam tugasan ini?</p>
            <p className="text-[13px] text-[#888] mb-6">
              {confirmDeleteAssignment.coach?.full_name} — {confirmDeleteAssignment.sport}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteAssignment(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteAssignment(confirmDeleteAssignment)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const filterCls = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'

function buildCalendarWeeks(year: number, month: number): (number | null)[][] {
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
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
