# Technical Design

> Status: Draft / 初版
>
> 本ドキュメントは、PDCA GACHA のハッカソンMVPにおける技術設計を定義する。
>
> 実装基盤は以下を前提とする。
>
> - Frontend: React + Vite + TypeScript
> - Styling: Tailwind CSS
> - Backend / Database: Convex
> - Authentication: Clerk + Google OAuth
> - AI: LLM API via Convex Action
> - Hosting: Vercel
> - App form: Mobile-first PWA
>
> 本書は単なる技術メモではなく、
>
> **人間の開発者とコーディングエージェントが同じ設計制約のもとで実装するためのハーネス**
>
> として利用する。
>
> 仕様に明記されていない独自判断で、データモデル・責務・状態遷移・報酬計算を変更しないこと。

---

# 1. Technical Design Goals

MVPでは以下を最優先とする。

1. PDCAコアループを壊さない
2. 報酬二重付与を防ぐ
3. Streak判定を一貫させる
4. ガチャ結果とInventoryを必ず整合させる
5. Guest → Login移行を安全に行う
6. AI障害でアプリを停止させない
7. Clientから送られたゲーム値を信用しない
8. 実装責務をQuery / Mutation / Actionで明確に分離する
9. 実装をコーディングエージェントへ安全に委譲できる構造にする
10. MVPで不要な抽象化・分散システム化・過剰設計を避ける

---

# 2. Core Engineering Principle

本プロダクトの技術原則は以下。

> **Clientは「ユーザーの意図」を送る。  
> Serverは「事実・状態・報酬」を決定する。**

Frontendから送信してよいもの：

```text
Goal名
PLAN
DO Result
CHECK
ACT
ユーザーが押した操作
```

Frontendから送信してはいけないもの：

```text
userId
playerXp
playerLevel
currentStreak
availableGachaDraws
gacha rarity
fragmentReward
drawSequence
報酬量
```

これらはServer側で確定する。

---

# 3. System Architecture

```text
┌──────────────────────────────────┐
│              Browser             │
│                                  │
│ React + Vite + TypeScript        │
│ Tailwind CSS                     │
│ PWA                              │
│                                  │
│ Guest State → localStorage       │
└───────────────┬──────────────────┘
                │
                │ Auth
                ▼
┌──────────────────────────────────┐
│              Clerk               │
│                                  │
│ Google OAuth                     │
└───────────────┬──────────────────┘
                │ Identity
                ▼
┌──────────────────────────────────┐
│              Convex              │
│                                  │
│ Query                            │
│ Mutation                         │
│ Action                           │
│ Database                         │
└──────────┬──────────────┬────────┘
           │              │
           │              │ External API
           │              ▼
           │       ┌───────────────┐
           │       │    LLM API    │
           │       └───────────────┘
           │
           ▼
      Persistent Data
```

---

# 4. Layer Responsibilities

## Frontend

責務：

- UI表示
- ユーザー入力
- localStorageによるGuestデータ保持
- Query結果の表示
- Mutation / Action呼び出し
- Loading / Error UI
- ガチャ演出
- PWA Shell

Frontendでは業務ルールを確定しない。

---

## Convex Query

読み取り専用。

Query内ではDBを更新しない。

主な用途：

```text
currentUser取得
Goal一覧
Goal Detail
進行中PDCA取得
History
Collection
Player Profile
Gacha履歴
```

---

## Convex Mutation

DB更新と業務ルールの中心。

主な用途：

```text
Goal作成 / 編集 / Archive
PDCA開始
DO結果保存
CHECK保存
ACT保存
PDCA完了
PDCAキャンセル
ガチャ抽選
Inventory更新
相棒変更
Guest同期
```

---

## Convex Action

外部サービスを利用する処理。

主な用途：

```text
LLM PLAN生成
```

外部APIが不要な業務処理をActionへ逃がさない。

---

# 5. Query / Mutation / Action Rule

## Query

```text
Read only
No mutation
No external API
```

---

## Mutation

```text
Transactional state change
Authorization
Validation
Reward calculation
Game state update
```

---

## Action

```text
External API call
Non-deterministic integration
LLM generation
```

---

# 6. Authentication Flow

## 6.1 Logged-in User

Clerk Identityを取得する。

```text
Clerk identity
↓
subject / user id
↓
users.clerkUserId
↓
Convex user
```

