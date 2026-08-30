import { Link } from 'react-router-dom'

type TodayGoal = {
  _id: string
  name: string
  nextPlanCandidate?: string
}

// Homeの主CTAはGoal一覧から独立させ、「今日始める1周」を明確にする。
export function TodayPdcaCard({ goal, recoverable = false }: { goal: TodayGoal; recoverable?: boolean }) {
  const plan = goal.nextPlanCandidate ?? '今日のPLANを決めよう'
  const to = recoverable ? `/pdca/plan/${goal._id}?recovery=1` : `/pdca/plan/${goal._id}`

  return (
    <section aria-labelledby="today-pdca-heading" className="border border-primary-border bg-primary-subtle p-4">
      <p className="text-sm font-medium text-primary" id="today-pdca-heading">今日のPDCA</p>
      <p className="mt-3 text-sm text-text-subtle">{goal.name}</p>
      <p className="mt-1 text-base font-bold">{plan}</p>
      <Link
        className={`mt-4 flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${
          recoverable ? 'bg-attention' : 'bg-primary'
        }`}
        to={to}
      >
        {recoverable ? 'リカバリーする' : 'このPDCAを始める'}
      </Link>
    </section>
  )
}
