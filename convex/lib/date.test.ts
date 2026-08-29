import { describe, expect, it } from 'vitest'
import { addDaysToLocalDate, daysBetweenLocalDates, getLocalDateString, isNextLocalDay } from './date'

describe('getLocalDateString', () => {
  it('formats a timestamp as YYYY-MM-DD for the given IANA timezone', () => {
    const timestamp = Date.UTC(2026, 7, 28, 4, 0, 0) // 2026-08-28T04:00:00Z
    expect(getLocalDateString(timestamp, 'Asia/Tokyo')).toBe('2026-08-28')
  })

  it('returns a different local date for the same instant in a different timezone', () => {
    const timestamp = Date.UTC(2026, 7, 28, 4, 0, 0) // 2026-08-28T04:00:00Z
    // Asia/Tokyo (UTC+9) is already 08-28 13:00, LA (UTC-7 in August) is still 08-27 21:00.
    expect(getLocalDateString(timestamp, 'Asia/Tokyo')).toBe('2026-08-28')
    expect(getLocalDateString(timestamp, 'America/Los_Angeles')).toBe('2026-08-27')
  })

  it('crosses the local date boundary around 23:59 / 00:00 (AC-TIME-003)', () => {
    const beforeMidnightJst = Date.UTC(2026, 7, 28, 14, 59, 0) // 2026-08-28 23:59 JST
    const afterMidnightJst = Date.UTC(2026, 7, 28, 15, 1, 0) // 2026-08-29 00:01 JST

    expect(getLocalDateString(beforeMidnightJst, 'Asia/Tokyo')).toBe('2026-08-28')
    expect(getLocalDateString(afterMidnightJst, 'Asia/Tokyo')).toBe('2026-08-29')
  })

  it('does not depend on the host/UTC date when timezone pushes it to the next day', () => {
    const timestamp = Date.UTC(2026, 7, 28, 23, 30, 0) // still 08-28 in UTC
    // Asia/Tokyo is UTC+9, so this instant is already 08-29 08:30.
    expect(getLocalDateString(timestamp, 'Asia/Tokyo')).toBe('2026-08-29')
  })
})

describe('daysBetweenLocalDates', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetweenLocalDates('2026-08-28', '2026-08-28')).toBe(0)
  })

  it('returns 1 for consecutive dates', () => {
    expect(daysBetweenLocalDates('2026-08-27', '2026-08-28')).toBe(1)
  })

  it('returns a negative value when b precedes a', () => {
    expect(daysBetweenLocalDates('2026-08-28', '2026-08-27')).toBe(-1)
  })

  it('handles multi-day gaps', () => {
    expect(daysBetweenLocalDates('2026-08-20', '2026-08-27')).toBe(7)
  })

  it('handles month boundaries', () => {
    expect(daysBetweenLocalDates('2026-08-31', '2026-09-01')).toBe(1)
  })

  it('handles year boundaries', () => {
    expect(daysBetweenLocalDates('2026-12-31', '2027-01-01')).toBe(1)
  })
})

describe('isNextLocalDay', () => {
  it('returns true when b is exactly the local day after a', () => {
    const a = Date.UTC(2026, 7, 27, 10, 0, 0)
    const b = Date.UTC(2026, 7, 28, 10, 0, 0)
    expect(isNextLocalDay(a, b, 'Asia/Tokyo')).toBe(true)
  })

  it('returns false when both timestamps fall on the same local day', () => {
    const a = Date.UTC(2026, 7, 28, 1, 0, 0) // 2026-08-28 10:00 JST
    const b = Date.UTC(2026, 7, 28, 10, 0, 0) // 2026-08-28 19:00 JST
    expect(isNextLocalDay(a, b, 'Asia/Tokyo')).toBe(false)
  })

  it('returns false when more than one day apart', () => {
    const a = Date.UTC(2026, 7, 26, 10, 0, 0)
    const b = Date.UTC(2026, 7, 28, 10, 0, 0)
    expect(isNextLocalDay(a, b, 'Asia/Tokyo')).toBe(false)
  })

  it('is timezone-sensitive across the 23:59 / 00:00 boundary (AC-TIME-003)', () => {
    const beforeMidnightJst = Date.UTC(2026, 7, 28, 14, 59, 0) // 2026-08-28 23:59 JST
    const afterMidnightJst = Date.UTC(2026, 7, 28, 15, 1, 0) // 2026-08-29 00:01 JST

    expect(isNextLocalDay(beforeMidnightJst, afterMidnightJst, 'Asia/Tokyo')).toBe(true)
    // In UTC, both instants still fall on 2026-08-28, so it is not "the next day".
    expect(isNextLocalDay(beforeMidnightJst, afterMidnightJst, 'UTC')).toBe(false)
  })
})

describe('addDaysToLocalDate', () => {
  it('adds days within the same month', () => {
    expect(addDaysToLocalDate('2026-08-27', 1)).toBe('2026-08-28')
  })

  it('handles month boundaries', () => {
    expect(addDaysToLocalDate('2026-08-31', 1)).toBe('2026-09-01')
  })

  it('handles year boundaries', () => {
    expect(addDaysToLocalDate('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('supports subtracting days via a negative offset', () => {
    expect(addDaysToLocalDate('2026-08-01', -1)).toBe('2026-07-31')
  })

  it('is the inverse of daysBetweenLocalDates', () => {
    expect(daysBetweenLocalDates('2026-08-27', addDaysToLocalDate('2026-08-27', 5))).toBe(5)
  })
})
