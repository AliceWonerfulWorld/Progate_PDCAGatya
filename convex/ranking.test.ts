// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

const DAY_MS = 24 * 60 * 60 * 1000

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  overrides: Partial<{ playerXp: number; displayName: string }> = {},
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

async function seedGoal(t: TestConvex, userId: Id<'users'>, name = '英語学習'): Promise<Id<'goals'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('goals', {
      userId,
      name,
      totalCycles: 0,
      activeDays: 0,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function seedCompletedCycle(
  t: TestConvex,
  userId: Id<'users'>,
  goalId: Id<'goals'>,
  completedAt: number,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('pdcaCycles', {
      userId,
      goalId,
      planText: '英単語を5個復習する',
      status: 'completed',
      doResult: 'completed',
      checkLoad: 'justRight',
      actType: 'same',
      isRecovery: false,
      startedAt: completedAt,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    })
  })
}

describe('getLevelRanking', () => {
  it('ranks all users by playerXp descending and reports displayName fallback', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { playerXp: 500, displayName: 'ゆうと' })
    await seedUser(t, 'user_b', { playerXp: 1200 })
    const meId = await seedUser(t, 'user_c', { playerXp: 800 })

    const result = await t.withIdentity({ subject: 'user_c' }).query(api.ranking.getLevelRanking, {})

    expect(result.top.map((entry) => entry.value)).toEqual([1200, 800, 500])
    expect(result.top[0].displayName).toBe('プレイヤー') // user_b never set a displayName
    expect(result.top[2].displayName).toBe('ゆうと')

    expect(result.me).not.toBeNull()
    expect(result.me?.userId).toBe(meId)
    expect(result.me?.rank).toBe(2)
    expect(result.me?.value).toBe(800)
  })
})

describe('getPeriodRanking', () => {
  it('counts only cycles completed within the requested rolling window', async () => {
    const t = convexTest(schema, modules)
    const userA = await seedUser(t, 'user_a')
    const goalA = await seedGoal(t, userA)
    const userB = await seedUser(t, 'user_b')
    const goalB = await seedGoal(t, userB)

    const now = Date.now()
    // user_a: 2 cycles this week, 1 cycle last month (outside week, inside month)
    await seedCompletedCycle(t, userA, goalA, now)
    await seedCompletedCycle(t, userA, goalA, now - 2 * DAY_MS)
    await seedCompletedCycle(t, userA, goalA, now - 20 * DAY_MS)
    // user_b: 1 cycle this week
    await seedCompletedCycle(t, userB, goalB, now)

    const asA = t.withIdentity({ subject: 'user_a' })
    const weekly = await asA.query(api.ranking.getPeriodRanking, { period: 'week' })
    expect(weekly.top).toEqual([
      expect.objectContaining({ userId: userA, value: 2, rank: 1 }),
      expect.objectContaining({ userId: userB, value: 1, rank: 2 }),
    ])
    expect(weekly.me?.value).toBe(2)

    const monthly = await asA.query(api.ranking.getPeriodRanking, { period: 'month' })
    expect(monthly.me?.value).toBe(3)
  })

  it('returns me: null when the current user has no completions in the window', async () => {
    const t = convexTest(schema, modules)
    const userA = await seedUser(t, 'user_a')
    const goalA = await seedGoal(t, userA)
    await seedUser(t, 'user_b')

    await seedCompletedCycle(t, userA, goalA, Date.now())

    const result = await t.withIdentity({ subject: 'user_b' }).query(api.ranking.getPeriodRanking, { period: 'week' })
    expect(result.me).toBeNull()
    expect(result.top).toHaveLength(1)
  })

  it('excludes cycles that are not yet completed', async () => {
    const t = convexTest(schema, modules)
    const userA = await seedUser(t, 'user_a')
    const goalA = await seedGoal(t, userA)

    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('pdcaCycles', {
        userId: userA,
        goalId: goalA,
        planText: '進行中',
        status: 'doing',
        isRecovery: false,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    const result = await t.withIdentity({ subject: 'user_a' }).query(api.ranking.getPeriodRanking, { period: 'week' })
    expect(result.me).toBeNull()
  })
})
