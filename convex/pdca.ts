import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation } from './_generated/server'
import { requireCurrentUser, requireOwnedCycle } from './lib/auth'
import { BASE_PDCA_XP } from './lib/constants'
import { getLocalDateString } from './lib/date'
import { ERROR_CODES } from './lib/errors'
import { assertValidPdcaTransition } from './lib/pdca'
import { calculatePlayerLevel } from './lib/playerLevel'
import { resolveStreakState } from './lib/streak'

export interface CompletePdcaCycleResult {
  cycleId: Id<'pdcaCycles'>
  alreadyCompleted: boolean
  gainedXp: number
  previousLevel: number
  newLevel: number
  levelUp: boolean
  currentStreak: number
  streakUpdated: boolean
  gachaDrawsAdded: number
  availableGachaDraws: number
  totalCycles: number
}

// Completes a PDCA cycle and grants the one-time base reward
// (docs/technical-design.md §15-19, AC-PDCA-013 / 014 / 015).
//
// The client sends only the cycleId. XP, level, streak and gacha rights are all
// resolved server-side; the client is never trusted for reward values
// (AGENTS.md §9). DO success/failure never changes the base reward.
export const completePdcaCycle = mutation({
  args: { cycleId: v.id('pdcaCycles') },
  handler: async (ctx, args): Promise<CompletePdcaCycleResult> => {
    const currentUser = await requireCurrentUser(ctx)
    const cycle = await requireOwnedCycle(ctx, args.cycleId, currentUser)

    // Idempotency (AC-PDCA-014): a re-run on an already completed cycle is a
    // no-op that never grants a second reward.
    if (cycle.status === 'completed') {
      return {
        cycleId: cycle._id,
        alreadyCompleted: true,
        gainedXp: 0,
        previousLevel: currentUser.playerLevel,
        newLevel: currentUser.playerLevel,
        levelUp: false,
        currentStreak: currentUser.currentStreak,
        streakUpdated: false,
        gachaDrawsAdded: 0,
        availableGachaDraws: currentUser.availableGachaDraws,
        totalCycles: currentUser.totalCycles,
      }
    }

    // Only `acting -> completed` is allowed; doing / checking / cancelled are
    // rejected server-side (AC-PDCA-011).
    assertValidPdcaTransition(cycle.status, 'completed')

    // A completed cycle must carry the PDCA inputs (technical-design.md §16 step 6).
    if (
      cycle.doResult === undefined ||
      cycle.checkLoad === undefined ||
      cycle.actType === undefined
    ) {
      throw new ConvexError({
        code: ERROR_CODES.PDCA_INVALID_STATUS,
        message: 'PDCA cycle is missing required doResult / checkLoad / actType',
      })
    }

    const goal = await ctx.db.get(cycle.goalId)
    if (goal === null) {
      throw new ConvexError({ code: ERROR_CODES.GOAL_NOT_FOUND })
    }

    const now = Date.now()
    const today = getLocalDateString(now, currentUser.timezone)

    // 1. Cycle -> completed.
    await ctx.db.patch(cycle._id, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })

    // 2. Goal aggregates. activeDays advances at most once per local day
    // (docs/data-model.md §5.5, AGENTS.md §16).
    await ctx.db.patch(goal._id, {
      totalCycles: goal.totalCycles + 1,
      activeDays:
        goal.lastCompletedDate === today ? goal.activeDays : goal.activeDays + 1,
      lastCompletedAt: now,
      lastCompletedDate: today,
      nextPlanCandidate: cycle.nextPlanCandidate ?? goal.nextPlanCandidate,
      updatedAt: now,
    })

    // 3. Player aggregates: XP (+100), level recalculation, gacha right (+1),
    // streak resolution via the shared resolver (AGENTS.md §30).
    const previousLevel = currentUser.playerLevel
    const playerXp = currentUser.playerXp + BASE_PDCA_XP
    const newLevel = calculatePlayerLevel(playerXp)
    const availableGachaDraws = currentUser.availableGachaDraws + 1
    const totalCycles = currentUser.totalCycles + 1

    // `users` does not carry streakStatus / pendingRecoveryDate yet, so a
    // completion always resolves from the "active" baseline. Persisting the
    // at-risk / pendingRecoveryDate half of the resolver output is a follow-up
    // that adds those schema fields (see the note in convex/lib/streak.ts).
    const streak = resolveStreakState({
      currentStreak: currentUser.currentStreak,
      longestStreak: currentUser.longestStreak,
      lastCompletedDate: currentUser.lastCompletedDate,
      lastRecoveryDate: currentUser.lastRecoveryDate,
      streakStatus: 'active',
      pendingRecoveryDate: undefined,
      today,
      isRecovery: cycle.isRecovery,
      didCompleteToday: true,
    })

    await ctx.db.patch(currentUser._id, {
      playerXp,
      playerLevel: newLevel,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate ?? today,
      lastRecoveryDate: streak.lastRecoveryDate,
      availableGachaDraws,
      totalCycles,
      updatedAt: now,
    })

    return {
      cycleId: cycle._id,
      alreadyCompleted: false,
      gainedXp: BASE_PDCA_XP,
      previousLevel,
      newLevel,
      levelUp: newLevel > previousLevel,
      currentStreak: streak.currentStreak,
      streakUpdated: streak.streakUpdated,
      gachaDrawsAdded: 1,
      availableGachaDraws,
      totalCycles,
    }
  },
})
