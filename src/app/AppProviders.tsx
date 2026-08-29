import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { PropsWithChildren } from 'react'
import { CurrentUserInitializationProvider } from './CurrentUserInitialization'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const convexUrl = import.meta.env.VITE_CONVEX_URL

export const isClerkConfigured = Boolean(clerkPublishableKey && convexUrl)

// ConvexReactClient は WebSocket 接続を保持するため、レンダーごとに作り直すと
// 送信中のミューテーションが破棄される。モジュールスコープで一度だけ生成する。
const convexClient = isClerkConfigured ? new ConvexReactClient(convexUrl!) : null

function ClerkConvexProvider({ children }: PropsWithChildren) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey!}>
      <ConvexProviderWithClerk client={convexClient!} useAuth={useAuth}>
        <CurrentUserInitializationProvider>{children}</CurrentUserInitializationProvider>
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
