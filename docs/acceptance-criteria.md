# Acceptance Criteria

> Status: Draft / 初版
>
> 本ドキュメントは、PDCA GACHA のハッカソンMVPにおける「完成条件」を定義する。
>
> 対象：
>
> - 人間の開発者
> - コーディングエージェント
> - レビュー担当者
>
> 本書の目的は、
>
> **「実装したつもり」ではなく、「仕様上完成している」と判断できる基準を固定すること**
>
> である。
>
> 実装判断では、以下のドキュメントを前提とする。
>
> - `overview.md`
> - `product-spec.md`
> - `user-flow.md`
> - `game-design.md`
> - `tech-stack.md`
> - `ui-spec.md`
> - `data-model.md`
> - `technical-design.md`
> - `implementation-plan.md`

---

# 1. Acceptance Policy

MVPのAcceptance Criteriaは、以下の4段階で考える。

```text
P0: 壊れるとMVP不成立
P1: 主要機能として必要
P2: UX品質として望ましい
P3: 時間があれば改善
```

基本ルール：

```text
P0未達
→ リリース不可

P1未達
→ 原則リリース不可

P2未達
→ MVPとしては許容可能

P3未達
→ 問題なし
```

---

# 2. Global Definition of Done

MVP全体が完成したと判断するための最低条件。

## P0

```text
Goalを作成できる
PDCAを1周完了できる
PDCA完了でXPが1回だけ付与される
PDCA完了でガチャ権が1回だけ付与される
Streakが正しく更新される
ガチャを1回安全に引ける
Inventoryが正しく更新される
他ユーザーのデータを操作できない
Guest→Login同期で二重付与が起きない
TypeScript errorがない
P0 testがすべてpass
```

## P1

```text
PDCA途中状態から再開できる
Recoveryが成立する
AIが失敗してもfallbackで継続できる
Historyを確認できる
Collectionを確認できる
Profileを確認できる
```

## P2

```text
主要Loading状態がある
主要Empty stateがある
主要Error stateがある
Mobile UIが崩れない
PWAとして起動できる
```

---

# 3. Goal Creation

## AC-GOAL-001 — Goal作成

**Priority:** P0

### Given

```text
ユーザーがGoal作成画面を開いている
```

### When

```text
「英語学習」と入力して作成する
```

### Then

```text
Goalが1件作成される
Goal.userIdは認証済みUserである
name = "英語学習"
totalCycles = 0
activeDays = 0
archivedAt = undefined
```

---

# 4. Goal Validation

## AC-GOAL-002 — 空Goal禁止

**Priority:** P1

### Given

Goal作成画面。

### When

空文字または空白のみで送信。

### Then

```text
Goalは作成されない
Validation Errorを表示する
```

---

## AC-GOAL-003 — 文字数制限

**Priority:** P1

### Given

Goal名がServer側上限を超える。

### When

作成Mutationを実行。

### Then

```text
VALIDATION_ERROR
Goal未作成
```

Frontend制限だけに依存しない。

---

# 5. Goal Ownership

## AC-GOAL-004 — 他人のGoal操作禁止

**Priority:** P0

### Given

```text
User AのGoal
User BがLogin
```

### When

User BがUser Aの `goalId` を使って更新・Archive・PDCA開始を試みる。

### Then

```text
処理失敗
データ変更なし
```

---

# 6. Goal Archive

## AC-GOAL-005 — Goal Archive

**Priority:** P1

### When

ユーザーがGoalをArchiveする。

### Then

```text
archivedAtが設定される
Active Goal一覧から消える
過去pdcaCyclesは保持される
```

---

## AC-GOAL-006 — Archived GoalからPDCA開始禁止

**Priority:** P0

### Given

Archive済みGoal。

### When

`startPdcaCycle` を呼ぶ。

### Then

```text
GOAL_ARCHIVED
Cycleは作成されない
```

---

# 7. PLAN

