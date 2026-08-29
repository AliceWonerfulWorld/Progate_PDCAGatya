import { CheckCircle2, Circle } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/data-model.md #25 (Mission Data) の COMPLETE_ONE_PDCA。
export function DailyMissionCard() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const mission = useQuery(api.missions.getDailyMissionStatus, isSignedIn && isReady ? {} : 'skip')

  if (!isSignedIn || !isReady || mission === undefined) return null

  return (
    <div
      className={`flex items-center gap-3 border px-4 py-3 ${
        mission.completed ? 'border-primary-subtle-hover bg-primary-subtle' : 'border-border-subtle'
      }`}
    >
      {mission.completed ? (
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
      ) : (
        <Circle aria-hidden="true" className="size-5 shrink-0 text-text-disabled" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-subtle">今日のチャレンジ</p>
        <p className={`text-sm font-bold ${mission.completed ? 'text-primary-strong' : 'text-text-body'}`}>
          PDCAを1周する {mission.completed ? '達成！' : `(+${mission.rewardXp} XP)`}
        </p>
      </div>
    </div>
  )
}
