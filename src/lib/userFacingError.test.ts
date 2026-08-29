import { describe, expect, it } from 'vitest'
import { userFacingError } from './userFacingError'

describe('userFacingError', () => {
  it('converts an internal error code into user-facing copy', () => {
    expect(userFacingError(new Error('GACHA_NO_DRAW_AVAILABLE'), 'もう一度お試しください。')).toBe(
      'ガチャを引ける回数がありません。',
    )
  })

  it('uses the local fallback for unexpected errors', () => {
    expect(userFacingError(new Error('unexpected'), '保存できませんでした。')).toBe('保存できませんでした。')
  })
})
