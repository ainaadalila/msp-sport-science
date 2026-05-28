import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Sport {
  id: string
  name: string
}

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSports() {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name')
        .order('name')

      if (!error) {
        setSports(data || [])
      }
      setLoading(false)
    }

    fetchSports()
  }, [])

  return { sports, loading }
}
