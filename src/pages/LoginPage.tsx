import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
            <a href="#" className="block text-right text-xs text-[#F56A00] font-medium mt-1.5 hover:underline">
              Lupa kata laluan?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full bg-[#F56A00] hover:bg-[#D45A00] disabled:opacity-60 text-white font-bold text-sm rounded-lg py-3.5 mt-2 tracking-wide transition active:scale-[.99]"
          >
            {loading ? 'Sedang log masuk...' : 'Log Masuk →'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E8E8E8]" />
          <span className="text-[11px] text-[#bbb] whitespace-nowrap">atau</span>
          <div className="flex-1 h-px bg-[#E8E8E8]" />
        </div>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-[#E8E8E8] rounded-lg py-3 text-[13px] font-medium text-[#444] hover:border-[#F56A00] hover:text-[#F56A00] transition"
          onClick={() => alert('SSO Kerajaan tidak tersedia buat masa ini.')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Log Masuk dengan SSO Kerajaan
        </button>

        <p className="mt-9 text-[11px] text-[#bbb] text-center leading-relaxed">
          Sistem ini hanya untuk kakitangan MSP Pahang yang diberi kebenaran.<br />
          Sebarang masalah?{' '}
          <a href="#" className="text-[#F56A00] hover:underline">Hubungi Pentadbir</a>
        </p>
      </div>
    </div>
  )
}
