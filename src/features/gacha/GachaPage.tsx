import { Loader2, Sparkles, Ticket } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { CharacterRarity } from '../../../convex/lib/constants'
import { isClerkConfigured } from '../../app/AppProviders'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { SignInPrompt } from '../../components/ui/SignInPrompt'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

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

// docs/ui-spec.md #18.2: 演出は1〜2秒程度。ここでは実処理と体感演出時間の
// 両方が終わってから結果を表示する（AC-UI-009: DB更新成功前に確定結果を出さない）。
const MIN_DRAWING_MS = 1200

function AuthenticatedGacha() {
  const navigate = useNavigate()
  const location = useLocation()
  const goalId = (location.state as { goalId?: string } | null)?.goalId
  const { hasError, isReady, isSignedIn } = useCurrentUserInitialization()
  const currentUser = useQuery(api.users.currentUser, isReady ? {} : 'skip')
  const drawGacha = useMutation(api.gacha.drawGacha)
  const [isDrawing, setIsDrawing] = useState(false)
  const [result, setResult] = useState<GachaDrawResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isSignedIn) return <SignInPrompt message="ログインすると、ガチャを回せます。" />
  if (hasError) return <p className="text-sm text-rose-700">ガチャを読み込めませんでした。</p>
  if (!isReady || currentUser === undefined) return <p className="text-sm text-slate-600">読み込んでいます。</p>

  async function handleDraw() {
    setError(null)
    setIsDrawing(true)
    try {
      const [drawResult] = await Promise.all([drawGacha({}), sleep(MIN_DRAWING_MS)])
      setResult(drawResult)
    } catch {
      setError('ガチャを回せませんでした。もう一度試してください。')
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
      <div className="space-y-6 text-center">
        <section className={`space-y-3 border px-4 py-8 ${RARITY_STYLES[result.rarity]}`}>
          <p className="text-sm font-bold tracking-widest">{result.rarity}</p>
          {result.wasDuplicate ? null : (
            <p className="flex items-center justify-center gap-1 text-lg font-bold">
              <Sparkles aria-hidden="true" className="size-5" /> NEW!
            </p>
          )}
          <p className="text-xl font-bold text-slate-900">{result.characterName}</p>
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
          {result.availableGachaDraws > 0 ? (
            <button
              className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white"
              onClick={() => {
                setResult(null)
                void handleDraw()
              }}
              type="button"
            >
              もう1回回す
            </button>
          ) : goalId ? (
            <Link
              className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
              to={`/pdca/plan/${goalId}`}
            >
              もう1周する
            </Link>
          ) : null}
          <Link
            className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
            to="/collection"
          >
            コレクションを見る
          </Link>
          <button
            className="flex min-h-12 w-full items-center justify-center text-sm font-semibold text-slate-500"
            onClick={() => navigate('/')}
            type="button"
          >
            ホームへ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-center">
      <section className="space-y-3">
        <SectionHeading>GACHA</SectionHeading>
        <p className="flex items-center justify-center gap-2 text-base font-semibold text-slate-700">
          <Ticket aria-hidden="true" className="size-5 text-violet-600" /> 残り {currentUser.availableGachaDraws}回
        </p>
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className="flex min-h-12 w-full items-center justify-center bg-emerald-700 px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={currentUser.availableGachaDraws <= 0}
          onClick={() => void handleDraw()}
          type="button"
        >
          1回回す
        </button>
        <button
          className="flex min-h-12 w-full items-center justify-center border border-slate-300 px-4 text-base font-semibold text-slate-700"
          onClick={() => navigate(goalId ? `/goal/${goalId}` : '/')}
          type="button"
        >
          あとで
        </button>
      </div>
    </div>
  )
}

export function GachaPage() {
  return (
    <div className="space-y-6">
      {isClerkConfigured ? (
        <AuthenticatedGacha />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にガチャを回せます。</p>
      )}
    </div>
  )
}
