# Implementation Plan

> Status: Draft / 初版
>
> 本ドキュメントは、PDCA GACHA のハッカソンMVPを実装するための具体的な作業計画を定義する。
>
> 対象読者：
>
> - 人間の開発者
> - コーディングエージェント
>
> 本書の目的は、
>
> **「何を、どの順番で、どこまで実装すればよいか」を明確にし、設計判断を実装フェーズへ持ち込まないこと**
>
> である。
>
> 実装時は以下のドキュメントを前提とする。
>
> - `overview.md`
> - `product-spec.md`
> - `user-flow.md`
> - `game-design.md`
> - `tech-stack.md`
> - `ui-spec.md`
> - `data-model.md`
> - `technical-design.md`

---

# 1. Implementation Strategy

MVPは以下の原則で進める。

```text
Core Loop First
↓
Persistency
↓
Reward
↓
Game Layer
↓
Auth / Migration
↓
Polish
```

最初から全画面を並行実装しない。

最優先は、

```text
Goal
↓
PLAN
↓
DO
↓
CHECK
↓
ACT
↓
PDCA COMPLETE
```

が安全に一周すること。

---

# 2. Definition of MVP

MVP完成時に最低限成立していること：

```text
1. Goalを作れる
2. PLANを決められる
3. PDCAを開始できる
4. DO結果を保存できる
5. CHECKできる
6. ACTできる
7. PDCA完了でXPを獲得できる
8. Streakが更新される
9. ガチャ権を獲得できる
10. ガチャを引ける
11. Characterを所持できる
12. Historyを見られる
13. GuestからGoogle Loginへ移行できる
14. 再読み込みしても状態が復元される
```

---

# 3. Implementation Phases

MVP実装を以下のPhaseに分ける。

```text
Phase 0: Project Foundation
Phase 1: Data Model / Convex Foundation
Phase 2: Auth Foundation
Phase 3: Goal
Phase 4: PDCA Core Loop
Phase 5: Reward / Player
Phase 6: Streak / Recovery
Phase 7: Gacha / Collection
Phase 8: AI PLAN
Phase 9: Guest → Login Migration
Phase 10: History / Profile
Phase 11: PWA / UX Polish
Phase 12: Hardening / Final Test
```

---

# 4. Phase 0 — Project Foundation

## Goal

開発を開始できる最低限のFrontend環境を構築する。

---

## Tasks

### 0-1. React + Vite + TypeScript

```text
Vite
React
TypeScript
```

を導入。

---

### 0-2. Tailwind CSS

Tailwind CSSを導入する。

---

### 0-3. Folder Structure

初期構成：

```text
src/
  app/
  components/
  features/
  hooks/
  lib/
  routes/
  types/
```

---

### 0-4. Basic Routing

最低限：

```text
/
collection
history
profile
goal/:goalId
```

PDCAフローは専用Routeまたは状態制御で実装。

---

### 0-5. Global Layout

モバイルファーストのApp Shell。

含む：

```text
Header
Main
Bottom Navigation
```

Bottom Nav：

```text
Home
Collection
History
Profile
```

PDCA中はBottom Navを隠せる構造にする。

---

## Completion Criteria

```text
npm run dev成功
TypeScript errorなし
Tailwind反映
4タブ遷移可能
Mobile widthで崩れない
```

---

# 5. Phase 1 — Convex Foundation

## Goal

Backend / Databaseの基礎を構築する。

---

## Tasks

### 1-1. Convex Setup

Convexをプロジェクトへ接続。

---

### 1-2. Schema

`data-model.md` に従って以下を定義。

```text
users
goals
pdcaCycles
characters
inventories
gachaHistory
```

---

### 1-3. Indexes

実装：

```text
users
  by_clerk_user_id

goals
  by_user
  by_user_archived

pdcaCycles
  by_user
  by_goal
  by_user_status
  by_user_completed_at
  by_goal_completed_at

characters
  by_rarity
  by_active_sort_order

inventories
  by_user
  by_user_character

gachaHistory
  by_user
  by_user_draw_sequence
```

---

### 1-4. Domain Constants

定数を分離。

例：

```text
BASE_PDCA_XP
GACHA_RATES
DUPLICATE_FRAGMENT_REWARD
INPUT_LIMITS
```

---

### 1-5. Error Codes

`technical-design.md` に定義されたError Codeを実装。

---

## Completion Criteria

