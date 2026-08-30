# Data Model

> Status: Draft / 初版
>
> 本ドキュメントは、PDCA GACHA のハッカソンMVPにおけるデータモデルを定義する。
>
> 実装基盤は Convex を前提とし、`schema.ts` に落とし込みやすい粒度で整理する。
>
> 本ドキュメントの目的は、実装担当者が以下を迷わず理解できる状態を作ることである。
>
> - どのテーブルが存在するか
> - 各テーブルが何を表すか
> - 各フィールドの意味
> - どのデータが正本か
> - どの値が集計キャッシュか
> - テーブル間の関係
> - どのインデックスが必要か
> - PDCA・ガチャ・ストリーク更新時に何が変化するか

---

# 1. 設計方針

PDCA GACHA のMVPでは、データモデルを必要以上に細分化しない。

特にPDCAについては、

```text
PLAN
DO
CHECK
ACT
```

を別テーブルに分けず、

> **1回のPDCA Cycleを1レコード**

として管理する。

これにより、

- 途中状態の再開
- 履歴表示
- Goal単位の取得
- 状態遷移
- AIへの履歴入力

をシンプルに扱えるようにする。

---

# 2. MVPテーブル一覧

MVPで使用する主要テーブルは以下の6つとする。

```text
users
goals
pdcaCycles
characters
inventories
gachaHistory
```

ミッションや称号はMVPでは独立テーブルを必須とせず、
必要に応じてコード側の定義・既存データから算出する。

---

# 3. Entity Relationship Overview

```text
users
  │
  ├──< goals
  │      │
  │      └──< pdcaCycles
  │
  ├──< inventories >── characters
  │
  └──< gachaHistory >── characters
```

関係：

```text
User 1 : N Goal
User 1 : N PDCA Cycle
Goal 1 : N PDCA Cycle

User 1 : N Inventory
Character 1 : N Inventory

User 1 : N Gacha History
Character 1 : N Gacha History
```

---

# 4. users

## 4.1 役割

認証済みユーザーのPlayer情報・ストリーク・集計値を保持する。

Clerkのユーザー情報そのものを完全複製するのではなく、
PDCA GACHA 内で必要な情報のみ保存する。

---

## 4.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `clerkUserId` | string | Yes | Clerk側のUser ID |
| `displayName` | string | No | アプリ内表示名 |
| `playerXp` | number | Yes | 累計Player XP |
| `playerLevel` | number | Yes | 現在のPlayer Lv |
| `currentTitle` | string | No | 現在表示中の称号 |
| `partnerCharacterId` | Id<characters> | No | 現在の相棒キャラクター |
| `currentStreak` | number | Yes | 現在の連続日数 |
| `longestStreak` | number | Yes | 過去最長ストリーク |
| `lastCompletedDate` | string | No | 最後にPDCAを完了したローカル日付 |
| `lastRecoveryDate` | string | No | 最後にRecoveryを利用したローカル日付 |
| `recoveryUsedInWindow` | boolean | Yes | 現在のRecovery利用期間内で使用済みか |
| `totalCycles` | number | Yes | 累計PDCA完了数 |
| `totalGachaDraws` | number | Yes | 累計ガチャ回数 |
| `timezone` | string | Yes | 日付境界判定用タイムゾーン |
| `createdAt` | number | Yes | 作成Unix time(ms) |
| `updatedAt` | number | Yes | 更新Unix time(ms) |

---

## 4.3 初期値

ユーザー作成時：

```text
playerXp = 0
playerLevel = 1
currentStreak = 0
longestStreak = 0
recoveryUsedInWindow = false
totalCycles = 0
totalGachaDraws = 0
```

---

## 4.4 `lastCompletedDate`

ストリーク判定ではTimestampそのものではなく、

```text
YYYY-MM-DD
```

形式のローカル日付文字列を利用する。

例：

```text
2026-08-28
```

理由：

- 「その日に1周したか」の判定が簡単
- 日付境界ロジックを明確にできる
- Timestampだけを比較して日付換算する処理を毎回書かなくてよい

