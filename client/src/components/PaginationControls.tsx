import type { Pagination } from '../types/lead'

interface PaginationControlsProps {
  pagination: Pagination
  onPageChange: (page: number) => void
  disabled?: boolean
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export function PaginationControls({ pagination, onPageChange, disabled }: PaginationControlsProps) {
  const { page, limit, total, totalPages } = pagination
  if (total === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{' '}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
