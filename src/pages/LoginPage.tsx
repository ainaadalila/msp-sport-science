import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { signOut, signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) signOut()
    })
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('E-mel atau kata laluan tidak sah. Sila cuba lagi.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  async function handleForgotPassword() {
    setForgotError(null)
    if (!forgotEmail.trim()) {
      setForgotError('Sila masukkan e-mel anda.')
      return
    }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: (import.meta.env.VITE_APP_URL || window.location.origin) + '/reset-password',
    })
    setForgotLoading(false)
    if (error) {
      setForgotError(error.message)
      return
    }
    setForgotSuccess(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#111]">

      {/* Left — photo panel */}
      <div className="flex-1 relative hidden md:flex overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/login-bg.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-10 z-10">
          <p className="text-[11px] font-semibold tracking-[3px] uppercase text-white/50 mb-3">
            Majlis Sukan Pahang
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-2">
            Sistem <span className="text-[#F56A00]">Sains Sukan</span>
            <br />Atlet Pahang
          </h1>
          <p className="text-[13px] text-white/55 leading-relaxed">
            Platform pengurusan data prestasi,<br />
            kecergasan &amp; kesihatan atlet negeri.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="w-full md:w-[420px] shrink-0 bg-white flex flex-col justify-center px-11 py-12 relative overflow-y-auto">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#F56A00] to-transparent" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo_msp.png" alt="MSP Logo" className="w-12 h-12 rounded-full object-cover shrink-0" />
          <div className="leading-tight">
            <strong className="block text-[13px] font-bold tracking-widest text-[#F56A00] uppercase">
              Majlis Sukan Pahang
            </strong>
            <span className="text-[9px] text-[#999] tracking-wider uppercase">
              Sport Science Department
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#111] mb-1.5">Log Masuk</h2>
        <p className="text-[13px] text-[#888] mb-9 leading-relaxed">
          Masukkan maklumat akaun anda untuk akses sistem.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
              {error}
            </div>
          )}

          <div className="mb-[18px]">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
              E-mel
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@msp.gov.my"
              required
              className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3.5 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none transition focus:border-[#F56A00] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,106,0,0.08)]"
            />
          </div>

          <div className="mb-[18px]">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">
              Kata Laluan
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3.5 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none transition focus:border-[#F56A00] focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,106,0,0.08)]"
            />
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="block text-right text-xs text-[#F56A00] font-medium mt-1.5 hover:underline w-full"
            >
              Lupa kata laluan?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white font-bold text-sm rounded-lg py-3.5 mt-2 tracking-wide transition active:scale-[.99]"
          >
            {loading ? 'Sedang log masuk...' : 'Log Masuk →'}
          </button>
        </form>

        <p className="mt-9 text-[11px] text-[#bbb] text-center leading-relaxed">
          Sistem ini hanya untuk kakitangan MSP Pahang yang diberi kebenaran.<br />
          Sebarang masalah?{' '}
          <a href="#" className="text-[#F56A00] hover:underline">Hubungi Pentadbir</a>
        </p>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#111]">Lupa Kata Laluan</h3>
              <button onClick={() => { setForgotOpen(false); setForgotEmail(''); setForgotError(null); setForgotSuccess(false) }}
                className="text-[#888] hover:text-[#111] text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {forgotSuccess ? (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-[13px] text-green-700">
                  E-mel set semula kata laluan telah dihantar. Sila semak peti masuk anda.
                </div>
              ) : (
                <>
                  {forgotError && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">{forgotError}</div>}
                  <p className="text-[13px] text-[#888]">Masukkan e-mel anda dan kami akan menghantar pautan untuk menetapkan semula kata laluan.</p>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#888] mb-1.5">E-mel</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      placeholder="nama@msp.gov.my"
                      className="w-full bg-[#F5F5F7] border border-[#E8E8E8] rounded-lg px-3.5 py-3 text-sm text-[#111] placeholder-[#bbb] outline-none transition focus:border-[#F56A00] focus:bg-white" />
                  </div>
                </>
              )}
            </div>
            {!forgotSuccess && (
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setForgotOpen(false)} className="px-4 py-2 text-sm text-[#888] hover:text-[#111] transition">Batal</button>
                <button onClick={handleForgotPassword} disabled={forgotLoading}
                  className="px-5 py-2 bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                  {forgotLoading ? 'Menghantar...' : 'Hantar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
