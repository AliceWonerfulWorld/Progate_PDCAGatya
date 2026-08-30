import {
  ChevronRight,
  Flame,
  Pencil,
  RefreshCw,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { CollectionEntry } from "../../../convex/characters";
import { INPUT_LIMITS, PUSH } from "../../../convex/lib/constants";
import { requiredXpForLevel } from "../../../convex/lib/playerLevel";
import { isClerkConfigured } from "../../app/AppProviders";
import { LoadFailure } from "../../components/ui/LoadFailure";
import { LoadingState } from "../../components/ui/LoadingState";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SignInPrompt } from "../../components/ui/SignInPrompt";
import {
  choiceButtonClass,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "../../lib/buttonStyles";
import { useCurrentUserInitialization } from "../goals/useCurrentUserInitialization";
import { usePushSubscription } from "./usePushSubscription";

function DisplayNameEditor({ currentUser }: { currentUser: Doc<"users"> }) {
  const setDisplayName = useMutation(api.users.setDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentUser.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError("表示名を入力してください");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await setDisplayName({ displayName: value });
      setIsEditing(false);
    } catch {
      setError("保存できませんでした。もう一度試してください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <p className="truncate text-3xl font-black tracking-tight text-text-strong">
          {currentUser.displayName ?? "名前をつけよう"}
        </p>
        <button
          aria-label="表示名を編集"
          className={`grid size-10 shrink-0 place-items-center rounded-2xl ${SECONDARY_BUTTON_CLASS}`}
          onClick={() => setIsEditing(true)}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <label className="sr-only" htmlFor="display-name">
        表示名
      </label>
      <input
        autoFocus
        className="min-h-12 w-full rounded-2xl border border-border bg-surface px-4 text-lg font-bold text-text outline-none transition-colors duration-(--duration-fast) ease-standard focus:border-primary"
        id="display-name"
        maxLength={INPUT_LIMITS.displayName}
        onChange={(event) => setValue(event.target.value)}
        placeholder="表示名"
        value={value}
      />
      {error ? (
        <p className="text-sm font-semibold text-attention-body">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <button
          className={`min-h-11 rounded-2xl px-4 text-sm font-bold text-white ${PRIMARY_BUTTON_CLASS}`}
          disabled={isSubmitting}
          type="submit"
        >
          保存する
        </button>
        <button
          className={`min-h-11 rounded-2xl px-4 text-sm font-bold ${SECONDARY_BUTTON_CLASS}`}
          onClick={() => {
            setIsEditing(false);
            setValue(currentUser.displayName ?? "");
            setError(null);
          }}
          type="button"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function PlayerCard({
  currentUser,
  partner,
}: {
  currentUser: Doc<"users">;
  partner: CollectionEntry | undefined;
}) {
  const levelFloorXp = requiredXpForLevel(currentUser.playerLevel);
  const levelCeilXp = requiredXpForLevel(currentUser.playerLevel + 1);
  const progressXp = Math.max(0, currentUser.playerXp - levelFloorXp);
  const progressRange = Math.max(1, levelCeilXp - levelFloorXp);
  const progressPercent = Math.min(
    100,
    Math.round((progressXp / progressRange) * 100),
  );
  return (
    <section className="overflow-hidden rounded-3xl border border-primary-border bg-primary-subtle shadow-sm">
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 pt-1 text-xs font-black tracking-[0.16em] text-primary">
            <Sparkles aria-hidden="true" className="size-4" />
            PLAYER STATUS
          </div>
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-surface shadow-sm">
            {partner ? (
              <img
                alt={`${partner.character.name}（現在の相棒）`}
                className="size-full object-contain p-1"
                src={partner.character.imagePath}
              />
            ) : (
              <UserRound
                aria-hidden="true"
                className="size-7 text-text-disabled"
              />
            )}
          </div>
        </div>
        <DisplayNameEditor currentUser={currentUser} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-black text-white">
            Lv.{currentUser.playerLevel}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-bold text-text-body">
            {currentUser.currentTitle ?? "称号なし"}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-bold text-text-body">次のレベルまで</p>
            <p className="text-sm font-black text-primary">
              {progressXp.toLocaleString()}{" "}
              <span className="font-bold text-text-muted">
                / {progressRange.toLocaleString()} XP
              </span>
            </p>
          </div>
          <div
            aria-label={`レベル ${currentUser.playerLevel} のXP進捗 ${progressPercent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressPercent}
            className="h-4 overflow-hidden rounded-full bg-surface"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-(--duration-normal) ease-standard"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-text-muted">
            合計 {currentUser.playerXp.toLocaleString()} XP
          </p>
        </div>
      </div>
    </section>
  );
}

const recordCards = [
  {
    icon: RefreshCw,
    label: "累計PDCA",
    value: (user: Doc<"users">) => `${user.totalCycles.toLocaleString()}周`,
  },
  {
    icon: Flame,
    label: "現在のStreak",
    value: (user: Doc<"users">) => `${user.currentStreak.toLocaleString()}日`,
  },
  {
    icon: Trophy,
    label: "最長Streak",
    value: (user: Doc<"users">) => `${user.longestStreak.toLocaleString()}日`,
  },
  {
    icon: Sparkles,
    label: "累計ガチャ",
    value: (user: Doc<"users">) => `${user.totalGachaDraws.toLocaleString()}回`,
  },
];

function Records({ currentUser }: { currentUser: Doc<"users"> }) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg font-black text-text-strong">あなたの記録</h2>
        <p className="mt-0.5 text-sm font-semibold text-text-muted">
          続けてきた分だけ、ここに増えていく
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {recordCards.map(({ icon: Icon, label, value }) => (
          <article
            className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
            key={label}
          >
            <Icon aria-hidden="true" className="size-5 text-primary" />
            <p className="mt-3 text-2xl font-black tracking-tight text-text-strong">
              {value(currentUser)}
            </p>
            <p className="mt-1 text-xs font-bold text-text-subtle">{label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PartnerCard({ partner }: { partner: CollectionEntry | undefined }) {
  if (!partner)
    return (
      <section className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-surface-muted text-text-disabled">
            <UserRound
              aria-hidden="true"
              className="size-10 fill-text-disabled stroke-text-disabled"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[0.16em] text-text-subtle">
              YOUR PARTNER
            </p>
            <h2 className="mt-1 text-lg font-black text-text-strong">
              一緒に続ける相棒を選ぼう
            </h2>
            <p className="mt-1 text-sm leading-5 text-text-muted">
              PDCAを一周すると、新しい仲間に出会えます。
            </p>
          </div>
        </div>
        <Link
          className={`mt-5 flex min-h-12 items-center justify-center rounded-2xl px-4 text-sm font-black text-white ${PRIMARY_BUTTON_CLASS}`}
          to="/collection"
        >
          相棒を選ぶ
        </Link>
      </section>
    );
  return (
    <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-sm">
      <div className="flex gap-4 p-5">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-primary-subtle">
          <img
            alt={partner.character.name}
            className="size-full object-contain p-1"
            src={partner.character.imagePath}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-[0.16em] text-primary">
            YOUR PARTNER
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            {partner.character.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            「
            {partner.character.defaultMessage ??
              "今日も一緒に、1周ずつ進めよう"}
            」
          </p>
        </div>
      </div>
      <Link
        className={`flex min-h-12 items-center justify-center gap-1 rounded-none border-x-0 border-b-0 border-t border-border-subtle px-4 text-sm font-black ${SECONDARY_BUTTON_CLASS}`}
        to="/collection"
      >
        相棒を変更 <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

function ProfileSettings({ currentUser }: { currentUser: Doc<"users"> }) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg font-black text-text-strong">
          プロフィール設定
        </h2>
        <p className="mt-0.5 text-sm font-semibold text-text-muted">
          必要なときだけ、ここから確認
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border-subtle px-4">
          <span className="text-sm font-bold text-text-body">表示名</span>
          <span className="truncate text-sm font-semibold text-text-muted">
            {currentUser.displayName ?? "未設定"}
          </span>
        </div>
        <div className="flex min-h-14 items-center justify-between gap-4 px-4">
          <span className="text-sm font-bold text-text-body">タイムゾーン</span>
          <span className="truncate text-sm font-semibold text-text-muted">
            {currentUser.timezone}
          </span>
        </div>
      </div>
    </section>
  );
}

const NOTIFY_HOUR_LABELS: Record<number, string> = {
  7: "7:00",
  10: "10:00",
  19: "19:00",
  21: "21:00",
};

// docs/ui-spec.md #25.2 / Push Notification (At-Riskトリガー)。初回ロード時に
// 通知許可を求めることは絶対にしない(docs/ui-spec.md #3.3) — 許可のリクエストは
// 「有効」ボタン押下(enable())からしか発火しない。
function NotificationSettings() {
  const {
    supportStatus,
    isSubscribed,
    notifyHours,
    isBusy,
    error,
    isConfigured,
    enable,
    disable,
    setNotifyHours,
  } = usePushSubscription();

  if (!isConfigured) return null;

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg font-black text-text-strong">ストリーク通知</h2>
        <p className="mt-0.5 text-sm font-semibold text-text-muted">
          ストリークが途切れそうなときだけ、選んだ時刻にお知らせします
        </p>
      </div>
      <div className="space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
        {supportStatus === "checking" ? (
          <p className="text-sm font-semibold text-text-muted">
            確認しています…
          </p>
        ) : supportStatus === "unsupported" ? (
          <p className="text-sm leading-6 text-text-muted">
            お使いのブラウザは通知に対応していません。
          </p>
        ) : supportStatus === "ios-needs-install" ? (
          <p className="text-sm leading-6 text-text-muted">
            ホーム画面に追加すると、通知を受け取れるようになります。
          </p>
        ) : (
          <>
            <div aria-label="通知の有効/無効" className="flex gap-2" role="group">
              <button
                aria-pressed={isSubscribed}
                className={`min-h-11 flex-1 rounded-2xl text-sm font-bold ${choiceButtonClass(isSubscribed)}`}
                disabled={isBusy}
                onClick={() =>
                  void enable(
                    notifyHours.length > 0
                      ? notifyHours
                      : [PUSH.notifyHourPresets[1]],
                  )
                }
                type="button"
              >
                有効
              </button>
              <button
                aria-pressed={!isSubscribed}
                className={`min-h-11 flex-1 rounded-2xl text-sm font-bold ${choiceButtonClass(!isSubscribed)}`}
                disabled={isBusy}
                onClick={() => void disable()}
                type="button"
              >
                無効
              </button>
            </div>
            {isSubscribed ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-subtle">
                  通知する時刻
                </p>
                <div aria-label="通知時刻" className="flex flex-wrap gap-2" role="group">
                  {PUSH.notifyHourPresets.map((hour) => {
                    const selected = notifyHours.includes(hour);
                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-10 rounded-2xl px-4 text-sm font-bold ${choiceButtonClass(selected, "info")}`}
                        disabled={isBusy}
                        key={hour}
                        onClick={() => {
                          const next = selected
                            ? notifyHours.filter((h) => h !== hour)
                            : [...notifyHours, hour];
                          if (next.length === 0) return;
                          void setNotifyHours(next);
                        }}
                        type="button"
                      >
                        {NOTIFY_HOUR_LABELS[hour] ?? `${hour}:00`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm font-semibold text-attention-body">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

// docs/ui-spec.md #25 / AC-PROFILE-001。既存の users と Collection Query を表示専用で利用する。
function AuthenticatedProfile() {
  const { hasError, isReady, isSignedIn, retry } =
    useCurrentUserInitialization();
  const enabled = isReady && isSignedIn;
  const currentUser = useQuery(api.users.currentUser, enabled ? {} : "skip");
  const collection = useQuery(
    api.characters.listCollection,
    enabled ? {} : "skip",
  );
  if (!isSignedIn)
    return (
      <SignInPrompt message="ログインすると、あなたのPDCAの積み重ねを確認できます。" />
    );
  if (hasError)
    return (
      <LoadFailure
        message="プロフィールを読み込めませんでした。"
        onRetry={retry}
      />
    );
  if (!enabled || currentUser === undefined || collection === undefined)
    return <LoadingState label="プロフィールを読み込んでいます。" />;
  return (
    <div className="space-y-8">
      <PlayerCard
        currentUser={currentUser}
        partner={collection.find((entry) => entry.isPartner)}
      />
      <Records currentUser={currentUser} />
      <PartnerCard partner={collection.find((entry) => entry.isPartner)} />
      <ProfileSettings currentUser={currentUser} />
      <NotificationSettings />
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <SectionHeading>プロフィール</SectionHeading>
      {isClerkConfigured ? (
        <AuthenticatedProfile />
      ) : (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-semibold leading-6 text-text-muted">
          あなたのPDCAの積み重ねが、ここに表示されます。
        </p>
      )}
    </div>
  );
}
