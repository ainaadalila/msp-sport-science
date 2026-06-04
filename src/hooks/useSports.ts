import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface Sport {
  id: string
  name: string
}

const sportsCache = { data: null as Sport[] | null, timestamp: 0, ttl: 5 * 60 * 1000 } // 5 min cache (reduced for debugging)

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    async function fetchSports() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('sports')
          .select('id, name')
          .order('name')

        if (error) {
          console.error('[useSports] Query error:', error)
          sportsCache.data = []
          sportsCache.timestamp = Date.now()
          if (isMountedRef.current) setSports([])
        } else {
          sportsCache.data = data || []
          sportsCache.timestamp = Date.now()
          if (isMountedRef.current) setSports(data || [])
        }
      } catch (err) {
        console.error('[useSports] Exception:', err)
        if (isMountedRef.current) setSports([])
      } finally {
        if (isMountedRef.current) setLoading(false)
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
