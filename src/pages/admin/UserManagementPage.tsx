import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createUserAdmin } from '../../lib/adminClient'
import { useAuth } from '../../context/AuthContext'
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel, isPasswordValid } from '../../lib/passwordValidator'
import type { ModulePermissions } from '../../types'

interface UserProfile {
  id: string
  full_name: string | null
  role: string
  module_permissions?: ModulePermissions
  created_at: string
}

const ROLES = ['superadmin', 'admin', 'coach', 'physio', 'psikologis', 'penolong_pegawai', 'pegawai_belia_sukan'] as const
type Role = typeof ROLES[number]

const roleLabel: Record<string, string> = {
  superadmin: 'Superadmin', admin: 'Admin', coach: 'Jurulatih',
  physio: 'Fisioterapis', psikologis: 'Psikologis', penolong_pegawai: 'Penolong Pegawai Belia & Sukan', pegawai_belia_sukan: 'Pegawai Belia & Sukan',
}
const roleStyle: Record<string, string> = {
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-200',
  admin: 'bg-blue-50 text-[#3A7EC8] border border-blue-200',
  coach: 'bg-[rgba(245,106,0,0.08)] text-[#F56A00] border border-[rgba(245,106,0,0.2)]',
  physio: 'bg-green-50 text-[#3A9E6A] border border-green-200',
  psikologis: 'bg-pink-50 text-pink-700 border border-pink-200',
  penolong_pegawai: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  pegawai_belia_sukan: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

export default function UserManagementPage() {
  const { profile: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'superadmin'

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [search, setSearch] = useState('')

  const emptyPermission = { read: false, create: false, update: false, delete: false }
  const readOnlyPermission = { read: true, create: false, update: false, delete: false }
  const crudPermission = { read: true, create: true, update: true, delete: true }

  const defaultModulePermissions: ModulePermissions = {
    athletes: crudPermission,
    strength: crudPermission,
    fitness: crudPermission,
    fitness_config: crudPermission,
    inbody: crudPermission,
    supplement: crudPermission,
    physio: crudPermission,
    physio_cases: crudPermission,
    psychology: crudPermission,
    reports: crudPermission,
    supplement_coordinator: false,
    supplement_supporter: false,
    supplement_approver: false,
  }

  function getDefaultModulesByRole(role: Role): ModulePermissions {
    if (role === 'superadmin' || role === 'admin') {
      return defaultModulePermissions
    }

    const base: ModulePermissions = {
      athletes: readOnlyPermission,
      strength: emptyPermission,
      fitness: emptyPermission,
      fitness_config: emptyPermission,
      inbody: emptyPermission,
      supplement: emptyPermission,
      physio: emptyPermission,
      physio_cases: emptyPermission,
      psychology: emptyPermission,
      reports: readOnlyPermission,
      supplement_coordinator: false,
      supplement_supporter: false,
      supplement_approver: false,
    }

    if (role === 'coach') {
      return { ...base, strength: crudPermission, fitness: crudPermission, inbody: readOnlyPermission, supplement: readOnlyPermission, physio: readOnlyPermission }
    } else if (role === 'physio') {
      return { ...base, inbody: readOnlyPermission, physio: crudPermission, physio_cases: crudPermission }
    } else if (role === 'psikologis') {
      return { ...base, psychology: crudPermission }
    }

    return base
  }

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '' as Role, module_permissions: {} as ModulePermissions })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [permissionTab, setPermissionTab] = useState<'utama' | 'kecergasan' | 'prestasi' | 'fisioterapi' | 'psikologi' | 'pelaporan'>('utama')

  const [createOpen, setCreateOpen] = useState(false)
  const getInitialCreateForm = () => {
    const role = 'admin' as Role
    return { email: '', full_name: '', password: '', role, showPw: false, module_permissions: getDefaultModulesByRole(role) }
  }
  const [createForm, setCreateForm] = useState(getInitialCreateForm())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(validatePassword(''))

  useEffect(() => { fetchUsers() }, [])

  // Reset create form when modal opens
  useEffect(() => {
    if (createOpen) {
      setCreateForm(getInitialCreateForm())
      setCreateError(null)
      setCreateSuccess(false)
    }
  }, [createOpen])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  function openEdit(u: UserProfile) {
    console.log('Opening edit for user:', u.full_name, 'Permissions:', u.module_permissions)
    setEditingUser(u)
    setEditForm({ full_name: u.full_name ?? '', role: u.role as Role, module_permissions: u.module_permissions || defaultModulePermissions })
    setSaveError(null)
  }

  async function handleSave() {
    if (!editingUser) return
    setSaving(true)
    setSaveError(null)
    // Use the edited module permissions, not role defaults
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name || null, role: editForm.role, module_permissions: editForm.module_permissions })
      .eq('id', editingUser.id)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaving(false)
    setEditingUser(null)
    fetchUsers()
  }

  async function handleCreate(e?: React.MouseEvent) {
    console.log('handleCreate called', e)
    e?.preventDefault()
    setCreateError(null)
    if (!createForm.email.trim() || !createForm.full_name.trim() || !createForm.password) {
      setCreateError('Sila isi semua medan.')
      return
    }
    if (!isPasswordValid(createForm.password)) {
      const strength = validatePassword(createForm.password)
      setCreateError(strength.errors[0] || 'Kata laluan tidak memenuhi persyaratan keamanan.')
      return
    }
    setCreating(true)
    // Always use the role to determine module permissions
    const finalModulePermissions = getDefaultModulesByRole(createForm.role)
    console.log('Creating user with role:', createForm.role, 'Permissions:', finalModulePermissions)
    try {
      console.log('Calling createUserAdmin...')
      await createUserAdmin(
        createForm.email.trim(),
        createForm.password,
        {
          full_name: createForm.full_name.trim().toUpperCase(),
          role: createForm.role,
        },
        finalModulePermissions
      )
      setCreating(false)
      setCreateSuccess(true)
      fetchUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user')
      setCreating(false)
    }
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#888]">{users.length} pengguna berdaftar</p>
        {isSuperAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition"
          >
            <span className="text-base leading-none">+</span> Buat Pengguna
          </button>
        )}
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
                  onChange={e => {
                    const newRole = e.target.value as Role
                    setEditForm(f => ({ ...f, role: newRole, module_permissions: getDefaultModulesByRole(newRole) }))
                  }}
                  className={inputCls}
                >
                  {ROLES.filter(r => isSuperAdmin || r !== 'superadmin').map(r => (
                    <option key={r} value={r}>{roleLabel[r]}</option>
                  ))}
                </select>
              </div>

              {/* Module Permissions Matrix - Tabbed */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest">Akses Modul</p>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                  {[
                    { id: 'utama', label: 'Utama' },
                    { id: 'kecergasan', label: 'Kecergasan' },
                    { id: 'prestasi', label: 'Prestasi' },
                    { id: 'fisioterapi', label: 'Fisioterapi' },
                    { id: 'psikologi', label: 'Psikologi' },
                    { id: 'pelaporan', label: 'Pelaporan' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setPermissionTab(tab.id as typeof permissionTab)}
                      className={`px-3 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                        permissionTab === tab.id
                          ? 'border-[#F56A00] text-[#F56A00]'
                          : 'border-transparent text-[#888] hover:text-[#111]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Permission Table for Active Tab */}
                <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                  {/* Header */}
                  <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-200">
                    <div className="px-3 py-2 font-semibold text-[11px] text-[#888]">Modul</div>
                    <div className="px-2 py-2 font-semibold text-[11px] text-[#888] text-center">Baca</div>
                    <div className="px-2 py-2 font-semibold text-[11px] text-[#888] text-center">Tambah</div>
                    <div className="px-2 py-2 font-semibold text-[11px] text-[#888] text-center">Kemaskini</div>
                    <div className="px-2 py-2 font-semibold text-[11px] text-[#888] text-center">Padam</div>
                  </div>
                  {/* Rows */}
                  {(() => {
                    const sections = [
                      { id: 'utama', items: [{ key: 'athletes' as const, label: 'Profil Atlet' }] },
                      { id: 'kecergasan', items: [{ key: 'strength' as const, label: 'Latihan Suaian Fizikal' }, { key: 'fitness' as const, label: 'Ujian Kecergasan' }, { key: 'fitness_config' as const, label: 'Konfigurasi Ujian' }] },
                      { id: 'prestasi', items: [{ key: 'inbody' as const, label: 'Penilaian InBody' }, { key: 'supplement' as const, label: 'Pengurusan Suplemen' }] },
                      { id: 'fisioterapi', items: [{ key: 'physio' as const, label: 'Saringan Fisioterapi' }, { key: 'physio_cases' as const, label: 'Pengurusan Kes' }] },
                      { id: 'psikologi', items: [{ key: 'psychology' as const, label: 'Penilaian Psikologi' }] },
                      { id: 'pelaporan', items: [{ key: 'reports' as const, label: 'Laporan' }] },
                    ]
                    const active = sections.find(s => s.id === permissionTab)
                    return active?.items.map(item => (
                      <div key={item.key} className="grid grid-cols-5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <div className="px-3 py-2 text-[12px] text-[#111]">{item.label}</div>
                        {(['read', 'create', 'update', 'delete'] as const).map(action => {
                          const perm = editForm.module_permissions[item.key]
                          const isChecked = typeof perm === 'boolean' ? false : perm[action]
                          return (
                            <div key={action} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const newPerm = typeof perm === 'boolean' ? { read: false, create: false, update: false, delete: false } : perm
                                  const updated = { ...newPerm, [action]: e.target.checked }
                                  if (action === 'read' && !e.target.checked) {
                                    updated.create = false
                                    updated.update = false
                                    updated.delete = false
                                  }
                                  setEditForm(f => ({ ...f, module_permissions: { ...f.module_permissions, [item.key]: updated } }))
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#F56A00' }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))
                  })()}
                </div>

                {/* Supplement Workflow Permissions */}
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest mt-4">Kebenaran Aliran Suplemen</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['supplement_coordinator', 'supplement_supporter', 'supplement_approver'] as const).map(m => {
                    const isChecked = editForm.module_permissions[m] || false
                    return (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typeof isChecked === 'boolean' ? isChecked : false}
                          onChange={e => setEditForm(f => ({ ...f, module_permissions: { ...f.module_permissions, [m]: e.target.checked } }))}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#F56A00' }}
                        />
                        <span className="text-sm text-[#666]">{moduleLabel[m]}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Buat Pengguna Baharu</h3>
              <button onClick={() => { setCreateOpen(false); setCreateForm({ email: '', full_name: '', password: '', role: 'admin', showPw: false, module_permissions: defaultModulePermissions }); setCreateError(null); setCreateSuccess(false) }}
                className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {createSuccess ? (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-700">
                  Pengguna berjaya dicipta.
                </div>
              ) : (
                <>
                  {createError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{createError}</div>}
                  <div>
                    <label className={labelCls}>E-mel</label>
                    <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="nama@msp.gov.my" />
                  </div>
                  <div>
                    <label className={labelCls}>Nama Penuh</label>
                    <input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value.toUpperCase() }))} className={inputCls} placeholder="NAMA PENGGUNA" />
                  </div>
                  <div>
                    <label className={labelCls}>Kata Laluan</label>
                    <div className="relative mb-2">
                      <input
                        type={createForm.showPw ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={e => {
                          setCreateForm(f => ({ ...f, password: e.target.value }))
                          setPasswordStrength(validatePassword(e.target.value))
                        }}
                        className={inputCls + ' pr-10'}
                        placeholder="Min. 8 aksara, huruf besar, kecil, nombor, dan aksara khas"
                      />
                      <button type="button" onClick={() => setCreateForm(f => ({ ...f, showPw: !f.showPw }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#111] text-xs">
                        {createForm.showPw ? 'Sembunyi' : 'Tunjuk'}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {createForm.password && (
                      <div className="space-y-2">
                        {/* Strength Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888]">Kekuatan Kata Laluan</span>
                            <span className="text-[11px] font-semibold" style={{ color: getPasswordStrengthColor(passwordStrength.strength) }}>
                              {getPasswordStrengthLabel(passwordStrength.strength)}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${(passwordStrength.score / 4) * 100}%`,
                                backgroundColor: getPasswordStrengthColor(passwordStrength.strength),
                              }}
                            />
                          </div>
                        </div>

                        {/* Requirements */}
                        {(passwordStrength.errors.length > 0 || passwordStrength.suggestions.length > 0) && (
                          <div className="space-y-1 pt-2 border-t border-gray-200">
                            {passwordStrength.errors.map((error, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-red-500 text-xs font-bold mt-0.5">✕</span>
                                <span className="text-[11px] text-red-600">{error}</span>
                              </div>
                            ))}
                            {passwordStrength.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-yellow-600 text-xs font-bold mt-0.5">◆</span>
                                <span className="text-[11px] text-yellow-600">{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Peranan</label>
                    <select value={createForm.role} onChange={e => {
                      const newRole = e.target.value as Role
                      setCreateForm(f => ({ ...f, role: newRole, module_permissions: getDefaultModulesByRole(newRole) }))
                    }} className={inputCls}>
                      {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select>
                  </div>

                  {/* Module Permissions */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest">Akses Modul</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['athletes', 'inbody', 'supplement', 'physio', 'fitness', 'strength', 'reports', 'psychology'] as const).map(m => {
                        const isChecked = createForm.module_permissions[m] || false
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setCreateForm(f => ({ ...f, module_permissions: { ...f.module_permissions, [m]: !f.module_permissions[m] } }))}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition cursor-pointer ${isChecked ? 'bg-orange-100 text-[#F56A00] border border-orange-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                          >
                            <span className="text-lg">{isChecked ? '✓' : '−'}</span>
                            {moduleLabel[m]}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[11px] font-semibold text-[#888] uppercase tracking-widest mt-3">Kebenaran Aliran Suplemen</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['supplement_coordinator', 'supplement_supporter', 'supplement_approver'] as const).map(m => {
                        const isChecked = createForm.module_permissions[m] || false
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setCreateForm(f => ({ ...f, module_permissions: { ...f.module_permissions, [m]: !f.module_permissions[m] } }))}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition cursor-pointer ${isChecked ? 'bg-orange-100 text-[#F56A00] border border-orange-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                          >
                            <span className="text-lg">{isChecked ? '✓' : '−'}</span>
                            {moduleLabel[m]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            {!createSuccess && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => { setCreateOpen(false); setCreateForm({ email: '', full_name: '', password: '', role: 'admin', showPw: false, module_permissions: defaultModulePermissions }); setCreateError(null); setCreateSuccess(false) }} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
                <button onClick={handleCreate} disabled={creating}
                  className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                  {creating ? 'Mencipta...' : 'Buat Pengguna'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const moduleLabel: Record<string, string> = {
  athletes: 'Profil Atlet',
  inbody: 'InBody',
  supplement: 'Suplemen',
  physio: 'Fisioterapi',
  fitness: 'Ujian Kecergasan',
  strength: 'Latihan Suaian Fizikal',
  reports: 'Laporan',
  psychology: 'Penilaian Psikologi',
  supplement_coordinator: 'Penyelaras Semak',
  supplement_supporter: 'Penyokong',
  supplement_approver: 'Pegawai Pelulus',
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5'
const inputCls = 'w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white'
