// docs/ui-spec.md #9.4: 「もっと軽く」「もう少しやる」はユーザーにカテゴリ判定や
// 文章の書き直しを要求せず、相対操作だけで完結させる。
// AI PLAN生成 (T020/T021) が入るまでの間、決定的なルールベースで
// PLANテキストを軽く/重く調整するための純粋関数。
const NUMBER_PATTERN = /\d+/

export type PlanAdjustDirection = 'lighter' | 'heavier'

export function adjustPlanText(planText: string, direction: PlanAdjustDirection): string {
  const trimmed = planText.trim()
  const match = trimmed.match(NUMBER_PATTERN)

  if (match) {
    const current = Number(match[0])
    const next =
      direction === 'lighter'
        ? Math.max(1, Math.round(current * 0.6))
        : Math.max(current + 1, Math.round(current * 1.4))

    if (next !== current) {
      return trimmed.replace(NUMBER_PATTERN, String(next))
    }
  }

  return direction === 'lighter' ? `${trimmed}（少し軽めに）` : `${trimmed}（少し多めに）`
}
