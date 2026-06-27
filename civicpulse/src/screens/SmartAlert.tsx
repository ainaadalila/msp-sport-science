import StatusBar from '../components/StatusBar'

interface Props { onJoin: () => void }

export default function SmartAlert({ onJoin }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
          <h2 className="text-white font-bold text-base">Geo-Smart Alerts</h2>
        </div>

        {/* Main alert card */}
        <div className="rounded-2xl overflow-hidden mb-4 border border-[#2ECC71]/30">
          {/* Mini map area */}
          <div
            className="relative h-36"
            style={{
              background: 'linear-gradient(135deg, #0a1628, #0d2040)',
            }}
          >
            {/* Grid */}
            <svg className="absolute inset-0 w-full h-full opacity-15">
              <defs>
                <pattern id="ag" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4a9eff" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ag)" />
            </svg>

            {/* Heatmap blob */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 140px 80px at 50% 60%, rgba(46,204,113,0.25) 0%, transparent 70%)',
            }} />

            {/* Pin */}
            <div className="absolute" style={{ top: '35%', left: '48%', transform: 'translate(-50%, -50%)' }}>
              <div className="w-10 h-10 rounded-full bg-[#2ECC71]/30 flex items-center justify-center border-2 border-[#2ECC71]">
                <span className="text-lg">🙌</span>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #2ECC71' }}
              />
            </div>

            {/* Me dot */}
            <div className="absolute" style={{ top: '65%', left: '55%' }}>
              <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-lg relative">
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
              </div>
            </div>

            {/* Distance label */}
            <div className="absolute bottom-2 right-3 bg-black/50 rounded-lg px-2 py-1">
              <p className="text-[#2ECC71] text-[10px] font-semibold">0.4 km away</p>
            </div>

            {/* Triggered badge */}
            <div className="absolute top-2 left-3 flex items-center gap-1.5 bg-[#2ECC71] rounded-full px-2.5 py-1">
              <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span className="text-[#0d1b2a] text-[10px] font-bold">GEO TRIGGERED</span>
            </div>
          </div>

          {/* Alert content */}
          <div className="bg-[#0f2744] p-4">
            <p className="text-[#2ECC71] text-[10px] font-semibold uppercase tracking-wider mb-1">🔔 Smart Alert — You're Nearby!</p>
            <p className="text-white font-bold text-base leading-snug">
              River Clean-Up starting in 45 min
            </p>
            <p className="text-slate-400 text-xs mt-1.5">
              Klang River stretch, Jalan Klang Lama · 0.4 km from you
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">👥</span>
                <span className="text-slate-300 text-xs">18 joined</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">⏱</span>
                <span className="text-slate-300 text-xs">3 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎒</span>
                <span className="text-slate-300 text-xs">Gear provided</span>
              </div>
            </div>
          </div>
        </div>

        {/* Why you got this alert */}
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 p-4 mb-4">
          <p className="text-slate-400 text-xs font-semibold mb-2">Why you received this alert</p>
          <div className="flex flex-col gap-2">
            {[
              { icon: '📍', text: 'You are 0.4 km from the activity' },
              { icon: '🌊', text: 'You joined a similar clean-up in June' },
              { icon: '⏰', text: 'You\'re usually free on Saturday mornings' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm">{r.icon}</span>
                <span className="text-slate-300 text-xs">{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Other nearby alerts */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">More Near You</p>
        {[
          { icon: '🌿', title: 'Tree Planting', loc: 'Taman Jaya, 1.2km', time: 'Tomorrow 8AM', color: '#2ECC71' },
          { icon: '⚠️', title: 'Safety Report', loc: 'Lorong 7, 0.8km', time: 'Active now', color: '#F39C12' },
        ].map((a, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-[#0f2744] border border-white/10 px-4 py-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: a.color + '22' }}>
              {a.icon}
            </div>
            <div className="flex-1">
              <p className="text-slate-200 text-sm font-semibold">{a.title}</p>
              <p className="text-slate-500 text-[10px]">{a.loc}</p>
            </div>
            <span className="text-xs" style={{ color: a.color }}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-3 border-t border-white/10 flex gap-3">
        <button
          className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-[#0d1b2a]"
          style={{ background: '#2ECC71' }}
          onClick={onJoin}
        >
          ✅ Join Now
        </button>
        <button className="px-5 py-3.5 rounded-2xl font-semibold text-sm text-slate-300 bg-white/10">
          Later
        </button>
      </div>
    </div>
  )
}
