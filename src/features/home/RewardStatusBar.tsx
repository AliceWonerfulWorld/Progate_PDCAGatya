import { CheckCircle2, Circle, Ticket } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 未使用ガチャ(ui-spec #6.2 優先度8)と今日のチャレンジは、どちらも
// 「今日やること」そのものではない補助情報。以前はフルサイズのカード2枚で
// 縦を消費していたため、1行の帯にまとめて Goal を画面内に残す
// (AC-HOME-003 の導線自体は消さない)。
export function RewardStatusBar() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const enabled = isSignedIn && isReady
  const currentUser = useQuery(api.users.currentUser, enabled ? {} : 'skip')
  const mission = useQuery(api.missions.getDailyMissionStatus, enabled ? {} : 'skip')

  if (!enabled) return null

  const draws = currentUser?.availableGachaDraws ?? 0
  const hasDraws = draws > 0
  if (!hasDraws && mission === undefined) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-border-subtle py-2.5">
      {mission ? (
        <p className="inline-flex items-center gap-1.5 text-sm">
          {mission.completed ? (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
          ) : (
            <Circle aria-hidden="true" className="size-4 shrink-0 text-text-disabled" />
          )}
          <span className={mission.completed ? 'font-bold text-primary-strong' : 'text-text-muted'}>
            {mission.completed ? '今日のチャレンジ達成！' : `1周で +${mission.rewardXp} XP`}
          </span>
        </p>
      ) : (
        <span />
      )}
      {hasDraws ? (
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-reward-text transition-colors duration-(--duration-fast) ease-standard hover:text-reward-strong"
          to="/gacha"
        >
          <Ticket aria-hidden="true" className="size-4" />
          ガチャ {draws}回を回す
        </Link>
      ) : null}
    </div>
  )
}
