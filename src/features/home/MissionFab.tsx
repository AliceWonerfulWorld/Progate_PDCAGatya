import { useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { MissionShortcut } from './MissionShortcut'

// ミッションは「今日のPDCA」とは別レイヤーの補助導線として、常時アクセス可能にする。
export function MissionFab() {
  const [isOpen, setIsOpen] = useState(false)
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const mission = useQuery(api.missions.getDailyMissionStatus, isReady && isSignedIn ? {} : 'skip')

  if (!isReady || !isSignedIn || mission === undefined) return null

  return (
    <>
      <MissionShortcut completed={mission.completed} onClick={() => setIsOpen(true)} rewardXp={mission.rewardXp} />
      {isOpen ? (
        <div aria-modal="true" className="fixed inset-0 z-30 flex items-end bg-text/30 p-4" role="dialog">
          <section aria-labelledby="mission-heading" className="w-full border border-reward-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-reward-text">今日のミッション</p>
                <h2 className="mt-1 text-lg font-bold" id="mission-heading">PDCAを1周する</h2>
              </div>
              <button
                aria-label="ミッションを閉じる"
                className="grid size-11 place-items-center text-text-muted transition-colors duration-(--duration-fast) ease-standard hover:text-text-body"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-text-body">
              {mission.completed ? '今日のミッションは達成済みです。' : `達成すると +${mission.rewardXp} XP を獲得できます。`}
            </p>
          </section>
        </div>
      ) : null}
    </>
  )
}
