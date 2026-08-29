import { Clock, Loader2, Sparkles, Ticket } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { CharacterRarity } from '../../../convex/lib/constants'
import { rollRarity } from '../../../convex/lib/gacha'
import type { GachaBannerInfo } from '../../../convex/gachas'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useGuestState } from '../../hooks/useGuestState'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { formatRemainingTime } from '../../lib/gachaTime'
import { userFacingError } from '../../lib/userFacingError'

interface GachaDrawResult {
  characterName: string
  rarity: CharacterRarity
  imagePath: string
  defaultMessage: string | undefined
  wasDuplicate: boolean
  fragmentReward: number
  availableGachaDraws: number
}

const RARITY_STYLES: Record<CharacterRarity, string> = {
  R: 'border-slate-300 bg-slate-50 text-slate-700',
  SR: 'border-sky-300 bg-sky-50 text-sky-700',
  SSR: 'border-amber-400 bg-amber-50 text-amber-700 shadow-[0_0_24px_rgba(251,191,36,0.35)]',
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// convex/lib/gacha.ts の selectCharacterForRarity と同じ重み付き抽選。
// Guestの初回ガチャはInventoryへ書き込まずクライアント側だけで完結するため、
// (isActive確認済みの)候補配列に対してここで直接抽選する。
function pickWeighted<T extends { weight?: number }>(items: readonly T[], randomValue: number): T {
  const weights = items.map((item) => item.weight ?? 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const target = randomValue * totalWeight

  let cumulative = 0
  for (let i = 0; i < items.length; i += 1) {
    cumulative += weights[i]
    if (target < cumulative) return items[i]
  }
  return items[items.length - 1]
}

// docs/ui-spec.md #18.2: 演出は1〜2秒程度。ここでは実処理と体感演出時間の
// 両方が終わってから結果を表示する（AC-UI-009: DB更新成功前に確定結果を出さない）。
const MIN_DRAWING_MS = 1200

function GachaResultView({
  result,
  error,
  onDrawAgain,
  secondaryLinks,
  footer,
}: {
  result: GachaDrawResult
  error: string | null
  onDrawAgain: (() => void) | null
  secondaryLinks: { label: string; to: string }[]
  footer: ReactNode
}) {
  return (
    <div className="space-y-6 text-center">
      <section className={`space-y-3 border px-4 py-8 ${RARITY_STYLES[result.rarity]}`}>
        <p className="text-sm font-bold tracking-widest">{result.rarity}</p>
        {result.wasDuplicate ? null : (
          <p className="flex items-center justify-center gap-1 text-lg font-bold">
            <Sparkles aria-hidden="true" className="size-5" /> NEW!
          </p>
        )}
        <p className="text-xl font-bold text-slate-900">{result.characterName}</p>
        {result.imagePath ? (
          <img alt={result.characterName} className="mx-auto aspect-square w-40 border border-white/70 object-cover shadow-sm" src={result.imagePath} />
        ) : null}
        {result.wasDuplicate ? (
          <>
            <p className="text-sm font-semibold text-slate-500">Already Owned</p>
            <p className="text-base font-bold text-slate-700">欠片 +{result.fragmentReward}</p>
          </>
        ) : result.defaultMessage ? (
          <p className="text-sm leading-6 text-slate-600">「{result.defaultMessage}」</p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        {onDrawAgain ? (
          <button
            className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
            onClick={onDrawAgain}
            type="button"
          >
            もう1回回す
          </button>
        ) : null}
        {secondaryLinks.map((link) => (
          <Link
            className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
            key={link.to}
            to={link.to}
          >
            {link.label}
          </Link>
        ))}
        {footer}
      </div>
    </div>
  )
}

// 画像を持たないガチャバナー用に、対象キャラを名前の一覧で見せる。
// ガチャの下に残り時間(常設ガチャは「常時開催」)を表示する。
function GachaSelector({
  gachas,
  onSelect,
}: {
  gachas: GachaBannerInfo[]
  onSelect: (gacha: GachaBannerInfo) => void
}) {
  return (
    <div className="space-y-8 text-center">
      <SectionHeading>GACHA</SectionHeading>
      <div className="space-y-3 text-left">
        {gachas.map((gacha) => (
          <button
            className="w-full space-y-2 border border-slate-300 p-4 text-left"
            key={gacha.key}
            onClick={() => onSelect(gacha)}
            type="button"
          >
            <p className="text-base font-bold">{gacha.name}</p>
            {gacha.description ? <p className="text-sm text-slate-600">{gacha.description}</p> : null}
            <p className="text-xs text-slate-500">{gacha.characterNames.join('、')}</p>
            <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Clock aria-hidden="true" className="size-3.5" /> {formatRemainingTime(gacha.endAt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function SignedInGacha() {
  const navigate = useNavigate()
  const location = useLocation()
  const goalId = (location.state as { goalId?: string } | null)?.goalId
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  const gachas = useQuery(api.gachas.listActiveGachas, isReady ? {} : 'skip')
  const drawGacha = useMutation(api.gacha.drawGacha)
  const [selectedGacha, setSelectedGacha] = useState<GachaBannerInfo | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [result, setResult] = useState<GachaDrawResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (hasError) return <LoadFailure message="ガチャを読み込めませんでした。" onRetry={retry} />
  if (!isReady || currentUser === undefined || gachas === undefined) {
    return <LoadingState label="ガチャを準備しています。" />
  }

  if (!selectedGacha) {
    return <GachaSelector gachas={gachas} onSelect={setSelectedGacha} />
  }

  async function handleDraw() {
    if (!selectedGacha) return
    setError(null)
    setIsDrawing(true)
    try {
      const [drawResult] = await Promise.all([
        drawGacha({ gachaKey: selectedGacha.key }),
        sleep(MIN_DRAWING_MS),
      ])
      setResult(drawResult)
    } catch (caughtError) {
      setError(userFacingError(caughtError, 'ガチャを回せませんでした。もう一度試してください。'))
    } finally {
      setIsDrawing(false)
    }
  }

  if (isDrawing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 aria-hidden="true" className="size-12 animate-spin text-emerald-700" />
        <p className="text-sm font-semibold text-slate-600">ガチャを回しています…</p>
      </div>
    )
  }

  if (result) {
    return (
      <GachaResultView
        error={error}
        footer={
          <button
            className="flex min-h-12 w-full items-center justify-center text-sm font-semibold text-slate-500"
            onClick={() => navigate('/')}
            type="button"
          >
            ホームへ
          </button>
        }
        onDrawAgain={result.availableGachaDraws > 0 ? () => { setResult(null); void handleDraw() } : null}
        result={result}
        secondaryLinks={[
          ...(result.availableGachaDraws <= 0 && goalId ? [{ label: 'もう1周する', to: `/pdca/plan/${goalId}` }] : []),
          { label: 'コレクションを見る', to: '/collection' },
        ]}
      />
    )
  }

  return (
    <div className="space-y-8 text-center">
      <section className="space-y-3">
        <SectionHeading>{selectedGacha.name}</SectionHeading>
        <p className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
          <Clock aria-hidden="true" className="size-3.5" /> {formatRemainingTime(selectedGacha.endAt)}
        </p>
        <p className="flex items-center justify-center gap-2 text-base font-semibold text-slate-700">
          <Ticket aria-hidden="true" className="size-5 text-violet-600" /> 残り {currentUser.availableGachaDraws}回
        </p>
        {currentUser.availableGachaDraws <= 0 ? (
          <p className="text-sm leading-6 text-slate-500">
            ガチャは0回です。PDCAを1周すると、ガチャを1回回せます。
          </p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={currentUser.availableGachaDraws <= 0 || isDrawing}
          onClick={() => void handleDraw()}
          type="button"
        >
          1回回す
        </button>
        <button
          className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
          onClick={() => setSelectedGacha(null)}
          type="button"
        >
          他のガチャを選ぶ
        </button>
        <button
          className="flex min-h-12 w-full items-center justify-center text-sm font-semibold text-slate-500"
          onClick={() => navigate(goalId ? `/goal/${goalId}` : '/')}
          type="button"
        >
          あとで
        </button>
      </div>
    </div>
  )
}

// docs/user-flow.md #1.3 / #9: Guestは初回ガチャのみログイン不要で回せる。
// Inventory/gachaHistoryへは何も書き込まないため、認証不要な公開Query
// (characters.listActiveForGuestGacha) と純粋関数(rollRarity)だけで
// クライアント側完結させる。結果は「初回だけ」なので、以後は再挑戦させず
// ログイン導線に絞る。
function GuestGacha() {
  const { state, setGacha } = useGuestState()
  const activeCharacters = useQuery(api.characters.listActiveForGuestGacha, {})
  const gachaRates = useQuery(api.gachas.getActiveGachaRates, { key: 'standard' })
  const [isDrawing, setIsDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GachaDrawResult | null>(
    state.gacha.firstResult
      ? {
          characterName: state.gacha.firstResult.characterName,
          rarity: state.gacha.firstResult.rarity,
          imagePath: '',
          defaultMessage: undefined,
          wasDuplicate: false,
          fragmentReward: 0,
          availableGachaDraws: 0,
        }
      : null,
  )

  if (state.gacha.availableDraws <= 0 && !result) {
    return (
      <div className="space-y-4 text-center">
        <SectionHeading>GACHA</SectionHeading>
        <p className="text-sm leading-6 text-slate-500">PDCAを1周すると、ガチャを1回回せます。</p>
        <Link
          className="flex min-h-12 items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
          to="/"
        >
          ホームへ
        </Link>
      </div>
    )
  }

  async function handleDraw() {
    if (!activeCharacters || activeCharacters.length === 0 || !gachaRates) {
      setError('ガチャを回せませんでした。もう一度試してください。')
      return
    }
    setError(null)
    setIsDrawing(true)
    await sleep(MIN_DRAWING_MS)

    const rarity = rollRarity(Math.random(), gachaRates)
    const candidates = activeCharacters.filter((character) => character.rarity === rarity)
    const pool = candidates.length > 0 ? candidates : activeCharacters
    const picked = pickWeighted(pool, Math.random())

    setGacha({
      availableDraws: 0,
      firstResult: { characterId: picked._id, characterName: picked.name, rarity: picked.rarity },
    })
    setResult({
      characterName: picked.name,
      rarity: picked.rarity,
      imagePath: picked.imagePath,
      defaultMessage: picked.defaultMessage,
      wasDuplicate: false,
      fragmentReward: 0,
      availableGachaDraws: 0,
    })
    setIsDrawing(false)
  }

  if (isDrawing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 aria-hidden="true" className="size-12 animate-spin text-emerald-700" />
        <p className="text-sm font-semibold text-slate-600">ガチャを回しています…</p>
      </div>
    )
  }

  if (result) {
    return (
      <div className="space-y-6">
        <GachaResultView
          error={error}
          footer={null}
          onDrawAgain={null}
          result={result}
          secondaryLinks={[]}
        />
        <SignInPrompt message="この記録を残しますか？ログインすると、Goalとガチャ結果が保存されます。" />
      </div>
    )
  }

  return (
    <div className="space-y-8 text-center">
      <section className="space-y-3">
        <SectionHeading>GACHA</SectionHeading>
        <p className="flex items-center justify-center gap-2 text-base font-semibold text-slate-700">
          <Ticket aria-hidden="true" className="size-5 text-violet-600" /> 残り {state.gacha.availableDraws}回
        </p>
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <button
        className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={activeCharacters === undefined || gachaRates === undefined}
        onClick={() => void handleDraw()}
        type="button"
      >
        {activeCharacters === undefined || gachaRates === undefined ? '準備しています…' : '1回回す'}
      </button>
    </div>
  )
}

function GachaGate() {
  const { isSignedIn } = useCurrentUserInitialization()
  return isSignedIn ? <SignedInGacha /> : <GuestGacha />
}

export function GachaPage() {
  return (
    <div className="space-y-6">
      {isClerkConfigured ? (
        <GachaGate />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にガチャを回せます。</p>
      )}
    </div>
  )
}
