import {
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { CompletePdcaCycleResult } from "../../../convex/pdca";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { FirstLoopGuide } from "../../components/ui/OnboardingFocusOverlay";
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "../../lib/buttonStyles";

interface CompleteLocationState {
  result: CompletePdcaCycleResult;
  goalId: string;
  isRecovery?: boolean;
}

function isCompleteLocationState(
  value: unknown,
): value is CompleteLocationState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.goalId === "string" &&
    typeof state.result === "object" &&
    state.result !== null
  );
}

// docs/ui-spec.md #15-16 (PDCA COMPLETE画面 / Player Level Up Overlay)。
// completePdcaCycle の結果はMutationの戻り値をそのままrouter stateで受け取る。
// reload等でstateが失われた場合はHomeへ戻す（履歴からは復元しない）。
export function CompletePage() {
  const location = useLocation();

  if (!isCompleteLocationState(location.state)) {
    return <Navigate replace to="/" />;
  }

  const { result, goalId, isRecovery } = location.state;
  // docs/ui-spec.md #31 (Recovery Complete)。救済が成立した(streakUpdated)場合のみ
  // 専用の表現にする。救済されなかった場合(既に期限切れ等)は通常表示のまま。
  const isRecoveredCompletion = isRecovery === true && result.streakUpdated;

  return (
    <div className="space-y-6 text-center">
      <section className="rounded-3xl border border-primary-border bg-primary-subtle p-6 shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary text-white shadow-sm">
          <CheckCircle2 aria-hidden="true" className="size-7" />
        </div>
        <p className="text-sm font-medium text-primary">
          {isRecoveredCompletion ? "STREAK RECOVERED!" : "PDCA COMPLETE!"}
        </p>
        <SectionHeading>
          {isRecoveredCompletion
            ? "ストリークを取り戻せたね。"
            : "今日も1周、できたね。"}
        </SectionHeading>
      </section>

      {goalId === "guest" ? (
        <FirstLoopGuide
          message="これで最初の1周は完了。ガチャを回す前に、記録を残す準備もできます。"
          step={5}
          title="最初の1周、完了！"
        />
      ) : null}

      <ul className="space-y-3 rounded-3xl border border-border-subtle bg-surface p-5 text-left shadow-sm">
        <li className="flex items-center gap-3 text-base font-semibold">
          <RotateCcw aria-hidden="true" className="size-5 text-choice-info" />{" "}
          +1周
        </li>
        <li className="flex items-center gap-3 text-base font-semibold">
          <Star aria-hidden="true" className="size-5 text-rarity-ssr-icon" />{" "}
          Player XP +{result.gainedXp}
        </li>
        <li className="flex items-center gap-3 text-base font-semibold">
          <Ticket aria-hidden="true" className="size-5 text-reward" /> ガチャ +
          {result.gachaDrawsAdded}
        </li>
        {result.dailyMissionCompleted && result.dailyMissionXp > 0 ? (
          <li className="flex items-center gap-3 text-base font-semibold text-primary">
            <CheckCircle2 aria-hidden="true" className="size-5" />{" "}
            今日のチャレンジ達成 Player XP +{result.dailyMissionXp}
          </li>
        ) : null}
      </ul>

      {isRecoveredCompletion ? (
        <p className="flex items-center justify-center gap-2 text-base font-bold text-attention">
          <Flame aria-hidden="true" className="size-5" /> {result.currentStreak}
          日ストリークを維持しました
        </p>
      ) : result.streakUpdated ? (
        <p className="flex items-center justify-center gap-2 text-base font-bold text-attention">
          <Flame aria-hidden="true" className="size-5" />{" "}
          今日のストリーク達成！({result.currentStreak}日)
        </p>
      ) : null}

      {result.levelUp ? (
        <section className="space-y-2 rounded-3xl bg-primary-subtle px-4 py-6">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-primary">
            <Sparkles aria-hidden="true" className="size-4" /> PLAYER LEVEL UP!
          </p>
          <p className="text-2xl font-bold text-primary-strong">
            Lv.{result.previousLevel} → Lv.{result.newLevel}
          </p>
        </section>
      ) : null}

      <div className="space-y-3">
        <Link
          className={`flex min-h-13 w-full items-center justify-center rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] ${PRIMARY_BUTTON_CLASS}`}
          state={{ goalId }}
          to="/gacha"
        >
          ガチャを回す
        </Link>
        <Link
          className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-base font-semibold ${SECONDARY_BUTTON_CLASS}`}
          to={goalId === "guest" ? "/" : `/goal/${goalId}`}
        >
          あとで
        </Link>
      </div>
    </div>
  );
}
