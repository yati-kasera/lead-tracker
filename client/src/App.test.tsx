import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './lib/api'
import type { Lead, LeadStats, PaginatedLeads } from './types/lead'

vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>()
  return {
    ...actual,
    listLeads: vi.fn(),
    createLead: vi.fn(),
    updateLeadStatus: vi.fn(),
    deleteLead: vi.fn(),
    getLeadStats: vi.fn(),
  }
})

const listLeads = vi.mocked(api.listLeads)
const createLead = vi.mocked(api.createLead)
const updateLeadStatus = vi.mocked(api.updateLeadStatus)
const deleteLead = vi.mocked(api.deleteLead)
const getLeadStats = vi.mocked(api.getLeadStats)

function stats(byStatus: Partial<LeadStats['byStatus']> = {}): LeadStats {
  const full = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, LOST: 0, ...byStatus }
  return { total: Object.values(full).reduce((a, b) => a + b, 0), byStatus: full }
}

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
  getLeadStats.mockResolvedValue(stats({ NEW: 1, CONTACTED: 1 }))
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
    await waitFor(() => expect(getLeadStats).toHaveBeenCalledTimes(2))
  })

  describe('stats cards', () => {
    it('shows the total and per-status counts', async () => {
      getLeadStats.mockResolvedValue(stats({ NEW: 4, QUALIFIED: 2, LOST: 1 }))
      render(<App />)

      const summary = screen.getByRole('region', { name: 'Lead summary' })
      expect(await within(summary).findByRole('button', { name: /^Total\s*7$/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(within(summary).getByRole('button', { name: /^New\s*4$/ })).toBeInTheDocument()
      expect(within(summary).getByRole('button', { name: /^Contacted\s*0$/ })).toBeInTheDocument()
      expect(within(summary).getByRole('button', { name: /^Qualified\s*2$/ })).toBeInTheDocument()
    })

    it('filters the list by the clicked status and toggles back to all', async () => {
      const user = userEvent.setup()
      render(<App />)
      const qualified = await screen.findByRole('button', { name: /^Qualified/ })

      await user.click(qualified)
      expect(qualified).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByLabelText('Filter by status')).toHaveValue('QUALIFIED')
      await waitFor(() =>
        expect(listLeads).toHaveBeenLastCalledWith(
          { search: '', status: 'QUALIFIED', page: 1, limit: 10 },
          expect.any(AbortSignal),
        ),
      )

      await user.click(qualified)
      expect(screen.getByLabelText('Filter by status')).toHaveValue('')
    })

    it('refreshes after a status change', async () => {
      const user = userEvent.setup()
      updateLeadStatus.mockResolvedValue({ ...priya, status: 'CONTACTED' })
      render(<App />)

      await user.selectOptions(await screen.findByLabelText('Status for Priya Sharma'), 'CONTACTED')

      await waitFor(() => expect(getLeadStats).toHaveBeenCalledTimes(2))
    })
  })

  describe('deleting a lead', () => {
    it('asks for confirmation, deletes, and refreshes the list and stats', async () => {
      const user = userEvent.setup()
      deleteLead.mockResolvedValue()
      render(<App />)

      await user.click(await screen.findByRole('button', { name: 'Delete Priya Sharma' }))
      const dialog = screen.getByRole('dialog', { name: 'Delete lead?' })
      expect(dialog).toHaveTextContent('Priya Sharma (priya@example.com) will be permanently deleted.')
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()

      listLeads.mockResolvedValue(page([rahul]))
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(deleteLead).toHaveBeenCalledWith('1')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument())
      expect(getLeadStats).toHaveBeenCalledTimes(2)
    })

    it('does nothing when cancelled (button or Escape)', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(await screen.findByRole('button', { name: 'Delete Priya Sharma' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Delete Priya Sharma' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      expect(deleteLead).not.toHaveBeenCalled()
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    })

    it('shows an error and keeps the lead when the delete fails', async () => {
      const user = userEvent.setup()
      deleteLead.mockRejectedValue(new api.ApiError(404, 'Lead not found'))
      render(<App />)

      await user.click(await screen.findByRole('button', { name: 'Delete Priya Sharma' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't delete Priya Sharma: Lead not found")
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    })

    it('goes back a page when the last lead on a later page is deleted', async () => {
      const user = userEvent.setup()
      deleteLead.mockResolvedValue()
      listLeads.mockResolvedValue(page([priya], { total: 11, totalPages: 2 }))
      render(<App />)
      await screen.findByText('Priya Sharma')

      listLeads.mockResolvedValue(page([rahul], { page: 2, total: 11, totalPages: 2 }))
      await user.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByText('Rahul Verma')

      listLeads.mockResolvedValue(page([priya], { total: 10, totalPages: 1 }))
      await user.click(screen.getByRole('button', { name: 'Delete Rahul Verma' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() =>
        expect(listLeads).toHaveBeenLastCalledWith(
          { search: '', status: '', page: 1, limit: 10 },
          expect.any(AbortSignal),
        ),
      )
    })
  })
})
