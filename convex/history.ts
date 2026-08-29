import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { requireCurrentUser, requireOwnedGoal } from './lib/auth'
import { daysBetweenLocalDates, getLocalDateString } from './lib/date'

const RECENT_CYCLES_LIMIT = 30
// Today / Week集計の対象を絞るための安全な上限（timezoneのズレを吸収するため8日分）。
const SUMMARY_WINDOW_MS = 8 * 24 * 60 * 60 * 1000

// docs/ui-spec.md #24.2, AC-HISTORY-004: Current Streak / Today / Week / Total。
export const getHistorySummary = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx)
    const now = Date.now()
    const today = getLocalDateString(now, currentUser.timezone)

    const recentCompletions = await ctx.db
      .query('pdcaCycles')
      .withIndex('by_user_completed_at', (q) =>
        q.eq('userId', currentUser._id).gte('completedAt', now - SUMMARY_WINDOW_MS),
      )
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect()

    let todayCycles = 0
    let weekCycles = 0
    for (const cycle of recentCompletions) {
      if (cycle.completedAt === undefined) continue
      const completedLocalDate = getLocalDateString(cycle.completedAt, currentUser.timezone)
      const daysAgo = daysBetweenLocalDates(completedLocalDate, today)
      if (daysAgo < 0 || daysAgo >= 7) continue
      weekCycles += 1
      if (daysAgo === 0) todayCycles += 1
    }

    return {
      currentStreak: currentUser.currentStreak,
      todayCycles,
      weekCycles,
      totalCycles: currentUser.totalCycles,
    }
  },
})

export interface HistoryCycleItem {
  cycle: Doc<'pdcaCycles'>
  goalName: string | null
}

// docs/ui-spec.md #24.4, AC-HISTORY-001 / AC-HISTORY-003: 完了済みCycleを新しい順に、
// goalIdを指定すればそのGoalだけに絞って返す。
export const listRecentCycles = query({
  args: { goalId: v.optional(v.id('goals')) },
  handler: async (ctx, args): Promise<HistoryCycleItem[]> => {
    const currentUser = await requireCurrentUser(ctx)

    let cycles: Doc<'pdcaCycles'>[]
    if (args.goalId !== undefined) {
      const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
      cycles = await ctx.db
        .query('pdcaCycles')
        .withIndex('by_goal_completed_at', (q) => q.eq('goalId', goal._id))
        .filter((q) => q.eq(q.field('status'), 'completed'))
        .order('desc')
        .take(RECENT_CYCLES_LIMIT)
    } else {
      cycles = await ctx.db
        .query('pdcaCycles')
        .withIndex('by_user_completed_at', (q) => q.eq('userId', currentUser._id))
        .filter((q) => q.eq(q.field('status'), 'completed'))
        .order('desc')
        .take(RECENT_CYCLES_LIMIT)
    }

    const goalNameCache = new Map<Id<'goals'>, string | null>()
    const items: HistoryCycleItem[] = []
    for (const cycle of cycles) {
      let goalName = goalNameCache.get(cycle.goalId)
      if (goalName === undefined) {
        const goal = await ctx.db.get(cycle.goalId)
        goalName = goal?.name ?? null
        goalNameCache.set(cycle.goalId, goalName)
      }
      items.push({ cycle, goalName })
    }
    return items
  },
})
