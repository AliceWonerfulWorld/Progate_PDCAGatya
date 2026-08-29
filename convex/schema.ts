import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const pdcaStatus = v.union(
  v.literal('doing'),
  v.literal('checking'),
  v.literal('acting'),
  v.literal('completed'),
  v.literal('cancelled'),
)

const doResult = v.union(
  v.literal('completed'),
  v.literal('partial'),
  v.literal('notCompleted'),
)

const checkLoad = v.union(
  v.literal('easy'),
  v.literal('justRight'),
  v.literal('slightlyHeavy'),
  v.literal('tooHeavy'),
)

const checkReason = v.union(
  v.literal('noTime'),
  v.literal('tooLarge'),
  v.literal('tooDifficult'),
  v.literal('noFocus'),
  v.literal('noMotivation'),
  v.literal('other'),
)

const actType = v.union(
  v.literal('lighter'),
  v.literal('same'),
  v.literal('heavier'),
  v.literal('changeApproach'),
)

const characterRarity = v.union(v.literal('R'), v.literal('SR'), v.literal('SSR'))

const gachaType = v.union(v.literal('normal'), v.literal('firstGuaranteed'))

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    displayName: v.optional(v.string()),
    playerXp: v.number(),
    playerLevel: v.number(),
    currentTitle: v.optional(v.string()),
    partnerCharacterId: v.optional(v.id('characters')),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastCompletedDate: v.optional(v.string()),
    lastRecoveryDate: v.optional(v.string()),
    recoveryUsedInWindow: v.boolean(),
    totalCycles: v.number(),
    totalGachaDraws: v.number(),
    availableGachaDraws: v.number(),
    // Guest→Login migration の冪等性キー(docs/technical-design.md #58)。
    lastMigratedGuestSessionId: v.optional(v.string()),
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_clerk_user_id', ['clerkUserId']),

  goals: defineTable({
    userId: v.id('users'),
    name: v.string(),
    nextPlanCandidate: v.optional(v.string()),
    totalCycles: v.number(),
    activeDays: v.number(),
    lastCompletedAt: v.optional(v.number()),
    lastCompletedDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_archived', ['userId', 'archivedAt']),

  pdcaCycles: defineTable({
    userId: v.id('users'),
    goalId: v.id('goals'),
    planText: v.string(),
    status: pdcaStatus,
    doResult: v.optional(doResult),
    checkLoad: v.optional(checkLoad),
    checkReason: v.optional(checkReason),
    checkMemo: v.optional(v.string()),
    actType: v.optional(actType),
    nextPlanCandidate: v.optional(v.string()),
    isRecovery: v.boolean(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_goal', ['goalId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_completed_at', ['userId', 'completedAt'])
    .index('by_goal_completed_at', ['goalId', 'completedAt']),

  // convex/lib/gachaSeed.tsのGACHA_SEED_DATAで定義し、seedGachas(internalMutation)で
  // 同期する(charactersテーブルと同じ運用方式)。排出率はここが正であり、
  // convex/gacha.tsのdrawGachaは常にこのテーブルを読む。
  gachas: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    rates: v.object({ R: v.number(), SR: v.number(), SSR: v.number() }),
    // 未指定 = 全active Characterが対象(恒常ガチャ相当)。
    characterIds: v.optional(v.array(v.id('characters'))),
    // ガチャ選択画面のサムネイル画像。未指定ならテキストのみで表示する。
    imagePath: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
    // 期間限定ガチャの開始/終了時刻。両方未指定なら常設(恒常ガチャ)として扱う。
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_active_sort_order', ['isActive', 'sortOrder']),

  characters: defineTable({
    name: v.string(),
    rarity: characterRarity,
    description: v.string(),
    imagePath: v.string(),
    defaultMessage: v.optional(v.string()),
    // 同じrarity内での抽選重み。未指定は1として扱う(=全キャラ均等、従来と同じ挙動)。
    // 一般的なソシャゲのピックアップ演出のように、キャラごとに出やすさを変えたい場合に使う。
    weight: v.optional(v.number()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_rarity', ['rarity'])
    .index('by_active_sort_order', ['isActive', 'sortOrder']),

  inventories: defineTable({
    userId: v.id('users'),
    characterId: v.id('characters'),
    fragmentCount: v.number(),
    duplicateCount: v.number(),
    obtainedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_character', ['userId', 'characterId']),

  gachaHistory: defineTable({
    userId: v.id('users'),
    characterId: v.id('characters'),
    rarity: characterRarity,
    wasDuplicate: v.boolean(),
    fragmentReward: v.number(),
    gachaType,
    // どのgachas.keyから引いたか。gachasテーブル導入前の既存行には無いため任意。
    gachaKey: v.optional(v.string()),
    drawSequence: v.number(),
    drawnAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_draw_sequence', ['userId', 'drawSequence']),
})
