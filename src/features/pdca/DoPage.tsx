import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// ui-spec 12.2: どの選択肢も同じCHECKへ進むため、見た目に差をつけない。
const DO_RESULTS = [
  { value: 'completed', label: 'できた' },
  { value: 'partial', label: '一部できた' },
  { value: 'notCompleted', label: 'できなかった' },
] as const

function AuthenticatedDoPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitDoResult = useMutation(api.pdca.submitDoResult)
  // ui-spec 11.2: 実行中はアプリが邪魔をせず、「振り返る」で結果選択へ進む。
  const [isReflecting, setIsReflecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、今日のDOを記録できます。" />
  if (hasError) return <p className="text-sm text-rose-700">DOを読み込めませんでした。</p>
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">DOを読み込んでいます。</p>

  const { cycle, goalName } = detail
  // reload時は保存済みstatusから再開する。DOが済んでいれば先のステップへ送る。
  if (cycle.status !== 'doing') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">このPDCAはDOを記録済みです。</p>
        <Link
          className="flex min-h-12 items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
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
    } catch {
      setError('DO結果を保存できませんでした。もう一度試してください。')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-slate-500">{goalName}</p> : null}
        <SectionHeading>{isReflecting ? 'どうだった？' : '今日やること'}</SectionHeading>
        <p className="text-lg font-bold">{cycle.planText}</p>
        {isReflecting ? null : (
          <p className="text-sm leading-6 text-slate-600">
            終わったら戻ってきてください。
            <br />
            アプリは閉じても大丈夫です。
          </p>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        {isReflecting ? (
          DO_RESULTS.map(({ value, label }) => (
            <button
              className="min-h-12 w-full border border-slate-300 px-4 text-base font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={isSubmitting}
              key={value}
              onClick={() => handleSubmit(value)}
              type="button"
            >
              {label}
            </button>
          ))
        ) : (
          <button
            className="min-h-12 w-full bg-emerald-700 px-4 text-base font-bold text-white"
            onClick={() => setIsReflecting(true)}
            type="button"
          >
            振り返る
          </button>
        )}
      </div>
    </div>
  )
}

export function DoPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && cycleId ? (
        <AuthenticatedDoPage cycleId={cycleId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にDOを記録できます。</p>
      )}
    </div>
  )
}
