import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// ユーザーごとのtimezoneでローカル時刻を判定するため、cron自体は1時間ごとに
// 実行し、「今この瞬間が対象ユーザーの選択時刻と一致するか」はconvex/lib/pushDecision.ts
// の shouldNotifyAtRisk 側で判定する(docs/technical-design.md Push Notification参照)。
crons.interval(
  'scan at-risk users for push notifications',
  { hours: 1 },
  internal.pushCron.scanAtRiskUsers,
  {},
)

export default crons
