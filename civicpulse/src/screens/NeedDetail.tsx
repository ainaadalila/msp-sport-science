import StatusBar from '../components/StatusBar'

interface Props { onJoin: () => void; onBack: () => void }

const friends = [
  { name: 'Hana', color: '#2ECC71' },
  { name: 'Aimee', color: '#3B82F6' },
  { name: 'Zarif', color: '#F39C12' },
]

export default function NeedDetail({ onJoin, onBack }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      {/* Header image area */}
      <div className="relative h-44 overflow-hidden shrink-0">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0a3d1f 0%, #1a6b35 50%, #0d4520 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl opacity-40">🌊</span>
        </div>
        <button
          onClick={onBack}
          className="absolute top-3 left-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="absolute top-3 right-4 flex gap-2">
          <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>
        {/* Category tag */}
        <div className="absolute bottom-3 left-4 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#2ECC71] text-[#0d1b2a]">🙌 Volunteer</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/80 text-white">🔥 Urgent</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4">
        <h1 className="text-white text-xl font-bold leading-tight">
          Klang River Clean-Up Drive
        </h1>
        <p className="text-slate-400 text-sm mt-1">📍 Jalan Klang Lama, KL · 0.8 km away</p>

        {/* Organiser */}
        <div className="flex items-center gap-2.5 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">KE</div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Klang Eco Rangers</p>
            <p className="text-slate-400 text-xs">Verified Organisation</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2ECC71]/20 border border-[#2ECC71]/40">
            <svg width="10" height="10" fill="#2ECC71" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            <span className="text-[#2ECC71] text-[10px] font-semibold">Verified</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Volunteers', value: '23/40', icon: '👥' },
            { label: 'Duration', value: '3 hrs', icon: '⏱' },
            { label: 'Date', value: 'Sat, 5 Jul', icon: '📅' },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
              <p className="text-base">{s.icon}</p>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-slate-500 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Fill bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Spots filled</span>
            <span className="text-[#F39C12] font-semibold">17 spots left</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2ECC71] to-[#F39C12]" style={{ width: '57%' }} />
          </div>
          <p className="text-slate-500 text-[10px] mt-1">23 of 40 slots taken · fills fast!</p>
        </div>

        {/* Friends going */}
        <div className="mt-4">
          <p className="text-slate-400 text-xs mb-2">Friends going</p>
          <div className="flex items-center gap-2">
            <div className="flex">
              {friends.map((f, i) => (
                <div
                  key={f.name}
                  className="w-7 h-7 rounded-full border-2 border-[#0d1b2a] flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: f.color, marginLeft: i > 0 ? -8 : 0, zIndex: friends.length - i }}
                >
                  {f.name[0]}
                </div>
              ))}
            </div>
            <span className="text-slate-400 text-xs">{friends[0].name}, {friends[1].name} & 1 other</span>
          </div>
        </div>

        <p className="text-slate-400 text-xs mt-4 leading-relaxed">
          Join us to clear trash along a 2 km stretch of the Klang River. Equipment provided.
          Bring water and wear sturdy shoes.
        </p>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-3 bg-[#0d1b2a] border-t border-white/10">
        <button
          onClick={onJoin}
          className="w-full py-4 rounded-2xl font-bold text-base text-[#0d1b2a] shadow-lg"
          style={{ background: 'linear-gradient(135deg, #2ECC71, #27ae60)' }}
        >
          ✅ One-Tap Join
        </button>
        <p className="text-center text-slate-500 text-[10px] mt-2">You'll receive a reminder 24 hours before</p>
      </div>
    </div>
  )
}