## AC-PDCA-001 — PLAN確定でCycle作成

**Priority:** P0

### Given

Active Goalが存在。

### When

PLANを確定して `startPdcaCycle` を実行。

### Then

```text
pdcaCyclesが1件作成される
status = doing
planTextが保存される
userIdがCurrent User
goalIdが対象Goal
startedAtが設定される
```

---

## AC-PDCA-002 — PLAN候補表示だけではCycleを作らない

**Priority:** P1

### Given

PLAN画面で候補が表示されている。

### When

まだ「これでやる」を押していない。

### Then

```text
pdcaCyclesは新規作成されない
```

---

# 8. DO

## AC-PDCA-003 — DO成功

**Priority:** P0

### Given

```text
status = doing
```

### When

`doResult = completed` を送信。

### Then

```text
doResult = completed
status = checking
```

---

## AC-PDCA-004 — DO部分達成

**Priority:** P1

### When

`partial` を選択。

### Then

```text
status = checking
報酬上のペナルティは発生しない
```

---

## AC-PDCA-005 — DO未達成

**Priority:** P0

### When

`notCompleted` を選択。

### Then

```text
status = checking
PDCA継続可能
後続CHECK/ACT可能
```

「できなかった」でフローを終了しない。

---

# 9. CHECK

## AC-PDCA-006 — CHECK保存

**Priority:** P0

### Given

```text
status = checking
```

### When

`checkLoad` を送信。

### Then

```text
checkLoad保存
status = acting
```

---

## AC-PDCA-007 — CHECK Reason任意

**Priority:** P1

### Given

CHECK画面。

### When

Reasonを入力せず進むことが許可される条件。

### Then

```text
checkReason = undefinedでも進行可能
```

---

## AC-PDCA-008 — CHECK Memo任意

**Priority:** P1

### Then

```text
checkMemoなしでもPDCA完了可能
```

---

# 10. ACT

## AC-PDCA-009 — ACT保存

**Priority:** P0

### Given

```text
status = acting
```

### When

`actType` を確定。

### Then

```text
actType保存
nextPlanCandidateがあれば保存
statusはactingのまま
```

報酬はまだ付与しない。

---

# 11. PDCA State Machine

## AC-PDCA-010 — 正常遷移

**Priority:** P0

許可される：

```text
doing → checking
checking → acting
acting → completed
```

---

## AC-PDCA-011 — 不正遷移拒否

**Priority:** P0

拒否：

```text
doing → acting
doing → completed
checking → completed
completed → doing
cancelled → completed
```

結果：

```text
PDCA_INVALID_STATUS
状態変更なし
報酬変更なし
```

---

# 12. PDCA Cancel

## AC-PDCA-012 — Cycle Cancel

**Priority:** P1

### Given

```text
doing / checking / acting
```

### When

Cancel。

### Then

```text
status = cancelled
cancelledAt設定
報酬なし
```

---

# 13. PDCA Completion

## AC-PDCA-013 — Complete成功

**Priority:** P0

### Given

```text
Cycle.status = acting
doResult入力済み
checkLoad入力済み
actType入力済み
```

### When

`completePdcaCycle`。

### Then

```text
status = completed
completedAt設定
users.playerXp += 100
users.totalCycles += 1
users.availableGachaDraws += 1
goals.totalCycles += 1
Streak判定実行
```

---

# 14. PDCA Completion Idempotency

## AC-PDCA-014 — 二重Complete禁止

**Priority:** P0

### Given

同一Cycleがすでにcompleted。

### When

`completePdcaCycle` を再実行。

### Then

以下は増えない。

```text
playerXp
totalCycles
availableGachaDraws
goal.totalCycles
goal.activeDays
currentStreak
```

---

# 15. Task Result Does Not Affect Base Reward

## AC-PDCA-015 — 未達成でも同一報酬

**Priority:** P0

### Given

```text
doResult = notCompleted
```

### When

CHECK/ACTまで完了。

### Then

