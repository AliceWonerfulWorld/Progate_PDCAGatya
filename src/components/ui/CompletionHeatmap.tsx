export interface HeatmapDay {
  date: string
  count: number
}

// 密度5段。段階そのものが情報なので専用の連続スケールトークンを使う
// (primary-* の状態色を流用すると段が潰れて密度が読めなくなる)。
const CELL_LEVEL_CLASS = [
  'bg-primary-scale-1',
  'bg-primary-scale-2',
  'bg-primary-scale-3',
  'bg-primary-scale-4',
  'bg-primary-scale-5',
]

function levelClassFor(count: number): string {
  const level = count <= 0 ? 0 : Math.min(count, CELL_LEVEL_CLASS.length - 1)
  return CELL_LEVEL_CLASS[level]
}

// dateはYYYY-MM-DD(convex/lib/date.tsのgetLocalDateStringと同じ形式)。
// UTC固定でパースし、ローカルTZによる曜日ズレを避ける。
function weekdayOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// GitHubのContribution Graphと同じ配置(列=週、行=曜日)にするため、
// 先頭を日曜始まりに揃えるための空マスを差し込む。
function buildCells(days: HeatmapDay[]): (HeatmapDay | null)[] {
  if (days.length === 0) return []
  const leadingEmptyCount = weekdayOf(days[0].date)
  return [...Array<null>(leadingEmptyCount).fill(null), ...days]
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

// 「達成率」等の割合ではなく完了「回数」の濃淡のみを表現するため、
// docs/ui-spec.md #24.5が禁止する失敗強調表現には該当しない。
export function CompletionHeatmap({ days }: { days: HeatmapDay[] }) {
  const cells = buildCells(days)

  return (
    <div className="space-y-3">
      <div
        className="grid w-max max-w-full grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: 'repeat(7, 0.75rem)' }}
      >
        {cells.map((cell, index) =>
          cell === null ? (
            <div className="size-3" key={`empty-${index}`} />
          ) : (
            <div
              aria-label={`${formatDateLabel(cell.date)}: ${cell.count}回`}
              className={`size-3 rounded-[3px] ${levelClassFor(cell.count)}`}
              key={cell.date}
              title={`${cell.date} ${cell.count}回`}
            />
          ),
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-text-subtle">
        少ない
        {CELL_LEVEL_CLASS.map((className) => (
          <span className={`size-3 ${className}`} key={className} />
        ))}
        多い
      </div>
    </div>
  )
}
