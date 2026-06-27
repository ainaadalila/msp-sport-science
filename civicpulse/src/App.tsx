import { useState } from 'react'
import PhoneFrame from './components/PhoneFrame'
import BottomNav from './components/BottomNav'
import Onboarding from './screens/Onboarding'
import Heatmap from './screens/Heatmap'
import NeedDetail from './screens/NeedDetail'
import AIPetition from './screens/AIPetition'
import AIFlashEvent from './screens/AIFlashEvent'
import PetitionTracker from './screens/PetitionTracker'
import ImpactScorecard from './screens/ImpactScorecard'
import SafetyRating from './screens/SafetyRating'
import Leaderboard from './screens/Leaderboard'
import SmartAlert from './screens/SmartAlert'

type ScreenId =
  | 'onboarding' | 'heatmap' | 'need-detail'
  | 'ai-petition' | 'ai-flash'
  | 'petition-tracker' | 'impact' | 'safety' | 'leaderboard' | 'smart-alert'

const SCREENS: { id: ScreenId; label: string; section: string }[] = [
  { id: 'onboarding', label: '3.5.1 Onboarding', section: 'Getting Started' },
  { id: 'heatmap', label: '3.5.2 Live Heatmap', section: 'Map' },
  { id: 'need-detail', label: '3.5.3 Need Detail + Join', section: 'Map' },
  { id: 'ai-petition', label: '3.5.4 AI: Petition Drafting', section: 'AI Assistant' },
  { id: 'ai-flash', label: '3.5.5 AI: Flash Event', section: 'AI Assistant' },
  { id: 'petition-tracker', label: '3.5.6 Petition Tracker', section: 'Progress' },
  { id: 'impact', label: '3.5.7 Impact Scorecard', section: 'Profile' },
  { id: 'safety', label: '3.5.8 Safety Rating', section: 'Community' },
  { id: 'leaderboard', label: '3.5.9 Challenge & Leaderboard', section: 'Community' },
  { id: 'smart-alert', label: '3.5.10 Geo-Smart Alerts', section: 'Alerts' },
]

const BOTTOM_NAV_MAP: Partial<Record<ScreenId, string>> = {
  heatmap: 'heatmap',
  'need-detail': 'heatmap',
  leaderboard: 'leaderboard',
  'ai-petition': 'ai-petition',
  'ai-flash': 'ai-petition',
  impact: 'impact',
  'petition-tracker': 'impact',
  safety: 'safety',
}

const NO_NAV: ScreenId[] = ['onboarding']

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('onboarding')
  const [menuOpen, setMenuOpen] = useState(false)

  const showNav = !NO_NAV.includes(screen)
  const activeTab = BOTTOM_NAV_MAP[screen] ?? 'heatmap'

  function handleNav(tab: string) {
    const tabScreenMap: Record<string, ScreenId> = {
      heatmap: 'heatmap',
      leaderboard: 'leaderboard',
      'ai-petition': 'ai-petition',
      impact: 'impact',
      safety: 'safety',
    }
    setScreen(tabScreenMap[tab] ?? 'heatmap')
  }

  function renderScreen() {
    switch (screen) {
      case 'onboarding': return <Onboarding onDone={() => setScreen('heatmap')} />
      case 'heatmap': return <Heatmap onSelectPin={() => setScreen('need-detail')} />
      case 'need-detail': return <NeedDetail onJoin={() => setScreen('heatmap')} onBack={() => setScreen('heatmap')} />
      case 'ai-petition': return <AIPetition onNext={() => setScreen('petition-tracker')} />
      case 'ai-flash': return <AIFlashEvent onNext={() => setScreen('leaderboard')} />
      case 'petition-tracker': return <PetitionTracker onNext={() => setScreen('impact')} />
      case 'impact': return <ImpactScorecard onNext={() => setScreen('leaderboard')} />
      case 'safety': return <SafetyRating onNext={() => setScreen('smart-alert')} />
      case 'leaderboard': return <Leaderboard onNext={() => setScreen('impact')} />
      case 'smart-alert': return <SmartAlert onJoin={() => setScreen('heatmap')} />
    }
  }

  const currentInfo = SCREENS.find(s => s.id === screen)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 gap-8"
      style={{ background: 'linear-gradient(135deg, #0a0f1e, #0d1b2a, #050e1a)' }}
    >
      {/* Title */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#2ECC71] flex items-center justify-center text-xl">🌐</div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight">CivicPulse</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Empowering Young Adults in Community Action · Interactive Prototype
        </p>
        <p className="text-slate-500 text-xs mt-0.5">URTS 6023 · Chapter 3 High-Fidelity Prototype</p>
      </div>

      <div className="flex gap-8 items-start flex-wrap justify-center">
        {/* Phone */}
        <PhoneFrame>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              {renderScreen()}
            </div>
            {showNav && (
              <BottomNav active={activeTab} onNavigate={handleNav} />
            )}
          </div>
        </PhoneFrame>

        {/* Screen selector panel */}
        <div className="w-64">
          <div className="bg-[#0f1e2d] rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-sm">📱 Screen Navigator</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Click any screen to jump to it</p>
            </div>
            <div className="overflow-y-auto max-h-[680px]">
              {SCREENS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setScreen(s.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    screen === s.id
                      ? 'bg-[#2ECC71]/15 border-l-2 border-[#2ECC71]'
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  } ${i < SCREENS.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <span className="text-slate-500 text-[10px] font-mono w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold leading-snug ${screen === s.id ? 'text-[#2ECC71]' : 'text-slate-300'}`}>
                      {s.label}
                    </p>
                    <p className="text-slate-500 text-[10px]">{s.section}</p>
                  </div>
                  {screen === s.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Current screen info */}
          {currentInfo && (
            <div className="mt-3 bg-[#0f1e2d] rounded-2xl border border-white/10 p-4">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Current Screen</p>
              <p className="text-white text-sm font-bold">{currentInfo.label}</p>
              <p className="text-slate-400 text-xs mt-1">Section: {currentInfo.section}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-3 bg-[#0f1e2d] rounded-2xl border border-white/10 p-4">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Tips</p>
            <ul className="text-slate-400 text-[10px] space-y-1.5">
              <li>• Tap pins on the map to open need detail</li>
              <li>• Use bottom nav tabs to switch sections</li>
              <li>• Buttons are clickable for demo flow</li>
              <li>• Screenshot at 390×844 for report</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
