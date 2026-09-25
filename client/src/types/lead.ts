export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  LOST: 'Lost',
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: LeadStatus
  createdAt: string
  updatedAt: string
}

export interface CreateLeadInput {
  name: string
  email: string
  phone: string
  status?: LeadStatus
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedLeads {
  data: Lead[]
  pagination: Pagination
}

export interface ListLeadsParams {
  search?: string
  status?: LeadStatus | ''
  page?: number
  limit?: number
}
