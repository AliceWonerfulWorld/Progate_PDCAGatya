import { query } from './_generated/server'
import { requireCurrentUser } from './lib/auth'
import { DAILY_MISSION_XP } from './lib/constants'
import { getLocalDateString } from './lib/date'

// docs/data-model.md #25 (Mission Data): missionsテーブルは作らず、
// pdcaCycles / users から進捗を都度算出する。
// 「今日の1周目を完了したか」は users.lastCompletedDate だけで判定できる
// （completePdcaCycleが完了ごとに更新するため）。
export const getDailyMissionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx)
    const today = getLocalDateString(Date.now(), user.timezone)
    return {
      completed: user.lastCompletedDate === today,
      rewardXp: DAILY_MISSION_XP,
    }
  },
})
