import { CheckCircle2, Play, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { PRIMARY_BUTTON_CLASS } from "../../lib/buttonStyles";

type TodayGoal = { _id: string; name: string; nextPlanCandidate?: string };

export function TodayPdcaCard({
  goal,
  recoverable = false,
  todayComplete = false,
}: {
  goal: TodayGoal;
  recoverable?: boolean;
  todayComplete?: boolean;
}) {
  const plan = goal.nextPlanCandidate ?? "今日のPLANを決めよう";
  const to = recoverable
    ? `/pdca/plan/${goal._id}?recovery=1`
    : `/pdca/plan/${goal._id}`;

  if (todayComplete && !recoverable)
    return (
      <section
        aria-labelledby="today-pdca-heading"
        className="overflow-hidden rounded-3xl border border-primary-border bg-primary-subtle p-5 shadow-sm"
      >
        <p
          className="flex items-center gap-1.5 text-xs font-black tracking-[0.14em] text-primary"
          id="today-pdca-heading"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" /> TODAY COMPLETE
        </p>
        <h2 className="mt-3 text-xl font-black tracking-tight text-text-strong">
          今日の1周は完了しました
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          次のPLAN候補：{plan}
        </p>
        <Link
          className={`mt-5 flex min-h-13 items-center justify-center gap-2 rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] ${PRIMARY_BUTTON_CLASS}`}
          to={to}
        >
          <RotateCw aria-hidden="true" className="size-5" /> もう1周する
        </Link>
      </section>
    );

  return (
    <section
      aria-labelledby="today-pdca-heading"
      className={`overflow-hidden rounded-3xl border p-5 shadow-sm ${recoverable ? "border-attention-border bg-attention-bg" : "border-primary-border bg-primary-subtle"}`}
    >
      <p
        className={`text-xs font-black tracking-[0.14em] ${recoverable ? "text-attention-body" : "text-primary"}`}
        id="today-pdca-heading"
      >
        {recoverable ? "RECOVERY PDCA" : "TODAY'S PDCA · 今日のPDCA"}
      </p>
      <p className="mt-4 text-sm font-bold text-text-muted">{goal.name}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
        {plan}
      </h2>
      <p className="mt-3 text-sm font-semibold text-text-muted">
        今日の一歩を、ここから始めよう。
      </p>
      <Link
        className={`mt-5 flex min-h-13 items-center justify-center gap-2 rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] ${recoverable ? "bg-attention" : PRIMARY_BUTTON_CLASS}`}
        to={to}
      >
        <Play aria-hidden="true" className="size-5 fill-current" />{" "}
        {recoverable ? "リカバリーする" : "このPDCAを始める"}
      </Link>
    </section>
  );
}
