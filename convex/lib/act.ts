export type ActType = 'lighter' | 'same' | 'heavier' | 'changeApproach'
export type CheckLoad = 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
export type DoResult = 'completed' | 'partial' | 'notCompleted'

// CHECK結果からシステム推奨ACTを1つ決める（ui-spec 14.3）。
// 推奨は初期選択状態にするだけで、ユーザーは常に変更できる。
export function recommendActType(checkLoad: CheckLoad, doResult: DoResult | undefined): ActType {
  if (checkLoad === 'tooHeavy') return 'lighter'
  // 重すぎではないのに実行できなかった場合は、量ではなくやり方を見直す。
  if (doResult === 'notCompleted') return 'changeApproach'
  if (checkLoad === 'slightlyHeavy') return 'lighter'
  if (checkLoad === 'easy') return 'heavier'
  return 'same'
}
