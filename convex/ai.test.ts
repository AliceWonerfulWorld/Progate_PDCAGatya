// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('generatePlan', () => {
  it('AC-AI-006: returns fallback when no server-side LLM key is configured', async () => {
    const t = convexTest(schema, modules)

    const result = await t.action(api.ai.generatePlan, {
      mode: 'initial',
      goalName: '英語学習',
    })

    expect(result.usedFallback).toBe(true)
    expect(result.nextPlan).toContain('英語学習')
    expect(result.message.length).toBeGreaterThan(0)
  })
})
