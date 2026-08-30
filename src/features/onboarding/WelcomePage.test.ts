import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WelcomeScreen } from './WelcomePage'

describe('WelcomeScreen', () => {
  it('starts the Guest-first PDCA journey without requesting login', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(WelcomeScreen)),
    )

    expect(html).toContain('PDCA GACHA')
    expect(html).toContain('PDCAを回したら、ガチャを回せる。')
    expect(html).toContain('アカウント登録なしで始められます')
    expect(html).toContain('href="/goals/new"')
    expect(html).toContain('はじめる')
  })
})
