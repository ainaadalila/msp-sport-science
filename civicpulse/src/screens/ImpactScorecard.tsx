import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

const badges = [
  { icon: '🌊', name: 'River Guardian', earned: true, desc: 'Joined 3 clean-ups' },
  { icon: '✍️', name: 'Petition Starter', earned: true, desc: 'Created a petition' },
  { icon: '🌿', name: 'Green Thumb', earned: true, desc: 'Tree planting events' },
  { icon: '🔥', name: 'Flash Organiser', earned: false, desc: 'Create 3 flash events' },
  { icon: '🏆', name: 'Top 10', earned: false, desc: 'Reach top leaderboard' },
  { icon: '📣', name: 'Megaphone', earned: false, desc: '500 petition signatures' },
]

const history = [
  { action: 'Joined River Clean-Up Drive', pts: '+50', date: 'Today', icon: '🌊' },
  { action: 'Signed Pedestrian Petition', pts: '+10', date: 'Yesterday', icon: '✍️' },
  { action: 'Created Tree Planting Event', pts: '+100', date: '3 days ago', icon: '⚡' },
  { action: 'Rated Taman Jaya Safety', pts: '+5', date: '5 days ago', icon: '🛡️' },
]

export default function ImpactScorecard({ onNext }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">My Impact</h2>
          <span className="text-slate-400 text-xs">Rank #7 in PJ 🏙️</span>
        </div>

        {/* Score card */}
        <div
          className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E3A5F, #0d2540)' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: '#2ECC71', transform: 'translate(30%, -30%)' }} />
          <p className="text-slate-400 text-xs mb-1">Total Impact Score</p>
          <p className="text-white text-5xl font-extrabold">1,240</p>
          <p className="text-[#2ECC71] text-sm mt-1 font-semibold">↑ +165 this week</p>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            {[
              { label: 'Events Joined', value: '12' },
              { label: 'Petitions', value: '3' },
              { label: 'Reports Filed', value: '7' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-white font-bold text-lg">{s.value}</p>
                <p className="text-slate-400 text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Badges</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {badges.map(b => (
            <div
              key={b.name}
              className={`rounded-xl p-3 text-center border ${
                b.earned
                  ? 'bg-[#0f2744] border-[#2ECC71]/30'
                  : 'bg-white/5 border-white/10 opacity-50'
              }`}
            >
              <span className="text-2xl block mb-1">{b.icon}</span>
              <p className={`text-[10px] font-bold ${b.earned ? 'text-white' : 'text-slate-500'}`}>{b.name}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{b.desc}</p>
              {b.earned && (
                <div className="mt-1.5 w-4 h-4 rounded-full bg-[#2ECC71] mx-auto flex items-center justify-center">
                  <svg width="8" height="8" fill="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Activity history */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Recent Activity</p>
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 overflow-hidden">
          {history.map((h, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < history.length - 1 ? 'border-b border-white/5' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-base shrink-0">
                {h.icon}
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-xs font-medium">{h.action}</p>
                <p className="text-slate-500 text-[10px]">{h.date}</p>
              </div>
              <span className="text-[#2ECC71] text-xs font-bold">{h.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
