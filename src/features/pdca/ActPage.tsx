import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { recommendActType } from '../../../convex/lib/act'
import type { ActType, CheckLoad, DoResult } from '../../../convex/lib/act'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const ACT_TYPES = [
  { value: 'lighter', label: '少し軽くする' },
  { value: 'same', label: 'そのまま' },
  { value: 'heavier', label: '少し増やす' },
  { value: 'changeApproach', label: 'やり方を変える' },
] as const satisfies readonly { value: ActType; label: string }[]

function AuthenticatedActPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitAct = useMutation(api.pdca.submitAct)
  const completePdcaCycle = useMutation(api.pdca.completePdcaCycle)
  const [actType, setActType] = useState<ActType | null>(null)
  const [nextPlanCandidate, setNextPlanCandidate] = useState<string | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、次回の方針を決められます。" />
  if (hasError) return <p className="text-sm text-rose-700">ACTを読み込めませんでした。</p>
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">ACTを読み込んでいます。</p>

  const { cycle, goalName } = detail
  if (cycle.status !== 'acting') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {cycle.status === 'checking' ? 'まずCHECKを記録してください。' : 'このPDCAはACTを記録済みです。'}
        </p>
        <Link
          className="flex min-h-12 items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
          to={cycle.status === 'checking' ? `/pdca/check/${cycle._id}` : `/goal/${cycle.goalId}`}
        >
          {cycle.status === 'checking' ? 'CHECKへ戻る' : 'Goalへ戻る'}
        </Link>
      </div>
    )
  }

  // reload時は保存済みACTを初期値にする。未保存なら CHECK からの推奨を選択状態にする。
  const recommended = recommendActType(
    (cycle.checkLoad ?? 'justRight') as CheckLoad,
    cycle.doResult as DoResult | undefined,
  )
  const selectedActType = actType ?? (cycle.actType as ActType | undefined) ?? recommended
  const currentCandidate = nextPlanCandidate ?? cycle.nextPlanCandidate ?? cycle.planText

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)
    try {
      await submitAct({
        cycleId: cycle._id,
        actType: selectedActType,
        nextPlanCandidate: currentCandidate.trim() || undefined,
      })
      const result = await completePdcaCycle({ cycleId: cycle._id })
      navigate(`/pdca/complete/${cycle._id}`, {
        state: { result, goalId: cycle.goalId, isRecovery: cycle.isRecovery },
      })
    } catch {
      setError('ACTを保存できませんでした。もう一度試してください。')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-slate-500">{goalName}</p> : null}
        <SectionHeading>次はどうする？</SectionHeading>
      </section>

      <div className="space-y-3">
        {ACT_TYPES.map(({ value, label }) => (
          <button
            aria-pressed={selectedActType === value}
            className={`min-h-12 w-full border px-4 text-left text-base font-semibold ${
              selectedActType === value
                ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 text-slate-700'
            }`}
            key={value}
            onClick={() => setActType(value)}
            type="button"
          >
            {label}
            {value === recommended ? (
              <span className="ml-2 text-xs font-bold text-emerald-700">おすすめ</span>
            ) : null}
          </button>
        ))}
      </div>

      <section className="space-y-2 border-y border-slate-200 py-5">
        <p className="text-sm font-medium text-slate-500">次回候補</p>
        {isAdjusting ? (
          <label className="block space-y-2" htmlFor="next-plan-candidate">
            <span className="sr-only">次回候補</span>
            <input
              autoFocus
              className="min-h-12 w-full border border-slate-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
              id="next-plan-candidate"
              maxLength={INPUT_LIMITS.nextPlanCandidate}
              onChange={(event) => setNextPlanCandidate(event.target.value)}
              placeholder="英単語を5個復習する"
              value={currentCandidate}
            />
          </label>
        ) : (
          <p className="text-base font-bold">{currentCandidate}</p>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className="min-h-12 w-full bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isSubmitting}
          onClick={handleSubmit}
          type="button"
        >
          これでいく
        </button>
        {isAdjusting ? null : (
          <button
            className="min-h-12 w-full border border-slate-300 px-4 text-base font-semibold text-slate-700"
            onClick={() => {
              setNextPlanCandidate(currentCandidate)
              setIsAdjusting(true)
            }}
            type="button"
          >
            調整する
          </button>
        )}
      </div>
    </div>
  )
}

export function ActPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && cycleId ? (
        <AuthenticatedActPage cycleId={cycleId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にACTを記録できます。</p>
      )}
    </div>
  )
}
