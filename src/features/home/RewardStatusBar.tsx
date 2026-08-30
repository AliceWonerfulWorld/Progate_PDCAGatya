import { Ticket } from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { useCurrentUserInitialization } from "../goals/useCurrentUserInitialization";

// 未使用ガチャ(ui-spec #6.2 優先度8)は「今日やること」そのものではない補助情報。
// ミッションは右下の別レイヤーへ分離し、ここではガチャ導線だけを静かに表示する。
export function RewardStatusBar() {
  const { isReady, isSignedIn } = useCurrentUserInitialization();
  const enabled = isSignedIn && isReady;
  const currentUser = useQuery(api.users.currentUser, enabled ? {} : "skip");

  if (!enabled) return null;

  const draws = currentUser?.availableGachaDraws ?? 0;
  const hasDraws = draws > 0;
  if (!hasDraws) return null;

  return (
    <section className="rounded-3xl border border-reward-border bg-reward-bg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-reward-text">
            REWARD READY
          </p>
          <h2 className="mt-2 text-lg font-black text-text-strong">
            ガチャチケット × {draws}
          </h2>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            1周したあとのごほうびが待っています。
          </p>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-surface text-reward shadow-sm">
          <Ticket aria-hidden="true" className="size-5" />
        </div>
      </div>
      <Link
        className="mt-4 flex min-h-11 items-center justify-center rounded-2xl bg-reward px-4 text-sm font-black text-white transition-colors duration-(--duration-fast) ease-standard active:scale-[0.98]"
        to="/gacha"
      >
        ガチャを回す
      </Link>
    </section>
  );
}
