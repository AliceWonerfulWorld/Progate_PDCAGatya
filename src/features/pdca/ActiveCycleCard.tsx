import { Link } from 'react-router-dom'
import type { Doc } from '../../../convex/_generated/dataModel'

// status ごとの再開先。reload しても保存済み状態から続きを開ける（AC-PDCA-005）。
const RESUME_PATHS = {
  doing: 'do',
  checking: 'check',
  acting: 'act',
} as const

type ActiveCycle = { cycle: Doc<'pdcaCycles'>; goalName: string | null }

// 進行中Cycleの取得はHomePage側に集約済み。ここは描画だけを持つ。
export function ActiveCycleCard({ active }: { active: ActiveCycle | null }) {
  if (active === null) return null

  const { cycle, goalName } = active
  const resumePath = RESUME_PATHS[cycle.status as keyof typeof RESUME_PATHS]
  if (resumePath === undefined) return null

  return (
    <section aria-labelledby="active-cycle-heading" className="border border-primary-border bg-primary-subtle p-4">
      <p className="text-sm font-medium text-primary" id="active-cycle-heading">
        進行中
      </p>
      {goalName ? <p className="mt-1 text-sm text-text-subtle">{goalName}</p> : null}
      <p className="mt-1 text-base font-bold">{cycle.planText}</p>
      <Link
        className="mt-4 flex min-h-12 items-center justify-center bg-primary px-4 text-base font-bold text-white"
        to={`/pdca/${resumePath}/${cycle._id}`}
      >
        続きを開く
      </Link>
    </section>
  )
}
