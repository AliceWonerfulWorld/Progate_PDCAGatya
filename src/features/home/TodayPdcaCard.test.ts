import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TodayPdcaCard } from './TodayPdcaCard'

describe('TodayPdcaCard', () => {
  it('makes one suggested PLAN the primary action', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(TodayPdcaCard, {
          goal: { _id: 'goal-1', name: '英語学習', nextPlanCandidate: '英単語を5個復習する' },
        }),
      ),
    )

    expect(html).toContain('今日のPDCA')
    expect(html).toContain('英語学習')
    expect(html).toContain('英単語を5個復習する')
    expect(html).toContain('このPDCAを始める')
    expect(html).toContain('href="/pdca/plan/goal-1"')
  })
})