```text
XP = 通常通り
Gacha reward = 通常通り
Cycle count = 通常通り
```

---

# 16. Goal Aggregation

## AC-GOAL-007 — Goal totalCycles

**Priority:** P1

1回完了：

```text
totalCycles +1
```

同一Cycle二重Complete：

```text
+0
```

---

## AC-GOAL-008 — activeDays

**Priority:** P1

### Given

同じローカル日付で同一Goalを3周。

### Then

```text
totalCycles += 3
activeDays += 1
```

---

# 17. Player XP

## AC-PLAYER-001 — XP付与

**Priority:** P0

1 completed PDCA：

```text
+100 XP
```

---

## AC-PLAYER-002 — Client XP偽装不可

**Priority:** P0

### When

Frontendが任意XP値を送ろうとする。

### Then

```text
Serverはその値を利用しない
```

---

# 18. Player Level

## AC-PLAYER-003 — LvはServer計算

**Priority:** P1

### Then

```text
playerLevel = calculatePlayerLevel(playerXp)
```

Frontend計算値を正本にしない。

---

## AC-PLAYER-004 — Level Up Result

**Priority:** P2

Lv上昇時：

```text
levelUp = true
previousLevel
newLevel
```

が完了結果で取得可能。

---

# 19. Gacha Rights

## AC-GACHA-001 — PDCA報酬

**Priority:** P0

1 PDCA completed：

```text
availableGachaDraws += 1
```

---

## AC-GACHA-002 — 貯められる

**Priority:** P1

### Given

ガチャを引かずに3 PDCA完了。

### Then

```text
availableGachaDraws = previous + 3
```

---

# 20. Gacha Draw

## AC-GACHA-003 — 1回抽選

**Priority:** P0

### Given

```text
availableGachaDraws = 1
```

### When

`drawGacha`。

### Then

```text
Characterが1体確定
availableGachaDraws = 0
totalGachaDraws += 1
gachaHistoryが1件作成
```

---

## AC-GACHA-004 — 0回なら拒否

**Priority:** P0

### Given

```text
availableGachaDraws = 0
```

### When

`drawGacha`。

### Then

```text
GACHA_NO_DRAW_AVAILABLE
Inventory変更なし
History追加なし
totalGachaDraws変更なし
```

---

# 21. Gacha Server Authority

## AC-GACHA-005 — Client排出指定禁止

**Priority:** P0

Frontendから以下を指定できない。

```text
rarity
characterId
fragmentReward
```

Serverが確定する。

---

# 22. Gacha Rates

## AC-GACHA-006 — Rarity範囲

**Priority:** P0

通常ガチャ結果：

```text
R
SR
SSR
```

以外は存在しない。

---

## AC-GACHA-007 — inactive Character排出禁止

**Priority:** P0

```text
isActive = false
```

のCharacterは通常ガチャ候補に含めない。

---

# 23. New Character

## AC-GACHA-008 — 初入手

**Priority:** P0

### Given

対象Character Inventoryなし。

### When

排出。

### Then

```text
Inventoryが1件作成
fragmentCount = 0
duplicateCount = 0
obtainedAt設定
wasDuplicate = false
```

---

# 24. Duplicate Character

## AC-GACHA-009 — 重複時

**Priority:** P0

### Given

対象Characterを既に所持。

### When

再度排出。

### Then

```text
新しいInventoryレコードを作らない
duplicateCount += 1
fragmentCount += rarity reward
wasDuplicate = true
```

---

# 25. Inventory Uniqueness

## AC-GACHA-010 — User × Character = 1

**Priority:** P0

同一User / CharacterのInventoryは最大1件。

---

# 26. Gacha History

## AC-GACHA-011 — 成功時履歴作成

**Priority:** P0

ガチャ成功時：

```text
1 draw
=
1 gachaHistory record
```

---

## AC-GACHA-012 — drawSequence

**Priority:** P1

通算ガチャ番号が、

