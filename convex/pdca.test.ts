// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { ERROR_CODES } from './lib/errors'
import schema from './schema'

// Convex modules for the in-memory backend. `!(*.*.*)` keeps `*.test.ts` and
// `*.d.ts` out of the map.
const modules = import.meta.glob('./**/!(*.*.*)*.*s')

const TIMEZONE = 'Asia/Tokyo'

type TestConvex = ReturnType<typeof convexTest>

function localDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000))
}

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  overrides: Partial<{
    playerXp: number
    playerLevel: number
    currentStreak: number
    longestStreak: number
    lastCompletedDate: string
    lastRecoveryDate: string
    availableGachaDraws: number
    totalCycles: number
  }> = {},
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

async function seedGoal(t: TestConvex, userId: Id<'users'>): Promise<Id<'goals'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('goals', {
      userId,
      name: '英語学習',
      totalCycles: 0,
      activeDays: 0,
      createdAt: now,
      updatedAt: now,
    })
  })
}

type ActingCycleFields = {
  doResult: 'completed' | 'partial' | 'notCompleted'
  checkLoad: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
  actType: 'lighter' | 'same' | 'heavier' | 'changeApproach'
  nextPlanCandidate?: string
}

async function seedActingCycle(
  t: TestConvex,
  userId: Id<'users'>,
  goalId: Id<'goals'>,
  fields: Partial<ActingCycleFields> = {},
): Promise<Id<'pdcaCycles'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('pdcaCycles', {
      userId,
      goalId,
      planText: '英単語を5個復習する',
      status: 'acting',
      doResult: fields.doResult ?? 'completed',
      checkLoad: fields.checkLoad ?? 'justRight',
      actType: fields.actType ?? 'same',
      nextPlanCandidate: fields.nextPlanCandidate,
      isRecovery: false,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function expectConvexErrorCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise
    throw new Error('expected the mutation to throw a ConvexError')
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code)
  }
}

