import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { calculatePlayerLevel } from '../../../convex/lib/playerLevel'
import type { RankingEntry, RankingResult } from '../../../convex/ranking'
import { isClerkConfigured } from '../../app/AppProviders'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

type RankingTab = 'level' | 'week' | 'month'

const TABS: { value: RankingTab; label: string }[] = [
  { value: 'level', label: 'レベル' },
  { value: 'week', label: '週間' },
  { value: 'month', label: '月間' },
]

// docs/product-spec.md #21は「複雑なランキング」をMVP対象外候補としているが、
// ユーザーの明示的な要望で追加。ui-spec.md #24.5が禁止する「達成率」等の割合表現は
// 使わず、Lv/XP/完了回数という加算的な値のみを表示する。
function RankingValue({ tab, entry }: { tab: RankingTab; entry: RankingEntry }) {
  if (tab === 'level') {
    return (
      <span className="shrink-0 text-right text-sm font-bold text-emerald-700">
        Lv.{calculatePlayerLevel(entry.value)}
        <span className="ml-1 text-xs font-medium text-slate-400">{entry.value.toLocaleString()}XP</span>
      </span>
    )
  }
  return <span className="shrink-0 text-sm font-bold text-emerald-700">{entry.value.toLocaleString()}回</span>
}

function RankingRow({ tab, entry, highlight }: { tab: RankingTab; entry: RankingEntry; highlight: boolean }) {
  return (
    <li
      className={`flex items-center justify-between gap-3 border-b border-slate-200 px-2 py-3 ${
        highlight ? 'bg-emerald-50' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-7 shrink-0 text-right text-sm font-bold text-slate-500">{entry.rank}</span>
        <span className="truncate text-sm font-semibold">{entry.displayName}</span>
      </div>
      <RankingValue entry={entry} tab={tab} />
    </li>
  )
}

function RankingList({ tab, result }: { tab: RankingTab; result: RankingResult }) {
  if (result.top.length === 0) {
    return (
      <EmptyState
        description="最初にPDCAを完了した人がここに載ります。"
        title="まだ記録がありません。"
      />
    )
  }

  const meInTop = result.top.some((entry) => entry.userId === result.me?.userId)

  return (
    <div className="space-y-3">
      <ul className="space-y-0">
        {result.top.map((entry) => (
          <RankingRow entry={entry} highlight={entry.userId === result.me?.userId} key={entry.userId} tab={tab} />
        ))}
      </ul>
      {result.me && !meInTop ? (
        <ul className="space-y-0 border-t-2 border-dashed border-slate-300 pt-1">
          <RankingRow entry={result.me} highlight tab={tab} />
        </ul>
      ) : null}
      {result.me === null ? (
        <p className="text-sm leading-6 text-slate-500">
          この期間はまだ記録がありません。PDCAを完了するとランクインします。
        </p>
      ) : null}
    </div>
  )
}

function AuthenticatedRanking() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const [tab, setTab] = useState<RankingTab>('level')

  const levelResult = useQuery(api.ranking.getLevelRanking, isReady && tab === 'level' ? {} : 'skip')
  const periodResult = useQuery(
    api.ranking.getPeriodRanking,
    isReady && tab !== 'level' ? { period: tab as 'week' | 'month' } : 'skip',
  )

  if (!isSignedIn) return <SignInPrompt message="ログインすると、他の挑戦者とのランキングを見られます。" />
  if (hasError) return <LoadFailure message="ランキングを読み込めませんでした。" onRetry={retry} />

  const result = tab === 'level' ? levelResult : periodResult
  if (!isReady || result === undefined) return <LoadingState label="ランキングを読み込んでいます。" />

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {TABS.map(({ value, label }) => (
          <button
            aria-pressed={tab === value}
            className={`min-h-11 flex-1 px-3 text-sm font-semibold transition-colors duration-150 active:scale-[0.98] ${
              tab === value ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
            key={value}
            onClick={() => setTab(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <RankingList result={result} tab={tab} />
    </div>
  )
}

export function RankingPage() {
  return (
    <div className="space-y-6">
      <SectionHeading>ランキング</SectionHeading>
      <p className="text-sm leading-6 text-slate-600">レベル・週間・月間の3つの軸で挑戦者と積み重ねを比べられます。</p>
      {isClerkConfigured ? (
        <AuthenticatedRanking />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にランキングを確認できます。</p>
      )}
    </div>
  )
}
