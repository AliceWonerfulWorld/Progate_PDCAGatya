export const BASE_PDCA_XP = 100

export const GACHA_RATES = {
  R: 0.7,
  SR: 0.25,
  SSR: 0.05,
} as const

export const DUPLICATE_FRAGMENT_REWARDS = {
  R: 10,
  SR: 20,
  SSR: 40,
} as const

export const INPUT_LIMITS = {
  goalName: 100,
  planText: 200,
  checkMemo: 500,
  nextPlanCandidate: 200,
  displayName: 50,
} as const

export type CharacterRarity = keyof typeof GACHA_RATES