describe('completePdcaCycle', () => {
  it('completes an acting cycle and grants the base reward once (AC-PDCA-013)', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const cycleId = await seedActingCycle(t, userId, goalId, {
      nextPlanCandidate: '英単語を3個にする',
    })

    const result = await t
      .withIdentity({ subject: 'user_a' })
      .mutation(api.pdca.completePdcaCycle, { cycleId })

    expect(result).toMatchObject({
      alreadyCompleted: false,
      gainedXp: 100,
      previousLevel: 1,
      newLevel: 1,
      levelUp: false,
      currentStreak: 1,
      streakUpdated: true,
      gachaDrawsAdded: 1,
      availableGachaDraws: 1,
      totalCycles: 1,
      dailyMissionCompleted: true,
      dailyMissionXp: 50,
    })

    const { user, goal, cycle } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      goal: await ctx.db.get(goalId),
      cycle: await ctx.db.get(cycleId),
    }))

    expect(cycle?.status).toBe('completed')
    expect(typeof cycle?.completedAt).toBe('number')
    // Base PDCA XP (100) + Daily Mission COMPLETE_ONE_PDCA (50, T030).
    expect(user?.playerXp).toBe(150)
    expect(user?.totalCycles).toBe(1)
    expect(user?.availableGachaDraws).toBe(1)
    expect(user?.currentStreak).toBe(1)
    expect(user?.longestStreak).toBe(1)
    expect(user?.lastCompletedDate).toBe(localDate(0))
    expect(goal?.totalCycles).toBe(1)
    expect(goal?.activeDays).toBe(1)
    expect(goal?.lastCompletedDate).toBe(localDate(0))
    expect(goal?.nextPlanCandidate).toBe('英単語を3個にする')
  })

  it('is idempotent: re-completing the same cycle never grants a second reward (AC-PDCA-014)', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const cycleId = await seedActingCycle(t, userId, goalId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    await asUser.mutation(api.pdca.completePdcaCycle, { cycleId })
    const second = await asUser.mutation(api.pdca.completePdcaCycle, { cycleId })

    expect(second).toMatchObject({
      alreadyCompleted: true,
      gainedXp: 0,
      gachaDrawsAdded: 0,
      streakUpdated: false,
      currentStreak: 1,
      availableGachaDraws: 1,
      totalCycles: 1,
      dailyMissionCompleted: false,
      dailyMissionXp: 0,
    })

    const { user, goal } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      goal: await ctx.db.get(goalId),
    }))
    expect(user?.playerXp).toBe(150)
    expect(user?.totalCycles).toBe(1)
    expect(user?.availableGachaDraws).toBe(1)
    expect(user?.currentStreak).toBe(1)
    expect(goal?.totalCycles).toBe(1)
    expect(goal?.activeDays).toBe(1)
  })

  it.each(['doing', 'checking'] as const)(
    'rejects completion from %s and changes no reward state (AC-PDCA-011)',
    async (status) => {
      const t = convexTest(schema, modules)
      const userId = await seedUser(t, 'user_a')
      const goalId = await seedGoal(t, userId)
      const cycleId = await t.run(async (ctx) => {
        const now = Date.now()
        return ctx.db.insert('pdcaCycles', {
          userId,
          goalId,
          planText: '英単語を5個復習する',
          status,
          doResult: status === 'checking' ? 'completed' : undefined,
          isRecovery: false,
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        })
      })

      await expectConvexErrorCode(
        t
          .withIdentity({ subject: 'user_a' })
          .mutation(api.pdca.completePdcaCycle, { cycleId }),
        ERROR_CODES.PDCA_INVALID_STATUS,
      )

      const { user, goal, cycle } = await t.run(async (ctx) => ({
        user: await ctx.db.get(userId),
        goal: await ctx.db.get(goalId),
        cycle: await ctx.db.get(cycleId),
      }))
      expect(cycle?.status).toBe(status)
      expect(user?.playerXp).toBe(0)
      expect(user?.totalCycles).toBe(0)
      expect(user?.availableGachaDraws).toBe(0)
      expect(goal?.totalCycles).toBe(0)
    },
  )

  it("rejects a user completing another user's cycle (AC-AUTH-004)", async () => {
    const t = convexTest(schema, modules)
    const ownerId = await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    const goalId = await seedGoal(t, ownerId)
    const cycleId = await seedActingCycle(t, ownerId, goalId)

    await expectConvexErrorCode(
      t
        .withIdentity({ subject: 'user_b' })
        .mutation(api.pdca.completePdcaCycle, { cycleId }),
      ERROR_CODES.PDCA_FORBIDDEN,
    )

    const { owner, cycle } = await t.run(async (ctx) => ({
      owner: await ctx.db.get(ownerId),
      cycle: await ctx.db.get(cycleId),
    }))
    expect(cycle?.status).toBe('acting')
    expect(owner?.playerXp).toBe(0)
    expect(owner?.availableGachaDraws).toBe(0)
  })

  it('same local day: extra cycles add totalCycles but not streak or activeDays (AC-STREAK-002 / AC-GOAL-008)', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    const firstCycle = await seedActingCycle(t, userId, goalId)
    await asUser.mutation(api.pdca.completePdcaCycle, { cycleId: firstCycle })

    const secondCycle = await seedActingCycle(t, userId, goalId, {
      doResult: 'partial',
      checkLoad: 'easy',
      actType: 'heavier',
    })
    const result = await asUser.mutation(api.pdca.completePdcaCycle, {
      cycleId: secondCycle,
    })

    expect(result).toMatchObject({
      currentStreak: 1,
      streakUpdated: false,
      totalCycles: 2,
      availableGachaDraws: 2,
      // Daily Mission was already granted by the first cycle today (T030).
      dailyMissionCompleted: false,
      dailyMissionXp: 0,
    })

    const { user, goal } = await t.run(async (ctx) => ({
      user: await ctx.db.get(userId),
      goal: await ctx.db.get(goalId),
    }))
    expect(user?.currentStreak).toBe(1)
    expect(user?.totalCycles).toBe(2)
    // First cycle: 100 (base) + 50 (Daily Mission). Second cycle: 100 (base only).
    expect(user?.playerXp).toBe(250)
    expect(user?.availableGachaDraws).toBe(2)
    expect(goal?.totalCycles).toBe(2)
    expect(goal?.activeDays).toBe(1)
  })

  it('advances the streak on the next local day (AC-STREAK-003)', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', {
      currentStreak: 14,
      longestStreak: 14,
      lastCompletedDate: localDate(-1),
    })
    const goalId = await seedGoal(t, userId)
    const cycleId = await seedActingCycle(t, userId, goalId)

    const result = await t
      .withIdentity({ subject: 'user_a' })
      .mutation(api.pdca.completePdcaCycle, { cycleId })

    expect(result).toMatchObject({ currentStreak: 15, streakUpdated: true })

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.currentStreak).toBe(15)
    expect(user?.longestStreak).toBe(15)
    expect(user?.lastCompletedDate).toBe(localDate(0))
  })

  it('grants the same base reward when DO was not completed (AC-PDCA-015)', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)
    const cycleId = await seedActingCycle(t, userId, goalId, {
      doResult: 'notCompleted',
      checkLoad: 'tooHeavy',
      actType: 'lighter',
    })

    const result = await t
      .withIdentity({ subject: 'user_a' })
      .mutation(api.pdca.completePdcaCycle, { cycleId })

    expect(result).toMatchObject({
      gainedXp: 100,
      gachaDrawsAdded: 1,
      currentStreak: 1,
    })

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.playerXp).toBe(150)
    expect(user?.availableGachaDraws).toBe(1)
  })
})

