import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

const milestones = [
  { label: '100 signatures', reached: true, count: 100 },
  { label: '500 signatures', reached: true, count: 500 },
  { label: '1,000 signatures', reached: false, count: 1000 },
  { label: 'Sent to JKR', reached: false, count: 1000 },
]

const recent = [
  { name: 'Ahmad F.', time: '2m ago', city: 'PJ' },
  { name: 'Nurul H.', time: '5m ago', city: 'KL' },
  { name: 'Priya K.', time: '11m ago', city: 'Subang' },
  { name: 'Yong S.', time: '18m ago', city: 'Shah Alam' },
]

export default function PetitionTracker({ onNext }: Props) {
  const current = 673
  const goal = 1000
  const pct = Math.round((current / goal) * 100)

  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2ECC71" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <h2 className="text-white font-bold text-base">Petition Progress</h2>
        </div>

        {/* Petition card */}
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 p-4 mb-4">
          <p className="text-white font-semibold text-sm leading-snug">
            "Urgent: Install Pedestrian Crossing at SMK Taman Bahagia"
          </p>
          <p className="text-slate-400 text-xs mt-1">To: JKR Petaling Jaya · Started 3 days ago</p>

          {/* Big number */}
          <div className="text-center my-4">
            <span className="text-[#2ECC71] text-4xl font-extrabold">{current.toLocaleString()}</span>
            <span className="text-slate-400 text-base font-medium"> / {goal.toLocaleString()}</span>
            <p className="text-slate-400 text-xs mt-1">signatures · {pct}% of goal</p>
          </div>

          {/* Progress bar */}
          <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-1">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #2ECC71, #27ae60)',
                boxShadow: '0 0 8px rgba(46,204,113,0.5)',
              }}
            />
          </div>
          <p className="text-right text-[#2ECC71] text-xs font-semibold">{goal - current} more needed</p>
        </div>

        {/* Milestones */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Milestones</p>
        <div className="flex flex-col gap-2 mb-4">
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.reached ? 'bg-[#2ECC71]' : 'bg-white/10 border border-white/20'}`}>
                {m.reached
                  ? <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  : <span className="text-slate-500 text-[10px] font-bold">{i + 1}</span>
                }
              </div>
              <span className={`text-sm ${m.reached ? 'text-[#2ECC71] font-semibold' : 'text-slate-400'}`}>
                {m.label}
              </span>
              {m.reached && <span className="ml-auto text-[#2ECC71] text-[10px] font-bold">✓ Reached</span>}
            </div>
          ))}
        </div>

        {/* Recent signers */}
        <p className="text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Recent Signers</p>
        <div className="rounded-2xl bg-[#0f2744] border border-white/10 overflow-hidden">
          {recent.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < recent.length - 1 ? 'border-b border-white/5' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {r.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-xs font-medium">{r.name}</p>
                <p className="text-slate-500 text-[10px]">{r.city}</p>
              </div>
              <span className="text-slate-500 text-[10px]">{r.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Share button */}
      <div className="px-5 pb-5 pt-3 border-t border-white/10">
        <button
          onClick={onNext}
          className="w-full py-3.5 rounded-2xl font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #2ECC71, #27ae60)', color: '#0d1b2a' }}
        >
          📢 Share Petition — Help Reach 1,000
        </button>
      </div>
    </div>
  )
}
