import { Star } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const RARITY_FILTERS = ['All', 'R', 'SR', 'SSR'] as const
type RarityFilter = (typeof RARITY_FILTERS)[number]

function AuthenticatedCollection() {
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')
  const [filter, setFilter] = useState<RarityFilter>('All')

  if (!isSignedIn) return <SignInPrompt message="ログインすると、集めたキャラクターを確認できます。" />
  if (hasError) return <p className="text-sm text-rose-700">コレクションを読み込めませんでした。</p>
  if (!isReady || collection === undefined) return <p className="text-sm text-slate-600">読み込んでいます。</p>

  const ownedCount = collection.filter((entry) => entry.owned).length
  const totalCount = collection.length
  const percent = totalCount === 0 ? 0 : Math.round((ownedCount / totalCount) * 100)
  const filtered = filter === 'All' ? collection : collection.filter((entry) => entry.character.rarity === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold">
          {ownedCount} / {totalCount}
        </p>
        <p className="text-sm font-semibold text-slate-500">{percent}%</p>
      </div>

      <div className="flex gap-2">
        {RARITY_FILTERS.map((value) => (
          <button
            aria-pressed={filter === value}
            className={`min-h-9 px-3 text-sm font-semibold ${
              filter === value ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-700'
            }`}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {filtered.map((entry) => (
          <Link
            className="space-y-1 border border-slate-200 p-2 text-center"
            key={entry.character._id}
            to={`/collection/${entry.character._id}`}
          >
            <div className="relative flex aspect-square items-center justify-center bg-slate-100 text-2xl">
              {entry.owned ? (
                <img
                  alt={entry.character.name}
                  className="size-full object-cover"
                  src={entry.character.imagePath}
                />
              ) : (
                <div className="size-full bg-slate-300" />
              )}
              {entry.isPartner ? (
                <Star aria-hidden="true" className="absolute right-1 top-1 size-4 fill-amber-400 text-amber-500" />
              ) : null}
            </div>
            <p className="truncate text-xs font-bold">{entry.owned ? entry.character.name : '???'}</p>
            <p className="text-[10px] font-semibold text-slate-500">{entry.character.rarity}</p>
          </Link>
        ))}
      </div>
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
        <p className="text-sm leading-6 text-slate-600">PDCAを1周すると、ここに仲間が増えていきます。</p>
      )}
    </div>
  )
}
