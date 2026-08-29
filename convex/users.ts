import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOrCreateCurrentUser, requireCurrentUser } from './lib/auth'
import { getLocalDateString } from './lib/date'
import { ERROR_CODES } from './lib/errors'
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

// docs/ui-spec.md #23 (Character Detail) / AC-COLLECTION-004 / AC-COLLECTION-005。
// 所持済み(inventories に該当行あり)のCharacterのみ相棒に設定できる。
// 未所持IDを直接渡してもServer側で拒否する。
export const setPartnerCharacter = mutation({
  args: { characterId: v.id('characters') },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const inventory = await ctx.db
      .query('inventories')
      .withIndex('by_user_character', (q) =>
        q.eq('userId', user._id).eq('characterId', args.characterId),
      )
      .unique()

    if (inventory === null) {
      throw new ConvexError({ code: ERROR_CODES.CHARACTER_NOT_OWNED })
    }

    await ctx.db.patch(user._id, {
      partnerCharacterId: args.characterId,
      updatedAt: Date.now(),
    })

    return { partnerCharacterId: args.characterId }
  },
})
