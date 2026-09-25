import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './format'

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-25T12:00:00Z').getTime()

  it('returns "just now" for very recent timestamps', () => {
    expect(formatRelativeTime('2026-09-25T11:59:30Z', now)).toBe('just now')
  })

  it('uses the largest fitting unit', () => {
    expect(formatRelativeTime('2026-09-25T11:55:00Z', now)).toBe('5 minutes ago')
    expect(formatRelativeTime('2026-09-25T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-09-24T12:00:00Z', now)).toBe('yesterday')
  })
})
