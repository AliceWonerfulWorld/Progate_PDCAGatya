import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation } from './_generated/server'
import { requireCurrentUser } from './lib/auth'
import { BASE_PDCA_XP } from './lib/constants'
import { getLocalDateString } from './lib/date'
import { ERROR_CODES } from './lib/errors'
import { calculatePlayerLevel } from './lib/playerLevel'
import { resolveStreakState } from './lib/streak'
import { validateGoalName } from './goals'
import {
  actTypeValidator,
  checkLoadValidator,
  checkReasonValidator,
  doResultValidator,
  pdcaStatusValidator,
  validateCheckMemo,
  validateNextPlanCandidate,
  validatePlanText,
} from './pdca'

const characterRarityValidator = v.union(v.literal('R'), v.literal('SR'), v.literal('SSR'))

const guestGoalValidator = v.object({ name: v.string() })

const guestCycleValidator = v.object({
  planText: v.string(),
  status: pdcaStatusValidator,
  doResult: v.optional(doResultValidator),
  checkLoad: v.optional(checkLoadValidator),
  checkReason: v.optional(checkReasonValidator),
  checkMemo: v.optional(v.string()),
  actType: v.optional(actTypeValidator),
  nextPlanCandidate: v.optional(v.string()),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})

const guestGachaStateValidator = v.object({
  availableDraws: v.number(),
  firstResult: v.union(
    v.null(),
    v.object({
      characterId: v.id('characters'),
      characterName: v.string(),
      rarity: characterRarityValidator,
    }),
  ),
})

const guestDataValidator = v.object({
  goal: v.optional(guestGoalValidator),
  cycle: v.optional(guestCycleValidator),
  gacha: guestGachaStateValidator,
})

export interface MigrateGuestDataResult {
  alreadyMigrated: boolean
  goalId: Id<'goals'> | null
  cycleId: Id<'pdcaCycles'> | null
}

// docs/technical-design.md #56-58 (Guest First-run Flow / migrateGuestData /
// Guest Migration Idempotency)。Guestが未ログイン中に貯めたGoal・PDCA・Gacha
// 結果を、Login後に一度だけConvexへ反映する専用Mutation。
//
// 冪等性: users.lastMigratedGuestSessionId と同じ guestSessionId が来たら
// 何もせずno-opで返す(AC-GUEST-005)。失敗時はMutation全体がロールバック
// されるため(Convexのトランザクション特性)、部分的な書き込みは残らず、
// Frontend側もlocalStorageを消さなければGuest dataは保持されretry可能になる
// (呼び出し側の責務。clearGuestStateはこのMutationの成功後にのみ呼ぶこと)。
export const migrateGuestData = mutation({
  args: {
    guestSessionId: v.string(),
    guestData: guestDataValidator,
  },
  handler: async (ctx, args): Promise<MigrateGuestDataResult> => {
    const guestSessionId = args.guestSessionId.trim()
    if (!guestSessionId) {
      throw new ConvexError({
        code: ERROR_CODES.GUEST_INVALID_DATA,
        message: 'guestSessionId is required',
      })
    }

    const user = await requireCurrentUser(ctx)

    // AC-GUEST-005: 同じguestSessionIdの再送は安全なno-op。
    if (user.lastMigratedGuestSessionId === guestSessionId) {
      return { alreadyMigrated: true, goalId: null, cycleId: null }
    }

    const now = Date.now()

    let goalId: Id<'goals'> | null = null
    if (args.guestData.goal) {
      goalId = await ctx.db.insert('goals', {
        userId: user._id,
        name: validateGoalName(args.guestData.goal.name),
        totalCycles: 0,
        activeDays: 0,
        createdAt: now,
        updatedAt: now,
      })
    }

    let playerXp = user.playerXp
    let playerLevel = user.playerLevel
    let currentStreak = user.currentStreak
    let longestStreak = user.longestStreak
    let lastCompletedDate = user.lastCompletedDate
    let totalCycles = user.totalCycles
    let availableGachaDraws = user.availableGachaDraws
    let cycleId: Id<'pdcaCycles'> | null = null

    if (goalId !== null && args.guestData.cycle) {
      const cycle = args.guestData.cycle
      const isCompleted = cycle.status === 'completed'

      cycleId = await ctx.db.insert('pdcaCycles', {
        userId: user._id,
        goalId,
        planText: validatePlanText(cycle.planText),
        status: cycle.status,
        doResult: cycle.doResult,
        checkLoad: cycle.checkLoad,
        checkReason: cycle.checkReason,
        checkMemo: validateCheckMemo(cycle.checkMemo),
        actType: cycle.actType,
        nextPlanCandidate: validateNextPlanCandidate(cycle.nextPlanCandidate),
        // Recoveryとして開始できるのはLogin後のみ。Guest Cycleは常に通常扱い。
        isRecovery: false,
        // Guest側のタイムスタンプはクライアント時計依存のため信用せず、
        // 完了時刻はServer時刻で確定する。
        startedAt: cycle.startedAt,
        completedAt: isCompleted ? now : undefined,
        createdAt: now,
        updatedAt: now,
      })

      if (isCompleted) {
        // 基本報酬は通常のcompletePdcaCycleと同じ計算(+100 XP等)を適用する。
        const today = getLocalDateString(now, user.timezone)
        playerXp = user.playerXp + BASE_PDCA_XP
        playerLevel = calculatePlayerLevel(playerXp)
        totalCycles = user.totalCycles + 1
        availableGachaDraws = user.availableGachaDraws + 1

        const streak = resolveStreakState({
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          lastCompletedDate: user.lastCompletedDate,
          lastRecoveryDate: user.lastRecoveryDate,
          streakStatus: 'active',
          pendingRecoveryDate: undefined,
          today,
          isRecovery: false,
          didCompleteToday: true,
        })
        currentStreak = streak.currentStreak
        longestStreak = streak.longestStreak
        lastCompletedDate = streak.lastCompletedDate ?? today

        await ctx.db.patch(goalId, {
          totalCycles: 1,
          activeDays: 1,
          lastCompletedAt: now,
          lastCompletedDate: today,
          nextPlanCandidate: validateNextPlanCandidate(cycle.nextPlanCandidate),
          updatedAt: now,
        })
      }
    }

    let totalGachaDraws = user.totalGachaDraws
    const firstResult = args.guestData.gacha.firstResult
    if (firstResult !== null) {
      // Rarityはguestが自己申告した値を信用せず、Character masterの値を正とする。
      const character = await ctx.db.get(firstResult.characterId)
      if (character !== null) {
        await ctx.db.insert('inventories', {
          userId: user._id,
          characterId: character._id,
          fragmentCount: 0,
          duplicateCount: 0,
          obtainedAt: now,
          updatedAt: now,
        })

        totalGachaDraws += 1
        await ctx.db.insert('gachaHistory', {
          userId: user._id,
          characterId: character._id,
          rarity: character.rarity,
          wasDuplicate: false,
          fragmentReward: 0,
          gachaType: 'normal',
          drawSequence: totalGachaDraws,
          drawnAt: now,
        })
      }
    }
    availableGachaDraws += Math.max(0, Math.trunc(args.guestData.gacha.availableDraws))

    await ctx.db.patch(user._id, {
      playerXp,
      playerLevel,
      currentStreak,
      longestStreak,
      lastCompletedDate,
      totalCycles,
      totalGachaDraws,
      availableGachaDraws,
      lastMigratedGuestSessionId: guestSessionId,
      updatedAt: now,
    })

    return { alreadyMigrated: false, goalId, cycleId }
  },
})
