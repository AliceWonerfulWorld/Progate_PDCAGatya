import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/ui-spec.md #8 (Home - Streak At Risk)。責める表現は使わない。
export function AtRiskBanner() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const [dismissed, setDismissed] = useState(false)
  const streakStatus = useQuery(api.users.getStreakStatus, isSignedIn && isReady ? {} : 'skip')

  if (!isSignedIn || !isReady || streakStatus === undefined) return null
  if (streakStatus.streakStatus !== 'atRisk' || dismissed) return null

  return (
    <div className="space-y-3 border border-rose-300 bg-rose-50 p-4">
      <p className="text-sm font-bold text-rose-800">⚠️ ストリークが危機です</p>
      <p className="text-sm leading-6 text-rose-700">
        昨日はPDCAを回せませんでした。でも、まだ戻せます。
      </p>
      {streakStatus.recoveryAvailable ? (
        <div className="flex gap-3">
          <a
            className="flex min-h-11 flex-1 items-center justify-center bg-rose-600 px-4 text-sm font-bold text-white"
            href="#home-goal-heading"
          >
            リカバリーする
          </a>
          <button
            className="flex min-h-11 flex-1 items-center justify-center border border-rose-300 px-4 text-sm font-semibold text-rose-700"
            onClick={() => setDismissed(true)}
            type="button"
          >
            あとで
          </button>
        </div>
      ) : (
        <p className="text-xs text-rose-600">今回のリカバリーは既に使用済みです。次回からまた続けましょう。</p>
      )}
    </div>
  )
}
