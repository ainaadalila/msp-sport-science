import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds

export function useInactivityLogout() {
  const { signOut, user } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now()

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      if (user) {
        signOut()
      }
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    if (!user) return

    resetInactivityTimer()

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetInactivityTimer()

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Check page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      } else {
        // When tab becomes visible, check if session is stale
        const timeSinceLastActivity = Date.now() - lastActivityRef.current
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          // Session is stale, logout immediately
          if (user) {
            signOut()
          }
        } else {
          // Session still valid, reset timer with remaining time
          resetInactivityTimer()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [user, signOut])
}
