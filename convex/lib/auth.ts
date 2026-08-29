import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { ERROR_CODES } from './errors'

type AuthContext = Pick<QueryCtx, 'auth' | 'db'>

function throwAuthError(code: typeof ERROR_CODES.AUTH_REQUIRED | typeof ERROR_CODES.USER_NOT_FOUND): never {
  throw new ConvexError({ code })
}

export async function getCurrentIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) {
    throwAuthError(ERROR_CODES.AUTH_REQUIRED)
  }
  return identity
}

export async function requireCurrentUser(ctx: AuthContext): Promise<Doc<'users'>> {
  const identity = await getCurrentIdentity(ctx)
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
    .unique()

  if (user === null) {
    throwAuthError(ERROR_CODES.USER_NOT_FOUND)
  }

  return user
}

export async function getOrCreateCurrentUser(
  ctx: MutationCtx,
  timezone: string,
): Promise<Doc<'users'>> {
  const identity = await getCurrentIdentity(ctx)
  const existingUser = await ctx.db
    .query('users')
    .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
    .unique()

  if (existingUser !== null) {
    return existingUser
  }

  const now = Date.now()
  const userId = await ctx.db.insert('users', {
    clerkUserId: identity.subject,
    playerXp: 0,
    playerLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    recoveryUsedInWindow: false,
    totalCycles: 0,
    totalGachaDraws: 0,
    availableGachaDraws: 0,
    timezone,
    createdAt: now,
    updatedAt: now,
  })

  return (await ctx.db.get(userId))!
}

export async function requireOwnedGoal(
  ctx: AuthContext,
  goalId: Id<'goals'>,
  currentUser: Doc<'users'>,
): Promise<Doc<'goals'>> {
  const goal = await ctx.db.get(goalId)
  if (goal === null) {
    throw new ConvexError({ code: ERROR_CODES.GOAL_NOT_FOUND })
  }
  // oxlint-disable-next-line no-underscore-dangle -- Convex document IDs use `_id`.
  if (goal.userId !== currentUser._id) {
    throw new ConvexError({ code: ERROR_CODES.GOAL_FORBIDDEN })
  }
  return goal
}

export async function requireOwnedCycle(
  ctx: AuthContext,
  cycleId: Id<'pdcaCycles'>,
  currentUser: Doc<'users'>,
): Promise<Doc<'pdcaCycles'>> {
  const cycle = await ctx.db.get(cycleId)
  if (cycle === null) {
    throw new ConvexError({ code: ERROR_CODES.PDCA_NOT_FOUND })
  }
  // oxlint-disable-next-line no-underscore-dangle -- Convex document IDs use `_id`.
  if (cycle.userId !== currentUser._id) {
    throw new ConvexError({ code: ERROR_CODES.PDCA_FORBIDDEN })
  }
  return cycle
}
