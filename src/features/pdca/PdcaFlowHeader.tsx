const STEPS = [
  { key: "plan", label: "PLAN" },
  { key: "do", label: "DO" },
  { key: "check", label: "CHECK" },
  { key: "act", label: "ACT" },
] as const;

type FlowStep = (typeof STEPS)[number]["key"];

export function PdcaFlowHeader({ step }: { step: FlowStep }) {
  const currentIndex = STEPS.findIndex((item) => item.key === step);
  return (
    <ol
      aria-label={`PDCAの現在地: ${step.toUpperCase()}`}
      className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-muted p-1.5"
    >
      {STEPS.map((item, index) => (
        <li
          aria-current={index === currentIndex ? "step" : undefined}
          className={`flex min-h-10 items-center justify-center rounded-xl text-[10px] font-black tracking-[0.08em] ${index === currentIndex ? "bg-primary text-white shadow-sm" : index < currentIndex ? "bg-primary-subtle text-primary" : "text-text-disabled"}`}
          key={item.key}
        >
          {item.label}
        </li>
      ))}
    </ol>
  );
}
