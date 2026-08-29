import { describe, expect, it } from 'vitest'
import { CHARACTER_SEED_DATA } from './characterSeed'
import { GACHA_SEED_DATA, selectUnseededGachas } from './gachaSeed'

describe('GACHA_SEED_DATA', () => {
  it('contains the standard and Progate gachas', () => {
    expect(GACHA_SEED_DATA.map((gacha) => gacha.key)).toEqual(['standard', 'progate'])
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

  it('only the standing gacha has no time limit; Progate is time-limited with a banner image', () => {
    const [standard, progate] = GACHA_SEED_DATA
    expect(standard.durationMs).toBeUndefined()
    expect(standard.imagePath).toBeUndefined()
    expect(progate.durationMs).toBeGreaterThan(0)
    expect(progate.imagePath).toBe('/gacha/progate.svg')
  })

  it('every characterNames entry references a real character name', () => {
    const realNames = new Set(CHARACTER_SEED_DATA.map((character) => character.name))
    for (const gacha of GACHA_SEED_DATA) {
      for (const name of gacha.characterNames ?? []) {
        expect(realNames.has(name)).toBe(true)
      }
    }
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
