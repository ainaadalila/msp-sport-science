import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { logAction } from '../../../lib/audit'

interface Supplement {
  id: string
  name: string
  stock: number
  unit: string
  expiry_date?: string | null
}

interface SupplementRequest {
  id: string
  sport: string | null
  supplement_id: string
  quantity: number
  request_date: string
  status: 'pending' | 'semakan_lulus' | 'semakan_tolak' | 'approved' | 'partial'
  requested_by: string | null
  reviewed_by: string | null
  coordinator_id: string | null
  coordinator_notes: string | null
  approved_quantity: number | null
  created_at: string
  supplement?: { name: string; unit: string }
}

interface Athlete {
  id: string
  name: string
  sport: string
}

type Tab = 'requests' | 'inventory'

const statusLabel: Record<string, string> = {
  pending: 'Menunggu Semakan',
  semakan_lulus: 'Menunggu Kelulusan',
  semakan_tolak: 'Ditolak',
  approved: 'Diluluskan',
  partial: 'Diluluskan Sebahagian',
}
const statusStyle: Record<string, string> = {
  pending: 'bg-blue-50 text-blue-700 border border-blue-200',
  semakan_lulus: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  semakan_tolak: 'bg-red-50 text-red-700 border border-red-200',
  approved: 'bg-green-50 text-green-700 border border-green-200',
  partial: 'bg-orange-50 text-orange-700 border border-orange-200',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SupplementPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'

  const [tab, setTab] = useState<Tab>('requests')

  // Data
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [requests, setRequests] = useState<SupplementRequest[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

  // Inventory modal
  const [invModal, setInvModal] = useState(false)
  const [editingSup, setEditingSup] = useState<Supplement | null>(null)
  const [supForm, setSupForm] = useState({ name: '', stock: 0, unit: 'unit', expiry_date: '' })
  const [supSaving, setSupSaving] = useState(false)
  const [supError, setSupError] = useState<string | null>(null)
  const [confirmDelSup, setConfirmDelSup] = useState<Supplement | null>(null)

  // Request modal
  const [reqModal, setReqModal] = useState(false)
  const [reqForm, setReqForm] = useState<{ sport: string; lines: { supplement_id: string; quantity: number }[] }>({
    sport: '',
    lines: [{ supplement_id: '', quantity: 1 }],
  })
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)

  // Partial approval modal
  const [partialModal, setPartialModal] = useState(false)
  const [partialRequest, setPartialRequest] = useState<SupplementRequest | null>(null)
  const [partialQuantity, setPartialQuantity] = useState(0)
  const [partialSaving, setPartialSaving] = useState(false)

  // Action loading state
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [supRes, reqRes, athRes] = await Promise.all([
      supabase.from('supplements').select('*').order('name'),
      supabase.from('supplement_requests')
        .select('*, supplement:supplements(name, unit)')
        .order('created_at', { ascending: false }),
      supabase.from('athletes').select('id, name, sport').order('name'),
    ])
    console.log('Supplements fetch:', { data: supRes.data, error: supRes.error })
    console.log('Requests fetch:', { data: reqRes.data, error: reqRes.error })
    console.log('Athletes fetch:', { data: athRes.data, error: athRes.error })
    setSupplements(supRes.data ?? [])
    setRequests(reqRes.data ?? [])
    setAthletes(athRes.data ?? [])
    setLoading(false)
  }

  // ── Inventory CRUD ──────────────────────────────────────────

  function openAddSup() {
    setEditingSup(null)
    setSupForm({ name: '', stock: 0, unit: 'unit', expiry_date: '' })
    setSupError(null)
    setInvModal(true)
  }

  function openEditSup(s: Supplement) {
    setEditingSup(s)
    setSupForm({ name: s.name, stock: s.stock, unit: s.unit, expiry_date: s.expiry_date || '' })
    setSupError(null)
    setInvModal(true)
  }

  async function handleSaveSup() {
    if (!supForm.name.trim()) { setSupError('Nama suplemen wajib diisi.'); return }
    setSupSaving(true)
    setSupError(null)
    const payload = {
      name: supForm.name.trim(),
      stock: supForm.stock,
      unit: supForm.unit || 'unit',
      expiry_date: supForm.expiry_date || null
    }
    if (editingSup) {
      const { error } = await supabase.from('supplements').update(payload).eq('id', editingSup.id)
      if (error) { setSupError(error.message); setSupSaving(false); return }
      await logAction(profile!.id, 'update_supplement', 'supplements', editingSup.id)
    } else {
      const { data, error } = await supabase.from('supplements').insert(payload).select('id').single()
      if (error) { setSupError(error.message); setSupSaving(false); return }
      await logAction(profile!.id, 'create_supplement', 'supplements', data.id)
    }
    setSupSaving(false)
    setInvModal(false)
    fetchAll()
  }

  async function handleDelSup(s: Supplement) {
    await supabase.from('supplements').delete().eq('id', s.id)
    setConfirmDelSup(null)
    fetchAll()
  }

  // ── Requests ──────────────────────────────────────────────

  function openReqModal() {
    setReqForm({ sport: '', lines: [{ supplement_id: '', quantity: 1 }] })
    setReqError(null)
    setReqModal(true)
  }

  function setReqLine(index: number, field: 'supplement_id' | 'quantity', value: string | number) {
    setReqForm(f => {
      const lines = f.lines.map((l, i) => i === index ? { ...l, [field]: value } : l)
      return { ...f, lines }
    })
  }

  function addReqLine() {
    setReqForm(f => ({ ...f, lines: [...f.lines, { supplement_id: '', quantity: 1 }] }))
  }

  function removeReqLine(index: number) {
    setReqForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }))
  }

  async function handleSubmitRequest() {
    if (!reqForm.sport) { setReqError('Sukan wajib dipilih.'); return }
    const validLines = reqForm.lines.filter(l => l.supplement_id && l.quantity >= 1)
    if (validLines.length === 0) { setReqError('Sekurang-kurangnya 1 suplemen perlu dipilih.'); return }
    setReqSaving(true)
    setReqError(null)
    const rows = validLines.map(l => ({
      sport: reqForm.sport,
      supplement_id: l.supplement_id,
      quantity: l.quantity,
      requested_by: profile?.id,
    }))
    const { data, error } = await supabase.from('supplement_requests').insert(rows).select('id')
    if (error) { setReqError(error.message); setReqSaving(false); return }
    for (const row of data) {
      await logAction(profile!.id, 'submit_supplement_request', 'supplement_requests', row.id)
    }
    setReqSaving(false)
    setReqModal(false)
    fetchAll()
  }

  async function handleCoordinatorReview(id: string, status: 'semakan_lulus' | 'semakan_tolak') {
    setProcessingId(id)
    await supabase.from('supplement_requests').update({ status, coordinator_id: profile?.id }).eq('id', id)
    await logAction(profile!.id, status === 'semakan_lulus' ? 'koordinator_approve_supplement' : 'koordinator_reject_supplement', 'supplement_requests', id)
    await fetchAll()
    setProcessingId(null)
  }

  async function handleApproval(id: string, status: 'approved' | 'partial', approvedQuantity?: number) {
    setProcessingId(id)
    await supabase.from('supplement_requests').update({ status, reviewed_by: profile?.id, approved_quantity: approvedQuantity || null }).eq('id', id)
    await logAction(profile!.id, status === 'approved' ? 'approve_supplement' : 'approve_supplement_partial', 'supplement_requests', id)
    await fetchAll()
    setProcessingId(null)
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const filteredReqs = requests.filter(r => !filterStatus || r.status === filterStatus)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{supplements.length} jenis suplemen · {requests.length} permohonan</p>
        <div className="flex gap-2">
          {tab === 'inventory' && isAdmin && (
            <button onClick={openAddSup} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Tambah Suplemen
            </button>
          )}
          {tab === 'requests' && (
            <button onClick={openReqModal} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              + Permohonan Baharu
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['requests', 'inventory'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#888] hover:text-[#444]'}`}
          >
            {t === 'requests'
              ? <>Permohonan {pendingCount > 0 && <span className="ml-1.5 bg-[#F56A00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>}</>
              : 'Inventori'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
      ) : tab === 'inventory' ? (

        // ── Inventory Tab ──────────────────────────────────────
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {supplements.length === 0 ? (
            <div className="py-16 text-center text-[#888] text-sm">Tiada suplemen dalam inventori.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nama Suplemen', 'Stok', 'Unit', 'Tarikh Luput', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplements.map(s => {
                  const expiryDate = s.expiry_date ? new Date(s.expiry_date) : null
                  const daysUntilExpiry = expiryDate ? Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry < 30
                  return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[#111]">{s.name}</td>
                    <td className="px-5 py-3">
                      <span className={`font-bold font-mono ${s.stock <= 5 ? 'text-[#D44040]' : s.stock <= 20 ? 'text-[#F56A00]' : 'text-[#3A9E6A]'}`}>
                        {s.stock}
                      </span>
                      {s.stock <= 5 && <span className="ml-2 text-[10px] text-[#D44040] font-semibold">Stok rendah</span>}
                    </td>
                    <td className="px-5 py-3 text-[#888]">{s.unit}</td>
                    <td className={`px-5 py-3 ${isExpiringSoon ? 'text-[#D44040] font-semibold' : 'text-[#888]'}`}>
                      {expiryDate ? fmtDate(s.expiry_date!) : '—'}
                      {isExpiringSoon && <span className="ml-2 text-[10px] font-semibold">⚠️ Segera luput</span>}
                    </td>
                    <td className="px-5 py-3">
                      {isAdmin && (
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => openEditSup(s)} className="text-xs text-[#F56A00] hover:underline font-medium">Edit</button>
                          <button onClick={() => setConfirmDelSup(s)} className="text-xs text-[#D44040] hover:underline font-medium">Padam</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          )}
        </div>

      ) : (

        // ── Requests Tab ──────────────────────────────────────
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['', 'pending', 'semakan_lulus', 'semakan_tolak', 'approved', 'partial'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filterStatus === s ? 'bg-[#F56A00] text-white border-[#F56A00]' : 'bg-white text-[#888] border-gray-200 hover:border-[#F56A00] hover:text-[#F56A00]'}`}
              >
                {s === '' ? 'Semua' : statusLabel[s]}
                {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredReqs.length === 0 ? (
              <div className="py-16 text-center text-[#888] text-sm">Tiada permohonan.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Tarikh', 'Sukan', 'Suplemen', 'Kuantiti', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReqs.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{fmtDate(r.request_date)}</td>
                      <td className="px-5 py-3 font-medium text-[#111]">{r.sport ?? '—'}</td>
                      <td className="px-5 py-3 text-[#444]">{r.supplement?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-[#444]">{r.quantity} {r.supplement?.unit ?? ''}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[r.status]}`}>
                          {statusLabel[r.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 justify-end">
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCoordinatorReview(r.id, 'semakan_lulus')}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Sahkan'}
                              </button>
                              <button
                                onClick={() => handleCoordinatorReview(r.id, 'semakan_tolak')}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Tolak'}
                              </button>
                            </>
                          )}
                          {r.status === 'semakan_lulus' && (
                            <>
                              <button
                                onClick={() => handleApproval(r.id, 'approved')}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Lulus Penuh'}
                              </button>
                              <button
                                onClick={() => {
                                  setPartialRequest(r)
                                  setPartialQuantity(r.quantity)
                                  setPartialModal(true)
                                }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 disabled:opacity-60 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Lulus Sebahagian'}
                              </button>
                            </>
                          )}
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

      {/* Inventory Add/Edit Modal */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editingSup ? 'Edit Suplemen' : 'Tambah Suplemen'}</h3>
              <button onClick={() => setInvModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {supError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{supError}</div>}
              <Field label="Nama Suplemen" required>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} className={inputCls} placeholder="cth. PROTEIN POWDER" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stok">
                  <input type="number" value={supForm.stock} onChange={e => setSupForm(f => ({ ...f, stock: +e.target.value }))} className={inputCls} min={0} />
                </Field>
                <Field label="Unit">
                  <input value={supForm.unit} onChange={e => setSupForm(f => ({ ...f, unit: e.target.value.toUpperCase() }))} className={inputCls} placeholder="cth. BEG, TABLET" />
                </Field>
              </div>
              <Field label="Tarikh Luput (Pilihan)">
                <input type="date" value={supForm.expiry_date} onChange={e => setSupForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setInvModal(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSaveSup} disabled={supSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {supSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {reqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">Permohonan Suplemen</h3>
              <button onClick={() => setReqModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {reqError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{reqError}</div>}
              <Field label="Sukan" required>
                <select value={reqForm.sport} onChange={e => setReqForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih sukan —</option>
                  {[...new Set(athletes.map(a => a.sport))].sort().map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">
                  Senarai Suplemen <span className="text-[#D44040]">*</span>
                </label>
                <div className="space-y-2">
                  {reqForm.lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={line.supplement_id}
                        onChange={e => setReqLine(i, 'supplement_id', e.target.value)}
                        className="flex-1 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                      >
                        <option value="">— Pilih suplemen —</option>
                        {supplements.map(s => <option key={s.id} value={s.id}>{s.name} (Stok: {s.stock} {s.unit})</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => setReqLine(i, 'quantity', +e.target.value)}
                        className="w-24 bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white text-center shrink-0"
                        placeholder="Qty"
                      />
                      {reqForm.lines.length > 1 && (
                        <button
                          onClick={() => removeReqLine(i)}
                          className="text-[#D44040] hover:text-red-700 text-lg leading-none px-1 shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addReqLine}
                  className="mt-2 text-xs text-[#F56A00] hover:underline font-semibold"
                >
                  + Tambah Item
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setReqModal(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSubmitRequest} disabled={reqSaving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {reqSaving ? 'Menghantar...' : 'Hantar Permohonan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Supplement Confirmation */}
      {confirmDelSup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam suplemen ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{confirmDelSup.name}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelSup(null)} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition">Batal</button>
              <button onClick={() => handleDelSup(confirmDelSup)} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition">Padam</button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Approval Modal */}
      {partialModal && partialRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-[#111]">Lulus Sebahagian</p>
              <p className="text-[13px] text-[#888] mt-1">{partialRequest.supplement?.name}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Kuantiti Dimohon</label>
                <p className="text-lg font-bold text-[#111]">{partialRequest.quantity} {partialRequest.supplement?.unit}</p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Kuantiti Diluluskan</label>
                <input
                  type="number"
                  min={1}
                  max={partialRequest.quantity}
                  value={partialQuantity}
                  onChange={e => setPartialQuantity(Math.min(partialRequest.quantity, Math.max(1, +e.target.value)))}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setPartialModal(false)} disabled={partialSaving} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={async () => {
                  setPartialSaving(true)
                  await handleApproval(partialRequest.id, 'partial', partialQuantity)
                  setPartialModal(false)
                  setPartialSaving(false)
                }}
                disabled={partialSaving}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {partialSaving ? 'Menyimpan...' : 'Lulus Sebahagian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
