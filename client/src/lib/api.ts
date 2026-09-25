import type {
  CreateLeadInput,
  Lead,
  LeadStats,
  LeadStatus,
  ListLeadsParams,
  PaginatedLeads,
} from '../types/lead'

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export interface ApiErrorDetail {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly details: ApiErrorDetail[]

  constructor(status: number, message: string, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface ErrorBody {
  error?: { message?: string; details?: ApiErrorDetail[] }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'Unable to reach the server. Please check your connection and try again.')
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = (body as ErrorBody | null)?.error
    throw new ApiError(
      response.status,
      error?.message ?? `Request failed with status ${response.status}`,
      error?.details ?? [],
    )
  }

  return body as T
}

export function listLeads(params: ListLeadsParams = {}, signal?: AbortSignal): Promise<PaginatedLeads> {
  const query = new URLSearchParams()
  if (params.search?.trim()) query.set('search', params.search.trim())
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const qs = query.toString()
  return request<PaginatedLeads>(`/api/leads${qs ? `?${qs}` : ''}`, { signal })
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const { data } = await request<{ data: Lead }>('/api/leads', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data
}

export async function deleteLead(id: string): Promise<void> {
  await request<null>(`/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getLeadStats(signal?: AbortSignal): Promise<LeadStats> {
  const { data } = await request<{ data: LeadStats }>('/api/leads/stats', { signal })
  return data
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  const { data } = await request<{ data: Lead }>(`/api/leads/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return data
}
