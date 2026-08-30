import { X } from "lucide-react";
import { useState } from "react";
import type { GachaRates } from "../../../convex/lib/gacha";

// GachaPage.tsx の RARITY_STYLES と同じトークン参照。ここでは背景/枠は使わず
// 文字色のみでレアリティを区別する(表形式のため)。
const RARITY_TEXT_STYLES: Record<keyof GachaRates, string> = {
  SSR: "text-rarity-ssr",
  SR: "text-rarity-sr",
  R: "text-rarity-r",
};

const RARITY_ORDER: (keyof GachaRates)[] = ["SSR", "SR", "R"];

function formatRatePercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

// ガチャ選択後の待機画面から開く排出率のボトムシート(docs/game-design.md #22 必須項目「排出率」)。
// レアリティごとの排出率のみを表示する。同レアリティ内のキャラ別重み付けは
// 未確定仕様(docs/game-design.md #25)のため、ここでは扱わない。
export function GachaRateButton({ rates }: { rates: GachaRates | undefined }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-expanded={isOpen}
        className="text-xs font-semibold text-text-subtle underline decoration-border-subtle underline-offset-2"
        disabled={rates === undefined}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        排出率を見る
      </button>
      {isOpen && rates ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end bg-text/30 p-4 backdrop-blur-[2px]"
          role="dialog"
        >
          <section
            aria-labelledby="gacha-rate-heading"
            className="mx-auto w-full max-w-[32.5rem] rounded-3xl border border-border-subtle bg-surface p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                className="text-lg font-black text-text-strong"
                id="gacha-rate-heading"
              >
                排出率
              </h2>
              <button
                aria-label="排出率を閉じる"
                className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-text-muted"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <table className="mt-4 w-full text-sm">
              <tbody>
                {RARITY_ORDER.map((rarity) => (
                  <tr className="border-t border-border-subtle first:border-t-0" key={rarity}>
                    <td className={`py-3 font-black tracking-wide ${RARITY_TEXT_STYLES[rarity]}`}>
                      {rarity}
                    </td>
                    <td className="py-3 text-right font-semibold text-text-body">
                      {formatRatePercent(rates[rarity])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </>
  );
}
