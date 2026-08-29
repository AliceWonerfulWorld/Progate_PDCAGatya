import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { INPUT_LIMITS } from '../../../convex/lib/constants'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { isClerkConfigured } from '../../app/AppProviders'
import { useCurrentUserInitialization } from './useCurrentUserInitialization'

function AuthenticatedCreateGoalPage() {
  const navigate = useNavigate()
  const createGoal = useMutation(api.goals.createGoal)
  const { isReady, isSignedIn, hasError } = useCurrentUserInitialization()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('続けたいことを入力してください')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const goalId = await createGoal({ name })
      navigate(`/goal/${goalId}`)
    } catch {
      setError('Goalを作成できませんでした。もう一度試してください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isSignedIn) {
    return <p className="text-sm text-slate-600">Goalを作成するにはログインしてください。</p>
  }
  if (hasError) {
    return <p className="text-sm text-rose-700">準備に失敗しました。もう一度試してください。</p>
  }
  if (!isReady) {
    return <p className="text-sm text-slate-600">準備しています。</p>
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <label className="block space-y-2" htmlFor="goal-name">
        <span className="text-base font-bold">何を続けたい？</span>
        <input
          autoFocus
          className="min-h-12 w-full border border-slate-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
          id="goal-name"
          maxLength={INPUT_LIMITS.goalName}
          onChange={(event) => setName(event.target.value)}
          placeholder="英語学習"
          value={name}
        />
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        className="min-h-12 w-full bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={isSubmitting}
        type="submit"
      >
        作成する
      </button>
    </form>
  )
}

export function CreateGoalPage() {
  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600" to="/">
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      <SectionHeading>Goalを作る</SectionHeading>
      {isClerkConfigured ? (
        <AuthenticatedCreateGoalPage />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にGoalを作成できます。</p>
      )}
    </div>
  )
}
