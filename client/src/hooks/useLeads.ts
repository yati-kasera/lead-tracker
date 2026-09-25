import { useCallback, useEffect, useState } from 'react'
import { listLeads, updateLeadStatus } from '../lib/api'
import type { Lead, LeadStatus, ListLeadsParams, PaginatedLeads } from '../types/lead'

interface FetchState {
  /** Identifies the query the current result/error belongs to. */
  key: string | null
  result: PaginatedLeads | null
  error: string | null
}

export function useLeads({ search, status, page, limit }: Required<ListLeadsParams>) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [state, setState] = useState<FetchState>({ key: null, result: null, error: null })
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())

  const requestKey = JSON.stringify([search, status, page, limit, refreshKey])

  useEffect(() => {
    const controller = new AbortController()

    listLeads({ search, status, page, limit }, controller.signal)
      .then((result) => setState({ key: requestKey, result, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error = err instanceof Error ? err.message : 'Failed to load leads'
        setState((prev) => ({ ...prev, key: requestKey, error }))
      })

    return () => controller.abort()
  }, [requestKey, search, status, page, limit])

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  const replaceLead = useCallback((lead: Lead) => {
    setState((prev) => {
      if (!prev.result) return prev
      const data = prev.result.data.map((item) => (item.id === lead.id ? lead : item))
      return { ...prev, result: { ...prev.result, data } }
    })
  }, [])

  const setPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (pending) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  /** Optimistically updates a lead's status, rolling back if the request fails. */
  const changeStatus = useCallback(
    async (lead: Lead, nextStatus: LeadStatus) => {
      replaceLead({ ...lead, status: nextStatus })
      setPending(lead.id, true)
      try {
        replaceLead(await updateLeadStatus(lead.id, nextStatus))
      } catch (err) {
        replaceLead(lead)
        throw err
      } finally {
        setPending(lead.id, false)
      }
    },
    [replaceLead, setPending],
  )

  const isCurrent = state.key === requestKey

  return {
    leads: state.result?.data ?? [],
    pagination: state.result?.pagination ?? null,
    isLoading: !isCurrent,
    error: isCurrent ? state.error : null,
    pendingIds,
    refresh,
    changeStatus,
  }
}
