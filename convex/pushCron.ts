import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'

// At-Risk通知の固定コピー(§57: 事実ベース・非難調を避ける)。
// v1はトリガーが1種類のみなので、動的なテンプレート機構は作らない。
const AT_RISK_PUSH_PAYLOAD = {
  title: 'PDCA GACHA',
  body: '今日のストリークがまだ途切れていません。今日中にPDCAを1周するとつながります。',
  url: '/',
}

// convex/crons.tsから1時間ごとに起動する。pushSubscriptionsを25件ずつ
// ページングしながら走査し、対象があれば送信・結果反映してから続きを
// 自己再スケジュールする(1回のConvexトランザクションで全件処理しない)。
export const scanAtRiskUsers = internalAction({
  args: { cursor: v.optional(v.string()), now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now()

    const page = await ctx.runQuery(internal.push.listEligibleAtRiskPage, {
      paginationOpts: { cursor: args.cursor ?? null, numItems: 25 },
      now,
    })

    const results = await Promise.all(
      page.eligible.map(async (item) => {
        const status = await ctx.runAction(internal.pushSend.sendOne, {
          endpoint: item.endpoint,
          keys: item.keys,
          payload: AT_RISK_PUSH_PAYLOAD,
        })
        return { subscriptionId: item.subscriptionId, status, today: item.today }
      }),
    )

    if (results.length > 0) {
      await ctx.runMutation(internal.push.applySendResults, { results })
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.pushCron.scanAtRiskUsers, {
        cursor: page.continueCursor,
        now,
      })
    }

    return null
  },
})