すべての認証必須Query / Mutationは、
Frontendから `userId` を受け取らない。

---

## 6.2 Common Auth Helper

共通helperを用意する。

例：

```ts
requireCurrentUser(ctx)
```

責務：

```text
1. Clerk Identity取得
2. 未認証ならAUTH_REQUIRED
3. clerkUserIdからusersを取得
4. userが存在しなければ必要に応じて作成 or USER_NOT_FOUND
5. Convex userを返す
```

---

# 7. Authorization

所有権確認も共通helper化する。

例：

```ts
requireOwnedGoal(ctx, goalId, currentUser)
requireOwnedCycle(ctx, cycleId, currentUser)
```

チェック：

```text
goal.userId === currentUser._id
cycle.userId === currentUser._id
```

他ユーザーのデータは、

- 取得
- 更新
- 削除
- 完了
- Archive

できない。

---

# 8. PDCA Lifecycle

PDCA CycleはPLAN確定後に作成する。

```text
PLAN候補表示
↓
ユーザー確定
↓
startPdcaCycle
↓
status = doing
```

状態遷移：

```text
doing
↓
checking
↓
acting
↓
completed
```

キャンセル：

```text
doing
checking
acting
↓
cancelled
```

---

# 9. Allowed PDCA State Transitions

許可：

```text
doing → checking
checking → acting
acting → completed

doing → cancelled
checking → cancelled
acting → cancelled
```

禁止：

```text
doing → acting
doing → completed
checking → completed
completed → acting
completed → doing
cancelled → completed
```

状態遷移はServer側で検証する。

---

# 10. PDCA Mutation API

想定Mutation：

```text
startPdcaCycle
submitDoResult
submitCheck
submitAct
completePdcaCycle
cancelPdcaCycle
```

---

# 11. startPdcaCycle

入力：

```ts
{
  goalId,
  planText,
  isRecovery?
}
```

処理：

```text
1. requireCurrentUser
2. Goal取得
3. 所有権確認
4. archivedAtがないことを確認
5. 進行中Cycle（doing / checking / acting）がないことを確認
6. planText validation
7. pdcaCycles作成
8. status = doing
```

戻り値：

```text
cycleId
status
```

---

# 12. submitDoResult

入力：

```ts
{
  cycleId,
  doResult
}
```

処理：

```text
1. current user確認
2. cycle所有権確認
3. status === doing確認
4. doResult保存
5. status = checking
6. updatedAt更新
```

---

# 13. submitCheck

入力：

```ts
{
  cycleId,
  checkLoad,
  checkReason?,
  checkMemo?
}
```

処理：

```text
1. status === checking確認
2. CHECK validation
3. 保存
4. status = acting
```

---

# 14. submitAct

入力：

```ts
{
  cycleId,
  actType,
  nextPlanCandidate?
}
```

処理：

```text
1. status === acting確認
2. actType validation
3. nextPlanCandidate validation
4. 保存
```

この時点ではまだPDCA報酬を付与しない。

---

# 15. completePdcaCycle

PDCA完了処理はMVPの中心Mutation。

入力：

```ts
{
  cycleId
}
```

Frontendから以下を受け取らない。

```text
xp
level
streak
gacha reward
totalCycles
```

---

# 16. completePdcaCycle Flow

```text
1. requireCurrentUser
2. Cycle取得
3. 所有権確認
4. 既にcompletedなら既存結果を返す
5. status === acting確認
6. 必須PDCAフィールド確認
7. Server現在時刻取得
8. User timezoneからlocal date算出
9. Cycleをcompletedへ更新
10. Goal集計更新
11. User XP / totalCycles更新
12. availableGachaDraws +1
13. Player Lv再計算
14. Streak更新
15. updated values保存
16. 完了結果を返す
```

---

# 17. completePdcaCycle Return Value

例：

```json
{
  "cycleId": "...",
  "gainedXp": 100,
  "previousLevel": 4,
  "newLevel": 5,
  "levelUp": true,
  "currentStreak": 14,
  "streakUpdated": true,
  "gachaDrawsAdded": 1,
  "availableGachaDraws": 2
}
```

Frontendはこの値を使って完了演出を行う。

---

# 18. PDCA Completion Idempotency

最重要ルール：

