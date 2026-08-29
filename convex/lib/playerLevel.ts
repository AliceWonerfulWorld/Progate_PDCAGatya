// Player Level curve.
//
// docs/game-design.md §12 gives the cumulative-XP table for levels 1-5 and
// states the later values are decided "実装・テスト時" (at implementation time),
// with the rule that each level costs a little more XP than the previous one.
// The table's increments are 300 / 400 / 500 / 600 (i.e. +100 per level), which
// generalises to a closed form for the cumulative XP required to reach level n:
//
//   requiredXpForLevel(n) = 50 * (n - 1) * (n + 4)
//
//   n=1 -> 0, n=2 -> 300, n=3 -> 700, n=4 -> 1200, n=5 -> 1800   (matches the doc)
//
// Player Level is always recalculated server-side from playerXp
// (docs/technical-design.md §21). Keep this as a pure function so the curve can
// be tuned without touching the completion mutation.

export function requiredXpForLevel(level: number): number {
  if (level <= 1) {
    return 0
  }
  return 50 * (level - 1) * (level + 4)
}

export function calculatePlayerLevel(playerXp: number): number {
  if (playerXp <= 0) {
    return 1
  }

  let level = 1
  while (requiredXpForLevel(level + 1) <= playerXp) {
    level += 1
  }
  return level
}
