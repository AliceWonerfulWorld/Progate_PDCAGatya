import { ArrowLeft, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { isClerkConfigured } from "../../app/AppProviders";
import { LoadFailure } from "../../components/ui/LoadFailure";
import { LoadingState } from "../../components/ui/LoadingState";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SignInPrompt } from "../../components/ui/SignInPrompt";
import { GoalCard } from "./GoalCard";
import { useCurrentUserInitialization } from "./useCurrentUserInitialization";

function AuthenticatedGoals() {
  const { hasError, isReady, isSignedIn, retry } =
    useCurrentUserInitialization();
  const enabled = isReady && isSignedIn;
  const goals = useQuery(api.goals.listActiveGoals, enabled ? {} : "skip");
  if (!isSignedIn)
    return (
      <SignInPrompt message="ログインすると、続けたいことをまとめて確認できます。" />
    );
  if (hasError)
    return (
      <LoadFailure message="Goal一覧を読み込めませんでした。" onRetry={retry} />
    );
  if (!enabled || goals === undefined)
    return <LoadingState label="Goal一覧を読み込んでいます。" />;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-primary-border bg-primary-subtle p-5 shadow-sm">
        <p className="text-xs font-black tracking-[0.14em] text-primary">
          YOUR GOALS
        </p>
        <p className="mt-2 text-2xl font-black tracking-tight text-text-strong">
          続けたいこと
        </p>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          いま取り組んでいるGoalを選ぼう。
        </p>
        <p className="mt-4 inline-flex rounded-full bg-surface px-3 py-1 text-sm font-black text-primary">
          {goals.length}件
        </p>
      </section>
      {goals.length === 0 ? (
        <section className="rounded-3xl border border-border-subtle bg-surface p-5 text-center shadow-sm">
          <p className="text-base font-black text-text-strong">
            最初のGoalを作ろう
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface px-4 shadow-sm">
          {goals.map((goal) => (
            <GoalCard goal={goal} key={goal._id} showAction={false} />
          ))}
        </section>
      )}
      <Link
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 text-sm font-black text-text-body shadow-sm"
        to="/goals/new"
      >
        <Plus aria-hidden="true" className="size-4" /> 新しいGoalを追加
      </Link>
    </div>
  );
}

export function GoalsPage() {
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-muted"
        to="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      <SectionHeading>Goal一覧</SectionHeading>
      {isClerkConfigured ? (
        <AuthenticatedGoals />
      ) : (
        <p className="text-sm text-text-muted">
          ログイン設定の完了後にGoal一覧を表示できます。
        </p>
      )}
    </div>
  );
}
