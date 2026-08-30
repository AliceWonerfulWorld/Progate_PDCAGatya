import { Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { isClerkConfigured } from "../../app/AppProviders";
import { useGuestState } from "../../hooks/useGuestState";
import { getGuestOnboardingRoute } from "../../lib/guestOnboarding";
import { LoadFailure } from "../../components/ui/LoadFailure";
import { LoadingState } from "../../components/ui/LoadingState";
import { GoalList } from "../goals/GoalList";
import { GuestGoalSection } from "../goals/GuestGoalSection";
import { ActiveCycleCard } from "../pdca/ActiveCycleCard";
import { useCurrentUserInitialization } from "../goals/useCurrentUserInitialization";
import { AtRiskBanner } from "./AtRiskBanner";
import { GuestHomeHeader, HomeHeader } from "./HomeHeader";
import { DailyMissionCard } from "./MissionFab";
import { RewardStatusBar } from "./RewardStatusBar";
import { TodayPdcaCard } from "./TodayPdcaCard";

function CreateGoalLink() {
  return (
    <Link
      className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-black text-text-body shadow-sm transition-colors duration-(--duration-fast) ease-standard active:scale-[0.98]"
      to="/goals/new"
    >
      <Plus aria-hidden="true" className="size-4" /> Goalを作る
    </Link>
  );
}

function AuthenticatedGoalList({ canStart }: { canStart: boolean }) {
  const { hasError, isReady, retry } = useCurrentUserInitialization();
  const goals = useQuery(api.goals.listActiveGoals, isReady ? {} : "skip");
  const streakStatus = useQuery(
    api.users.getStreakStatus,
    isReady ? {} : "skip",
  );
  const summary = useQuery(
    api.history.getHistorySummary,
    isReady ? {} : "skip",
  );
  const recoverable =
    streakStatus?.streakStatus === "atRisk" && streakStatus.recoveryAvailable;

  if (hasError) {
    return (
      <div className="mt-2">
        <LoadFailure message="Goalを読み込めませんでした。" onRetry={retry} />
      </div>
    );
  }
  if (!isReady || goals === undefined) {
    return (
      <div className="mt-2">
        <LoadingState label="Goalを読み込んでいます。" />
      </div>
    );
  }
  if (goals.length === 0) {
    return (
      <section className="mt-3 rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm">
        <p className="text-xs font-black tracking-[0.12em] text-primary">
          FIRST GOAL
        </p>
        <h2 className="mt-2 text-xl font-black text-text-strong">
          まずは続けたいことを決めよう
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          英語学習や筋トレなど、続けたいことを1つ登録してみよう。
        </p>
        <CreateGoalLink />
      </section>
    );
  }

  if (!canStart) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          いまのPDCAを終えると、次のPLANを始められます。
        </p>
        <GoalList goals={goals} />
        <CreateGoalLink />
      </>
    );
  }

  return (
    <>
      <TodayPdcaCard
        goal={goals[0]}
        recoverable={recoverable}
        todayComplete={(summary?.todayCycles ?? 0) > 0}
      />
      {goals.length > 1 ? (
        <section aria-labelledby="other-goals-heading" className="mt-7">
          <p className="text-xs font-black tracking-[0.12em] text-text-subtle">
            OTHER GOALS
          </p>
          <h3
            id="other-goals-heading"
            className="mt-1 text-base font-black text-text-strong"
          >
            別のことから始める
          </h3>
          <GoalList goals={goals.slice(1)} />
          <Link
            className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-black text-primary"
            to="/goals"
          >
            Goal一覧を見る
          </Link>
        </section>
      ) : null}
      <CreateGoalLink />
    </>
  );
}

// ログイン中はConvexの実データを、未ログイン中はlocalStorageのGuest状態を出す
// （docs/user-flow.md #0: 最初のPDCA・ガチャ体験より前にログインを要求しない）。
function GoalSection({ canStart }: { canStart: boolean }) {
  const { isSignedIn } = useCurrentUserInitialization();
  return isSignedIn ? (
    <AuthenticatedGoalList canStart={canStart} />
  ) : (
    <GuestGoalSection />
  );
}

// 進行中PDCAはサーバー側で1件に制限する。Homeではこの1件を最優先に見せ、
// 完了するまで新しいPLAN開始導線を表示しない。
function useActiveCycle() {
  const { isReady, isSignedIn } = useCurrentUserInitialization();
  const active = useQuery(
    api.pdca.getActiveCycle,
    isSignedIn && isReady ? {} : "skip",
  );
  return { active, isSignedIn };
}

function AuthenticatedHome() {
  const { active, isSignedIn } = useActiveCycle();

  if (!isSignedIn) {
    return <GuestHome />;
  }

  const hasActiveCycle = active !== undefined && active !== null;
  const isActiveCycleLoading = active === undefined;

  return (
    <div className="space-y-6">
      <HomeHeader />

      {/* ui-spec #6.2: 進行中PDCA(1) → ストリーク危機(2) の順に最優先で出す。 */}
      {isSignedIn && active !== undefined ? (
        <ActiveCycleCard active={active} />
      ) : null}
      <AtRiskBanner blockNewCycle={active !== null} />

      <section aria-labelledby="home-goal-heading">
        <h2 className="sr-only" id="home-goal-heading">
          {isActiveCycleLoading
            ? "進行中のPDCAを確認中"
            : hasActiveCycle
              ? "次にやること"
              : "今日の1周を始めよう"}
        </h2>
        <GoalSection canStart={active === null} />
      </section>

      <DailyMissionCard />
      <RewardStatusBar />
    </div>
  );
}

// Clerk未設定のローカル環境向け。Convexを一切叩かず、Guest導線だけを出す。

function GuestHome() {
  const { state } = useGuestState();

  if (getGuestOnboardingRoute(state)) {
    return <Navigate replace to="/welcome" />;
  }

  return (
    <div className="space-y-6">
      <GuestHomeHeader />
      <section aria-labelledby="home-goal-heading">
        <h2 className="sr-only" id="home-goal-heading">
          今日の1周を始めよう
        </h2>
        <GuestGoalSection />
      </section>
    </div>
  );
}

export function HomePage() {
  return isClerkConfigured ? <AuthenticatedHome /> : <GuestHome />;
}
