import { ArrowLeft, Archive, Pencil } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { userFacingError } from '../../lib/userFacingError'
import { useCurrentUserInitialization } from './useCurrentUserInitialization'

function formatCompletedAt(timestamp: number | undefined): string {
  if (timestamp === undefined) return '日時未記録'
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(timestamp)
}

function AuthenticatedGoalDetail({ goalId }: { goalId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const detail = useQuery(api.goals.getGoalDetail, isReady ? { goalId: goalId as never } : 'skip')
  const activeCycle = useQuery(api.pdca.getActiveCycle, isReady ? {} : 'skip')
  const updateGoal = useMutation(api.goals.updateGoal)
  const archiveGoal = useMutation(api.goals.archiveGoal)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  // ui-spec #35: 削除/アーカイブは確認を挟む。ネイティブのwindow.confirm()は
  // アプリの見た目・トーンから外れるため、他画面と同じ見た目のパネルで確認する。
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、Goalの詳細を確認できます。" />
  if (hasError) return <LoadFailure message="Goalを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined || activeCycle === undefined) return <LoadingState label="Goalを読み込んでいます。" />
  const { goal, recentCycles } = detail

  async function handleUpdate() {
    setIsSaving(true)
    try {
      await updateGoal({ goalId: goal._id, name })
      setIsEditing(false)
      setError(null)
    } catch (caughtError) {
      setError(userFacingError(caughtError, 'Goal名を更新できませんでした。'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchive() {
    setIsArchiving(true)
    try {
      await archiveGoal({ goalId: goal._id })
      navigate('/')
    } catch (caughtError) {
      setError(userFacingError(caughtError, 'Goalをアーカイブできませんでした。'))
      setIsConfirmingArchive(false)
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {isEditing ? (
          <div className="flex gap-2">
            <input
              className="min-h-11 min-w-0 flex-1 border border-border bg-surface px-3 text-lg font-bold"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <button className="min-h-11 px-3 text-sm font-bold text-primary disabled:text-text-disabled" disabled={isSaving} onClick={() => void handleUpdate()} type="button">{isSaving ? '保存中…' : '保存'}</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>{goal.name}</SectionHeading>
            <button
              aria-label="Goal名を編集"
              className="grid size-11 place-items-center text-text-muted"
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
          <p className="border-l-2 border-primary pl-3 text-text-muted">累計PDCA<br /><strong className="text-lg text-text">{goal.totalCycles}周</strong></p>
          <p className="border-l-2 border-choice-info pl-3 text-text-muted">活動日数<br /><strong className="text-lg text-text">{goal.activeDays}日</strong></p>
        </div>
      </section>

      <section className="border-y border-border-subtle py-5">
        <p className="text-sm font-medium text-text-subtle">次の候補</p>
        <p className="mt-1 text-base font-bold">{goal.nextPlanCandidate ?? 'まだ決まっていません'}</p>
        {goal.archivedAt === undefined && activeCycle === null ? (
          <Link
            className="mt-4 flex min-h-12 items-center justify-center bg-primary px-4 text-base font-bold text-white"
            to={`/pdca/plan/${goal._id}`}
          >
            PDCAを回す
          </Link>
        ) : goal.archivedAt === undefined ? (
          <Link
            className="mt-4 flex min-h-12 items-center justify-center border border-border px-4 text-sm font-bold text-text-body"
            to="/"
          >
            進行中のPDCAを確認する
          </Link>
        ) : (
          <p className="mt-4 text-sm text-text-muted">アーカイブしたGoalでは新しいPDCAを始められません。</p>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold">最近のPDCA</h2>
        {recentCycles.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">まだ完了したPDCAはありません。</p>
        ) : (
          <div className="mt-3 space-y-3">
            {recentCycles.map((cycle) => (
              <article className="border-l-2 border-border-subtle pl-3" key={cycle._id}>
                <p className="text-xs text-text-subtle">{formatCompletedAt(cycle.completedAt)}</p>
                <p className="mt-1 text-sm font-semibold">{cycle.planText}</p>
                {cycle.nextPlanCandidate ? <p className="mt-1 text-sm text-text-muted">次回: {cycle.nextPlanCandidate}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? <p className="text-sm text-attention-body">{error}</p> : null}

      {isConfirmingArchive ? (
        <div className="space-y-3 border border-border bg-surface-subtle p-4">
          <p className="text-sm leading-6 text-text-body">このGoalをアーカイブしますか？過去の履歴は残ります。</p>
          <div className="flex gap-3">
            <button
              className="flex min-h-11 flex-1 items-center justify-center bg-text-body px-4 text-sm font-bold text-white"
              disabled={isArchiving}
              onClick={() => void handleArchive()}
              type="button"
            >
              {isArchiving ? 'アーカイブ中…' : 'アーカイブする'}
            </button>
            <button
              className="flex min-h-11 flex-1 items-center justify-center border border-border px-4 text-sm font-semibold text-text-body"
              disabled={isArchiving}
              onClick={() => setIsConfirmingArchive(false)}
              type="button"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-text-muted"
          onClick={() => setIsConfirmingArchive(true)}
          type="button"
        >
          <Archive aria-hidden="true" className="size-4" /> アーカイブ
        </button>
      )}
    </div>
  )
}

export function GoalDetailPage() {
  const { goalId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-muted" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && goalId ? <AuthenticatedGoalDetail goalId={goalId} /> : <p className="text-sm text-text-muted">ログイン設定の完了後にGoalを表示できます。</p>}
    </div>
  )
}
