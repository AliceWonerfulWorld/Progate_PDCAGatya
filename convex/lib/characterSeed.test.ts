import { describe, expect, it } from 'vitest'
import { CHARACTER_SEED_DATA, selectUnseededCharacters } from './characterSeed'

describe('CHARACTER_SEED_DATA', () => {
  it('contains exactly 15 characters', () => {
    expect(CHARACTER_SEED_DATA).toHaveLength(15)
  })

  it('has R:8 / SR:5 / SSR:2', () => {
    const counts = { R: 0, SR: 0, SSR: 0 }
    for (const character of CHARACTER_SEED_DATA) {
      counts[character.rarity]++
    }
    expect(counts).toEqual({ R: 8, SR: 5, SSR: 2 })
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

  it('has an imagePath matching the rarity-prefixed convention', () => {
    const prefixByRarity = { R: 'r', SR: 'sr', SSR: 'ssr' } as const
    for (const character of CHARACTER_SEED_DATA) {
      const prefix = prefixByRarity[character.rarity]
      expect(character.imagePath).toMatch(new RegExp(`^/characters/${prefix}_\\d{3}\\.webp$`))
    }
  })
})

describe('selectUnseededCharacters', () => {
  it('returns all characters when nothing exists yet', () => {
    const result = selectUnseededCharacters(new Set())
    expect(result).toHaveLength(15)
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
