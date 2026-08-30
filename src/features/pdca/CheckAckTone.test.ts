import { describe, expect, it } from 'vitest'
import { ackTone } from './CheckPage'

// ui-spec 13.4 / AGENTS #57: 重かった・できなかった選択に
// 肯定的な演出を返さない(温度のずれを防ぐ)。
describe('ackTone', () => {
  it('余裕だった / ちょうどよかった は light', () => {
    expect(ackTone('easy', 'completed')).toBe('light')
    expect(ackTone('justRight', 'completed')).toBe('light')
  })

  it('少し重かった / かなり重かった は quiet', () => {
    expect(ackTone('slightlyHeavy', 'completed')).toBe('quiet')
    expect(ackTone('tooHeavy', 'completed')).toBe('quiet')
  })

  it('DOでできなかった場合は、負荷の選択によらず quiet', () => {
    expect(ackTone('easy', 'notCompleted')).toBe('quiet')
    expect(ackTone('justRight', 'notCompleted')).toBe('quiet')
  })
})
