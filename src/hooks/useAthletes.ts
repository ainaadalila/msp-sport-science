import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface CachedAthlete {
  id: string
  name: string
  ic_number: string
  sport_id: string
  status: string
  gender: string | null
  date_of_birth: string | null
  weight: number | null
  height: number | null
  is_elite: boolean
  photo_url: string | null
  category: string | null
  sport?: { name: string }
}

const athleteCache = { data: null as CachedAthlete[] | null, timestamp: 0, ttl: 5 * 60 * 1000 } // 5 min cache

export function useAthletes() {
  const [athletes, setAthletes] = useState<CachedAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    async function fetchAthletes() {
      const now = Date.now()

      // Check if cache is still valid
      if (athleteCache.data && now - athleteCache.timestamp < athleteCache.ttl) {
        if (isMounted.current) {
          setAthletes(athleteCache.data)
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('athletes')
          .select('id, name, ic_number, sport_id, status, gender, date_of_birth, weight, height, is_elite, photo_url, category, sport:sports!sport_id(name)')
          .order('name').limit(5000) as any

        if (!error && data && isMounted.current) {
          athleteCache.data = data
          athleteCache.timestamp = Date.now()
          setAthletes(data)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    fetchAthletes()
  }, [])

  return { athletes, loading }
}

export function invalidateAthletesCache() {
  athleteCache.data = null
  athleteCache.timestamp = 0
}
