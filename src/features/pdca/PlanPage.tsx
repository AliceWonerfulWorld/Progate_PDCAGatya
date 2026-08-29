import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 「もっと軽く」「もう少しやる」も自分で変更と同じ入力欄を開く。
// PLAN候補の自動調整文は AI PLAN生成 (T020/T021) の担当範囲。
const ADJUST_BUTTONS = [
  { label: 'もっと軽く', hint: '軽くしたPLANに書き換えてください。' },
  { label: 'もう少しやる', hint: '少し増やしたPLANに書き換えてください。' },
  { label: '自分で変更', hint: '今日やることを書いてください。' },
] as const

function AuthenticatedPlanPage({ goalId }: { goalId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const detail = useQuery(
    api.goals.getGoalDetail,
    isReady ? { goalId: goalId as Id<'goals'> } : 'skip',
  )
  const startPdcaCycle = useMutation(api.pdca.startPdcaCycle)
  const [editingHint, setEditingHint] = useState<string | null>(null)
  const [planText, setPlanText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isSignedIn) return <p className="text-sm text-slate-600">PLANを決めるにはログインしてください。</p>
  if (hasError) return <p className="text-sm text-rose-700">PLANを読み込めませんでした。</p>
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">PLANを読み込んでいます。</p>

  const { goal } = detail
  if (goal.archivedAt !== undefined) {
    return <p className="text-sm text-slate-600">アーカイブしたGoalでは新しいPDCAを始められません。</p>
  }

  const candidate = goal.nextPlanCandidate
  // 候補がない場合は ui-spec 5.4 に従い、最初から入力欄を出す。
  const isEditing = editingHint !== null || candidate === undefined
  const currentPlanText = planText ?? candidate ?? ''

  function openEditor(hint: string) {
    setPlanText(currentPlanText)
    setEditingHint(hint)
    setError(null)
  }

  async function handleStart() {
    if (!currentPlanText.trim()) {
      setError('今日やることを入力してください')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      // Cycle はここで初めて作成される（AC-PDCA-001 / AC-PDCA-002）。
      await startPdcaCycle({ goalId: goal._id, planText: currentPlanText })
      // TODO: DO画面は T008 で実装するため、確定後は一旦 Goal詳細へ戻す。
      navigate(`/goal/${goal._id}`)
    } catch {
      setError('PDCAを開始できませんでした。もう一度試してください。')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <p className="text-sm font-medium text-slate-500">{goal.name}</p>
        <SectionHeading>{isEditing ? '今日やること' : '今日これやる？'}</SectionHeading>
        {isEditing ? (
          <label className="block space-y-2" htmlFor="plan-text">
            <span className="text-sm text-slate-600">{editingHint ?? '最初にやることを決めよう。'}</span>
            <input
              autoFocus
              className="min-h-12 w-full border border-slate-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
              id="plan-text"
              maxLength={INPUT_LIMITS.planText}
              onChange={(event) => setPlanText(event.target.value)}
              placeholder="英単語を5個復習する"
              value={currentPlanText}
            />
          </label>
        ) : (
          <p className="text-lg font-bold">{currentPlanText}</p>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className="min-h-12 w-full bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isSubmitting}
          onClick={handleStart}
          type="button"
        >
          {isEditing ? 'このPLANで進む' : 'これでやる'}
        </button>
        {isEditing
          ? null
          : ADJUST_BUTTONS.map(({ label, hint }) => (
              <button
                className="min-h-12 w-full border border-slate-300 px-4 text-base font-semibold text-slate-700"
                key={label}
                onClick={() => openEditor(hint)}
                type="button"
              >
                {label}
              </button>
            ))}
      </div>
    </div>
  )
}

export function PlanPage() {
  const { goalId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      {isClerkConfigured && goalId ? (
        <AuthenticatedPlanPage goalId={goalId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にPLANを決められます。</p>
      )}
    </div>
  )
}
