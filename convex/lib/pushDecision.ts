import { getLocalDateString } from './date'
import { deriveStreakStatus } from './streak'

// Push通知(At-Riskトリガー)の送信判定。ストリークの判定そのものは
// convex/lib/streak.ts の deriveStreakStatus をそのまま使い、ここでは
// 「ユーザーが選んだ通知時刻に、今の時刻が一致しているか」と
// 「今日はまだこの購読で送っていないか」の2条件を掛け合わせるだけ。

export function getLocalHour(timestamp: number, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  })
  return Number(formatter.format(new Date(timestamp)))
}

export interface ShouldNotifyAtRiskResult {
  shouldNotify: boolean
  today: string
}

export function shouldNotifyAtRisk(
  lastCompletedDate: string | undefined,
  lastNotifiedDate: string | undefined,
  timezone: string,
  now: number,
  notifyHours: number[],
): ShouldNotifyAtRiskResult {
  const today = getLocalDateString(now, timezone)
  const { streakStatus } = deriveStreakStatus(lastCompletedDate, today)
  const localHour = getLocalHour(now, timezone)
  const shouldNotify =
    streakStatus === 'atRisk' && notifyHours.includes(localHour) && lastNotifiedDate !== today
  return { shouldNotify, today }
}
