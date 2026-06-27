import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

export default function AIFlashEvent({ onNext }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-1 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F39C12] to-[#e67e22] flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">AI Civic Assistant</p>
            <p className="text-[#F39C12] text-[10px]">● Active</p>
          </div>
          <div className="ml-auto">
            <span className="px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
              ⚡ Flash Event Mode
            </span>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* AI */}
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F39C12] to-[#e67e22] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs">🤖</span>
          </div>
          <div className="bg-[#0f2744] rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[80%]">
            <p className="text-slate-200 text-xs leading-relaxed">What volunteer event do you want to organise? Just describe it briefly.</p>
          </div>
        </div>

        {/* User */}
        <div className="flex gap-2 items-start flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] text-white font-bold">A</span>
          </div>
          <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-3 py-2.5 max-w-[75%]">
            <p className="text-slate-200 text-xs leading-relaxed">I want to organise a tree planting activity around Taman Jaya Park.</p>
          </div>
        </div>

        {/* AI */}
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F39C12] to-[#e67e22] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs">🤖</span>
          </div>
          <div className="bg-[#0f2744] rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[80%]">
            <p className="text-slate-200 text-xs leading-relaxed">
              Great! Based on similar events in Petaling Jaya, Saturday mornings (8–11 AM) get the best turnout.
              I've pre-filled the details below — tweak anything you like.
            </p>
          </div>
        </div>

        {/* Event card */}
        <div className="rounded-xl bg-[#0a2540] border border-[#F39C12]/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[#F39C12] flex items-center justify-center">
              <span className="text-xs">⚡</span>
            </div>
            <span className="text-[#F39C12] text-xs font-bold">Flash Event — Ready to Publish</span>
          </div>

          {[
            { icon: '🌿', label: 'Event', value: 'Taman Jaya Tree Planting' },
            { icon: '📍', label: 'Location', value: 'Taman Jaya Park, PJ' },
            { icon: '📅', label: 'Date', value: 'Saturday, 12 Jul 2025' },
            { icon: '⏰', label: 'Time', value: '8:00 AM – 11:00 AM' },
            { icon: '👥', label: 'Target', value: '30 volunteers' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-sm w-5">{r.icon}</span>
              <span className="text-slate-400 text-[10px] w-16">{r.label}</span>
              <span className="text-slate-200 text-xs font-medium">{r.value}</span>
            </div>
          ))}

          {/* Auto-invite */}
          <div className="mt-3 p-2.5 rounded-lg bg-[#F39C12]/10 border border-[#F39C12]/20">
            <div className="flex items-center justify-between">
              <p className="text-[#F39C12] text-xs font-semibold">Auto-invite nearby members</p>
              <div className="w-9 h-5 rounded-full bg-[#F39C12] flex items-center justify-end pr-0.5">
                <div className="w-4 h-4 rounded-full bg-white" />
              </div>
            </div>
            <p className="text-slate-400 text-[10px] mt-1">
              42 members who joined similar events will be notified
            </p>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={onNext} className="flex-1 py-2 rounded-xl bg-[#F39C12] text-[#0d1b2a] text-xs font-bold">
              ⚡ Publish Event
            </button>
            <button className="px-3 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-medium">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <div className="flex gap-2 items-center bg-[#0f2744] rounded-2xl px-4 py-2.5 border border-white/10">
          <input readOnly placeholder="Describe your event idea…" className="flex-1 bg-transparent text-slate-300 text-xs outline-none placeholder-slate-500"/>
          <button onClick={onNext} className="w-8 h-8 rounded-xl bg-[#F39C12] flex items-center justify-center shrink-0">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
