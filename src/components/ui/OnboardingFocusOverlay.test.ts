import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OnboardingFocusOverlay } from "./OnboardingFocusOverlay";

describe("OnboardingFocusOverlay", () => {
  it("shows a compact, non-blocking first-loop guide", () => {
    const html = renderToStaticMarkup(
      createElement(OnboardingFocusOverlay, {
        message: "このボタンを押して、次へ進もう",
        rect: {
          bottom: 420,
          height: 48,
          left: 16,
          right: 360,
          top: 372,
          width: 344,
        },
      }),
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("このボタンを押して、次へ進もう");
    expect(html).toContain("FIRST LOOP");
    expect(html).not.toContain("fixed inset-0");
  });
});
