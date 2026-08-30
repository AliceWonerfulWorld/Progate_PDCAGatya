import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Lightbulb, ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ACT_TYPE_LABELS, CHECK_LOAD_LABELS, DO_RESULT_LABELS } from '../../../convex/lib/act'
import type { ActType, CheckLoad, DoResult } from '../../../convex/lib/act'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

function formatCompletedAt(completedAt: number, timezone: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(completedAt))
}

const CHECK_REASON_LABELS = {
  noTime: '時間がなかった',
  tooLarge: 'タスクが大きすぎた',
  tooDifficult: '難しかった',
  noFocus: '集中できなかった',
  noMotivation: 'やる気が出なかった',
  other: 'その他',
} as const

function DetailSection({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm"><div className="flex items-center gap-2 text-primary">{icon}<h2 className="text-xs font-black tracking-[0.14em]">{label}</h2></div><div className="mt-3 text-base leading-7 text-text-body">{children}</div></section>
}

function AuthenticatedHistoryDetail({ cycleId }: { cycleId: Id<'pdcaCycles'> }) {
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const detail = useQuery(api.pdca.getCycle, isReady ? { cycleId } : 'skip')
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  if (hasError) return <LoadFailure message="PDCAの詳細を読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined || currentUser === undefined) return <LoadingState label="PDCAの詳細を読み込んでいます。" />
  if (detail.cycle.status !== 'completed' || detail.cycle.completedAt === undefined) return <Navigate replace to="/history" />

  const { cycle, goalName } = detail
  const completedAt = cycle.completedAt ?? 0
  return <div className="space-y-5"><section className="rounded-3xl border border-primary-border bg-primary-subtle p-5"><p className="text-sm font-black text-primary">{goalName ?? 'アーカイブしたGoal'}</p><SectionHeading>{cycle.planText}</SectionHeading><p className="mt-3 flex items-center gap-2 text-sm font-semibold text-text-muted"><CalendarDays aria-hidden="true" className="size-4" />{formatCompletedAt(completedAt, currentUser.timezone)}</p></section><DetailSection icon={<CheckCircle2 aria-hidden="true" className="size-4" />} label="PLAN"><p className="font-bold text-text-strong">{cycle.planText}</p></DetailSection><DetailSection icon={<ListChecks aria-hidden="true" className="size-4" />} label="DO"><p className="font-bold text-text-strong">{cycle.doResult ? DO_RESULT_LABELS[cycle.doResult as DoResult] : '記録なし'}</p></DetailSection><DetailSection icon={<ClipboardCheck aria-hidden="true" className="size-4" />} label="CHECK"><p className="font-bold text-text-strong">{cycle.checkLoad ? CHECK_LOAD_LABELS[cycle.checkLoad as CheckLoad] : '記録なし'}</p>{cycle.checkReason ? <p className="mt-2 text-sm text-text-muted">理由：{CHECK_REASON_LABELS[cycle.checkReason]}</p> : null}{cycle.checkMemo ? <p className="mt-3 rounded-xl bg-surface-muted p-3 text-sm leading-6 text-text-body">{cycle.checkMemo}</p> : null}</DetailSection><DetailSection icon={<Lightbulb aria-hidden="true" className="size-4" />} label="ACT"><p className="font-bold text-text-strong">{cycle.actType ? ACT_TYPE_LABELS[cycle.actType as ActType] : '記録なし'}</p><div className="mt-4 border-t border-border-subtle pt-4"><p className="text-xs font-black tracking-[0.12em] text-text-subtle">次回PLAN</p><p className="mt-1 font-bold text-text-strong">{cycle.nextPlanCandidate ?? '未設定'}</p></div></DetailSection><Link className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-bold text-text-body" to="/history">履歴一覧へ戻る <ArrowRight aria-hidden="true" className="size-4" /></Link></div>
}

export function HistoryDetailPage() {
  const { cycleId } = useParams()
  if (!isClerkConfigured || !cycleId) return <Navigate replace to="/history" />
  return <div className="space-y-6"><BackButton /><AuthenticatedHistoryDetail cycleId={cycleId as Id<'pdcaCycles'>} /></div>
}
