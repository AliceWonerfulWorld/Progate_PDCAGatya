import { describe, expect, it } from 'vitest'
import { calculatePlayerLevel, requiredXpForLevel } from './playerLevel'

// Base PDCA XP is 100 (docs/technical-design.md §20); inlined so this
// pure-function test has no dependency on the Convex module graph.
const BASE_PDCA_XP = 100

describe('requiredXpForLevel', () => {
  it('matches the documented cumulative-XP table (game-design.md §12)', () => {
    expect(requiredXpForLevel(1)).toBe(0)
    expect(requiredXpForLevel(2)).toBe(300)
    expect(requiredXpForLevel(3)).toBe(700)
    expect(requiredXpForLevel(4)).toBe(1200)
    expect(requiredXpForLevel(5)).toBe(1800)
  })

  it('clamps non-positive levels to 0 XP', () => {
    expect(requiredXpForLevel(0)).toBe(0)
    expect(requiredXpForLevel(-3)).toBe(0)
  })

  it('is strictly increasing with a widening gap per level', () => {
    let previous = requiredXpForLevel(1)
    let previousGap = 0
    for (let level = 2; level <= 50; level += 1) {
      const current = requiredXpForLevel(level)
      const gap = current - previous
      expect(current).toBeGreaterThan(previous)
      expect(gap).toBeGreaterThan(previousGap)
      previous = current
      previousGap = gap
    }
  })
})

describe('calculatePlayerLevel', () => {
  it('stays at level 1 from 0 XP up to just below the level 2 threshold', () => {
    expect(calculatePlayerLevel(0)).toBe(1)
    expect(calculatePlayerLevel(299)).toBe(1)
  })

  it('steps up exactly at each documented threshold', () => {
    expect(calculatePlayerLevel(300)).toBe(2)
    expect(calculatePlayerLevel(699)).toBe(2)
    expect(calculatePlayerLevel(700)).toBe(3)
    expect(calculatePlayerLevel(1199)).toBe(3)
    expect(calculatePlayerLevel(1200)).toBe(4)
    expect(calculatePlayerLevel(1800)).toBe(5)
  })

  it('does not level up a fresh account after a single PDCA (+100 XP)', () => {
    expect(calculatePlayerLevel(BASE_PDCA_XP)).toBe(1)
  })

  it('never returns below 1, including for non-positive XP', () => {
    expect(calculatePlayerLevel(-500)).toBe(1)
    expect(calculatePlayerLevel(0)).toBe(1)
  })

  it('stays consistent with requiredXpForLevel for large XP', () => {
    const level = calculatePlayerLevel(100_000)
    expect(requiredXpForLevel(level)).toBeLessThanOrEqual(100_000)
    expect(requiredXpForLevel(level + 1)).toBeGreaterThan(100_000)
  })
})
