import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface Sport {
  id: string
  name: string
}

const sportsCache = { data: null as Sport[] | null, timestamp: 0, ttl: 10 * 60 * 1000 } // 10 min cache

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    async function fetchSports() {
      const now = Date.now()

      // Check if cache is still valid
      if (sportsCache.data && now - sportsCache.timestamp < sportsCache.ttl) {
        if (isMounted.current) {
          setSports(sportsCache.data)
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('sports')
          .select('id, name')
          .order('name')

        if (!error && isMounted.current) {
          sportsCache.data = data || []
          sportsCache.timestamp = Date.now()
          setSports(sportsCache.data)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    fetchSports()
  }, [])

  return { sports, loading }
}

export function invalidateSportsCache() {
  sportsCache.data = null
  sportsCache.timestamp = 0
}
