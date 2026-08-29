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
