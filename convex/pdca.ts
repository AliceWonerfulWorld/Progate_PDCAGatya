import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireCurrentUser, requireOwnedCycle, requireOwnedGoal } from './lib/auth'
import { BASE_PDCA_XP, INPUT_LIMITS } from './lib/constants'
import { getLocalDateString } from './lib/date'
import { ERROR_CODES } from './lib/errors'
import { assertValidPdcaTransition } from './lib/pdca'
import { calculatePlayerLevel } from './lib/playerLevel'
import { resolveStreakState } from './lib/streak'

const doResultValidator = v.union(
  v.literal('completed'),
  v.literal('partial'),
  v.literal('notCompleted'),
)

const checkLoadValidator = v.union(
  v.literal('easy'),
  v.literal('justRight'),
  v.literal('slightlyHeavy'),
  v.literal('tooHeavy'),
)

const checkReasonValidator = v.union(
  v.literal('noTime'),
  v.literal('tooLarge'),
  v.literal('tooDifficult'),
  v.literal('noFocus'),
  v.literal('noMotivation'),
  v.literal('other'),
)

const actTypeValidator = v.union(
  v.literal('lighter'),
  v.literal('same'),
  v.literal('heavier'),
  v.literal('changeApproach'),
)

// 進行中Cycleを探す順序。1ユーザーが同時に持つ進行中Cycleは1件を想定する。
const ACTIVE_PDCA_STATUSES = ['doing', 'checking', 'acting'] as const

export function validatePlanText(planText: string): string {
  const normalizedPlanText = planText.trim()
  if (!normalizedPlanText || normalizedPlanText.length > INPUT_LIMITS.planText) {
    throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
  }
  return normalizedPlanText
}

// PLAN確定時のみ呼び出す。PLAN候補の表示だけでは Cycle を作らない（AC-PDCA-002）。
export const startPdcaCycle = mutation({
  args: { goalId: v.id('goals'), planText: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
    if (goal.archivedAt !== undefined) {
      throw new ConvexError({ code: ERROR_CODES.GOAL_ARCHIVED })
    }

    const planText = validatePlanText(args.planText)
    const now = Date.now()
    const cycleId = await ctx.db.insert('pdcaCycles', {
      userId: currentUser._id,
      goalId: goal._id,
      planText,
      status: 'doing',
      // Recovery 判定は Streak resolver (T014/T015) 側で扱うため、ここでは常に false。
      isRecovery: false,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    return { cycleId, status: 'doing' as const }
  },
})

// 進行中（doing / checking / acting）のCycleを1件返す。reload後の再開に使う（AC-PDCA-005）。
export const getActiveCycle = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx)
    for (const status of ACTIVE_PDCA_STATUSES) {
      const cycle = await ctx.db
        .query('pdcaCycles')
        .withIndex('by_user_status', (q) => q.eq('userId', currentUser._id).eq('status', status))
        .order('desc')
        .first()
      if (cycle !== null) {
        const goal = await ctx.db.get(cycle.goalId)
        return { cycle, goalName: goal?.name ?? null }
      }
    }
    return null
  },
})

export const getCycle = query({
  args: { cycleId: v.id('pdcaCycles') },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)
    const goal = await ctx.db.get(cycle.goalId)
    return { cycle, goalName: goal?.name ?? null }
  },
})

// DO結果はどれを選んでも同じCHECKへ進み、報酬差を作らない（AC-PDCA-003〜005）。
export const submitDoResult = mutation({
  args: { cycleId: v.id('pdcaCycles'), doResult: doResultValidator },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)
    // doing 以外からの送信は拒否する。
    assertValidPdcaTransition(cycle.status, 'checking')

    await ctx.db.patch(cycle._id, {
      doResult: args.doResult,
      status: 'checking',
      updatedAt: Date.now(),
    })

    return { cycleId: cycle._id, status: 'checking' as const }
  },
})

export function validateCheckMemo(checkMemo: string | undefined): string | undefined {
  if (checkMemo === undefined) return undefined
  const normalizedMemo = checkMemo.trim()
  // Memoは常に任意。空文字は「未入力」として扱う（AC-PDCA-008）。
  if (!normalizedMemo) return undefined
  if (normalizedMemo.length > INPUT_LIMITS.checkMemo) {
    throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
  }
  return normalizedMemo
}

// Reason / Memo はどちらも任意（AC-PDCA-007 / AC-PDCA-008）。
export const submitCheck = mutation({
  args: {
    cycleId: v.id('pdcaCycles'),
    checkLoad: checkLoadValidator,
    checkReason: v.optional(checkReasonValidator),
    checkMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)
    // checking 以外からの送信は拒否する。
    assertValidPdcaTransition(cycle.status, 'acting')

    await ctx.db.patch(cycle._id, {
      checkLoad: args.checkLoad,
      checkReason: args.checkReason,
      checkMemo: validateCheckMemo(args.checkMemo),
      status: 'acting',
      updatedAt: Date.now(),
    })

    return { cycleId: cycle._id, status: 'acting' as const }
  },
})

export function validateNextPlanCandidate(nextPlanCandidate: string | undefined): string | undefined {
  if (nextPlanCandidate === undefined) return undefined
  const normalizedCandidate = nextPlanCandidate.trim()
  // 次回候補は任意。空文字は「未設定」として扱う。
  if (!normalizedCandidate) return undefined
  if (normalizedCandidate.length > INPUT_LIMITS.nextPlanCandidate) {
    throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
  }
  return normalizedCandidate
}

