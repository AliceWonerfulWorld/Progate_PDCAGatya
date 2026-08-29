import { Plus } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { isClerkConfigured } from '../../app/AppProviders'
import { LoadFailure } from '../../components/ui/LoadFailure'
import { LoadingState } from '../../components/ui/LoadingState'
import { GoalList } from '../goals/GoalList'
import { GuestGoalSection } from '../goals/GuestGoalSection'
import { ActiveCycleCard } from '../pdca/ActiveCycleCard'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'
import { AtRiskBanner } from './AtRiskBanner'
import { GuestHomeHeader, HomeHeader } from './HomeHeader'
import { MissionFab } from './MissionFab'
import { RewardStatusBar } from './RewardStatusBar'
import { TodayPdcaCard } from './TodayPdcaCard'

function CreateGoalLink() {
  return (
    <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary" to="/goals/new">
      <Plus aria-hidden="true" className="size-4" /> Goalを作る
    </Link>
  )
}

function AuthenticatedGoalList({ canStart }: { canStart: boolean }) {
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

  if (!canStart) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-text-muted">いまのPDCAを終えると、次のPLANを始められます。</p>
        <GoalList goals={goals} />
        <CreateGoalLink />
      </>
    )
  }

  return (
    <>
      <TodayPdcaCard goal={goals[0]} recoverable={recoverable} />
      {goals.length > 1 ? (
        <section aria-labelledby="other-goals-heading" className="mt-6">
          <p className="text-sm font-medium text-text-subtle">ほかのGoal</p>
          <h3 id="other-goals-heading" className="mt-1 text-base font-bold">別のことから始める</h3>
          <GoalList goals={goals.slice(1)} />
        </section>
      ) : null}
      <CreateGoalLink />
    </>
  )
}

// ログイン中はConvexの実データを、未ログイン中はlocalStorageのGuest状態を出す
// （docs/user-flow.md #0: 最初のPDCA・ガチャ体験より前にログインを要求しない）。
function GoalSection({ canStart }: { canStart: boolean }) {
  const { isSignedIn } = useCurrentUserInitialization()
  return isSignedIn ? <AuthenticatedGoalList canStart={canStart} /> : <GuestGoalSection />
}

// 進行中PDCAはサーバー側で1件に制限する。Homeではこの1件を最優先に見せ、
// 完了するまで新しいPLAN開始導線を表示しない。
function useActiveCycle() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const active = useQuery(api.pdca.getActiveCycle, isSignedIn && isReady ? {} : 'skip')
  return { active, isSignedIn }
}

function AuthenticatedHome() {
  const { active, isSignedIn } = useActiveCycle()
  const hasActiveCycle = active !== undefined && active !== null
  const isActiveCycleLoading = isSignedIn && active === undefined

  return (
    <div className="space-y-6">
      <HomeHeader />

      {/* ui-spec #6.2: 進行中PDCA(1) → ストリーク危機(2) の順に最優先で出す。 */}
      {isSignedIn && active !== undefined ? <ActiveCycleCard active={active} /> : null}
      <AtRiskBanner blockNewCycle={active !== null} />

      <section aria-labelledby="home-goal-heading" className="border-t border-border-subtle pt-5">
        <p className="text-sm font-medium text-text-subtle">続けたいこと</p>
        <h2 id="home-goal-heading" className="mt-1 text-lg font-bold leading-snug">
          {isActiveCycleLoading ? '進行中のPDCAを確認中' : hasActiveCycle ? '次にやること' : '今日の1周を始めよう'}
        </h2>
        <GoalSection canStart={active === null} />
      </section>

      <RewardStatusBar />
      <MissionFab />
    </div>
  )
}

// Clerk未設定のローカル環境向け。Convexを一切叩かず、Guest導線だけを出す。




function GuestHome() {
  return (
    <div className="space-y-6">
      <GuestHomeHeader />
      <section aria-labelledby="home-goal-heading" className="border-t border-border-subtle pt-5">
        <p className="text-sm font-medium text-text-subtle">続けたいこと</p>
        <h2 id="home-goal-heading" className="mt-1 text-lg font-bold leading-snug">
          Goalを作って、<span className="block sm:inline">最初の1周を始めよう</span>
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">小さな行動から始められます。</p>
        <CreateGoalLink />
      </section>
    </div>
  )
}

export function HomePage() {
  return isClerkConfigured ? <AuthenticatedHome /> : <GuestHome />
}
