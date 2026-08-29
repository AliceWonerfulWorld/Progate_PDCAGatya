import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireCurrentUser, requireOwnedCycle, requireOwnedGoal } from './lib/auth'
import { INPUT_LIMITS } from './lib/constants'
import { ERROR_CODES } from './lib/errors'
import { assertValidPdcaTransition } from './lib/pdca'

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
