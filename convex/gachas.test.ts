// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import { GACHA_SEED_DATA } from './lib/gachaSeed'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

async function seedUser(t: ReturnType<typeof convexTest>, clerkUserId: string) {
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

describe('seedGachas', () => {
  it('inserts every seed entry on first run, resolving characterNames to real IDs', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.characters.seedCharacters, {})
    const result = await t.mutation(internal.gachas.seedGachas, {})

    expect(result).toEqual({ inserted: GACHA_SEED_DATA.length, skipped: 0 })
    const gachas = await t.run((ctx) => ctx.db.query('gachas').collect())
    expect(gachas).toHaveLength(GACHA_SEED_DATA.length)

    const progate = gachas.find((gacha) => gacha.key === 'progate')
    expect(progate?.characterIds).toHaveLength(15)
    expect(progate?.startAt).toEqual(expect.any(Number))
    expect(progate?.endAt).toEqual(expect.any(Number))

    const standard = gachas.find((gacha) => gacha.key === 'standard')
    expect(standard?.characterIds).toBeUndefined()
    expect(standard?.startAt).toBeUndefined()
    expect(standard?.endAt).toBeUndefined()
  })

  it('is idempotent: re-running inserts nothing new', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.characters.seedCharacters, {})
    await t.mutation(internal.gachas.seedGachas, {})
    const second = await t.mutation(internal.gachas.seedGachas, {})

    expect(second).toEqual({ inserted: 0, skipped: GACHA_SEED_DATA.length })
    const gachas = await t.run((ctx) => ctx.db.query('gachas').collect())
    expect(gachas).toHaveLength(GACHA_SEED_DATA.length)
  })

  it('throws when a seed entry references a character name that does not exist yet', async () => {
    const t = convexTest(schema, modules)
    // characters:seedCharacters を実行していない状態。
    await expect(t.mutation(internal.gachas.seedGachas, {})).rejects.toThrow(
      /unknown character name/,
    )
  })
})

describe('getActiveGachaRates', () => {
  it('returns the rates for an active gacha', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('gachas', {
        key: 'standard',
        name: '恒常ガチャ',
        rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
        isActive: true,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
    })

    const rates = await t.query(api.gachas.getActiveGachaRates, { key: 'standard' })
    expect(rates).toEqual({ R: 0.7, SR: 0.25, SSR: 0.05 })
  })

  it('returns null when the key does not exist', async () => {
    const t = convexTest(schema, modules)
    const rates = await t.query(api.gachas.getActiveGachaRates, { key: 'does-not-exist' })
    expect(rates).toBeNull()
  })

  it('returns null when the gacha exists but is inactive', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('gachas', {
        key: 'standard',
        name: '恒常ガチャ',
        rates: { R: 0.7, SR: 0.25, SSR: 0.05 },
        isActive: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
    })

    const rates = await t.query(api.gachas.getActiveGachaRates, { key: 'standard' })
    expect(rates).toBeNull()
  })
})

describe('listActiveGachas', () => {
  it('lists active gachas sorted by sortOrder, with character names resolved and ended ones excluded', async () => {
    const t = convexTest(schema, modules)
    await seedUser(t, 'user_a')

    const charA = await t.run(async (ctx) => {
      const now = Date.now()
      return ctx.db.insert('characters', {
        name: 'キャラA',
        rarity: 'R',
        description: '',
        imagePath: '/a.webp',
        sortOrder: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
    })

    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert('gachas', {
        key: 'standard',
        name: '恒常ガチャ',
        rates: { R: 1, SR: 0, SSR: 0 },
        isActive: true,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('gachas', {
        key: 'progate',
        name: 'Progateガチャ',
        rates: { R: 1, SR: 0, SSR: 0 },
        characterIds: [charA],
        isActive: true,
        sortOrder: 2,
        startAt: now - 1000,
        endAt: now + 1000 * 60 * 60,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('gachas', {
        key: 'ended-event',
        name: '終了済みイベント',
        rates: { R: 1, SR: 0, SSR: 0 },
        isActive: true,
        sortOrder: 3,
        startAt: now - 2000,
        endAt: now - 1000,
        createdAt: now,
        updatedAt: now,
      })
    })

    const result = await t.withIdentity({ subject: 'user_a' }).query(api.gachas.listActiveGachas, {})

    expect(result.map((gacha) => gacha.key)).toEqual(['standard', 'progate'])
    expect(result[1].characterNames).toEqual(['キャラA'])
    expect(result[1].endAt).toBeGreaterThan(now)
  })
})
