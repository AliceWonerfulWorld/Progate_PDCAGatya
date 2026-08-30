import { Target } from "lucide-react";

export function MissionShortcut({
  completed,
  onClick,
  rewardXp,
}: {
  completed: boolean;
  onClick: () => void;
  rewardXp: number;
}) {
  return (
    <button
      aria-label="ミッションを開く"
      className="mission-shortcut grid size-16 place-items-center rounded-3xl bg-reward text-white shadow-[0_10px_24px_var(--color-reward-border)] transition-colors duration-(--duration-fast) ease-standard active:scale-[0.96]"
      onClick={onClick}
      type="button"
    >
      <span className="grid justify-items-center gap-0.5 text-xs font-bold">
        <Target aria-hidden="true" className="size-5" />
        ミッション
      </span>
      <span className="sr-only">
        {completed ? "今日のミッション達成済み" : `1周で +${rewardXp} XP`}
      </span>
    </button>
  );
}
