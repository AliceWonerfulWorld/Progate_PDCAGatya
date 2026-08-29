import type { PropsWithChildren } from 'react'
import { OfflineBanner } from '../ui/OfflineBanner'
import { BottomNavigation } from './BottomNavigation'
import { Header } from './Header'

type AppShellProps = PropsWithChildren<{
  showBottomNavigation: boolean
}>

export function AppShell({ children, showBottomNavigation }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-stone-50 text-slate-900">
      <Header />
      <OfflineBanner />
      <main className={showBottomNavigation ? 'mx-auto w-full max-w-2xl px-4 pb-24 pt-6' : 'mx-auto w-full max-w-2xl px-4 py-6'}>
        {children}
      </main>
      {showBottomNavigation ? <BottomNavigation /> : null}
    </div>
  )
}