```text
1, 2, 3, ...
```

と増加する。

---

# 27. Collection

## AC-COLLECTION-001 — 所持一覧

**Priority:** P1

Current UserのInventoryを基準にCharacter所持状態を表示。

---

## AC-COLLECTION-002 — 未所持表示

**Priority:** P2

未所持Character：

```text
silhouette表示
```

---

## AC-COLLECTION-003 — Filter

**Priority:** P2

```text
All
R
SR
SSR
```

で絞り込める。

---

# 28. Partner Character

## AC-COLLECTION-004 — 相棒設定

**Priority:** P1

所持済みCharacterのみ相棒へ設定可能。

---

## AC-COLLECTION-005 — 未所持Character設定禁止

**Priority:** P1

未所持IDを直接送っても設定できない。

---

# 29. Streak — First Day

## AC-STREAK-001 — 初回完了

**Priority:** P0

### Given

```text
currentStreak = 0
lastCompletedDate = undefined
```

### When

PDCA完了。

### Then

```text
currentStreak = 1
longestStreak >= 1
lastCompletedDate = today
```

---

# 30. Streak — Same Day

## AC-STREAK-002 — 同日複数周

**Priority:** P0

### Given

今日既に1周完了。

### When

同日に追加で2周。

### Then

```text
totalCycles += 2
currentStreak変更なし
```

---

# 31. Streak — Next Day

## AC-STREAK-003 — 翌日

**Priority:** P0

### Given

昨日完了。

### When

今日PDCA完了。

### Then

```text
currentStreak += 1
```

---

# 32. Streak — At Risk

## AC-STREAK-004 — 1日空白

**Priority:** P0

### Given

```text
lastCompletedDate = 8/27
today = 8/29
```

### When

Streak stateをresolve。

### Then

Recovery eligibleなら：

```text
streakStatus = atRisk
pendingRecoveryDate = 8/28
currentStreakは即0にしない
```

---

# 33. Recovery Availability

## AC-RECOVERY-001 — Recovery可能

**Priority:** P0

### Given

1日欠席し、直近7日以内にRecovery未使用。

### Then

Recovery開始可能。

---

## AC-RECOVERY-002 — 7日以内2回目拒否

**Priority:** P0

### Given

直近7日以内にRecovery済み。

### Then

Recovery開始不可。

---

# 34. Recovery Complete

## AC-RECOVERY-003 — Recovery成功

**Priority:** P0

### Given

```text
currentStreak = 14
streakStatus = atRisk
```

### When

翌日にRecovery PDCAを完了。

### Then

```text
streakStatus = active
pendingRecoveryDate = undefined
lastRecoveryDate = today
currentStreak = 15
```

欠席日を追加で+1しない。

---

# 35. Recovery Deadline

## AC-RECOVERY-004 — 期限切れ

**Priority:** P0

### Given

Recovery期限を超えた。

### When

次回Streak resolve。

### Then

```text
currentStreak = 0
streakStatus = active
pendingRecoveryDate = undefined
```

---

# 36. Normal PDCA During At Risk

## AC-RECOVERY-005 — Recovery前の通常周回

**Priority:** P1

### Given

`streakStatus = atRisk`

### When

通常PDCAを完了。

### Then

```text
今日のactivityは記録
atRiskは解除しない
Recovery期限内なら後からRecovery可能
```

---

# 37. Timezone

## AC-TIME-001 — Server基準日付

**Priority:** P0

Streak判定にFrontend提供日時を使用しない。

---

## AC-TIME-002 — User timezone

**Priority:** P0

```text
Server current time
+
users.timezone
```

からローカル日付を算出する。

---

## AC-TIME-003 — 日付境界

**Priority:** P0

23:59 / 00:00付近でも、
保存timezoneに従って正しく判定できる。

---

# 38. AI Initial PLAN

## AC-AI-001 — 初回候補生成

**Priority:** P1

### Given

```text
Goal = 英語学習
```

