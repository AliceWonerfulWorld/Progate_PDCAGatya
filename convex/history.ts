import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { requireCurrentUser, requireOwnedGoal } from './lib/auth'
import { addDaysToLocalDate, daysBetweenLocalDates, getLocalDateString } from './lib/date'

const RECENT_CYCLES_LIMIT = 30
// Today / Week集計の対象を絞るための安全な上限（timezoneのズレを吸収するため8日分）。
const SUMMARY_WINDOW_MS = 8 * 24 * 60 * 60 * 1000
// GitHubの草のようなヒートマップの表示日数。モバイル幅で横スクロール無しに近い量として20週間分。
const HEATMAP_DAYS = 140
const HEATMAP_WINDOW_MS = HEATMAP_DAYS * 24 * 60 * 60 * 1000

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

export interface HeatmapDay {
  date: string
  count: number
}

// GitHubのContribution Graphのように、直近の完了日を可視化するためのデータ。
// 「達成率」等の割合ではなく完了「回数」の加算のみを扱うため、
// docs/ui-spec.md #24.5が禁止する失敗強調表現には該当しない。
export const getCompletionHeatmap = query({
  args: {},
  handler: async (ctx): Promise<HeatmapDay[]> => {
    const currentUser = await requireCurrentUser(ctx)
    const now = Date.now()
    const today = getLocalDateString(now, currentUser.timezone)

    const completions = await ctx.db
      .query('pdcaCycles')
      .withIndex('by_user_completed_at', (q) =>
        q.eq('userId', currentUser._id).gte('completedAt', now - HEATMAP_WINDOW_MS),
      )
      .filter((q) => q.eq(q.field('status'), 'completed'))
      .collect()

    const countByDate = new Map<string, number>()
    for (const cycle of completions) {
      if (cycle.completedAt === undefined) continue
      const date = getLocalDateString(cycle.completedAt, currentUser.timezone)
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1)
    }

    const days: HeatmapDay[] = []
    for (let daysAgo = HEATMAP_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
      const date = addDaysToLocalDate(today, -daysAgo)
      days.push({ date, count: countByDate.get(date) ?? 0 })
    }
    return days
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
