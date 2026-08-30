import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Doc } from '../../../convex/_generated/dataModel'
import { ActiveCycleCard } from './ActiveCycleCard'

describe('ActiveCycleCard', () => {
  it('puts the active Goal, DO task, and CHECK action in the primary card', () => {
    const cycle = {
      _id: 'cycle-1',
      goalId: 'goal-1',
      planText: '英単語を5個復習する',
      status: 'doing',
    } as unknown as Doc<'pdcaCycles'>
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ActiveCycleCard, { active: { cycle, goalName: '英語学習' } }),
      ),
    )

    expect(html).toContain('いま取り組んでいるGoal')
    expect(html).toContain('英語学習')
    expect(html).toContain('DO：いまやること')
    expect(html).toContain('英単語を5個復習する')
    expect(html).toContain('CHECKへ進む')
    expect(html).toContain('href="/pdca/do/cycle-1"')
  })
})
