import { ConvexError, v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireCurrentUser, requireOwnedGoal } from './lib/auth'
import { INPUT_LIMITS } from './lib/constants'
import { ERROR_CODES } from './lib/errors'

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
