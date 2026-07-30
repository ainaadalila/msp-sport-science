import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthLabel, isPasswordValid } from '../../lib/passwordValidator'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [passwordStrength, setPasswordStrength] = useState(validatePassword(''))

  useEffect(() => {
    let recovered = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        recovered = true
        setVerifying(false)
      }
    })

    // Only a genuine PASSWORD_RECOVERY event may unlock this page — an
    // ordinary active session must not, or anyone with a stolen/shared
    // session could reach this page and replace the account password.
    const timeout = setTimeout(() => {
      if (!recovered) {
        setError('Pautan tidak sah atau telah tamat tempoh.')
      }
    }, 2000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid(password)) {
      const strength = validatePassword(password)
      setError(strength.errors[0] || 'Kata laluan tidak memenuhi persyaratan keamanan.')
      return
    }
    if (password !== confirm) {
      setError('Kata laluan tidak sepadan.')
      return
    }

    setLoading(true)
    // Goes through the change-password Edge Function rather than
    // supabase.auth.updateUser() directly — see change-password/index.ts
    // for why: the raw PUT /auth/v1/user endpoint that updateUser() calls
    // accepts a password change from any valid session with no proof it
    // actually came from a genuine recovery link (REHACK retest finding
    // #3). The function verifies that server-side via the JWT's own amr
    // claim instead of trusting the frontend's PASSWORD_RECOVERY event
    // listener alone, which could be bypassed by calling the raw API.
    const { error: err } = await supabase.functions.invoke('change-password', {
      body: { new_password: password },
    })
    setLoading(false)

    if (err) {
      const detail = await err.context?.clone().json().catch(() => null)
      setError(detail?.error || 'Ralat berlaku. Sila cuba lagi.')
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
            <p className={`text-[13px] ${error ? 'text-red-600' : 'text-[#888]'}`}>
              {error || 'Mengesahkan pautan...'}
            </p>
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
                <div className="relative mb-2">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      setPasswordStrength(validatePassword(e.target.value))
                    }}
                    placeholder="Min. 12 aksara, huruf besar, kecil, nombor, dan aksara khas"
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

                {/* Password Strength Indicator */}
                {password && (
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