> 同一Cycleを複数回完了しても報酬は1回だけ。

例：

```text
completePdcaCycle(cycleId)
completePdcaCycle(cycleId)
```

結果：

```text
XP +100 only once
totalCycles +1 only once
availableGachaDraws +1 only once
Streak update only once
```

実装：

```ts
if (cycle.status === "completed") {
  return existingCompletionResult
}
```

必要であれば完了時の付与結果をCycle側に保存することも検討するが、
MVPでは現在データから再構成可能な範囲で対応する。

---

# 19. Goal Aggregation Update

PDCA完了時：

```text
goals.totalCycles += 1
goals.lastCompletedAt = now
goals.lastCompletedDate = today
goals.nextPlanCandidate = cycle.nextPlanCandidate
```

同じGoalで今日初めての完了なら：

```text
goals.activeDays += 1
```

判定：

```text
goal.lastCompletedDate !== today
```

---

# 20. Player XP

基本値：

```text
PDCA completed
→ +100 XP
```

定数化する。

例：

```ts
const BASE_PDCA_XP = 100
```

Frontendに値をハードコードしない。

---

# 21. Player Level

Player LvはServer側で再計算する。

例：

```ts
calculatePlayerLevel(playerXp)
```

Player Lvの算出式は純粋関数として切り出す。

FrontendでPlayer Lvを決定しない。

---

# 22. Gacha Reward

PDCA 1周完了時：

```text
availableGachaDraws += 1
```

ガチャは即時実行を強制しない。

ユーザーは未使用ガチャ回数を保持できる。

---

# 23. drawGacha Mutation

入力：

```ts
{}
```

Frontendから、

```text
rarity
characterId
fragmentReward
```

を渡さない。

---

# 24. drawGacha Flow

```text
1. requireCurrentUser
2. 最新User取得
3. availableGachaDraws > 0確認
4. gachaType決定
5. rarity抽選
6. active Character候補取得
7. Character均等抽選
8. Inventory取得
9. new / duplicate判定
10. Inventory作成 or 更新
11. gachaHistory作成
12. users.availableGachaDraws -= 1
13. users.totalGachaDraws += 1
14. 結果返却
```

---

# 25. Gacha Rate

MVP：

```text
R   70%
SR  25%
SSR 5%
```

純粋関数化：

```ts
rollRarity(randomValue)
```

例：

```text
0.00 <= x < 0.70 → R
0.70 <= x < 0.95 → SR
0.95 <= x < 1.00 → SSR
```

---

# 26. Character Draw

レアリティ決定後、
該当レアリティかつ `isActive = true` のCharacter一覧から均等抽選する。

個別weightはMVPでは持たない。

---

# 27. Duplicate Reward

MVP仮値：

```text
R   → 10 fragments
SR  → 20 fragments
SSR → 40 fragments
```

定数化する。

```ts
getDuplicateFragmentReward(rarity)
```

---

# 28. New Character

Inventoryが存在しない場合：

```text
create inventory

fragmentCount = 0
duplicateCount = 0
obtainedAt = now
```

---

# 29. Duplicate Character

Inventoryが存在する場合：

```text
fragmentCount += reward
duplicateCount += 1
updatedAt = now
```

---

# 30. Gacha History

ガチャ成功時は必ず `gachaHistory` を作成する。

保存：

```text
userId
characterId
rarity
wasDuplicate
fragmentReward
gachaType
drawSequence
drawnAt
```

---

# 31. Gacha Draw Sequence

```text
drawSequence = users.totalGachaDraws + 1
```

ガチャ成功後：

```text
users.totalGachaDraws += 1
```

---

# 32. First Guaranteed Gacha

初回のみSR以上確定にする場合：

```text
users.totalGachaDraws === 0
→ gachaType = firstGuaranteed
```

詳細なSR/SSR確率はゲームバランス側で確定する。

実装時に通常ガチャと混在させず、
明示的なgachaType判定を行う。

---

# 33. Gacha Consistency

以下の順序を守る。

```text
抽選
↓
Inventory更新
↓
gachaHistory作成
↓
Userガチャ残数更新
↓
結果返却
```

Frontendへ結果を返してからDB保存する実装は禁止。

---

# 34. Double Gacha Prevention

Frontend：

```text
ガチャボタン押下
↓
即disabled
```

Server：

