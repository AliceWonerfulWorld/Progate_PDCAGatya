import { addDaysToLocalDate, daysBetweenLocalDates } from './date'

// docs/technical-design.md #35-45 (Streak Model / Streak Resolver) と
// docs/acceptance-criteria.md AC-STREAK-*/AC-RECOVERY-* に対応する共通ロジック。
//
// `didCompleteToday` は仕様書のサンプルシグネチャには無いが、以下の2つの
// 呼び出しパターンを1つの純粋関数で両立させるために追加した:
//   - 状態確認のみ(Home Query, Recovery開始前チェック等): didCompleteToday=false
//   - PDCA(通常 or Recovery)が今まさに完了した(PDCA完了Mutation, Recovery完了):
//     didCompleteToday=true
// これが無いと、AC-RECOVERY-004(期限切れ時に何もPDCAを完了せず resolve した
// 場合は currentStreak=0)と AC-STREAK-001/003(完了時は currentStreak=1 / +1)
// を同じ関数で両立できない。
//
// 補足(実装メモ): 現在の schema には streakStatus / pendingRecoveryDate が
// 存在せず、代わりに recoveryUsedInWindow を持つ(convex/schema.ts,
// convex/lib/auth.ts の getOrCreateCurrentUser)。technical-design.md #41 は
// recoveryUsedInWindow のような重複状態を持たず lastRecoveryDate のローリング
// 判定を使う方針のため、本ファイルはtechnical-design.md準拠で実装した。
//
// streakStatus / pendingRecoveryDate はschema変更なしで運用する。
// deriveStreakStatus() が lastCompletedDate + today から都度その場で導出する
// ため、永続化は不要（#15 検討時にschema追加案も出したが、直接Recoveryの
// 主要フローは導出だけで正しく動くため見送った）。
//
// 既知の制約: 「At Risk中に通常PDCAを1件完了→同日中に別途Recovery PDCAを
// 完了」という2段階の順序（AC-RECOVERY-005、P1）だけは、1件目の完了で
// lastCompletedDateが上書きされ「元々どの日を欠席したか」が失われるため、
// 2件目のRecoveryで正しく救済できない。これを完全に直すにはschemaへ
// pendingRecoveryDate（1フィールドのみ）の追加が必要。

export type StreakStatus = 'active' | 'atRisk'

export interface ResolveStreakStateInput {
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | undefined
  lastRecoveryDate: string | undefined
  streakStatus: StreakStatus
  pendingRecoveryDate: string | undefined
  today: string
  isRecovery: boolean
  didCompleteToday: boolean
}

export interface ResolveStreakStateResult {
  currentStreak: number
  longestStreak: number
  streakStatus: StreakStatus
  pendingRecoveryDate: string | undefined
  lastCompletedDate: string | undefined
  lastRecoveryDate: string | undefined
  streakUpdated: boolean
}

// Recovery is available at most once per rolling 7 days (docs/technical-design.md #41).
export function isRecoveryAvailable(lastRecoveryDate: string | undefined, today: string): boolean {
  if (lastRecoveryDate === undefined) return true
  return daysBetweenLocalDates(lastRecoveryDate, today) >= 7
}

function withinRecoveryDeadline(pendingRecoveryDate: string, today: string): boolean {
  // Deadline: end of the local day after the missed date (docs/technical-design.md #42).
  return daysBetweenLocalDates(pendingRecoveryDate, today) <= 1
}

export interface DerivedStreakStatus {
  streakStatus: StreakStatus
  pendingRecoveryDate: string | undefined
}

// Derives "is the user at risk right now" purely from lastCompletedDate + today,
// without needing any persisted streakStatus/pendingRecoveryDate (docs/technical-design.md
// #38 At Risk: exactly one local day missed, not yet past the recovery deadline).
// Used for read-only checks: the Home At-Risk banner and the server-side eligibility
// check before allowing a PDCA cycle to be started with isRecovery=true.
export function deriveStreakStatus(
  lastCompletedDate: string | undefined,
  today: string,
): DerivedStreakStatus {
  if (lastCompletedDate === undefined) {
    return { streakStatus: 'active', pendingRecoveryDate: undefined }
  }

  const gap = daysBetweenLocalDates(lastCompletedDate, today)
  if (gap === 2) {
    return { streakStatus: 'atRisk', pendingRecoveryDate: addDaysToLocalDate(lastCompletedDate, 1) }
  }
  return { streakStatus: 'active', pendingRecoveryDate: undefined }
}

