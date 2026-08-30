import { v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import type { Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { requireCurrentUser, requireOwnedGoal } from './lib/auth'
import { addDaysToLocalDate, daysBetweenLocalDates, getLocalDateString } from './lib/date'

// Today / Week集計の対象を絞るための安全な上限（timezoneのズレを吸収するため8日分）。
const SUMMARY_WINDOW_MS = 8 * 24 * 60 * 60 * 1000
// 履歴画面は「直近の継続を眺める」ための12週間固定。全履歴を横に広げない。
const HEATMAP_DAYS = 84
const HEATMAP_WINDOW_MS = HEATMAP_DAYS * 24 * 60 * 60 * 1000
const HISTORY_PERIODS = ['7d', '30d', 'all'] as const
const HISTORY_PERIOD_MS = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  all: undefined,
} as const

const historyPeriodValidator = v.union(...HISTORY_PERIODS.map((period) => v.literal(period)))
type HistoryPeriod = (typeof HISTORY_PERIODS)[number]

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

export interface HistoryCycleSummary {
  cycleId: Id<'pdcaCycles'>
  completedAt: number
  goalName: string | null
  planText: string
  doResult: 'completed' | 'partial' | 'notCompleted' | null
  checkLoad: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy' | null
  nextPlanCandidate: string | null
}

function getPeriodStart(period: HistoryPeriod, now: number): number {
  const duration = HISTORY_PERIOD_MS[period]
  return duration === undefined ? 0 : now - duration
}

// 一覧には全PDCAを展開せず、カードに必要な要約だけを返す。完了日時のあるCycleだけを
// completedAt indexからページングするので、件数が増えても全件取得・描画しない。
export const listCycles = query({
  args: {
    goalId: v.optional(v.id('goals')),
    period: historyPeriodValidator,
    // ページネーションのカーソルは同一クエリでのみ有効。サーバー側のDate.now()を
    // 毎回使うと購読の再評価ごとに範囲が変わるため、一覧を開いた時点の時刻を固定する。
    asOf: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx)
    const completedAfter = getPeriodStart(args.period, args.asOf)

    if (args.goalId !== undefined) {
      const goal = await requireOwnedGoal(ctx, args.goalId, currentUser)
      const result = await ctx.db
        .query('pdcaCycles')
        .withIndex('by_goal_completed_at', (q) => q.eq('goalId', goal._id).gte('completedAt', completedAfter))
        .order('desc')
        .paginate(args.paginationOpts)
      return {
        ...result,
        page: result.page.map((cycle) => toHistoryCycleSummary(cycle, goal.name)),
      }
    }

    const result = await ctx.db
      .query('pdcaCycles')
      .withIndex('by_user_completed_at', (q) => q.eq('userId', currentUser._id).gte('completedAt', completedAfter))
      .order('desc')
      .paginate(args.paginationOpts)

    const goalNameCache = new Map<Id<'goals'>, string | null>()
    const page = await Promise.all(
      result.page.map(async (cycle) => {
        let goalName = goalNameCache.get(cycle.goalId)
        if (goalName === undefined) {
          const goal = await ctx.db.get(cycle.goalId)
          goalName = goal?.name ?? null
          goalNameCache.set(cycle.goalId, goalName)
        }
        return toHistoryCycleSummary(cycle, goalName)
      }),
    )
    return { ...result, page }
  },
})

function toHistoryCycleSummary(
  cycle: {
    _id: Id<'pdcaCycles'>
    completedAt?: number
    planText: string
    doResult?: 'completed' | 'partial' | 'notCompleted'
    checkLoad?: 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
    nextPlanCandidate?: string
  },
  goalName: string | null,
): HistoryCycleSummary {
  // completedAt indexの0以上の範囲だけを読むため、この値は必ずある。
  if (cycle.completedAt === undefined) throw new Error('Completed history cycle is missing completedAt')
  return {
    cycleId: cycle._id,
    completedAt: cycle.completedAt,
    goalName,
    planText: cycle.planText,
    doResult: cycle.doResult ?? null,
    checkLoad: cycle.checkLoad ?? null,
    nextPlanCandidate: cycle.nextPlanCandidate ?? null,
  }
}
