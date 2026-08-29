import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Doc } from '../../../convex/_generated/dataModel'
import { GoalCard } from './GoalCard'

// Homeで一度に出すGoalの上限。これを超えた分は「他N件」で畳む。
// Goalを増やすほどHomeが縦に伸び続ける問題への対処（Issue #94）。
const VISIBLE_LIMIT = 2

export function GoalList({
  goals,
}: {
  goals: Doc<'goals'>[]
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? goals : goals.slice(0, VISIBLE_LIMIT)
  const hiddenCount = goals.length - visible.length

  return (
    <div className="mt-3">
      {visible.map((goal) => (
        <GoalCard
          goal={goal}
          key={goal._id}
          showAction={false}
        />
      ))}
      {hiddenCount > 0 ? (
        <button
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-subtle transition-colors duration-(--duration-fast) ease-standard hover:text-primary"
          onClick={() => setExpanded(true)}
          type="button"
        >
          <ChevronDown aria-hidden="true" className="size-4" />他 {hiddenCount} 件のGoalを見る
        </button>
      ) : null}
    </div>
  )
}
