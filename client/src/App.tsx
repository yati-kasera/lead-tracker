import { useState } from 'react'
import { LeadFilters } from './components/LeadFilters'
import { LeadForm } from './components/LeadForm'
import { LeadsTable } from './components/LeadsTable'
import { PaginationControls } from './components/PaginationControls'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useLeads } from './hooks/useLeads'
import { createLead } from './lib/api'
import type { CreateLeadInput, Lead, LeadStatus } from './types/lead'

const PAGE_SIZE = 10

function App() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const { leads, pagination, isLoading, error, pendingIds, refresh, changeStatus } = useLeads({
    search: debouncedSearch,
    status,
    page,
    limit: PAGE_SIZE,
  })

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
    return lead
  }

  const handleStatusChange = (lead: Lead, nextStatus: LeadStatus) => {
    setNotice(null)
    changeStatus(lead, nextStatus).catch((err: unknown) => {
      const reason = err instanceof Error ? err.message : 'Unknown error'
      setNotice(`Couldn't update ${lead.name}: ${reason}`)
    })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lead Tracker</h1>
            <p className="text-sm text-slate-500">Capture leads and move them through your pipeline.</p>
          </div>
          {pagination && (
            <p className="hidden text-sm text-slate-500 sm:block">
              <span className="font-semibold text-slate-900">{pagination.total}</span>{' '}
              {debouncedSearch || status ? 'matching' : 'total'} {pagination.total === 1 ? 'lead' : 'leads'}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[340px_1fr]">
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
            <div role="alert" className="mx-5 mt-4 flex items-start justify-between gap-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
          />

          {pagination && (
            <div className="border-t border-slate-200 px-5 py-3">
              <PaginationControls pagination={pagination} onPageChange={setPage} disabled={isLoading} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
