export type ActType = 'lighter' | 'same' | 'heavier' | 'changeApproach'
export type CheckLoad = 'easy' | 'justRight' | 'slightlyHeavy' | 'tooHeavy'
export type DoResult = 'completed' | 'partial' | 'notCompleted'

// UI表示用ラベル。事実ベースの表現のみを使い、成功/失敗のような評価語は使わない
// （AGENTS.md #57 Product Copy Rule / AC-HISTORY-002）。
export const DO_RESULT_LABELS: Record<DoResult, string> = {
  completed: 'できた',
  partial: '一部できた',
  notCompleted: 'できなかった',
}

export const CHECK_LOAD_LABELS: Record<CheckLoad, string> = {
  easy: '余裕だった',
  justRight: 'ちょうどよかった',
  slightlyHeavy: '少し重かった',
  tooHeavy: 'かなり重かった',
}

export const ACT_TYPE_LABELS: Record<ActType, string> = {
  lighter: '少し軽くする',
  same: 'そのまま',
  heavier: '少し増やす',
  changeApproach: 'やり方を変える',
}

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
