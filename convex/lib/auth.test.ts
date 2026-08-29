import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { requireCurrentUser, requireOwnedCycle, requireOwnedGoal } from './auth'
import { ERROR_CODES } from './errors'

const userAId = 'users:user-a' as Id<'users'>
const userBId = 'users:user-b' as Id<'users'>

const userA = { _id: userAId } as Doc<'users'>

function createContext({
  identity = { subject: 'user-a', tokenIdentifier: 'https://clerk.example|user-a' },
  currentUser = userA,
  fallbackUser,
  document,
}: {
  identity?: { subject: string; tokenIdentifier: string } | null
  currentUser?: Doc<'users'> | null
  fallbackUser?: Doc<'users'> | null
  document?: Doc<'goals'> | Doc<'pdcaCycles'> | null
} = {}): QueryCtx {
  let lookupCount = 0
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
    db: {
      query: () => ({
        withIndex: () => ({
          unique: async () => {
            lookupCount += 1
            return lookupCount === 1 ? currentUser : fallbackUser ?? currentUser
          },
        }),
      }),
      get: async () => document ?? null,
    },
  } as unknown as QueryCtx
}

async function expectErrorCode(action: () => Promise<unknown>, code: string) {
  try {
    await action()
    throw new Error('expected a ConvexError')
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code)
  }
}

describe('requireCurrentUser', () => {
  it('rejects unauthenticated access (AC-AUTH-002)', async () => {
    await expectErrorCode(
      () => requireCurrentUser(createContext({ identity: null })),
      ERROR_CODES.AUTH_REQUIRED,
    )
  })

  it('rejects an identity without an application user', async () => {
    await expectErrorCode(
      () => requireCurrentUser(createContext({ currentUser: null })),
      ERROR_CODES.USER_NOT_FOUND,
    )
  })

  it('supports legacy users saved with the Clerk subject', async () => {
    await expect(
      requireCurrentUser(createContext({ currentUser: null, fallbackUser: userA })),
    ).resolves.toBe(userA)
  })
})

describe('ownership helpers', () => {
  it('rejects another user from accessing a Goal (AC-AUTH-003)', async () => {
    const goal = { userId: userBId } as Doc<'goals'>

    await expectErrorCode(
      () => requireOwnedGoal(createContext({ document: goal }), 'goals:goal-a' as Id<'goals'>, userA),
      ERROR_CODES.GOAL_FORBIDDEN,
    )
  })

  it('rejects another user from accessing a Cycle (AC-AUTH-004)', async () => {
    const cycle = { userId: userBId } as Doc<'pdcaCycles'>

    await expectErrorCode(
      () =>
        requireOwnedCycle(
          createContext({ document: cycle }),
          'pdcaCycles:cycle-a' as Id<'pdcaCycles'>,
          userA,
        ),
      ERROR_CODES.PDCA_FORBIDDEN,
    )
  })

  it('returns an owned Goal', async () => {
    const goal = { userId: userAId } as Doc<'goals'>

    await expect(
      requireOwnedGoal(createContext({ document: goal }), 'goals:goal-a' as Id<'goals'>, userA),
    ).resolves.toBe(goal)
  })
})
