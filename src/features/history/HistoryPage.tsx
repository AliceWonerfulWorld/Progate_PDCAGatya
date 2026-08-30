import { CalendarDays, ChevronRight, CircleCheck, Flame, Gauge, Infinity as InfinityIcon, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { HistoryCycleSummary } from '../../../convex/history'
import { CHECK_LOAD_LABELS, DO_RESULT_LABELS } from '../../../convex/lib/act'
import type { CheckLoad, DoResult } from '../../../convex/lib/act'
import { daysBetweenLocalDates, getLocalDateString } from '../../../convex/lib/date'
import { isClerkConfigured } from '../../app/AppProviders'
import { CompletionHeatmap } from '../../components/ui/CompletionHeatmap'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { choiceButtonClass, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const PERIODS = [
  { value: '7d', label: '7日' },
  { value: '30d', label: '30日' },
  { value: 'all', label: 'すべて' },
] as const
type HistoryPeriod = (typeof PERIODS)[number]['value']

function formatCompletedTime(completedAt: number, timezone: string): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(completedAt))
}

function historyDateLabel(completedAt: number, timezone: string): string {
  const date = getLocalDateString(completedAt, timezone)
  const today = getLocalDateString(Date.now(), timezone)
  const daysAgo = daysBetweenLocalDates(date, today)
  if (daysAgo === 0) return '今日'
  if (daysAgo === 1) return '昨日'
  const [, month, day] = date.split('-').map(Number)
  return `${month}月${day}日`
}

