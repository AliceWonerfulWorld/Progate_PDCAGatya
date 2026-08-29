import { Minus, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { adjustPlanText, type PlanAdjustDirection } from '../../../convex/lib/planAdjust'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useGuestState } from '../../hooks/useGuestState'
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const GUEST_RESUME_PATHS = { doing: 'do', checking: 'check', acting: 'act' } as const

// PLAN本体のUI。「もっと軽く」「もう少しやる」はテキストをその場で相対調整するだけで、
// ユーザーに書き直しを要求しない（ui-spec #9.4）。手で書きたい場合のみ「自分で変更」で
// 入力欄を開く。
function PlanEditor({
  title,
  goalName,
  isRecovery,
  initialText,
  hasCandidate,
  isSubmitting,
  error,
  onSubmit,
}: {
  title: string
  goalName: string
  isRecovery: boolean
  initialText: string
  hasCandidate: boolean
  isSubmitting: boolean
  error: string | null
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState(initialText)
  const [isEditing, setIsEditing] = useState(!hasCandidate)

  function applyAdjustment(direction: PlanAdjustDirection) {
    setText((current) => adjustPlanText(current, direction))
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <p className="text-sm font-medium text-slate-500">{goalName}</p>
        {isRecovery ? <p className="text-sm font-bold text-rose-600">リカバリー</p> : null}
        <SectionHeading>{isEditing ? '今日やること' : title}</SectionHeading>
        {isEditing && hasCandidate ? (
          <button
            className="text-sm font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
            onClick={() => setIsEditing(false)}
            type="button"
          >
            候補の選択に戻る
          </button>
        ) : null}
        {isEditing ? (
          <label className="block space-y-2" htmlFor="plan-text">
            <span className="text-sm text-slate-600">
              {hasCandidate ? '今日やることを書いてください。' : '最初にやることを決めよう。'}
            </span>
            <input
              autoFocus
              className="min-h-12 w-full border border-slate-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
              id="plan-text"
              maxLength={INPUT_LIMITS.planText}
              onChange={(event) => setText(event.target.value)}
              placeholder="英単語を5個復習する"
              value={text}
            />
          </label>
        ) : (
          <p className="text-lg font-bold">{text}</p>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className={`min-h-12 w-full px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          disabled={isSubmitting}
          onClick={() => onSubmit(text)}
          type="button"
        >
          {isEditing ? 'このPLANで進む' : 'これでやる'}
        </button>
        {isEditing ? null : (
          <>
            <button
              className={`flex min-h-12 w-full items-center justify-center gap-2 px-4 text-base font-semibold ${SECONDARY_BUTTON_CLASS}`}
              onClick={() => applyAdjustment('lighter')}
              type="button"
            >
              <Minus aria-hidden="true" className="size-4" /> もっと軽く
            </button>
            <button
              className={`flex min-h-12 w-full items-center justify-center gap-2 px-4 text-base font-semibold ${SECONDARY_BUTTON_CLASS}`}
              onClick={() => applyAdjustment('heavier')}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" /> もう少しやる
            </button>
            <button
              className={`flex min-h-12 w-full items-center justify-center gap-2 px-4 text-base font-semibold ${SECONDARY_BUTTON_CLASS}`}
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" /> 自分で変更
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SignedInPlanPage({ goalId }: { goalId: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isRecovery = searchParams.get('recovery') === '1'
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const detail = useQuery(
    api.goals.getGoalDetail,
    isReady ? { goalId: goalId as Id<'goals'> } : 'skip',
  )
  const startPdcaCycle = useMutation(api.pdca.startPdcaCycle)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (hasError) return <LoadFailure message="PLANを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">PLANを読み込んでいます。</p>

  const { goal } = detail
  if (goal.archivedAt !== undefined) {
    return <p className="text-sm text-slate-600">アーカイブしたGoalでは新しいPDCAを始められません。</p>
  }

  async function handleStart(planText: string) {
    if (!planText.trim()) {
      setError('今日やることを入力してください')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      // Cycle はここで初めて作成される（AC-PDCA-001 / AC-PDCA-002）。
      // isRecovery=true はServer側でAt Risk状態を再検証してから許可される
      // （クエリパラメータはUIの導線に過ぎず、認可の根拠にはしない）。
      const { cycleId } = await startPdcaCycle({ goalId: goal._id, planText, isRecovery })
      navigate(`/pdca/do/${cycleId}`)
    } catch {
      setError(
        isRecovery
          ? 'リカバリーを開始できませんでした。すでに利用済みか、対象外の可能性があります。'
          : 'PDCAを開始できませんでした。もう一度試してください。',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <PlanEditor
      error={error}
      goalName={goal.name}
      hasCandidate={goal.nextPlanCandidate !== undefined}
      initialText={goal.nextPlanCandidate ?? ''}
      isRecovery={isRecovery}
      isSubmitting={isSubmitting}
      onSubmit={(text) => void handleStart(text)}
      title={isRecovery ? '今日はこれだけやってみよう。' : '今日これやる？'}
    />
  )
}

// docs/user-flow.md #0: ログイン前でもPLAN確定〜DO開始まで進められる。
// Guestは1つのGoal・1つのCycleしか持てないため、進行中Cycleがあれば
// そのステップへ即座に送り返す。
function GuestPlanPage() {
  const navigate = useNavigate()
  const { state, setCycle } = useGuestState()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!state.goal) return <Navigate replace to="/goals/new" />

  const cycle = state.cycle
  if (cycle && cycle.status !== 'completed' && cycle.status !== 'cancelled') {
    return <Navigate replace to={`/pdca/${GUEST_RESUME_PATHS[cycle.status]}/guest`} />
  }

  function handleStart(planText: string) {
    if (!planText.trim()) {
      setError('今日やることを入力してください')
      return
    }
    setError(null)
    setIsSubmitting(true)
    setCycle({ planText: planText.trim(), status: 'doing', startedAt: Date.now() })
    navigate('/pdca/do/guest')
  }

  return (
    <PlanEditor
      error={error}
      goalName={state.goal.name}
      hasCandidate={false}
      initialText=""
      isRecovery={false}
      isSubmitting={isSubmitting}
      onSubmit={handleStart}
      title="今日これやる？"
    />
  )
}

function PlanGate({ goalId }: { goalId: string }) {
  const { isSignedIn } = useCurrentUserInitialization()
  if (goalId === 'guest') return <GuestPlanPage />
  return isSignedIn ? <SignedInPlanPage goalId={goalId} /> : <Navigate replace to="/" />
}

export function PlanPage() {
  const { goalId } = useParams()

  return (
    <div className="space-y-6">
      <BackButton />
      {isClerkConfigured && goalId ? (
        <PlanGate goalId={goalId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にPLANを決められます。</p>
      )}
    </div>
  )
}
