import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireCurrentUser, requireOwnedGoal } from './lib/auth'
import { INPUT_LIMITS } from './lib/constants'
import { ERROR_CODES } from './lib/errors'

export function validateGoalName(name: string): string {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.length > INPUT_LIMITS.goalName) {
    throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
  }
  return normalizedName
}

export const createGoal = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const now = Date.now()
    return ctx.db.insert('goals', {
      userId: currentUser._id,
      name: validateGoalName(args.name),
      totalCycles: 0,
      activeDays: 0,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const listActiveGoals = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx)
    return ctx.db
      .query('goals')
      .withIndex('by_user_archived', (q) =>
        q.eq('userId', currentUser._id).eq('archivedAt', undefined),
      )
      .collect()
  },
})

// Archived含む全Goal。History画面のGoal Filterなど、過去の参照用途に使う
// （Archived Goalも履歴として残す方針, docs/data-model.md #5.3）。
export const listAllGoals = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx)
    return ctx.db
      .query('goals')
      .withIndex('by_user', (q) => q.eq('userId', currentUser._id))
      .collect()
  },
})

export const getGoalDetail = query({
  args: { goalId: v.id('goals') },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
    const recentCycles = await ctx.db
      .query('pdcaCycles')
      .withIndex('by_goal_completed_at', (q) => q.eq('goalId', goal._id))
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .order('desc')
      .take(10)

    return { goal, recentCycles }
  },
})

export const updateGoal = mutation({
  args: { goalId: v.id('goals'), name: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
    if (goal.archivedAt !== undefined) {
      throw new ConvexError({ code: ERROR_CODES.GOAL_ARCHIVED })
    }

    const name = validateGoalName(args.name)
    await ctx.db.patch(goal._id, { name, updatedAt: Date.now() })
    return { ...goal, name }
  },
})

export const archiveGoal = mutation({
  args: { goalId: v.id('goals') },
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
    if (goal.archivedAt !== undefined) {
      return goal
    }

    const archivedAt = Date.now()
    await ctx.db.patch(goal._id, { archivedAt, updatedAt: archivedAt })
    return { ...goal, archivedAt, updatedAt: archivedAt }
  },
})