describe('startPdcaCycle - isRecovery', () => {
  it('starts a normal cycle with isRecovery=false by default', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const goalId = await seedGoal(t, userId)

    const { cycleId } = await t
      .withIdentity({ subject: 'user_a' })
      .mutation(api.pdca.startPdcaCycle, { goalId, planText: '英単語を5個復習する' })

    const cycle = await t.run((ctx) => ctx.db.get(cycleId))
    expect(cycle?.isRecovery).toBe(false)
  })

  it('AC-RECOVERY-001: allows isRecovery=true when exactly one local day was missed', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { lastCompletedDate: localDate(-2) })
    const goalId = await seedGoal(t, userId)

    const { cycleId } = await t.withIdentity({ subject: 'user_a' }).mutation(api.pdca.startPdcaCycle, {
      goalId,
      planText: '英単語を3個だけ復習する',
      isRecovery: true,
    })

    const cycle = await t.run((ctx) => ctx.db.get(cycleId))
    expect(cycle?.isRecovery).toBe(true)
  })

  it('rejects isRecovery=true when the user is not actually at risk', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', { lastCompletedDate: localDate(0) })
    const goalId = await seedGoal(t, userId)

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_a' }).mutation(api.pdca.startPdcaCycle, {
        goalId,
        planText: '英単語を3個だけ復習する',
        isRecovery: true,
      }),
      ERROR_CODES.RECOVERY_NOT_AVAILABLE,
    )
  })

  it('AC-RECOVERY-002: rejects isRecovery=true when Recovery was used within the last 7 days', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', {
      lastCompletedDate: localDate(-2),
      lastRecoveryDate: localDate(-2),
    })
    const goalId = await seedGoal(t, userId)

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_a' }).mutation(api.pdca.startPdcaCycle, {
        goalId,
        planText: '英単語を3個だけ復習する',
        isRecovery: true,
      }),
      ERROR_CODES.RECOVERY_NOT_AVAILABLE,
    )
  })
})

describe('Recovery end-to-end', () => {
  it('AC-RECOVERY-003: a Recovery cycle started via startPdcaCycle preserves and extends the streak on completion', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a', {
      currentStreak: 14,
      longestStreak: 14,
      lastCompletedDate: localDate(-2),
    })
    const goalId = await seedGoal(t, userId)
    const asUser = t.withIdentity({ subject: 'user_a' })

    const { cycleId } = await asUser.mutation(api.pdca.startPdcaCycle, {
      goalId,
      planText: '英単語を3個だけ復習する',
      isRecovery: true,
    })

    // DO/CHECK/ACTの各Mutationは#8/#9/#10で担保済みのため、状態遷移のみ模擬する。
    await t.run(async (ctx) => {
      await ctx.db.patch(cycleId, {
        status: 'acting',
        doResult: 'completed',
        checkLoad: 'justRight',
        actType: 'same',
        updatedAt: Date.now(),
      })
    })

    const result = await asUser.mutation(api.pdca.completePdcaCycle, { cycleId })

    expect(result.currentStreak).toBe(15)
    expect(result.streakUpdated).toBe(true)

    const user = await t.run((ctx) => ctx.db.get(userId))
    expect(user?.currentStreak).toBe(15)
    expect(user?.lastRecoveryDate).toBe(localDate(0))
  })
})
