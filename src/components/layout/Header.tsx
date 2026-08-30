import { Show, SignInButton, UserButton } from "@clerk/react";
import { LogIn, RotateCw } from "lucide-react";
import { isClerkConfigured } from "../../app/AppProviders";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-2.5 px-5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
          <RotateCw aria-hidden="true" className="size-4" strokeWidth={2.75} />
        </div>
        <span className="text-base font-black tracking-tight text-text-strong">
          PDCA GACHA
        </span>
        {isClerkConfigured ? (
          <div className="ml-auto flex items-center">
            <Show when="signed-out">
              <SignInButton>
                <button
                  aria-label="ログイン"
                  className="grid size-11 place-items-center rounded-2xl bg-surface text-text-muted shadow-sm transition-colors duration-(--duration-fast) ease-standard active:scale-[0.97]"
                  title="ログイン"
                  type="button"
                >
                  <LogIn aria-hidden="true" className="size-5" />
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        ) : null}
      </div>
    </header>
  );
}
