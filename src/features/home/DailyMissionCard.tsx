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
        mission.completed ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
      }`}
    >
      {mission.completed ? (
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
      ) : (
        <Circle aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">今日のチャレンジ</p>
        <p className={`text-sm font-bold ${mission.completed ? 'text-emerald-800' : 'text-slate-700'}`}>
          PDCAを1周する {mission.completed ? '達成！' : `(+${mission.rewardXp} XP)`}
        </p>
      </div>
    </div>
  )
}
