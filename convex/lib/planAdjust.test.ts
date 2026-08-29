import { describe, expect, it } from 'vitest'
import { adjustPlanText } from './planAdjust'

describe('adjustPlanText', () => {
  it('decreases the first number when going lighter', () => {
    expect(adjustPlanText('英単語を5個復習する', 'lighter')).toBe('英単語を3個復習する')
  })

  it('increases the first number when going heavier', () => {
    expect(adjustPlanText('英単語を5個復習する', 'heavier')).toBe('英単語を7個復習する')
  })

  it('never reduces below 1', () => {
    expect(adjustPlanText('英単語を1個復習する', 'lighter')).toBe('英単語を1個復習する（少し軽めに）')
  })

  it('falls back to a qualifier suffix when there is no number', () => {
    expect(adjustPlanText('参考書を読む', 'lighter')).toBe('参考書を読む（少し軽めに）')
    expect(adjustPlanText('参考書を読む', 'heavier')).toBe('参考書を読む（少し多めに）')
  })
})