### When

initial generation。

### Then

```text
短い具体的なPLAN候補
```

を返す。

---

# 39. AI Next PLAN

## AC-AI-002 — ACT反映

**Priority:** P1

### Given

```text
ACT = lighter
```

### Then

前回と同等以上に重い提案を基本的に避ける。

---

# 40. AI Output Validation

## AC-AI-003 — Broken JSON

**Priority:** P0

### Given

LLMが壊れたJSONを返す。

### Then

```text
fallback
PDCA継続可能
```

---

## AC-AI-004 — 空PLAN

**Priority:** P0

```text
nextPlan = ""
```

ならfallback。

---

## AC-AI-005 — 長すぎるPLAN

**Priority:** P1

上限超過：

```text
fallbackまたはvalidation failure
```

---

# 41. AI Failure

## AC-AI-006 — API Failure

**Priority:** P0

### Given

```text
LLM API 500
timeout
network failure
```

### Then

```text
core loop continues
fallback PLAN available
```

---

# 42. AI Authority

## AC-AI-007 — 自動確定禁止

**Priority:** P1

AI候補は、

```text
生成
↓
ユーザー確認
↓
保存
```

の順。

AIだけで次回PLANを確定しない。

---

# 43. Guest Mode

## AC-GUEST-001 — 未Login利用

**Priority:** P0

未Loginでも最低限：

```text
Goal
PLAN
PDCA
Gacha
```

を体験可能。

---

# 44. Guest Storage

## AC-GUEST-002 — localStorage保存

**Priority:** P0

Guest状態はreloadしても保持される。

---

# 45. Guest Session

## AC-GUEST-003 — guestSessionId

**Priority:** P0

Guest Sessionごとに一意IDを持つ。

---

# 46. Guest → Login

## AC-GUEST-004 — Login Migration

**Priority:** P0

### Given

GuestでPDCA + Gacha済み。

### When

Google Login後migration。

### Then

最低限以下がConvexへ保存される。

```text
User
Goal
PDCA
XP
Gacha state/result
Inventory
History
```

---

# 47. Guest Migration Idempotency

## AC-GUEST-005 — 二重Migration禁止

**Priority:** P0

### Given

同じ `guestSessionId`

### When

`migrateGuestData` を2回。

### Then

以下は1回分のみ。

```text
Goal
PDCA
XP
Inventory
gachaHistory
```

---

# 48. Guest Cleanup

## AC-GUEST-006 — 成功後削除

**Priority:** P1

Migration成功後：

```text
Guest localStorage削除
```

失敗時：

```text
Guest localStorage保持
```

---

# 49. Resume

## AC-RESUME-001 — doing復元

**Priority:** P1

### Given

Cycle.status = doing

### When

アプリ再起動。

### Then

「続きから」が表示される。

---

## AC-RESUME-002 — checking復元

**Priority:** P1

CHECK画面へ復帰可能。

---

## AC-RESUME-003 — acting復元

**Priority:** P1

ACT画面へ復帰可能。

---

# 50. History

## AC-HISTORY-001 — Recent Cycles

**Priority:** P1

完了済みCycleを新しい順に表示。

---

## AC-HISTORY-002 — Success/Failureラベル禁止

**Priority:** P1

履歴を、

```text
成功
失敗
```

で評価しない。

DO Resultを見せる場合も、
人格・成果評価として扱わない。

---

## AC-HISTORY-003 — Goal Filter

**Priority:** P2

Goal単位で履歴を絞れる。

---

# 51. History Summary

## AC-HISTORY-004

**Priority:** P2

最低候補：

```text
Current Streak
Today Cycles
Week Cycles
Total Cycles
```

---

# 52. Profile

## AC-PROFILE-001 — Player情報

**Priority:** P1

表示：

```text
Player Level
XP
Title
Partner Character
Total Cycles
```

---

# 53. Home

## AC-HOME-001 — 進行中PDCA優先

**Priority:** P1

