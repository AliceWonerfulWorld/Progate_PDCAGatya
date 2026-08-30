import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/ui-spec.md #8 (Home - Streak At Risk)。責める表現は使わない。
export function AtRiskBanner({ blockNewCycle = false }: { blockNewCycle?: boolean }) {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const [dismissed, setDismissed] = useState(false)
  const streakStatus = useQuery(api.users.getStreakStatus, isSignedIn && isReady ? {} : 'skip')
  // どのGoalで回してもリカバリーは成立するため、先頭のGoalへ直接ジャンプする
  // （旧実装はGoal一覧へのアンカースクロールのみで、そこから対象カードを
  // 自分で探させていた）。
  const goals = useQuery(
    api.goals.listActiveGoals,
    isSignedIn && isReady && streakStatus?.streakStatus === 'atRisk' ? {} : 'skip',
  )

  if (!isSignedIn || !isReady || streakStatus === undefined) return null
  if (streakStatus.streakStatus !== 'atRisk' || dismissed) return null

  const primaryGoal = goals?.[0]

  return (
    <div className="space-y-3 border border-attention-border bg-attention-bg p-4">
      <p className="text-sm font-bold text-attention-text">⚠️ ストリークが危機です</p>
      <p className="text-sm leading-6 text-attention-body">
        昨日はPDCAを回せませんでした。でも、まだ戻せます。
      </p>
      {streakStatus.recoveryAvailable && !blockNewCycle ? (
        <div className="flex gap-3">
          {primaryGoal ? (
            <Link
              className="flex min-h-11 flex-1 items-center justify-center bg-attention px-4 text-sm font-bold text-white"
              to={`/pdca/plan/${primaryGoal._id}?recovery=1`}
            >
              リカバリーする
            </Link>
          ) : (
            <a
              className="flex min-h-11 flex-1 items-center justify-center bg-attention px-4 text-sm font-bold text-white"
              href="#home-goal-heading"
            >
              リカバリーする
            </a>
          )}
          <button
            className="flex min-h-11 flex-1 items-center justify-center border border-attention-border px-4 text-sm font-semibold text-attention-body"
            onClick={() => setDismissed(true)}
            type="button"
          >
            あとで
          </button>
        </div>
      ) : (
        <p className="text-xs text-attention">
          {blockNewCycle
            ? '進行中のPDCAを完了すると、リカバリーを始められます。'
            : '今回のリカバリーは既に使用済みです。次回からまた続けましょう。'}
        </p>
      )}
    </div>
  )
}
