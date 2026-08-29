import { SignInButton } from '@clerk/react'
import { LogIn } from 'lucide-react'

// 未ログイン時に表示する共通の案内 + ログイン導線。
// Clerk 未設定時（isClerkConfigured === false）は SignInButton を描画できないため、
// 呼び出し側で分岐すること。
export function SignInPrompt({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">{message}</p>
      <SignInButton>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-700 px-5 text-base font-bold text-white"
          type="button"
        >
          <LogIn aria-hidden="true" className="size-4" /> ログインする
        </button>
      </SignInButton>
    </div>
  )
}
