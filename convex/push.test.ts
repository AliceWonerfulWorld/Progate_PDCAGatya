// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { ERROR_CODES } from './lib/errors'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

type TestConvex = ReturnType<typeof convexTest>

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  overrides: Partial<{ timezone: string; lastCompletedDate: string }> = {},
): Promise<Id<'users'>> {
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
      timezone: overrides.timezone ?? 'Asia/Tokyo',
      lastCompletedDate: overrides.lastCompletedDate,
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

const subscribeArgs = {
  endpoint: 'https://push.example.com/subscription/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  notifyHours: [10],
}

describe('push.subscribe / unsubscribe / updateNotifyHours', () => {
  it('creates a subscription owned by the calling user', async () => {
    const t = convexTest(schema, modules)
    const userId = await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })

    await asOwner.mutation(api.push.subscribe, subscribeArgs)

    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )
    expect(subscription?.userId).toBe(userId)
    expect(subscription?.notifyHours).toEqual([10])
  })

  it('upserts on re-subscribe with the same endpoint instead of duplicating', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })

    await asOwner.mutation(api.push.subscribe, subscribeArgs)
    await asOwner.mutation(api.push.subscribe, { ...subscribeArgs, notifyHours: [7, 19] })

    const subscriptions = await t.run((ctx) => ctx.db.query('pushSubscriptions').collect())
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].notifyHours).toEqual([7, 19])
  })

  it('rejects an empty notifyHours array', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })

    await expectConvexErrorCode(
      asOwner.mutation(api.push.subscribe, { ...subscribeArgs, notifyHours: [] }),
      ERROR_CODES.VALIDATION_ERROR,
    )
  })

  it('rejects an out-of-range notifyHours value', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })

    await expectConvexErrorCode(
      asOwner.mutation(api.push.subscribe, { ...subscribeArgs, notifyHours: [24] }),
      ERROR_CODES.VALIDATION_ERROR,
    )
  })

  it("rejects another user's unsubscribe and leaves the subscription intact (AGENTS.md #46)", async () => {
    const t = convexTest(schema, modules)
    const ownerId = await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_b' }).mutation(api.push.unsubscribe, { endpoint: subscribeArgs.endpoint }),
      ERROR_CODES.PUSH_SUBSCRIPTION_FORBIDDEN,
    )

    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )
    expect(subscription?.userId).toBe(ownerId)
  })

  it("rejects another user's updateNotifyHours (AGENTS.md #46)", async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_b' }).mutation(api.push.updateNotifyHours, {
        endpoint: subscribeArgs.endpoint,
        notifyHours: [21],
      }),
      ERROR_CODES.PUSH_SUBSCRIPTION_FORBIDDEN,
    )
  })

  it('unsubscribe on a nonexistent endpoint reports not found', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')

    await expectConvexErrorCode(
      t.withIdentity({ subject: 'user_a' }).mutation(api.push.unsubscribe, { endpoint: 'https://push.example.com/unknown' }),
      ERROR_CODES.PUSH_SUBSCRIPTION_NOT_FOUND,
    )
  })

  it('the owner can update their own notifyHours', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    const asOwner = t.withIdentity({ subject: 'user_a' })
    await asOwner.mutation(api.push.subscribe, subscribeArgs)

    await asOwner.mutation(api.push.updateNotifyHours, { endpoint: subscribeArgs.endpoint, notifyHours: [21] })

    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )
    expect(subscription?.notifyHours).toEqual([21])
  })
})

describe('push.getMyNotifyHours', () => {
  it("returns the owner's notifyHours for their own endpoint", async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    const hours = await t
      .withIdentity({ subject: 'user_a' })
      .query(api.push.getMyNotifyHours, { endpoint: subscribeArgs.endpoint })
    expect(hours).toEqual([10])
  })

  it("returns null for another user's endpoint (does not leak existence)", async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await seedUser(t, 'user_b')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    const hours = await t
      .withIdentity({ subject: 'user_b' })
      .query(api.push.getMyNotifyHours, { endpoint: subscribeArgs.endpoint })
    expect(hours).toBeNull()
  })

  it('returns null for a nonexistent endpoint', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')

    const hours = await t
      .withIdentity({ subject: 'user_a' })
      .query(api.push.getMyNotifyHours, { endpoint: 'https://push.example.com/unknown' })
    expect(hours).toBeNull()
  })
})

