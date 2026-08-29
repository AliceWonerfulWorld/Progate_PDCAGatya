import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { api } from '../../convex/_generated/api'
import { clearGuestState, readGuestState } from '../lib/guestStore'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const convexUrl = import.meta.env.VITE_CONVEX_URL

export const isClerkConfigured = Boolean(clerkPublishableKey && convexUrl)

// ConvexReactClient は WebSocket 接続を保持するため、レンダーごとに作り直すと
// 送信中のミューテーションが破棄される。モジュールスコープで一度だけ生成する。
const convexClient = isClerkConfigured ? new ConvexReactClient(convexUrl!) : null

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function hasGuestProgress(guestState: ReturnType<typeof readGuestState>): boolean {
  return (
    guestState.goal !== undefined ||
    guestState.cycle !== undefined ||
    guestState.gacha.firstResult !== null ||
    guestState.gacha.availableDraws > 0
  )
}

function CurrentUserInitializer() {
  const { isAuthenticated } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const migrateGuestData = useMutation(api.guest.migrateGuestData)

  useEffect(() => {
    if (!isAuthenticated) return
    let isActive = true

    void (async () => {
      await ensureCurrentUser({ timezone: getBrowserTimezone() })
      if (!isActive) return

      // docs/technical-design.md #56-58: Login後、貯まっていたGuest進行状態を
      // 一度だけConvexへ移行する。失敗時はlocalStorageを消さず、次回ログイン時
      // に再試行できるようにする(Migration成功後のみ削除)。
      const guestState = readGuestState()
      if (!hasGuestProgress(guestState)) return

      try {
        await migrateGuestData({
          guestSessionId: guestState.guestSessionId,
          guestData: {
            goal: guestState.goal,
            cycle: guestState.cycle,
            gacha: guestState.gacha,
          },
        })
        if (isActive) clearGuestState()
      } catch {
        // Guest dataはそのまま残し、次回retryできるようにする。
      }
    })()

    return () => {
      isActive = false
    }
  }, [ensureCurrentUser, migrateGuestData, isAuthenticated])

  return null
}

function ClerkConvexProvider({ children }: PropsWithChildren) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey!}>
      <ConvexProviderWithClerk client={convexClient!} useAuth={useAuth}>
        <CurrentUserInitializer />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

export function AppProviders({ children }: PropsWithChildren) {
  if (!isClerkConfigured) {
    return children
  }

  return <ClerkConvexProvider>{children}</ClerkConvexProvider>
}
