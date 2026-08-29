import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RiveAnimation } from '../../components/ui/RiveAnimation'
import { getRiveAsset } from '../../lib/riveAssets'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/ui-spec.md #6.3: 相棒キャラのセリフをHome最上部に表示する。
// 相棒未設定(初回ガチャ前)の間は何も出さない。
export function PartnerBanner() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const collection = useQuery(api.characters.listCollection, isSignedIn && isReady ? {} : 'skip')

  if (!isSignedIn || !isReady || collection === undefined) return null
  const partner = collection.find((entry) => entry.isPartner)
  if (!partner) return null
  // Riveアニメーションが用意されているキャラはそれを、無ければ静止画を出す。
  const riveAsset = getRiveAsset(partner.character.name)

  return (
    <section className="flex items-center gap-3 border-b border-border-subtle pb-6">
      {riveAsset ? (
        <RiveAnimation
          alt={partner.character.name}
          artboard={riveAsset.artboard}
          className="size-14 shrink-0 bg-surface-muted object-cover"
          fallbackSrc={riveAsset.fallbackSrc}
          src={riveAsset.src}
          stateMachine={riveAsset.stateMachine}
          tapTrigger={riveAsset.tapTrigger}
        />
      ) : (
        <img
          alt={partner.character.name}
          className="size-14 shrink-0 bg-surface-muted object-cover"
          src={partner.character.imagePath}
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-text-body">{partner.character.name}</p>
        <p className="mt-0.5 text-sm leading-5 text-text-muted">
          「{partner.character.defaultMessage ?? '今日も1周だけやろう'}」
        </p>
      </div>
    </section>
  )
}
