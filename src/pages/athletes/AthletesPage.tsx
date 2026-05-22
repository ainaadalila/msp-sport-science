import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AthletesTableSkeleton } from '../../components/Skeleton'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { logAction } from '../../lib/audit'

interface Athlete {
  id: string
  name: string
  ic_number: string
  date_of_birth: string | null
  gender: 'M' | 'F' | null
  sport: string
  category: string | null
  status: 'active' | 'rest' | 'injured'
  weight: number | null
  height: number | null
  photo_url: string | null
  is_elite: boolean
  created_at: string
}

interface FormState {
  name: string
  ic_number: string
  date_of_birth: string
  gender: 'M' | 'F' | ''
  sport: string
  category: string
  status: 'active' | 'rest' | 'injured'
  weight: number | null
  height: number | null
  photo_url: string | null
  is_elite: boolean
}

const emptyForm: FormState = {
  name: '',
  ic_number: '',
  date_of_birth: '',
  gender: '',
  sport: '',
  category: '',
  status: 'active',
  weight: null,
  height: null,
  photo_url: null,
  is_elite: false,
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  active: {
    label: 'AKTIF',
    cls: 'bg-green-50 text-[#3A9E6A] border border-green-200',
    icon: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  rest: {
    label: 'REHAT',
    cls: 'bg-gray-100 text-[#888] border border-gray-200',
    icon: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  injured: {
    label: 'CEDERA',
    cls: 'bg-red-50 text-[#D44040] border border-red-200',
    icon: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
}

function StatusBadge({ status }: { status: 'active' | 'rest' | 'injured' }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function formatIC(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 6) return digits
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
}

function dobFromIC(ic: string): string {
  const digits = ic.replace(/\D/g, '')
  if (digits.length < 6) return ''
  const yy = parseInt(digits.slice(0, 2), 10)
  const mm = digits.slice(2, 4)
  const dd = digits.slice(4, 6)
  const currentYY = new Date().getFullYear() % 100
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy
  const date = new Date(`${year}-${mm}-${dd}`)
  if (isNaN(date.getTime())) return ''
  return `${year}-${mm}-${dd}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AthletesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin'
  const navigate = useNavigate()

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [filterElite, setFilterElite] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Athlete | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Athlete | null>(null)

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchAthletes() }, [])

  async function fetchAthletes() {
    setLoading(true)
    const { data, error } = await supabase.from('athletes').select('*').order('name')
    if (!error) setAthletes(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(a: Athlete) {
    setEditing(a)
    setForm({
      name: a.name,
      ic_number: a.ic_number,
      date_of_birth: a.date_of_birth ?? '',
      gender: a.gender ?? '',
      sport: a.sport,
      category: a.category ?? '',
      status: a.status,
      weight: a.weight,
      height: a.height,
      photo_url: a.photo_url,
      is_elite: a.is_elite,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('athlete-photos').upload(path, file, { upsert: true })
    if (error) { setError(error.message); setUploading(false); return }
    const { data } = supabase.storage.from('athlete-photos').getPublicUrl(path)
    setForm(f => ({ ...f, photo_url: data.publicUrl }))
    setUploading(false)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.ic_number.trim() || !form.sport.trim()) {
      setError('Nama, No. IC, dan Sukan wajib diisi.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      ic_number: form.ic_number.trim(),
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      sport: form.sport.trim(),
      category: form.category || null,
      status: form.status,
      weight: form.weight,
      height: form.height,
      photo_url: form.photo_url,
      is_elite: form.is_elite,
    }

    if (editing) {
      const { error } = await supabase.from('athletes').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'update_athlete', 'athletes', editing.id)
    } else {
      const { data, error } = await supabase.from('athletes').insert(payload).select('id').single()
      if (error) { setError(error.message); setSaving(false); return }
      await logAction(profile!.id, 'create_athlete', 'athletes', data.id)
    }

    setSaving(false)
    setModalOpen(false)
    fetchAthletes()
  }

  async function handleDelete(a: Athlete) {
    const { error } = await supabase.from('athletes').delete().eq('id', a.id)
    if (!error) {
      await logAction(profile!.id, 'delete_athlete', 'athletes', a.id)
      setConfirmDelete(null)
      fetchAthletes()
    }
  }

  const sports = [...new Set(athletes.map(a => a.sport))].sort()

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.ic_number.includes(q) || a.sport.toLowerCase().includes(q)
    const matchStatus = !filterStatus || a.status === filterStatus
    const matchSport = !filterSport || a.sport === filterSport
    const matchElite = !filterElite || a.is_elite
    return matchSearch && matchStatus && matchSport && matchElite
  })

  const totalSports = new Set(athletes.map(a => a.sport)).size
  const maleAthletes = athletes.filter(a => a.gender === 'M').length
  const femaleAthletes = athletes.filter(a => a.gender === 'F').length
  const activeAthletes = athletes.filter(a => a.status === 'active').length
  const injuredAthletes = athletes.filter(a => a.status === 'injured').length

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{athletes.length} atlet terdaftar</p>
        {isAdmin && (
          <button onClick={openAdd} className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + Tambah Atlet
          </button>
        )}
      </div>

      {/* Stat cards */}
      {!loading && athletes.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Jumlah Sukan */}
          <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">Jumlah Sukan</p>
            <p className="text-3xl font-bold font-mono text-[#111] mb-1">{totalSports}</p>
            <p className="text-[11px] text-[#888]">Sukan aktif dalam sistem</p>
          </div>

          {/* Jumlah Atlet — with gender breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">Jumlah Atlet</p>
            <p className="text-3xl font-bold font-mono text-[#111] mb-2">{athletes.length}</p>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#3A7EC8]">L</span>
                <span className="text-[13px] font-bold font-mono text-[#111]">{maleAthletes}</span>
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#D44040]">P</span>
                <span className="text-[13px] font-bold font-mono text-[#111]">{femaleAthletes}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#888]">Terdaftar dalam sistem</p>
          </div>

          {/* Atlet Aktif */}
          <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">Atlet Aktif</p>
            <p className="text-3xl font-bold font-mono text-[#3A9E6A] mb-1">{activeAthletes}</p>
            <p className="text-[11px] text-[#888]">
              {athletes.length > 0 ? `${Math.round((activeAthletes / athletes.length) * 100)}% daripada jumlah` : '—'}
            </p>
          </div>

          {/* Kecederaan */}
          <div className="bg-white rounded-xl border border-gray-200 border-t-4 border-t-[#F56A00] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#888] mb-2">Kecederaan</p>
            <p className={`text-3xl font-bold font-mono mb-1 ${injuredAthletes > 0 ? 'text-[#D44040]' : 'text-[#111]'}`}>{injuredAthletes}</p>
            <p className="text-[11px] text-[#888]">Atlet berstatus cedera</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {sports.length > 0 && (
          <select value={filterSport} onChange={e => setFilterSport(e.target.value)} className={filterCls}>
            <option value="">Semua Sukan</option>
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={filterCls}>
          <option value="">Semua Status</option>
          <option value="active">AKTIF</option>
          <option value="rest">REHAT</option>
          <option value="injured">CEDERA</option>
        </select>
        <input
          type="text"
          placeholder="Cari nama, IC, sukan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#F56A00] flex-1 min-w-0 md:w-64"
        />
        <button
          onClick={() => setFilterElite(v => !v)}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${filterElite ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200 text-[#888] hover:border-[#F56A00]'}`}
        >
          Atlet Elit
        </button>
      </div>

      {/* Table */}
      {loading && <AthletesTableSkeleton />}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(245,106,0,0.1)] flex items-center justify-center">
              {athletes.length === 0 ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F56A00" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="16" y1="11" x2="22" y2="11"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F56A00" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#111] mb-1.5">
                {athletes.length === 0 ? 'Tiada atlet didaftarkan lagi' : 'Tiada rekod sepadan carian'}
              </p>
              <p className="text-[12px] text-[#888] leading-relaxed">
                {athletes.length === 0
                  ? 'Mulakan dengan mendaftarkan atlet pertama anda.'
                  : 'Cuba ubah kata carian atau tetapan penapis anda.'
                }
              </p>
            </div>
            {athletes.length === 0 && isAdmin && (
              <button
                onClick={openAdd}
                className="bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                + Tambah Atlet Pertama
              </button>
            )}
            {athletes.length > 0 && (
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterSport('') }}
                className="text-sm text-[#F56A00] hover:underline font-medium"
              >
                Kosongkan carian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Atlet', 'No. IC', 'Jantina', 'Sukan', 'Kategori/Acara', 'Status', 'Atlet Elit', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/athletes/${a.id}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer group"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={a.name} url={a.photo_url} size={32} />
                        <div>
                          <span className="font-medium text-[#111] group-hover:text-[#F56A00] transition">{a.name}</span>
                          {a.date_of_birth && <p className="text-[11px] text-[#888] mt-0.5">{fmtDate(a.date_of_birth)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-[#444]">{a.ic_number}</td>
                    <td className="px-5 py-3 text-[#444]">{a.gender ?? '—'}</td>
                    <td className="px-5 py-3 text-[#444]">{a.sport}</td>
                    <td className="px-5 py-3 text-[#888]">{a.category ?? '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3">
                      {a.is_elite && (
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">
                          ATLET ELIT
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3 justify-end items-center">
                        {isAdmin && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); openEdit(a) }}
                              className="text-xs text-[#F56A00] hover:underline font-medium opacity-0 group-hover:opacity-100 transition"
                            >Edit</button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDelete(a) }}
                              className="text-xs text-[#D44040] hover:underline font-medium opacity-0 group-hover:opacity-100 transition"
                            >Padam</button>
                          </>
                        )}
                        <svg className="w-3.5 h-3.5 text-[#bbb] group-hover:text-[#F56A00] transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">{editing ? 'Edit Atlet' : 'Tambah Atlet Baru'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{error}</div>}

              {/* Photo upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar name={form.name || '?'} url={form.photo_url} size={80} />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                </div>
                <p className="text-[11px] text-[#888]">
                  {uploading ? 'Memuat naik...' : 'Klik untuk muat naik gambar'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]) }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Nama Penuh" required>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} className={inputCls} placeholder="NAMA ATLET" />
                  </Field>
                </div>
                <Field label="No. Kad Pengenalan" required>
                  <input value={form.ic_number} onChange={e => {
                    const ic = formatIC(e.target.value)
                    const dob = dobFromIC(ic)
                    setForm(f => ({ ...f, ic_number: ic, ...(dob ? { date_of_birth: dob } : {}) }))
                  }} className={inputCls} placeholder="000000-00-0000" maxLength={14} />
                </Field>
                <Field label="Tarikh Lahir">
                  <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Jantina">
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as FormState['gender'] }))} className={inputCls}>
                    <option value="">— Pilih —</option>
                    <option value="M">LELAKI</option>
                    <option value="F">PEREMPUAN</option>
                  </select>
                </Field>
                <Field label="Sukan" required>
                  <input value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value.toUpperCase() }))} className={inputCls} placeholder="BADMINTON" />
                </Field>
                <Field label="Kategori / Acara">
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value.toUpperCase() }))} className={inputCls} placeholder="LELAKI BAWAH 21" />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState['status'] }))} className={inputCls}>
                    <option value="active">AKTIF</option>
                    <option value="rest">REHAT</option>
                    <option value="injured">CEDERA</option>
                  </select>
                </Field>
                <Field label="Berat (kg)">
                  <input type="number" step="0.1" value={form.weight ?? ''} onChange={e => setForm(f => ({ ...f, weight: e.target.value ? +e.target.value : null }))} className={inputCls} placeholder="0.0" />
                </Field>
                <Field label="Tinggi (cm)">
                  <input type="number" step="0.1" value={form.height ?? ''} onChange={e => setForm(f => ({ ...f, height: e.target.value ? +e.target.value : null }))} className={inputCls} placeholder="0.0" />
                </Field>
                <div className="col-span-2 flex items-center justify-between bg-[#F5F5F7] rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#111]">Atlet Elit</p>
                    <p className="text-[11px] text-[#888]">Tandakan jika atlet ini merupakan atlet elit</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_elite: !f.is_elite }))}
                    className={`relative w-11 h-6 rounded-full transition ${form.is_elite ? 'bg-[#F56A00]' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_elite ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving || uploading} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm font-semibold text-[#111] mb-1">Padam atlet ini?</p>
            <p className="text-[13px] text-[#888] mb-6">{confirmDelete.name} akan dipadam secara kekal.</p>
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

function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  const fontSize = size < 40 ? 'text-[11px]' : 'text-xl'
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0 bg-gray-100"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-[rgba(245,106,0,0.12)] text-[#F56A00] font-bold ${fontSize} flex items-center justify-center shrink-0`}
    >
      {initials(name)}
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
