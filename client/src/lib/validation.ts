export interface LeadFormValues {
  name: string
  email: string
  phone: string
}

export type LeadFormErrors = Partial<Record<keyof LeadFormValues, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/

// Mirrors the server-side Zod rules so users get instant feedback; the server remains the source of truth.
export function validateLead(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()

  if (!name) errors.name = 'Name is required'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters'
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters'

  if (!email) errors.email = 'Email is required'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address'

  if (!phone) errors.phone = 'Phone is required'
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'Enter a valid phone number'
  else {
    const digits = phone.replace(/\D/g, '').length
    if (digits < 7 || digits > 15) errors.phone = 'Phone number must contain 7 to 15 digits'
  }

  return errors
}
