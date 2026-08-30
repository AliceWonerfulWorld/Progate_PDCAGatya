import { describe, expect, it } from 'vitest'
import { getGuestOnboardingFocus, getGuestOnboardingRoute } from './guestOnboarding'
import type { GuestState } from './guestStore'

const emptyGuestState: GuestState = {
  guestSessionId: 'guest-session',
  gacha: { availableDraws: 0, firstResult: null },
}

describe('getGuestOnboardingRoute', () => {
  it('routes a first-time Guest to the welcome screen', () => {
    expect(getGuestOnboardingRoute(emptyGuestState)).toBe('/welcome')
  })

  it('does not interrupt a Guest who has already created a Goal', () => {
    expect(getGuestOnboardingRoute({
      ...emptyGuestState,
      goal: { name: '英語学習' },
    })).toBeNull()
  })
})

describe('getGuestOnboardingFocus', () => {
  it('focuses the initial PLAN confirmation for a Guest with a Goal but no Cycle', () => {
    expect(getGuestOnboardingFocus({
      ...emptyGuestState,
      goal: { name: '英語学習' },
    })).toBe('plan')
  })

  it('focuses the CHECK action while the initial DO step is in progress', () => {
    expect(getGuestOnboardingFocus({
      ...emptyGuestState,
      goal: { name: '英語学習' },
      cycle: { planText: '英単語を5個復習する', status: 'doing', startedAt: 1 },
    })).toBe('do')
  })

  it('does not restrict the user once CHECK choices need their own judgment', () => {
    expect(getGuestOnboardingFocus({
      ...emptyGuestState,
      goal: { name: '英語学習' },
      cycle: { planText: '英単語を5個復習する', status: 'checking', startedAt: 1 },
    })).toBeNull()
  })
})
