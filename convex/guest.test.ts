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

async function seedCharacter(t: TestConvex, name: string, rarity: 'R' | 'SR' | 'SSR' = 'SR'): Promise<Id<'characters'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('characters', {
      name,
      rarity,
      description: 'テスト用',
      imagePath: '/characters/test.webp',
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  })
}

describe('migrateGuestData', () => {
  it('AC-GUEST-004: migrates Goal / completed PDCA / XP / Gacha result / Inventory / History', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const characterId = await seedCharacter(t, 'ゲスト獲得キャラ')
    const asUser = t.withIdentity({ subject: 'user_a' })

    const result = await asUser.mutation(api.guest.migrateGuestData, {
      guestSessionId: 'guest-session-1',
      guestData: {
        goal: { name: '英語学習' },
        cycle: {
          planText: '英単語を5個復習する',
          status: 'completed',
          doResult: 'completed',
          checkLoad: 'justRight',
          actType: 'same',
          nextPlanCandidate: '英単語を3個にする',
          startedAt: Date.now() - 1000,
        },
        gacha: {
          availableDraws: 1,
          firstResult: { characterId, characterName: 'ゲスト獲得キャラ', rarity: 'SR' },
        },
      },
    })

    expect(result.alreadyMigrated).toBe(false)
    expect(result.goalId).not.toBeNull()
    expect(result.cycleId).not.toBeNull()

    const { user, goal, cycle, inventory, gachaHistory } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      goal: result.goalId ? await ctx.db.get(result.goalId) : null,
      cycle: result.cycleId ? await ctx.db.get(result.cycleId) : null,
      inventory: await ctx.db
        .query('inventories')
        .withIndex('by_user_character', (q) => q.eq('userId', userId).eq('characterId', characterId))
        .unique(),
      gachaHistory: await ctx.db.query('gachaHistory').collect(),
    }))

    expect(goal).toMatchObject({ name: '英語学習', totalCycles: 1, activeDays: 1 })
    expect(cycle).toMatchObject({ status: 'completed', planText: '英単語を5個復習する' })
    expect(user).toMatchObject({
      playerXp: 100,
      totalCycles: 1,
      currentStreak: 1,
      // 1 (完了報酬) + 1 (guestに残っていた未消費ガチャ権)
      availableGachaDraws: 2,
      totalGachaDraws: 1,
      lastMigratedGuestSessionId: 'guest-session-1',
    })
    expect(inventory).toMatchObject({ fragmentCount: 0, duplicateCount: 0 })
    expect(gachaHistory).toHaveLength(1)
    // RarityはCharacter masterの値を正とする(guestの自己申告は信用しない)。
    expect(gachaHistory[0]).toMatchObject({ rarity: 'SR', wasDuplicate: false, drawSequence: 1 })
  })

  it('AC-GUEST-005: sending the same guestSessionId twice does not duplicate anything', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })
    const guestData = {
      goal: { name: '英語学習' },
      cycle: {
        planText: '英単語を5個復習する',
        status: 'completed' as const,
        doResult: 'completed' as const,
        checkLoad: 'justRight' as const,
        actType: 'same' as const,
        startedAt: Date.now() - 1000,
      },
      gacha: { availableDraws: 0, firstResult: null },
    }

    await asUser.mutation(api.guest.migrateGuestData, { guestSessionId: 'guest-session-1', guestData })
    const second = await asUser.mutation(api.guest.migrateGuestData, {
      guestSessionId: 'guest-session-1',
      guestData,
    })

    expect(second.alreadyMigrated).toBe(true)

    const { user, goals, cycles } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      goals: await ctx.db.query('goals').collect(),
      cycles: await ctx.db.query('pdcaCycles').collect(),
    }))

    expect(goals).toHaveLength(1)
    expect(cycles).toHaveLength(1)
    expect(user?.playerXp).toBe(100)
    expect(user?.totalCycles).toBe(1)
  })

  it('does not grant a reward when the guest cycle was never completed', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })

    await asUser.mutation(api.guest.migrateGuestData, {
      guestSessionId: 'guest-session-1',
      guestData: {
        goal: { name: '英語学習' },
        cycle: { planText: '英単語を5個復習する', status: 'doing', startedAt: Date.now() },
        gacha: { availableDraws: 0, firstResult: null },
      },
    })

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.playerXp).toBe(0)
    expect(user?.totalCycles).toBe(0)
    expect(user?.availableGachaDraws).toBe(0)
  })

  it('migrates only unspent Gacha draws when no character was drawn yet', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })

    await asUser.mutation(api.guest.migrateGuestData, {
      guestSessionId: 'guest-session-1',
      guestData: { gacha: { availableDraws: 3, firstResult: null } },
    })

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.availableGachaDraws).toBe(3)
    const gachaHistory = await t.run((ctx) => ctx.db.query('gachaHistory').collect())
    expect(gachaHistory).toHaveLength(0)
  })

  it('rejects an empty guestSessionId', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')

    try {
      await t.withIdentity({ subject: 'user_a' }).mutation(api.guest.migrateGuestData, {
        guestSessionId: '   ',
        guestData: { gacha: { availableDraws: 0, firstResult: null } },
      })
      throw new Error('expected migrateGuestData to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(ERROR_CODES.GUEST_INVALID_DATA)
    }
  })
})