進行中Cycleがある場合、
通常の新規開始CTAより再開導線を優先。

---

## AC-HOME-002 — At Risk表示

**Priority:** P1

`streakStatus = atRisk` の場合、
Recovery導線を視認可能にする。

---

## AC-HOME-003 — Gacha残数

**Priority:** P2

```text
availableGachaDraws > 0
```

ならガチャ導線を表示。

---

# 54. Navigation

## AC-UI-001 — Bottom Navigation

**Priority:** P1

通常時：

```text
Home
Collection
History
Profile
```

---

## AC-UI-002 — PDCA中Navigation

**Priority:** P2

PDCAフロー中はBottom Navを隠せる。

---

# 55. Mobile-first

## AC-UI-003 — Narrow Mobile

**Priority:** P1

主要画面が狭いスマートフォン幅で横スクロールしない。

---

## AC-UI-004 — Touch Target

**Priority:** P2

主要CTAがタップしにくいサイズにならない。

---

# 56. Loading State

## AC-UI-005

**Priority:** P2

主要Query待ちで無表示にならず、
Skeleton / Loading indicatorを出す。

---

# 57. Mutation Loading

## AC-UI-006

**Priority:** P0

PDCA Complete / Gacha / Migrationなど、
二重実行すると危険な操作は処理中disabled。

---

# 58. Error UI

## AC-UI-007

**Priority:** P1

内部Error Codeをそのままユーザーへ表示しない。

例：

```text
GACHA_NO_DRAW_AVAILABLE
```

ではなく、

```text
ガチャを引ける回数がありません
```

---

# 59. Empty State

## AC-UI-008

**Priority:** P2

以下で空白画面にしない。

```text
Goal 0件
History 0件
Collection所持0
```

---

# 60. Gacha UX

## AC-UI-009 — Result After Commit

**Priority:** P0

DB更新成功前にCharacter確定結果を表示しない。

---

## AC-UI-010 — New Character

**Priority:** P2

初入手：

```text
NEW
```

表示。

---

## AC-UI-011 — Duplicate

**Priority:** P2

重複：

```text
欠片 +N
```

表示。

---

# 61. PWA

## AC-PWA-001 — Installable

**Priority:** P2

対応BrowserでPWAとしてinstall可能なManifestがある。

---

## AC-PWA-002 — App Shell

**Priority:** P2

静的アセットの基本キャッシュが有効。

---

## AC-PWA-003 — Offline Mutation

**Priority:** P1

OfflineでServer更新操作した際に、
成功したように見せない。

---

# 62. Offline Scope

## AC-PWA-004

**Priority:** P1

MVPで完全Offline Syncを実装しなくてよい。

ただし、

```text
Offline操作
→ エラー表示
→ Online復帰後retry可能
```

であること。

---

# 63. Authentication

## AC-AUTH-001 — Google Login

**Priority:** P0

Google OAuthでLoginできる。

---

## AC-AUTH-002 — userId Client Input禁止

**Priority:** P0

認証必須Query / MutationでFrontendから `userId` を受け取らない。

---

# 64. Authorization

## AC-AUTH-003 — Goal Ownership

**Priority:** P0

他人のGoal取得・更新不可。

---

## AC-AUTH-004 — Cycle Ownership

**Priority:** P0

他人のCycle更新・Complete不可。

---

## AC-AUTH-005 — Partner Ownership

**Priority:** P1

他人または未所持CharacterをPartner設定不可。

---

# 65. Secret Management

## AC-SEC-001 — LLM API Key

**Priority:** P0

LLM API KeyをFrontend bundleへ含めない。

---

## AC-SEC-002 — Environment Variable

**Priority:** P0

Secretに `VITE_` prefixを使用しない。

---

# 66. Input Validation

## AC-SEC-003 — Server Validation

**Priority:** P0

以下をServerでもvalidate。

```text
Goal name
PLAN
CHECK memo
nextPlanCandidate
displayName
```

