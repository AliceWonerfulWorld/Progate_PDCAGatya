import { describe, expect, it } from 'vitest'
import { classifyPushSendError } from './pushClassifyError'

describe('classifyPushSendError', () => {
  it('classifies a 404 as stale', () => {
    expect(classifyPushSendError({ statusCode: 404 })).toBe('stale')
  })

  it('classifies a 410 as stale', () => {
    expect(classifyPushSendError({ statusCode: 410 })).toBe('stale')
  })

  it('classifies other status codes as failed', () => {
    expect(classifyPushSendError({ statusCode: 500 })).toBe('failed')
    expect(classifyPushSendError({ statusCode: 429 })).toBe('failed')
  })

  it('classifies an error without a statusCode as failed', () => {
    expect(classifyPushSendError(new Error('network down'))).toBe('failed')
    expect(classifyPushSendError(null)).toBe('failed')
    expect(classifyPushSendError(undefined)).toBe('failed')
  })
})
