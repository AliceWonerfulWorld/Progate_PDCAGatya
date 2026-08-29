import { useCallback, useState } from 'react'
import {
  clearGuestState,
  readGuestState,
  setGuestGachaState,
  setGuestGoal,
  setGuestPdcaCycle,
  type GuestGachaState,
  type GuestGoal,
  type GuestPdcaCycle,
  type GuestState,
} from '../lib/guestStore'

// localStorage(src/lib/guestStore.ts)への薄いReactラッパー。
// 初期値をuseStateのlazy initializerで読むため、reload直後から
// 復元済みの状態でレンダリングできる(AC-GUEST-002)。
export function useGuestState() {
  const [state, setState] = useState<GuestState>(() => readGuestState())

  const setGoal = useCallback((goal: GuestGoal) => {
    setState(setGuestGoal(goal))
  }, [])

  const setCycle = useCallback((cycle: GuestPdcaCycle | undefined) => {
    setState(setGuestPdcaCycle(cycle))
  }, [])

  const setGacha = useCallback((gacha: GuestGachaState) => {
    setState(setGuestGachaState(gacha))
  }, [])

  const clear = useCallback(() => {
    clearGuestState()
    setState(readGuestState())
  }, [])

  return { state, setGoal, setCycle, setGacha, clear }
}
