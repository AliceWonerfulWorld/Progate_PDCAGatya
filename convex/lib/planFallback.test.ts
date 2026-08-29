import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from './constants'
import {
  isValidAiPlanCandidate,
  resolveNextPlan,
  resolveNextPlanFallback,
} from './planFallback'

describe('resolveNextPlanFallback', () => {
  it('returns a short, non-empty initial PLAN when no history exists', () => {
    const plan = resolveNextPlanFallback({ mode: 'initial', goalName: '英語学習' })
    expect(plan.length).toBeGreaterThan(0)
    expect(plan).toContain('英語学習')
  })

  it('same: reuses currentPlan as-is (the minimum viable fallback per #52)', () => {
    const plan = resolveNextPlanFallback({
      mode: 'next',
      goalName: '英語学習',
      currentPlan: '英単語を5個復習する',
      actType: 'same',
    })
    expect(plan).toBe('英単語を5個復習する')
  })

  it('lighter: proposes a smaller task than before', () => {
    const plan = resolveNextPlanFallback({
      mode: 'next',
      goalName: '英語学習',
      currentPlan: '英単語を10個覚える',
      actType: 'lighter',
    })
    expect(plan).toContain('英単語を10個覚える')
    expect(plan).not.toBe('英単語を10個覚える')
  })

  it('heavier: proposes a slightly larger task', () => {
    const plan = resolveNextPlanFallback({
      mode: 'next',
      goalName: '英語学習',
      currentPlan: '英単語を10個覚える',
      actType: 'heavier',
    })
    expect(plan).toContain('英単語を10個覚える')
    expect(plan).not.toBe('英単語を10個覚える')
  })

  it('changeApproach: still returns a non-empty, editable PLAN candidate', () => {
    const plan = resolveNextPlanFallback({
      mode: 'next',
      goalName: '英語学習',
      currentPlan: '英単語を10個覚える',
      actType: 'changeApproach',
    })
    expect(plan.length).toBeGreaterThan(0)
  })

  it('falls back to the initial-style fallback when next mode has no currentPlan', () => {
    const plan = resolveNextPlanFallback({ mode: 'next', goalName: '英語学習', actType: 'same' })
    expect(plan.length).toBeGreaterThan(0)
  })

  it('never exceeds the planText input limit', () => {
    const longPlan = 'あ'.repeat(INPUT_LIMITS.planText)
    const plan = resolveNextPlanFallback({
      mode: 'next',
      goalName: '英語学習',
      currentPlan: longPlan,
      actType: 'lighter',
    })
    expect(plan.length).toBeLessThanOrEqual(INPUT_LIMITS.planText)
  })
})

describe('isValidAiPlanCandidate', () => {
  it('accepts a well-formed candidate', () => {
    expect(isValidAiPlanCandidate({ nextPlan: '英単語を5個復習する' })).toBe(true)
    expect(isValidAiPlanCandidate({ nextPlan: '英単語を5個復習する', message: '軽めにしました' })).toBe(
      true,
    )
  })

  it('AC-AI-004: rejects an empty nextPlan', () => {
    expect(isValidAiPlanCandidate({ nextPlan: '' })).toBe(false)
    expect(isValidAiPlanCandidate({ nextPlan: '   ' })).toBe(false)
  })

  it('AC-AI-005: rejects a nextPlan longer than the input limit', () => {
    expect(isValidAiPlanCandidate({ nextPlan: 'あ'.repeat(INPUT_LIMITS.planText + 1) })).toBe(false)
  })

  it('rejects missing or wrongly-typed nextPlan', () => {
    expect(isValidAiPlanCandidate({})).toBe(false)
    expect(isValidAiPlanCandidate({ nextPlan: 123 })).toBe(false)
    expect(isValidAiPlanCandidate(null)).toBe(false)
    expect(isValidAiPlanCandidate('not an object')).toBe(false)
  })

  it('rejects a non-string message field', () => {
    expect(isValidAiPlanCandidate({ nextPlan: 'ok', message: 42 })).toBe(false)
  })
})

describe('resolveNextPlan', () => {
  const fallbackInput = {
    mode: 'next' as const,
    goalName: '英語学習',
    currentPlan: '英単語を10個覚える',
    actType: 'same' as const,
  }

  it('uses the AI candidate when the JSON is valid', () => {
    const result = resolveNextPlan(
      JSON.stringify({ nextPlan: '英単語を5個復習する', message: '軽めにしました' }),
      fallbackInput,
    )
    expect(result).toEqual({ nextPlan: '英単語を5個復習する', usedFallback: false })
  })

  it('AC-AI-003: falls back on broken JSON, core loop continues', () => {
    const result = resolveNextPlan('{not valid json', fallbackInput)
    expect(result.usedFallback).toBe(true)
    expect(result.nextPlan.length).toBeGreaterThan(0)
  })

  it('AC-AI-004: falls back when nextPlan is empty', () => {
    const result = resolveNextPlan(JSON.stringify({ nextPlan: '' }), fallbackInput)
    expect(result.usedFallback).toBe(true)
    expect(result.nextPlan.length).toBeGreaterThan(0)
  })

  it('AC-AI-005: falls back when nextPlan exceeds the length limit', () => {
    const result = resolveNextPlan(
      JSON.stringify({ nextPlan: 'あ'.repeat(INPUT_LIMITS.planText + 1) }),
      fallbackInput,
    )
    expect(result.usedFallback).toBe(true)
  })

  it('AC-AI-006: falls back on API failure / timeout / network failure (represented as null)', () => {
    const result = resolveNextPlan(null, fallbackInput)
    expect(result.usedFallback).toBe(true)
    expect(result.nextPlan.length).toBeGreaterThan(0)
  })
})
