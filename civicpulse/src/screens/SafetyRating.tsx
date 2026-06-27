import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

const locations = [
  { name: 'Underpass, Jalan Gombak', rating: 2.1, reports: 18, tag: 'Poor Lighting', tagColor: '#EF4444', icon: '🌑' },
  { name: 'Taman Jaya Park North Gate', rating: 4.3, reports: 34, tag: 'Well Lit', tagColor: '#2ECC71', icon: '💡' },
  { name: 'LRT Masjid Jamek Exit B', rating: 3.5, reports: 12, tag: 'Moderate', tagColor: '#F39C12', icon: '🚦' },
  { name: 'Lorong 7, Taman Bukit', rating: 1.8, reports: 27, tag: 'Unsafe', tagColor: '#EF4444', icon: '⚠️' },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#F39C12' : '#334155'}
        >
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>
      ))}
    </div>
  )
}

export default function SafetyRating({ onNext }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-base">Community Safety</h2>
          <span className="text-slate-400 text-xs">Near you · PJ</span>
        </div>
        <p className="text-slate-400 text-xs mb-4">
          Crowd-sourced safety ratings for locations in your area
        </p>

        {/* Summary bar */}
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 p-4 mb-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-white text-2xl font-extrabold">3.1</p>
            <Stars rating={3.1} />
            <p className="text-slate-400 text-[10px] mt-0.5">Area avg</p>
          </div>
          <div className="flex-1 pl-4 border-l border-white/10">
            {[5,4,3,2,1].map(s => {
              const widths = [15, 25, 20, 30, 10]
              return (
                <div key={s} className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-500 text-[10px] w-2">{s}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#F39C12]" style={{ width: `${widths[5-s]}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Locations */}
        <div className="flex flex-col gap-3">
          {locations.map((loc, i) => (
            <div key={i} className="rounded-2xl bg-[#0f2744] border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                  {loc.icon}
                </div>
                <div className="flex-1">
                  <p className="text-slate-200 text-sm font-semibold leading-snug">{loc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={loc.rating} />
                    <span className="text-white text-xs font-bold">{loc.rating}</span>
                    <span className="text-slate-500 text-[10px]">({loc.reports} reports)</span>
                  </div>
                  <span
                    className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: loc.tagColor + '22', color: loc.tagColor, border: `1px solid ${loc.tagColor}44` }}
                  >
                    {loc.tag}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report button */}
      <div className="px-5 pb-5 pt-3 border-t border-white/10">
        <button
          onClick={onNext}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563eb)', color: 'white' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add Safety Report
        </button>
      </div>
    </div>
  )
}
