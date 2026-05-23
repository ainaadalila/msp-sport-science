import type { StructuredProgramData, ProgramSession, WeeklyExercise } from '../../../types'

const DAY_OPTIONS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad']
const WEEK_FIELDS = ['sets', 'reps', 'rest', 'intensity'] as const
const WEEK_PLACEHOLDERS = { sets: '4', reps: '8', rest: '60s', intensity: '70%' }

const emptyWeeks = () =>
  Array.from({ length: 4 }, () => ({ sets: '', reps: '', rest: '', intensity: '' }))

const emptyExercise = (): WeeklyExercise => ({ name: '', weeks: emptyWeeks() })

const emptySession = (n: number): ProgramSession => ({
  session_number: n,
  day: 'Isnin',
  session_type: '',
  warmup: [],
  exercises: [],
  core: [],
})

interface Props {
  value: StructuredProgramData
  onChange: (data: StructuredProgramData) => void
}

export default function StructuredProgramBuilder({ value, onChange }: Props) {
  function set(patch: Partial<StructuredProgramData>) {
    onChange({ ...value, ...patch })
  }

  function updateSessions(sessions: ProgramSession[]) {
    set({ sessions })
  }

  function updateSession(si: number, patch: Partial<ProgramSession>) {
    const sessions = value.sessions.map((s, i) => i === si ? { ...s, ...patch } : s)
    updateSessions(sessions)
  }

  function addSession() {
    updateSessions([...value.sessions, emptySession(value.sessions.length + 1)])
  }

  function removeSession(si: number) {
    updateSessions(
      value.sessions
        .filter((_, i) => i !== si)
        .map((s, i) => ({ ...s, session_number: i + 1 }))
    )
  }

  function addExercise(si: number) {
    updateSession(si, { exercises: [...value.sessions[si].exercises, emptyExercise()] })
  }

  function removeExercise(si: number, ei: number) {
    updateSession(si, { exercises: value.sessions[si].exercises.filter((_, i) => i !== ei) })
  }

  function updateExerciseName(si: number, ei: number, name: string) {
    const exercises = value.sessions[si].exercises.map((ex, i) => i === ei ? { ...ex, name } : ex)
    updateSession(si, { exercises })
  }

  function updateExerciseWeek(si: number, ei: number, wi: number, field: typeof WEEK_FIELDS[number], val: string) {
    const exercises = value.sessions[si].exercises.map((ex, i) => {
      if (i !== ei) return ex
      const weeks = ex.weeks.map((w, j) => j === wi ? { ...w, [field]: val } : w)
      return { ...ex, weeks }
    })
    updateSession(si, { exercises })
  }

  function addListItem(si: number, field: 'warmup' | 'core') {
    updateSession(si, { [field]: [...value.sessions[si][field], ''] })
  }

  function updateListItem(si: number, field: 'warmup' | 'core', idx: number, text: string) {
    const list = value.sessions[si][field].map((v, i) => i === idx ? text : v)
    updateSession(si, { [field]: list })
  }

  function removeListItem(si: number, field: 'warmup' | 'core', idx: number) {
    updateSession(si, { [field]: value.sessions[si][field].filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-5">

      {/* Phase */}
      <div>
        <label className={labelCls}>Fasa Program</label>
        <input
          value={value.phase}
          onChange={e => set({ phase: e.target.value })}
          placeholder="cth. PRE-COMP"
          className={inputCls}
        />
      </div>

      {/* Training Goals */}
      <div>
        <label className={labelCls}>Matlamat Latihan</label>
        <div className="space-y-2">
          {value.training_goals.map((goal, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={goal}
                onChange={e => {
                  const goals = value.training_goals.map((g, j) => j === i ? e.target.value : g)
                  set({ training_goals: goals })
                }}
                placeholder={`Matlamat ${i + 1}`}
                className={inputCls}
              />
              {value.training_goals.length > 1 && (
                <button
                  type="button"
                  onClick={() => set({ training_goals: value.training_goals.filter((_, j) => j !== i) })}
                  className="text-[#D44040] hover:text-red-700 text-lg px-1"
                >×</button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ training_goals: [...value.training_goals, ''] })}
            className={addBtnCls}
          >
            + Tambah Matlamat
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <label className={labelCls}>Sesi Latihan</label>
        <div className="space-y-4">
          {value.sessions.map((session, si) => (
            <div key={si} className="border border-gray-200 rounded-xl overflow-hidden">

              {/* Session header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-bold text-[#F56A00] shrink-0">SESI #{session.session_number}</span>
                <select
                  value={session.day}
                  onChange={e => updateSession(si, { day: e.target.value })}
                  className="bg-white border border-[#E8E8E8] rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-[#F56A00] transition"
                >
                  {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  value={session.session_type}
                  onChange={e => updateSession(si, { session_type: e.target.value })}
                  placeholder="Jenis sesi (cth. Kekuatan Bahagian Bawah)"
                  className="flex-1 bg-white border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#F56A00] transition"
                />
                <button
                  type="button"
                  onClick={() => removeSession(si)}
                  className="text-[#D44040] hover:text-red-700 text-[12px] font-medium shrink-0"
                >
                  Padam
                </button>
              </div>

              <div className="p-4 space-y-4">

                {/* Warmup */}
                <div>
                  <p className={subLabelCls}>Pemanasan</p>
                  <div className="space-y-1.5">
                    {session.warmup.map((w, wi) => (
                      <div key={wi} className="flex gap-2">
                        <input
                          value={w}
                          onChange={e => updateListItem(si, 'warmup', wi, e.target.value)}
                          placeholder={`Item pemanasan ${wi + 1}`}
                          className={smallInputCls}
                        />
                        <button type="button" onClick={() => removeListItem(si, 'warmup', wi)} className="text-[#D44040] text-lg leading-none px-1">×</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addListItem(si, 'warmup')} className={addBtnCls}>+ Pemanasan</button>
                  </div>
                </div>

                {/* Exercises */}
                <div>
                  <p className={subLabelCls}>Latihan</p>
                  {session.exercises.length > 0 && (
                    <div className="overflow-x-auto mb-2 rounded-lg border border-gray-100">
                      <table className="w-full text-[11px] min-w-[640px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 text-[#888] font-semibold w-[160px]">Latihan</th>
                            {[1, 2, 3, 4].map(w => (
                              <th key={w} className="text-center px-2 py-2 text-[#F56A00] font-semibold">Minggu {w}</th>
                            ))}
                            <th className="w-6" />
                          </tr>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th />
                            {[0, 1, 2, 3].map(w => (
                              <th key={w} className="px-2 pb-1.5">
                                <div className="grid grid-cols-4 gap-0.5 text-[9px] text-[#bbb] font-normal text-center">
                                  <span>Set</span><span>Rep</span><span>Rehat</span><span>Int.</span>
                                </div>
                              </th>
                            ))}
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {session.exercises.map((ex, ei) => (
                            <tr key={ei} className="border-b border-gray-50 last:border-0">
                              <td className="px-3 py-1.5">
                                <input
                                  value={ex.name}
                                  onChange={e => updateExerciseName(si, ei, e.target.value)}
                                  placeholder="Nama latihan"
                                  className={cellInputCls}
                                />
                              </td>
                              {ex.weeks.map((week, wi) => (
                                <td key={wi} className="px-1 py-1.5">
                                  <div className="grid grid-cols-4 gap-0.5">
                                    {WEEK_FIELDS.map(field => (
                                      <input
                                        key={field}
                                        value={week[field]}
                                        onChange={e => updateExerciseWeek(si, ei, wi, field, e.target.value)}
                                        placeholder={WEEK_PLACEHOLDERS[field]}
                                        className={cellInputCls + ' text-center'}
                                      />
                                    ))}
                                  </div>
                                </td>
                              ))}
                              <td className="px-1 text-center">
                                <button type="button" onClick={() => removeExercise(si, ei)} className="text-[#D44040] text-lg leading-none">×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button type="button" onClick={() => addExercise(si)} className={addBtnCls}>+ Tambah Latihan</button>
                </div>

                {/* Core */}
                <div>
                  <p className={subLabelCls}>Core</p>
                  <div className="space-y-1.5">
                    {session.core.map((c, ci) => (
                      <div key={ci} className="flex gap-2">
                        <input
                          value={c}
                          onChange={e => updateListItem(si, 'core', ci, e.target.value)}
                          placeholder={`Core item ${ci + 1}`}
                          className={smallInputCls}
                        />
                        <button type="button" onClick={() => removeListItem(si, 'core', ci)} className="text-[#D44040] text-lg leading-none px-1">×</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addListItem(si, 'core')} className={addBtnCls}>+ Core</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSession}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-[13px] font-semibold text-[#888] hover:border-[#F56A00] hover:text-[#F56A00] transition"
          >
            + Tambah Sesi
          </button>
        </div>
      </div>
    </div>
  )
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5'
const subLabelCls = 'text-[10px] font-semibold uppercase tracking-wider text-[#888] mb-1.5'
const addBtnCls = 'text-[11px] text-[#F56A00] hover:underline font-medium'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00] focus:bg-white transition'
const smallInputCls = 'flex-1 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-[12px] text-[#111] outline-none focus:border-[#F56A00] focus:bg-white transition'
const cellInputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded px-1.5 py-1 text-[10px] text-[#111] outline-none focus:border-[#F56A00] focus:bg-white transition'