describe('push.getVapidPublicKey', () => {
  it('returns null when the VAPID env vars are not configured', async () => {
    const t = convexTest(schema, modules)
    const result = await t.query(api.push.getVapidPublicKey, {})
    expect(result).toBeNull()
  })
})

describe('push.listEligibleAtRiskPage', () => {
  // 2026-08-29T01:00:00Z = 2026-08-29 10:00 JST
  const now = Date.UTC(2026, 7, 29, 1, 0, 0)

  it('includes a subscription that is at risk, at its selected hour, and not yet notified today', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { lastCompletedDate: '2026-08-27' })
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    const page = await t.query(internal.push.listEligibleAtRiskPage, {
      paginationOpts: { cursor: null, numItems: 10 },
      now,
    })

    expect(page.eligible).toHaveLength(1)
    expect(page.eligible[0].endpoint).toBe(subscribeArgs.endpoint)
    expect(page.eligible[0].today).toBe('2026-08-29')
  })

  it('excludes a subscription already notified today', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { lastCompletedDate: '2026-08-27' })
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)
    await t.run((ctx) =>
      ctx.db
        .query('pushSubscriptions')
        .withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint))
        .unique()
        .then((sub) => sub && ctx.db.patch(sub._id, { lastNotifiedDate: '2026-08-29' })),
    )

    const page = await t.query(internal.push.listEligibleAtRiskPage, {
      paginationOpts: { cursor: null, numItems: 10 },
      now,
    })

    expect(page.eligible).toHaveLength(0)
  })

  it('excludes a subscription whose notifyHours does not match the current local hour', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { lastCompletedDate: '2026-08-27' })
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, { ...subscribeArgs, notifyHours: [19] })

    const page = await t.query(internal.push.listEligibleAtRiskPage, {
      paginationOpts: { cursor: null, numItems: 10 },
      now,
    })

    expect(page.eligible).toHaveLength(0)
  })

  it('excludes a subscription whose streak is not at risk', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', { lastCompletedDate: '2026-08-29' })
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)

    const page = await t.query(internal.push.listEligibleAtRiskPage, {
      paginationOpts: { cursor: null, numItems: 10 },
      now,
    })

    expect(page.eligible).toHaveLength(0)
  })
})

describe('push.applySendResults', () => {
  it('records lastNotifiedDate for a sent result', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)
    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )

    await t.mutation(internal.push.applySendResults, {
      results: [{ subscriptionId: subscription!._id, status: 'sent', today: '2026-08-29' }],
    })

    const updated = await t.run((ctx) => ctx.db.get(subscription!._id))
    expect(updated?.lastNotifiedDate).toBe('2026-08-29')
  })

  it('deletes the subscription for a stale result', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)
    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )

    await t.mutation(internal.push.applySendResults, {
      results: [{ subscriptionId: subscription!._id, status: 'stale', today: '2026-08-29' }],
    })

    const updated = await t.run((ctx) => ctx.db.get(subscription!._id))
    expect(updated).toBeNull()
  })

  it('leaves the subscription untouched for a failed result (self-healing retry)', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')
    await t.withIdentity({ subject: 'user_a' }).mutation(api.push.subscribe, subscribeArgs)
    const subscription = await t.run((ctx) =>
      ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', subscribeArgs.endpoint)).unique(),
    )

    await t.mutation(internal.push.applySendResults, {
      results: [{ subscriptionId: subscription!._id, status: 'failed', today: '2026-08-29' }],
    })

    const updated = await t.run((ctx) => ctx.db.get(subscription!._id))
    expect(updated?.lastNotifiedDate).toBeUndefined()
  })
})
