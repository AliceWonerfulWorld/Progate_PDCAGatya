import { describe, expect, it } from 'vitest'
import { CHARACTER_SEED_DATA, selectUnseededCharacters } from './characterSeed'

describe('CHARACTER_SEED_DATA', () => {
  it('contains exactly 16 characters (15 base + 1 Progateコラボ)', () => {
    expect(CHARACTER_SEED_DATA).toHaveLength(16)
  })

  it('has R:8 / SR:5 / SSR:3', () => {
    const counts = { R: 0, SR: 0, SSR: 0 }
    for (const character of CHARACTER_SEED_DATA) {
      counts[character.rarity]++
    }
    expect(counts).toEqual({ R: 8, SR: 5, SSR: 3 })
  })

  it('has unique names', () => {
    const names = CHARACTER_SEED_DATA.map((character) => character.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has unique, stable sortOrder values', () => {
    const sortOrders = CHARACTER_SEED_DATA.map((character) => character.sortOrder)
    expect(new Set(sortOrders).size).toBe(sortOrders.length)
  })

  it('is active for every character', () => {
    expect(CHARACTER_SEED_DATA.every((character) => character.isActive)).toBe(true)
  })

  it('has an imagePath matching the rarity-prefixed convention (Progateコラボキャラは除く)', () => {
    const prefixByRarity = { R: 'r', SR: 'sr', SSR: 'ssr' } as const
    for (const character of CHARACTER_SEED_DATA) {
      if (character.name === 'にんじゃわんこ') continue
      const prefix = prefixByRarity[character.rarity]
      expect(character.imagePath).toMatch(new RegExp(`^/characters/${prefix}_\\d{3}\\.webp$`))
    }
  })

  it('has a real, downloaded image file for the Progateコラボキャラ', () => {
    const ninjaWanko = CHARACTER_SEED_DATA.find((character) => character.name === 'にんじゃわんこ')
    expect(ninjaWanko?.imagePath).toBe('/characters/progate_ninjawanko.png')
  })
})

describe('selectUnseededCharacters', () => {
  it('returns all characters when nothing exists yet', () => {
    const result = selectUnseededCharacters(new Set())
    expect(result).toHaveLength(CHARACTER_SEED_DATA.length)
  })

  it('returns nothing when every character already exists (idempotent re-run)', () => {
    const existingNames = new Set(CHARACTER_SEED_DATA.map((character) => character.name))
    const result = selectUnseededCharacters(existingNames)
    expect(result).toHaveLength(0)
  })

  it('returns only the missing characters on a partial re-run', () => {
    const [first, ...rest] = CHARACTER_SEED_DATA
    const existingNames = new Set(rest.map((character) => character.name))
    const result = selectUnseededCharacters(existingNames)
    expect(result).toEqual([first])
  })
})
