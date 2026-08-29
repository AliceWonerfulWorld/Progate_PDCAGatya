import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'

// status ごとの再開先。reload しても保存済み状態から続きを開ける（AC-PDCA-005）。
const RESUME_PATHS = {
  doing: 'do',
  checking: 'check',
  acting: 'act',
} as const

export function ActiveCycleCard({ isReady }: { isReady: boolean }) {
  const active = useQuery(api.pdca.getActiveCycle, isReady ? {} : 'skip')
  if (active === undefined || active === null) return null

  const { cycle, goalName } = active
  const resumePath = RESUME_PATHS[cycle.status as keyof typeof RESUME_PATHS]
  if (resumePath === undefined) return null

  return (
    <section aria-labelledby="active-cycle-heading" className="border-y border-border-subtle py-5">
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
