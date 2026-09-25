import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '../types/lead'

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700 ring-sky-200',
  CONTACTED: 'bg-amber-50 text-amber-700 ring-amber-200',
  QUALIFIED: 'bg-violet-50 text-violet-700 ring-violet-200',
  CONVERTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  LOST: 'bg-rose-50 text-rose-700 ring-rose-200',
}

interface StatusSelectProps {
  value: LeadStatus
  onChange: (status: LeadStatus) => void
  disabled?: boolean
  label: string
}

export function StatusSelect({ value, onChange, disabled, label }: StatusSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      className={`cursor-pointer rounded-full border-0 py-1 pl-3 pr-8 text-xs font-medium ring-1 ring-inset transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-60 ${STATUS_STYLES[value]}`}
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>
          {LEAD_STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  )
}
