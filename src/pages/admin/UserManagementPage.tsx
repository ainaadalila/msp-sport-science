import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ReadOnlyBanner } from '../../components/ReadOnlyBanner'
import { isReadOnlyMode } from '../../lib/readOnlyMode'

interface UserProfile {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

const ROLES = ['superadmin', 'admin', 'coach', 'physio', 'medical', 'athlete'] as const
type Role = typeof ROLES[number]

const roleLabel: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Admin', coach: 'Jurulatih',
  physio: 'Fisioterapis', medical: 'Perubatan', athlete: 'Atlet',
}
const roleStyle: Record<string, string> = {
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-200',
  admin: 'bg-blue-50 text-[#3A7EC8] border border-blue-200',
  coach: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]',
  physio: 'bg-green-50 text-[#3A9E6A] border border-green-200',
  medical: 'bg-teal-50 text-teal-700 border border-teal-200',
  athlete: 'bg-gray-100 text-[#888] border border-gray-200',
}

export default function UserManagementPage() {
  const { profile: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const readOnly = isReadOnlyMode()

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [search, setSearch] = useState('')

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '' as Role })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  function openEdit(u: UserProfile) {
    setEditingUser(u)
    setEditForm({ full_name: u.full_name ?? '', role: u.role as Role })
    setSaveError(null)
  }

  async function handleSave() {
    if (!editingUser) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name || null, role: editForm.role })
      .eq('id', editingUser.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaving(false)
    setEditingUser(null)
    fetchUsers()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || (u.full_name ?? '').toLowerCase().includes(q)
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <ReadOnlyBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{users.length} pengguna berdaftar</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[13px] text-[#3A7EC8]">
        Pengguna baharu perlu mendaftar melalui halaman Log Masuk. Selepas mendaftar, tetapkan peranan mereka di sini.
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role).length
          return (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? '' : role)}
              className={`rounded-xl border px-3 py-2.5 text-center transition ${filterRole === role ? 'border-[#F56A00] bg-[rgba(245,106,0,0.06)]' : 'bg-white border-gray-200 hover:border-[#F56A00]'}`}
            >
              <p className="text-lg font-bold font-mono text-[#111]">{count}</p>
              <p className="text-[10px] text-[#888] mt-0.5">{roleLabel[role]}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Cari nama pengguna..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#111] placeholder-[#bbb] outline-none focus:border-[#F56A00] w-56"
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444] outline-none focus:border-[#F56A00]">
          <option value="">Semua Peranan</option>
          {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
        {(search || filterRole) && (
          <button onClick={() => { setSearch(''); setFilterRole('') }} className="px-3 py-2 text-xs text-[#888] hover:text-[#F56A00] border border-gray-200 rounded-lg transition">
            Kosongkan Penapis
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#888] text-sm">Memuatkan...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-[#888] text-sm">Tiada pengguna dijumpai.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nama', 'Peranan', 'Tarikh Daftar', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#888] px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#111]">{u.full_name || <span className="text-[#bbb] italic">Tiada nama</span>}</p>
                    <p className="text-[11px] text-[#888] font-mono mt-0.5">{u.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleStyle[u.role] ?? roleStyle.athlete}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[#888]">{fmtDate(u.created_at)}</td>
                  <td className="px-5 py-3">
                    {(isSuperAdmin || (currentUser?.role === 'admin' && u.role !== 'superadmin')) && u.id !== currentUser?.id && (
                      <button onClick={() => openEdit(u)} className="text-xs text-[#F56A00] hover:underline font-medium">
                        Edit Peranan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Edit Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saveError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{saveError}</div>}
              <div>
                <label className={labelCls}>Nama Penuh</label>
                <input
                  value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value.toUpperCase() }))}
                  className={inputCls}
                  placeholder="Nama pengguna"
                />
              </div>
              <div>
                <label className={labelCls}>Peranan</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}
                  className={inputCls}
                >
                  {ROLES.filter(r => isSuperAdmin || r !== 'superadmin').map(r => (
                    <option key={r} value={r}>{roleLabel[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving || readOnly} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'
