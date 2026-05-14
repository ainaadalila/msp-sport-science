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

interface PhysioCase {
  id: string
  athlete_id: string | null
  open_date: string
  injury_type: string | null
  status: 'active' | 'closed' | 'referred'
  rts_date: string | null
  close_reason: string | null
  referred_to: string | null
  physio_id: string | null
  created_at: string
  athlete?: { name: string; sport: string } | null
}

interface PhysioSlot {
  id: string
  slot_date: string
  time_slot: string
  pain_scale: number | null
  session_type: 'standard' | 'manual' | 'injury' | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  athlete?: { name: string; sport: string } | null
}

interface CaseStats {
  [caseId: string]: { count: number; latestPain: number | null }
}

type Tab = 'active' | 'closed'

const statusLabel: Record<string, string> = { active: 'Aktif', closed: 'Ditutup (RTS)', referred: 'Dirujuk' }
const statusStyle: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-[#888]',
  referred: 'bg-red-50 text-[#D44040]',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' })
}

function getPainColor(score: number): string {
  if (score <= 3) return 'bg-green-100 text-green-700'
  if (score <= 6) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function PhysioCasePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'
  const isPhysio = profile?.role === 'physio'
  const readOnly = isReadOnlyMode()

  const [tab, setTab] = useState<Tab>('active')
  const [cases, setCases] = useState<PhysioCase[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [caseStats, setCaseStats] = useState<CaseStats>({})
  const [loading, setLoading] = useState(true)

  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ athlete_id: '', open_date: new Date().toISOString().slice(0, 10), injury_type: '' })
  const [createFormSport, setCreateFormSport] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [detailCase, setDetailCase] = useState<PhysioCase | null>(null)
  const [caseSlots, setCaseSlots] = useState<PhysioSlot[]>([])
  const [caseLoading, setCaseLoading] = useState(false)

  const [closeModal, setCloseModal] = useState(false)
  const [closeForm, setCloseForm] = useState<{ action: 'close' | 'refer'; rts_date: string; close_reason: string; referred_to: string }>({
    action: 'close',
    rts_date: '',
    close_reason: '',
    referred_to: '',
  })
  const [closeSaving, setCloseSaving] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<PhysioCase | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [casesRes, slotsRes, athRes] = await Promise.all([
      supabase.from('physio_cases').select('*, athlete:athletes(name, sport)').order('open_date', { ascending: false }),
      supabase.from('physio_slots').select('case_id, pain_scale, slot_date').not('case_id', 'is', null),
      supabase.from('athletes').select('id, name, sport').order('name'),
    ])
    setCases(casesRes.data ?? [])
    setAthletes(athRes.data ?? [])

    // Compute per-case stats
    const stats: CaseStats = {}
    const slots = slotsRes.data ?? []
    slots.forEach(s => {
      if (!stats[s.case_id]) stats[s.case_id] = { count: 0, latestPain: null }
      stats[s.case_id].count++
      if (s.pain_scale !== null) stats[s.case_id].latestPain = s.pain_scale
    })
    setCaseStats(stats)
    setLoading(false)
  }

  async function fetchCaseSlots(caseId: string) {
    setCaseLoading(true)
    const { data } = await supabase
      .from('physio_slots')
      .select('id, slot_date, time_slot, pain_scale, session_type, attendance_status, athlete:athletes(name, sport)')
      .eq('case_id', caseId)
      .order('slot_date', { ascending: true })
      .order('time_slot')
    setCaseSlots((data as any) ?? [])
    setCaseLoading(false)
  }

  async function handleCreateCase() {
    if (!createForm.athlete_id || !createForm.open_date) {
      setCreateError('Atlet dan tarikh buka wajib diisi.')
      return
    }
    setCreateSaving(true)
    setCreateError(null)

    const { data, error } = await supabase
      .from('physio_cases')
      .insert({
        athlete_id: createForm.athlete_id,
        open_date: createForm.open_date,
        injury_type: createForm.injury_type || null,
        physio_id: profile?.id,
      })
      .select('id')
      .single()

    if (error) {
      setCreateError(error.message)
      setCreateSaving(false)
      return
    }

    await logAction(profile!.id, 'create_physio_case', 'physio_cases', data.id)
    setCreateSaving(false)
    setCreateModal(false)
    setCreateForm({ athlete_id: '', open_date: new Date().toISOString().slice(0, 10), injury_type: '' })
    fetchAll()
  }

  async function handleCloseCase() {
    if (!detailCase) return
    if (closeForm.action === 'close' && !closeForm.rts_date) {
      setCloseError('Tarikh RTS wajib diisi untuk menutup kes.')
      return
    }
    if (closeForm.action === 'refer' && !closeForm.referred_to) {
      setCloseError('Nama hospital wajib diisi untuk merujuk kes.')
      return
    }

    setCloseSaving(true)
    setCloseError(null)

    const updatePayload =
      closeForm.action === 'refer'
        ? { status: 'referred' as const, referred_to: closeForm.referred_to }
        : { status: 'closed' as const, rts_date: closeForm.rts_date, close_reason: closeForm.close_reason || null }

    const { error } = await supabase.from('physio_cases').update(updatePayload).eq('id', detailCase.id)
    if (error) {
      setCloseError(error.message)
      setCloseSaving(false)
      return
    }

    await logAction(profile!.id, 'close_physio_case', 'physio_cases', detailCase.id)
    setCloseSaving(false)
    setCloseModal(false)
    setDetailCase(null)
    setCaseSlots([])
    fetchAll()
  }

  async function handleDeleteCase(c: PhysioCase) {
    const { error } = await supabase.from('physio_cases').delete().eq('id', c.id)
    if (error) return
    await logAction(profile!.id, 'delete_physio_case', 'physio_cases', c.id)
    setConfirmDelete(null)
    fetchAll()
  }

  function openCloseModal() {
    setCloseForm({ action: 'close', rts_date: '', close_reason: '', referred_to: '' })
    setCloseError(null)
    setCloseModal(true)
  }

  const activeCases = cases.filter(c => c.status === 'active')
  const closedCases = cases.filter(c => c.status === 'closed' || c.status === 'referred')
  const displayCases = tab === 'active' ? activeCases : closedCases
  const canEdit = isAdmin || isPhysio

  const allSports = [...new Set(athletes.map(a => a.sport))].sort()
  const modalAthletes = createFormSport ? athletes.filter(a => a.sport === createFormSport) : athletes

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{cases.length} kes</p>
        {canEdit && (
          <button onClick={() => { setCreateModal(true); setCreateFormSport('') }} disabled={readOnly} className="bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Kes Baharu
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['active', 'closed'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#888] hover:text-[#444]'}`}
          >
            {t === 'active' ? 'Kes Aktif' : 'Kes Ditutup'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {displayCases.length === 0 ? (
            <div className="py-16 text-center text-[#888] text-sm">
              {cases.length === 0 ? 'Tiada kes lagi.' : `Tiada kes di tab "${tab === 'active' ? 'Aktif' : 'Ditutup'}".`}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Atlet', 'Sukan', 'Tarikh Buka', 'Bilangan Sesi', 'Kesakitan Terkini', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayCases.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#111]">{c.athlete?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#888]">{c.athlete?.sport ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{fmtDate(c.open_date)}</td>
                    <td className="px-4 py-3 font-semibold text-[#111]">{caseStats[c.id]?.count ?? 0}</td>
                    <td className="px-4 py-3">
                      {caseStats[c.id]?.latestPain !== null && caseStats[c.id]?.latestPain !== undefined ? (
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${getPainColor(caseStats[c.id].latestPain!)}`}>
                          {caseStats[c.id].latestPain} / 10
                        </span>
                      ) : (
                        <span className="text-[#888]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[c.status]}`}>{statusLabel[c.status]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => { setDetailCase(c); fetchCaseSlots(c.id) }} className="text-xs text-[#3A7EC8] hover:underline font-medium">Lihat</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Case Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Kes Baharu</h3>
              <button onClick={() => setCreateModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {createError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{createError}</div>}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Sukan</label>
                <select
                  value={createFormSport}
                  onChange={e => { setCreateFormSport(e.target.value); setCreateForm(f => ({ ...f, athlete_id: '' })) }}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                >
                  <option value="">— Semua Sukan —</option>
                  {allSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Atlet *</label>
                <select
                  value={createForm.athlete_id}
                  onChange={e => setCreateForm(f => ({ ...f, athlete_id: e.target.value }))}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                >
                  <option value="">— Pilih atlet —</option>
                  {modalAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Tarikh Buka *</label>
                <input
                  type="date"
                  value={createForm.open_date}
                  onChange={e => setCreateForm(f => ({ ...f, open_date: e.target.value }))}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Jenis Kecederaan</label>
                <input
                  type="text"
                  value={createForm.injury_type}
                  onChange={e => setCreateForm(f => ({ ...f, injury_type: e.target.value }))}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                  placeholder="cth. Strain Hamstring, Sprain Lutut, Terseliuh Bahu"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={handleCreateCase}
                disabled={createSaving}
                className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {createSaving ? 'Menyimpan...' : 'Buat Kes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-[#111]">{detailCase.athlete?.name ?? 'Tiada Atlet'}</h3>
                <p className="text-[12px] text-[#888]">{detailCase.injury_type ? detailCase.injury_type + ' · ' : ''}{fmtDate(detailCase.open_date)} · {detailCase.athlete?.sport ?? ''}</p>
              </div>
              <button onClick={() => setDetailCase(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">

              {/* Pain Trend */}
              {caseSlots.some(s => s.pain_scale !== null) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Trend Kesakitan</p>
                  <div className="flex flex-wrap gap-2">
                    {caseSlots
                      .filter(s => s.pain_scale !== null)
                      .map(s => (
                        <span
                          key={s.id}
                          className={`inline-block text-xs font-semibold px-2.5 py-1.5 rounded-full ${getPainColor(s.pain_scale!)}`}
                        >
                          {fmtDateShort(s.slot_date)} · {s.pain_scale}/10
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Sessions */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">Sesi Berkaitan</p>
                {caseLoading ? (
                  <div className="text-[13px] text-[#888]">Memuatkan sesi...</div>
                ) : caseSlots.length === 0 ? (
                  <div className="text-[13px] text-[#888]">Tiada sesi untuk kes ini.</div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase text-[#888]">Tarikh</th>
                          <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase text-[#888]">Masa</th>
                          <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase text-[#888]">Jenis Sesi</th>
                          <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase text-[#888]">Kehadiran</th>
                          <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase text-[#888]">Kesakitan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseSlots.map(s => (
                          <tr key={s.id} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-2 font-mono text-[#444]">{fmtDateShort(s.slot_date)}</td>
                            <td className="px-3 py-2 font-mono text-[#444]">{s.time_slot}</td>
                            <td className="px-3 py-2">
                              {s.session_type ? (
                                <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-[#444]">
                                  {s.session_type === 'standard' ? 'PENILAIAN' : s.session_type === 'manual' ? 'SUSULAN' : 'KRISIS'}
                                </span>
                              ) : (
                                <span className="text-[#888]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-[#888]">{s.attendance_status ?? '—'}</td>
                            <td className="px-3 py-2">
                              {s.pain_scale !== null ? (
                                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${getPainColor(s.pain_scale)}`}>
                                  {s.pain_scale}/10
                                </span>
                              ) : (
                                <span className="text-[#888]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-3 shrink-0">
              <div className="flex gap-3">
                {isAdmin && (
                  <button
                    onClick={() => { handleDeleteCase(detailCase); setDetailCase(null) }}
                    className="px-4 py-2 text-sm text-[#D44040] border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    Padam
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {canEdit && detailCase.status === 'active' && (
                  <button onClick={openCloseModal} className="px-4 py-2 text-sm font-semibold text-white bg-[#3A7EC8] hover:bg-blue-700 rounded-lg transition">
                    Tutup Kes
                  </button>
                )}
                <button onClick={() => setDetailCase(null)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close/Refer Case Modal */}
      {closeModal && detailCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Tutup / Rujuk Kes</h3>
              <button onClick={() => setCloseModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {closeError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{closeError}</div>}

              <div className="space-y-2">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888]">Tindakan</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={closeForm.action === 'close'}
                      onChange={() => setCloseForm(f => ({ ...f, action: 'close' }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#444]">Tutup Kes (RTS)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={closeForm.action === 'refer'}
                      onChange={() => setCloseForm(f => ({ ...f, action: 'refer' }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#444]">Rujuk ke Hospital</span>
                  </label>
                </div>
              </div>

              {closeForm.action === 'close' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Tarikh RTS *</label>
                    <input
                      type="date"
                      value={closeForm.rts_date}
                      onChange={e => setCloseForm(f => ({ ...f, rts_date: e.target.value }))}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Sebab Penutupan</label>
                    <textarea
                      value={closeForm.close_reason}
                      onChange={e => setCloseForm(f => ({ ...f, close_reason: e.target.value }))}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white resize-none"
                      rows={2}
                      placeholder="Catatan penutupan..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">Nama Hospital / Institusi *</label>
                  <input
                    type="text"
                    value={closeForm.referred_to}
                    onChange={e => setCloseForm(f => ({ ...f, referred_to: e.target.value }))}
                    className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                    placeholder="cth. Hospital Kuala Lumpur"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setCloseModal(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={handleCloseCase}
                disabled={closeSaving}
                className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {closeSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam kes ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{confirmDelete.athlete?.name ?? 'Tiada atlet'} · {fmtDate(confirmDelete.open_date)}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDeleteCase(confirmDelete)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
