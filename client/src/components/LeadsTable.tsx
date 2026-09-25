import { formatDate, formatDateTime, formatRelativeTime } from '../lib/format'
import type { Lead, LeadStatus } from '../types/lead'
import { StatusSelect } from './StatusSelect'

interface LeadsTableProps {
  leads: Lead[]
  pendingIds: ReadonlySet<string>
  isLoading: boolean
  hasFilters: boolean
  onStatusChange: (lead: Lead, status: LeadStatus) => void
}

const COLUMN_COUNT = 4

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

export function LeadsTable({ leads, pendingIds, isLoading, hasFilters, onStatusChange }: LeadsTableProps) {
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
