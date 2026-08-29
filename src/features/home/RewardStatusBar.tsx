import { Ticket } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 未使用ガチャ(ui-spec #6.2 優先度8)は「今日やること」そのものではない補助情報。
// ミッションは右下の別レイヤーへ分離し、ここではガチャ導線だけを静かに表示する。
export function RewardStatusBar() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const enabled = isSignedIn && isReady
  const currentUser = useQuery(api.users.currentUser, enabled ? {} : 'skip')

  if (!enabled) return null

  const draws = currentUser?.availableGachaDraws ?? 0
  const hasDraws = draws > 0
  if (!hasDraws) return null

  return (
    <div className="flex justify-end border-y border-border-subtle py-2.5">
      <Link
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-reward-text transition-colors duration-(--duration-fast) ease-standard hover:text-reward-strong"
        to="/gacha"
      >
        <Ticket aria-hidden="true" className="size-4" />
        ガチャ {draws}回を回す
      </Link>
    </div>
  )
}
