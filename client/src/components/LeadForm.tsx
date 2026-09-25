import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { validateLead, type LeadFormErrors, type LeadFormValues } from '../lib/validation'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type CreateLeadInput, type Lead, type LeadStatus } from '../types/lead'

interface LeadFormProps {
  onCreate: (input: CreateLeadInput) => Promise<Lead>
}

const EMPTY_VALUES: LeadFormValues = { name: '', email: '', phone: '' }

const inputClass =
  'mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100'

function fieldClass(hasError: boolean) {
  return `${inputClass} ${hasError ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-500'}`
}

export function LeadForm({ onCreate }: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY_VALUES)
  const [status, setStatus] = useState<LeadStatus>('NEW')
  const [errors, setErrors] = useState<LeadFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field: keyof LeadFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setSuccessMessage(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const validationErrors = validateLead(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const lead = await onCreate({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        status,
      })
      setValues(EMPTY_VALUES)
      setStatus('NEW')
      setErrors({})
      setSuccessMessage(`${lead.name} was added.`)
    } catch (err) {
      if (err instanceof ApiError && err.details.length > 0) {
        const fieldErrors: LeadFormErrors = {}
        for (const detail of err.details) {
          if (detail.path in EMPTY_VALUES) fieldErrors[detail.path as keyof LeadFormValues] ??= detail.message
        }
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length === 0) setFormError(err.message)
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="lead-form-title"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 id="lead-form-title" className="text-lg font-semibold">
        Add a lead
      </h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="lead-name" className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="lead-name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'lead-name-error' : undefined}
            className={fieldClass(Boolean(errors.name))}
            placeholder="Priya Sharma"
          />
          {errors.name && (
            <p id="lead-name-error" className="mt-1 text-xs text-rose-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'lead-email-error' : undefined}
            className={fieldClass(Boolean(errors.email))}
            placeholder="priya@example.com"
          />
          {errors.email && (
            <p id="lead-email-error" className="mt-1 text-xs text-rose-600">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-phone" className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
            className={fieldClass(Boolean(errors.phone))}
            placeholder="+91 98765 43210"
          />
          {errors.phone && (
            <p id="lead-phone-error" className="mt-1 text-xs text-rose-600">
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-status" className="block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="lead-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            disabled={isSubmitting}
            className={fieldClass(false)}
          >
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {formError && (
        <p role="alert" className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {formError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Adding…' : 'Add lead'}
      </button>
    </form>
  )
}
