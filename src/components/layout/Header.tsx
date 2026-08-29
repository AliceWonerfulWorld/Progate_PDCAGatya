import { Show, SignInButton, UserButton } from '@clerk/react'
import { LogIn, Sparkles } from 'lucide-react'
import { isClerkConfigured } from '../../app/AppProviders'

export function Header() {
  return (
    <header className="border-b border-border-subtle bg-background">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
        <Sparkles aria-hidden="true" className="size-5 text-primary" strokeWidth={2.25} />
        <span className="text-sm font-bold tracking-wide">PDCA GACHA</span>
        {isClerkConfigured ? (
          <div className="ml-auto flex items-center">
            <Show when="signed-out">
              <SignInButton>
                <button
                  aria-label="ログイン"
                  className="grid size-11 place-items-center text-text-muted"
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
  )
}
