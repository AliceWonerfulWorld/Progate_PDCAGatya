import { ArrowRightLeft, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { recommendActType } from '../../../convex/lib/act'
import type { ActType, CheckLoad, DoResult } from '../../../convex/lib/act'
import { BASE_PDCA_XP, INPUT_LIMITS } from '../../../convex/lib/constants'
import { calculatePlayerLevel } from '../../../convex/lib/playerLevel'
import type { CompletePdcaCycleResult } from '../../../convex/pdca'
import { isClerkConfigured } from '../../app/AppProviders'
import { BackButton } from '../../components/ui/BackButton'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { useGuestState } from '../../hooks/useGuestState'
import { choiceButtonClass, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/buttonStyles'
import type { GuestActType, GuestPdcaCycle } from '../../lib/guestStore'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// 「軽くする」と「増やす」を見た目でも取り違えないよう、アイコンで方向を示す
// (どちらも同じ灰色ボタンでラベルの読み違いが起きやすかったため)。
const ACT_TYPES = [
  { value: 'lighter', label: '少し軽くする', icon: <Minus aria-hidden="true" className="size-4" /> },
  { value: 'same', label: 'そのまま', icon: null },
  { value: 'heavier', label: '少し増やす', icon: <Plus aria-hidden="true" className="size-4" /> },
  { value: 'changeApproach', label: 'やり方を変える', icon: <ArrowRightLeft aria-hidden="true" className="size-4" /> },
] as const satisfies readonly { value: ActType; label: string; icon: ReactNode }[]

function ActBody({
  goalName,
  recommended,
  initialActType,
  initialCandidate,
  isSubmitting,
  error,
  onSubmit,
}: {
  goalName: string | null
  recommended: ActType
  initialActType: ActType
  initialCandidate: string
  isSubmitting: boolean
  error: string | null
  onSubmit: (actType: ActType, nextPlanCandidate: string) => void
}) {
  const [actType, setActType] = useState<ActType>(initialActType)
  const [nextPlanCandidate, setNextPlanCandidate] = useState(initialCandidate)
  const [isAdjusting, setIsAdjusting] = useState(false)

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        {goalName ? <p className="text-sm font-medium text-slate-500">{goalName}</p> : null}
        <SectionHeading>次はどうする？</SectionHeading>
      </section>

      <div className="space-y-3">
        {ACT_TYPES.map(({ value, label, icon }) => (
          <button
            aria-pressed={actType === value}
            className={`flex min-h-12 w-full items-center gap-2 px-4 text-left text-base font-semibold ${choiceButtonClass(actType === value, 'emerald')}`}
            key={value}
            onClick={() => setActType(value)}
            type="button"
          >
            {icon}
            {label}
            {value === recommended ? <span className="ml-2 text-xs font-bold text-emerald-700">おすすめ</span> : null}
          </button>
        ))}
      </div>

      <section className="space-y-2 border-y border-slate-200 py-5">
        <p className="text-sm font-medium text-slate-500">次回候補</p>
        {isAdjusting ? (
          <>
            <label className="block space-y-2" htmlFor="next-plan-candidate">
              <span className="sr-only">次回候補</span>
              <input
                autoFocus
                className="min-h-12 w-full border border-slate-300 bg-white px-3 text-base outline-none focus:border-emerald-700"
                id="next-plan-candidate"
                maxLength={INPUT_LIMITS.nextPlanCandidate}
                onChange={(event) => setNextPlanCandidate(event.target.value)}
                placeholder="英単語を5個復習する"
                value={nextPlanCandidate}
              />
            </label>
            <button
              className="text-sm font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              onClick={() => setIsAdjusting(false)}
              type="button"
            >
              戻る
            </button>
          </>
        ) : (
          <p className="text-base font-bold">{nextPlanCandidate}</p>
        )}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="space-y-3">
        <button
          className={`min-h-12 w-full px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          disabled={isSubmitting}
          onClick={() => onSubmit(actType, nextPlanCandidate)}
          type="button"
        >
          これでいく
        </button>
        {isAdjusting ? null : (
          <button
            className={`min-h-12 w-full px-4 text-base font-semibold ${SECONDARY_BUTTON_CLASS}`}
            onClick={() => setIsAdjusting(true)}
            type="button"
          >
            調整する
          </button>
        )}
      </div>
    </div>
  )
}

function SignedInActPage({ cycleId }: { cycleId: string }) {
  const navigate = useNavigate()
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const detail = useQuery(
    api.pdca.getCycle,
    isReady ? { cycleId: cycleId as Id<'pdcaCycles'> } : 'skip',
  )
  const submitAct = useMutation(api.pdca.submitAct)
  const completePdcaCycle = useMutation(api.pdca.completePdcaCycle)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (hasError) return <LoadFailure message="ACTを読み込めませんでした。" onRetry={retry} />
  if (!isReady || detail === undefined) return <p className="text-sm text-slate-600">ACTを読み込んでいます。</p>

  const { cycle, goalName } = detail
  if (cycle.status !== 'acting') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {cycle.status === 'checking' ? 'まずCHECKを記録してください。' : 'このPDCAはACTを記録済みです。'}
        </p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'checking' ? `/pdca/check/${cycle._id}` : `/goal/${cycle.goalId}`}
        >
          {cycle.status === 'checking' ? 'CHECKへ戻る' : 'Goalへ戻る'}
        </Link>
      </div>
    )
  }

  const recommended = recommendActType(
    (cycle.checkLoad ?? 'justRight') as CheckLoad,
    cycle.doResult as DoResult | undefined,
  )
  const initialActType = (cycle.actType as ActType | undefined) ?? recommended
  const initialCandidate = cycle.nextPlanCandidate ?? cycle.planText

  async function handleSubmit(actType: ActType, nextPlanCandidate: string) {
    setError(null)
    setIsSubmitting(true)
    try {
      await submitAct({ cycleId: cycle._id, actType, nextPlanCandidate: nextPlanCandidate.trim() || undefined })
      const result = await completePdcaCycle({ cycleId: cycle._id })
      navigate(`/pdca/complete/${cycle._id}`, { state: { result, goalId: cycle.goalId, isRecovery: cycle.isRecovery } })
    } catch {
      setError('ACTを保存できませんでした。もう一度試してください。')
      setIsSubmitting(false)
    }
  }

  return (
    <ActBody
      error={error}
      goalName={goalName}
      initialActType={initialActType}
      initialCandidate={initialCandidate}
      isSubmitting={isSubmitting}
      onSubmit={(actType, candidate) => void handleSubmit(actType, candidate)}
      recommended={recommended}
    />
  )
}

// Guestの完了報酬は、ログイン後にmigrateGuestDataが実際に付与する値
// (docs/technical-design.md #56-58: 基本XP + Gacha権+1のみ) と一致させる。
// Daily Mission等ログイン専用の仕組みはここでは見せない。
function GuestActPage() {
  const navigate = useNavigate()
  const { state, setCycle, setGacha } = useGuestState()
  const cycle = state.cycle

  if (!cycle) return <Navigate replace to="/pdca/plan/guest" />
  if (cycle.status !== 'acting') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {cycle.status === 'checking' ? 'まずCHECKを記録してください。' : 'このPDCAはACTを記録済みです。'}
        </p>
        <Link
          className={`flex min-h-12 items-center justify-center px-4 text-base font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          to={cycle.status === 'checking' ? '/pdca/check/guest' : '/'}
        >
          {cycle.status === 'checking' ? 'CHECKへ戻る' : 'ホームへ戻る'}
        </Link>
      </div>
    )
  }

  const activeCycle: GuestPdcaCycle = cycle
  const recommended = recommendActType(
    (activeCycle.checkLoad ?? 'justRight') as CheckLoad,
    activeCycle.doResult as DoResult | undefined,
  )
  const initialCandidate = activeCycle.nextPlanCandidate ?? activeCycle.planText

  function handleSubmit(actType: ActType, nextPlanCandidate: string) {
    const completedAt = Date.now()
    const trimmedCandidate = nextPlanCandidate.trim() || undefined
    setCycle({
      ...activeCycle,
      actType: actType as GuestActType,
      nextPlanCandidate: trimmedCandidate,
      status: 'completed',
      completedAt,
    })
    const availableGachaDraws = state.gacha.availableDraws + 1
    setGacha({ availableDraws: availableGachaDraws, firstResult: state.gacha.firstResult })

    const gainedXp = BASE_PDCA_XP
    const newLevel = calculatePlayerLevel(gainedXp)
    const result = {
      cycleId: 'guest' as unknown as Id<'pdcaCycles'>,
      alreadyCompleted: false,
      gainedXp,
      previousLevel: 1,
      newLevel,
      levelUp: newLevel > 1,
      currentStreak: 1,
      streakUpdated: true,
      gachaDrawsAdded: 1,
      availableGachaDraws,
      totalCycles: 1,
      dailyMissionCompleted: false,
      dailyMissionXp: 0,
    } satisfies CompletePdcaCycleResult

    navigate('/pdca/complete/guest', { state: { result, goalId: 'guest', isRecovery: false } })
  }

  return (
    <ActBody
      error={null}
      goalName={state.goal?.name ?? null}
      initialActType={(activeCycle.actType as ActType | undefined) ?? recommended}
      initialCandidate={initialCandidate}
      isSubmitting={false}
      onSubmit={handleSubmit}
      recommended={recommended}
    />
  )
}

function ActGate({ cycleId }: { cycleId: string }) {
  const { isSignedIn } = useCurrentUserInitialization()
  if (cycleId === 'guest') return <GuestActPage />
  return isSignedIn ? <SignedInActPage cycleId={cycleId} /> : <Navigate replace to="/" />
}

export function ActPage() {
  const { cycleId } = useParams()

  return (
    <div className="space-y-6">
      <BackButton />
      {isClerkConfigured && cycleId ? (
        <ActGate cycleId={cycleId} />
      ) : (
        <p className="text-sm text-slate-600">ログイン設定の完了後にACTを記録できます。</p>
      )}
    </div>
  )
}
