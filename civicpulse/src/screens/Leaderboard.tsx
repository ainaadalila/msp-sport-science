import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

const leaders = [
  { rank: 1, name: 'Aiman R.', score: 3840, city: 'Subang', badge: '🏆', color: '#F39C12' },
  { rank: 2, name: 'Priya K.', score: 3210, city: 'PJ', badge: '🥈', color: '#94a3b8' },
  { rank: 3, name: 'Haziq M.', score: 2990, city: 'KL', badge: '🥉', color: '#b45309' },
  { rank: 4, name: 'Mei Lin C.', score: 2450, city: 'Damansara', badge: '', color: '' },
  { rank: 5, name: 'Faris A.', score: 2100, city: 'KL', badge: '', color: '' },
  { rank: 6, name: 'Siti N.', score: 1890, city: 'Shah Alam', badge: '', color: '' },
  { rank: 7, name: 'You 🌟', score: 1240, city: 'PJ', badge: '', color: '#2ECC71', isMe: true },
]

export default function Leaderboard({ onNext }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">Community Pulse</h2>
          <select className="bg-[#0f2744] text-slate-300 text-xs border border-white/10 rounded-lg px-2 py-1 outline-none">
            <option>Petaling Jaya</option>
            <option>Kuala Lumpur</option>
            <option>National</option>
          </select>
        </div>

        {/* Active challenge */}
        <div
          className="rounded-2xl p-4 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E3A5F, #1a3d6b)' }}
        >
          <div className="absolute top-0 right-0 text-7xl opacity-10">⚡</div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F39C12]/20 border border-[#F39C12]/40 flex items-center justify-center text-xl">
              🎯
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[#F39C12] text-[10px] font-bold uppercase tracking-wider">Active Challenge</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#F39C12] animate-pulse" />
              </div>
              <p className="text-white font-bold text-sm">July Clean City Sprint</p>
              <p className="text-slate-300 text-xs mt-0.5">Join 5 clean-up drives this month</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Your progress</span>
              <span className="text-[#F39C12] font-semibold">3 / 5 events</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-[#F39C12]" style={{ width: '60%' }} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-slate-400 text-[10px]">🏅 Reward: City Champion badge + 500 pts</p>
            <span className="text-[#F39C12] text-xs font-bold">4 days left</span>
          </div>
        </div>

        {/* Leaderboard */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">This Month's Leaders</p>

        {/* Top 3 podium */}
        <div className="flex items-end justify-center gap-3 mb-4">
          {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
            const heights = ['h-16', 'h-20', 'h-14']
            const positions = ['2nd', '1st', '3rd']
            return (
              <div key={l.rank} className="flex flex-col items-center gap-1">
                <span className="text-lg">{l.badge || '🙂'}</span>
                <div className="w-12 text-center text-[10px] text-white font-semibold truncate">{l.name.split(' ')[0]}</div>
                <div
                  className={`w-16 ${heights[i]} rounded-t-xl flex flex-col items-center justify-center`}
                  style={{ background: i === 1 ? 'linear-gradient(180deg, #F39C12, #e67e22)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-white text-[10px] font-bold">{positions[i]}</span>
                  <span className="text-white text-xs font-bold">{(l.score/1000).toFixed(1)}k</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Full list */}
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 overflow-hidden">
          {leaders.map((l, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${
                (l as any).isMe ? 'bg-[#2ECC71]/10 border-l-2 border-[#2ECC71]' : ''
              } ${i < leaders.length - 1 ? 'border-b border-white/5' : ''}`}
            >
              <span className="text-slate-400 text-xs font-bold w-5 text-center">
                {l.badge || `#${l.rank}`}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: (l as any).isMe ? '#2ECC71' : `hsl(${l.rank * 37}, 60%, 45%)`, color: (l as any).isMe ? '#0d1b2a' : undefined }}
              >
                {l.name[0]}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${(l as any).isMe ? 'text-[#2ECC71]' : 'text-slate-200'}`}>{l.name}</p>
                <p className="text-slate-500 text-[10px]">{l.city}</p>
              </div>
              <span className="text-white text-xs font-bold">{l.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
