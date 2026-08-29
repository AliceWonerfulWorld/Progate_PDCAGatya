import { describe, expect, it } from 'vitest'
import { deriveStreakStatus, isRecoveryAvailable, resolveStreakState, type ResolveStreakStateInput } from './streak'

const base: ResolveStreakStateInput = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: undefined,
  lastRecoveryDate: undefined,
  streakStatus: 'active',
  pendingRecoveryDate: undefined,
  today: '2026-08-29',
  isRecovery: false,
  didCompleteToday: true,
}

describe('resolveStreakState', () => {
  it('AC-STREAK-001: first completion sets currentStreak=1', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: undefined,
      today: '2026-08-29',
      didCompleteToday: true,
    })
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBeGreaterThanOrEqual(1)
    expect(result.lastCompletedDate).toBe('2026-08-29')
    expect(result.streakUpdated).toBe(true)
  })

  it('AC-STREAK-002: additional completions on the same day do not change currentStreak', () => {
    const alreadyCompletedToday: ResolveStreakStateInput = {
      ...base,
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2026-08-29',
      today: '2026-08-29',
      didCompleteToday: true,
    }
    const result = resolveStreakState(alreadyCompletedToday)
    expect(result.currentStreak).toBe(3)
    expect(result.streakUpdated).toBe(false)
  })

  it('AC-STREAK-003: completing the day after increments currentStreak by 1', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDate: '2026-08-28',
      today: '2026-08-29',
      didCompleteToday: true,
    })
    expect(result.currentStreak).toBe(6)
    expect(result.longestStreak).toBe(6)
  })

  it('AC-STREAK-004: a one-day gap flags atRisk without resetting currentStreak', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 10,
      longestStreak: 10,
      lastCompletedDate: '2026-08-27',
      today: '2026-08-29',
      didCompleteToday: false,
    })
    expect(result.streakStatus).toBe('atRisk')
    expect(result.pendingRecoveryDate).toBe('2026-08-28')
    expect(result.currentStreak).toBe(10)
  })

  it('AC-RECOVERY-003: a Recovery completion within the deadline rescues the streak (+1, not +2)', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 14,
      longestStreak: 14,
      lastCompletedDate: '2026-08-27',
      streakStatus: 'atRisk',
      pendingRecoveryDate: '2026-08-28',
      today: '2026-08-29',
      isRecovery: true,
      didCompleteToday: true,
    })
    expect(result.currentStreak).toBe(15)
    expect(result.streakStatus).toBe('active')
    expect(result.pendingRecoveryDate).toBeUndefined()
    expect(result.lastRecoveryDate).toBe('2026-08-29')
  })

  it('AC-RECOVERY-004: resolving past the deadline without a completion resets to 0', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 14,
      longestStreak: 14,
      lastCompletedDate: '2026-08-27',
      streakStatus: 'atRisk',
      pendingRecoveryDate: '2026-08-28',
      today: '2026-08-30',
      didCompleteToday: false,
    })
    expect(result.currentStreak).toBe(0)
    expect(result.streakStatus).toBe('active')
    expect(result.pendingRecoveryDate).toBeUndefined()
  })

  it('AC-RECOVERY-005: a normal completion during atRisk records activity but keeps atRisk', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 10,
      longestStreak: 10,
      lastCompletedDate: '2026-08-27',
      streakStatus: 'atRisk',
      pendingRecoveryDate: '2026-08-28',
      today: '2026-08-29',
      isRecovery: false,
      didCompleteToday: true,
    })
    expect(result.lastCompletedDate).toBe('2026-08-29')
    expect(result.streakStatus).toBe('atRisk')
    expect(result.pendingRecoveryDate).toBe('2026-08-28')
    expect(result.currentStreak).toBe(10)
  })

  it('allows a same-day Recovery after an earlier same-day normal completion during atRisk', () => {
    const afterNormalCompletion = resolveStreakState({
      ...base,
      currentStreak: 10,
      longestStreak: 10,
      lastCompletedDate: '2026-08-27',
      streakStatus: 'atRisk',
      pendingRecoveryDate: '2026-08-28',
      today: '2026-08-29',
      isRecovery: false,
      didCompleteToday: true,
    })

    const afterRecovery = resolveStreakState({
      ...afterNormalCompletion,
      today: '2026-08-29',
      isRecovery: true,
      didCompleteToday: true,
    })

    expect(afterRecovery.currentStreak).toBe(11)
    expect(afterRecovery.streakStatus).toBe('active')
  })

  it('resets and restarts at 1 when more than one full day is missed outright', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 10,
      longestStreak: 10,
      lastCompletedDate: '2026-08-20',
      today: '2026-08-29',
      didCompleteToday: true,
    })
    expect(result.currentStreak).toBe(1)
    expect(result.streakStatus).toBe('active')
  })

  it('a passive check (no completion) never increments currentStreak', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDate: '2026-08-28',
      today: '2026-08-29',
      didCompleteToday: false,
    })
    expect(result.currentStreak).toBe(5)
    expect(result.streakUpdated).toBe(false)
  })

  it('never lets longestStreak fall below currentStreak after an update', () => {
    const result = resolveStreakState({
      ...base,
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2026-08-28',
      today: '2026-08-29',
      didCompleteToday: true,
    })
    expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak)
  })
})

describe('isRecoveryAvailable', () => {
  it('AC-RECOVERY-001: available when Recovery has never been used', () => {
    expect(isRecoveryAvailable(undefined, '2026-08-29')).toBe(true)
  })

  it('AC-RECOVERY-002: unavailable within 7 days of the last Recovery', () => {
    expect(isRecoveryAvailable('2026-08-25', '2026-08-29')).toBe(false)
  })

  it('is available again once 7 days have passed', () => {
    expect(isRecoveryAvailable('2026-08-22', '2026-08-29')).toBe(true)
  })
})

describe('deriveStreakStatus', () => {
  it('is active when there is no completion history yet', () => {
    expect(deriveStreakStatus(undefined, '2026-08-29')).toEqual({
      streakStatus: 'active',
      pendingRecoveryDate: undefined,
    })
  })

  it('is active on the same day and the day right after', () => {
    expect(deriveStreakStatus('2026-08-29', '2026-08-29').streakStatus).toBe('active')
    expect(deriveStreakStatus('2026-08-28', '2026-08-29').streakStatus).toBe('active')
  })

  it('AC-STREAK-004: is atRisk after exactly one missed local day', () => {
    expect(deriveStreakStatus('2026-08-27', '2026-08-29')).toEqual({
      streakStatus: 'atRisk',
      pendingRecoveryDate: '2026-08-28',
    })
  })

  it('is active again once the recovery deadline has passed (multiple days missed)', () => {
    expect(deriveStreakStatus('2026-08-20', '2026-08-29').streakStatus).toBe('active')
  })
})
