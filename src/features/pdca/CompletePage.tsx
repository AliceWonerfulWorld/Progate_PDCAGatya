import { CheckCircle2, Flame, RotateCcw, Sparkles, Star, Ticket } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import type { CompletePdcaCycleResult } from '../../../convex/pdca'
import { SectionHeading } from '../../components/ui/SectionHeading'

interface CompleteLocationState {
  result: CompletePdcaCycleResult
  goalId: string
  isRecovery?: boolean
}

function isCompleteLocationState(value: unknown): value is CompleteLocationState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return typeof state.goalId === 'string' && typeof state.result === 'object' && state.result !== null
}

// docs/ui-spec.md #15-16 (PDCA COMPLETE画面 / Player Level Up Overlay)。
// completePdcaCycle の結果はMutationの戻り値をそのままrouter stateで受け取る。
// reload等でstateが失われた場合はHomeへ戻す（履歴からは復元しない）。
export function CompletePage() {
  const location = useLocation()

  if (!isCompleteLocationState(location.state)) {
    return <Navigate replace to="/" />
  }

  const { result, goalId, isRecovery } = location.state
  // docs/ui-spec.md #31 (Recovery Complete)。救済が成立した(streakUpdated)場合のみ
  // 専用の表現にする。救済されなかった場合(既に期限切れ等)は通常表示のまま。
  const isRecoveredCompletion = isRecovery === true && result.streakUpdated

  return (
    <div className="space-y-8 text-center">
      <section className="space-y-3">
        <p className="text-sm font-medium text-emerald-700">
          {isRecoveredCompletion ? 'STREAK RECOVERED!' : 'PDCA COMPLETE!'}
        </p>
        <SectionHeading>
          {isRecoveredCompletion ? 'ストリークを取り戻せたね。' : '今日も1周、できたね。'}
        </SectionHeading>
      </section>

      <ul className="space-y-3 border-y border-slate-200 py-6 text-left">
        <li className="flex items-center gap-3 text-base font-semibold">
          <RotateCcw aria-hidden="true" className="size-5 text-sky-600" /> +1周
        </li>
        <li className="flex items-center gap-3 text-base font-semibold">
          <Star aria-hidden="true" className="size-5 text-amber-500" /> Player XP +{result.gainedXp}
        </li>
        <li className="flex items-center gap-3 text-base font-semibold">
          <Ticket aria-hidden="true" className="size-5 text-violet-600" /> ガチャ +{result.gachaDrawsAdded}
        </li>
        {result.dailyMissionCompleted && result.dailyMissionXp > 0 ? (
          <li className="flex items-center gap-3 text-base font-semibold text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-5" /> 今日のチャレンジ達成 Player XP +
            {result.dailyMissionXp}
          </li>
        ) : null}
      </ul>

      {isRecoveredCompletion ? (
        <p className="flex items-center justify-center gap-2 text-base font-bold text-rose-600">
          <Flame aria-hidden="true" className="size-5" /> {result.currentStreak}日ストリークを維持しました
        </p>
      ) : result.streakUpdated ? (
        <p className="flex items-center justify-center gap-2 text-base font-bold text-rose-600">
          <Flame aria-hidden="true" className="size-5" /> 今日のストリーク達成！({result.currentStreak}日)
        </p>
      ) : null}

      {result.levelUp ? (
        <section className="space-y-2 bg-emerald-50 px-4 py-6">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
            <Sparkles aria-hidden="true" className="size-4" /> PLAYER LEVEL UP!
          </p>
          <p className="text-2xl font-bold text-emerald-800">
            Lv.{result.previousLevel} → Lv.{result.newLevel}
          </p>
        </section>
      ) : null}

      <div className="space-y-3">
        {/* TODO(#18): drawGacha実装後、ガチャ演出画面へ遷移させる。 */}
        <Link
          className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
          to={`/goal/${goalId}`}
        >
          ガチャを回す
        </Link>
        <Link
          className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
          to={`/goal/${goalId}`}
        >
          あとで
        </Link>
      </div>
    </div>
  )
}
