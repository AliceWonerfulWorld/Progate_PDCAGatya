import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Doc } from '../../../convex/_generated/dataModel'

export function GoalCard({ goal }: { goal: Doc<'goals'> }) {
  return (
    <div className="border-y border-slate-200 py-4">
      <Link
        className="flex min-h-11 items-center justify-between transition-colors hover:text-emerald-800"
        to={`/goal/${goal._id}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{goal.name}</span>
          <span className="mt-1 block truncate text-sm text-slate-600">
            {goal.nextPlanCandidate ?? '次のPLANを決めよう'}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="ml-3 size-5 shrink-0 text-slate-400" />
      </Link>
      <Link
        className="mt-3 flex min-h-11 items-center justify-center bg-emerald-700 px-4 text-sm font-bold text-white"
        to={`/pdca/plan/${goal._id}`}
      >
        PDCAを回す
      </Link>
    </div>
  )
}