```text
availableGachaDraws > 0
```

を毎回検証する。

Client側disabledのみを安全策としない。

---

# 35. Streak Model

利用フィールド：

```text
currentStreak
longestStreak
lastCompletedDate
streakStatus
pendingRecoveryDate
lastRecoveryDate
timezone
```

推奨Enum：

```text
active
atRisk
```

---

# 36. Streak Date Rule

Frontendの時刻を信用しない。

Server側：

```text
Date.now()
+
users.timezone
↓
local YYYY-MM-DD
```

を算出する。

---

# 37. Streak Normal Completion

同日2回目以降：

```text
today === lastCompletedDate
→ currentStreak変更なし
```

翌日：

```text
today === dayAfter(lastCompletedDate)
→ currentStreak += 1
```

初回：

```text
currentStreak = 1
```

---

# 38. Streak At Risk

例：

```text
lastCompletedDate = 2026-08-27
today = 2026-08-29
```

8/28が未達。

Recovery可能なら：

```text
streakStatus = atRisk
pendingRecoveryDate = 2026-08-28
```

この時点では、

```text
currentStreak
```

を即リセットしない。

---

# 39. Recovery PDCA

Recoveryも通常 `pdcaCycles` を利用する。

```text
isRecovery = true
```

別テーブルは作らない。

---

# 40. Recovery Meaning

Recovery成功は、

> 欠席日そのものを活動日に変換する処理ではない。

例：

```text
8/27 streak = 14
8/28 no activity
8/29 recovery completed
```

結果：

```text
currentStreak = 15
```

8/28を追加カウントするのではなく、
既存ストリークを保護し、8/29の活動で+1する。

---

# 41. Recovery Usage Limit

MVP：

```text
Rolling 7 daysに1回
```

判定には `lastRecoveryDate` を利用する。

```text
today - lastRecoveryDate < 7 days
→ Recovery unavailable
```

`recoveryUsedInWindow` のような重複状態は持たない。

---

# 42. Recovery Deadline

欠席翌日のローカル日付終了までにRecoveryしなかった場合、
次回Server判定時にStreakを失効させる。

例：

```text
pendingRecoveryDate = 8/28
deadline = 8/29 end of day
8/30 access
↓
currentStreak = 0
streakStatus = active
pendingRecoveryDate = null
```

---

# 43. Normal PDCA During At-Risk

Recovery前に通常PDCAを完了しても、

```text
streakStatus = atRisk
```

は維持する。

ただし今日の活動として `lastCompletedDate` は更新する。

その後同日中にRecovery完了すればStreakを救済可能。

---

# 44. Streak Resolver

Streakロジックは共通関数へ集約する。

例：

```ts
resolveStreakState({
  currentStreak,
  longestStreak,
  lastCompletedDate,
  lastRecoveryDate,
  streakStatus,
  pendingRecoveryDate,
  today,
  isRecovery
})
```

戻り値：

```ts
{
  currentStreak,
  longestStreak,
  streakStatus,
  pendingRecoveryDate,
  lastCompletedDate,
  lastRecoveryDate,
  streakUpdated
}
```

---

# 45. Streak Resolver Usage

同じロジックを再利用する。

```text
Home Query
PDCA完了Mutation
Recovery開始
Recovery完了
```

各画面で独自ロジックを実装しない。

---

# 46. AI PLAN Generation

MVPのAI用途は限定する。

```text
initial PLAN generation
next PLAN generation
```

AIはチャットボットではない。

---

# 47. generatePlan Action

想定入力：

```ts
{
  mode: "initial" | "next",
  goalName: string,
  currentPlan?: string,
  doResult?: string,
  checkLoad?: string,
  checkReason?: string,
  actType?: string,
  recentHistory?: [...]
}
```

---

# 48. AI Output

構造化JSONのみを受け取る。

例：

```json
{
  "nextPlan": "英単語を5個復習する",
  "message": "前回より少し軽めにしました"
}
```

---

# 49. AI Generation Rules

AIへ以下を要求する。

```text
Goalを変更しない
1回で実行できる具体的行動にする
短くする
曖昧な精神論を避ける
ACTを反映する
前回の負荷を反映する
過剰に難しくしない
```

禁止例：

```text
頑張って勉強する
もっと努力する
英語学習を完璧にする
```

望ましい例：

