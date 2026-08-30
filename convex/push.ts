import { ConvexError, v } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import type { Id } from './_generated/dataModel'
import { internalMutation, internalQuery, mutation, query, env } from './_generated/server'
import { requireCurrentUser, requireOwnedSubscriptionByEndpoint } from './lib/auth'
import { PUSH } from './lib/constants'
import { ERROR_CODES } from './lib/errors'
import { shouldNotifyAtRisk } from './lib/pushDecision'

const keysValidator = v.object({ p256dh: v.string(), auth: v.string() })
const notifyHoursValidator = v.array(v.number())

function validateNotifyHours(hours: number[]): void {
  if (hours.length === 0 || hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23)) {
    throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
  }
}

// VAPID公開鍵は秘密情報ではないが、ローテーションをフロントエンド再デプロイなしで
// 行えるようVITE_*に埋め込まずConvex環境変数から配信する。未設定ならnullを返し、
// フロントエンドはPush設定セクションごと非表示にする。
export const getVapidPublicKey = query({
  args: {},
  handler: async () => env.VAPID_PUBLIC_KEY ?? null,
})

// リロード後にこのデバイスの購読済みnotifyHoursをUIへ復元するためだけの問い合わせ。
// ブラウザのPushManager.getSubscription()から分かるendpointを渡す前提で、他人の
// endpointを渡された場合(所有者不一致)はnullを返す(存在の有無を漏らさない)。
export const getMyNotifyHours = query({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const subscription = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique()
    if (subscription === null || subscription.userId !== user._id) return null
    return subscription.notifyHours
  },
})

export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    keys: keysValidator,
    userAgent: v.optional(v.string()),
    notifyHours: notifyHoursValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)

    const endpoint = args.endpoint.trim()
    if (!endpoint.startsWith('https://') || endpoint.length > PUSH.endpointMaxLength) {
      throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
    }
    if (!args.keys.p256dh.trim() || !args.keys.auth.trim()) {
      throw new ConvexError({ code: ERROR_CODES.VALIDATION_ERROR })
    }
    validateNotifyHours(args.notifyHours)

    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
      .unique()
    const now = Date.now()

    if (existing !== null) {
      // 同一デバイスからの再subscribe(ブラウザ側の状態リセットやアカウント切替を含む)。
      // このendpointの所有者をリクエスト送信者に付け替える。
      await ctx.db.patch(existing._id, {
        userId: user._id,
        keys: args.keys,
        userAgent: args.userAgent,
        notifyHours: args.notifyHours,
        updatedAt: now,
      })
      return { subscriptionId: existing._id }
    }

    const subscriptionId = await ctx.db.insert('pushSubscriptions', {
      userId: user._id,
      endpoint,
      keys: args.keys,
      userAgent: args.userAgent,
      notifyHours: args.notifyHours,
      createdAt: now,
      updatedAt: now,
    })
    return { subscriptionId }
  },
})

export const updateNotifyHours = mutation({
  args: { endpoint: v.string(), notifyHours: notifyHoursValidator },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    validateNotifyHours(args.notifyHours)
    const subscription = await requireOwnedSubscriptionByEndpoint(ctx, args.endpoint, user)
    await ctx.db.patch(subscription._id, { notifyHours: args.notifyHours, updatedAt: Date.now() })
    return { notifyHours: args.notifyHours }
  },
})

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const subscription = await requireOwnedSubscriptionByEndpoint(ctx, args.endpoint, user)
    await ctx.db.delete(subscription._id)
    return { deleted: true }
  },
})

const eligibleSubscriptionValidator = v.object({
  subscriptionId: v.id('pushSubscriptions'),
  userId: v.id('users'),
  endpoint: v.string(),
  keys: keysValidator,
  today: v.string(),
})

// convex/pushCron.ts から1時間ごとに呼ばれるページング走査。usersではなく
// pushSubscriptionsを走査することで、購読していないユーザーを毎回読まずに済む
// (ガイドラインの unbounded .collect() 禁止にも自然に適合する)。
export const listEligibleAtRiskPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator, now: v.number() },
  returns: v.object({
    eligible: v.array(eligibleSubscriptionValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query('pushSubscriptions').paginate(args.paginationOpts)

    const eligible: Array<{
      subscriptionId: Id<'pushSubscriptions'>
      userId: Id<'users'>
      endpoint: string
      keys: { p256dh: string; auth: string }
      today: string
    }> = []

    for (const subscription of page.page) {
      const user = await ctx.db.get(subscription.userId)
      if (user === null) continue

      const { shouldNotify, today } = shouldNotifyAtRisk(
        user.lastCompletedDate,
        subscription.lastNotifiedDate,
        user.timezone,
        args.now,
        subscription.notifyHours,
      )
      if (!shouldNotify) continue

      eligible.push({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        today,
      })
    }

    return { eligible, continueCursor: page.continueCursor, isDone: page.isDone }
  },
})

const sendResultValidator = v.object({
  subscriptionId: v.id('pushSubscriptions'),
  status: v.union(v.literal('sent'), v.literal('stale'), v.literal('failed')),
  today: v.string(),
})

export const applySendResults = internalMutation({
  args: { results: v.array(sendResultValidator) },
  handler: async (ctx, args) => {
    for (const result of args.results) {
      if (result.status === 'stale') {
        await ctx.db.delete(result.subscriptionId)
        continue
      }
      if (result.status === 'sent') {
        await ctx.db.patch(result.subscriptionId, {
          lastNotifiedDate: result.today,
          updatedAt: Date.now(),
        })
      }
      // 'failed' はno-op: 次回のcronで再試行される。ログテーブルは今回スコープ外。
    }
    return null
  },
})
