import {
  ArrowRight,
  Check,
  CircleDotDashed,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { isClerkConfigured } from "../../app/AppProviders";
import { useCurrentUserInitialization } from "../../app/CurrentUserInitialization";
import { useGuestState } from "../../hooks/useGuestState";
import { getGuestOnboardingRoute } from "../../lib/guestOnboarding";
import { PRIMARY_BUTTON_CLASS } from "../../lib/buttonStyles";

export function WelcomeScreen() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-sm flex-col justify-center py-6">
      <section className="overflow-hidden rounded-3xl border border-primary-border bg-primary-subtle p-6 shadow-sm">
        <div className="grid size-14 place-items-center rounded-3xl bg-primary text-white shadow-sm">
          <CircleDotDashed aria-hidden="true" className="size-7" />
        </div>
        <p className="mt-6 text-xs font-black tracking-[0.16em] text-primary">
          WELCOME TO PDCA GACHA
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-text-strong">
          小さく回して、
          <br />
          続ける力をためよう。
        </h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-text-muted">
          PDCAを回したら、ガチャを回せる。今日やることを決めて、振り返って、次の一歩へ。
        </p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-surface p-3 text-center shadow-sm">
            <Check aria-hidden="true" className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-[10px] font-black text-text-muted">PLAN</p>
          </div>
          <div className="rounded-2xl bg-surface p-3 text-center shadow-sm">
            <Sparkles
              aria-hidden="true"
              className="mx-auto size-4 text-primary"
            />
            <p className="mt-2 text-[10px] font-black text-text-muted">
              REFLECT
            </p>
          </div>
          <div className="rounded-2xl bg-surface p-3 text-center shadow-sm">
            <Ticket aria-hidden="true" className="mx-auto size-4 text-reward" />
            <p className="mt-2 text-[10px] font-black text-text-muted">
              REWARD
            </p>
          </div>
        </div>
      </section>
      <Link
        className={`mt-5 flex min-h-13 items-center justify-center gap-2 rounded-2xl px-4 text-base font-black text-white shadow-[0_3px_0_var(--color-primary-active)] ${PRIMARY_BUTTON_CLASS}`}
        to="/goals/new"
      >
        はじめる：最初のGoalを決める{" "}
        <ArrowRight aria-hidden="true" className="size-5" />
      </Link>
      <p className="mt-4 text-center text-xs font-semibold text-text-subtle">
        アカウント登録なしで始められます
      </p>
    </div>
  );
}

function GuestWelcomeGate() {
  const { state } = useGuestState();
  if (getGuestOnboardingRoute(state) === null)
    return <Navigate replace to="/" />;
  return <WelcomeScreen />;
}

function SignedInWelcomeGate() {
  const { isSignedIn } = useCurrentUserInitialization();
  if (isSignedIn) return <Navigate replace to="/" />;
  return <GuestWelcomeGate />;
}

export function WelcomePage() {
  return isClerkConfigured ? <SignedInWelcomeGate /> : <GuestWelcomeGate />;
}
