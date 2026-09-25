import type { LeadStatus } from '../types/lead'

export const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-sky-50 text-sky-700 ring-sky-200',
  CONTACTED: 'bg-amber-50 text-amber-700 ring-amber-200',
  QUALIFIED: 'bg-violet-50 text-violet-700 ring-violet-200',
  CONVERTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  LOST: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export const STATUS_DOT: Record<LeadStatus, string> = {
  NEW: 'bg-sky-500',
  CONTACTED: 'bg-amber-500',
  QUALIFIED: 'bg-violet-500',
  CONVERTED: 'bg-emerald-500',
  LOST: 'bg-rose-500',
}