Timestampそのものは `pdcaCycles.completedAt` に保持する。

---

## 4.5 `timezone`

例：

```text
Asia/Tokyo
```

ストリーク・Daily Mission・Recoveryの判定は、
このタイムゾーンを基準とする。

MVPでは初回利用時のブラウザタイムゾーンを保存する想定。

---

## 4.6 集計キャッシュ

以下は他テーブルから再計算可能だが、
Home / Profileで頻繁に利用するため `users` に保持する。

```text
playerXp
playerLevel
currentStreak
longestStreak
totalCycles
totalGachaDraws
```

これらは、

> **表示高速化・実装単純化のための集計キャッシュ**

として扱う。

正しい履歴データは `pdcaCycles` / `gachaHistory` 側に存在する。

---

## 4.7 Index

```text
by_clerk_user_id
  clerkUserId
```

用途：

- Login後にConvex Userを取得
- Clerk UserとアプリUserを紐付ける

`clerkUserId` は実質ユニークとして扱う。

---

# 5. goals

## 5.1 役割

ユーザーが中長期的に継続したい対象を表す。

例：

```text
英語学習
筋トレ
個人開発
読書
資格勉強
```

GoalはPDCAそのものではない。

具体的な行動は `pdcaCycles.planText` として管理する。

---

## 5.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `userId` | Id<users> | Yes | 所有ユーザー |
| `name` | string | Yes | Goal名 |
| `nextPlanCandidate` | string | No | 次回PLAN候補 |
| `totalCycles` | number | Yes | このGoalの累計PDCA完了数 |
| `activeDays` | number | Yes | このGoalでPDCAを完了した日数 |
| `lastCompletedAt` | number | No | 最終PDCA完了時刻 |
| `lastCompletedDate` | string | No | 最終PDCA完了ローカル日付 |
| `createdAt` | number | Yes | 作成時刻 |
| `updatedAt` | number | Yes | 更新時刻 |
| `archivedAt` | number | No | アーカイブ時刻 |

---

## 5.3 Goal削除

MVPでは物理削除ではなく、

```text
archivedAt
```

を設定してアーカイブ扱いとする。

理由：

```text
Goal削除
↓
過去pdcaCycles.goalIdが参照不能
```

となるのを避けるため。

---

## 5.4 `nextPlanCandidate`

ACT完了時に生成された次回候補を保存する。

例：

```text
今回:
英単語10個

CHECK:
少し重かった

ACT:
軽くする

↓

goals.nextPlanCandidate:
英単語を5個復習する
```

Home画面ではこの値を利用して、

```text
次の候補
英単語を5個復習する
```

と即座に表示する。

---

## 5.5 `activeDays`

「PDCA周回数」と「活動日数」は別物として扱う。

例：

```text
2026-08-28

英語PDCAを3周
```

の場合、

```text
totalCycles += 3
activeDays += 1
```

とする。

同じ日に複数回完了しても `activeDays` は1だけ増える。

判定には `lastCompletedDate` を利用する。

---

## 5.6 Index

```text
by_user
  userId
```

用途：

- HomeのGoal一覧
- Profile
- Goal管理

```text
by_user_archived
  userId
  archivedAt
```

用途：

- アクティブGoalのみ取得
- アーカイブ済みGoal一覧

MVP実装上 `archivedAt = undefined` の検索が扱いづらい場合は、
将来的に `isArchived: boolean` を追加してもよい。

---

# 6. pdcaCycles

## 6.1 役割

1回のPDCA Cycleを保持する中心テーブル。

本プロダクトにおける最重要履歴データ。

---

## 6.2 Record Creation Timing

`pdcaCycles` レコードは、

> **PLANが確定し、DOを開始するタイミング**

で作成する。

その時点で、

```text
status = doing
```

とする。

PLAN候補を表示しているだけの状態では、
まだCycleレコードを作成しなくてよい。

---

