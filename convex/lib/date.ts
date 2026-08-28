// Streak / Recovery / Daily 判定の基礎となるローカル日付計算。
// Server current time + users.timezone のみを信頼し、Frontend提供のtoday値には依存しない。

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getLocalDateString(timestamp: number, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date(timestamp))
}

function parseLocalDateToUtcMs(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

export function daysBetweenLocalDates(a: string, b: string): number {
  return Math.round((parseLocalDateToUtcMs(b) - parseLocalDateToUtcMs(a)) / MS_PER_DAY)
}

export function isNextLocalDay(a: number, b: number, timezone: string): boolean {
  const dateA = getLocalDateString(a, timezone)
  const dateB = getLocalDateString(b, timezone)
  return daysBetweenLocalDates(dateA, dateB) === 1
}
