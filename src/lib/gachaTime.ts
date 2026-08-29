// ガチャ選択画面で、各ガチャの下に残り時間を表示するための整形。
// startAt/endAtが両方未指定 = 恒常ガチャとして「常時開催」を返す。
export function formatRemainingTime(endAt: number | undefined, now: number = Date.now()): string {
  if (endAt === undefined) return '常時開催'

  const remainingMs = endAt - now
  if (remainingMs <= 0) return '終了しました'

  const totalMinutes = Math.floor(remainingMs / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `残り${days}日${hours}時間`
  if (hours > 0) return `残り${hours}時間${minutes}分`
  return `残り${Math.max(minutes, 1)}分`
}
