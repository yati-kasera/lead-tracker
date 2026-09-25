import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createLead, listLeads, updateLeadStatus } from './api'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('builds the list query string, skipping empty params', async () => {
    const fetchMock = mockFetch(200, { data: [], pagination: { page: 2, limit: 5, total: 0, totalPages: 0 } })

    await listLeads({ search: '  rahul ', status: '', page: 2, limit: 5 })

    expect(fetchMock).toHaveBeenCalledWith('/api/leads?search=rahul&page=2&limit=5', expect.any(Object))
  })

  it('sends JSON bodies and unwraps the data envelope', async () => {
    const lead = { id: '1', name: 'Priya', status: 'CONTACTED' }
    const fetchMock = mockFetch(200, { data: lead })

    await expect(updateLeadStatus('1', 'CONTACTED')).resolves.toEqual(lead)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/leads/1/status')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ status: 'CONTACTED' })
  })

  it('throws an ApiError with server details on failure', async () => {
    mockFetch(409, {
      error: {
        message: 'A lead with this email already exists',
        details: [{ path: 'email', message: 'A lead with this email already exists' }],
      },
    })

    const error = await createLead({ name: 'Priya', email: 'p@x.io', phone: '9876543210' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, details: [{ path: 'email' }] })
  })

  it('reports network failures with a friendly message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(listLeads()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Unable to reach') })
  })
})
