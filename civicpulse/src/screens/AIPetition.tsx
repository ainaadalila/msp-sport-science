import StatusBar from '../components/StatusBar'

interface Props { onNext: () => void }

const messages = [
  {
    role: 'user',
    text: 'There\'s no pedestrian crossing near SMK Taman Bahagia. Students have to cross a 4-lane road every day.',
  },
  {
    role: 'ai',
    text: 'Got it! Quick question: roughly how many students use this crossing each day, and has there been any incident or near-miss recently?',
  },
  {
    role: 'user',
    text: 'Around 800 students. Two near-misses last month.',
  },
  {
    role: 'ai',
    text: null, // petition draft card
  },
]

function PetitionCard() {
  return (
    <div className="rounded-xl bg-[#0a2540] border border-[#2ECC71]/30 p-3.5 mt-1">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-full bg-[#2ECC71] flex items-center justify-center">
          <svg width="10" height="10" fill="white" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707"/></svg>
        </div>
        <span className="text-[#2ECC71] text-xs font-bold">Petition Draft Ready</span>
      </div>
      <p className="text-white text-xs font-semibold">
        "Urgent: Install Pedestrian Crossing at SMK Taman Bahagia"
      </p>
      <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">
        To: Jabatan Kerja Raya (JKR) Petaling Jaya<br/>
        We, the undersigned, call for the immediate installation of a signalised pedestrian crossing
        on Jalan PJU 3/50, adjacent to SMK Taman Bahagia. Approximately 800 students cross
        this 4-lane road daily, and two near-miss incidents were recorded in June 2025 alone…
      </p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 py-1.5 rounded-lg bg-[#2ECC71] text-[#0d1b2a] text-xs font-bold">
          ✓ Use This Draft
        </button>
        <button className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 text-xs font-medium">
          Edit
        </button>
      </div>
    </div>
  )
}

export default function AIPetition({ onNext }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#0d1b2a]">
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-1 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#1abc9c] flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">AI Civic Assistant</p>
            <p className="text-[#2ECC71] text-[10px]">● Active</p>
          </div>
          <div className="ml-auto">
            <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
              📝 Petition Mode
            </span>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* AI opener */}
        <div className="flex gap-2 items-start">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2ECC71] to-[#1abc9c] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs">🤖</span>
          </div>
          <div className="bg-[#0f2744] rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[75%]">
            <p className="text-slate-200 text-xs leading-relaxed">
              Hi! I can help you draft a petition for your local authority. Describe the problem in your own words and I'll handle the rest.
            </p>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2ECC71] to-[#1abc9c] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">🤖</span>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">A</span>
              </div>
            )}
            {msg.text ? (
              <div
                className={`rounded-2xl px-3 py-2.5 max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-blue-600 rounded-tr-sm'
                    : 'bg-[#0f2744] rounded-tl-sm'
                }`}
              >
                <p className="text-slate-200 text-xs leading-relaxed">{msg.text}</p>
              </div>
            ) : (
              <div className="flex-1">
                <div className="bg-[#0f2744] rounded-2xl rounded-tl-sm px-3 py-2 mb-1">
                  <p className="text-slate-200 text-xs">Here's your petition draft — I've addressed it to JKR PJ and included the safety data:</p>
                </div>
                <PetitionCard />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 border-t border-white/10">
        <div className="flex gap-2 items-center bg-[#0f2744] rounded-2xl px-4 py-2.5 border border-white/10">
          <input
            readOnly
            placeholder="Describe your community issue…"
            className="flex-1 bg-transparent text-slate-300 text-xs outline-none placeholder-slate-500"
          />
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-xl bg-[#2ECC71] flex items-center justify-center shrink-0"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
