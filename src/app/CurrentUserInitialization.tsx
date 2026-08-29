import { useConvexAuth, useMutation } from 'convex/react'
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { api } from '../../convex/_generated/api'
import { clearGuestState, readGuestState } from '../lib/guestStore'

interface CurrentUserInitializationState {
  hasError: boolean
  isLoading: boolean
  isReady: boolean
  isSignedIn: boolean
  retry: () => void
}

const CurrentUserInitializationContext = createContext<CurrentUserInitializationState | null>(null)

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

// CurrentUserの作成・Guest移行はアプリ起動時に一度だけ行う。画面ごとのHookで
// 同じMutationを実行すると、初回表示と画面遷移のたびに余分な通信が発生する。
export function CurrentUserInitializationProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const migrateGuestData = useMutation(api.guest.migrateGuestData)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitialized(false)
      setHasError(false)
      return
    }

    let isActive = true
    setHasError(false)
    void (async () => {
      try {
        await ensureCurrentUser({ timezone: getBrowserTimezone() })
        if (!isActive) return
        setIsInitialized(true)

        // Login後、Guest進行状態を一度だけConvexへ移行する。移行の失敗は
        // localStorageを保持して次回のアプリ起動で再試行できるようにする。
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
          // Guest dataは残し、次回のアプリ起動で再試行する。
        }
      } catch {
        if (isActive) setHasError(true)
      }
    })()

    return () => {
      isActive = false
    }
  }, [ensureCurrentUser, isAuthenticated, migrateGuestData, retryToken])

  const value = useMemo<CurrentUserInitializationState>(
    () => ({
      hasError,
      isLoading: isAuthLoading || (isAuthenticated && !isInitialized),
      isReady: isAuthenticated && isInitialized,
      isSignedIn: isAuthenticated,
      retry: () => setRetryToken((token) => token + 1),
    }),
    [hasError, isAuthLoading, isAuthenticated, isInitialized],
  )

  return <CurrentUserInitializationContext.Provider value={value}>{children}</CurrentUserInitializationContext.Provider>
}

export function useCurrentUserInitialization(): CurrentUserInitializationState {
  const value = useContext(CurrentUserInitializationContext)
  if (value === null) {
    throw new Error('useCurrentUserInitialization must be used inside CurrentUserInitializationProvider')
  }
  return value
}