## 6.3 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `userId` | Id<users> | Yes | 所有ユーザー |
| `goalId` | Id<goals> | Yes | 対象Goal |
| `planText` | string | Yes | 今回実行するPLAN |
| `status` | enum | Yes | 現在のPDCA状態 |
| `doResult` | enum | No | DO結果 |
| `checkLoad` | enum | No | タスク負荷評価 |
| `checkReason` | enum | No | CHECK原因 |
| `checkMemo` | string | No | 任意メモ |
| `actType` | enum | No | ACT種別 |
| `nextPlanCandidate` | string | No | 次回PLAN候補 |
| `isRecovery` | boolean | Yes | Recovery PDCAか |
| `startedAt` | number | Yes | DO開始時刻 |
| `completedAt` | number | No | PDCA完了時刻 |
| `cancelledAt` | number | No | キャンセル時刻 |
| `createdAt` | number | Yes | レコード作成時刻 |
| `updatedAt` | number | Yes | 最終更新時刻 |

---

# 7. PDCA Status

## 7.1 Enum

```text
doing
checking
acting
completed
cancelled
```

---

## 7.2 State Transition

基本状態遷移：

```text
PLAN確定
↓
doing
↓
checking
↓
acting
↓
completed
```

中断時：

```text
doing/checking/acting
↓
cancelled
```

---

## 7.3 State Meaning

### `doing`

PLAN確定済み。
ユーザーが現実世界でタスクを実施中。

### `checking`

DO結果入力済み。
CHECK待ちまたはCHECK入力中。

### `acting`

CHECK完了済み。
ACT待ちまたはACT入力中。

### `completed`

ACTまで完了。
PDCA 1周として成立済み。

### `cancelled`

ユーザーが途中でCycleを破棄した状態。

---

# 8. DO Result

```text
completed
partial
notCompleted
```

意味：

| Value | UI |
|---|---|
| `completed` | できた |
| `partial` | 一部できた |
| `notCompleted` | できなかった |

DO結果はPDCA完了報酬に影響しない。

---

# 9. CHECK Load

```text
easy
justRight
slightlyHeavy
tooHeavy
```

対応：

| Value | UI |
|---|---|
| `easy` | 余裕だった |
| `justRight` | ちょうどよかった |
| `slightlyHeavy` | 少し重かった |
| `tooHeavy` | かなり重かった |

---

# 10. CHECK Reason

```text
noTime
tooLarge
tooDifficult
noFocus
noMotivation
other
```

対応：

| Value | UI |
|---|---|
| `noTime` | 時間がなかった |
| `tooLarge` | タスクが大きすぎた |
| `tooDifficult` | 難しかった |
| `noFocus` | 集中できなかった |
| `noMotivation` | やる気が出なかった |
| `other` | その他 |

CHECK Reasonは条件付き質問のため、
未入力でもよい。

---

# 11. ACT Type

```text
lighter
same
heavier
changeApproach
```

対応：

| Value | UI |
|---|---|
| `lighter` | 少し軽くする |
| `same` | そのまま |
| `heavier` | 少し増やす |
| `changeApproach` | やり方を変える |

---

# 12. PDCA Completion Invariants

`status = completed` のレコードは最低限、

```text
planText
doResult
checkLoad
actType
completedAt
```

を持つ。

ただし将来、
RecoveryやProgressive PDCAで入力項目が変化する可能性があるため、
Schema上すべてをRequiredにはせず、

> **完了Mutation側で整合性を保証する**

方針とする。

---

# 13. pdcaCycles Index

## `by_user`

```text
userId
```

用途：

- 全履歴
- ユーザー集計
- 最新Cycle取得

---

## `by_goal`

```text
goalId
```

用途：

- Goal Detail
- Goal別履歴

---

## `by_user_status`

```text
userId
status
```

用途：

- 進行中PDCA検索
- `doing/checking/acting` の再開

---

## `by_user_completed_at`

```text
userId
completedAt
```

用途：

- Historyの新着順
- 今日 / 今週のPDCA取得
- Weekly集計

