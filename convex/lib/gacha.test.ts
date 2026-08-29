import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import {
  type CharacterCandidate,
  getDuplicateFragmentReward,
  rollRarity,
  selectCharacterForRarity,
} from './gacha'
import { ERROR_CODES } from './errors'

const STANDARD_RATES = { R: 0.7, SR: 0.25, SSR: 0.05 }

describe('rollRarity', () => {
  it('never returns anything other than R / SR / SSR', () => {
    for (let x = 0; x < 1; x += 0.001) {
      expect(['R', 'SR', 'SSR']).toContain(rollRarity(x, STANDARD_RATES))
    }
  })

  it('returns R for the low end of the range', () => {
    expect(rollRarity(0, STANDARD_RATES)).toBe('R')
    expect(rollRarity(0.69999, STANDARD_RATES)).toBe('R')
  })

  it('returns SR at the R/SR boundary (0.70 inclusive)', () => {
    expect(rollRarity(0.7, STANDARD_RATES)).toBe('SR')
    expect(rollRarity(0.94999, STANDARD_RATES)).toBe('SR')
  })

  it('returns SSR at the SR/SSR boundary (0.95 inclusive)', () => {
    expect(rollRarity(0.95, STANDARD_RATES)).toBe('SSR')
    expect(rollRarity(0.999999, STANDARD_RATES)).toBe('SSR')
  })

  it('reflects a different rates table (e.g. an event rate-up)', () => {
    const eventRates = { R: 0.4, SR: 0.4, SSR: 0.2 }
    expect(rollRarity(0.39, eventRates)).toBe('R')
    expect(rollRarity(0.4, eventRates)).toBe('SR')
    expect(rollRarity(0.8, eventRates)).toBe('SSR')
  })
})

describe('selectCharacterForRarity', () => {
  const characters: (CharacterCandidate & { name: string })[] = [
    { name: 'r-active-1', rarity: 'R', isActive: true },
    { name: 'r-active-2', rarity: 'R', isActive: true },
    { name: 'r-inactive', rarity: 'R', isActive: false },
    { name: 'sr-active', rarity: 'SR', isActive: true },
    { name: 'ssr-inactive', rarity: 'SSR', isActive: false },
  ]

  it('only selects candidates matching the given rarity', () => {
    const result = selectCharacterForRarity(characters, 'SR', 0)
    expect(result.name).toBe('sr-active')
  })

  it('excludes inactive characters from selection', () => {
    for (let x = 0; x < 1; x += 0.1) {
      const result = selectCharacterForRarity(characters, 'R', x)
      expect(result.isActive).toBe(true)
    }
  })

  it('distributes evenly across all active candidates for the rarity', () => {
    expect(selectCharacterForRarity(characters, 'R', 0).name).toBe('r-active-1')
    expect(selectCharacterForRarity(characters, 'R', 0.5).name).toBe('r-active-2')
    expect(selectCharacterForRarity(characters, 'R', 0.999999).name).toBe('r-active-2')
  })

  it('throws GACHA_NO_ACTIVE_CHARACTER when no active character exists for the rarity', () => {
    try {
      selectCharacterForRarity(characters, 'SSR', 0)
      throw new Error('expected selectCharacterForRarity to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(
        ERROR_CODES.GACHA_NO_ACTIVE_CHARACTER,
      )
    }
  })

  it('weights selection toward the higher-weight candidate (pickup-style)', () => {
    const weighted: (CharacterCandidate & { name: string })[] = [
      { name: 'common', rarity: 'SSR', isActive: true, weight: 1 },
      { name: 'pickup', rarity: 'SSR', isActive: true, weight: 3 },
    ]
    // totalWeight=4: [0, 1) -> common, [1, 4) -> pickup
    expect(selectCharacterForRarity(weighted, 'SSR', 0).name).toBe('common')
    expect(selectCharacterForRarity(weighted, 'SSR', 0.24999).name).toBe('common')
    expect(selectCharacterForRarity(weighted, 'SSR', 0.25).name).toBe('pickup')
    expect(selectCharacterForRarity(weighted, 'SSR', 0.999999).name).toBe('pickup')
  })

  it('treats an omitted weight as 1, matching the unweighted uniform result', () => {
    const explicit: (CharacterCandidate & { name: string })[] = [
      { name: 'a', rarity: 'R', isActive: true, weight: 1 },
      { name: 'b', rarity: 'R', isActive: true, weight: 1 },
    ]
    const implicit: (CharacterCandidate & { name: string })[] = [
      { name: 'a', rarity: 'R', isActive: true },
      { name: 'b', rarity: 'R', isActive: true },
    ]
    for (let x = 0; x < 1; x += 0.1) {
      expect(selectCharacterForRarity(implicit, 'R', x).name).toBe(
        selectCharacterForRarity(explicit, 'R', x).name,
      )
    }
  })
})

describe('getDuplicateFragmentReward', () => {
  it('returns R=10 / SR=20 / SSR=40', () => {
    expect(getDuplicateFragmentReward('R')).toBe(10)
    expect(getDuplicateFragmentReward('SR')).toBe(20)
    expect(getDuplicateFragmentReward('SSR')).toBe(40)
  })
})
