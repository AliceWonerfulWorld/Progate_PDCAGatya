export interface FocusRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export function FirstLoopGuide({
  step,
  title,
  message,
}: {
  step: number;
  title: string;
  message: string;
}) {
  const steps = ["Goal", "PLAN", "DO", "CHECK", "ACT"];

  return (
    <aside
      aria-label="最初の一周ガイド"
      className="rounded-3xl border border-primary-border bg-primary-subtle p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary text-white">
          <span className="text-xs font-black">{step}</span>
        </div>
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-primary">
            FIRST LOOP · {step}/{steps.length}
          </p>
          <h2 className="mt-1 text-sm font-black text-text-strong">{title}</h2>
          <p
            aria-live="polite"
            className="mt-1 text-sm leading-5 text-text-muted"
          >
            {message}
          </p>
        </div>
      </div>
      <ol aria-label="PDCAの進み具合" className="mt-4 grid grid-cols-5 gap-1.5">
        {steps.map((label, index) => {
          const current = index + 1 === step;
          const complete = index + 1 < step;
          return (
            <li className="min-w-0" key={label}>
              <div
                className={`h-1.5 rounded-full ${complete || current ? "bg-primary" : "bg-primary-border"}`}
              />
              <p
                className={`mt-1 truncate text-center text-[9px] font-black ${current ? "text-primary" : "text-text-subtle"}`}
              >
                {label}
              </p>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

// 以前の全面マスクUIを置き換える互換コンポーネント。
// rectは既存の呼び出し元との互換性のため受け取るが、操作を遮らないカード型ガイドでは使用しない。
export function OnboardingFocusOverlay({
  message,
}: {
  message: string;
  rect: FocusRect;
}) {
  return (
    <FirstLoopGuide message={message} step={2} title="小さなPLANを選ぼう" />
  );
}

export function GuestOnboardingFocus({
  message,
  targetId,
}: {
  message: string;
  targetId: string;
}) {
  const isPlan = targetId === "guest-onboarding-plan-confirm";
  return (
    <FirstLoopGuide
      message={message}
      step={isPlan ? 2 : 3}
      title={isPlan ? "まずは小さく始めよう" : "できたことを記録しよう"}
    />
  );
}
