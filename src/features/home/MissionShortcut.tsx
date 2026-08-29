import { Target } from 'lucide-react'

export function MissionShortcut({
  completed,
  onClick,
  rewardXp,
}: {
  completed: boolean
  onClick: () => void
  rewardXp: number
}) {
  return (
    <button
      aria-label="ミッションを開く"
      className="fixed right-4 bottom-24 z-20 grid size-16 place-items-center rounded-full bg-reward text-white shadow-lg transition duration-(--duration-fast) ease-standard hover:bg-reward-strong"
      onClick={onClick}
      type="button"
    >
      <span className="grid justify-items-center gap-0.5 text-xs font-bold">
        <Target aria-hidden="true" className="size-5" />
        ミッション
      </span>
      <span className="sr-only">{completed ? '今日のミッション達成済み' : `1周で +${rewardXp} XP`}</span>
    </button>
  )
}
