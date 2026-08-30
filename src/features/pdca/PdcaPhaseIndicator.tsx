// PDCAのどこにいるかを P-D-C-A の4点で示す。
// status は「完了したフェーズ」ではなく「今いるフェーズ」なので、
// doing なら D が現在地、P は完了済みになる
// （technical-design #8: cycleはPLAN確定後に作成される）。
const PHASES = [
  { key: 'plan', letter: 'P' },
  { key: 'do', letter: 'D' },
  { key: 'check', letter: 'C' },
  { key: 'act', letter: 'A' },
] as const

const CURRENT_PHASE_INDEX = {
  doing: 1,
  checking: 2,
  acting: 3,
} as const

export type ActivePdcaStatus = keyof typeof CURRENT_PHASE_INDEX

export const PHASE_LABEL = {
  doing: 'DO',
  checking: 'CHECK',
  acting: 'ACT',
} as const

export function PdcaPhaseIndicator({ status }: { status: ActivePdcaStatus }) {
  const currentIndex = CURRENT_PHASE_INDEX[status]

  return (
    <ol aria-label={`PDCAの現在地: ${PHASE_LABEL[status]}`} className="flex items-center gap-1.5">
      {PHASES.map((phase, index) => {
        const isCurrent = index === currentIndex
        const isDone = index < currentIndex
        return (
          <li
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
              isCurrent
                ? 'bg-primary text-white'
                : isDone
                  ? 'border border-primary-border text-primary-strong'
                  : 'border border-border-subtle text-text-disabled'
            }`}
            key={phase.key}
          >
            {phase.letter}
          </li>
        )
      })}
    </ol>
  )
}
