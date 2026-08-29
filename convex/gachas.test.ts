// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api, internal } from './_generated/api'
import { GACHA_SEED_DATA } from './lib/gachaSeed'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

describe('seedGachas', () => {
  it('inserts every seed entry on first run', async () => {
    const t = convexTest(schema, modules)
    const result = await t.mutation(internal.gachas.seedGachas, {})

    expect(result).toEqual({ inserted: GACHA_SEED_DATA.length, skipped: 0 })
    const gachas = await t.run((ctx) => ctx.db.query('gachas').collect())
    expect(gachas).toHaveLength(GACHA_SEED_DATA.length)
  })

  it('is idempotent: re-running inserts nothing new', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(internal.gachas.seedGachas, {})
    const second = await t.mutation(internal.gachas.seedGachas, {})

    expect(second).toEqual({ inserted: 0, skipped: GACHA_SEED_DATA.length })
    const gachas = await t.run((ctx) => ctx.db.query('gachas').collect())
    expect(gachas).toHaveLength(GACHA_SEED_DATA.length)
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
