import { describe, expect, it } from 'vitest'
import { GACHA_SEED_DATA, selectUnseededGachas } from './gachaSeed'

describe('GACHA_SEED_DATA', () => {
  it('contains the standard gacha', () => {
    expect(GACHA_SEED_DATA).toHaveLength(1)
    expect(GACHA_SEED_DATA[0].key).toBe('standard')
  })

  it('has unique keys', () => {
    const keys = GACHA_SEED_DATA.map((gacha) => gacha.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has rates that sum to 1 for every entry', () => {
    for (const gacha of GACHA_SEED_DATA) {
      expect(gacha.rates.R + gacha.rates.SR + gacha.rates.SSR).toBeCloseTo(1)
    }
  })

  it('is active for every entry', () => {
    expect(GACHA_SEED_DATA.every((gacha) => gacha.isActive)).toBe(true)
  })
})

describe('selectUnseededGachas', () => {
  it('returns all gachas when nothing exists yet', () => {
    const result = selectUnseededGachas(new Set())
    expect(result).toHaveLength(GACHA_SEED_DATA.length)
  })

  it('returns nothing when every gacha already exists (idempotent re-run)', () => {
    const existingKeys = new Set(GACHA_SEED_DATA.map((gacha) => gacha.key))
    const result = selectUnseededGachas(existingKeys)
    expect(result).toHaveLength(0)
  })
})
