import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export type PushSupportStatus = 'checking' | 'unsupported' | 'ios-needs-install' | 'ready'

// iOSはSafari(ホーム画面追加済みPWA)以外Push APIを持たないため、対応しているか
// どうかは 'PushManager' in window で判定できる。UAはコピーの出し分け専用で、
// 機能ゲートには使わない。
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const isSafariBrowser = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIosDevice && isSafariBrowser
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export function usePushSubscription() {
  const vapidPublicKey = useQuery(api.push.getVapidPublicKey)
  const subscribeMutation = useMutation(api.push.subscribe)
  const unsubscribeMutation = useMutation(api.push.unsubscribe)
  const updateNotifyHoursMutation = useMutation(api.push.updateNotifyHours)

  const [supportStatus, setSupportStatus] = useState<PushSupportStatus>('checking')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setSupportStatus(isIosSafari() ? 'ios-needs-install' : 'unsupported')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (cancelled) return
      setSubscription(existing)
      setSupportStatus('ready')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // サーバー側が持つ「このデバイスの通知時刻」をリロード後も復元する。
  // Convexのreactivityにより、enable/setNotifyHours成功後は自動で最新化される。
  const savedNotifyHours = useQuery(
    api.push.getMyNotifyHours,
    subscription ? { endpoint: subscription.endpoint } : 'skip',
  )

  const enable = useCallback(
    async (hours: number[]) => {
      if (!vapidPublicKey) return
      setIsBusy(true)
      setError(null)
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('通知が許可されませんでした。')
          return
        }
        const registration = await navigator.serviceWorker.ready
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
        const json = newSubscription.toJSON()
        const p256dh = json.keys?.p256dh
        const auth = json.keys?.auth
        if (!json.endpoint || !p256dh || !auth) {
          setError('通知の設定に失敗しました。')
          return
        }
        await subscribeMutation({
          endpoint: json.endpoint,
          keys: { p256dh, auth },
          userAgent: navigator.userAgent,
          notifyHours: hours,
        })
        setSubscription(newSubscription)
      } catch {
        setError('通知の設定に失敗しました。')
      } finally {
        setIsBusy(false)
      }
    },
    [vapidPublicKey, subscribeMutation],
  )

  const disable = useCallback(async () => {
    if (!subscription) return
    setIsBusy(true)
    setError(null)
    const endpoint = subscription.endpoint
    try {
      await subscription.unsubscribe()
    } catch {
      // ブラウザ側の解除に失敗しても、サーバー側の解除は試みる。
    }
    setSubscription(null)
    try {
      await unsubscribeMutation({ endpoint })
    } catch {
      // ベストエフォート: ブラウザ側は解除済みなのでUI上は解除済み扱いにする。
    } finally {
      setIsBusy(false)
    }
  }, [subscription, unsubscribeMutation])

  const setNotifyHours = useCallback(
    async (hours: number[]) => {
      if (!subscription || hours.length === 0) return
      setIsBusy(true)
      setError(null)
      try {
        await updateNotifyHoursMutation({ endpoint: subscription.endpoint, notifyHours: hours })
      } catch {
        setError('通知時刻を更新できませんでした。')
      } finally {
        setIsBusy(false)
      }
    },
    [subscription, updateNotifyHoursMutation],
  )

  return {
    supportStatus,
    isSubscribed: subscription !== null,
    notifyHours: savedNotifyHours ?? [],
    isBusy,
    error,
    isConfigured: vapidPublicKey !== undefined && vapidPublicKey !== null,
    enable,
    disable,
    setNotifyHours,
  }
}
