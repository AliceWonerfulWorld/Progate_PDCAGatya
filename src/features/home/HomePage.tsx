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
import { RewardStatusBar } from './RewardStatusBar'

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
      <GoalList goals={goals} recoverable={recoverable} />
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

// 進行中PDCAの有無は見出し文言を変えるため、HomePage側で一度だけ判定する。
// MVPは複数同時進行を許可する（ui-spec #7 は「1つを推奨」であって禁止ではなく、
// startPdcaCycle 側にも既存Cycleのチェックは無い）ため、進行中があっても
// Goalの開始CTAは残す。
function useActiveCycle() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const active = useQuery(api.pdca.getActiveCycle, isSignedIn && isReady ? {} : 'skip')
  return { active: active ?? null, isSignedIn }
}

function AuthenticatedHome() {
  const { active, isSignedIn } = useActiveCycle()
  const hasActiveCycle = active !== null

  return (
    <div className="space-y-6">
      <HomeHeader />

      {/* ui-spec #6.2: 進行中PDCA(1) → ストリーク危機(2) の順に最優先で出す。 */}
      {isSignedIn ? <ActiveCycleCard active={active} /> : null}
      <AtRiskBanner />

      <section aria-labelledby="home-goal-heading" className="border-t border-border-subtle pt-5">
        <p className="text-sm font-medium text-text-subtle">続けたいこと</p>
        <h2 id="home-goal-heading" className="mt-1 text-lg font-bold leading-snug">
          {hasActiveCycle ? '他のGoal' : '今日の1周を始めよう'}
        </h2>
        <GoalSection />
      </section>

      <RewardStatusBar />
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