---

## `by_goal_completed_at`

```text
goalId
completedAt
```

用途：

- Goal Detailの最近の履歴
- Goal別AI履歴取得

---

# 14. characters

## 14.1 役割

ガチャから排出されるキャラクターのマスターデータ。

ユーザーごとの所持状態は保存しない。

---

## 14.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `name` | string | Yes | キャラ名 |
| `rarity` | enum | Yes | R / SR / SSR |
| `description` | string | Yes | 短いプロフィール |
| `imagePath` | string | Yes | 静的アセットPath |
| `defaultMessage` | string | No | 相棒時の基本セリフ |
| `sortOrder` | number | Yes | Collection表示順 |
| `isActive` | boolean | Yes | ガチャ排出・表示対象か |
| `createdAt` | number | Yes | 作成時刻 |
| `updatedAt` | number | Yes | 更新時刻 |

---

# 15. Character Rarity

```text
R
SR
SSR
```

MVP排出率：

```text
R   70%
SR  25%
SSR 5%
```

レアリティ内では均等抽選とする。

キャラクター個別の `weight` はMVPでは持たない。

---

# 16. Character Assets

`imagePath` はMVPではFrontend静的アセットを参照する。

例：

```text
/characters/r_001.webp
/characters/sr_003.webp
/characters/ssr_002.webp
```

画像自体をConvex DBへ保存しない。

---

# 17. characters Index

## `by_rarity`

```text
rarity
```

用途：

- ガチャ抽選対象取得

---

## `by_active_sort_order`

```text
isActive
sortOrder
```

用途：

- Collection一覧
- ガチャ対象キャラ一覧

---

# 18. inventories

## 18.1 役割

ユーザーがどのキャラクターを所持しているかを管理する。

基本原則：

> **User × Character = 1 Record**

---

## 18.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `userId` | Id<users> | Yes | 所有ユーザー |
| `characterId` | Id<characters> | Yes | キャラクター |
| `fragmentCount` | number | Yes | 現在の欠片数 |
| `duplicateCount` | number | Yes | 重複して引いた回数 |
| `obtainedAt` | number | Yes | 初回入手時刻 |
| `updatedAt` | number | Yes | 最終更新時刻 |

---

## 18.3 `isOwned`を持たない理由

Inventoryレコードが存在すること自体を、

```text
Owned
```

とみなす。

そのため、

```text
isOwned
```

フィールドは不要。

---

## 18.4 New Character Draw

初入手時：

```text
inventory record create

fragmentCount = 0
duplicateCount = 0
obtainedAt = now
```

---

## 18.5 Duplicate Draw

重複時：

```text
fragmentCount += fragmentReward
duplicateCount += 1
updatedAt = now
```

---

## 18.6 Future Extension

Character育成を追加する場合、

```text
characterLevel
characterXp
```

等をこのテーブルへ追加可能。

---

# 19. inventories Index

## `by_user`

```text
userId
```

用途：

- Collection
- 所持キャラ一覧

---

## `by_user_character`

```text
userId
characterId
```

用途：

- ガチャ時の重複判定
- 特定キャラ所持確認

`userId + characterId` は実質ユニークとして扱う。

---

# 20. gachaHistory

## 20.1 役割

ガチャ抽選結果の履歴を保持する。

画面表示の即時結果はMutation/Actionの戻り値を使用し、
`gachaHistory` は、

- 記録
- デバッグ
- 集計
- 将来の天井処理

に利用する。

---

## 20.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `userId` | Id<users> | Yes | 抽選ユーザー |
| `characterId` | Id<characters> | Yes | 排出キャラ |
| `rarity` | enum | Yes | 排出時レアリティ |
| `wasDuplicate` | boolean | Yes | 重複だったか |
| `fragmentReward` | number | Yes | 今回付与した欠片 |
| `gachaType` | enum | Yes | ガチャ種別 |
| `drawSequence` | number | Yes | ユーザー通算ガチャ回数 |
| `drawnAt` | number | Yes | 抽選時刻 |