```text
Convex dev起動
Schema deploy成功
全Index定義済み
TypeScript errorなし
```

---

# 6. Phase 2 — Authentication Foundation

## Goal

Clerk + Google OAuthを利用可能にする。

---

## Tasks

### 2-1. Clerk Setup

ClerkをFrontendへ導入。

---

### 2-2. Google OAuth

Google Loginを有効化。

---

### 2-3. Convex Auth Integration

ConvexからClerk Identityを取得可能にする。

---

### 2-4. Auth Helpers

実装：

```ts
requireCurrentUser()
requireOwnedGoal()
requireOwnedCycle()
```

---

### 2-5. User Initialization

初回Login時に `users` レコードを作成。

初期値：

```text
playerXp = 0
playerLevel = 1
currentStreak = 0
longestStreak = 0
availableGachaDraws = 0
totalCycles = 0
totalGachaDraws = 0
```

---

## Completion Criteria

```text
Google Login成功
Convex側でCurrent User取得可能
FrontendからuserIdを渡さずQueryできる
未認証時AUTH_REQUIRED
```

---

# 7. Phase 3 — Goal

## Goal

継続対象を作成・取得できるようにする。

---

## Tasks

### 3-1. createGoal Mutation

入力：

```text
name
```

Server側でuserを確定。

---

### 3-2. getGoals Query

Current Userのactive Goal一覧取得。

---

### 3-3. Goal Card UI

表示：

```text
Goal名
次のPLAN候補
総周回数
開始CTA
```

---

### 3-4. Goal Detail

表示：

```text
Goal名
totalCycles
activeDays
nextPlanCandidate
recent history
```

---

### 3-5. Archive Goal

物理削除せず `archivedAt` を設定。

---

## Completion Criteria

```text
Goal作成
一覧表示
Detail表示
Archive
他人のGoal操作不可
```

---

# 8. Phase 4 — PDCA Core Loop

## Goal

本プロダクトの中心機能を完成させる。

---

# 8.1 PLAN

## Tasks

```text
Goal選択
nextPlanCandidate表示
もっと軽く
これでやる
もう少しやる
自分で変更
```

---

## startPdcaCycle

Mutation：

```text
goalId
planText
isRecovery
```

作成：

```text
status = doing
```

---

# 8.2 DO

UI：

```text
今回のPLAN
振り返る
```

必須Timerなし。

---

## submitDoResult

入力：

```text
completed
partial
notCompleted
```

成功：

```text
status = checking
```

---

# 8.3 CHECK

入力：

```text
easy
justRight
slightlyHeavy
tooHeavy
```

条件付き：

```text
noTime
tooLarge
tooDifficult
noFocus
noMotivation
other
```

Optional Memo。

---

## submitCheck

成功：

```text
status = acting
```

---

# 8.4 ACT

入力：

```text
lighter
same
heavier
changeApproach
```

表示：

```text
次回PLAN候補
```

---

## submitAct

保存：

```text
actType
nextPlanCandidate
```

---

# 8.5 COMPLETE

`completePdcaCycle`

処理：

```text
status = completed
XP
Goal aggregate
Player aggregate
Gacha right
Streak
```

---

## Completion Criteria

Happy Path：

```text
PLAN
→ DO
→ CHECK
→ ACT
→ COMPLETE
```

が成立。

さらに：

```text
ブラウザreload
→ 進行中PDCA復元

不正status遷移
→ Server reject

same cycle complete 2回
→ reward 1回のみ
```

---

# 9. Phase 5 — Reward / Player

## Goal

PDCA完了時のゲーム報酬を成立させる。

---

## Tasks

### 5-1. Player XP

```text
1 PDCA = +100 XP
```

---

### 5-2. Player Level

純粋関数：

```ts
calculatePlayerLevel()
```

---

### 5-3. Level Up Result

Frontendへ：

```text
previousLevel
newLevel
levelUp
```

を返す。

---

### 5-4. Gacha Rights

PDCA完了：

```text
availableGachaDraws += 1
```

---

### 5-5. PDCA Complete Screen

表示：

```text
+1 Cycle
+100 XP
+1 Gacha
Streak
Level Up
```

---

## Completion Criteria

```text
PDCA complete
→ XP増加
→ Lv反映
→ Gacha残数増加

二重complete
→ 二重付与なし
```

---

# 10. Phase 6 — Streak / Recovery

