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

const TIMEZONE = 'Asia/Tokyo'
const DAY_MS = 24 * 60 * 60 * 1000

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  overrides: Partial<{ currentStreak: number; totalCycles: number }> = {},
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
      timezone: TIMEZONE,
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
  overrides: Partial<{
    planText: string
    doResult: 'completed' | 'partial' | 'notCompleted'
    checkLoad: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
    actType: 'lighter' | 'same' | 'heavier' | 'changeApproach'
    nextPlanCandidate: string
  }> = {},
): Promise<Id<'pdcaCycles'>> {
  return t.run(async (ctx) => {
    return ctx.db.insert('pdcaCycles', {
      userId,
      goalId,
      planText: overrides.planText ?? '英単語を5個復習する',
      status: 'completed',
      doResult: overrides.doResult ?? 'completed',
      checkLoad: overrides.checkLoad ?? 'justRight',
      actType: overrides.actType ?? 'same',
      nextPlanCandidate: overrides.nextPlanCandidate,
      isRecovery: false,
      startedAt: completedAt,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    })
  })
}

describe('getHistorySummary', () => {
  it('AC-HISTORY-004: counts today / week / total correctly and excludes cycles beyond 7 days', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { currentStreak: 5, totalCycles: 42 })
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    const now = Date.now()
    await seedCompletedCycle(t, userId, goalId, now) // today
    await seedCompletedCycle(t, userId, goalId, now - 3 * DAY_MS) // this week
    await seedCompletedCycle(t, userId, goalId, now - 10 * DAY_MS) // outside the week window

    const summary = await asUser.query(api.history.getHistorySummary, {})

    expect(summary.currentStreak).toBe(5)
    expect(summary.totalCycles).toBe(42)
    expect(summary.todayCycles).toBe(1)
    expect(summary.weekCycles).toBe(2)
  })

  it('returns zero counts when there is no history yet', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const summary = await t.withIdentity({ subject: 'user_a' }).query(api.history.getHistorySummary, {})

    expect(summary).toMatchObject({ todayCycles: 0, weekCycles: 0, totalCycles: 0, currentStreak: 0 })
  })
})

describe('getCompletionHeatmap', () => {
  it('buckets completed cycles by local date, newest day last, and excludes non-completed cycles', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    const now = Date.now()
    await seedCompletedCycle(t, userId, goalId, now) // today: 1
    await seedCompletedCycle(t, userId, goalId, now - 5 * 60 * 1000) // today: 2 (same day, different time)
    await seedCompletedCycle(t, userId, goalId, now - 3 * DAY_MS) // 3 days ago: 1

    await t.run(async (ctx) => {
      await ctx.db.insert('pdcaCycles', {
        userId,
        goalId,
        planText: '進行中',
        status: 'doing',
        isRecovery: false,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    const days = await asUser.query(api.history.getCompletionHeatmap, {})

    expect(days[days.length - 1].count).toBe(2) // today is the last entry
    expect(days[days.length - 4].count).toBe(1) // 3 days ago
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(3)
    // consecutive, ascending dates with no gaps or duplicates
    const dates = new Set(days.map((day) => day.date))
    expect(dates.size).toBe(days.length)
  })

  it('returns all zero counts when there is no history yet', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const days = await t.withIdentity({ subject: 'user_a' }).query(api.history.getCompletionHeatmap, {})

    expect(days.every((day) => day.count === 0)).toBe(true)
    expect(days.length).toBeGreaterThan(0)
  })
})

const FIRST_PAGE = { cursor: null, numItems: 20 }

describe('listCycles', () => {
  it('AC-HISTORY-001: returns completed cycle summaries newest first, across all goals', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalA = await seedGoal(t, userId, '英語学習')
    const goalB = await seedGoal(t, userId, '筋トレ')
    const asUser = t.withIdentity({ subject: 'user_a' })

    const now = Date.now()
    const older = await seedCompletedCycle(t, userId, goalA, now - DAY_MS, { planText: '古い方' })
    const newer = await seedCompletedCycle(t, userId, goalB, now, { planText: '新しい方' })

    const result = await asUser.query(api.history.listCycles, { period: 'all', paginationOpts: FIRST_PAGE })

    expect(result.page.map((item) => item.cycleId)).toEqual([newer, older])
    expect(result.page[0].planText).toBe('新しい方')
    expect(result.page[0].goalName).toBe('筋トレ')
    expect(result.page[1].goalName).toBe('英語学習')
  })

  it('AC-HISTORY-003: filters to a single Goal when goalId is given', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalA = await seedGoal(t, userId, '英語学習')
    const goalB = await seedGoal(t, userId, '筋トレ')
    const asUser = t.withIdentity({ subject: 'user_a' })

    const now = Date.now()
    await seedCompletedCycle(t, userId, goalA, now)
    await seedCompletedCycle(t, userId, goalB, now)

    const result = await asUser.query(api.history.listCycles, {
      goalId: goalA,
      period: 'all',
      paginationOpts: FIRST_PAGE,
    })

    expect(result.page).toHaveLength(1)
    expect(result.page[0].goalName).toBe('英語学習')
  })

  it('excludes cycles that are not yet completed', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('pdcaCycles', {
        userId,
        goalId,
        planText: '進行中',
        status: 'doing',
        isRecovery: false,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    const result = await asUser.query(api.history.listCycles, { period: 'all', paginationOpts: FIRST_PAGE })
    expect(result.page).toHaveLength(0)
  })

  it("rejects filtering by another user's Goal (AC-AUTH-003)", async () => {
    const t = convexTest(schema, modules)
    const ownerId = await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const goalId = await seedGoal(t, ownerId)

    try {
      await t.withIdentity({ subject: 'user_b' }).query(api.history.listCycles, {
        goalId,
        period: 'all',
        paginationOpts: FIRST_PAGE,
      })
      throw new Error('expected listRecentCycles to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError)
      expect((error as ConvexError<{ code: string }>).data.code).toBe(ERROR_CODES.GOAL_FORBIDDEN)
    }
  })

  it('returns history in pages and resets the period at the server boundary', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })
    const now = Date.now()

    for (let index = 0; index < 3; index += 1) {
      await seedCompletedCycle(t, userId, goalId, now - index * 1_000, { planText: `PLAN ${index}` })
    }
    await seedCompletedCycle(t, userId, goalId, now - 40 * DAY_MS, { planText: '古いPLAN' })

    const first = await asUser.query(api.history.listCycles, {
      period: 'all',
      paginationOpts: { cursor: null, numItems: 2 },
    })
    const second = await asUser.query(api.history.listCycles, {
      period: 'all',
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    })
    const recentOnly = await asUser.query(api.history.listCycles, {
      period: '30d',
      paginationOpts: FIRST_PAGE,
    })

    expect(first.page).toHaveLength(2)
    expect(second.page).toHaveLength(2)
    expect(recentOnly.page.map((item) => item.planText)).not.toContain('古いPLAN')
  })
})
