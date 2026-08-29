import { ArrowLeft, Archive, Pencil } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from './useCurrentUserInitialization'

function formatCompletedAt(timestamp: number | undefined): string {
  if (timestamp === undefined) return '日時未記録'
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(timestamp)
}

function AuthenticatedGoalDetail({ goalId }: { goalId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const detail = useQuery(api.goals.getGoalDetail, isReady ? { goalId: goalId as never } : 'skip')
  const updateGoal = useMutation(api.goals.updateGoal)
  const archiveGoal = useMutation(api.goals.archiveGoal)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、Goalの詳細を確認できます。" />
  if (hasError) return <p className="text-sm text-rose-700">Goalを読み込めませんでした。</p>
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">Goalを読み込んでいます。</p>
  const { goal, recentCycles } = detail

  async function handleUpdate() {
    try {
      await updateGoal({ goalId: goal._id, name })
      setIsEditing(false)
      setError(null)
    } catch {
      setError('Goal名を更新できませんでした。')
    }
  }

  async function handleArchive() {
    if (!window.confirm('このGoalをアーカイブしますか？過去の履歴は残ります。')) return
    try {
      await archiveGoal({ goalId: goal._id })
      navigate('/')
    } catch {
      setError('Goalをアーカイブできませんでした。')
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              className="min-h-11 min-w-0 flex-1 border border-slate-300 bg-white px-3 text-lg font-bold"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <button className="min-h-11 px-3 text-sm font-bold text-emerald-700" onClick={handleUpdate} type="button">保存</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>{goal.name}</SectionHeading>
            <button
              aria-label="Goal名を編集"
              className="grid size-11 place-items-center text-slate-600"
              onClick={() => {
                setName(goal.name)
                setIsEditing(true)
              }}
              title="Goal名を編集"
              type="button"
            >
              <Pencil aria-hidden="true" className="size-5" />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p className="border-l-2 border-emerald-700 pl-3 text-slate-600">累計PDCA<br /><strong className="text-lg text-slate-900">{goal.totalCycles}周</strong></p>
          <p className="border-l-2 border-sky-600 pl-3 text-slate-600">活動日数<br /><strong className="text-lg text-slate-900">{goal.activeDays}日</strong></p>
        </div>
      </section>

      <section className="border-y border-slate-200 py-5">
        <p className="text-sm font-medium text-slate-500">次の候補</p>
        <p className="mt-1 text-base font-bold">{goal.nextPlanCandidate ?? 'まだ決まっていません'}</p>
        {goal.archivedAt === undefined ? (
          <Link
            className="mt-4 flex min-h-12 items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
            to={`/pdca/plan/${goal._id}`}
          >
            PDCAを回す
          </Link>
        ) : (
          <p className="mt-4 text-sm text-slate-600">アーカイブしたGoalでは新しいPDCAを始められません。</p>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">最近のPDCA</h2>
        {recentCycles.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">まだ完了したPDCAはありません。</p>
        ) : (
          <div className="mt-3 space-y-3">
            {recentCycles.map((cycle) => (
              <article className="border-l-2 border-slate-200 pl-3" key={cycle._id}>
                <p className="text-xs text-slate-500">{formatCompletedAt(cycle.completedAt)}</p>
                <p className="mt-1 text-sm font-semibold">{cycle.planText}</p>
                {cycle.nextPlanCandidate ? <p className="mt-1 text-sm text-slate-600">次回: {cycle.nextPlanCandidate}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600" onClick={handleArchive} type="button">
        <Archive aria-hidden="true" className="size-4" /> アーカイブ
      </button>
    </div>
  )
}

export function GoalDetailPage() {
  const { goalId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && goalId ? <AuthenticatedGoalDetail goalId={goalId} /> : <p className="text-sm text-slate-600">ログイン設定の完了後にGoalを表示できます。</p>}
    </div>
  )
}
