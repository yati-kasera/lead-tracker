import { useCallback, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LeadFilters } from './components/LeadFilters'
import { LeadForm } from './components/LeadForm'
import { LeadsTable } from './components/LeadsTable'
import { PaginationControls } from './components/PaginationControls'
import { StatsCards } from './components/StatsCards'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useLeadStats } from './hooks/useLeadStats'
import { useLeads } from './hooks/useLeads'
import { createLead, deleteLead } from './lib/api'
import type { CreateLeadInput, Lead, LeadStatus } from './types/lead'

const PAGE_SIZE = 10

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

function App() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const { leads, pagination, isLoading, error, pendingIds, refresh, changeStatus } = useLeads({
    search: debouncedSearch,
    status,
    page,
    limit: PAGE_SIZE,
  })
  const { stats, refresh: refreshStats } = useLeadStats()

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusFilterChange = (value: LeadStatus | '') => {
    setStatus(value)
    setPage(1)
  }

  const handleCreate = async (input: CreateLeadInput): Promise<Lead> => {
    const lead = await createLead(input)
    // Jump back to the first page with no filters so the new lead is visible.
    setSearch('')
    setStatus('')
    setPage(1)
    refresh()
    refreshStats()
    return lead
  }

  const handleStatusChange = (lead: Lead, nextStatus: LeadStatus) => {
    setNotice(null)
    changeStatus(lead, nextStatus)
      .then(refreshStats)
      .catch((err: unknown) => {
        setNotice(`Couldn't update ${lead.name}: ${errorMessage(err)}`)
      })
  }

  const cancelDelete = useCallback(() => setLeadToDelete(null), [])

  const confirmDelete = async () => {
    if (!leadToDelete) return
    setIsDeleting(true)
    setNotice(null)
    try {
      await deleteLead(leadToDelete.id)
      // Step back a page when the last lead on a later page is removed.
      if (leads.length === 1 && page > 1) setPage(page - 1)
      else refresh()
      refreshStats()
    } catch (err) {
      setNotice(`Couldn't delete ${leadToDelete.name}: ${errorMessage(err)}`)
    } finally {
      setIsDeleting(false)
      setLeadToDelete(null)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Lead Tracker</h1>
          <p className="text-sm text-slate-500">Capture leads and move them through your pipeline.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <StatsCards stats={stats} activeStatus={status} onSelect={handleStatusFilterChange} />

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <LeadForm onCreate={handleCreate} />
          </aside>

          <section
            aria-labelledby="leads-title"
            className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="space-y-4 border-b border-slate-200 p-5">
              <h2 id="leads-title" className="text-lg font-semibold">
                Leads
              </h2>
              <LeadFilters
                search={search}
                status={status}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusFilterChange}
              />
            </div>

            {(error || notice) && (
              <div
                role="alert"
                className="mx-5 mt-4 flex items-start justify-between gap-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                <span>{error ? `Couldn't load leads: ${error}` : notice}</span>
                {error ? (
                  <button type="button" onClick={refresh} className="font-medium underline">
                    Retry
                  </button>
                ) : (
                  <button type="button" onClick={() => setNotice(null)} className="font-medium underline">
                    Dismiss
                  </button>
                )}
              </div>
            )}

            <LeadsTable
              leads={leads}
              pendingIds={pendingIds}
              isLoading={isLoading}
              hasFilters={Boolean(debouncedSearch || status)}
              onStatusChange={handleStatusChange}
              onDelete={setLeadToDelete}
            />

            {pagination && (
              <div className="border-t border-slate-200 px-5 py-3">
                <PaginationControls pagination={pagination} onPageChange={setPage} disabled={isLoading} />
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmDialog
        open={leadToDelete !== null}
        title="Delete lead?"
        description={
          leadToDelete ? `${leadToDelete.name} (${leadToDelete.email}) will be permanently deleted.` : ''
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default App
