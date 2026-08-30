import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OnboardingFocusOverlay } from './OnboardingFocusOverlay'

describe('OnboardingFocusOverlay', () => {
  it('blocks the surrounding screen while explaining the next focused action', () => {
    const html = renderToStaticMarkup(createElement(OnboardingFocusOverlay, {
      message: 'このボタンを押して、次へ進もう',
      rect: { bottom: 420, height: 48, left: 16, right: 360, top: 372, width: 344 },
    }))

    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('このボタンを押して、次へ進もう')
  })
})
