import { ArrowLeft } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { userFacingError } from '../../lib/userFacingError'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 詳細画面でだけ使う3Dビューア。重い依存(@google/model-viewer)を遅延ロードする。
const Character3DViewer = lazy(() => import('./Character3DViewer'))

const CHARACTER_IMAGE_CLASS = 'mx-auto aspect-square w-40 bg-surface-muted object-cover'

// docs/ui-spec.md #23 (Character Detail)。未所持は詳細を明かさずシルエットのみ。
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

  const { character, owned, fragmentCount, isPartner } = entry

  if (!owned) {
    return (
      <div className="space-y-4 text-center">
        <div aria-label="未入手" className="mx-auto aspect-square w-40 bg-border" role="img" />
        <SectionHeading>???</SectionHeading>
        <p className="text-sm text-text-subtle">まだ出会っていないキャラクターです。</p>
      </div>
    )
  }

  async function handleSetPartner() {
    setError(null)
    setIsSubmitting(true)
    try {
      await setPartnerCharacter({ characterId: character._id as Id<'characters'> })
    } catch (caughtError) {
      setError(userFacingError(caughtError, '相棒に設定できませんでした。もう一度試してください。'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm font-bold text-text-subtle">{character.rarity}</p>
      {character.modelPath ? (
        <Suspense
          fallback={<img alt={character.name} className={CHARACTER_IMAGE_CLASS} src={character.imagePath} />}
        >
          <Character3DViewer
            modelPath={character.modelPath}
            name={character.name}
            posterSrc={character.imagePath}
          />
        </Suspense>
      ) : (
        <img alt={character.name} className={CHARACTER_IMAGE_CLASS} src={character.imagePath} />
      )}
      <SectionHeading>{character.name}</SectionHeading>
      <p className="text-sm leading-6 text-text-muted">{character.description}</p>
      <p className="text-base font-bold text-text-body">欠片 {fragmentCount}</p>

      {error ? <p className="text-sm text-attention-body">{error}</p> : null}

      {isPartner ? (
        <p className="flex min-h-12 items-center justify-center bg-primary-subtle px-4 text-base font-bold text-primary">
          相棒に設定中
        </p>
      ) : (
        <button
          className="flex min-h-12 w-full items-center justify-center bg-primary px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-border"
          disabled={isSubmitting}
          onClick={() => void handleSetPartner()}
          type="button"
        >
          相棒にする
        </button>
      )}
    </div>
  )
}

export function CharacterDetailPage() {
  const { characterId } = useParams()

  return (
    <div className="space-y-6">
      <Link className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-muted" to="/collection">
        <ArrowLeft aria-hidden="true" className="size-4" /> コレクション
      </Link>
      {isClerkConfigured && characterId ? (
        <AuthenticatedCharacterDetail characterId={characterId} />
      ) : (
        <p className="text-sm text-text-muted">ログイン設定の完了後に詳細を見られます。</p>
      )}
    </div>
  )
}