```text
英単語を5個復習する
参考書を2ページ読む
スクワットを5回する
```

---

# 50. AI Result Validation

LLM出力をそのまま信用しない。

チェック：

```text
JSON parse成功
required keys存在
nextPlanが空でない
nextPlanが文字数制限以内
想定外型でない
```

失敗時はfallbackへ。

---

# 51. AI Fallback

AI障害は致命的エラーにしない。

```text
AI call failure
JSON parse failure
schema validation failure
timeout
```

すべてfallback可能。

---

# 52. Rule-based Fallback

例：

```text
lighter
→ 前回より小さいタスクを提案

same
→ 前回PLANをそのまま利用

heavier
→ 少し増やす

changeApproach
→ 同一Goal内で手入力を促す
```

最低限、

```text
same → currentPlan
```

が成立すればアプリは継続できる。

---

# 53. AI Save Policy

AI出力を自動確定保存しない。

```text
AI generates candidate
↓
Frontend displays candidate
↓
User confirms
↓
Mutation saves nextPlanCandidate
```

AIは提案者であり決定者ではない。

---

# 54. Guest Mode

初回利用ではログインを必須にしない。

Guest中はlocalStorageを利用する。

保持：

```text
guestSessionId
guestGoal
guestPdcaCycle
guestGachaState
```

---

# 55. Guest Session ID

初回Guest開始時にUUIDを発行。

```text
guestSessionId
```

Guest→Login移行の冪等性キーとして利用する。

---

# 56. Guest First-run Flow

```text
Goal入力
↓
AI initial PLAN
↓
PDCA
↓
ガチャ
↓
保存したい
↓
Google Login
↓
migrateGuestData
```

---

# 57. migrateGuestData Mutation

通常のPDCA Mutationを単純に再実行しない。

専用Mutationを用意する。

入力：

```ts
{
  guestSessionId,
  guestData
}
```

処理：

```text
1. requireCurrentUser
2. guestSessionId validation
3. 既にmigration済みか確認
4. User取得 / 初期化
5. Guest Goal作成
6. Guest PDCA保存
7. Guest報酬反映
8. 必要ならInventory / gachaHistory移行
9. migration済みID保存
10. success返却
```

Frontendは成功後にlocalStorageを削除する。

---

# 58. Guest Migration Idempotency

同じ `guestSessionId` を2回送っても、

```text
Goal二重作成
PDCA二重作成
XP二重付与
Gacha二重反映
```

をしない。

MVP案：

```text
users.lastMigratedGuestSessionId
```

を保持する。

複数Guest migration履歴が必要になった時点で、
専用テーブルへ拡張する。

---

# 59. PWA Policy

MVPは、

> **PWAであるが、Offline-firstではない。**

目的：

```text
ホーム画面追加
アプリらしい起動体験
静的アセットキャッシュ
```

---

# 60. localStorage Policy

localStorageはGuest状態専用。

Login後の正式データをlocalStorageへ二重保存しない。

正式な正本：

```text
Convex
```

---

# 61. Service Worker

キャッシュ対象候補：

```text
HTML
CSS
JS
icons
character images
```

業務データはキャッシュ前提にしない。

---

# 62. Offline Behavior

完全オフライン同期はMVPで実装しない。

オフライン中：

```text
DO自体は現実世界で継続可能
```

ただし、

```text
CHECK保存
ACT保存
PDCA完了
Gacha
```

などServer Mutationが必要な操作は通信復帰後に行う。

表示例：

```text
通信できません。
接続後にもう一度お試しください。
```

---

# 63. Resume Flow

PDCA各ステップでDB保存するため、
ブラウザを閉じても再開可能。

Login後Home Queryで、

```text
by_user_status
```

から、

```text
doing
checking
acting
```

のCycleを取得。

UI：

```text
進行中のPDCAがあります

英単語を5個覚える

[ 続きから ]
```

---

# 64. Error Handling Philosophy

エラーは内部コードとユーザー表示を分離する。

例：

```text
GACHA_NO_DRAW_AVAILABLE
```

Frontend：

```text
ガチャを引ける回数がありません
```

---

# 65. Error Codes

MVP候補：

