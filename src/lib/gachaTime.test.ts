import { describe, expect, it } from 'vitest'
import { formatRemainingTime } from './gachaTime'

describe('formatRemainingTime', () => {
  it('returns 常時開催 when endAt is undefined (standing gacha)', () => {
    expect(formatRemainingTime(undefined)).toBe('常時開催')
  })

  it('returns 終了しました when the deadline has already passed', () => {
    const now = 1_000_000
    expect(formatRemainingTime(now - 1, now)).toBe('終了しました')
    expect(formatRemainingTime(now, now)).toBe('終了しました')
  })

  it('formats days and hours when more than a day remains', () => {
    const now = 0
    const endAt = 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 // 3 days 5 hours
    expect(formatRemainingTime(endAt, now)).toBe('残り3日5時間')
  })

  it('formats hours and minutes when less than a day remains', () => {
    const now = 0
    const endAt = 2 * 60 * 60 * 1000 + 15 * 60 * 1000 // 2 hours 15 minutes
    expect(formatRemainingTime(endAt, now)).toBe('残り2時間15分')
  })

  it('formats minutes only when less than an hour remains, at least 1 minute', () => {
    const now = 0
    expect(formatRemainingTime(30 * 60 * 1000, now)).toBe('残り30分')
    expect(formatRemainingTime(10 * 1000, now)).toBe('残り1分') // rounds up to 1, never 0分
  })
})
