import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PRIMARY_BUTTON_CLASS } from "../../lib/buttonStyles";
import {
  PdcaPhaseIndicator,
  PHASE_LABEL,
  type ActivePdcaStatus,
} from "./PdcaPhaseIndicator";

// status ごとの再開先。reload しても保存済み状態から続きを開ける（AC-PDCA-005）。
const RESUME_PATHS = {
  doing: "do",
  checking: "check",
  acting: "act",
} as const;

// CTAは「今どこにいるか」ではなく「次に何をするか」を示す。
// doing でHomeに戻ってきた人は、CHECKへ進む操作でDO結果を選ぶので、
// 遷移先のボタン文言（DoPageの「CHECKへ進む」）とそのまま揃える。
const RESUME_LABELS = {
  doing: "CHECKへ進む",
  checking: "結果を記録する",
  acting: "次のPLANを決める",
} as const;

type ActiveCycle = { cycle: Doc<"pdcaCycles">; goalName: string | null };

function isActiveStatus(status: string): status is ActivePdcaStatus {
  return status in RESUME_PATHS;
}

// 進行中Cycleの取得はHomePage側に集約済み。ここは描画だけを持つ。
export function ActiveCycleCard({ active }: { active: ActiveCycle | null }) {
  if (active === null) return null;

  const { cycle, goalName } = active;
  if (!isActiveStatus(cycle.status)) return null;

  const taskLabel =
    cycle.status === "doing"
      ? "DO：いまやること"
      : `いま ${PHASE_LABEL[cycle.status]}`;

  return (
    <section
      aria-labelledby="active-cycle-heading"
      className="overflow-hidden rounded-3xl border border-primary-border bg-primary-subtle p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-sm font-medium text-primary"
          id="active-cycle-heading"
        >
          NOW PLAYING · いま取り組んでいるGoal
        </p>
        <PdcaPhaseIndicator status={cycle.status} />
      </div>
      {goalName ? (
        <p className="mt-4 text-sm font-bold text-text-muted">{goalName}</p>
      ) : null}
      <div className="mt-1 rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-xs font-black tracking-[0.12em] text-primary">
          {taskLabel}
        </p>
        <p className="mt-2 text-xl font-black tracking-tight text-text-strong">
          {cycle.planText}
        </p>
      </div>
      <Link
        className={`mt-5 flex min-h-13 items-center justify-center gap-2 rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] ${PRIMARY_BUTTON_CLASS}`}
        to={`/pdca/${RESUME_PATHS[cycle.status]}/${cycle._id}`}
      >
        <Play aria-hidden="true" className="size-5 fill-current" /> 続きから：
        {RESUME_LABELS[cycle.status]}
      </Link>
    </section>
  );
}
