import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { GuestOnboardingFocus } from '../../components/ui/OnboardingFocusOverlay'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useGuestState } from '../../hooks/useGuestState'
import { choiceButtonClass, PRIMARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { userFacingError } from '../../lib/userFacingError'
import { getGuestOnboardingFocus } from '../../lib/guestOnboarding'
import type { GuestDoResult, GuestPdcaCycle } from '../../lib/guestStore'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// ui-spec 12.2: どの選択肢も同じCHECKへ進むため、見た目に差をつけない。
const DO_RESULTS = [
  { value: 'completed', label: 'できた' },
  { value: 'partial', label: '一部できた' },
  { value: 'notCompleted', label: 'できなかった' },
] as const

function DoBody({
  goalName,
  planText,
  isSubmitting,
  error,
  onSubmit,
  focusCheckAction = false,
}: {
  goalName: string | null
  planText: string
  isSubmitting: boolean
  error: string | null
  onSubmit: (doResult: (typeof DO_RESULTS)[number]['value']) => void
  focusCheckAction?: boolean
}) {
  // ui-spec 11.2: 実行中はアプリが邪魔をせず、CHECKへ進む操作で結果選択へ進む。
  const [isReflecting, setIsReflecting] = useState(false)
  // タップした結果をボタンの選択状態として一瞬見せてから次へ進む。
  // 即座に画面が切り替わると「選んだ実感がないまま進んだ」と感じやすいため。
  const [selected, setSelected] = useState<(typeof DO_RESULTS)[number]['value'] | null>(null)
  const showFocus = focusCheckAction && !isReflecting

  function handleSelect(value: (typeof DO_RESULTS)[number]['value']) {
    setSelected(value)
    window.setTimeout(() => onSubmit(value), 200)
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-text-subtle">{goalName}</p> : null}
        <SectionHeading>{isReflecting ? 'どうだった？' : '今日やること'}</SectionHeading>
        <p className="text-lg font-bold">{planText}</p>
        {isReflecting ? null : (
          <p className="text-sm leading-6 text-text-muted">
            終わったら戻ってきてください。
            <br />
            アプリは閉じても大丈夫です。
          </p>
        )}
      </section>

      {error ? <p className="text-sm text-attention-body">{error}</p> : null}

      <div className="space-y-3">
        {isReflecting ? (
          <>
            {DO_RESULTS.map(({ value, label }) => (
              <button
                aria-pressed={selected === value}
                className={`min-h-12 w-full px-4 text-base font-semibold ${choiceButtonClass(selected === value, 'primary')}`}
                disabled={isSubmitting || selected !== null}
                key={value}
                onClick={() => handleSelect(value)}
                type="button"
              >
                {label}
              </button>
            ))}
            {selected === null ? (
              <button
                className="text-sm font-semibold text-text-subtle underline-offset-2 hover:text-text-body hover:underline"
                onClick={() => setIsReflecting(false)}
                type="button"
              >
                戻る
              </button>
            ) : null}
          </>
        ) : (
          <button
            className={`min-h-12 w-full px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS} ${showFocus ? 'relative z-40 ring-4 ring-primary-border' : ''}`}
            id={showFocus ? 'guest-onboarding-do-check' : undefined}
            onClick={() => setIsReflecting(true)}
            type="button"
          >
            CHECKへ進む
          </button>
        )}
      </div>
      {showFocus ? (
        <GuestOnboardingFocus
          message="終わったら、ここから振り返りへ進もう"
          targetId="guest-onboarding-do-check"
        />
      ) : null}
    </div>
  )
}

function SignedInDoPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitDoResult = useMutation(api.pdca.submitDoResult)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (hasError) return <LoadFailure message="DOを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined) return <LoadingState label="DOを読み込んでいます。" />

  const { cycle, goalName } = detail
  // reload時は保存済みstatusから再開する。DOが済んでいれば先のステップへ送る。
  if (cycle.status !== 'doing') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">このPDCAはDOを記録済みです。</p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'checking' ? `/pdca/check/${cycle._id}` : `/goal/${cycle.goalId}`}
        >
          {cycle.status === 'checking' ? 'CHECKへ進む' : 'Goalへ戻る'}
        </Link>
      </div>
    )
  }

  async function handleSubmit(doResult: (typeof DO_RESULTS)[number]['value']) {
    setError(null)
    setIsSubmitting(true)
    try {
      await submitDoResult({ cycleId: cycle._id, doResult })
      navigate(`/pdca/check/${cycle._id}`)
    } catch (caughtError) {
      setError(userFacingError(caughtError, 'DO結果を保存できませんでした。もう一度試してください。'))
      setIsSubmitting(false)
    }
  }

  return (
    <DoBody
      error={error}
      goalName={goalName}
      isSubmitting={isSubmitting}
      onSubmit={(value) => void handleSubmit(value)}
      planText={cycle.planText}
    />
  )
}

function GuestDoPage() {
  const navigate = useNavigate()
  const { state, setCycle } = useGuestState()
  const cycle = state.cycle

  if (!cycle) return <Navigate replace to="/pdca/plan/guest" />
  if (cycle.status !== 'doing') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">このPDCAはDOを記録済みです。</p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'checking' ? '/pdca/check/guest' : '/'}
        >
          {cycle.status === 'checking' ? 'CHECKへ進む' : 'ホームへ戻る'}
        </Link>
      </div>
    )
  }

  // TSの制御フロー絞り込みは、この後のネストした関数(handleSubmit)まで
  // 保持されないことがあるため、絞り込み済みの型を明示した変数に置き直す。
  const activeCycle: GuestPdcaCycle = cycle
  const focusCheckAction = getGuestOnboardingFocus(state) === 'do'

  function handleSubmit(doResult: GuestDoResult) {
    setCycle({ ...activeCycle, doResult, status: 'checking' })
    navigate('/pdca/check/guest')
  }

  return (
    <DoBody
      error={null}
      goalName={state.goal?.name ?? null}
      isSubmitting={false}
      onSubmit={handleSubmit}
      planText={activeCycle.planText}
      focusCheckAction={focusCheckAction}
    />
  )
}

function DoGate({ cycleId }: { cycleId: string }) {
  const { isSignedIn } = useCurrentUserInitialization()
  if (cycleId === 'guest') return <GuestDoPage />
  return isSignedIn ? <SignedInDoPage cycleId={cycleId} /> : <Navigate replace to="/" />
}

export function DoPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <BackButton />
      {isClerkConfigured && cycleId ? (
        <DoGate cycleId={cycleId} />
      ) : (
        <p className="text-sm text-text-muted">ログイン設定の完了後にDOを記録できます。</p>
      )}
    </div>
  )
}
