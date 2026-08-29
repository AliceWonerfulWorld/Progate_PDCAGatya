// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

const TIMEZONE = 'Asia/Tokyo'

type TestConvex = ReturnType<typeof convexTest>

function localDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000))
}

async function seedUser(
  t: TestConvex,
  clerkUserId: string,
  lastCompletedDate?: string,
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('users', {
      clerkUserId,
      playerXp: 0,
      playerLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate,
      recoveryUsedInWindow: false,
      totalCycles: 0,
      totalGachaDraws: 0,
      availableGachaDraws: 0,
      timezone: TIMEZONE,
      createdAt: now,
      updatedAt: now,
    })
  })
}

describe('getDailyMissionStatus', () => {
  it('is not completed before any PDCA has been done', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')

    const status = await t.withIdentity({ subject: 'user_a' }).query(api.missions.getDailyMissionStatus, {})

    expect(status).toEqual({ completed: false, rewardXp: 50 })
  })

  it('is completed once a PDCA finished earlier today (reload-safe, T030)', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', localDate(0))

    const status = await t.withIdentity({ subject: 'user_a' }).query(api.missions.getDailyMissionStatus, {})

    expect(status.completed).toBe(true)
  })

  it('resets on a new local day even though a PDCA was completed yesterday', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a', localDate(-1))

    const status = await t.withIdentity({ subject: 'user_a' }).query(api.missions.getDailyMissionStatus, {})

    expect(status.completed).toBe(false)
  })
})
