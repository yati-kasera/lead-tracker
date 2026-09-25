import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './lib/api'
import type { Lead, PaginatedLeads } from './types/lead'

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>()
  return {
    ...actual,
    listLeads: vi.fn(),
    createLead: vi.fn(),
    updateLeadStatus: vi.fn(),
  }
})

const listLeads = vi.mocked(api.listLeads)
const createLead = vi.mocked(api.createLead)
const updateLeadStatus = vi.mocked(api.updateLeadStatus)

function makeLead(overrides: Partial<Lead>): Lead {
  return {
    id: 'id',
    name: 'Lead',
    email: 'lead@example.com',
    phone: '9876543210',
    status: 'NEW',
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    ...overrides,
  }
}

function page(data: Lead[], pagination: Partial<PaginatedLeads['pagination']> = {}): PaginatedLeads {
  return {
    data,
    pagination: { page: 1, limit: 10, total: data.length, totalPages: data.length ? 1 : 0, ...pagination },
  }
}

const priya = makeLead({ id: '1', name: 'Priya Sharma', email: 'priya@example.com' })
const rahul = makeLead({ id: '2', name: 'Rahul Verma', email: 'rahul@acme.io', status: 'CONTACTED' })

beforeEach(() => {
  vi.clearAllMocks()
  listLeads.mockResolvedValue(page([priya, rahul]))
})

describe('App', () => {
  it('loads and displays leads', async () => {
    render(<App />)

    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('rahul@acme.io')).toBeInTheDocument()
    expect(screen.getByLabelText('Status for Rahul Verma')).toHaveValue('CONTACTED')
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1–2 of 2')
    expect(listLeads).toHaveBeenCalledWith({ search: '', status: '', page: 1, limit: 10 }, expect.any(AbortSignal))
  })

  it('shows an empty state when there are no leads', async () => {
    listLeads.mockResolvedValue(page([]))
    render(<App />)

    expect(await screen.findByText('No leads yet')).toBeInTheDocument()
  })

  it('searches with a debounce and filters by status', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Priya Sharma')

    listLeads.mockResolvedValue(page([rahul]))
    await user.type(screen.getByLabelText('Search leads'), 'rahul')

    await waitFor(() =>
      expect(listLeads).toHaveBeenLastCalledWith(
        { search: 'rahul', status: '', page: 1, limit: 10 },
        expect.any(AbortSignal),
      ),
    )
    // Debounced: one request for the initial load and one for the final search term.
    expect(listLeads).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'CONTACTED')
    await waitFor(() =>
      expect(listLeads).toHaveBeenLastCalledWith(
        { search: 'rahul', status: 'CONTACTED', page: 1, limit: 10 },
        expect.any(AbortSignal),
      ),
    )
  })

  it('shows a filtered empty state when nothing matches', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Priya Sharma')

    listLeads.mockResolvedValue(page([]))
    await user.type(screen.getByLabelText('Search leads'), 'nobody')

    expect(await screen.findByText('No leads match your search')).toBeInTheDocument()
  })

  it('navigates between pages', async () => {
    const user = userEvent.setup()
    listLeads.mockResolvedValue(page([priya], { total: 12, totalPages: 2 }))
    render(<App />)
    await screen.findByText('Priya Sharma')

    listLeads.mockResolvedValue(page([rahul], { page: 2, total: 12, totalPages: 2 }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Rahul Verma')).toBeInTheDocument()
    expect(listLeads).toHaveBeenLastCalledWith({ search: '', status: '', page: 2, limit: 10 }, expect.any(AbortSignal))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('updates a lead status inline', async () => {
    const user = userEvent.setup()
    updateLeadStatus.mockResolvedValue({ ...priya, status: 'QUALIFIED' })
    render(<App />)

    const select = await screen.findByLabelText('Status for Priya Sharma')
    await user.selectOptions(select, 'QUALIFIED')

    expect(updateLeadStatus).toHaveBeenCalledWith('1', 'QUALIFIED')
    await waitFor(() => expect(select).toBeEnabled())
    expect(select).toHaveValue('QUALIFIED')
  })

  it('rolls back the status and shows an error when the update fails', async () => {
    const user = userEvent.setup()
    updateLeadStatus.mockRejectedValue(new api.ApiError(500, 'Internal server error'))
    render(<App />)

    const select = await screen.findByLabelText('Status for Priya Sharma')
    await user.selectOptions(select, 'LOST')

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't update Priya Sharma: Internal server error")
    expect(select).toHaveValue('NEW')
  })

  it('shows a retryable error when leads fail to load', async () => {
    const user = userEvent.setup()
    listLeads.mockRejectedValueOnce(new api.ApiError(0, 'Unable to reach the server.'))
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load leads: Unable to reach the server.")

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Priya Sharma')).toBeInTheDocument()
  })

  it('refreshes the list after creating a lead', async () => {
    const user = userEvent.setup()
    const vikram = makeLead({ id: '3', name: 'Vikram Singh', email: 'vikram@initech.in' })
    createLead.mockResolvedValue(vikram)
    render(<App />)
    await screen.findByText('Priya Sharma')

    listLeads.mockResolvedValue(page([vikram, priya, rahul]))
    await user.type(screen.getByLabelText('Name'), 'Vikram Singh')
    await user.type(screen.getByLabelText('Email'), 'vikram@initech.in')
    await user.type(screen.getByLabelText('Phone'), '9876500000')
    await user.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(await screen.findByText('vikram@initech.in', { selector: 'a' })).toBeInTheDocument()
    expect(createLead).toHaveBeenCalledWith({
      name: 'Vikram Singh',
      email: 'vikram@initech.in',
      phone: '9876500000',
      status: 'NEW',
    })
  })
})
