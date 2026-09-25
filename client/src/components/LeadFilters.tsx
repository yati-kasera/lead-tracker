import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '../types/lead'

interface LeadFiltersProps {
  search: string
  status: LeadStatus | ''
  onSearchChange: (value: string) => void
  onStatusChange: (value: LeadStatus | '') => void
}

export function LeadFilters({ search, status, onSearchChange, onStatusChange }: LeadFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="lead-search" className="sr-only">
          Search leads
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 3.47 9.77l3.13 3.13a.75.75 0 1 0 1.06-1.06l-3.13-3.13A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          id="lead-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email or phone"
          className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label htmlFor="lead-status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="lead-status-filter"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus | '')}
          className="block w-full rounded-md border border-slate-300 py-2 pl-3 pr-8 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:w-44"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {LEAD_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
