import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Doc } from '../../../convex/_generated/dataModel'

// recoverable=true の間は「PDCAを回す」の代わりに「リカバリーする」を出し、
// isRecovery=true でCycleを開始できるようにする（ui-spec #8 / #28-31）。
export function GoalCard({ goal, recoverable = false }: { goal: Doc<'goals'>; recoverable?: boolean }) {
  return (
    <div className="border-y border-border-subtle py-4">
      <Link
        className="flex min-h-11 items-center justify-between transition-colors duration-(--duration-fast) ease-standard hover:text-primary-strong"
        to={`/goal/${goal._id}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{goal.name}</span>
          <span className="mt-1 block truncate text-sm text-text-muted">
            {goal.nextPlanCandidate ?? '次のPLANを決めよう'}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="ml-3 size-5 shrink-0 text-text-disabled" />
      </Link>
      <Link
        className={`mt-3 flex min-h-11 items-center justify-center px-4 text-sm font-bold text-white ${
          recoverable ? 'bg-attention' : 'bg-primary'
        }`}
        to={recoverable ? `/pdca/plan/${goal._id}?recovery=1` : `/pdca/plan/${goal._id}`}
      >
        {recoverable ? 'リカバリーする' : 'PDCAを回す'}
      </Link>
    </div>
  )
}
