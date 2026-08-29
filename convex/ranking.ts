import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { requireCurrentUser } from './lib/auth'

// docs/product-spec.md #21は「複雑なランキング」をMVP対象外候補としているが、
// ユーザーからの明示的な要望により実装する。ui-spec.md #24.5が禁止しているのは
// 「達成率」(完了率などの%表現)であり、ここではLv/XP/完了回数という加算的な値のみを
// 扱うため、失敗を強調する表現には該当しない。

const RANKING_LIMIT = 20
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_DISPLAY_NAME = 'プレイヤー'

export interface RankingEntry {
  userId: Id<'users'>
  displayName: string
  value: number
  rank: number
}

export interface RankingResult {
  top: RankingEntry[]
  // 自分がtopに入っていない場合でも順位を知れるように別枠で返す。
  // period集計でまだ実績が無い場合はnull(「ランク外」を数値の最下位として
  // 見せない=非難しないUXにするため)。
  me: RankingEntry | null
}

function displayNameOf(name: string | undefined): string {
  return name ?? DEFAULT_DISPLAY_NAME
}

function buildResult(
  currentUserId: Id<'users'>,
  entries: RankingEntry[],
): RankingResult {
  const top = entries.slice(0, RANKING_LIMIT)
  const me = entries.find((entry) => entry.userId === currentUserId) ?? null
  return { top, me }
}

// docs/ui-spec.md #25.2: Player Lvの延長として、全期間のXP順にランクする。
export const getLevelRanking = query({
  args: {},
  handler: async (ctx): Promise<RankingResult> => {
    const currentUser = await requireCurrentUser(ctx)
    const users = await ctx.db.query('users').collect()

    const sortedUsers = [...users]
    // oxlint-disable-next-line no-array-sort -- already spread into a fresh array.
    sortedUsers.sort((a, b) => b.playerXp - a.playerXp)

    const entries: RankingEntry[] = sortedUsers.map((user, index) => ({
      userId: user._id,
      displayName: displayNameOf(user.displayName),
      value: user.playerXp,
      rank: index + 1,
    }))

    return buildResult(currentUser._id, entries)
  },
})

async function countCompletedCyclesPerUser(
  ctx: QueryCtx,
  windowMs: number,
): Promise<Map<Id<'users'>, number>> {
  const cutoff = Date.now() - windowMs
  const cycles = await ctx.db
    .query('pdcaCycles')
    .filter((q) => q.and(q.eq(q.field('status'), 'completed'), q.gte(q.field('completedAt'), cutoff)))
    .collect()

  const counts = new Map<Id<'users'>, number>()
  for (const cycle of cycles) {
    counts.set(cycle.userId, (counts.get(cycle.userId) ?? 0) + 1)
  }
  return counts
}

// 直近7日/30日に完了したPDCA件数でランクする(ヒートマップの合計と一致する指標)。
// カレンダー週/月ではなく、タイムゾーン差を吸収しやすいローリングウィンドウを使う。
export const getPeriodRanking = query({
  args: { period: v.union(v.literal('week'), v.literal('month')) },
  handler: async (ctx, args): Promise<RankingResult> => {
    const currentUser = await requireCurrentUser(ctx)
    const windowMs = args.period === 'week' ? WEEK_MS : MONTH_MS
    const counts = await countCompletedCyclesPerUser(ctx, windowMs)

    const users = await Promise.all(
      [...counts.keys()].map((userId) => ctx.db.get(userId)),
    )
    const displayNameByUserId = new Map<Id<'users'>, string>(
      users
        .filter((user) => user !== null)
        .map((user) => [user._id, displayNameOf(user.displayName)]),
    )

    const sortedEntries = [...counts.entries()]
    // oxlint-disable-next-line no-array-sort -- already spread into a fresh array.
    sortedEntries.sort(([, countA], [, countB]) => countB - countA)

    const entries: RankingEntry[] = sortedEntries.map(([userId, count], index) => ({
      userId,
      displayName: displayNameByUserId.get(userId) ?? DEFAULT_DISPLAY_NAME,
      value: count,
      rank: index + 1,
    }))

    return buildResult(currentUser._id, entries)
  },
})
