import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { SectionHeading } from '../../components/ui/SectionHeading'

export function GoalDetailPage() {
  const { goalId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      <div>
        <SectionHeading>Goal詳細</SectionHeading>
        <p className="mt-2 break-all text-sm text-slate-600">Goal ID: {goalId}</p>
      </div>
    </div>
  )
}
