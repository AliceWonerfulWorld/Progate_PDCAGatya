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

async function expectConvexErrorCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise
    throw new Error('expected the call to throw a ConvexError')
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code)
  }
}

describe('Goal ownership (AGENTS.md #46: User B cannot mutate User A Goal)', () => {
  it('the owner can read, update, and archive their own Goal', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })
    const goalId = await asOwner.mutation(api.goals.createGoal, { name: '英語学習' })

    const detail = await asOwner.query(api.goals.getGoalDetail, { goalId })
    expect(detail.goal.name).toBe('英語学習')

    const updated = await asOwner.mutation(api.goals.updateGoal, { goalId, name: '筋トレ' })
    expect(updated.name).toBe('筋トレ')

    const archived = await asOwner.mutation(api.goals.archiveGoal, { goalId })
    expect(archived.archivedAt).toEqual(expect.any(Number))
  })

  it("rejects another user's read of the Goal (AC-AUTH-003)", async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const goalId = await t.withIdentity({ subject: 'user_a' }).mutation(api.goals.createGoal, { name: '英語学習' })

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_b' }).query(api.goals.getGoalDetail, { goalId }),
      ERROR_CODES.GOAL_FORBIDDEN,
    )
  })

  it("rejects another user's update of the Goal and leaves it unchanged (AC-AUTH-003)", async () => {
    const t = convexTest(schema, modules)
    const ownerId = await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const goalId = await t.withIdentity({ subject: 'user_a' }).mutation(api.goals.createGoal, { name: '英語学習' })

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_b' }).mutation(api.goals.updateGoal, { goalId, name: '乗っ取り' }),
      ERROR_CODES.GOAL_FORBIDDEN,
    )

    const goal = await t.run((ctx) => ctx.db.get(goalId))
    expect(goal?.name).toBe('英語学習')
    expect(goal?.userId).toBe(ownerId)
  })

  it("rejects another user's archive of the Goal and leaves it active (AC-AUTH-003)", async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const goalId = await t.withIdentity({ subject: 'user_a' }).mutation(api.goals.createGoal, { name: '英語学習' })

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_b' }).mutation(api.goals.archiveGoal, { goalId }),
      ERROR_CODES.GOAL_FORBIDDEN,
    )

    const goal = await t.run((ctx) => ctx.db.get(goalId))
    expect(goal?.archivedAt).toBeUndefined()
  })
})

describe('Goal archive behavior', () => {
  it('AC-GOAL-006: rejects renaming an already archived Goal', async () => {
    const t = convexTest(schema, modules)
    const asOwner = t.withIdentity({ subject: 'user_a' })
    await seedUser(t, 'user_a')
    const goalId = await asOwner.mutation(api.goals.createGoal, { name: '英語学習' })
    await asOwner.mutation(api.goals.archiveGoal, { goalId })

    await expectConvexErrorCode(
      asOwner.mutation(api.goals.updateGoal, { goalId, name: '再開' }),
      ERROR_CODES.GOAL_ARCHIVED,
    )
  })

  it('archiving twice is a safe no-op (does not throw or move the timestamp)', async () => {
    const t = convexTest(schema, modules)
    const asOwner = t.withIdentity({ subject: 'user_a' })
    await seedUser(t, 'user_a')
    const goalId = await asOwner.mutation(api.goals.createGoal, { name: '英語学習' })

    const first = await asOwner.mutation(api.goals.archiveGoal, { goalId })
    const second = await asOwner.mutation(api.goals.archiveGoal, { goalId })

    expect(second.archivedAt).toBe(first.archivedAt)
  })

  it('listActiveGoals excludes archived Goals and never leaks other users’ Goals', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const asOwner = t.withIdentity({ subject: 'user_a' })
    const asOther = t.withIdentity({ subject: 'user_b' })

    const keepGoalId = await asOwner.mutation(api.goals.createGoal, { name: '継続する方' })
    const archiveGoalId = await asOwner.mutation(api.goals.createGoal, { name: 'アーカイブする方' })
    await asOwner.mutation(api.goals.archiveGoal, { goalId: archiveGoalId })
    await asOther.mutation(api.goals.createGoal, { name: '他人のGoal' })

    const active = await asOwner.query(api.goals.listActiveGoals, {})

    expect(active.map((goal) => goal._id)).toEqual([keepGoalId])
  })
})