---

# 21. Gacha Type

MVP候補：

```text
normal
firstGuaranteed
```

将来：

```text
event
special
```

などを追加可能。

---

# 22. `rarity`を履歴に保存する理由

`characterId` から参照可能ではあるが、
ガチャ履歴は、

> **抽選時点の結果**

を保存する性質がある。

将来キャラクターマスタが変更されても、
過去の排出結果を保持できるよう、
`rarity` はスナップショット値として保存する。

---

# 23. `drawSequence`

ユーザーごとの通算抽選番号。

例：

```text
1
2
3
...
128
```

用途：

- 通算ガチャ回数
- 天井判定
- デバッグ
- 「何回目でSSRを引いたか」等の分析

ガチャ実行時に `users.totalGachaDraws + 1` を利用する。

---

# 24. gachaHistory Index

## `by_user`

```text
userId
```

用途：

- ガチャ履歴
- 分析

---

## `by_user_draw_sequence`

```text
userId
drawSequence
```

用途：

- 最新ガチャ履歴
- 天井計算
- 通算履歴

---

# 25. Mission Data

MVPでは `missions` テーブルを作成しない。

Mission定義はコード側で管理する。

例：

```ts
DAILY_MISSIONS = {
  COMPLETE_ONE_PDCA: {
    target: 1,
    rewardXp: 50
  }
}
```

進捗は、

```text
pdcaCycles
users
```

から算出する。

---

## 25.1 理由

MVPのMissionは固定かつ少数のため、

```text
missions table
mission definitions
user mission progress
```

まで持つと過剰設計になる。

将来的に、

- ユーザーごとに異なるMission
- イベントMission
- 期間限定Mission
- 報酬受取状態

が必要になった時点で独立テーブル化する。

---

# 26. Title Data

MVPでは称号マスターテーブルを必須としない。

Player Lvに応じた称号をコード側に定義可能。

例：

```ts
PLAYER_TITLES = {
  1: "はじめの一周",
  5: "習慣のたまご",
  10: "Cycle Runner",
  20: "Improver"
}
```

ユーザーが複数称号から自由選択する機能を実装する場合は、
将来的に以下を追加する。

```text
titles
userTitles
```

---

# 27. Player XP / Level

## 27.1 XP Source

基本：

```text
PDCA completed
→ Player XP +100
```

追加：

```text
Daily Mission
Level reward
その他ボーナス
```

---

## 27.2 Source of Truth

`users.playerXp` を現在値の正とする。

`playerLevel` はXPから再計算可能だが、
表示頻度が高いためキャッシュとして保持する。

---

## 27.3 Update

PDCA完了Mutation内で、

```text
1. pdcaCycles.status = completed
2. users.playerXp += BASE_PDCA_XP
3. users.totalCycles += 1
4. Player Lv再計算
5. 必要ならLevel Up
```

をまとめて実行する。

---

# 28. PDCA Completion Transaction

PDCA完了は複数テーブルの更新を伴う。

想定処理：

```text
pdcaCycles
  status → completed
  completedAt → now

goals
  totalCycles += 1
  activeDays 条件付き +1
  lastCompletedAt = now
  lastCompletedDate = today
  nextPlanCandidate = generatedPlan

users
  playerXp += 100
  totalCycles += 1
  streak更新
  playerLevel再計算
```

---

## 28.1 Important

同じPDCAに対して完了Mutationが複数回実行されても、
XPや周回数が二重加算されないようにする。

例：

```text
if cycle.status === "completed":
    do not reward again
```

完了処理は冪等性を意識する。

---

# 29. Gacha Draw Transaction

ガチャ1回の処理：

```text
1. Userの未使用ガチャ権を確認
2. rarity抽選
3. rarity内Character抽選
4. Inventory確認
5. 新規 or 重複処理
6. gachaHistory作成
7. users.totalGachaDraws += 1
8. 未使用ガチャ権を消費
9. 結果をFrontendへ返す
```

