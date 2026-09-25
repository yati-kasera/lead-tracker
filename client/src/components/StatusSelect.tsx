import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '../types/lead'
import { STATUS_STYLES } from './statusStyles'

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
