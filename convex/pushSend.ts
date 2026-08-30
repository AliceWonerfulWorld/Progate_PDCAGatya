'use node'

import webpush from 'web-push'
import { v } from 'convex/values'
import { internalAction, env } from './_generated/server'
import { classifyPushSendError } from './lib/pushClassifyError'

// web-pushのVAPID署名(JWT)はNode組み込みのcryptoを使うため、この処理だけを
// "use node"ファイルに隔離する(このファイルはquery/mutationを一切exportしない)。
// 送信失敗は決して例外として投げない: convex/ai.tsと同じ「外部API失敗は
// コアループを止めない」思想をPush送信にも適用する。
export const sendOne = internalAction({
  args: {
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
    payload: v.object({ title: v.string(), body: v.string(), url: v.string() }),
  },
  returns: v.union(v.literal('sent'), v.literal('stale'), v.literal('failed')),
  handler: async (_ctx, args) => {
    if (env.VAPID_PUBLIC_KEY === undefined || env.VAPID_PRIVATE_KEY === undefined || env.VAPID_SUBJECT === undefined) {
      return 'failed'
    }

    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

    try {
      await webpush.sendNotification(
        { endpoint: args.endpoint, keys: args.keys },
        JSON.stringify(args.payload),
      )
      return 'sent'
    } catch (error) {
      return classifyPushSendError(error)
    }
  },
})