---

# 67. Domain Integrity

## AC-SEC-004 — Server Reward

**Priority:** P0

以下をClientから決定できない。

```text
XP
Level
Streak
Gacha count
Rarity
Fragments
```

---

# 68. Query Rule

## AC-ARCH-001

**Priority:** P0

Query内でDB更新しない。

---

# 69. Mutation Rule

## AC-ARCH-002

**Priority:** P1

DB完結型の業務処理を不要にActionへ移さない。

---

# 70. Action Rule

## AC-ARCH-003

**Priority:** P1

外部LLM API呼び出しはAction側。

---

# 71. Source of Truth

## AC-DATA-001 — PDCA

**Priority:** P0

PDCA履歴の正本：

```text
pdcaCycles
```

---

## AC-DATA-002 — Inventory

**Priority:** P0

所持状態の正本：

```text
inventories
```

---

## AC-DATA-003 — Gacha History

**Priority:** P0

ガチャ履歴の正本：

```text
gachaHistory
```

---

# 72. Logging

## AC-OPS-001

**Priority:** P2

Server Error時、
最低限調査可能な識別子を残す。

例：

```text
operation
userId
cycleId
goalId
errorCode
```

---

## AC-OPS-002

**Priority:** P2

不要な自由記述本文を大量にログへ出さない。

---

# 73. TypeScript

## AC-QUALITY-001

**Priority:** P0

```text
TypeScript errors = 0
```

---

# 74. Lint

## AC-QUALITY-002

**Priority:** P1

```text
Lint errors = 0
```

---

# 75. Build

## AC-QUALITY-003

**Priority:** P0

Production Build成功。

---

# 76. P0 Automated Tests

以下は自動テスト必須。

```text
PDCA二重Complete
Invalid PDCA transition
Gacha残数0
Gacha重複Inventory
他User Goal
他User Cycle
Same-day Streak
At Risk
Recovery成功
Recovery期限切れ
Guest二重Migration
AI fallback
```

---

# 77. Pure Function Tests

最低：

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

# 78. Mutation Integration Tests

最低：

```text
completePdcaCycle
drawGacha
migrateGuestData
```

---

# 79. E2E Acceptance — Guest Happy Path

## AC-E2E-001

**Priority:** P0

### Flow

```text
未Login
↓
Goal入力
↓
Initial PLAN
↓
PDCA
↓
Complete
↓
Gacha
↓
Google Login
↓
Migration
↓
Home
```

### Then

```text
Goal保存
Cycle保存
XP保存
Streak保存
Character保存
History保存
```

---

# 80. E2E Acceptance — Logged-in Happy Path

## AC-E2E-002

**Priority:** P1

```text
Login
↓
Goal選択
↓
PLAN
↓
DO
↓
CHECK
↓
ACT
↓
Complete
↓
Gacha
↓
Collection
```

が完走する。

---

# 81. Reload Acceptance

## AC-E2E-003

**Priority:** P1

PDCA途中でreloadしても、
保存済みstatusから再開できる。

---

# 82. Demo Acceptance

ハッカソン提出前、
以下を人間が実機で確認する。

```text
Goal作成
PDCA一周
未達成選択でも完走
XP付与
Streak表示
Gacha
New Character
Duplicate Character
Collection
Recovery
Guest Login Migration
Reload Resume
```

---

# 83. Failure Acceptance

以下の失敗ケースを最低1回ずつ手動確認。

```text
Network切断
Gacha残数0
Invalid Goal
AI failure
Unauthorized access simulation
Duplicate Complete
```

---

# 84. Visual Acceptance

P2。

主要画面：

```text
Home
PLAN
DO
CHECK
ACT
Complete
Gacha
Collection
History
Profile
Recovery
```

で、

```text
文字切れ
CTA被り
横スクロール
操作不能
```

がない。

---

# 85. Copy Acceptance

P2。

禁止：

