import { Flame, RotateCcw, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { RiveAnimation } from "../../components/ui/RiveAnimation";
import { getRiveAsset } from "../../lib/riveAssets";
import { useCurrentUserInitialization } from "../goals/useCurrentUserInitialization";

function Mascot({ name, imagePath }: { name: string; imagePath?: string }) {
  const asset = getRiveAsset(name);
  if (asset)
    return (
      <RiveAnimation
        alt={name}
        artboard={asset.artboard}
        className="size-24 shrink-0"
        fallbackSrc={asset.fallbackSrc}
        src={asset.src}
        stateMachine={asset.stateMachine}
        tapTrigger={asset.tapTrigger}
      />
    );
  if (!imagePath) return null;
  return (
    <img
      alt={name}
      className="size-24 shrink-0 object-contain"
      src={imagePath}
    />
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3 shadow-sm">
      <Icon aria-hidden="true" className="size-4 text-primary" />
      <p className="mt-1 text-base font-black tracking-tight text-text-strong">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-black tracking-[0.1em] text-text-subtle">
        {label}
      </p>
    </div>
  );
}

function HeroFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-primary-border bg-primary-subtle p-5 shadow-sm">
      {children}
    </section>
  );
}

export function GuestHomeHeader() {
  return (
    <HeroFrame>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-primary">
            TODAY'S STEP
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
            今日も1周だけ
            <br />
            回してみよう。
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
            小さな一歩から、続けたいことを始めよう。
          </p>
        </div>
        <Mascot name="にんじゃわんこ" />
      </div>
    </HeroFrame>
  );
}

export function HomeHeader() {
  const { isReady, isSignedIn } = useCurrentUserInitialization();
  const enabled = isSignedIn && isReady;
  const summary = useQuery(
    api.history.getHistorySummary,
    enabled ? {} : "skip",
  );
  const collection = useQuery(
    api.characters.listCollection,
    enabled ? {} : "skip",
  );
  const currentUser = useQuery(api.users.currentUser, enabled ? {} : "skip");
  const partner = collection?.find((entry) => entry.isPartner);
  const done = (summary?.todayCycles ?? 0) > 0;

  return (
    <HeroFrame>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-[0.14em] text-primary">
            TODAY'S STEP
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-text-strong">
            {done ? "今日も積み上がったね。" : "今日も1周だけやろう！"}
          </h1>
          {partner ? (
            <p className="mt-3 rounded-2xl bg-surface/80 px-3 py-2 text-sm font-semibold leading-5 text-text-muted">
              「{partner.character.defaultMessage ?? "今日も1周だけやろう"}」
            </p>
          ) : (
            <Link
              className="mt-3 inline-flex text-sm font-bold text-primary"
              to="/collection"
            >
              相棒を選ぶと、ここに応援に来てくれます
            </Link>
          )}
        </div>
        {partner ? (
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-3xl bg-surface shadow-sm">
            <Mascot
              imagePath={partner.character.imagePath}
              name={partner.character.name}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat
          icon={Flame}
          label="STREAK"
          value={`${summary?.currentStreak ?? 0}日`}
        />
        <Stat
          icon={RotateCcw}
          label="TODAY"
          value={`${summary?.todayCycles ?? 0}周`}
        />
        <Stat
          icon={Sparkles}
          label="PLAYER"
          value={`Lv.${currentUser?.playerLevel ?? 1}`}
        />
      </div>
    </HeroFrame>
  );
}