---

# 30. 未使用ガチャ回数

現時点の仕様では、

```text
PDCA 1周
→ ガチャ +1回
```

であり、
ガチャを後回しにできる。

そのため、MVP実装では `users` に以下の追加フィールドを持つことを推奨する。

```text
availableGachaDraws: number
```

初期値：

```text
0
```

PDCA完了時：

```text
availableGachaDraws += 1
```

ガチャ時：

```text
availableGachaDraws -= 1
```

---

## 30.1 usersへの追加推奨

最終的な `users` は以下を追加する。

```text
availableGachaDraws
```

これにより、

```text
🎫 ガチャ 2回
```

の表示を簡単に実装できる。

---

# 31. Streak Logic

ストリーク関連値は `users` に集約する。

利用フィールド：

```text
currentStreak
longestStreak
lastCompletedDate
lastRecoveryDate
recoveryUsedInWindow
timezone
```

---

## 31.1 通常完了

今日が `lastCompletedDate` と同じ：

```text
currentStreak unchanged
```

今日が前日の翌日：

```text
currentStreak += 1
```

今日が初回：

```text
currentStreak = 1
```

前日に0周が存在する場合は、
通常完了ではなくRecovery状態との組み合わせを考慮する。

詳細ロジックは `technical-design.md` で定義する。

---

# 32. Recovery PDCA

Recoveryも通常の `pdcaCycles` に保存する。

```text
isRecovery = true
```

とするだけで別テーブルは作らない。

理由：

Recoveryも、

```text
PLAN
DO
CHECK
ACT
```

を回す1つのPDCAであり、
履歴・XP・ガチャの扱いも通常Cycleに近いため。

---

# 33. Guest Data

未ログイン状態ではConvexの `users` 等を作成せず、
localStorageで一時管理する。

Guest Data例：

```json
{
  "goal": {
    "name": "英語学習"
  },
  "cycle": {
    "planText": "英単語を5個覚える",
    "status": "doing"
  },
  "gacha": {
    "availableDraws": 1,
    "firstResult": null
  }
}
```

---

# 34. Guest → Login Merge

Login後、

```text
Guest localStorage
↓
Convex User作成 / 取得
↓
Guest Goal作成
↓
Guest PDCA保存
↓
必要ならGacha状態移行
↓
Guest Data削除
```

を行う。

---

## 34.1 Merge Idempotency

二重同期防止のため、
Guest Sessionに一意IDを持たせることを推奨する。

例：

```text
guestSessionId
```

Login時に既に同IDが移行済みであれば、
再登録しない。

詳細は `technical-design.md` で定義する。

---

# 35. Delete / Archive Policy

## User

Account Delete時は、
関連データ削除方針をtechnical-designで定義する。

## Goal

物理削除せずArchive。

## PDCA

基本削除しない。
途中破棄は `cancelled`。

## Character

マスタ削除ではなく `isActive = false`。

## Inventory

基本削除しない。

## Gacha History

基本削除しない。

---

# 36. Timestamp Policy

Convexの `_creationTime` のみには依存せず、
業務上意味のある時刻は明示的に保持する。

例：

```text
startedAt
completedAt
updatedAt
drawnAt
obtainedAt
```

理由：

- 状態イベントの意味が明確
- Migrationしやすい
- テストしやすい
- 日付ロジックを実装しやすい

---

# 37. Denormalization Policy

MVPでは読み取り頻度が高い値は、
必要に応じて重複保存する。

例：

```text
users.totalCycles
goals.totalCycles
goals.activeDays
users.playerLevel
gachaHistory.rarity
```

ただし、

> **何が元データかを明確にする**

こと。

---

## 37.1 Source of Truth

| Data | Source of Truth |
|---|---|
| PDCA履歴 | `pdcaCycles` |
| ガチャ履歴 | `gachaHistory` |
| 所持キャラ | `inventories` |
| キャラ情報 | `characters` |
| Goal情報 | `goals` |
| 現在Player XP | `users.playerXp` |
| Streak現在値 | `users.currentStreak` |