```text
「失敗しました」
「サボりました」
「ダメでした」
```

のようにユーザーを評価する表現を基本UIに使わない。

許容：

```text
できなかった
少し重かった
今日はここまで
```

など事実ベース。

---

# 86. Core Product Invariants

以下はAcceptance Criteria以前の絶対条件。

```text
1 PDCA Cycle = 1 record

1 completed PDCA
= XP once
= totalCycles +1 once
= gacha right +1 once

Task success/failure
!= Base reward amount

1 gacha draw
= 1 draw right consumption
= 1 gachaHistory

User × Character
= max 1 inventory

AI failure
!= app failure

Client
!= authority for rewards
```

---

# 87. Coding Agent Acceptance Rule

コーディングエージェントはタスク完了時に、
対応するAC IDを報告する。

例：

```text
Implemented:
- AC-PDCA-013
- AC-PDCA-014
- AC-PLAYER-001

Tests:
- completePdcaCycle success
- duplicate complete idempotency
```

---

# 88. Coding Agent Cannot Self-Approve Spec Changes

以下が必要になった場合：

```text
ACを変更したい
Schemaを変えたい
報酬値を変えたい
Streak定義を変えたい
```

エージェントが独自変更して完了扱いにしてはいけない。

```text
Blocked / Spec decision required
```

として報告する。

---

# 89. Acceptance Failure Classification

## Blocker

```text
P0未達
Data corruption
Security failure
Core loop blocked
```

---

## Major

```text
P1未達
主要UX blocked
Recovery failure
AI fallback failure
```

---

## Minor

```text
P2/P3
Visual issue
Copy issue
Animation issue
```

---

# 90. Release Gate

MVPを「提出可能」と判断する条件：

```text
P0 AC 100% pass
P1 AC 原則pass
Production build pass
TypeScript error 0
P0 automated tests pass
Guest E2E pass
Logged-in core flow pass
実機Mobile確認
```

---

# 91. Optional Features Do Not Block MVP

以下は未完成でもMVP Acceptanceを妨げない。

```text
Weekly Mission
7-day chart
Push Notification
Character Growth
Base Growth
10連Gacha
Soft Pity
Dynamic Title system
Advanced Animation
```

---

# 92. Final Acceptance Checklist

提出前の最終チェック：

```text
[ ] Goal作成可能
[ ] Goal Archive可能
[ ] Archived GoalでPDCA開始不可
[ ] PLAN確定可能
[ ] DO 3結果すべて進行可能
[ ] CHECK可能
[ ] ACT可能
[ ] PDCA Complete可能
[ ] 二重Complete安全
[ ] XP付与
[ ] Level更新
[ ] Streak更新
[ ] At Risk
[ ] Recovery
[ ] Recovery期限切れ
[ ] Gacha残数付与
[ ] Gacha抽選
[ ] New Character
[ ] Duplicate
[ ] Inventory一意
[ ] Collection
[ ] Partner設定
[ ] AI initial
[ ] AI next
[ ] AI fallback
[ ] Guest Mode
[ ] Guest Login
[ ] Guest Migration
[ ] 二重Migration安全
[ ] History
[ ] Profile
[ ] Resume
[ ] Mobile UI
[ ] Offline Error
[ ] Auth
[ ] Authorization
[ ] Secret安全
[ ] Typecheck
[ ] Lint
[ ] Build
[ ] P0 Test
[ ] E2E
```

---

# 93. Final Principle

このMVPでは、

> **「画面がある」ことではなく、「コアループとデータ整合性が仕様通り成立する」ことを完成とする。**

Acceptance Criteriaは、
実装者の感覚ではなく、

```text
Given
When
Then
```

で判定できる状態を維持する。

最重要なのは、

```text
Goal
↓
PDCA
↓
Complete
↓
XP / Streak / Gacha
↓
次のPDCA
```

が安全に繰り返せること。

このループを壊す変更は、
見た目や追加機能よりも常に優先して修正する。
