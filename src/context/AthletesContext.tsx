import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface CachedAthlete {
  id: string
  name: string
  ic_number: string
  sport_id: string
  status: 'active' | 'rest' | 'injured'
  gender: 'M' | 'F' | null
  date_of_birth: string | null
  weight: number | null
  height: number | null
  is_elite: boolean
  photo_url: string | null
  category: string | null
  created_at: string
  sport?: { name: string }
}

interface AthletesContextValue {
  athletes: CachedAthlete[]
  loading: boolean
  refresh: () => Promise<void>
}

const AthletesContext = createContext<AthletesContextValue>({
  athletes: [],
  loading: true,
  refresh: async () => {},
})

export function AthletesProvider({ children }: { children: React.ReactNode }) {
  const [athletes, setAthletes] = useState<CachedAthlete[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('athletes')
      .select('id, name, ic_number, sport_id, status, gender, date_of_birth, weight, height, is_elite, photo_url, category, created_at, sport:sports!sport_id(name)')
      .order('name').limit(5000) as any
    if (!error && data) setAthletes(data)
    setLoading(false)
  }

  useEffect(() => {
    // Only load after a session is confirmed — avoids empty fetch before login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) load()
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') load()
      if (event === 'SIGNED_OUT') { setAthletes([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AthletesContext.Provider value={{ athletes, loading, refresh: load }}>
      {children}
    </AthletesContext.Provider>
  )
}

export function useAthletes() {
  return useContext(AthletesContext)
}
