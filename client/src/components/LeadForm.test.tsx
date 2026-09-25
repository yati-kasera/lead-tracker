import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/api'
import type { Lead } from '../types/lead'
import { LeadForm } from './LeadForm'

const createdLead: Lead = {
  id: '1',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '+91 98765 43210',
  status: 'CONTACTED',
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), '  Priya Sharma ')
  await user.type(screen.getByLabelText('Email'), 'priya@example.com')
  await user.type(screen.getByLabelText('Phone'), '+91 98765 43210')
}

describe('LeadForm', () => {
  it('shows validation errors and does not submit invalid input', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<LeadForm onCreate={onCreate} />)

    await user.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Phone is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('clears a field error as soon as the user edits it', async () => {
    const user = userEvent.setup()
    render(<LeadForm onCreate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add lead' }))
    await user.type(screen.getByLabelText('Name'), 'P')

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('submits trimmed values with the selected status and resets the form', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockResolvedValue(createdLead)
    render(<LeadForm onCreate={onCreate} />)

    await fillForm(user)
    await user.selectOptions(screen.getByLabelText('Status'), 'CONTACTED')
    await user.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 98765 43210',
      status: 'CONTACTED',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Priya Sharma was added.')
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Status')).toHaveValue('NEW')
  })

  it('maps server field errors onto the matching input', async () => {
    const user = userEvent.setup()
    const message = 'A lead with this email already exists'
    const onCreate = vi.fn().mockRejectedValue(new ApiError(409, message, [{ path: 'email', message }]))
    render(<LeadForm onCreate={onCreate} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveValue('priya@example.com')
  })

  it('shows a form-level error when the request fails without field details', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockRejectedValue(new ApiError(0, 'Unable to reach the server.'))
    render(<LeadForm onCreate={onCreate} />)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')
  })
})
