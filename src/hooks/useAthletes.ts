export { useAthletes, type CachedAthlete } from '../context/AthletesContext'

export function invalidateAthletesCache() {
  // no-op — invalidation is handled via AthletesContext.refresh()
}