// ACT保存時点ではXP / Gacha等の報酬を付与しない（AC-PDCA-009）。
// 報酬確定は completePdcaCycle (T011) の責務。
export const submitAct = mutation({
  args: {
    cycleId: v.id('pdcaCycles'),
    actType: actTypeValidator,
    nextPlanCandidate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)
    // acting 以外の Cycle は更新しない。status はここでは進めない。
    if (cycle.status !== 'acting') {
      throw new ConvexError({
        code: ERROR_CODES.PDCA_INVALID_STATUS,
        message: `submitAct requires status=acting, got ${cycle.status}`,
      })
    }

    const nextPlanCandidate = validateNextPlanCandidate(args.nextPlanCandidate)
    await ctx.db.patch(cycle._id, {
      actType: args.actType,
      nextPlanCandidate,
      updatedAt: Date.now(),
    })

    return { cycleId: cycle._id, actType: args.actType, nextPlanCandidate }
  },
})

export interface CompletePdcaCycleResult {
  cycleId: Id<'pdcaCycles'>
  alreadyCompleted: boolean
  gainedXp: number
  previousLevel: number
  newLevel: number
  levelUp: boolean
  currentStreak: number
  streakUpdated: boolean
  gachaDrawsAdded: number
  availableGachaDraws: number
  totalCycles: number
}

// Completes a PDCA cycle and grants the one-time base reward
// (docs/technical-design.md §15-19, AC-PDCA-013 / 014 / 015).
//
// The client sends only the cycleId. XP, level, streak and gacha rights are all
// resolved server-side; the client is never trusted for reward values
// (AGENTS.md §9). DO success/failure never changes the base reward.
export const completePdcaCycle = mutation({
  args: { cycleId: v.id('pdcaCycles') },
  handler: async (ctx, args): Promise<CompletePdcaCycleResult> => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)

    // Idempotency (AC-PDCA-014): a re-run on an already completed cycle is a
    // no-op that never grants a second reward.
    if (cycle.status === 'completed') {
      return {
        cycleId: cycle._id,
        alreadyCompleted: true,
        gainedXp: 0,
        previousLevel: currentUser.playerLevel,
        newLevel: currentUser.playerLevel,
        levelUp: false,
        currentStreak: currentUser.currentStreak,
        streakUpdated: false,
        gachaDrawsAdded: 0,
        availableGachaDraws: currentUser.availableGachaDraws,
        totalCycles: currentUser.totalCycles,
      }
    }

    // Only `acting -> completed` is allowed; doing / checking / cancelled are
    // rejected server-side (AC-PDCA-011).
    assertValidPdcaTransition(cycle.status, 'completed')

    // A completed cycle must carry the PDCA inputs (technical-design.md §16 step 6).
    if (
      cycle.doResult === undefined ||
      cycle.checkLoad === undefined ||
      cycle.actType === undefined
    ) {
      throw new ConvexError({
        code: ERROR_CODES.PDCA_INVALID_STATUS,
        message: 'PDCA cycle is missing required doResult / checkLoad / actType',
      })
    }

    const goal = await ctx.db.get(cycle.goalId)
    if (goal === null) {
      throw new ConvexError({ code: ERROR_CODES.GOAL_NOT_FOUND })
    }

    const now = Date.now()
    const today = getLocalDateString(now, currentUser.timezone)

    // 1. Cycle -> completed.
    await ctx.db.patch(cycle._id, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })

    // 2. Goal aggregates. activeDays advances at most once per local day
    // (docs/data-model.md §5.5, AGENTS.md §16).
    await ctx.db.patch(goal._id, {
      totalCycles: goal.totalCycles + 1,
      activeDays:
        goal.lastCompletedDate === today ? goal.activeDays : goal.activeDays + 1,
      lastCompletedAt: now,
      lastCompletedDate: today,
      nextPlanCandidate: cycle.nextPlanCandidate ?? goal.nextPlanCandidate,
      updatedAt: now,
    })

    // 3. Player aggregates: XP (+100), level recalculation, gacha right (+1),
    // streak resolution via the shared resolver (AGENTS.md §30).
    const previousLevel = currentUser.playerLevel
    const playerXp = currentUser.playerXp + BASE_PDCA_XP
    const newLevel = calculatePlayerLevel(playerXp)
    const availableGachaDraws = currentUser.availableGachaDraws + 1
    const totalCycles = currentUser.totalCycles + 1

    // `users` does not carry streakStatus / pendingRecoveryDate yet, so a
    // completion always resolves from the "active" baseline. Persisting the
    // at-risk / pendingRecoveryDate half of the resolver output is a follow-up
    // that adds those schema fields (see the note in convex/lib/streak.ts).
    const streak = resolveStreakState({
      currentStreak: currentUser.currentStreak,
      longestStreak: currentUser.longestStreak,
      lastCompletedDate: currentUser.lastCompletedDate,
      lastRecoveryDate: currentUser.lastRecoveryDate,
      streakStatus: 'active',
      pendingRecoveryDate: undefined,
      today,
      isRecovery: cycle.isRecovery,
      didCompleteToday: true,
    })

    await ctx.db.patch(currentUser._id, {
      playerXp,
      playerLevel: newLevel,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate ?? today,
      lastRecoveryDate: streak.lastRecoveryDate,
      availableGachaDraws,
      totalCycles,
      updatedAt: now,
    })

    return {
      cycleId: cycle._id,
      alreadyCompleted: false,
      gainedXp: BASE_PDCA_XP,
      previousLevel,
      newLevel,
      levelUp: newLevel > previousLevel,
      currentStreak: streak.currentStreak,
      streakUpdated: streak.streakUpdated,
      gachaDrawsAdded: 1,
      availableGachaDraws,
      totalCycles,
    }
  },
})