---

# 38. Recommended Convex Schema Shape

概念例：

```ts
users
goals
pdcaCycles
characters
inventories
gachaHistory
```

それぞれ `v.id()` により参照を持つ。

文字列Enumは `v.union(v.literal(...))` で表現する。

---

# 39. Example: users

```json
{
  "clerkUserId": "user_xxx",
  "displayName": "Yuto",
  "playerXp": 1420,
  "playerLevel": 7,
  "currentTitle": "習慣のたまご",
  "currentStreak": 14,
  "longestStreak": 21,
  "lastCompletedDate": "2026-08-28",
  "recoveryUsedInWindow": false,
  "totalCycles": 128,
  "totalGachaDraws": 122,
  "availableGachaDraws": 6,
  "timezone": "Asia/Tokyo",
  "createdAt": 1787920000000,
  "updatedAt": 1788000000000
}
```

---

# 40. Example: goals

```json
{
  "userId": "<users:id>",
  "name": "英語学習",
  "nextPlanCandidate": "英単語を5個復習する",
  "totalCycles": 42,
  "activeDays": 18,
  "lastCompletedAt": 1788000000000,
  "lastCompletedDate": "2026-08-28",
  "createdAt": 1787000000000,
  "updatedAt": 1788000000000
}
```

---

# 41. Example: pdcaCycles

```json
{
  "userId": "<users:id>",
  "goalId": "<goals:id>",
  "planText": "英単語を10個覚える",
  "status": "completed",
  "doResult": "partial",
  "checkLoad": "slightlyHeavy",
  "checkReason": "noFocus",
  "checkMemo": "後半で集中が切れた",
  "actType": "lighter",
  "nextPlanCandidate": "英単語を5個復習する",
  "isRecovery": false,
  "startedAt": 1787998000000,
  "completedAt": 1788000000000,
  "createdAt": 1787998000000,
  "updatedAt": 1788000000000
}
```

---

# 42. Example: characters

```json
{
  "name": "ルミ",
  "rarity": "SR",
  "description": "小さな積み重ねが大好きな光の精霊。",
  "imagePath": "/characters/sr_001.webp",
  "defaultMessage": "今日も一周だけやってみよう。",
  "sortOrder": 9,
  "isActive": true,
  "createdAt": 1787000000000,
  "updatedAt": 1787000000000
}
```

---

# 43. Example: inventories

```json
{
  "userId": "<users:id>",
  "characterId": "<characters:id>",
  "fragmentCount": 40,
  "duplicateCount": 2,
  "obtainedAt": 1787500000000,
  "updatedAt": 1788000000000
}
```

---

# 44. Example: gachaHistory

```json
{
  "userId": "<users:id>",
  "characterId": "<characters:id>",
  "rarity": "SR",
  "wasDuplicate": true,
  "fragmentReward": 20,
  "gachaType": "normal",
  "drawSequence": 122,
  "drawnAt": 1788000100000
}
```

---

# 45. MVP Index Summary

## users

```text
by_clerk_user_id
```

## goals

```text
by_user
by_user_archived
```

## pdcaCycles

```text
by_user
by_goal
by_user_status
by_user_completed_at
by_goal_completed_at
```

## characters

```text
by_rarity
by_active_sort_order
```

## inventories

```text
by_user
by_user_character
```

## gachaHistory

```text
by_user
by_user_draw_sequence
```

---

# 46. MVPで作らないテーブル

以下は将来拡張候補とする。

```text
missions
titles
userTitles
characterLevels
characterMessages
notifications
bases
buildings
items
eventGachas
```

MVPで必要にならない限り作成しない。

---

# 47. Future Extensions

## Character Growth

`inventories` に追加：

```text
characterLevel
characterXp
```

---

## Goalごとの相棒

`goals` に追加：

```text
partnerCharacterId
```

---

## Mission System

追加：

```text
missionDefinitions
userMissionProgress
```

---

## Titles

追加：

