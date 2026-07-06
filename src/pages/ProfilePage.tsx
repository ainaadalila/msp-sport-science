import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/audit'

interface ProfileData {
  full_name: string
  ic_number: string | null
  unit: string | null
}

interface ProfileForm {
  full_name: string
  ic_number: string
  unit: string
}

function formatIC(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 6) return digits
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
}

export default function ProfilePage() {
  const { profile, user } = useAuth()
  const [data, setData] = useState<ProfileData>({ full_name: '', ic_number: null, unit: null })
  const [form, setForm] = useState<ProfileForm>({ full_name: '', ic_number: '', unit: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [user])

  async function fetchProfile() {
    if (!user?.id) return
    setLoading(true)
    const { data: profileData, error: err } = await supabase
      .from('profiles')
      .select('full_name, ic_number, unit')
      .eq('id', user.id)
      .single()

    if (err) {
      console.error('Error fetching profile:', err)
      setError('Gagal memuatkan profil')
    } else if (profileData) {
      setData({
        full_name: profileData.full_name || '',
        ic_number: profileData.ic_number || null,
        unit: profileData.unit || null,
      })
      setForm({
        full_name: profileData.full_name || '',
        ic_number: profileData.ic_number || '',
        unit: profileData.unit || '',
      })
    }
    setLoading(false)
  }

  function handleEdit() {
    setEditing(true)
    setError(null)
  }

  function handleCancel() {
    setEditing(false)
    setForm({
      full_name: data.full_name,
      ic_number: data.ic_number || '',
      unit: data.unit || '',
    })
    setError(null)
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      setError('Nama wajib diisi.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        ic_number: form.ic_number?.trim() || null,
        unit: form.unit?.trim() || null,
      })
      .eq('id', user!.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    await logAction(user!.id, 'update_own_profile', 'profiles', user!.id)
    setData({
      full_name: form.full_name,
      ic_number: form.ic_number || null,
      unit: form.unit || null,
    })
    setSuccess(true)
    setEditing(false)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) {
    return <div className="py-16 text-center text-[#888]">Memuatkan profil...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#111]">Profil Pengguna</h1>
          {!editing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-[#F56A00] hover:bg-[#D45A00] text-white text-sm font-semibold rounded-lg transition"
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-600">
            ✓ Profil berjaya diemas kini
          </div>
        )}

        {!editing ? (
          /* View Mode */
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">Nama</p>
              <p className="text-[15px] font-medium text-[#111]">{data.full_name || '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">No. Kad Pengenalan</p>
              <p className="text-[15px] font-medium text-[#111]">{data.ic_number ? formatIC(data.ic_number) : '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">Unit/Jabatan</p>
              <p className="text-[15px] font-medium text-[#111]">{data.unit || '—'}</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">Peranan</p>
              <p className="text-[15px] font-medium text-[#111] capitalize">{profile?.role || '—'}</p>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-4">
            {/* Nama */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">
                Nama <span className="text-[#D44040]">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value.toUpperCase() }))}
                className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                placeholder="Masukkan nama lengkap anda"
              />
            </div>

            {/* IC Number */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">
                No. Kad Pengenalan
              </label>
              <input
                type="text"
                value={form.ic_number}
                onChange={e => setForm(f => ({ ...f, ic_number: formatIC(e.target.value) }))}
                className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                placeholder="cth. 123456-12-1234"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-2">
                Unit/Jabatan
              </label>
              <input
                type="text"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value.toUpperCase() }))}
                className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#111] outline-none transition focus:border-[#F56A00] focus:bg-white"
                placeholder="cth. Sport Science Department"
              />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
