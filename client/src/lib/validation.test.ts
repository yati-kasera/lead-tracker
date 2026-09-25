import { describe, expect, it } from 'vitest'
import { validateLead } from './validation'

const valid = { name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765 43210' }

describe('validateLead', () => {
  it('accepts valid input', () => {
    expect(validateLead(valid)).toEqual({})
  })

  it('requires every field', () => {
    expect(validateLead({ name: ' ', email: '', phone: '' })).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      phone: 'Phone is required',
    })
  })

  it('rejects short names and invalid emails', () => {
    const errors = validateLead({ ...valid, name: 'P', email: 'priya@' })
    expect(errors.name).toBe('Name must be at least 2 characters')
    expect(errors.email).toBe('Enter a valid email address')
  })

  it('rejects phone numbers with letters or too few digits', () => {
    expect(validateLead({ ...valid, phone: 'call me' }).phone).toBe('Enter a valid phone number')
    expect(validateLead({ ...valid, phone: '12-34-56' }).phone).toBe('Phone number must contain 7 to 15 digits')
  })
})
