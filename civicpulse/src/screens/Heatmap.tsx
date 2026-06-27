import StatusBar from '../components/StatusBar'

interface Props { onSelectPin: () => void }

const pins = [
  { id: 1, top: '28%', left: '30%', category: 'volunteer', label: 'River Clean-Up', urgency: 'high', color: '#2ECC71' },
  { id: 2, top: '42%', left: '60%', category: 'safety', label: 'Broken Streetlight', urgency: 'medium', color: '#F39C12' },
  { id: 3, top: '55%', left: '25%', category: 'volunteer', label: 'Food Drive', urgency: 'high', color: '#2ECC71' },
  { id: 4, top: '35%', left: '70%', category: 'safety', label: 'Dark Underpass', urgency: 'high', color: '#EF4444' },
  { id: 5, top: '65%', left: '50%', category: 'event', label: 'Tree Planting', urgency: 'low', color: '#3B82F6' },
]

const filters = ['All', 'Volunteer', 'Safety', 'Events']

export default function Heatmap({ onSelectPin }: Props) {
  return (
    <div className="flex flex-col h-full">
      <StatusBar />

      {/* Search bar */}
      <div className="px-4 pb-3 z-10 relative">
        <div className="flex gap-2 items-center bg-[#0f2744] rounded-2xl px-4 py-2.5 border border-white/10">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="text-slate-400 text-sm">Search your area…</span>
          <div className="ml-auto w-7 h-7 rounded-lg bg-[#2ECC71]/20 flex items-center justify-center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2ECC71" strokeWidth="2.5">
              <path strokeLinecap="round" d="M3 4h18M7 12h10M10 20h4"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Map background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 160px 100px at 35% 32%, rgba(46,204,113,0.18) 0%, transparent 70%),
              radial-gradient(ellipse 120px 90px at 62% 44%, rgba(243,156,18,0.15) 0%, transparent 70%),
              radial-gradient(ellipse 200px 130px at 28% 58%, rgba(46,204,113,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 100px 80px at 72% 37%, rgba(239,68,68,0.2) 0%, transparent 70%),
              linear-gradient(135deg, #0a1628 0%, #0d2040 50%, #091525 100%)
            `,
          }}
        />

        {/* Grid lines (fake streets) */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4a9eff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <line x1="40%" y1="0" x2="45%" y2="100%" stroke="#4a9eff" strokeWidth="1.5" opacity="0.3"/>
          <line x1="0" y1="38%" x2="100%" y2="35%" stroke="#4a9eff" strokeWidth="1.5" opacity="0.3"/>
          <line x1="65%" y1="0" x2="60%" y2="100%" stroke="#4a9eff" strokeWidth="1.5" opacity="0.3"/>
        </svg>

        {/* Pins */}
        {pins.map(pin => (
          <button
            key={pin.id}
            onClick={onSelectPin}
            className="absolute flex flex-col items-center"
            style={{ top: pin.top, left: pin.left, transform: 'translate(-50%, -100%)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30"
              style={{ background: pin.color }}
            >
              <span className="text-xs">{pin.category === 'volunteer' ? '🙌' : pin.category === 'safety' ? '⚠️' : '🌿'}</span>
            </div>
            <div
              className="mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-white shadow-lg"
              style={{ background: pin.color + 'dd' }}
            >
              {pin.label}
            </div>
            <div className="w-0 h-0" style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `7px solid ${pin.color}dd`,
            }} />
          </button>
        ))}

        {/* My location dot */}
        <div className="absolute" style={{ top: '50%', left: '48%', transform: 'translate(-50%,-50%)' }}>
          <div className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg relative">
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
          </div>
        </div>

        {/* Filter pills */}
        <div className="absolute top-3 left-0 right-0 flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {filters.map((f, i) => (
            <span
              key={f}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${
                i === 0
                  ? 'bg-[#2ECC71] text-[#0d1b2a] border-transparent'
                  : 'bg-[#0f2744]/80 text-slate-300 border-white/20'
              }`}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#0d1b2a]/90 rounded-xl p-3 border border-white/10">
          <p className="text-white text-xs font-semibold mb-1.5">Activity Intensity</p>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-16 rounded-full" style={{ background: 'linear-gradient(to right, #2ECC71, #F39C12, #EF4444)' }} />
            <span className="text-[10px] text-slate-400">Low → High</span>
          </div>
        </div>

        {/* Live badge */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 bg-[#0f2744]/90 rounded-full px-2.5 py-1 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse" />
          <span className="text-[10px] text-[#2ECC71] font-semibold">LIVE</span>
        </div>
      </div>
    </div>
  )
}
