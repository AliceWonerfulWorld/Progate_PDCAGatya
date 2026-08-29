// 全ボタン共通のインタラクション表現。押した/選んだことが目でも指でも
// 分かるように、hover・active(タップ時の縮小)・キーボードフォーカスの
// 見た目をここに集約する。個別画面のclassNameへテンプレートリテラルで
// 合成して使う(共有Reactコンポーネント化まではしない: 各画面で色や
// レイアウトの微調整が必要なため)。
//
// duration は `duration-(--duration-fast)` 形式で参照する。Tailwind v4 の
// --duration-* は utility 生成 namespace ではないため `duration-fast` とは
// 書けず、またこの形にしないと prefers-reduced-motion (src/index.css) での
// 上書きが効かない。アプリのモーションの大半がこの1行を通る。
const INTERACTION =
  'transition-colors duration-(--duration-fast) ease-standard active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export const PRIMARY_BUTTON_CLASS =
  `${INTERACTION} bg-primary hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:bg-border disabled:hover:bg-border disabled:active:scale-100`

export const SECONDARY_BUTTON_CLASS =
  `${INTERACTION} border border-border hover:border-border-strong hover:bg-surface-subtle active:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:border-border disabled:hover:bg-transparent disabled:active:scale-100`

// 選択ボタンの色は意味で選ぶ:
//   primary = 肯定的な既定の選択肢 / info = 中立 / warn = 注意を促す選択肢
// レアリティ色(rarity-*)とは別系統のトークンを使っている。
export type ChoiceColor = 'primary' | 'info' | 'warn'

const CHOICE_COLORS: Record<ChoiceColor, { selected: string; unselected: string }> = {
  primary: {
    selected: 'border-primary bg-primary-subtle text-primary-strong hover:bg-primary-subtle-hover',
    unselected: 'border-border text-text-body hover:border-border-strong hover:bg-surface-subtle',
  },
  info: {
    selected: 'border-choice-info bg-choice-info-bg text-choice-info-text hover:bg-choice-info-bg-hover',
    unselected: 'border-border text-text-body hover:border-border-strong hover:bg-surface-subtle',
  },
  warn: {
    selected: 'border-choice-warn bg-choice-warn-bg text-choice-warn-text hover:bg-choice-warn-bg-hover',
    unselected: 'border-border text-text-body hover:border-border-strong hover:bg-surface-subtle',
  },
}

// 「選んだ状態」がはっきり分かるトグルボタン用(DO結果/CHECK負荷/ACT種別など)。
export function choiceButtonClass(selected: boolean, color: ChoiceColor = 'primary'): string {
  const palette = CHOICE_COLORS[color]
  return `${INTERACTION} border ${selected ? palette.selected : palette.unselected}`
}