```text
AUTH_REQUIRED
USER_NOT_FOUND

GOAL_NOT_FOUND
GOAL_ARCHIVED
GOAL_FORBIDDEN

PDCA_NOT_FOUND
PDCA_INVALID_STATUS
PDCA_ACTIVE_CYCLE_EXISTS
PDCA_ALREADY_COMPLETED
PDCA_FORBIDDEN

GACHA_NO_DRAW_AVAILABLE
GACHA_NO_ACTIVE_CHARACTER

GUEST_INVALID_DATA
GUEST_ALREADY_MIGRATED

AI_GENERATION_FAILED

VALIDATION_ERROR
NETWORK_ERROR
```

---

# 66. AI Error Policy

AI関連エラーは原則としてFrontendへ致命的エラーを返さない。

```text
AI failure
↓
fallback
↓
continue
```

AIが止まってもPDCAコアループは継続可能にする。

---

# 67. Validation

Server側でも入力サイズを制限する。

MVP候補：

```text
Goal name        <= 100 chars
PLAN             <= 200 chars
CHECK memo       <= 500 chars
nextPlanCandidate<= 200 chars
displayName      <= 50 chars
```

Frontend validationだけに依存しない。

---

# 68. Security Rules

以下を必須ルールとする。

1. FrontendからuserIdを受け取らない
2. Clerk Identityからcurrent userを確定
3. Goal / Cycleの所有権をServerで検証
4. XPをClientから受け取らない
5. LevelをClientから受け取らない
6. StreakをClientから受け取らない
7. ガチャ抽選はServerのみ
8. LLM API keyをFrontendへ置かない
9. Server時刻 + timezoneで日付判定
10. status遷移をServerで検証
11. Archive GoalではPDCA開始不可
12. completed Cycleへ二重報酬禁止
13. inactive Characterを通常ガチャから排出しない
14. Guest migrationはidempotentにする
15. AI outputをvalidationする

---

# 69. Shared Domain Logic

以下は可能な限り純粋関数として切り出す。

```ts
calculatePlayerLevel()
rollRarity()
getDuplicateFragmentReward()
resolveStreakState()
resolveNextPlanFallback()
isRecoveryAvailable()
isValidPdcaTransition()
```

理由：

```text
テストしやすい
Mutationを薄くできる
コーディングエージェントが責務を理解しやすい
```

---

# 70. Suggested Backend Folder Structure

例：

```text
convex/
  schema.ts

  users.ts
  goals.ts
  pdca.ts
  gacha.ts
  characters.ts
  inventory.ts
  guest.ts
  ai.ts

  lib/
    auth.ts
    authorization.ts
    errors.ts
    validation.ts
    playerLevel.ts
    streak.ts
    gacha.ts
    pdcaState.ts
    aiFallback.ts
    date.ts
```

過剰なClean Architecture化はしない。

---

# 71. Suggested Frontend Structure

例：

```text
src/
  app/
  components/
  features/
    auth/
    goals/
    pdca/
    gacha/
    collection/
    history/
    profile/
    recovery/

  hooks/
  lib/
  routes/
  types/
```

機能単位でまとめる。

---

# 72. Frontend State Policy

基本：

```text
Server state → Convex
UI local state → React
Guest persistent state → localStorage
```

Zustand等のGlobal Storeは、
本当に必要になるまで導入しない。

---

# 73. Loading State

Query待ちではSkeleton等を使う。

Mutation中：

```text
button disabled
duplicate submit prevented
```

PDCA完了 / Gachaでは、
Mutation結果が確定してから演出へ進む。

---

# 74. Mutation Retry Safety

通信切断やUI再送を前提とする。

特に以下は冪等性必須。

```text
completePdcaCycle
migrateGuestData
```

`drawGacha` は「操作1回 = ガチャ1回」なので、
Frontendの連打防止とServer残数検証を必須にする。

将来的に厳密なrequestId方式が必要なら追加する。

---

# 75. Testing Strategy

テストの目的：

> 実装詳細ではなく、壊してはいけない仕様を固定する。

---

# 76. Test Priority

## P0

絶対に壊してはいけない。

```text
報酬二重付与
ガチャ残数不整合
Inventory不整合
他ユーザー操作
Streak誤更新
Guest二重Migration
```

---

## P1

主要機能。

```text
PDCA状態遷移
Goal集計
AI fallback
Character重複
Recovery
Player Level
```

---

## P2

補助機能。

```text
履歴並び順
Collection filter
title表示
UI state
```

