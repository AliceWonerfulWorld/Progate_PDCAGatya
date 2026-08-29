// 全ボタン共通のインタラクション表現。押した/選んだことが目でも指でも
// 分かるように、hover・active(タップ時の縮小)・キーボードフォーカスの
// 見た目をここに集約する。個別画面のclassNameへテンプレートリテラルで
// 合成して使う(共有Reactコンポーネント化まではしない: 各画面で色や
// レイアウトの微調整が必要なため)。
const INTERACTION =
  'transition-colors duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

export const PRIMARY_BUTTON_CLASS =
  `${INTERACTION} bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300 disabled:active:scale-100`

export const SECONDARY_BUTTON_CLASS =
  `${INTERACTION} border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:active:scale-100`

export type ChoiceColor = 'emerald' | 'sky' | 'rose'

const CHOICE_COLORS: Record<ChoiceColor, { selected: string; unselected: string }> = {
  emerald: {
    selected: 'border-emerald-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    unselected: 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  },
  sky: {
    selected: 'border-sky-600 bg-sky-50 text-sky-800 hover:bg-sky-100',
    unselected: 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  },
  rose: {
    selected: 'border-rose-600 bg-rose-50 text-rose-800 hover:bg-rose-100',
    unselected: 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
  },
}

// 「選んだ状態」がはっきり分かるトグルボタン用(DO結果/CHECK負荷/ACT種別など)。
export function choiceButtonClass(selected: boolean, color: ChoiceColor = 'emerald'): string {
  const palette = CHOICE_COLORS[color]
  return `${INTERACTION} border ${selected ? palette.selected : palette.unselected}`
}
