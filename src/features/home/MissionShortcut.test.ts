import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissionShortcut } from './MissionShortcut'

describe('MissionShortcut', () => {
  it('keeps the mission entry point visible as a separate floating action', () => {
    const html = renderToStaticMarkup(
      createElement(MissionShortcut, { completed: false, onClick: () => {}, rewardXp: 50 }),
    )

    expect(html).toContain('ミッション')
    expect(html).toContain('1周で +50 XP')
  })
})
