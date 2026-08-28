import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import {
  type CharacterCandidate,
  getDuplicateFragmentReward,
  rollRarity,
  selectCharacterForRarity,
} from './gacha'
import { ERROR_CODES } from './errors'

describe('rollRarity', () => {
  it('never returns anything other than R / SR / SSR', () => {
    for (let x = 0; x < 1; x += 0.001) {
      expect(['R', 'SR', 'SSR']).toContain(rollRarity(x))
    }
  })

  it('returns R for the low end of the range', () => {
    expect(rollRarity(0)).toBe('R')
    expect(rollRarity(0.69999)).toBe('R')
  })

  it('returns SR at the R/SR boundary (0.70 inclusive)', () => {
    expect(rollRarity(0.7)).toBe('SR')
    expect(rollRarity(0.94999)).toBe('SR')
  })

  it('returns SSR at the SR/SSR boundary (0.95 inclusive)', () => {
    expect(rollRarity(0.95)).toBe('SSR')
    expect(rollRarity(0.999999)).toBe('SSR')
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
})

describe('getDuplicateFragmentReward', () => {
  it('returns R=10 / SR=20 / SSR=40', () => {
    expect(getDuplicateFragmentReward('R')).toBe(10)
    expect(getDuplicateFragmentReward('SR')).toBe(20)
    expect(getDuplicateFragmentReward('SSR')).toBe(40)
  })
})