## Goal

継続体験を成立させる。

---

## Tasks

### 6-1. Date Utility

実装：

```ts
getLocalDateString()
daysBetweenLocalDates()
isNextLocalDay()
```

---

### 6-2. Streak Resolver

実装：

```ts
resolveStreakState()
```

---

### 6-3. Normal Streak

対応：

```text
same day
next day
first completion
```

---

### 6-4. At Risk

1日空白時：

```text
streakStatus = atRisk
pendingRecoveryDate = missingDate
```

---

### 6-5. Recovery Availability

```text
rolling 7 daysで1回
```

---

### 6-6. Recovery Flow UI

```text
At Risk Banner
↓
理由選択
↓
軽いPLAN
↓
DO
↓
CHECK
↓
ACT
↓
Recovery Complete
```

---

### 6-7. Recovery Deadline

期限超過：

```text
currentStreak = 0
```

---

## Completion Criteria

テスト必須：

```text
同日3周 → +1 only
翌日 → +1
1日空白 → atRisk
Recovery成功 → streak維持
期限切れ → reset
7日以内2回目Recovery不可
timezone境界成功
```

---

# 11. Phase 7 — Gacha / Collection

## Goal

PDCA報酬をゲーム体験に変換する。

---

# 11.1 Character Master

15体登録：

```text
R   8
SR  5
SSR 2
```

---

# 11.2 drawGacha Mutation

実装順：

```text
available check
rarity roll
character roll
inventory check
inventory update
history insert
user update
result return
```

---

# 11.3 Gacha Rate

```text
R 70%
SR 25%
SSR 5%
```

---

# 11.4 Duplicate

```text
R   +10 fragment
SR  +20
SSR +40
```

---

# 11.5 Gacha UI

状態：

```text
Waiting
Drawing
Result
```

表示：

```text
rarity
character
NEW
duplicate fragments
remaining draws
```

---

# 11.6 Collection

3-column Grid。

Filter：

```text
All
R
SR
SSR
```

未所持：

```text
silhouette
```

---

# 11.7 Character Detail

表示：

```text
name
rarity
description
fragmentCount
set partner
```

---

## Completion Criteria

```text
ticket 1 → 1 draw only
inventory new
inventory duplicate
history insert
inactive排出なし
collection表示
partner設定
```

---

# 12. Phase 8 — AI PLAN

## Goal

ユーザー負担を減らす。

---

## Tasks

### 8-1. generatePlan Action

mode：

```text
initial
next
```

---

### 8-2. Structured Output

```json
{
  "nextPlan": "...",
  "message": "..."
}
```

---

### 8-3. Validation

```text
JSON valid
nextPlan exists
max length
correct type
```

---

### 8-4. Fallback

実装：

```ts
resolveNextPlanFallback()
```

---

### 8-5. Initial PLAN

Goal入力後：

```text
Goal
↓
AI
↓
小さいPLAN候補
```

---

### 8-6. Next PLAN

入力：

```text
Goal
current PLAN
DO
CHECK
ACT
recent history
```

---

## Completion Criteria

```text
正常AI → suggestion
API failure → fallback
broken JSON → fallback
AI errorでPDCA停止しない
```

---

# 13. Phase 9 — Guest → Login Migration

## Goal

ログイン前体験を保存可能にする。

---

## Tasks

### 9-1. Guest Store

localStorage：

```text
guestSessionId
guestGoal
guestPdcaCycle
guestGachaState
```

---

### 9-2. Guest First Flow

```text
Goal
PLAN
PDCA
Gacha
```

を未Loginで実行可能にする。

---

### 9-3. Save Prompt

初回ガチャ後：

```text
この記録を保存する
```

---

### 9-4. Login

Google OAuth。

---

### 9-5. migrateGuestData

専用Mutation。

---

### 9-6. Idempotency

同じ：

```text
guestSessionId
```

は1度だけ移行。

---

### 9-7. Cleanup

成功後：

```text
localStorage guest data delete
```

---

## Completion Criteria

```text
Guest → Login → Data retained
XP retained
Goal retained
Cycle retained
Character retained
double migrationなし
```

---

# 14. Phase 10 — History / Profile

## History

表示：

```text
Current Streak
Today Cycles
Week Cycles
Total Cycles
Recent Cycle Cards
Goal Filter
```

成功/失敗ラベルは付けない。

---

## Profile

表示：

