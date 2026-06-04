import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'
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
  sport: string
  supplement_id: string
  quantity: number
  request_date: string
  status: 'pending' | 'semakan_lulus' | 'semakan_tolak' | 'approved' | 'partial'
  requested_by: string | null
  reviewed_by: string | null
  coordinator_id: string | null
  coordinator_notes: string | null
  supporter_id: string | null
  supporter_status: 'sokong' | 'tidak_sokong' | null
  supporter_notes: string | null
  supporter_reviewed_at: string | null
  approved_quantity: number | null
  created_at: string
  supplement?: { name: string; unit: string }
}

interface Athlete {
  id: string
  name: string
  sport_id: string
  sport?: { name: string }
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
  const { can } = usePermissions()
  const isCoordinator = profile?.module_permissions?.supplement_coordinator ?? false
  const isSupporter = profile?.module_permissions?.supplement_supporter ?? false
  const isApprover = profile?.module_permissions?.supplement_approver ?? false

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
  const [deletingSup, setDeleteSup] = useState(false)

  // Request modal
  const [reqModal, setReqModal] = useState(false)
  const [reqForm, setReqForm] = useState<{ sport: string; lines: { supplement_id: string; quantity: number }[] }>({
    sport: '',
    lines: [{ supplement_id: '', quantity: 1 }],
  })
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)

  // Partial quantity for approval
  const [partialQuantity, setPartialQuantity] = useState(0)

  // Coordinator notes modal
  const [coordNotesModal, setCoordNotesModal] = useState(false)
  const [coordNotesRequest, setCoordNotesRequest] = useState<SupplementRequest | null>(null)
  const [coordNotesForm, setCoordNotesForm] = useState({ notes: '', decision: 'lulus' as 'lulus' | 'tolak' })
  const [coordNotesSaving, setCoordNotesSaving] = useState(false)
  const [coordNotesError, setCoordNotesError] = useState<string | null>(null)

  // Supporter action modal
  const [supporterModal, setSupporterModal] = useState(false)
  const [supporterRequest, setSupporterRequest] = useState<SupplementRequest | null>(null)
  const [supporterForm, setSupporterForm] = useState({ notes: '', decision: 'sokong' as 'sokong' | 'tidak_sokong' })
  const [supporterSaving, setSupporterSaving] = useState(false)
  const [supporterError, setSupporterError] = useState<string | null>(null)

  // Timeline view modal
  const [timelineModal, setTimelineModal] = useState(false)
  const [timelineRequest, setTimelineRequest] = useState<SupplementRequest | null>(null)

  // Approval notes modal
  const [approvalModal, setApprovalModal] = useState(false)
  const [approvalRequest, setApprovalRequest] = useState<SupplementRequest | null>(null)
  const [approvalForm, setApprovalForm] = useState({ notes: '', decision: 'approved' as 'approved' | 'partial' })
  const [approvalSaving, setApprovalSaving] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)

  // Action loading state
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Filters & Sorting
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc')

  useEffect(() => { fetchAll() }, [sortBy])

  async function fetchAll() {
    setLoading(true)
    const [supRes, reqRes, athRes] = await Promise.all([
      supabase.from('supplements').select('id, name, stock, unit, expiry_date').order('name'),
      supabase.from('supplement_requests')
        .select('id, sport, supplement_id, quantity, request_date, status, requested_by, reviewed_by, coordinator_id, coordinator_notes, supporter_id, supporter_status, supporter_notes, supporter_reviewed_at, approved_quantity, created_at, supplement:supplement_id(name, unit)')
        .order('created_at', { ascending: sortBy === 'date_asc' }),
      supabase.from('athletes').select('id, name, sport_id, sport:sport_id(name)').order('name'),
    ]) as any
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
    setDeleteSup(true)
    try {
      console.log('Starting delete for supplement:', s.id)
      const { error } = await supabase.from('supplements').delete().eq('id', s.id)
      console.log('Delete response:', { error })
      if (error) {
        console.error('Delete error:', error)
        setSupError(`Failed to delete: ${error.message}`)
        setDeleteSup(false)
        return
      }
      console.log('Delete successful, logging action and fetching...')
      await logAction(profile!.id, 'delete_supplement', 'supplements', s.id)
      setConfirmDelSup(null)
      await fetchAll()
      console.log('Fetch complete after delete')
    } catch (err) {
      console.error('Exception during delete:', err)
      setSupError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleteSup(false)
    }
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

  async function handleCoordinatorReview(id: string, decision: 'lulus' | 'tolak', notes?: string) {
    setProcessingId(id)
    const status = decision === 'lulus' ? 'semakan_lulus' : 'semakan_tolak'
    const { error: updateError } = await supabase.from('supplement_requests').update({ status, coordinator_id: profile?.id, coordinator_notes: notes || null }).eq('id', id)
    if (updateError) throw updateError
    await logAction(profile!.id, decision === 'lulus' ? 'koordinator_approve_supplement' : 'koordinator_reject_supplement', 'supplement_requests', id)
    await fetchAll()
    setProcessingId(null)
  }

  async function handleApproval(id: string, status: 'approved' | 'partial', approvedQuantity?: number, notes?: string) {
    setProcessingId(id)

    // Get the request to know which supplement and quantity to reduce
    const { data: request, error: reqError } = await supabase.from('supplement_requests').select('supplement_id, quantity, approved_quantity').eq('id', id).single()

    console.log('Request fetched:', request, 'Error:', reqError)

    if (request && request.supplement_id) {
      const quantityToReduce = status === 'partial' ? (approvedQuantity || request.quantity) : request.quantity

      console.log('Reducing inventory - supplement_id:', request.supplement_id, 'quantity:', quantityToReduce)

      // Reduce inventory
      try {
        const { data: sup, error: supError } = await supabase.from('supplements').select('stock').eq('id', request.supplement_id).single()
        console.log('Supplement data:', sup, 'Error:', supError)

        if (sup) {
          const newStock = Math.max(0, sup.stock - quantityToReduce)
          console.log('Updating stock from', sup.stock, 'to', newStock)

          const { error: updateError } = await supabase.from('supplements')
            .update({ stock: newStock })
            .eq('id', request.supplement_id)

          console.log('Stock update error:', updateError)
        }
      } catch (err) {
        console.error('Error reducing inventory:', err)
      }
    } else {
      console.error('Request data missing or no supplement_id:', request)
    }

    const updatePayload: any = { status, reviewed_by: profile?.id, approved_quantity: approvedQuantity || null }
    if (notes) updatePayload.reviewer_notes = notes
    const { error: updateError } = await supabase.from('supplement_requests').update(updatePayload).eq('id', id)
    if (updateError) throw updateError
    await logAction(profile!.id, status === 'approved' ? 'approve_supplement' : 'approve_supplement_partial', 'supplement_requests', id)
    await fetchAll()
    setProcessingId(null)
  }

  async function handleSupporterAction(id: string, decision: 'sokong' | 'tidak_sokong', notes?: string) {
    setProcessingId(id)
    const { error: updateError } = await supabase.from('supplement_requests').update({
      supporter_id: profile?.id,
      supporter_status: decision,
      supporter_notes: notes || null,
      supporter_reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    if (updateError) throw updateError
    await logAction(profile!.id, decision === 'sokong' ? 'supporter_approve_supplement' : 'supporter_reject_supplement', 'supplement_requests', id)
    await fetchAll()
    setProcessingId(null)
  }

  function getDisplayStatus(r: SupplementRequest): string {
    if (r.status === 'pending') return 'Menunggu Semakan'
    if (r.status === 'semakan_tolak') return 'Ditolak (Penyelaras)'
    if (r.status === 'semakan_lulus') {
      if (!r.supporter_status) return 'Menunggu Sokongan'
      if (r.supporter_status === 'sokong') return 'Menunggu Kelulusan'
      if (r.supporter_status === 'tidak_sokong') return 'Tidak Disokong'
    }
    if (r.status === 'approved') return 'Diluluskan'
    if (r.status === 'partial') return 'Diluluskan Sebahagian'
    return r.status
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const filteredReqs = requests.filter(r => !filterStatus || r.status === filterStatus)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{supplements.length} jenis suplemen · {requests.length} permohonan</p>
        <div className="flex gap-2">
          {tab === 'inventory' && can('supplement', 'create') && (
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
                      <div className="flex gap-3 justify-end">
                        {can('supplement', 'update') && <button onClick={() => openEditSup(s)} className="text-xs text-[#F56A00] hover:underline font-medium">Edit</button>}
                        {can('supplement', 'delete') && <button onClick={() => setConfirmDelSup(s)} className="text-xs text-[#D44040] hover:underline font-medium">Padam</button>}
                      </div>
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
                    <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">
                      <button
                        onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
                        className="flex items-center gap-2 hover:text-[#111] transition cursor-pointer"
                      >
                        Tarikh
                        {sortBy === 'date_desc' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        )}
                      </button>
                    </th>
                    {['Sukan', 'Suplemen', 'Kuantiti', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReqs.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-[12px] text-[#444] whitespace-nowrap">{fmtDate(r.request_date)}</td>
                      <td className="px-5 py-3 font-medium text-[#111]">{r.sport}</td>
                      <td className="px-5 py-3 text-[#444]">{r.supplement?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-[#444]">{r.quantity} {r.supplement?.unit ?? ''}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[r.status]}`}>
                          {getDisplayStatus(r)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setTimelineRequest(r); setTimelineModal(true) }}
                            className="text-xs font-semibold text-[#F56A00] border border-[#F56A00] hover:bg-orange-50 px-2.5 py-1 rounded-md transition"
                          >
                            Lihat
                          </button>
                          {r.status === 'pending' && isCoordinator && (
                            <>
                              <button
                                onClick={() => { setCoordNotesRequest(r); setCoordNotesForm({ notes: r.coordinator_notes || '', decision: 'lulus' }); setCoordNotesError(null); setCoordNotesModal(true) }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Sahkan'}
                              </button>
                              <button
                                onClick={() => { setCoordNotesRequest(r); setCoordNotesForm({ notes: r.coordinator_notes || '', decision: 'tolak' }); setCoordNotesError(null); setCoordNotesModal(true) }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Tolak'}
                              </button>
                            </>
                          )}
                          {r.status === 'semakan_lulus' && !r.supporter_status && isSupporter && (
                            <>
                              <button
                                onClick={() => { setSupporterRequest(r); setSupporterForm({ notes: '', decision: 'sokong' }); setSupporterError(null); setSupporterModal(true) }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Sokong'}
                              </button>
                              <button
                                onClick={() => { setSupporterRequest(r); setSupporterForm({ notes: '', decision: 'tidak_sokong' }); setSupporterError(null); setSupporterModal(true) }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Tidak Sokong'}
                              </button>
                            </>
                          )}
                          {r.status === 'semakan_lulus' && r.supporter_status === 'sokong' && isApprover && (
                            <>
                              <button
                                onClick={() => { setApprovalRequest(r); setApprovalForm({ notes: '', decision: 'approved' }); setApprovalError(null); setApprovalModal(true) }}
                                disabled={processingId === r.id}
                                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-wait px-2.5 py-1 rounded-md transition"
                              >
                                {processingId === r.id ? 'Memproses...' : 'Lulus Penuh'}
                              </button>
                              <button
                                onClick={() => {
                                  setApprovalRequest(r)
                                  setApprovalForm({ notes: '', decision: 'partial' })
                                  setApprovalError(null)
                                  setApprovalModal(true)
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[#111]">Permohonan Suplemen</h3>
              <button onClick={() => setReqModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {reqError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{reqError}</div>}
              <Field label="Sukan" required>
                <select value={reqForm.sport} onChange={e => setReqForm(f => ({ ...f, sport: e.target.value }))} className={inputCls}>
                  <option value="">— Pilih sukan —</option>
                  {[...new Set(athletes.map(a => a.sport?.name))].filter(Boolean).sort().map(s => (
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
                        {supplements.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <button onClick={() => setConfirmDelSup(null)} disabled={deletingSup} className="px-4 py-2 text-sm text-[#888] border border-gray-200 rounded-lg hover:border-gray-400 transition disabled:opacity-50">Batal</button>
              <button onClick={() => handleDelSup(confirmDelSup)} disabled={deletingSup} className="px-4 py-2 text-sm font-semibold text-white bg-[#D44040] hover:bg-red-700 rounded-lg transition disabled:opacity-60">{deletingSup ? 'Padam...' : 'Padam'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Coordinator Notes Modal */}
      {coordNotesModal && coordNotesRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-[#111]">{coordNotesForm.decision === 'lulus' ? 'Sahkan' : 'Tolak'} Permohonan</p>
              <div className="mt-2 space-y-1">
                <p className="text-[13px] text-[#444] font-medium">{coordNotesRequest.supplement?.name}</p>
                <p className="text-[12px] text-[#888]">Sukan: <span className="font-semibold text-[#111]">{coordNotesRequest.sport}</span></p>
                <p className="text-[12px] text-[#888]">Kuantiti: <span className="font-semibold text-[#111]">{coordNotesRequest.quantity} {coordNotesRequest.supplement?.unit}</span></p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {coordNotesError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{coordNotesError}</div>}
              <div>
                <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Ulasan (Pilihan)</label>
                <textarea
                  value={coordNotesForm.notes}
                  onChange={e => setCoordNotesForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Masukkan ulasan anda..."
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm resize-none h-24 outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setCoordNotesModal(false)} disabled={coordNotesSaving} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={async () => {
                  setCoordNotesSaving(true)
                  setCoordNotesError(null)
                  try {
                    await handleCoordinatorReview(coordNotesRequest.id, coordNotesForm.decision, coordNotesForm.notes)
                    setCoordNotesModal(false)
                  } catch (err) {
                    setCoordNotesError(err instanceof Error ? err.message : 'Ralat semasa menyimpan')
                  } finally {
                    setCoordNotesSaving(false)
                  }
                }}
                disabled={coordNotesSaving}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 ${coordNotesForm.decision === 'lulus' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {coordNotesSaving ? 'Menyimpan...' : (coordNotesForm.decision === 'lulus' ? 'Sahkan' : 'Tolak')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supporter Action Modal */}
      {supporterModal && supporterRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-[#111]">{supporterForm.decision === 'sokong' ? 'Sokong' : 'Tidak Sokong'} Permohonan</p>
              <div className="mt-2 space-y-1">
                <p className="text-[13px] text-[#444] font-medium">{supporterRequest.supplement?.name}</p>
                <p className="text-[12px] text-[#888]">Sukan: <span className="font-semibold text-[#111]">{supporterRequest.sport}</span></p>
                <p className="text-[12px] text-[#888]">Kuantiti: <span className="font-semibold text-[#111]">{supporterRequest.quantity} {supporterRequest.supplement?.unit}</span></p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {supporterError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{supporterError}</div>}
              {supporterRequest.coordinator_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-1">Ulasan Penyelaras Semak</p>
                  <p className="text-[13px] text-blue-900">"{supporterRequest.coordinator_notes}"</p>
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Ulasan Anda (Pilihan)</label>
                <textarea
                  value={supporterForm.notes}
                  onChange={e => setSupporterForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Masukkan ulasan anda..."
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm resize-none h-24 outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setSupporterModal(false)} disabled={supporterSaving} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={async () => {
                  setSupporterSaving(true)
                  setSupporterError(null)
                  try {
                    await handleSupporterAction(supporterRequest.id, supporterForm.decision, supporterForm.notes)
                    setSupporterModal(false)
                  } catch (err) {
                    setSupporterError(err instanceof Error ? err.message : 'Ralat semasa menyimpan')
                  } finally {
                    setSupporterSaving(false)
                  }
                }}
                disabled={supporterSaving}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 ${supporterForm.decision === 'sokong' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {supporterSaving ? 'Menyimpan...' : (supporterForm.decision === 'sokong' ? 'Sokong' : 'Tidak Sokong')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline View Modal */}
      {timelineModal && timelineRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <p className="text-sm font-semibold text-[#111]">Aliran Permohonan</p>
                <p className="text-[13px] text-[#888] mt-1">{timelineRequest.supplement?.name} — {timelineRequest.quantity} {timelineRequest.supplement?.unit}</p>
              </div>
              <button onClick={() => setTimelineModal(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Step 1: Penyelaras Semak */}
              <div className="border-l-2 pl-4" style={{ borderColor: timelineRequest.status !== 'pending' ? '#F56A00' : '#E8E8E8' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${timelineRequest.status !== 'pending' ? 'bg-[#F56A00]' : 'bg-[#E8E8E8]'}`} />
                  <p className="text-sm font-semibold text-[#111]">Penyelaras Semak</p>
                  {timelineRequest.status !== 'pending' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${timelineRequest.status === 'semakan_tolak' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>
                      {timelineRequest.status === 'semakan_tolak' ? 'Ditolak' : 'Lulus'}
                    </span>
                  )}
                </div>
                {timelineRequest.status !== 'pending' && (
                  <div className="text-[13px] text-[#888] space-y-1">
                    <p>Keputusan pada: {fmtDate(timelineRequest.request_date)}</p>
                    {timelineRequest.coordinator_notes && <p className="italic text-[#444]">"{timelineRequest.coordinator_notes}"</p>}
                  </div>
                )}
                {timelineRequest.status === 'pending' && <p className="text-[13px] text-[#888]">Menunggu semakan...</p>}
              </div>

              {/* Step 2: Penyokong */}
              <div className="border-l-2 pl-4" style={{ borderColor: timelineRequest.supporter_status ? '#F56A00' : '#E8E8E8' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${timelineRequest.supporter_status ? 'bg-[#F56A00]' : 'bg-[#E8E8E8]'}`} />
                  <p className="text-sm font-semibold text-[#111]">Penyokong</p>
                  {timelineRequest.supporter_status && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${timelineRequest.supporter_status === 'tidak_sokong' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {timelineRequest.supporter_status === 'tidak_sokong' ? 'Tidak Sokong' : 'Sokong'}
                    </span>
                  )}
                </div>
                {timelineRequest.supporter_status && (
                  <div className="text-[13px] text-[#888] space-y-1">
                    <p>Keputusan pada: {timelineRequest.supporter_reviewed_at ? fmtDate(timelineRequest.supporter_reviewed_at) : '—'}</p>
                    {timelineRequest.supporter_notes && <p className="italic text-[#444]">"{timelineRequest.supporter_notes}"</p>}
                  </div>
                )}
                {timelineRequest.status === 'semakan_lulus' && !timelineRequest.supporter_status && <p className="text-[13px] text-[#888]">Menunggu sokongan...</p>}
                {(timelineRequest.status === 'pending' || timelineRequest.status === 'semakan_tolak') && <p className="text-[13px] text-[#888]">Belum dimulai</p>}
              </div>

              {/* Step 3: Pegawai Pelulus */}
              <div className="border-l-2 pl-4" style={{ borderColor: timelineRequest.status === 'approved' || timelineRequest.status === 'partial' ? '#F56A00' : '#E8E8E8' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${timelineRequest.status === 'approved' || timelineRequest.status === 'partial' ? 'bg-[#F56A00]' : 'bg-[#E8E8E8]'}`} />
                  <p className="text-sm font-semibold text-[#111]">Pegawai Pelulus</p>
                  {(timelineRequest.status === 'approved' || timelineRequest.status === 'partial') && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${timelineRequest.status === 'partial' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {timelineRequest.status === 'partial' ? 'Lulus Sebahagian' : 'Lulus Penuh'}
                    </span>
                  )}
                </div>
                {(timelineRequest.status === 'approved' || timelineRequest.status === 'partial') && (
                  <div className="text-[13px] text-[#888]">
                    <p>Keputusan: {timelineRequest.status === 'partial' ? `${timelineRequest.approved_quantity} ${timelineRequest.supplement?.unit}` : `${timelineRequest.quantity} ${timelineRequest.supplement?.unit}`}</p>
                  </div>
                )}
                {timelineRequest.status === 'semakan_lulus' && timelineRequest.supporter_status === 'sokong' && <p className="text-[13px] text-[#888]">Menunggu kelulusan...</p>}
                {(timelineRequest.status === 'pending' || timelineRequest.status === 'semakan_tolak' || (timelineRequest.status === 'semakan_lulus' && !timelineRequest.supporter_status)) && <p className="text-[13px] text-[#888]">Belum dimulai</p>}
                {timelineRequest.status === 'semakan_lulus' && timelineRequest.supporter_status === 'tidak_sokong' && <p className="text-[13px] text-[#888]">Tidak dilanjutkan</p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setTimelineModal(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Notes Modal */}
      {approvalModal && approvalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-[#111]">{approvalForm.decision === 'approved' ? 'Lulus Penuh' : 'Lulus Sebahagian'}</p>
              <div className="mt-2 space-y-1">
                <p className="text-[13px] text-[#444] font-medium">{approvalRequest.supplement?.name}</p>
                <p className="text-[12px] text-[#888]">Sukan: <span className="font-semibold text-[#111]">{approvalRequest.sport}</span></p>
                <p className="text-[12px] text-[#888]">Kuantiti: <span className="font-semibold text-[#111]">{approvalRequest.quantity} {approvalRequest.supplement?.unit}</span></p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {approvalError && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{approvalError}</div>}
              {approvalRequest.coordinator_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-1">Ulasan Penyelaras Semak</p>
                  <p className="text-[13px] text-blue-900">"{approvalRequest.coordinator_notes}"</p>
                </div>
              )}
              {approvalRequest.supporter_notes && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-600 mb-1">Ulasan Penyokong</p>
                  <p className="text-[13px] text-purple-900">"{approvalRequest.supporter_notes}"</p>
                </div>
              )}
              {approvalForm.decision === 'partial' && (
                <div>
                  <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Kuantiti Diluluskan</label>
                  <input
                    type="number"
                    min={1}
                    max={approvalRequest.quantity}
                    value={partialQuantity}
                    onChange={e => setPartialQuantity(Math.min(approvalRequest.quantity, Math.max(1, +e.target.value)))}
                    className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-[#888] uppercase mb-2">Ulasan (Pilihan)</label>
                <textarea
                  value={approvalForm.notes}
                  onChange={e => setApprovalForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Masukkan ulasan anda..."
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm resize-none h-24 outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setApprovalModal(false)} disabled={approvalSaving} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button
                onClick={async () => {
                  setApprovalSaving(true)
                  setApprovalError(null)
                  try {
                    const approvedQty = approvalForm.decision === 'partial' ? partialQuantity : undefined
                    await handleApproval(approvalRequest.id, approvalForm.decision, approvedQty, approvalForm.notes)
                    setApprovalModal(false)
                  } catch (err) {
                    setApprovalError(err instanceof Error ? err.message : 'Ralat semasa menyimpan')
                  } finally {
                    setApprovalSaving(false)
                  }
                }}
                disabled={approvalSaving}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 ${approvalForm.decision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {approvalSaving ? 'Menyimpan...' : (approvalForm.decision === 'approved' ? 'Lulus Penuh' : 'Lulus Sebahagian')}
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
