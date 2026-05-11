import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setVerifying(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setVerifying(false)
      } else {
        setTimeout(() => setError('Pautan tidak sah atau telah tamat tempoh.'), 2000)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Kata laluan mestilah sekurang-kurangnya 8 aksara.')
      return
    }
    if (password !== confirm) {
      setError('Kata laluan tidak sepadan.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#111]">
      <div className="w-full md:w-[420px] shrink-0 bg-white flex flex-col justify-center px-11 py-12 relative overflow-y-auto mx-auto">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#F56A00] to-transparent" />

        {verifying ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[#888]">Mengesahkan pautan...</p>
          </div>
        ) : success ? (
          <div className="text-center space-y-4">
            <div className="text-3xl">✓</div>
            <h2 className="text-2xl font-bold text-[#111]">Selesai!</h2>
            <p className="text-[13px] text-[#888] leading-relaxed">
              Kata laluan anda berjaya dikemas kini. Anda kini boleh log masuk dengan kata laluan baharu.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#F56A00] hover:bg-[#D45A00] text-white font-bold text-sm rounded-lg py-3.5 mt-6 tracking-wide transition"
            >
              Log Masuk →
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-[#111] mb-1.5">Tetapkan Kata Laluan Baharu</h2>
            <p className="text-[13px] text-[#888] mb-9 leading-relaxed">
              Sila masukkan kata laluan baharu anda.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
                  {error}
                </div>
              )}

              <div className="mb-[18px]">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
                  Kata Laluan Baharu
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 aksara"
                    className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3.5 py-3 pr-10 text-sm text-[#111] placeholder-[#bbb] outline-none transition focus:border-[#F56A00] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#111] text-[11px] font-medium"
                  >
                    {showPw ? 'Sembunyi' : 'Tunjuk'}
                  </button>
                </div>
              </div>

              <div className="mb-[18px]">
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
                  Sahkan Kata Laluan
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3.5 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none transition focus:border-[#F56A00] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white font-bold text-sm rounded-lg py-3.5 mt-2 tracking-wide transition active:scale-[.99]"
              >
                {loading ? 'Menyimpan...' : 'Tetapkan Kata Laluan →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
