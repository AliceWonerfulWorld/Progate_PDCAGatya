import type { GuestState } from './guestStore'

export function getGuestOnboardingRoute(state: GuestState): '/welcome' | null {
  return state.goal ? null : '/welcome'
}

export function getGuestOnboardingFocus(state: GuestState): 'plan' | 'do' | null {
  if (!state.goal || state.cycle?.status === 'completed' || state.cycle?.status === 'cancelled') {
    return null
  }

  if (!state.cycle) return 'plan'
  return state.cycle.status === 'doing' ? 'do' : null
}
