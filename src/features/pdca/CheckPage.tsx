import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { CheckAckAnimation, type CheckAckTone } from '../../components/ui/CheckAckAnimation'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useGuestState } from '../../hooks/useGuestState'
import { choiceButtonClass, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { userFacingError } from '../../lib/userFacingError'
import type { GuestCheckLoad, GuestCheckReason, GuestPdcaCycle } from '../../lib/guestStore'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// ui-spec 13.1: 最短1タップでCHECKを終えられる。
const CHECK_LOADS = [
  { value: 'easy', label: '余裕だった' },
  { value: 'justRight', label: 'ちょうどよかった' },
  { value: 'slightlyHeavy', label: '少し重かった' },
  { value: 'tooHeavy', label: 'かなり重かった' },
] as const

const CHECK_REASONS = [
  { value: 'noTime', label: '時間がなかった' },
  { value: 'tooLarge', label: 'タスクが大きすぎた' },
  { value: 'tooDifficult', label: '難しかった' },
  { value: 'noFocus', label: '集中できなかった' },
  { value: 'noMotivation', label: 'やる気が出なかった' },
  { value: 'other', label: 'その他' },
] as const

type CheckLoad = (typeof CHECK_LOADS)[number]['value']
type CheckReason = (typeof CHECK_REASONS)[number]['value']

export interface CheckSubmission {
  checkLoad: CheckLoad
  checkReason: CheckReason | undefined
  checkMemo: string | undefined
}

// ui-spec 13.2: 重かった / できなかった場合のみ原因を深掘りする。
function needsReason(checkLoad: CheckLoad, doResult: string | undefined): boolean {
  return checkLoad === 'slightlyHeavy' || checkLoad === 'tooHeavy' || doResult === 'notCompleted'
}

// 演出(check-ack.riv)の尺。これを待ってから送信・遷移する。
const ACK_DURATION_MS = 150

// ui-spec 13.4 / #57: 重かった・できなかった選択に肯定的な演出を返すと
// 非難でなくとも温度がずれる。同じ「記録した」意味のまま、跳ねを消して静かに出す。
export function ackTone(checkLoad: CheckLoad, doResult: string | undefined): CheckAckTone {
  return needsReason(checkLoad, doResult) ? 'quiet' : 'light'
}

function CheckBody({
  goalName,
  planText,
  doResult,
  isSubmitting,
  error,
  onSubmit,
}: {
  goalName: string | null
  planText: string
  doResult: string | undefined
  isSubmitting: boolean
  error: string | null
  onSubmit: (submission: CheckSubmission) => void
}) {
  const [checkLoad, setCheckLoad] = useState<CheckLoad | null>(null)
  const [checkReason, setCheckReason] = useState<CheckReason | null>(null)
  const [checkMemo, setCheckMemo] = useState('')
  const [isMemoOpen, setIsMemoOpen] = useState(false)
  // 深掘り不要な選択は即送信されるが、押した瞬間に画面が切り替わると選んだ
  // 実感がないまま進んだように見える。選択状態を一瞬見せてから送信する。
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  // 送信のたびに増やして再生をトリガーする。トーンは選択内容から決める。
  const [ackPlayKey, setAckPlayKey] = useState<number | null>(null)
  const [ackToneState, setAckTone] = useState<CheckAckTone>('light')

  function submit(load: CheckLoad, reason: CheckReason | null) {
    // 自動送信・「次へ」どちらの経路でも同じ位置で鳴らす。
    // onSubmitは画面遷移を伴うため、同じ更新にまとめるとCheckBodyが
    // 先にアンマウントされ、演出が1フレームも描かれない。
    // 演出を先に確定させてから、次のtickで送信する。
    setAckTone(ackTone(load, doResult))
    setAckPlayKey((key) => (key ?? 0) + 1)
    window.setTimeout(() => {
      onSubmit({
        checkLoad: load,
        checkReason: reason ?? undefined,
        checkMemo: checkMemo.trim() || undefined,
      })
    }, ACK_DURATION_MS)
  }

  function selectLoad(value: CheckLoad) {
    if (isAutoAdvancing) return
    setCheckLoad(value)
    if (!needsReason(value, doResult)) {
      setCheckReason(null)
      // ui-spec 13.1: 深掘り不要 かつ メモを書いていなければ、選んだ瞬間に
      // 1タップでCHECKを完了できる。メモを書き始めている間は自動送信しない。
      if (!isMemoOpen) {
        setIsAutoAdvancing(true)
        window.setTimeout(() => submit(value, null), 60)
        return
      }
    }
  }

  const showReason = checkLoad !== null && needsReason(checkLoad, doResult)

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-text-subtle">{goalName}</p> : null}
        <SectionHeading>今回どうだった？</SectionHeading>
        <p className="text-sm text-text-muted">{planText}</p>
      </section>

      <div className="space-y-3">
        {CHECK_LOADS.map(({ value, label }) => (
          // 演出は「いま押したボタン」の上に重ねる。中央に固定すると
          // 選んでいない選択肢を隠してしまい、押した実感につながらない。
          <div className="relative" key={value}>
            <button
              aria-pressed={checkLoad === value}
              className={`min-h-12 w-full px-4 text-base font-semibold ${choiceButtonClass(checkLoad === value, 'primary')}`}
              disabled={isSubmitting || isAutoAdvancing}
              onClick={() => selectLoad(value)}
              type="button"
            >
              {label}
            </button>
            {checkLoad === value ? (
              <CheckAckAnimation playKey={ackPlayKey} tone={ackToneState} />
            ) : null}
          </div>
        ))}
      </div>

      {showReason ? (
        <section className="space-y-3">
          <h2 className="text-base font-bold">何が原因だった？</h2>
          <p className="text-sm text-text-muted">選ばなくても次へ進めます。</p>
          <div className="space-y-3">
            {CHECK_REASONS.map(({ value, label }) => (
              <button
                aria-pressed={checkReason === value}
                className={`min-h-12 w-full px-4 text-base font-semibold ${choiceButtonClass(checkReason === value, 'info')}`}
                disabled={isSubmitting}
                key={value}
                onClick={() => setCheckReason(checkReason === value ? null : value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {isMemoOpen ? (
        <label className="block space-y-2" htmlFor="check-memo">
          <span className="text-sm text-text-muted">メモ（任意）</span>
          <textarea
            className="min-h-24 w-full border border-border bg-surface p-3 text-base outline-none focus:border-primary"
            id="check-memo"
            maxLength={INPUT_LIMITS.checkMemo}
            onChange={(event) => setCheckMemo(event.target.value)}
            value={checkMemo}
          />
        </label>
      ) : (
        <button
          className={`min-h-11 px-2 text-sm font-semibold text-text-muted ${SECONDARY_BUTTON_CLASS} border-none`}
          onClick={() => setIsMemoOpen(true)}
          type="button"
        >
          + メモを追加
        </button>
      )}

      {error ? <p className="text-sm text-attention-body">{error}</p> : null}

      {showReason || isMemoOpen ? (
        <button
          className={`min-h-12 w-full px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          disabled={checkLoad === null || isSubmitting}
          onClick={() => checkLoad !== null && submit(checkLoad, checkReason)}
          type="button"
        >
          次へ
        </button>
      ) : null}
    </div>
  )
}

function SignedInCheckPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitCheck = useMutation(api.pdca.submitCheck)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (hasError) return <LoadFailure message="CHECKを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined) return <LoadingState label="CHECKを読み込んでいます。" />

  const { cycle, goalName } = detail
  if (cycle.status !== 'checking') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          {cycle.status === 'doing' ? 'まずDOの結果を記録してください。' : 'このPDCAはCHECKを記録済みです。'}
        </p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'doing' ? `/pdca/do/${cycle._id}` : cycle.status === 'acting' ? `/pdca/act/${cycle._id}` : `/goal/${cycle.goalId}`}
        >
          {cycle.status === 'doing' ? 'DOへ戻る' : cycle.status === 'acting' ? 'ACTへ進む' : 'Goalへ戻る'}
        </Link>
      </div>
    )
  }

  async function handleSubmit(submission: CheckSubmission) {
    setError(null)
    setIsSubmitting(true)
    try {
      await submitCheck({ cycleId: cycle._id, ...submission })
      navigate(`/pdca/act/${cycle._id}`)
    } catch (caughtError) {
      setError(userFacingError(caughtError, 'CHECKを保存できませんでした。もう一度試してください。'))
      setIsSubmitting(false)
    }
  }

  return (
    <CheckBody
      doResult={cycle.doResult}
      error={error}
      goalName={goalName}
      isSubmitting={isSubmitting}
      onSubmit={(submission) => void handleSubmit(submission)}
      planText={cycle.planText}
    />
  )
}

function GuestCheckPage() {
  const navigate = useNavigate()
  const { state, setCycle } = useGuestState()
  const cycle = state.cycle

  if (!cycle) return <Navigate replace to="/pdca/plan/guest" />
  if (cycle.status !== 'checking') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          {cycle.status === 'doing' ? 'まずDOの結果を記録してください。' : 'このPDCAはCHECKを記録済みです。'}
        </p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'doing' ? '/pdca/do/guest' : cycle.status === 'acting' ? '/pdca/act/guest' : '/'}
        >
          {cycle.status === 'doing' ? 'DOへ戻る' : cycle.status === 'acting' ? 'ACTへ進む' : 'ホームへ戻る'}
        </Link>
      </div>
    )
  }

  const activeCycle: GuestPdcaCycle = cycle

  function handleSubmit(submission: CheckSubmission) {
    setCycle({
      ...activeCycle,
      checkLoad: submission.checkLoad as GuestCheckLoad,
      checkReason: submission.checkReason as GuestCheckReason | undefined,
      checkMemo: submission.checkMemo,
      status: 'acting',
    })
    navigate('/pdca/act/guest')
  }

  return (
    <CheckBody
      doResult={activeCycle.doResult}
      error={null}
      goalName={state.goal?.name ?? null}
      isSubmitting={false}
      onSubmit={handleSubmit}
      planText={activeCycle.planText}
    />
  )
}

function CheckGate({ cycleId }: { cycleId: string }) {
  const { isSignedIn } = useCurrentUserInitialization()
  if (cycleId === 'guest') return <GuestCheckPage />
  return isSignedIn ? <SignedInCheckPage cycleId={cycleId} /> : <Navigate replace to="/" />
}

export function CheckPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <BackButton />
      {isClerkConfigured && cycleId ? (
        <CheckGate cycleId={cycleId} />
      ) : (
        <p className="text-sm text-text-muted">ログイン設定の完了後にCHECKを記録できます。</p>
      )}
    </div>
  )
}
