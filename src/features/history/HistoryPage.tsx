import { Flame, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { ACT_TYPE_LABELS, CHECK_LOAD_LABELS, DO_RESULT_LABELS } from '../../../convex/lib/act'
import type { ActType, CheckLoad, DoResult } from '../../../convex/lib/act'
import { isClerkConfigured } from '../../app/AppProviders'
import { CompletionHeatmap } from '../../components/ui/CompletionHeatmap'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

function formatCompletedAt(completedAt: number, timezone: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(completedAt))
}

function SummaryStats({
  summary,
}: {
  summary: { currentStreak: number; todayCycles: number; weekCycles: number; totalCycles: number }
}) {
  const items = [
    { icon: <Flame aria-hidden="true" className="size-4 text-attention-subtle" />, label: 'Streak', value: `${summary.currentStreak}日` },
    { icon: <RotateCcw aria-hidden="true" className="size-4 text-choice-info" />, label: '今日', value: `${summary.todayCycles}周` },
    { icon: <RotateCcw aria-hidden="true" className="size-4 text-choice-info" />, label: '今週', value: `${summary.weekCycles}周` },
    { icon: <RotateCcw aria-hidden="true" className="size-4 text-choice-info" />, label: '累計', value: `${summary.totalCycles}周` },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-border-subtle py-4 text-center sm:grid-cols-4">
      {items.map((item) => (
        <div className="space-y-1" key={item.label}>
          <p className="flex items-center justify-center gap-1 text-xs text-text-subtle">
            {item.icon} {item.label}
          </p>
          <p className="text-lg font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function GoalFilterTabs({
  goals,
  selectedGoalId,
  onSelect,
}: {
  goals: Doc<'goals'>[]
  selectedGoalId: Id<'goals'> | null
  onSelect: (goalId: Id<'goals'> | null) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        aria-pressed={selectedGoalId === null}
        className={`min-h-9 shrink-0 whitespace-nowrap px-3 text-sm font-semibold ${
          selectedGoalId === null ? 'bg-primary text-white' : 'border border-border text-text-body'
        }`}
        onClick={() => onSelect(null)}
        type="button"
      >
        All
      </button>
      {goals.map((goal) => (
        <button
          aria-pressed={selectedGoalId === goal._id}
          className={`min-h-9 shrink-0 whitespace-nowrap px-3 text-sm font-semibold ${
            selectedGoalId === goal._id ? 'bg-primary text-white' : 'border border-border text-text-body'
          }`}
          key={goal._id}
          onClick={() => onSelect(goal._id)}
          type="button"
        >
          {goal.name}
        </button>
      ))}
    </div>
  )
}

function HistoryCard({
  cycle,
  goalName,
  timezone,
}: {
  cycle: Doc<'pdcaCycles'>
  goalName: string | null
  timezone: string
}) {
  return (
    <li className="space-y-2 border-b border-border-subtle py-4">
      <p className="text-sm font-bold text-primary">{goalName ?? '(削除されたGoal)'}</p>
      <div className="space-y-1 text-sm">
        <p><span className="font-semibold text-text-subtle">PLAN</span> {cycle.planText}</p>
        {cycle.doResult ? (
          <p><span className="font-semibold text-text-subtle">DO</span> {DO_RESULT_LABELS[cycle.doResult as DoResult]}</p>
        ) : null}
        {cycle.checkLoad ? (
          <p><span className="font-semibold text-text-subtle">CHECK</span> {CHECK_LOAD_LABELS[cycle.checkLoad as CheckLoad]}</p>
        ) : null}
        {cycle.actType ? (
          <p>
            <span className="font-semibold text-text-subtle">ACT</span> {ACT_TYPE_LABELS[cycle.actType as ActType]}
            {cycle.nextPlanCandidate ? `（次回候補: ${cycle.nextPlanCandidate}）` : ''}
          </p>
        ) : null}
      </div>
      {cycle.completedAt !== undefined ? (
        <p className="text-xs text-text-disabled">{formatCompletedAt(cycle.completedAt, timezone)}</p>
      ) : null}
    </li>
  )
}

function AuthenticatedHistory() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const [selectedGoalId, setSelectedGoalId] = useState<Id<'goals'> | null>(null)

  const summary = useQuery(api.history.getHistorySummary, isReady ? {} : 'skip')
  const heatmap = useQuery(api.history.getCompletionHeatmap, isReady ? {} : 'skip')
  const goals = useQuery(api.goals.listAllGoals, isReady ? {} : 'skip')
  const cycles = useQuery(
    api.history.listRecentCycles,
    isReady ? { goalId: selectedGoalId ?? undefined } : 'skip',
  )
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')

  const timezone = useMemo(() => currentUser?.timezone ?? 'UTC', [currentUser?.timezone])

  if (!isSignedIn) {
    return <SignInPrompt message="ログインすると、これまでのPDCAを振り返れます。" />
  }
  if (hasError) {
    return <LoadFailure message="履歴を読み込めませんでした。" onRetry={retry} />
  }
  if (!isReady || summary === undefined || heatmap === undefined || goals === undefined || cycles === undefined) {
    return <LoadingState label="履歴を読み込んでいます。" />
  }

  return (
    <div className="space-y-6">
      <SummaryStats summary={summary} />
      <CompletionHeatmap days={heatmap} />
      {goals.length > 0 ? (
        <GoalFilterTabs goals={goals} onSelect={setSelectedGoalId} selectedGoalId={selectedGoalId} />
      ) : null}
      {cycles.length === 0 ? (
        <EmptyState
          action={<Link className="inline-flex min-h-11 items-center justify-center bg-primary px-4 text-sm font-bold text-white" to="/">PDCAを回す</Link>}
          description="最初の一周から始めよう。"
          title="まだPDCA履歴がありません。"
        />
      ) : (
        <ul className="space-y-0">
          {cycles.map(({ cycle, goalName }) => (
            <HistoryCard cycle={cycle} goalName={goalName} key={cycle._id} timezone={timezone} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function HistoryPage() {
  return (
    <div className="space-y-6">
      <SectionHeading>履歴</SectionHeading>
      <p className="text-sm leading-6 text-text-muted">回してきたPDCAを、ここで振り返れます。</p>
      {isClerkConfigured ? (
        <AuthenticatedHistory />
      ) : (
        <p className="text-sm text-text-muted">ログイン設定の完了後に履歴を確認できます。</p>
      )}
    </div>
  )
}
