interface Props { onDone: () => void }

const features = [
  {
    icon: '📍',
    title: 'See What Your Area Needs',
    desc: 'A live map shows volunteer needs, clean-up drives and safety issues near you — all in one place.',
    bg: 'from-blue-900/60 to-blue-800/30',
  },
  {
    icon: '⚡',
    title: 'Act in Seconds',
    desc: 'Join an activity with one tap or let AI draft a petition or flash event for you in minutes.',
    bg: 'from-emerald-900/60 to-emerald-800/30',
  },
  {
    icon: '🏅',
    title: 'Earn Your Impact',
    desc: 'Track contributions, unlock badges and climb the community leaderboard as you make a difference.',
    bg: 'from-amber-900/60 to-amber-800/30',
  },
]

export default function Onboarding({ onDone }: Props) {
  return (
    <div className="flex flex-col h-full pt-14 px-5 pb-6 bg-gradient-to-b from-[#0d1b2a] to-[#0a2540]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#2ECC71] flex items-center justify-center">
          <span className="text-lg">🌐</span>
        </div>
        <span className="text-white text-xl font-bold tracking-tight">CivicPulse</span>
      </div>

      <h1 className="text-white text-2xl font-bold leading-tight mb-1">
        Your community.<br />Your action.
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Empowering young Malaysians to shape their neighbourhoods.
      </p>

      {/* Feature cards */}
      <div className="flex flex-col gap-3 flex-1">
        {features.map(f => (
          <div key={f.title} className={`rounded-2xl bg-gradient-to-r ${f.bg} border border-white/10 p-4 flex gap-3 items-start`}>
            <span className="text-2xl">{f.icon}</span>
            <div>
              <p className="text-white font-semibold text-sm">{f.title}</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Location permission */}
      <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📡</span>
          <p className="text-white text-sm font-semibold">Allow Location Access</p>
        </div>
        <p className="text-slate-400 text-xs mb-3 leading-relaxed">
          Used only to show needs near you. Never shared without your consent.
        </p>
        <button
          onClick={onDone}
          className="w-full py-3 rounded-xl font-semibold text-sm text-[#0d1b2a]"
          style={{ background: '#2ECC71' }}
        >
          Allow &amp; Get Started
        </button>
        <button
          onClick={onDone}
          className="w-full py-2 mt-2 text-slate-500 text-xs"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
