import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStats, type LeadStatus } from '../types/lead'
import { STATUS_DOT } from './statusStyles'

interface StatsCardsProps {
  stats: LeadStats | null
  activeStatus: LeadStatus | ''
  onSelect: (status: LeadStatus | '') => void
}

interface CardProps {
  label: string
  count: number | undefined
  active: boolean
  dotClass?: string
  onClick: () => void
}

function StatCard({ label, count, active, dotClass, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        active ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'
      }`}
    >
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {dotClass && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </span>
      <span className="mt-1 block text-2xl font-semibold text-slate-900">{count ?? '–'}</span>
    </button>
  )
}

export function StatsCards({ stats, activeStatus, onSelect }: StatsCardsProps) {
  return (
    <section aria-label="Lead summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total" count={stats?.total} active={activeStatus === ''} onClick={() => onSelect('')} />
      {LEAD_STATUSES.map((status) => (
        <StatCard
          key={status}
          label={LEAD_STATUS_LABELS[status]}
          count={stats?.byStatus[status]}
          active={activeStatus === status}
          dotClass={STATUS_DOT[status]}
          onClick={() => onSelect(activeStatus === status ? '' : status)}
        />
      ))}
    </section>
  )
}
