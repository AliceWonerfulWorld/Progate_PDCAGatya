// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { ERROR_CODES } from './lib/errors'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  overrides: Partial<{ availableGachaDraws: number; totalGachaDraws: number }> = {},
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('users', {
      clerkUserId,
      playerXp: 0,
      playerLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      recoveryUsedInWindow: false,
      totalCycles: 0,
      totalGachaDraws: 0,
      availableGachaDraws: 0,
      timezone: 'Asia/Tokyo',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })
  })
}

async function seedCharacter(
  t: TestConvex,
  overrides: Partial<{
    name: string
    rarity: 'R' | 'SR' | 'SSR'
    isActive: boolean
    sortOrder: number
  }> = {},
): Promise<Id<'characters'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('characters', {
      name: overrides.name ?? 'テストキャラ',
      rarity: overrides.rarity ?? 'R',
      description: 'テスト用',
      imagePath: '/characters/test.webp',
      defaultMessage: 'よろしく！',
      sortOrder: overrides.sortOrder ?? 1,
      isActive: overrides.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
  })
}

// randomValue1: rollRarity用, randomValue2: selectCharacterForRarity用。
function mockRandom(...values: number[]) {
  const spy = vi.spyOn(Math, 'random')
  for (const value of values) {
    spy.mockImplementationOnce(() => value)
  }
  return spy
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('drawGacha', () => {
  it('AC-GACHA-003: succeeds once and consumes exactly one draw', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { availableGachaDraws: 1 })
    await seedCharacter(t, { rarity: 'R', name: 'R-1' })
    mockRandom(0.1, 0)

    const result = await t.withIdentity({ subject: 'user_a' }).mutation(api.gacha.drawGacha, {})

    expect(result).toMatchObject({
      characterName: 'R-1',
      rarity: 'R',
      wasDuplicate: false,
      availableGachaDraws: 0,
      totalGachaDraws: 1,
      drawSequence: 1,
    })

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.availableGachaDraws).toBe(0)
    expect(user?.totalGachaDraws).toBe(1)

    const history = await t.run((ctx) => ctx.db.query('gachaHistory').collect())
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ rarity: 'R', wasDuplicate: false, drawSequence: 1 })
  })

  it('AC-GACHA-004: rejects when no draws are available and changes nothing', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { availableGachaDraws: 0 })
    await seedCharacter(t)

    try {
      await t.withIdentity({ subject: 'user_a' }).mutation(api.gacha.drawGacha, {})
      throw new Error('expected drawGacha to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(
        ERROR_CODES.GACHA_NO_DRAW_AVAILABLE,
      )
    }

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.availableGachaDraws).toBe(0)
    expect(user?.totalGachaDraws).toBe(0)

    const history = await t.run((ctx) => ctx.db.query('gachaHistory').collect())
    expect(history).toHaveLength(0)
    const inventories = await t.run((ctx) => ctx.db.query('inventories').collect())
    expect(inventories).toHaveLength(0)
  })

  it('AC-GACHA-007: never draws an inactive Character', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { availableGachaDraws: 1 })
    await seedCharacter(t, { rarity: 'R', name: 'inactive', isActive: false })
    await seedCharacter(t, { rarity: 'R', name: 'active', isActive: true, sortOrder: 2 })
    mockRandom(0.1, 0.99) // would pick the last candidate if inactive were included

    const result = await t.withIdentity({ subject: 'user_a' }).mutation(api.gacha.drawGacha, {})

    expect(result.characterName).toBe('active')
  })

  it('AC-GACHA-008: first draw of a Character creates a fresh Inventory row', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { availableGachaDraws: 1 })
    const characterId = await seedCharacter(t, { rarity: 'SSR', name: 'new-char' })
    mockRandom(0.99, 0)

    const result = await t.withIdentity({ subject: 'user_a' }).mutation(api.gacha.drawGacha, {})

    expect(result.wasDuplicate).toBe(false)
    expect(result.fragmentReward).toBe(0)

    const inventory = await t.run((ctx) =>
      ctx.db
        .query('inventories')
        .withIndex('by_user_character', (q) => q.eq('userId', userId).eq('characterId', characterId))
        .unique(),
    )
    expect(inventory).toMatchObject({ fragmentCount: 0, duplicateCount: 0 })
    expect(typeof inventory?.obtainedAt).toBe('number')
  })

  it('AC-GACHA-009 / AC-GACHA-010: duplicate draws add fragments without a second Inventory row', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { availableGachaDraws: 2 })
    const characterId = await seedCharacter(t, { rarity: 'SR', name: 'dup-char' })
    const asUser = t.withIdentity({ subject: 'user_a' })

    mockRandom(0.8, 0)
    await asUser.mutation(api.gacha.drawGacha, {})
    mockRandom(0.8, 0)
    const second = await asUser.mutation(api.gacha.drawGacha, {})

    expect(second.wasDuplicate).toBe(true)
    expect(second.fragmentReward).toBe(20) // SR duplicate reward

    const inventories = await t.run((ctx) =>
      ctx.db
        .query('inventories')
        .withIndex('by_user_character', (q) => q.eq('userId', userId).eq('characterId', characterId))
        .collect(),
    )
    expect(inventories).toHaveLength(1)
    expect(inventories[0]).toMatchObject({ fragmentCount: 20, duplicateCount: 1 })
  })

  it('AC-GACHA-012: drawSequence increases 1, 2, 3, ...', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { availableGachaDraws: 3 })
    await seedCharacter(t, { rarity: 'R' })
    const asUser = t.withIdentity({ subject: 'user_a' })

    const sequences: number[] = []
    for (let i = 0; i < 3; i++) {
      mockRandom(0.1, 0)
      const result = await asUser.mutation(api.gacha.drawGacha, {})
      sequences.push(result.drawSequence)
    }

    expect(sequences).toEqual([1, 2, 3])
  })

  it('throws GACHA_NO_ACTIVE_CHARACTER when the rolled rarity has no active candidates', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { availableGachaDraws: 1 })
    await seedCharacter(t, { rarity: 'SSR', isActive: false })
    mockRandom(0.99, 0)

    try {
      await t.withIdentity({ subject: 'user_a' }).mutation(api.gacha.drawGacha, {})
      throw new Error('expected drawGacha to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(
        ERROR_CODES.GACHA_NO_ACTIVE_CHARACTER,
      )
    }

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.availableGachaDraws).toBe(1)
  })
})
