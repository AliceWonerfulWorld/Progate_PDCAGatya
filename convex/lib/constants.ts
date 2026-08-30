export const BASE_PDCA_XP = 100

// docs/data-model.md #25 (Mission Data): DAILY_MISSIONS.COMPLETE_ONE_PDCA.
export const DAILY_MISSION_XP = 50

// 排出率はgachasテーブル側で管理する(convex/lib/gachaSeed.ts)。
// ここではrarityの値そのものの定義だけを持つ。
export const DUPLICATE_FRAGMENT_REWARDS = {
  R: 10,
  SR: 20,
  SSR: 40,
} as const

export const INPUT_LIMITS = {
  goalName: 100,
  planText: 200,
  checkMemo: 500,
  nextPlanCandidate: 200,
  displayName: 50,
} as const

export type CharacterRarity = 'R' | 'SR' | 'SSR'

// Web Push (docs/technical-design.md Push Notification / At-Risk trigger)。
export const PUSH = {
  endpointMaxLength: 2048,
  // 通知時刻としてユーザーが選べるローカル時刻(24h)のプリセット。
  notifyHourPresets: [7, 10, 19, 21],
} as const