export function resolveStreakState(input: ResolveStreakStateInput): ResolveStreakStateResult {
  const {
    currentStreak,
    longestStreak,
    lastCompletedDate,
    lastRecoveryDate,
    streakStatus,
    pendingRecoveryDate,
    today,
    isRecovery,
    didCompleteToday,
  } = input

  const unchanged = (): ResolveStreakStateResult => ({
    currentStreak,
    longestStreak,
    streakStatus,
    pendingRecoveryDate,
    lastCompletedDate,
    lastRecoveryDate,
    streakUpdated: false,
  })

  const recoveryDate = isRecovery && didCompleteToday ? today : lastRecoveryDate

  const rescue = (): ResolveStreakStateResult => {
    const nextStreak = currentStreak + 1
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      streakStatus: 'active',
      pendingRecoveryDate: undefined,
      lastCompletedDate: today,
      lastRecoveryDate: recoveryDate,
      streakUpdated: true,
    }
  }

  const expireWithoutActivity = (): ResolveStreakStateResult => ({
    currentStreak: 0,
    longestStreak,
    streakStatus: 'active',
    pendingRecoveryDate: undefined,
    lastCompletedDate,
    lastRecoveryDate,
    streakUpdated: streakStatus === 'atRisk' || currentStreak !== 0 || pendingRecoveryDate !== undefined,
  })

  const restartWithActivity = (): ResolveStreakStateResult => ({
    currentStreak: 1,
    longestStreak: Math.max(longestStreak, 1),
    streakStatus: 'active',
    pendingRecoveryDate: undefined,
    lastCompletedDate: today,
    lastRecoveryDate: recoveryDate,
    streakUpdated: true,
  })

  // No completion has ever been recorded yet.
  if (lastCompletedDate === undefined) {
    return didCompleteToday ? restartWithActivity() : unchanged()
  }

  const gap = daysBetweenLocalDates(lastCompletedDate, today)

  // today is on/before the last recorded local day: nothing new to observe,
  // except a same-day Recovery rescue while still inside the deadline.
  if (gap <= 0) {
    if (
      didCompleteToday &&
      isRecovery &&
      streakStatus === 'atRisk' &&
      pendingRecoveryDate !== undefined &&
      withinRecoveryDeadline(pendingRecoveryDate, today)
    ) {
      return rescue()
    }
    return unchanged()
  }

  // Consecutive local day, no gap to account for.
  if (gap === 1 && streakStatus !== 'atRisk') {
    if (!didCompleteToday) return unchanged()
    const nextStreak = currentStreak + 1
    return {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      streakStatus: 'active',
      pendingRecoveryDate: undefined,
      lastCompletedDate: today,
      lastRecoveryDate: recoveryDate,
      streakUpdated: true,
    }
  }

  // Exactly one local day missed, observed for the first time.
  if (gap === 2 && streakStatus !== 'atRisk') {
    if (didCompleteToday && isRecovery) return rescue()
    return {
      currentStreak,
      longestStreak,
      streakStatus: 'atRisk',
      pendingRecoveryDate: addDaysToLocalDate(lastCompletedDate, 1),
      // A normal completion today still records today's activity even while atRisk
      // (docs/technical-design.md #43 / AC-RECOVERY-005).
      lastCompletedDate: didCompleteToday ? today : lastCompletedDate,
      lastRecoveryDate,
      streakUpdated: true,
    }
  }

  // Already flagged atRisk earlier and still within the recovery deadline.
  if (
    streakStatus === 'atRisk' &&
    pendingRecoveryDate !== undefined &&
    withinRecoveryDeadline(pendingRecoveryDate, today)
  ) {
    if (didCompleteToday && isRecovery) return rescue()
    if (!didCompleteToday) return unchanged()
    return {
      currentStreak,
      longestStreak,
      streakStatus: 'atRisk',
      pendingRecoveryDate,
      lastCompletedDate: today,
      lastRecoveryDate,
      streakUpdated: true,
    }
  }

  // Recovery deadline passed, or multiple local days missed outright.
  return didCompleteToday ? restartWithActivity() : expireWithoutActivity()
}
