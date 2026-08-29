import { Ticket } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { useCurrentUserInitialization } from '../goals/useCurrentUserInitialization'

// docs/ui-spec.md #6.3 / #32.4: 未使用ガチャはHome上に常設のCTAとして残す。
// これがないと、PDCA COMPLETE画面で「あとで」を選んだガチャ権が迷子になる。
export function GachaTicketCard() {
  const { isReady, isSignedIn } = useCurrentUserInitialization()
  const currentUser = useQuery(api.users.currentUser, isSignedIn && isReady ? {} : 'skip')

  if (!isSignedIn || !isReady || currentUser === undefined) return null
  if (currentUser.availableGachaDraws <= 0) return null

  return (
    <section className="flex items-center justify-between gap-3 border border-reward-border bg-reward-bg px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-reward-text">
        <Ticket aria-hidden="true" className="size-5" /> ガチャ {currentUser.availableGachaDraws}回
      </p>
      <Link
        className="flex min-h-11 shrink-0 items-center justify-center bg-reward-strong px-4 text-sm font-bold text-white"
        to="/gacha"
      >
        ガチャを回す
      </Link>
    </section>
  )
}
