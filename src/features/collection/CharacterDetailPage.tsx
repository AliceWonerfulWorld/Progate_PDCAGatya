import { ArrowLeft, Check, LockKeyhole, Sparkles, Star } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import type { CharacterRarity } from '../../../convex/lib/constants'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { PRIMARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import { userFacingError } from '../../lib/userFacingError'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

const Character3DViewer = lazy(() => import('./Character3DViewer'))

const RARITY_STYLES: Record<CharacterRarity, { badge: string; frame: string }> = {
  R: { badge: 'border-rarity-r-border bg-rarity-r-bg text-rarity-r', frame: 'border-rarity-r-border bg-rarity-r-bg' },
  SR: { badge: 'border-rarity-sr-border bg-rarity-sr-bg text-rarity-sr', frame: 'border-rarity-sr-border bg-rarity-sr-bg' },
  SSR: { badge: 'border-rarity-ssr-border bg-rarity-ssr-bg text-rarity-ssr', frame: 'border-rarity-ssr-border bg-rarity-ssr-bg' },
}

function AuthenticatedCharacterDetail({ characterId }: { characterId: string }) {
  const { hasError, isReady, isSignedIn, retry } = useCurrentUserInitialization()
  const collection = useQuery(api.characters.listCollection, isReady ? {} : 'skip')
  const setPartnerCharacter = useMutation(api.users.setPartnerCharacter)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  if (!isSignedIn) return <SignInPrompt message="ログインすると、キャラクターの詳細を見られます。" />
  if (hasError) return <LoadFailure message="読み込めませんでした。" onRetry={retry} />
  if (!isReady || collection === undefined) return <LoadingState label="キャラクターを読み込んでいます。" />
  const entry = collection.find((item) => item.character._id === characterId)
  if (!entry) return <p className="text-sm text-text-muted">キャラクターが見つかりませんでした。</p>
  const { character, owned, fragmentCount, duplicateCount, isPartner } = entry
  const rarityStyle = RARITY_STYLES[character.rarity]

  if (!owned) {
    return <section className={`space-y-5 rounded-3xl border p-5 text-center ${rarityStyle.frame}`}><div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-surface"><div className="space-y-3 text-text-disabled"><div className="mx-auto grid size-20 place-items-center rounded-full bg-surface-muted"><LockKeyhole aria-hidden="true" className="size-9" /></div><p className="text-sm font-bold">未発見</p></div></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${rarityStyle.badge}`}>{character.rarity}</span><div className="space-y-1"><h1 className="text-2xl font-black text-text-strong">???</h1><p className="text-sm leading-6 text-text-muted">ガチャで出会うと、ここにプロフィールが記録されます。</p></div></section>
  }

  async function handleSetPartner() {
    setError(null)
    setIsSubmitting(true)
    try { await setPartnerCharacter({ characterId: character._id as Id<'characters'> }) } catch (caughtError) { setError(userFacingError(caughtError, '相棒に設定できませんでした。もう一度試してください。')) } finally { setIsSubmitting(false) }
  }

  return (
    <section className={`overflow-hidden rounded-3xl border shadow-sm ${rarityStyle.frame}`}>
      <div className="relative mx-3 mt-3 aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
        {character.modelPath ? <Suspense fallback={<img alt={character.name} className="size-full object-contain p-4" src={character.imagePath} />}><Character3DViewer modelPath={character.modelPath} name={character.name} posterSrc={character.imagePath} /></Suspense> : <img alt={character.name} className="size-full object-contain p-4" src={character.imagePath} />}
        <span className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-black ${rarityStyle.badge}`}>{character.rarity}</span>
        {isPartner ? <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface text-rarity-ssr-icon shadow-sm"><Star aria-hidden="true" className="size-5 fill-rarity-ssr-icon" /></span> : null}
      </div>
      <div className="space-y-5 p-5">
        <div className="space-y-2"><p className="flex items-center gap-1 text-xs font-black tracking-[0.16em] text-text-muted"><Sparkles aria-hidden="true" className="size-4 text-reward" /> YOUR COMPANION</p><h1 className="text-3xl font-black tracking-tight text-text-strong">{character.name}</h1><p className="text-sm leading-6 text-text-muted">{character.description}</p>{character.defaultMessage ? <p className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold leading-6 text-text-body">「{character.defaultMessage}」</p> : null}</div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-surface p-4 shadow-sm"><p className="text-xs font-bold text-text-subtle">欠片</p><p className="mt-1 text-2xl font-black text-reward">{fragmentCount}</p><p className="mt-1 text-[10px] font-bold text-text-subtle">集めたかけら</p></div><div className="rounded-2xl bg-surface p-4 shadow-sm"><p className="text-xs font-bold text-text-subtle">重複入手</p><p className="mt-1 text-2xl font-black text-text-strong">{duplicateCount}<span className="ml-1 text-sm">回</span></p><p className="mt-1 text-[10px] font-bold text-text-subtle">また会えた回数</p></div></div>
        {error ? <p className="text-sm text-attention-body">{error}</p> : null}
        {isPartner ? <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary-subtle px-4 text-base font-black text-primary"><Check aria-hidden="true" className="size-5" /> 現在の相棒</p> : <button className={`flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] active:translate-y-[3px] active:shadow-none ${PRIMARY_BUTTON_CLASS}`} disabled={isSubmitting} onClick={() => void handleSetPartner()} type="button">このキャラを相棒にする</button>}
      </div>
    </section>
  )
}

export function CharacterDetailPage() {
  const { characterId } = useParams()
  return <div className="space-y-5"><Link className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-bold text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/collection"><ArrowLeft aria-hidden="true" className="size-4" /> コレクション</Link>{isClerkConfigured && characterId ? <AuthenticatedCharacterDetail characterId={characterId} /> : <p className="rounded-3xl bg-surface p-6 text-sm text-text-muted">ログイン設定の完了後に詳細を見られます。</p>}</div>
}
