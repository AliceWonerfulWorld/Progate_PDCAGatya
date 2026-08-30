import { ArrowRight, Sparkles } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useGuestState } from '../../hooks/useGuestState'
import { getGuestOnboardingRoute } from '../../lib/guestOnboarding'

export function WelcomeScreen() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center text-center">
      <section className="space-y-6">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary-subtle text-primary">
          <Sparkles aria-hidden="true" className="size-8" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-bold tracking-[0.18em] text-primary">PDCA GACHA</p>
          <h1 className="text-3xl font-bold leading-tight text-text-strong">PDCAを回したら、ガチャを回せる。</h1>
          <p className="text-sm leading-6 text-text-muted">まずは小さな1周から。アカウント登録なしで始められます。</p>
        </div>
      </section>

      <Link
        className="mt-10 flex min-h-12 items-center justify-center gap-2 bg-primary px-4 text-base font-bold text-white transition-colors duration-(--duration-fast) ease-standard hover:bg-primary-hover active:bg-primary-active"
        to="/goals/new"
      >
        はじめる <ArrowRight aria-hidden="true" className="size-5" />
      </Link>
    </div>
  )
}

export function WelcomePage() {
  const { state } = useGuestState()

  if (getGuestOnboardingRoute(state) === null) {
    return <Navigate replace to="/" />
  }

  return <WelcomeScreen />
}
