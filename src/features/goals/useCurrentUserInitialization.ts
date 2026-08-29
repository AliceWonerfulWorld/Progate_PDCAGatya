import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../../convex/_generated/api'

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function useCurrentUserInitialization() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasError, setHasError] = useState(false)
  // docs/ui-spec.md #34.2: エラー時は再試行できるようにする。値を変えるだけで
  // 下のeffectを再実行させるためのトークン。
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitialized(false)
      return
    }

    let isActive = true
    setHasError(false)
    void ensureCurrentUser({ timezone: getBrowserTimezone() })
      .then(() => {
        if (isActive) setIsInitialized(true)
      })
      .catch(() => {
        if (isActive) setHasError(true)
      })

    return () => {
      isActive = false
    }
  }, [ensureCurrentUser, isAuthenticated, retryToken])

  return {
    isReady: isAuthenticated && isInitialized,
    isLoading: isLoading || (isAuthenticated && !isInitialized),
    isSignedIn: isAuthenticated,
    hasError,
    retry: () => setRetryToken((token) => token + 1),
  }
}
