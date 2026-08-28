import { ArrowRight, Flame, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeading } from '../../components/ui/SectionHeading'

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
        <p className="mt-2 text-sm leading-6 text-slate-600">小さな行動から始められます。</p>
        <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-emerald-700" to="/goal/example">
          Goalの詳細を見る <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </div>
  )
}