```text
Player Lv
XP Progress
Title
Partner
Total Cycles
Next Unlock
```

---

## Completion Criteria

```text
履歴最新順
Goal filter
Player status正常
Partner表示
```

---

# 15. Phase 11 — PWA / UX Polish

## Tasks

### 11-1. PWA Manifest

```text
name
icons
theme
standalone
```

---

### 11-2. Static Asset Cache

候補：

```text
JS
CSS
icons
character images
```

---

### 11-3. Offline UI

Mutation失敗時：

```text
通信できません
接続後にもう一度お試しください
```

完全Offline Syncはしない。

---

### 11-4. Loading States

```text
Skeleton
Button disabled
Spinner
```

---

### 11-5. Empty States

```text
No Goal
No History
No Characters
```

---

### 11-6. Gacha Animation

報酬体験のみ派手に。

---

### 11-7. Responsive Check

対象：

```text
iPhone narrow width
Android narrow width
Desktop
```

---

# 16. Phase 12 — Hardening

## Goal

提出可能な品質へ上げる。

---

## Tasks

### 12-1. Typecheck

```text
0 errors
```

---

### 12-2. Lint

```text
0 errors
```

---

### 12-3. Unit Tests

P0/P1中心。

---

### 12-4. Integration Tests

```text
completePdcaCycle
drawGacha
migrateGuestData
```

---

### 12-5. E2E

最低：

```text
Guest
→ Goal
→ PDCA
→ Gacha
→ Login
→ Home
```

---

### 12-6. Security Review

確認：

```text
Client userIdなし
API key frontendなし
Ownership checkあり
Reward server-side
```

---

### 12-7. Demo Data

デモで事故らないよう、
Character master / 初期状態を確認。

---

# 17. Dependency Graph

大まかな依存：

```text
Project Foundation
↓
Convex Foundation
↓
Auth Foundation
↓
Goal
↓
PDCA Core
↓
Reward
↓
Streak
↓
Gacha
↓
AI
↓
Guest Migration
↓
History/Profile
↓
PWA Polish
↓
Hardening
```

ただしFrontend担当が複数いる場合、

```text
UI mock
```

はBackendと並行してよい。

---

# 18. Parallelizable Work

## Parallel Group A

```text
Frontend App Shell
Convex Schema
Character Asset制作
```

---

## Parallel Group B

```text
Goal UI
PDCA UI
Domain Pure Functions
```

---

## Parallel Group C

```text
Gacha UI
Character Collection UI
AI Prompt design
```

---

# 19. Non-Parallel Critical Path

以下は順番を崩さない方がよい。

```text
schema
↓
auth
↓
PDCA mutations
↓
completePdcaCycle
↓
streak / reward
↓
gacha
```

---

# 20. Suggested Implementation Ticket Size

コーディングエージェントへは、
大きすぎるIssueを一気に渡さない。

悪い例：

```text
PDCA全部実装して
```

良い例：

```text
startPdcaCycle Mutationを実装
```

```text
submitDoResult MutationとP0 testを実装
```

```text
completePdcaCycleの冪等性を実装
```

---

# 21. Suggested Agent Task Sequence

以下の順に渡すと進めやすい。

```text
T001 Project bootstrap
T002 Convex schema
T003 Domain constants
T004 Auth helper
T005 Goal mutations/queries
T006 PDCA state validation
T007 startPdcaCycle
T008 submitDoResult
T009 submitCheck
T010 submitAct
T011 completePdcaCycle
T012 Player XP / Level
T013 Date utilities
T014 Streak resolver
T015 Recovery
T016 Character seed
T017 Gacha domain logic
T018 drawGacha
T019 Inventory / Collection
T020 generatePlan Action
T021 AI fallback
T022 Guest store
T023 Guest migration
T024 History
T025 Profile
T026 PWA
T027 Integration tests
T028 E2E
T029 Final polish
```

---

# 22. Task Template

各タスクは最低限以下を含める。

```text
Task
Goal
Files likely affected
Required docs
Constraints
Acceptance criteria
Tests
Forbidden changes
```

---

# 23. Example Agent Task

```text
Task:
completePdcaCycle Mutationを実装する

Required Docs:
- docs/data-model.md
- docs/technical-design.md
- docs/product-spec.md

Requirements:
- acting状態のみcomplete可能
- userIdはClientから受け取らない
- XP +100
- totalCycles +1
- availableGachaDraws +1
- Goal集計更新
- Streak更新
- 二重completeで報酬再付与禁止

Tests:
- acting → completed
- doing → reject
- duplicate complete → reward once

Forbidden:
- schema変更
- XP値変更
- status enum変更
```

