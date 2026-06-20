import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { UserRole } from '../../types'

interface AuditLogWithProfile {
  id: string
  user_id: string
  action: string
  target_table: string | null
  target_id: string | null
  ip_address: string | null
  created_at: string
  profile: { full_name: string; role: UserRole } | null
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Log Masuk',
  logout: 'Log Keluar',
  create_athlete: 'Tambah Atlet',
  update_athlete: 'Kemaskini Atlet',
  delete_athlete: 'Padam Atlet',
  create_sc_session: 'Rekod Sesi S&C',
  update_sc_session: 'Kemaskini Sesi S&C',
  create_sc_program: 'Tambah Program S&C',
  update_sc_program: 'Kemaskini Program S&C',
  update_coach_assignment: 'Tugasan Jurulatih',
  create_coach_assignment: 'Tugasan Jurulatih Baharu',
  create_physio_slot: 'Buat Slot Fisio',
  update_physio_slot: 'Kemaskini Slot Fisio',
  delete_physio_slot: 'Padam Slot Fisio',
  mark_arrived_physio_slot: 'Atlet Hadir Fisio',
  create_physio_case: 'Buka Kes Fisio',
  close_physio_case: 'Tutup Kes Fisio',
  delete_physio_case: 'Padam Kes Fisio',
  open_physio_case: 'Buka Semula Kes Fisio',
  create_inbody: 'Rekod InBody',
  update_inbody: 'Kemaskini InBody',
  upload_inbody_diet_plan: 'Muat Naik Pelan Diet',
  delete_inbody_diet_plan: 'Padam Pelan Diet',
  create_supplement: 'Tambah Suplemen',
  update_supplement: 'Kemaskini Suplemen',
  submit_supplement_request: 'Mohon Suplemen',
  koordinator_approve_supplement: 'Lulus Permohonan (Penyelaras)',
  koordinator_reject_supplement: 'Tolak Permohonan (Penyelaras)',
  approve_supplement: 'Lulus Suplemen',
  approve_supplement_partial: 'Lulus Sebahagian Suplemen',
  supporter_approve_supplement: 'Sokong Suplemen',
  supporter_reject_supplement: 'Tidak Sokong Suplemen',
  draft_fitness_tests: 'Draf Ujian Kecergasan',
  submit_fitness_tests: 'Hantar Ujian Kecergasan',
}

const ACTION_CATEGORIES: Record<string, string[]> = {
  'Log Masuk & Keluar': ['login', 'logout'],
  'Atlet': ['create_athlete', 'update_athlete', 'delete_athlete'],
  'Fisio': ['create_physio_slot', 'update_physio_slot', 'delete_physio_slot', 'mark_arrived_physio_slot', 'create_physio_case', 'close_physio_case', 'delete_physio_case', 'open_physio_case'],
  'InBody': ['create_inbody', 'update_inbody', 'upload_inbody_diet_plan', 'delete_inbody_diet_plan'],
  'Suplemen': ['create_supplement', 'update_supplement', 'submit_supplement_request', 'koordinator_approve_supplement', 'koordinator_reject_supplement', 'approve_supplement', 'approve_supplement_partial', 'supporter_approve_supplement', 'supporter_reject_supplement'],
  'S&C': ['create_sc_session', 'update_sc_session', 'create_sc_program', 'update_sc_program', 'update_coach_assignment', 'create_coach_assignment'],
  'Kecergasan': ['draft_fitness_tests', 'submit_fitness_tests'],
}

const TABLE_LABELS: Record<string, string> = {
  athletes: 'Atlet',
  physio_slots: 'Slot Fisio',
  physio_cases: 'Kes Fisio',
  inbody_records: 'InBody',
  supplements: 'Suplemen',
  supplement_requests: 'Permohonan Suplemen',
  strength_conditioning: 'Latihan S&C',
  sc_programs: 'Program S&C',
  fitness_test_sessions: 'Ujian Kecergasan',
  coach_assignments: 'Tugasan Jurulatih',
  profiles: 'Pengguna',
}

