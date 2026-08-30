import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { INPUT_LIMITS } from "../../../convex/lib/constants";
import { useGuestState } from "../../hooks/useGuestState";
import { LoadFailure } from "../../components/ui/LoadFailure";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { FirstLoopGuide } from "../../components/ui/OnboardingFocusOverlay";
import { isClerkConfigured } from "../../app/AppProviders";
import { userFacingError } from "../../lib/userFacingError";
import { useCurrentUserInitialization } from "./useCurrentUserInitialization";

function GoalNameForm({
  isSubmitting,
  error,
  isFirstLoop = false,
  onSubmit,
}: {
  isSubmitting: boolean;
  error: string | null;
  isFirstLoop?: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(name);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {isFirstLoop ? (
        <FirstLoopGuide
          message="続けたいテーマをひとつ決めれば、すぐ最初のPLANを選べます。"
          step={1}
          title="続けたいことを決めよう"
        />
      ) : null}
      <label className="block space-y-2" htmlFor="goal-name">
        <span className="text-base font-bold">何を続けたい？</span>
        <input
          autoFocus
          className="min-h-13 w-full rounded-2xl border border-border bg-surface px-4 text-base outline-none transition-colors duration-(--duration-fast) ease-standard focus:border-primary"
          id="goal-name"
          maxLength={INPUT_LIMITS.goalName}
          onChange={(event) => setName(event.target.value)}
          placeholder="英語学習"
          value={name}
        />
      </label>
      {error ? <p className="text-sm text-attention-body">{error}</p> : null}
      <button
        className="min-h-13 w-full rounded-2xl bg-primary px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] disabled:cursor-not-allowed disabled:bg-border"
        disabled={isSubmitting}
        type="submit"
      >
        作成する
      </button>
    </form>
  );
}

function SignedInCreateGoalPage() {
  const navigate = useNavigate();
  const createGoal = useMutation(api.goals.createGoal);
  const { isReady, hasError, retry } = useCurrentUserInitialization();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(name: string) {
    if (!name.trim()) {
      setError("続けたいことを入力してください");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const goalId = await createGoal({ name });
      navigate(`/goal/${goalId}`);
    } catch (caughtError) {
      setError(
        userFacingError(
          caughtError,
          "Goalを作成できませんでした。もう一度試してください。",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hasError) {
    return <LoadFailure message="準備に失敗しました。" onRetry={retry} />;
  }
  if (!isReady) {
    return <p className="text-sm text-text-muted">準備しています。</p>;
  }

  return (
    <GoalNameForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={(name) => void handleSubmit(name)}
    />
  );
}

// docs/user-flow.md #0 / #2: ログイン前でも最小入力でGoalを作れる。
// localStorageへ保存し、ログイン後に migrateGuestData でConvexへ移行する
// （src/app/AppProviders.tsx CurrentUserInitializer参照）。
function GuestCreateGoalPage() {
  const navigate = useNavigate();
  const { setGoal } = useGuestState();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("続けたいことを入力してください");
      return;
    }
    setError(null);
    setGoal({ name: trimmed });
    navigate("/pdca/plan/guest");
  }

  return (
    <GoalNameForm
      error={error}
      isFirstLoop
      isSubmitting={false}
      onSubmit={handleSubmit}
    />
  );
}

function CreateGoalGate() {
  const { isSignedIn } = useCurrentUserInitialization();
  return isSignedIn ? <SignedInCreateGoalPage /> : <GuestCreateGoalPage />;
}

export function CreateGoalPage() {
  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-muted"
        to="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> ホーム
      </Link>
      <SectionHeading>続けたいことを決めよう</SectionHeading>
      {isClerkConfigured ? (
        <CreateGoalGate />
      ) : (
        <p className="text-sm text-text-muted">
          ログイン設定の完了後にGoalを作成できます。
        </p>
      )}
    </div>
  );
}