---

# 77. PDCA Tests

必須：

```text
acting → completedで成功
doing → completedは失敗
checking → completedは失敗

complete成功時:
  playerXp +100
  totalCycles +1
  availableGachaDraws +1
  goal.totalCycles +1

同じcycleを2回complete:
  報酬は1回分のみ
```

---

# 78. Streak Tests

必須：

```text
同日3周 → streak +1のみ

翌日完了 → +1

1日空白 → atRisk

Recovery成功 → streak維持

欠席日自体 → streak countへ加算しない

期限切れ → reset

直近7日以内Recovery済み → 再Recovery不可

timezone境界 → 正しいlocal date
```

---

# 79. Gacha Tests

必須：

```text
availableGachaDraws = 1
→ 1回成功
→ 0になる

0回
→ GACHA_NO_DRAW_AVAILABLE

初入手
→ inventory 1件作成

重複
→ inventory件数増加なし
→ fragment増加

gachaHistory作成

inactive Character排出なし

rarityはR/SR/SSRのみ
```

---

# 80. Authorization Tests

必須：

```text
他人のGoalをupdate不可
他人のCycleをcomplete不可
他人のInventory操作不可

clientからuserId偽装しても意味がない

archived GoalからCycle開始不可
```

---

# 81. Guest Migration Tests

必須：

```text
初回migration成功

同じguestSessionIdを2回送信
→ 重複なし

通信再送
→ XP二重付与なし

Guest gacha反映
→ inventory/history整合
```

---

# 82. AI Tests

必須：

```text
正常JSON → 利用

broken JSON → fallback

empty nextPlan → fallback

too long nextPlan → fallback

API error → fallback

timeout → fallback
```

---

# 83. Pure Function Tests

重点対象：

```text
calculatePlayerLevel
rollRarity
getDuplicateFragmentReward
resolveStreakState
isRecoveryAvailable
resolveNextPlanFallback
isValidPdcaTransition
```

---

# 84. Integration Tests

Mutation単位：

```text
completePdcaCycle
drawGacha
migrateGuestData
```

これらは複数テーブル更新を伴うため、
純粋関数テストだけでは不十分。

---

# 85. E2E Scope

MVPでは主要Happy Pathだけでよい。

最低候補：

```text
Guest Goal作成
→ PLAN
→ PDCA完了
→ Gacha
→ Login
→ Guest migration
→ Home
```

もう1本：

```text
Logged-in User
→ PDCA resume
→ complete
→ gacha
```

---

# 86. Coding Agent Guardrails

コーディングエージェントは以下を必ず守る。

## Must

```text
technical-design.mdを読む
data-model.mdを読む
product-spec.mdを読む
user-flow.mdを読む
ui-spec.mdを読む
```

実装対象に応じて関連Docsを参照する。

---

# 87. Coding Agent Forbidden Changes

明示的な承認なしに以下を変更してはいけない。

```text
DB table structure
PDCA status enum
PDCA state transition
XP報酬
Gacha率
Streak定義
Recovery定義
Guest migration方式
Query/Mutation/Action責務
Auth方式
```

---

# 88. Coding Agent Implementation Rule

仕様に不明点がある場合：

```text
独自に仕様を拡張
```

ではなく、

```text
TODO / questionとして明示
```

する。

---

# 89. Coding Agent Completion Criteria

「実装した」だけでは完了としない。

最低条件：

```text
TypeScript errorなし
Lint errorなし
対象テストpass
既存P0 test pass
認可確認
Loading/Error state確認
```

---

# 90. Coding Agent Prompt Template

実装依頼時の例：

```text
以下のドキュメントを必ず確認してから実装してください。

- docs/product-spec.md
- docs/user-flow.md
- docs/data-model.md
- docs/technical-design.md

今回の対象:
completePdcaCycle Mutation

制約:
- technical-design.mdの責務分離を変更しない
- userIdをclientから受け取らない
- 二重報酬を防ぐ
- P0テストを追加する
- 既存schemaを勝手に変更しない

実装後:
- 変更ファイル
- 実装内容
- テスト結果
- 未解決事項

を報告してください。
```

---

# 91. Logging

MVPでもServer側で最低限、
問題調査に必要な文脈を残す。

例：

```text
operation
userId
cycleId
goalId
guestSessionId
errorCode
```

