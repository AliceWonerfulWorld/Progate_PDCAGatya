import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { api } from '../../convex/_generated/api'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const convexUrl = import.meta.env.VITE_CONVEX_URL

export const isClerkConfigured = Boolean(clerkPublishableKey && convexUrl)

// ConvexReactClient は WebSocket 接続を保持するため、レンダーごとに作り直すと
// 送信中のミューテーションが破棄される。モジュールスコープで一度だけ生成する。
const convexClient = isClerkConfigured ? new ConvexReactClient(convexUrl!) : null

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function CurrentUserInitializer() {
  const { isAuthenticated } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)

  useEffect(() => {
    if (isAuthenticated) {
      void ensureCurrentUser({ timezone: getBrowserTimezone() })
    }
  }, [ensureCurrentUser, isAuthenticated])

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
