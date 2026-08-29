// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { INPUT_LIMITS } from './lib/constants'
import { ERROR_CODES } from './lib/errors'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(t: TestConvex, clerkUserId: string): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('users', {
      clerkUserId,
      playerXp: 0,
      playerLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      recoveryUsedInWindow: false,
      totalCycles: 0,
      totalGachaDraws: 0,
      availableGachaDraws: 0,
      timezone: 'Asia/Tokyo',
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function expectConvexErrorCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise
    throw new Error('expected the call to throw a ConvexError')
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError)
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code)
  }
}

describe('setDisplayName (AC-SEC-003)', () => {
  it('trims whitespace and persists the display name', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })

    const result = await asUser.mutation(api.users.setDisplayName, { displayName: '  ゆうと  ' })
    expect(result.displayName).toBe('ゆうと')

    const currentUser = await asUser.query(api.users.currentUser, {})
    expect(currentUser.displayName).toBe('ゆうと')
  })

  it('rejects an empty (or whitespace-only) name', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })

    await expectConvexErrorCode(
      asUser.mutation(api.users.setDisplayName, { displayName: '   ' }),
      ERROR_CODES.VALIDATION_ERROR,
    )
  })

  it('rejects a name longer than INPUT_LIMITS.displayName', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asUser = t.withIdentity({ subject: 'user_a' })

    const tooLong = 'あ'.repeat(INPUT_LIMITS.displayName + 1)
    await expectConvexErrorCode(
      asUser.mutation(api.users.setDisplayName, { displayName: tooLong }),
      ERROR_CODES.VALIDATION_ERROR,
    )
  })
})