個人入力本文を必要以上にログへ出さない。

---

# 92. Analytics

MVPでは専用Analytics基盤は必須ではない。

必要なら以下を集計可能：

```text
users.totalCycles
users.totalGachaDraws
pdcaCycles
gachaHistory
```

将来的に外部Analyticsを追加する。

---

# 93. Performance Policy

MVPでは早すぎる最適化をしない。

優先：

```text
正しさ
単純さ
実装速度
テスト容易性
```

必要なIndexは `data-model.md` に従う。

---

# 94. Date Utility

日付処理を各Mutationへ散らさない。

共通utility：

```ts
getLocalDateString(timestamp, timezone)
isNextLocalDay(a, b, timezone)
daysBetweenLocalDates(a, b)
```

等を用意する。

---

# 95. Timezone Source

初回LoginまたはGuest migration時に、
ブラウザのIANA timezoneを取得。

例：

```ts
Intl.DateTimeFormat().resolvedOptions().timeZone
```

保存例：

```text
Asia/Tokyo
```

Serverは保存されたtimezoneを使用する。

---

# 96. Character Assets

Character画像はMVPでは：

```text
/public/characters/*.webp
```

へ配置。

DBはpathのみ保持。

Convex Storageは使わない。

---

# 97. Environment Variables

Frontend：

```text
VITE_CLERK_PUBLISHABLE_KEY
VITE_CONVEX_URL
```

Server side：

```text
LLM_API_KEY
```

LLM secretを `VITE_` prefixで公開しない。

---

# 98. Deployment

想定：

```text
GitHub
↓
Vercel
↓
React PWA
```

Convexは独立Backendとして利用。

Preview環境では可能なら開発用Convex deploymentを利用する。

---

# 99. CI

MVP最低ライン：

```text
npm install
typecheck
lint
test
build
```

Pull Requestまたはmain push時に実行できる形を推奨。

---

# 100. Out of Scope for MVP

以下はMVPのtechnical design対象外。

```text
完全Offline Sync
Push通知の完全対応
10連ガチャ
課金
Character育成
基地育成
複雑なMission CMS
複数端末Conflict Resolution
Event Gacha
Soft Pity
Dynamic Titles DB
```

必要になった時点で再設計する。

---

# 101. Definition of Done: Core Loop

MVPの技術的なコアループ完成条件：

```text
1. Goalを作成できる
2. PLANを確定できる
3. PDCA Cycleを開始できる
4. DO/CHECK/ACTを保存できる
5. Cycleを安全にcompletedにできる
6. XPが1回だけ付与される
7. Streakが正しく更新される
8. Gacha権が1回追加される
9. Gachaを引ける
10. Inventoryが正しく更新される
11. Historyへ残る
12. 再読み込みしても状態が復元される
```

---

# 102. Definition of Done: Guest Flow

```text
1. 未ログインでGoal作成
2. PDCA完了
3. Gacha体験
4. Google Login
5. Guest data migration
6. XP / Goal / Cycle / Characterが保存
7. 二重migrationなし
8. localStorage削除
```

---

# 103. Design Invariants

以下はMVP全体を通して絶対に維持する。

```text
1 PDCA Cycle = 1 record

1 completed PDCA
= XP reward once
= totalCycles +1 once
= gacha right +1 once

Task success/failure
!= reward amount

1 Gacha draw
= 1 ticket consumption
= 1 gachaHistory record

User × Character
= max 1 Inventory record

Client
!= source of truth for rewards

AI failure
!= core loop failure
```

---

# 104. Final Technical Direction

PDCA GACHAのMVPでは、

> **小さく・正しく・壊れにくく実装する**

ことを最優先とする。

特に、

```text
PDCA completion
Gacha
Streak
Recovery
Guest migration
```

は、
画面実装よりも先にドメインルールとテストを安定させる。

また、本ドキュメントをコーディングエージェントへのハーネスとして扱い、

> エージェントが設計を補完するのではなく、
> 明文化された設計の中で実装する

状態を維持する。

最終的な責務構造：

```text
React
→ User Intent / UI

Convex Query
→ Read

Convex Mutation
→ Domain State Change

Convex Action
→ External AI

Convex DB
→ Source of Truth

Clerk
→ Identity
```

この構成をMVPの標準アーキテクチャとする。
