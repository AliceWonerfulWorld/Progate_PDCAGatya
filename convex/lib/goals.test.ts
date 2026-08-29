import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from './constants'
import { ERROR_CODES } from './errors'
import { validateGoalName } from '../goals'

describe('validateGoalName', () => {
  it('trims and accepts a Goal name (AC-GOAL-001)', () => {
    expect(validateGoalName(' 英語学習 ')).toBe('英語学習')
  })

  it.each(['', '   ', 'a'.repeat(INPUT_LIMITS.goalName + 1)])(
    'rejects invalid Goal names (AC-GOAL-002, AC-GOAL-003)',
    (name) => {
      try {
        validateGoalName(name)
        throw new Error('expected a ConvexError')
      } catch (error) {
        expect(error).toBeInstanceOf(ConvexError)
        expect((error as ConvexError<{ code: string }>).data.code).toBe(
          ERROR_CODES.VALIDATION_ERROR,
        )
      }
    },
  )
})