---

# 24. Branch / Commit Strategy

ハッカソンMVPでは過剰な運用は不要。

推奨：

```text
main
feature/*
fix/*
```

1タスク1コミットまたは、
意味のある単位でコミットする。

---

# 25. PR Completion Report

コーディングエージェントは実装後に以下を報告する。

```text
変更ファイル
実装内容
追加テスト
テスト結果
残課題
仕様判断が必要な点
```

---

# 26. Bug Fix Priority

## P0

```text
Data corruption
Reward duplication
Unauthorized access
Streak corruption
Gacha corruption
```

即修正。

---

## P1

```text
Core loop blocked
Login blocked
Guest migration blocked
```

優先修正。

---

## P2

```text
Visual issue
Animation issue
Minor copy issue
```

後回し可能。

---

# 27. Time-box Policy

ハッカソンでは、
1機能に時間をかけすぎない。

詰まった場合：

```text
1. Core仕様維持
2. UI簡略化
3. Optional feature削除
```

の順で削る。

Core Domainを削らない。

---

# 28. Features to Cut First

時間不足時：

```text
7-day chart
Weekly Mission
Title selection
Character detail animation
advanced gacha animation
PWA notification
```

を削る。

---

# 29. Features Not to Cut

```text
Goal
PDCA
PDCA completion reward
Streak
Gacha
Collection
Guest first-run
Login migration
```

はMVPコア。

---

# 30. Demo-first Milestone

ハッカソン中盤までに以下を必ず完成させる。

```text
Goal
↓
PDCA
↓
Complete
↓
Gacha
```

見た目が未完成でもよい。

この時点で、
Core Loopが技術的に成立していることを確認する。

---

# 31. Recommended Milestones

## Milestone A — Core Data

```text
Schema
Auth
Goal
```

---

## Milestone B — Core PDCA

```text
PLAN
DO
CHECK
ACT
Complete
```

---

## Milestone C — Game Loop

```text
XP
Streak
Gacha
Collection
```

---

## Milestone D — Onboarding

```text
Guest
AI
Login Migration
```

---

## Milestone E — Product Finish

```text
History
Profile
PWA
Animation
Testing
```

---

# 32. Test Gate

次Phaseへ進む条件：

```text
P0 test pass
TypeScript error 0
主要flow手動確認
```

P0を壊したまま新機能を追加しない。

---

# 33. Documentation Sync Rule

実装中に仕様変更が発生した場合、

```text
Codeだけ変更
```

は禁止。

対応するDocsも更新する。

例：

```text
Data model変更
→ data-model.md

State transition変更
→ technical-design.md

User flow変更
→ user-flow.md

UI変更
→ ui-spec.md
```

---

# 34. Coding Agent Harness Rule

エージェントへ実装依頼する際、
最低でも以下を毎回明示する。

```text
このリポジトリのdocsを仕様のSource of Truthとして扱うこと。
不明点を独自解釈で仕様変更しないこと。
既存P0テストを壊さないこと。
```

---

# 35. Final Implementation Order

最終推奨順：

```text
1. Project setup
2. Convex schema
3. Clerk auth
4. Goal
5. PDCA state machine
6. PDCA complete
7. XP / Player Lv
8. Streak
9. Recovery
10. Gacha
11. Collection
12. AI
13. Guest mode
14. Guest migration
15. History
16. Profile
17. PWA
18. Polish
19. Final test
```

---

# 36. Final Principle

PDCA GACHAのMVP開発では、

> **「全部を少しずつ作る」のではなく、コアループを縦に完成させる。**

最重要パス：

```text
User
↓
Goal
↓
PLAN
↓
DO
↓
CHECK
↓
ACT
↓
PDCA COMPLETE
↓
XP / Streak / Gacha
↓
次のPDCA
```

このループが成立した時点で、
PDCA GACHAはプロダクトとして成立する。

以降のHistory、Profile、Animation、PWAは、
このコアループを強化するために追加する。

コーディングエージェントには、
大きな完成形を丸投げせず、

> **小さなタスク + 明確な制約 + Acceptance Criteria + Test**

の単位で順番に実装させる。
