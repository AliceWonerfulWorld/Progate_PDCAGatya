// docs/technical-design.md #54-58 (Guest Mode / Guest Session ID / migrateGuestData)。
//
// Guest状態はlocalStorageのみに保持する。Login後の正式データ(Convex)を
// ここへ二重に書き込まない ― AppProviders/useCurrentUserInitialization等、
// Convexから取得した値はこのモジュールに触れないこと。
//
// migrateGuestData(#23)が成功するまでは、この状態を消してはいけない。
// clearGuestState() はmigration成功後にFrontendから明示的に呼ぶための
// エクスポートであり、このモジュール自身は自動で消去しない。

const STORAGE_KEY = 'pdca-gacha:guest-state'

export type GuestPdcaStatus = 'doing' | 'checking' | 'acting' | 'completed' | 'cancelled'
export type GuestDoResult = 'completed' | 'partial' | 'notCompleted'
export type GuestCheckLoad = 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
export type GuestCheckReason = 'noTime' | 'tooLarge' | 'tooDifficult' | 'noFocus' | 'noMotivation' | 'other'
export type GuestActType = 'lighter' | 'same' | 'heavier' | 'changeApproach'
export type GuestCharacterRarity = 'R' | 'SR' | 'SSR'

export interface GuestGoal {
  name: string
}

export interface GuestPdcaCycle {
  planText: string
  status: GuestPdcaStatus
  doResult?: GuestDoResult
  checkLoad?: GuestCheckLoad
  checkReason?: GuestCheckReason
  checkMemo?: string
  actType?: GuestActType
  nextPlanCandidate?: string
  startedAt: number
  completedAt?: number
}

export interface GuestGachaResult {
  characterId: string
  characterName: string
  rarity: GuestCharacterRarity
}

export interface GuestGachaState {
  availableDraws: number
  firstResult: GuestGachaResult | null
}

export interface GuestState {
  guestSessionId: string
  goal?: GuestGoal
  cycle?: GuestPdcaCycle
  gacha: GuestGachaState
}

function createEmptyState(): GuestState {
  return {
    guestSessionId: crypto.randomUUID(),
    gacha: { availableDraws: 0, firstResult: null },
  }
}

function isGuestState(value: unknown): value is GuestState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return typeof state.guestSessionId === 'string' && typeof state.gacha === 'object' && state.gacha !== null
}

// reload後もGuest進行状態を復元する(AC-GUEST-002)。壊れた/存在しないデータは
// 安全に新規セッションへフォールバックする。
export function readGuestState(): GuestState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    const initial = createEmptyState()
    writeGuestState(initial)
    return initial
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (isGuestState(parsed)) return parsed
  } catch {
    // 壊れたJSON。新規セッションとして扱う。
  }

  const fallback = createEmptyState()
  writeGuestState(fallback)
  return fallback
}

export function writeGuestState(state: GuestState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function setGuestGoal(goal: GuestGoal): GuestState {
  const next = { ...readGuestState(), goal }
  writeGuestState(next)
  return next
}

export function setGuestPdcaCycle(cycle: GuestPdcaCycle | undefined): GuestState {
  const next = { ...readGuestState(), cycle }
  writeGuestState(next)
  return next
}

export function setGuestGachaState(gacha: GuestGachaState): GuestState {
  const next = { ...readGuestState(), gacha }
  writeGuestState(next)
  return next
}

// migrateGuestData(#23)成功後にFrontendから呼び出す。Login後のConvexデータと
// 二重管理しないよう、成功が確認できるまでは呼ばないこと。
export function clearGuestState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
