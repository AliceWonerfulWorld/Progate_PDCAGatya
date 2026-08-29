import { Plus, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGuestState } from '../../hooks/useGuestState'
import { SignInPrompt } from '../../components/ui/SignInPrompt'

const GUEST_RESUME_PATHS = {
  doing: 'do',
  checking: 'check',
  acting: 'act',
} as const

function CreateGoalLink() {
  return (
    <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary" to="/goals/new">
      <Plus aria-hidden="true" className="size-4" /> Goalを作る
    </Link>
  )
}

// docs/user-flow.md #0 / #1.3: 最初のPDCA・ガチャ体験より前にログインを要求しない。
// ログイン前はこの画面がConvexの代わりにlocalStorage(useGuestState)を見て、
// 「今どのステップまで進んでいるか」に応じた1つの導線だけを出す。
export function GuestGoalSection() {
  const { state } = useGuestState()
  const { goal, cycle, gacha } = state

  if (!goal) {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          アカウント登録なしで、今すぐ最初の1周を試せます。
        </p>
        <CreateGoalLink />
      </>
    )
  }

  if (!cycle || cycle.status === 'cancelled') {
    return (
      <div className="mt-3 border-y border-border-subtle py-4">
        <p className="text-base font-bold">{goal.name}</p>
        <p className="mt-1 text-sm text-text-muted">次のPLANを決めよう</p>
        <Link
          className="mt-3 flex min-h-12 items-center justify-center bg-primary px-4 text-base font-bold text-white"
          to="/pdca/plan/guest"
        >
          PDCAを回す
        </Link>
      </div>
    )
  }

  if (cycle.status !== 'completed') {
    const resumePath = GUEST_RESUME_PATHS[cycle.status]
    return (
      <div className="mt-3 border-y border-border-subtle py-4">
        <p className="text-sm font-medium text-primary">進行中</p>
        <p className="mt-1 text-sm text-text-subtle">{goal.name}</p>
        <p className="mt-1 text-base font-bold">{cycle.planText}</p>
        <Link
          className="mt-4 flex min-h-12 items-center justify-center bg-primary px-4 text-base font-bold text-white"
          to={`/pdca/${resumePath}/guest`}
        >
          続きを開く
        </Link>
      </div>
    )
  }

  if (gacha.availableDraws > 0 && gacha.firstResult === null) {
    return (
      <div className="mt-3 space-y-3 border-y border-border-subtle py-5 text-center">
        <p className="text-sm leading-6 text-text-muted">
          最初の1周、できたね。
          <br />
          お礼にガチャを1回回せます。
        </p>
        <Link
          className="flex min-h-12 items-center justify-center gap-2 bg-primary px-4 text-base font-bold text-white"
          to="/gacha"
        >
          <Ticket aria-hidden="true" className="size-5" /> ガチャを回す
        </Link>
      </div>
    )
  }

  if (gacha.firstResult) {
    return (
      <div className="mt-3 border-y border-border-subtle py-5">
        <SignInPrompt message="この記録を残しますか？ログインすると、Goalとガチャ結果が保存され、続きをいつでも再開できます。" />
      </div>
    )
  }

  return null
}
