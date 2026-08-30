import { Minus, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { adjustPlanText, type PlanAdjustDirection } from '../../../convex/lib/planAdjust'
import { resolveNextPlanFallback } from '../../../convex/lib/planFallback'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { GuestOnboardingFocus } from '../../components/ui/OnboardingFocusOverlay'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useGuestState } from '../../hooks/useGuestState'
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { userFacingError } from '../../lib/userFacingError'
import { getGuestOnboardingFocus } from '../../lib/guestOnboarding'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

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
  focusNextAction = false,
}: {
  title: string
  goalName: string
  isRecovery: boolean
  initialText: string
  hasCandidate: boolean
  isSubmitting: boolean
  error: string | null
  onSubmit: (text: string) => void
  focusNextAction?: boolean
}) {
  const [text, setText] = useState(initialText)
  const [isEditing, setIsEditing] = useState(!hasCandidate)

  function applyAdjustment(direction: PlanAdjustDirection) {
    setText((current) => adjustPlanText(current, direction))
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <p className="text-sm font-medium text-text-subtle">{goalName}</p>
        {isRecovery ? <p className="text-sm font-bold text-attention">リカバリー</p> : null}
        <SectionHeading>{isEditing ? '今日やること' : title}</SectionHeading>
        {isEditing && hasCandidate ? (
          <button
            className="text-sm font-semibold text-text-subtle underline-offset-2 hover:text-text-body hover:underline"
            onClick={() => setIsEditing(false)}
            type="button"
          >
            候補の選択に戻る
          </button>
        ) : null}
        {isEditing ? (
          <label className="block space-y-2" htmlFor="plan-text">
            <span className="text-sm text-text-muted">
              {hasCandidate ? '今日やることを書いてください。' : '最初にやることを決めよう。'}
            </span>
            <input
              autoFocus
              className="min-h-12 w-full border border-border bg-surface px-3 text-base outline-none focus:border-primary"
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

      {error ? <p className="text-sm text-attention-body">{error}</p> : null}

      <div className="space-y-3">
        <button
          className={`min-h-12 w-full px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS} ${focusNextAction ? 'relative z-40 ring-4 ring-primary-border' : ''}`}
          disabled={isSubmitting}
          id={focusNextAction ? 'guest-onboarding-plan-confirm' : undefined}
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
      {focusNextAction ? (
        <GuestOnboardingFocus
          message="まずはこの小さなPLANで始めてみよう"
          targetId="guest-onboarding-plan-confirm"
        />
      ) : null}
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
  const activeCycle = useQuery(api.pdca.getActiveCycle, isReady ? {} : 'skip')
  const startPdcaCycle = useMutation(api.pdca.startPdcaCycle)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (hasError) return <LoadFailure message="PLANを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined || activeCycle === undefined) return <LoadingState label="PLANを読み込んでいます。" />
  if (activeCycle !== null) return <Navigate replace to="/" />

  const { goal } = detail
  if (goal.archivedAt !== undefined) {
    return <p className="text-sm text-text-muted">アーカイブしたGoalでは新しいPDCAを始められません。</p>
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
    } catch (caughtError) {
      setError(
        isRecovery
          ? userFacingError(caughtError, 'リカバリーを開始できませんでした。すでに利用済みか、対象外の可能性があります。')
          : userFacingError(caughtError, 'PDCAを開始できませんでした。もう一度試してください。'),
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
  if (cycle && cycle.status !== 'completed' && cycle.status !== 'cancelled' && !isSubmitting) {
    // DOから戻った場合は、同じ画面へ押し戻さずHomeの再開カードへ誘導する。
    // ログイン済みのPLAN画面と同じく、進行中Cycleを1か所で再開できる。
    return <Navigate replace to="/" />
  }

  // 初回はAI待ちで止めず、既存の共有フォールバックで小さな候補を出す。
  // 完了済みCycleがある場合はACTで決めた次回候補を優先する。
  const initialText = cycle?.nextPlanCandidate ?? resolveNextPlanFallback({
    mode: 'initial',
    goalName: state.goal.name,
  })
  const focusNextAction = getGuestOnboardingFocus(state) === 'plan'

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
      hasCandidate={true}
      initialText={initialText}
      isRecovery={false}
      isSubmitting={isSubmitting}
      onSubmit={handleStart}
      title={cycle ? '今日これやる？' : '最初の一周を回してみよう'}
      focusNextAction={focusNextAction}
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
        <p className="text-sm text-text-muted">ログイン設定の完了後にPLANを決められます。</p>
      )}
    </div>
  )
}
