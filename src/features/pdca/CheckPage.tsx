import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
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

// ui-spec 13.2: 重かった / できなかった場合のみ原因を深掘りする。
function needsReason(checkLoad: CheckLoad, doResult: string | undefined): boolean {
  return checkLoad === 'slightlyHeavy' || checkLoad === 'tooHeavy' || doResult === 'notCompleted'
}

function AuthenticatedCheckPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitCheck = useMutation(api.pdca.submitCheck)
  const [checkLoad, setCheckLoad] = useState<CheckLoad | null>(null)
  const [checkReason, setCheckReason] = useState<CheckReason | null>(null)
  const [checkMemo, setCheckMemo] = useState('')
  const [isMemoOpen, setIsMemoOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、CHECKを記録できます。" />
  if (hasError) return <p className="text-sm text-rose-700">CHECKを読み込めませんでした。</p>
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">CHECKを読み込んでいます。</p>

  const { cycle, goalName } = detail
  if (cycle.status !== 'checking') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {cycle.status === 'doing' ? 'まずDOの結果を記録してください。' : 'このPDCAはCHECKを記録済みです。'}
        </p>
        <Link
          className="flex min-h-12 items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
          to={cycle.status === 'doing' ? `/pdca/do/${cycle._id}` : `/goal/${cycle.goalId}`}
        >
          {cycle.status === 'doing' ? 'DOへ戻る' : 'Goalへ戻る'}
        </Link>
      </div>
    )
  }

  async function handleSubmit() {
    if (checkLoad === null) return

    setError(null)
    setIsSubmitting(true)
    try {
      await submitCheck({
        cycleId: cycle._id,
        checkLoad,
        // Reason / Memo は未入力のままでも進める。
        checkReason: checkReason ?? undefined,
        checkMemo: checkMemo.trim() || undefined,
      })
      // TODO: ACT画面は T010 で実装するため、確定後は一旦 Goal詳細へ戻す。
      navigate(`/goal/${cycle.goalId}`)
    } catch {
      setError('CHECKを保存できませんでした。もう一度試してください。')
      setIsSubmitting(false)
    }
  }

  const showReason = checkLoad !== null && needsReason(checkLoad, cycle.doResult)

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-slate-500">{goalName}</p> : null}
        <SectionHeading>今回どうだった？</SectionHeading>
        <p className="text-sm text-slate-600">{cycle.planText}</p>
      </section>

      <div className="space-y-3">
        {CHECK_LOADS.map(({ value, label }) => (
          <button
            aria-pressed={checkLoad === value}
            className={`min-h-12 w-full border px-4 text-base font-semibold ${
              checkLoad === value
                ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 text-slate-700'
            }`}
            key={value}
            onClick={() => {
              setCheckLoad(value)
              // 深掘りが不要になった選択では原因をリセットする。
              if (!needsReason(value, cycle.doResult)) setCheckReason(null)
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {showReason ? (
        <section className="space-y-3">
          <h2 className="text-base font-bold">何が原因だった？</h2>
          <p className="text-sm text-slate-600">選ばなくても次へ進めます。</p>
          <div className="space-y-3">
            {CHECK_REASONS.map(({ value, label }) => (
              <button
                aria-pressed={checkReason === value}
                className={`min-h-12 w-full border px-4 text-base font-semibold ${
                  checkReason === value
                    ? 'border-sky-600 bg-sky-50 text-sky-800'
                    : 'border-slate-300 text-slate-700'
                }`}
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
          <span className="text-sm text-slate-600">メモ（任意）</span>
          <textarea
            className="min-h-24 w-full border border-slate-300 bg-white p-3 text-base outline-none focus:border-emerald-700"
            id="check-memo"
            maxLength={INPUT_LIMITS.checkMemo}
            onChange={(event) => setCheckMemo(event.target.value)}
            value={checkMemo}
          />
        </label>
      ) : (
        <button
          className="min-h-11 text-sm font-semibold text-slate-600"
          onClick={() => setIsMemoOpen(true)}
          type="button"
        >
          + メモを追加
        </button>
      )}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        className="min-h-12 w-full bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={checkLoad === null || isSubmitting}
        onClick={handleSubmit}
        type="button"
      >
        次へ
      </button>
    </div>
  )
}

export function CheckPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && cycleId ? (
        <AuthenticatedCheckPage cycleId={cycleId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にCHECKを記録できます。</p>
      )}
    </div>
  )
}
