import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOrCreateCurrentUser, requireCurrentUser } from './lib/auth'
import { getLocalDateString } from './lib/date'
import { deriveStreakStatus, isRecoveryAvailable } from './lib/streak'

export const ensureCurrentUser = mutation({
  args: {
    timezone: v.string(),
  },
  handler: async (ctx, args) => getOrCreateCurrentUser(ctx, args.timezone),
})

export const currentUser = query({
  args: {},
  handler: async (ctx) => requireCurrentUser(ctx),
})

// docs/ui-spec.md #8 (Home - Streak At Risk) の表示判定に使う。
// streakStatus / pendingRecoveryDate はschemaへ永続化せず、lastCompletedDateから
// その場で導出する（convex/lib/streak.ts の実装メモを参照）。
export const getStreakStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx)
    const today = getLocalDateString(Date.now(), user.timezone)
    const derived = deriveStreakStatus(user.lastCompletedDate, today)
    const recoveryAvailable =
      derived.streakStatus === 'atRisk' && isRecoveryAvailable(user.lastRecoveryDate, today)

    return {
      streakStatus: derived.streakStatus,
      pendingRecoveryDate: derived.pendingRecoveryDate,
      recoveryAvailable,
      currentStreak: user.currentStreak,
    }
  },
})
