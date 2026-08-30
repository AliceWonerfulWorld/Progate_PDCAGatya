import { CheckCircle2, ChevronRight, Target, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUserInitialization } from "../goals/useCurrentUserInitialization";

// Homeでは浮遊ボタンではなく、PDCAの次に読む小さな「今日のチャレンジ」として置く。
export function DailyMissionCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { isReady, isSignedIn } = useCurrentUserInitialization();
  const mission = useQuery(
    api.missions.getDailyMissionStatus,
    isReady && isSignedIn ? {} : "skip",
  );
  if (!isReady || !isSignedIn || mission === undefined) return null;

  return (
    <>
      <button
        aria-expanded={isOpen}
        className="w-full rounded-3xl border border-border-subtle bg-surface p-4 text-left shadow-sm transition-colors duration-(--duration-fast) ease-standard active:scale-[0.99]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid size-10 place-items-center rounded-2xl ${mission.completed ? "bg-primary-subtle text-primary" : "bg-surface-muted text-text-muted"}`}
          >
            {mission.completed ? (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            ) : (
              <Target aria-hidden="true" className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.12em] text-text-subtle">
              今日のチャレンジ
            </p>
            <p className="mt-1 text-sm font-black text-text-strong">
              PDCAを1周する
            </p>
            <p className="mt-0.5 text-xs font-semibold text-text-muted">
              {mission.completed
                ? "達成済み。今日も積み上がったね。"
                : "あと1周で達成"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-black text-reward-text">
            +{mission.rewardXp}
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-text-subtle"
            />
          </div>
        </div>
      </button>
      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-text/30 p-4 backdrop-blur-[2px]"
          role="dialog"
        >
          <section
            aria-labelledby="mission-heading"
            className="mx-auto w-full max-w-[32.5rem] rounded-3xl border border-reward-border bg-surface p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-reward-text">
                  今日のチャレンジ
                </p>
                <h2
                  className="mt-1 text-xl font-black text-text-strong"
                  id="mission-heading"
                >
                  PDCAを1周する
                </h2>
              </div>
              <button
                aria-label="ミッションを閉じる"
                className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-text-muted"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-text-body">
              {mission.completed
                ? "今日のミッションは達成済みです。"
                : `達成すると +${mission.rewardXp} XP を獲得できます。`}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}

// 既存の呼び出し互換。Home以外で使う場合も、同じチャレンジカードを返す。
export const MissionFab = DailyMissionCard;
