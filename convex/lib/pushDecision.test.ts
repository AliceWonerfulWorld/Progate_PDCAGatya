import { describe, expect, it } from 'vitest'
import { getLocalHour, shouldNotifyAtRisk } from './pushDecision'

describe('getLocalHour', () => {
  it('formats a timestamp as the local hour (0-23) for the given IANA timezone', () => {
    const timestamp = Date.UTC(2026, 7, 29, 1, 0, 0) // 2026-08-29T01:00:00Z = 10:00 JST
    expect(getLocalHour(timestamp, 'Asia/Tokyo')).toBe(10)
  })

  it('returns a different local hour for the same instant in a different timezone', () => {
    const timestamp = Date.UTC(2026, 7, 29, 1, 0, 0) // 2026-08-29T01:00:00Z
    // America/Los_Angeles is UTC-7 in August (PDT).
    expect(getLocalHour(timestamp, 'America/Los_Angeles')).toBe(18)
  })

  it('wraps around midnight', () => {
    const timestamp = Date.UTC(2026, 7, 28, 15, 30, 0) // 2026-08-29 00:30 JST
    expect(getLocalHour(timestamp, 'Asia/Tokyo')).toBe(0)
  })
})

describe('shouldNotifyAtRisk', () => {
  // 2026-08-29T01:00:00Z = 2026-08-29 10:00 JST
  const now = Date.UTC(2026, 7, 29, 1, 0, 0)
  const timezone = 'Asia/Tokyo'

  it('does not notify when the streak is active (no gap)', () => {
    const result = shouldNotifyAtRisk('2026-08-28', undefined, timezone, now, [10])
    expect(result.shouldNotify).toBe(false)
    expect(result.today).toBe('2026-08-29')
  })

  it('does not notify when at risk but the current local hour is not selected', () => {
    const result = shouldNotifyAtRisk('2026-08-27', undefined, timezone, now, [19, 21])
    expect(result.shouldNotify).toBe(false)
  })

  it('notifies when at risk, the local hour matches, and not yet notified today', () => {
    const result = shouldNotifyAtRisk('2026-08-27', undefined, timezone, now, [10])
    expect(result.shouldNotify).toBe(true)
  })

  it('notifies when the last notification was on a previous day', () => {
    const result = shouldNotifyAtRisk('2026-08-27', '2026-08-28', timezone, now, [10])
    expect(result.shouldNotify).toBe(true)
  })

  it('does not notify twice on the same local day', () => {
    const result = shouldNotifyAtRisk('2026-08-27', '2026-08-29', timezone, now, [10])
    expect(result.shouldNotify).toBe(false)
  })

  it('matches when any of several selected hours equals the current local hour', () => {
    const result = shouldNotifyAtRisk('2026-08-27', undefined, timezone, now, [7, 10, 19])
    expect(result.shouldNotify).toBe(true)
  })

  it('delegates streak-status derivation to deriveStreakStatus (no completion ever recorded stays active)', () => {
    const result = shouldNotifyAtRisk(undefined, undefined, timezone, now, [10])
    expect(result.shouldNotify).toBe(false)
  })
})
