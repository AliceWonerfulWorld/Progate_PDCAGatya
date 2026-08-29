import { Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { choiceButtonClass, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'

const RARITY_FILTERS = ['All', 'R', 'SR', 'SSR'] as const
type RarityFilter = (typeof RARITY_FILTERS)[number]
const EVENT_FILTER_ALL = 'All'

// レアリティ・イベント(限定ガチャ)・名前検索をまとめた絞り込みパネル。
// 常時表示のタブではなく、ボタンを押した時だけ展開する(ui-spec全体の
// モバイル優先方針に合わせて画面を縦に取りすぎないようにするため)。
function CollectionFilterPanel({
  eventOptions,
  rarityFilter,
  onRarityChange,
  eventFilter,
  onEventChange,
  search,
  onSearchChange,
}: {
  eventOptions: string[]
  rarityFilter: RarityFilter
  onRarityChange: (value: RarityFilter) => void
  eventFilter: string
  onEventChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="space-y-4 border border-border-subtle bg-surface-subtle p-4">
      <label className="block space-y-1.5" htmlFor="collection-search">
        <span className="text-xs font-semibold text-text-subtle">名前で検索</span>
        <span className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-disabled" />
          <input
            className="min-h-11 w-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary"
            id="collection-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="キャラクター名"
            value={search}
          />
        </span>
      </label>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-text-subtle">レアリティ</p>
        <div className="flex flex-wrap gap-2">
          {RARITY_FILTERS.map((value) => (
            <button
              aria-pressed={rarityFilter === value}
              className={`min-h-9 px-3 text-sm font-semibold ${choiceButtonClass(rarityFilter === value, 'primary')}`}
              key={value}
              onClick={() => onRarityChange(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {eventOptions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-subtle">イベント</p>
          <div className="flex flex-wrap gap-2">
            <button
              aria-pressed={eventFilter === EVENT_FILTER_ALL}
              className={`min-h-9 px-3 text-sm font-semibold ${choiceButtonClass(eventFilter === EVENT_FILTER_ALL, 'info')}`}
              onClick={() => onEventChange(EVENT_FILTER_ALL)}
              type="button"
            >
              すべて
            </button>
            {eventOptions.map((value) => (
              <button
                aria-pressed={eventFilter === value}
                className={`min-h-9 px-3 text-sm font-semibold ${choiceButtonClass(eventFilter === value, 'info')}`}
                key={value}
                onClick={() => onEventChange(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AuthenticatedCollection() {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('All')
  const [eventFilter, setEventFilter] = useState<string>(EVENT_FILTER_ALL)
  const [search, setSearch] = useState('')

  if (!isSignedIn) return <SignInPrompt message="ログインすると、集めたキャラクターを確認できます。" />
  if (hasError) return <LoadFailure message="コレクションを読み込めませんでした。" onRetry={retry} />
  if (!isReady || collection === undefined) return <LoadingState label="コレクションを読み込んでいます。" />

  const ownedCount = collection.filter((entry) => entry.owned).length
  const totalCount = collection.length
  const percent = totalCount === 0 ? 0 : Math.round((ownedCount / totalCount) * 100)

  const eventOptions = [...new Set(collection.flatMap((entry) => entry.eventNames))]
  const trimmedSearch = search.trim()
  const activeFilterCount =
    (rarityFilter === 'All' ? 0 : 1) + (eventFilter === EVENT_FILTER_ALL ? 0 : 1) + (trimmedSearch ? 1 : 0)

  const filtered = collection.filter((entry) => {
    if (rarityFilter !== 'All' && entry.character.rarity !== rarityFilter) return false
    if (eventFilter !== EVENT_FILTER_ALL && !entry.eventNames.includes(eventFilter)) return false
    // 未所持キャラは名前が伏せられているため、検索で名前を割り出せないようにする。
    if (trimmedSearch && !(entry.owned && entry.character.name.includes(trimmedSearch))) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold">
          {ownedCount} / {totalCount}
        </p>
        <p className="text-sm font-semibold text-text-subtle">{percent}%</p>
      </div>

      {ownedCount === 0 ? (
        <EmptyState title="まだ仲間がいません。" description="最初のPDCAを回して、精霊と出会おう。" />
      ) : null}

      <div className="space-y-3">
        <button
          aria-expanded={isFilterOpen}
          className={`flex min-h-11 items-center gap-2 px-4 text-sm font-semibold ${SECONDARY_BUTTON_CLASS}`}
          onClick={() => setIsFilterOpen((open) => !open)}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          絞り込み
          {activeFilterCount > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {isFilterOpen ? (
          <CollectionFilterPanel
            eventFilter={eventFilter}
            eventOptions={eventOptions}
            onEventChange={setEventFilter}
            onRarityChange={setRarityFilter}
            onSearchChange={setSearch}
            rarityFilter={rarityFilter}
            search={search}
          />
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          action={
            <button
              className={`inline-flex min-h-11 items-center gap-1 px-4 text-sm font-semibold ${SECONDARY_BUTTON_CLASS}`}
              onClick={() => {
                setRarityFilter('All')
                setEventFilter(EVENT_FILTER_ALL)
                setSearch('')
              }}
              type="button"
            >
              <X aria-hidden="true" className="size-4" /> 絞り込みを解除
            </button>
          }
          description="条件に一致するキャラクターがいません。"
          title="見つかりませんでした。"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((entry) => (
            <Link
              className="space-y-1 border border-border-subtle p-2 text-center"
              key={entry.character._id}
              to={`/collection/${entry.character._id}`}
            >
              <div className="relative flex aspect-square items-center justify-center bg-surface-muted text-2xl">
                {entry.owned ? (
                  <img
                    alt={entry.character.name}
                    className="size-full object-cover"
                    src={entry.character.imagePath}
                  />
                ) : (
                  <div className="size-full bg-border" />
                )}
                {entry.isPartner ? (
                  <Star aria-hidden="true" className="absolute right-1 top-1 size-4 fill-rarity-ssr-border text-rarity-ssr-icon" />
                ) : null}
                {entry.eventNames.length > 0 ? (
                  <span className="absolute left-1 top-1 bg-choice-info px-1 text-[9px] font-bold text-white">
                    限定
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs font-bold">{entry.owned ? entry.character.name : '???'}</p>
              <p className="text-[10px] font-semibold text-text-subtle">{entry.character.rarity}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function CollectionPage() {
  return (
    <div className="space-y-6">
      <SectionHeading>コレクション</SectionHeading>
      {isClerkConfigured ? (
        <AuthenticatedCollection />
      ) : (
        <p className="text-sm leading-6 text-text-muted">PDCAを1周すると、ここに仲間が増えていきます。</p>
      )}
    </div>
  )
}