```text
titles
userTitles
```

---

## Base Growth

追加候補：

```text
bases
baseCharacters
buildings
decorations
```

---

# 48. Data Integrity Rules

MVPでも以下を守る。

1. 他ユーザーのGoal / Cycleを更新できない
2. Inventoryは同一User × Characterで1件
3. `completed` Cycleへ二重報酬を付与しない
4. ガチャ残数0でガチャを実行できない
5. Inventory重複時に新規レコードを作らない
6. Archive済みGoalから新規PDCAを開始しない
7. 非Active Characterを通常ガチャから排出しない
8. Player XP / Gacha / Streak更新はServer側で行う
9. Frontendから渡されたXP値等を信用しない
10. `userId` は認証情報から確定し、任意入力させない

---

# 49. Implementation Responsibility

## Frontend

主に入力・表示。

```text
Goal name
PLAN
DO Result
CHECK
ACT
```

をBackendへ送る。

Player XPやStreak値をFrontend自身で決定しない。

---

## Convex Mutation

データの永続化・整合性更新。

例：

```text
Goal CRUD
Cycle state transition
PDCA completion
Inventory update
```

---

## Convex Action

外部APIや非決定的処理。

例：

```text
LLM PLAN generation
```

ガチャ抽選をMutation/Actionのどちらに配置するかは、
Convexの実装制約を確認してtechnical-designで最終確定する。

---

# 50. 最終方針

PDCA GACHAのMVPでは、

> **最小限のテーブル数で、PDCAの履歴とゲーム報酬の整合性を保つ**

ことを重視する。

特に重要なのは以下。

```text
users
→ 現在状態・集計値

goals
→ 継続対象

pdcaCycles
→ PDCA履歴の正本

characters
→ キャラクターマスター

inventories
→ 現在の所持状態

gachaHistory
→ ガチャ結果履歴
```

この6テーブルを中心に、

> PLAN → DO → CHECK → ACT → Reward

というコアループを、
シンプルかつ安全に実装できるデータ構造を維持する。

---

# 51. pushSubscriptions (Push Notification)

MVP完了後、ストリークAt-Riskトリガーに限定したWeb Push通知を追加した
(docs/technical-design.md Push Notification参照)。`users`テーブルは変更せず、
通知専用の新規テーブル1つに閉じている。

## 51.1 役割

ログイン中ユーザーのデバイス(ブラウザ)ごとのWeb Push購読を管理する。

基本原則：

> **User × Device(endpoint) = 1 Record**

## 51.2 Schema

| Field | Type | Required | Description |
|---|---|---:|---|
| `userId` | Id<users> | Yes | 所有ユーザー |
| `endpoint` | string | Yes | Push Service購読URL。デバイス/ブラウザの自然な一意キー |
| `keys.p256dh` | string | Yes | Push暗号化鍵 |
| `keys.auth` | string | Yes | Push認証シークレット |
| `userAgent` | string | No | 参考情報(表示等では未使用) |
| `notifyHours` | number[] | Yes | 通知を送るローカル時刻(0-23)のプリセット。複数選択可、空配列は不可 |
| `lastNotifiedDate` | string | No | この購読が最後に通知した(ユーザーの)ローカル日付。同日重複送信の冪等性ガード |
| `createdAt` | number | Yes | 作成時刻 |
| `updatedAt` | number | Yes | 最終更新時刻 |

## 51.3 Index

```text
by_user
by_endpoint
```

`by_user`: ユーザー単位の購読一覧・削除に使用。
`by_endpoint`: 同一デバイスからの再subscribe時のupsertと、
オーナーシップ確認付きunsubscribe/updateに使用。

## 51.4 冪等性ガードをusersではなくここに置く理由

`lastNotifiedDate`はユーザー単位ではなく購読(デバイス)単位で持つ。
複数デバイスがそれぞれ異なる`notifyHours`を持てるため、
「デバイスごとに1日1回」が正しい粒度であり、
`users`テーブルへの変更を避けられる。
