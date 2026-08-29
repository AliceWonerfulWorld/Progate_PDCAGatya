import { Flame, Plus, RotateCcw } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { GoalCard } from '../goals/GoalCard'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

function AuthenticatedGoalList() {
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const goals = useQuery(api.goals.listActiveGoals, isReady ? {} : 'skip')

  if (!isSignedIn) {
    return <p className="mt-2 text-sm leading-6 text-slate-600">ログインするとGoalを保存できます。</p>
  }
  if (hasError) {
    return <p className="mt-2 text-sm text-rose-700">Goalを読み込めませんでした。</p>
  }
  if (!isReady || goals === undefined) {
    return <p className="mt-2 text-sm text-slate-600">Goalを読み込んでいます。</p>
  }
  if (goals.length === 0) {
    return <p className="mt-2 text-sm leading-6 text-slate-600">小さな行動から始められます。</p>
  }

  return <div className="mt-3">{goals.map((goal) => <GoalCard goal={goal} key={goal._id} />)}</div>
}

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-medium text-emerald-700">今日の一歩</p>
        <SectionHeading>今日も1周だけ回そう。</SectionHeading>
        <div className="flex gap-6 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Flame aria-hidden="true" className="size-4 text-rose-500" />0日</span>
          <span className="inline-flex items-center gap-1"><RotateCcw aria-hidden="true" className="size-4 text-sky-600" />今日 0周</span>
        </div>
      </section>

      <section aria-labelledby="home-goal-heading" className="border-y border-slate-200 py-5">
        <p className="text-sm font-medium text-slate-500">続けたいこと</p>
        <h2 id="home-goal-heading" className="mt-1 text-lg font-bold">Goalを作って、最初の1周を始めよう</h2>
        {isClerkConfigured ? (
          <AuthenticatedGoalList />
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-600">小さな行動から始められます。</p>
        )}
        <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-emerald-700" to="/goals/new">
          <Plus aria-hidden="true" className="size-4" /> Goalを作る
        </Link>
      </section>
    </div>
  )
}
