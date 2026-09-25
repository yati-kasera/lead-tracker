import { useCallback, useEffect, useState } from 'react'
import { getLeadStats } from '../lib/api'
import type { LeadStats } from '../types/lead'

export function useLeadStats() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getLeadStats(controller.signal)
      .then(setStats)
      // Stats are supplementary: on failure keep the last known values; the leads list surfaces API errors.
      .catch(() => {})
    return () => controller.abort()
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  return { stats, refresh }
}
