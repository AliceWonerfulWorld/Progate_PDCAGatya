// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { ERROR_CODES } from './lib/errors'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(t: TestConvex, clerkUserId: string): Promise<Id<'users'>> {
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
    })
  })
}

async function seedCharacter(
  t: TestConvex,
  name: string,
  sortOrder: number,
  rarity: 'R' | 'SR' | 'SSR' = 'R',
): Promise<Id<'characters'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('characters', {
      name,
      rarity,
      description: 'テスト用',
      imagePath: '/characters/test.webp',
      sortOrder,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function seedInventory(
  t: TestConvex,
  userId: Id<'users'>,
  characterId: Id<'characters'>,
  overrides: Partial<{ fragmentCount: number; duplicateCount: number }> = {},
): Promise<void> {
  await t.run(async (ctx) => {
    const now = Date.now()
    await ctx.db.insert('inventories', {
      userId,
      characterId,
      fragmentCount: overrides.fragmentCount ?? 0,
      duplicateCount: overrides.duplicateCount ?? 0,
      obtainedAt: now,
      updatedAt: now,
    })
  })
}

describe('listCollection', () => {
  it('AC-COLLECTION-001/002: marks owned vs unowned Characters, sorted by sortOrder', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const charB = await seedCharacter(t, 'B', 2)
    const charA = await seedCharacter(t, 'A', 1)
    await seedInventory(t, userId, charA, { fragmentCount: 40, duplicateCount: 2 })

    const collection = await t.withIdentity({ subject: 'user_a' }).query(api.characters.listCollection, {})

    expect(collection.map((entry) => entry.character._id)).toEqual([charA, charB])
    expect(collection[0]).toMatchObject({ owned: true, fragmentCount: 40, duplicateCount: 2 })
    expect(collection[1]).toMatchObject({ owned: false, fragmentCount: 0, duplicateCount: 0 })
  })

  it('marks the current partner Character with isPartner=true', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const characterId = await seedCharacter(t, 'Partner', 1)
    await seedInventory(t, userId, characterId)
    await t.run((ctx) => ctx.db.patch(userId, { partnerCharacterId: characterId }))

    const collection = await t.withIdentity({ subject: 'user_a' }).query(api.characters.listCollection, {})

    expect(collection[0].isPartner).toBe(true)
  })
})

describe('setPartnerCharacter', () => {
  it('AC-COLLECTION-004: sets an owned Character as partner', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const characterId = await seedCharacter(t, 'Owned', 1)
    await seedInventory(t, userId, characterId)

    const result = await t
      .withIdentity({ subject: 'user_a' })
      .mutation(api.users.setPartnerCharacter, { characterId })

    expect(result.partnerCharacterId).toBe(characterId)
    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.partnerCharacterId).toBe(characterId)
  })

  it('AC-COLLECTION-005: rejects setting an unowned Character as partner', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const characterId = await seedCharacter(t, 'NotOwned', 1)

    try {
      await t.withIdentity({ subject: 'user_a' }).mutation(api.users.setPartnerCharacter, { characterId })
      throw new Error('expected setPartnerCharacter to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(ERROR_CODES.CHARACTER_NOT_OWNED)
    }

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.partnerCharacterId).toBeUndefined()
  })
})
