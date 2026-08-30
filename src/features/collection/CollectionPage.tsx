import { BookOpen, LockKeyhole, Sparkles, Star, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import type { CharacterRarity } from '../../../convex/lib/constants'
import type { CollectionEntry } from '../../../convex/characters'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { choiceButtonClass } from '../../lib/buttonStyles'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const RARITY_FILTERS = ['All', 'R', 'SR', 'SSR'] as const
type RarityFilter = (typeof RARITY_FILTERS)[number]

const RARITY_STYLES: Record<CharacterRarity, { card: string; badge: string; visual: string }> = {
  R: { card: 'border-rarity-r-border bg-rarity-r-bg', badge: 'bg-surface text-rarity-r', visual: 'bg-surface' },
  SR: { card: 'border-rarity-sr-border bg-rarity-sr-bg', badge: 'bg-surface text-rarity-sr', visual: 'bg-surface' },
  SSR: { card: 'border-rarity-ssr-border bg-rarity-ssr-bg', badge: 'bg-surface text-rarity-ssr', visual: 'bg-surface' },
}

function CollectionProgress({ ownedCount, totalCount, percent }: { ownedCount: number; totalCount: number; percent: number }) {
  const remainingCount = Math.max(totalCount - ownedCount, 0)
  return (
    <section className="space-y-4 rounded-3xl border border-primary-border bg-primary-subtle p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><p className="flex items-center gap-1 text-xs font-bold tracking-[0.16em] text-primary"><BookOpen aria-hidden="true" className="size-4" /> CHARACTER BOOK</p><p className="mt-1 text-sm font-semibold text-text-muted">出会った仲間が、ここに増えていくよ</p></div>
        <div className="grid size-11 place-items-center rounded-2xl bg-surface text-reward shadow-sm"><Sparkles aria-hidden="true" className="size-6" /></div>
      </div>
      <div className="flex items-end justify-between gap-3"><p className="text-4xl font-black tracking-tight text-text-strong">{ownedCount} <span className="text-xl font-bold text-text-subtle">/ {totalCount}</span></p><p className="mb-1 text-sm font-bold text-primary">{percent}%</p></div>
      <div aria-label={`コレクション進捗 ${percent}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent} className="h-4 overflow-hidden rounded-full bg-surface" role="progressbar"><div className="h-full rounded-full bg-primary transition-[width] duration-(--duration-normal) ease-standard" style={{ width: `${percent}%` }} /></div>
      <p className="rounded-2xl bg-surface px-3 py-2 text-sm font-bold text-text-muted">{remainingCount === 0 ? '全員と出会えました！ すごい！' : `あと${remainingCount}体でコンプリート。次は誰に会えるかな？`}</p>
    </section>
  )
}

function CharacterCard({ entry }: { entry: CollectionEntry }) {
  const { character, owned, isPartner } = entry
  const style = RARITY_STYLES[character.rarity]
  return (
    <Link aria-label={owned ? `${character.name}の詳細` : `${character.rarity} 未発見キャラクターの詳細`} className={`block min-h-11 overflow-hidden rounded-2xl border p-2 shadow-sm transition-transform duration-(--duration-fast) ease-standard active:translate-y-px active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${style.card}`} to={`/collection/${character._id}`}>
      <div className={`relative aspect-[4/5] overflow-hidden rounded-xl ${style.visual}`}>
        {owned ? <img alt={character.name} className="size-full object-contain p-1" src={character.imagePath} /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-text-disabled"><div className="grid size-14 place-items-center rounded-[45%] bg-surface-muted"><UserRound aria-hidden="true" className="size-7 fill-text-disabled stroke-text-disabled" /></div><LockKeyhole aria-hidden="true" className="size-4" /></div>}
        {isPartner ? <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-surface text-rarity-ssr-icon shadow-sm"><Star aria-hidden="true" className="size-4 fill-rarity-ssr-icon" /></span> : null}
        <span className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] font-black tracking-wide shadow-sm ${style.badge}`}>{character.rarity}</span>
      </div>
      <div className="min-w-0 px-1 pb-1 pt-2 text-left"><p className="truncate text-sm font-black text-text-strong">{owned ? character.name : '???'}</p><p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${owned ? 'bg-primary-subtle text-primary' : 'bg-surface-muted text-text-subtle'}`}>{owned ? 'GET!' : '未発見'}</p></div>
    </Link>
  )
}

function AuthenticatedCollection() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('All')
  if (!isSignedIn) return <SignInPrompt message="ログインすると、集めたキャラクターを確認できます。" />
  if (hasError) return <LoadFailure message="コレクションを読み込めませんでした。" onRetry={retry} />
  if (!isReady || collection === undefined) return <LoadingState label="コレクションを読み込んでいます。" />
  const ownedCount = collection.filter((entry) => entry.owned).length
  const totalCount = collection.length
  const percent = totalCount === 0 ? 0 : Math.round((ownedCount / totalCount) * 100)
  const filtered = rarityFilter === 'All' ? collection : collection.filter((entry) => entry.character.rarity === rarityFilter)
  return (
    <div className="space-y-6">
      <CollectionProgress ownedCount={ownedCount} percent={percent} totalCount={totalCount} />
      <div aria-label="レアリティで絞り込む" className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-muted p-1.5" role="group">{RARITY_FILTERS.map((value) => <button aria-pressed={rarityFilter === value} className={`min-h-11 rounded-xl px-2 text-sm font-black ${choiceButtonClass(rarityFilter === value, 'primary')} ${rarityFilter === value ? 'shadow-[0_3px_0_var(--color-primary-active)] active:translate-y-[3px] active:shadow-none' : 'border-transparent bg-transparent'}`} key={value} onClick={() => setRarityFilter(value)} type="button">{value === 'All' ? 'ALL' : value}</button>)}</div>
      {totalCount === 0 ? <section className="space-y-3 rounded-3xl border border-border-subtle bg-surface p-6 text-center shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-subtle text-primary"><Sparkles aria-hidden="true" className="size-7" /></div><p className="text-base font-black text-text-strong">最初の仲間を探しに行こう</p><p className="text-sm leading-6 text-text-muted">PDCAを一周すると、図鑑の最初のページがアンロックされます。</p></section> : <section className="space-y-3"><div className="flex items-center justify-between px-1"><div><p className="text-base font-black text-text-strong">キャラクター図鑑</p><p className="mt-0.5 text-xs font-semibold text-text-subtle">タップしてプロフィールを見よう</p></div><p className="rounded-full bg-surface-muted px-2 py-1 text-xs font-bold text-text-subtle">{filtered.length}体</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{filtered.map((entry) => <CharacterCard entry={entry} key={entry.character._id} />)}</div></section>}
    </div>
  )
}

export function CollectionPage() {
  return <div className="space-y-6"><SectionHeading>コレクション</SectionHeading>{isClerkConfigured ? <AuthenticatedCollection /> : <section className="rounded-3xl border border-border-subtle bg-surface p-6 text-center text-sm leading-6 text-text-muted">PDCAを1周すると、ここに仲間が増えていきます。</section>}</div>
}
