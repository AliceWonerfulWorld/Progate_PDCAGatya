import { Flame, Plus, RotateCcw } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { SectionHeading } from '../../components/ui/SectionHeading'
import { GoalCard } from '../goals/GoalCard'
import { GuestGoalSection } from '../goals/GuestGoalSection'
import { ActiveCycleCard } from '../pdca/ActiveCycleCard'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { RiveAnimation } from '../../components/ui/RiveAnimation'
import { getRiveAsset } from '../../lib/riveAssets'
import { AtRiskBanner } from './AtRiskBanner'
import { DailyMissionCard } from './DailyMissionCard'
import { GachaTicketCard } from './GachaTicketCard'
import { PartnerBanner } from './PartnerBanner'

function CreateGoalLink() {
  return (
    <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary" to="/goals/new">
      <Plus aria-hidden="true" className="size-4" /> Goalを作る
    </Link>
  )
}

function AuthenticatedGoalList() {
  const { hasError, isReady, retry } = useCurrentUserInitialization()
  const goals = useQuery(api.goals.listActiveGoals, isReady ? {} : 'skip')
  const streakStatus = useQuery(api.users.getStreakStatus, isReady ? {} : 'skip')
  const recoverable = streakStatus?.streakStatus === 'atRisk' && streakStatus.recoveryAvailable

  if (hasError) {
    return (
      <div className="mt-2">
        <LoadFailure message="Goalを読み込めませんでした。" onRetry={retry} />
      </div>
    )
  }
  if (!isReady || goals === undefined) {
    return <div className="mt-2"><LoadingState label="Goalを読み込んでいます。" /></div>
  }
  if (goals.length === 0) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-text-muted">まだGoalがありません。続けたいことを1つ作ってみよう。</p>
        <CreateGoalLink />
      </>
    )
  }

  return (
    <>
      <div className="mt-3">
        {goals.map((goal) => <GoalCard goal={goal} key={goal._id} recoverable={recoverable} />)}
      </div>
      <CreateGoalLink />
    </>
  )
}

// ログイン中はConvexの実データを、未ログイン中はlocalStorageのGuest状態を出す
// （docs/user-flow.md #0: 最初のPDCA・ガチャ体験より前にログインを要求しない）。
function GoalSection() {
  const { isSignedIn } = useCurrentUserInitialization()
  return isSignedIn ? <AuthenticatedGoalList /> : <GuestGoalSection />
}

// 進行中PDCAはGoal一覧より上に表示する（ui-spec 7）。未ログイン中は
// GuestGoalSection側が同じ役割を兼ねるため、ここでは何も出さない。
function AuthenticatedActiveCycle() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  if (!isSignedIn) return null
  return <ActiveCycleCard isReady={isReady} />
}

// Streak/今日の周回数はServer側の実データを表示する。ログイン前は
// 何も達成していないのに「0」を見せてしまうため、この節ごと出さない。
function TodaySummary() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const summary = useQuery(api.history.getHistorySummary, isSignedIn && isReady ? {} : 'skip')
  if (!isSignedIn) return null
  const currentStreak = summary?.currentStreak ?? 0
  const todayCycles = summary?.todayCycles ?? 0

  return (
    <div className="flex gap-6 text-sm text-text-muted">
      <span className="inline-flex items-center gap-1"><Flame aria-hidden="true" className="size-4 text-attention-subtle" />{currentStreak}日</span>
      <span className="inline-flex items-center gap-1"><RotateCcw aria-hidden="true" className="size-4 text-choice-info" />今日 {todayCycles}周</span>
    </div>
  )
}

// Riveの実験を兼ねた飾り。ログイン状態やコレクションに関係なく常に出す。
// タップするとhappyアニメーションが再生される。
function HomeMascot() {
  const asset = getRiveAsset('にんじゃわんこ')
  if (!asset) return null

  return (
    <RiveAnimation
      alt="にんじゃわんこ"
      artboard={asset.artboard}
      className="size-16 shrink-0"
      fallbackSrc={asset.fallbackSrc}
      src={asset.src}
      stateMachine={asset.stateMachine}
      tapTrigger={asset.tapTrigger}
    />
  )
}

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">今日の一歩</p>
          <SectionHeading>今日も1周だけ回そう。</SectionHeading>
          {isClerkConfigured ? <TodaySummary /> : null}
        </div>
        <HomeMascot />
      </section>

      {/* ui-spec #6.2: 進行中PDCA(1) → ストリーク危機(2) → 今日のミッション(3) の順に出す。 */}
      {isClerkConfigured ? <PartnerBanner /> : null}
      {isClerkConfigured ? <AuthenticatedActiveCycle /> : null}
      {isClerkConfigured ? <AtRiskBanner /> : null}
      {isClerkConfigured ? <DailyMissionCard /> : null}

      <section aria-labelledby="home-goal-heading" className="border-y border-border-subtle py-5">
        <p className="text-sm font-medium text-text-subtle">続けたいこと</p>
        <h2 id="home-goal-heading" className="mt-1 text-lg font-bold leading-snug">
          Goalを作って、<span className="block sm:inline">最初の1周を始めよう</span>
        </h2>
        {isClerkConfigured ? (
          <GoalSection />
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-text-muted">小さな行動から始められます。</p>
            <CreateGoalLink />
          </>
        )}
      </section>

      {isClerkConfigured ? <GachaTicketCard /> : null}
    </div>
  )
}