const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-orange-100 text-orange-700 border-orange-200',
  admin: 'bg-orange-100 text-orange-700 border-orange-200',
  coach: 'bg-blue-100 text-blue-700 border-blue-200',
  physio: 'bg-purple-100 text-purple-700 border-purple-200',
  psikologis: 'bg-pink-100 text-pink-700 border-pink-200',
  penolong_pegawai: 'bg-gray-100 text-gray-700 border-gray-200',
  pegawai_belia_sukan: 'bg-gray-100 text-gray-700 border-gray-200',
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  coach: 'Jurulatih',
  physio: 'Fisioterapi',
  psikologis: 'Psikologi',
  penolong_pegawai: 'Penolong Pegawai',
  pegawai_belia_sukan: 'Pegawai Belia & Sukan',
}

export default function AuditLogPage() {
  const LOGS_PER_PAGE = 50
  const [logs, setLogs] = useState<AuditLogWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterUser, setFilterUser] = useState('all')

  useEffect(() => { setCurrentPage(1) }, [filterDateRange, filterCategory, filterUser])

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, target_table, target_id, ip_address, created_at, profile:profiles!user_id(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (!error && data) {
        setLogs(data as unknown as AuditLogWithProfile[])
      }
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filterDateRange) {
      case 'today':
        return today
      case '7days':
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return sevenDaysAgo
      case '30days':
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return thirtyDaysAgo
      default:
        return new Date(0)
    }
  }

  const filtered = logs.filter(log => {
    const logDate = new Date(log.created_at)
    const minDate = getDateRange()
    if (logDate < minDate) return false

    if (filterCategory !== 'all') {
      const categoryActions = ACTION_CATEGORIES[filterCategory]
      if (!categoryActions.includes(log.action)) return false
    }

    if (filterUser !== 'all' && log.user_id !== filterUser) return false

    return true
  })

  const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE)
  const pagedLogs = filtered.slice((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE)

  const users = Array.from(
    new Map(logs.map(l => [l.user_id, { id: l.user_id, name: l.profile?.full_name || 'Unknown' }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const handleRefresh = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, target_table, target_id, ip_address, created_at, profile:profiles!user_id(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (!error && data) {
      setLogs(data as unknown as AuditLogWithProfile[])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Log Audit</h1>
          <p className="text-sm text-[#888] mt-1">Lihat semua aktiviti sistem</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
        >
          {loading ? 'Memuatkan...' : 'Muat Semula'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-[#111] mb-4">Penapis</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Julat Tarikh</label>
            <select value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)} className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00]">
              <option value="all">Semua</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Lalu</option>
              <option value="30days">30 Hari Lalu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Kategori</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00]">
              <option value="all">Semua</option>
              {Object.keys(ACTION_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Pengguna</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm text-[#111] outline-none focus:border-[#F56A00]">
              <option value="all">Semua Pengguna</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111]">Jumlah: {filtered.length} catatan</p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#888]">Tiada log ditemui untuk penapis yang dipilih</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">Tarikh & Masa</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">Pengguna</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">Peranan</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">Tindakan</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">Modul</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase text-[#888]">IP</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-3 text-sm text-[#111]">
                      {new Date(log.created_at).toLocaleString('ms-MY', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3 text-sm text-[#111] font-medium">{log.profile?.full_name || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold border rounded-full ${ROLE_COLORS[log.profile?.role || 'coach']}`}>
                        {ROLE_LABELS[log.profile?.role || 'coach']}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#111]">{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="px-6 py-3 text-sm text-[#888]">{log.target_table ? TABLE_LABELS[log.target_table] || log.target_table : '—'}</td>
                    <td className="px-6 py-3 text-sm text-[#888] font-mono text-[11px]">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[11px] text-[#888]">Halaman {currentPage} daripada {totalPages} ({filtered.length} catatan)</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">← Sebelumnya</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((page, idx, arr) => (
                <span key={page} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-[#888] text-[11px]">…</span>}
                  <button onClick={() => setCurrentPage(page)} className={`w-7 h-7 text-[11px] rounded-lg ${currentPage === page ? 'bg-[#F56A00] text-white font-semibold' : 'text-[#444] border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                </span>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Seterusnya →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
