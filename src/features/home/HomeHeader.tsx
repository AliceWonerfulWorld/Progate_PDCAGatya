import { Flame, RotateCcw } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RiveAnimation } from '../../components/ui/RiveAnimation'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { getRiveAsset } from '../../lib/riveAssets'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 相棒キャラ(ui-spec #6.3)とマスコットは同じ「絵」の役割なので1枠に統合する。
// 相棒が未設定(初回ガチャ前)の間だけ、にんじゃわんこがその席に座る。
function HomeAvatar({ name, imagePath }: { name: string; imagePath?: string }) {
  const asset = getRiveAsset(name)
  if (asset) {
    return (
      <RiveAnimation
        alt={name}
        artboard={asset.artboard}
        className="size-16 shrink-0"
        fallbackSrc={asset.fallbackSrc}
        src={asset.src}
        stateMachine={asset.stateMachine}
        tapTrigger={asset.tapTrigger}
      />
    )
  }
  if (!imagePath) return null
  return <img alt={name} className="size-16 shrink-0 bg-surface-muted object-cover" src={imagePath} />
}

function HeaderFrame({
  greeting,
  stats,
  message,
  avatar,
}: {
  greeting: React.ReactNode
  stats?: React.ReactNode
  message?: React.ReactNode
  avatar: React.ReactNode
}) {
  return (
    <section className="flex items-start justify-between gap-3">
      <div className="space-y-3">
        {greeting}
        {stats}
        {message}
      </div>
      {avatar}
    </section>
  )
}

// Convexを一切叩かない版。Clerk未設定のローカル環境ではProvider自体が無く、
// useQueryを呼ぶとクラッシュするため、フックを持たない別コンポーネントに分ける。
export function GuestHomeHeader() {
  return (
    <HeaderFrame
      avatar={<HomeAvatar name="にんじゃわんこ" />}
      greeting={
        <>
          <p className="text-sm font-medium text-primary">今日の一歩</p>
          <SectionHeading>今日も1周だけ回そう。</SectionHeading>
        </>
      }
    />
  )
}

export function HomeHeader() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const enabled = isSignedIn && isReady
  const summary = useQuery(api.history.getHistorySummary, enabled ? {} : 'skip')
  const collection = useQuery(api.characters.listCollection, enabled ? {} : 'skip')
  const partner = collection?.find((entry) => entry.isPartner)
  const done = (summary?.todayCycles ?? 0) > 0

  return (
    <HeaderFrame
      avatar={
        partner ? (
          <HomeAvatar imagePath={partner.character.imagePath} name={partner.character.name} />
        ) : (
          <HomeAvatar name="にんじゃわんこ" />
        )
      }
      greeting={
        <>
          <p className="text-sm font-medium text-primary">今日の一歩</p>
          {/* ui-spec #6.4 / #6.5: 今日0周かどうかで見出しを変える。複数周回は強制しない。 */}
          <SectionHeading>{done ? '今日の1周、達成済み！' : '今日も1周だけ回そう。'}</SectionHeading>
          {done ? <p className="text-sm text-text-muted">余裕があればもう1周。</p> : null}
        </>
      }
      message={
        partner ? (
          <p className="text-sm leading-5 text-text-muted">
            「{partner.character.defaultMessage ?? '今日も1周だけやろう'}」
          </p>
        ) : null
      }
      // Streak / 今日の周回数は ui-spec #6.2 の優先度5。カードにせず1行で置く。
      stats={
        isSignedIn ? (
          <div className="flex gap-6 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Flame aria-hidden="true" className="size-4 text-attention-subtle" />
              {summary?.currentStreak ?? 0}日
            </span>
            <span className="inline-flex items-center gap-1">
              <RotateCcw aria-hidden="true" className="size-4 text-choice-info" />
              今日 {summary?.todayCycles ?? 0}周
            </span>
          </div>
        ) : null
      }
    />
  )
}
