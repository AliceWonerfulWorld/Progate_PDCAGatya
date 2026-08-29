// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/!(*.*.*)*.*s')

type TestConvex = ReturnType<typeof convexTest>

async function seedCharacter(
  t: TestConvex,
  overrides: Partial<{ name: string; rarity: 'R' | 'SR' | 'SSR'; isActive: boolean }> = {},
): Promise<Id<'characters'>> {
  return t.run(async (ctx) => {
    const now = Date.now()
    return ctx.db.insert('characters', {
      name: overrides.name ?? 'テストキャラ',
      rarity: overrides.rarity ?? 'R',
      description: 'テスト用',
      imagePath: '/characters/test.webp',
      sortOrder: 1,
      isActive: overrides.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
  })
}

describe('listActiveForGuestGacha', () => {
  it('returns all active characters when no "standard" gacha row exists (fallback)', async () => {
    const t = convexTest(schema, modules)
    await seedCharacter(t, { name: 'キャラA' })
    await seedCharacter(t, { name: 'キャラB', isActive: false })

    const result = await t.query(api.characters.listActiveForGuestGacha, {})
    expect(result.map((c) => c.name)).toEqual(['キャラA'])
  })

  it("excludes characters not in the standard gacha's characterIds (e.g. Progate-exclusive)", async () => {
    const t = convexTest(schema, modules)
    const baseId = await seedCharacter(t, { name: 'ベースキャラ' })
    await seedCharacter(t, { name: 'にんじゃわんこ' })

    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('gachas', {
        key: 'standard',
        name: '恒常ガチャ',
        rates: { R: 1, SR: 0, SSR: 0 },
        characterIds: [baseId],
        isActive: true,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
    })

    const result = await t.query(api.characters.listActiveForGuestGacha, {})
    expect(result.map((c) => c.name)).toEqual(['ベースキャラ'])
  })
})
