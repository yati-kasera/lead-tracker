import { formatDate, formatDateTime, formatRelativeTime } from '../lib/format'
import type { Lead, LeadStatus } from '../types/lead'
import { StatusSelect } from './StatusSelect'

interface LeadsTableProps {
  leads: Lead[]
  pendingIds: ReadonlySet<string>
  isLoading: boolean
  hasFilters: boolean
  onStatusChange: (lead: Lead, status: LeadStatus) => void
  onDelete: (lead: Lead) => void
}

const COLUMN_COUNT = 5

const headerCellClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: COLUMN_COUNT }, (_, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-4 rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function LeadsTable({
  leads,
  pendingIds,
  isLoading,
  hasFilters,
  onStatusChange,
  onDelete,
}: LeadsTableProps) {
  const showSkeleton = isLoading && leads.length === 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className={headerCellClass}>
              Lead
            </th>
            <th scope="col" className={headerCellClass}>
              Phone
            </th>
            <th scope="col" className={headerCellClass}>
              Status
            </th>
            <th scope="col" className={headerCellClass}>
              Created at
            </th>
            <th scope="col" className={headerCellClass}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody
          className={`divide-y divide-slate-100 bg-white transition-opacity ${isLoading && !showSkeleton ? 'opacity-60' : ''}`}
          aria-busy={isLoading}
        >
          {showSkeleton ? (
            <SkeletonRows />
          ) : leads.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {hasFilters ? 'No leads match your search' : 'No leads yet'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {hasFilters ? 'Try a different search term or status.' : 'Add your first lead using the form.'}
                </p>
              </td>
            </tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="min-w-44 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-900">{lead.name}</p>
                  <a href={`mailto:${lead.email}`} className="break-words text-indigo-600 hover:underline">
                    {lead.email}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-slate-700 hover:underline">
                    {lead.phone}
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <StatusSelect
                    label={`Status for ${lead.name}`}
                    value={lead.status}
                    disabled={pendingIds.has(lead.id)}
                    onChange={(status) => onStatusChange(lead, status)}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                  <time dateTime={lead.createdAt} title={formatDateTime(lead.createdAt)}>
                    {formatDate(lead.createdAt)}
                  </time>
                  <span className="block text-xs text-slate-400">{formatRelativeTime(lead.createdAt)}</span>
                </td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(lead)}
                    disabled={pendingIds.has(lead.id)}
                    aria-label={`Delete ${lead.name}`}
                    title="Delete lead"
                    className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