function StatsGrid({ summary }: { summary: { currentStreak: number; todayCycles: number; weekCycles: number; totalCycles: number } }) {
  const stats = [
    { icon: <Flame aria-hidden="true" className="size-5 text-attention-subtle" />, label: 'STREAK', value: `${summary.currentStreak}日` },
    { icon: <RotateCcw aria-hidden="true" className="size-5 text-choice-info" />, label: 'TODAY', value: `${summary.todayCycles}` },
    { icon: <CalendarDays aria-hidden="true" className="size-5 text-primary" />, label: 'THIS WEEK', value: `${summary.weekCycles}` },
    { icon: <InfinityIcon aria-hidden="true" className="size-5 text-text-muted" />, label: 'TOTAL', value: `${summary.totalCycles}` },
  ]
  return <section aria-label="継続のサマリー" className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map((stat) => <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm" key={stat.label}><div className="flex items-center gap-2">{stat.icon}<p className="text-[10px] font-black tracking-[0.12em] text-text-subtle">{stat.label}</p></div><p className="mt-3 text-2xl font-black tracking-tight text-text-strong">{stat.value}</p></div>)}</section>
}

function PeriodFilters({ period, onSelect }: { period: HistoryPeriod; onSelect: (period: HistoryPeriod) => void }) {
  return <div aria-label="表示期間" className="inline-flex rounded-full bg-surface-muted p-1" role="group">{PERIODS.map(({ value, label }) => <button aria-pressed={period === value} className={`min-h-9 rounded-full px-4 text-sm font-bold ${period === value ? 'bg-primary text-white shadow-sm' : 'text-text-muted'} transition-colors duration-(--duration-fast) ease-standard`} key={value} onClick={() => onSelect(value)} type="button">{label}</button>)}</div>
}

function GoalFilterPills({ goals, selectedGoalId, onSelect }: { goals: { _id: Id<'goals'>; name: string }[]; selectedGoalId: Id<'goals'> | null; onSelect: (goalId: Id<'goals'> | null) => void }) {
  return <div aria-label="Goalで絞り込む" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group"><button aria-pressed={selectedGoalId === null} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${choiceButtonClass(selectedGoalId === null, 'primary')}`} onClick={() => onSelect(null)} type="button">すべて</button>{goals.map((goal) => <button aria-pressed={selectedGoalId === goal._id} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${choiceButtonClass(selectedGoalId === goal._id, 'primary')}`} key={goal._id} onClick={() => onSelect(goal._id)} type="button">{goal.name}</button>)}</div>
}

function HistoryCard({ item, timezone }: { item: HistoryCycleSummary; timezone: string }) {
  const doLabel = item.doResult ? DO_RESULT_LABELS[item.doResult as DoResult] : '記録なし'
  const checkLabel = item.checkLoad ? CHECK_LOAD_LABELS[item.checkLoad as CheckLoad] : '記録なし'
  return <Link aria-label={`${item.goalName ?? 'Goal'}のPDCA詳細`} className="block rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm transition-transform duration-(--duration-fast) ease-standard active:translate-y-px active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={`/history/${item.cycleId}`}><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-sm font-black text-primary">{item.goalName ?? 'アーカイブしたGoal'}</p><p className="shrink-0 text-xs font-semibold text-text-subtle">{formatCompletedTime(item.completedAt, timezone)}</p></div><div className="mt-3 flex items-start gap-2"><CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p className="line-clamp-2 text-base font-bold leading-6 text-text-strong">{item.planText}</p></div><div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-3 py-1 text-xs font-bold text-primary-strong"><CircleCheck aria-hidden="true" className="size-3.5" />{doLabel}</span><span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-text-muted"><Gauge aria-hidden="true" className="size-3.5" />{checkLabel}</span></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3"><p className="min-w-0 truncate text-sm font-semibold text-text-muted">{item.nextPlanCandidate ? `次 → ${item.nextPlanCandidate}` : '次回PLANは未設定'}</p><ChevronRight aria-hidden="true" className="size-5 shrink-0 text-text-subtle" /></div></Link>
}

function GroupedHistoryList({ items, timezone }: { items: HistoryCycleSummary[]; timezone: string }) {
  const groups = useMemo(() => {
    const grouped = new Map<string, HistoryCycleSummary[]>()
    for (const item of items) {
      const label = historyDateLabel(item.completedAt, timezone)
      grouped.set(label, [...(grouped.get(label) ?? []), item])
    }
    return [...grouped.entries()]
  }, [items, timezone])
  return <div className="space-y-7">{groups.map(([dateLabel, cycles]) => <section aria-labelledby={`history-date-${dateLabel}`} className="space-y-3" key={dateLabel}><h2 className="px-1 text-sm font-black tracking-wide text-text-subtle" id={`history-date-${dateLabel}`}>{dateLabel}</h2><div className="space-y-3">{cycles.map((item) => <HistoryCard item={item} key={item.cycleId} timezone={timezone} />)}</div></section>)}</div>
}

function AuthenticatedHistory() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const [period, setPeriod] = useState<HistoryPeriod>('30d')
  const [selectedGoalId, setSelectedGoalId] = useState<Id<'goals'> | null>(null)
  const summary = useQuery(api.history.getHistorySummary, isReady ? {} : 'skip')
  const heatmap = useQuery(api.history.getCompletionHeatmap, isReady ? {} : 'skip')
  const goals = useQuery(api.goals.listAllGoals, isReady ? {} : 'skip')
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  const { results, status, loadMore } = usePaginatedQuery(api.history.listCycles, isReady ? { goalId: selectedGoalId ?? undefined, period } : 'skip', { initialNumItems: 20 })
  const timezone = currentUser?.timezone ?? 'UTC'
  if (!isSignedIn) return <SignInPrompt message="ログインすると、これまでのPDCAを振り返れます。" />
  if (hasError) return <LoadFailure message="履歴を読み込めませんでした。" onRetry={retry} />
  if (!isReady || summary === undefined || heatmap === undefined || goals === undefined || currentUser === undefined || status === 'LoadingFirstPage') return <LoadingState label="履歴を読み込んでいます。" />
  const hasItems = results.length > 0
  return <div className="space-y-7"><StatsGrid summary={summary} /><section className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[0.14em] text-primary">CONTINUITY CALENDAR</p><h2 className="mt-1 text-lg font-black text-text-strong">継続カレンダー</h2></div><p className="text-xs font-semibold text-text-subtle">直近12週間</p></div><CompletionHeatmap days={heatmap} /></section><section className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black tracking-[0.14em] text-primary">YOUR CYCLES</p><h2 className="mt-1 text-lg font-black text-text-strong">これまでのPDCA</h2></div><PeriodFilters onSelect={setPeriod} period={period} /></div>{goals.length > 0 ? <GoalFilterPills goals={goals} onSelect={setSelectedGoalId} selectedGoalId={selectedGoalId} /> : null}</section>{!hasItems ? <EmptyState action={<Link className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white ${PRIMARY_BUTTON_CLASS}`} to="/">PDCAを回す</Link>} description="最初の一周から、あなたの積み重ねがここに残ります。" title="まだPDCA履歴がありません。" /> : <><GroupedHistoryList items={results} timezone={timezone} />{status === 'CanLoadMore' ? <button className={`min-h-12 w-full rounded-2xl px-4 text-sm font-bold ${SECONDARY_BUTTON_CLASS}`} onClick={() => loadMore(20)} type="button">さらに読み込む</button> : null}{status === 'LoadingMore' ? <LoadingState label="さらに読み込んでいます。" /> : null}</>}</div>
}

export function HistoryPage() {
  return <div className="space-y-6"><SectionHeading>履歴</SectionHeading><p className="text-sm leading-6 text-text-muted">積み重ねた一周を、いつでも振り返れます。</p>{isClerkConfigured ? <AuthenticatedHistory /> : <p className="text-sm text-text-muted">ログイン設定の完了後に履歴を確認できます。</p>}</div>
}
