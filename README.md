# PDCA GACHA

> **PDCAを回す。ガチャも回す。**  
> 「継続」をゲームの報酬ループで後押しする、PDCA × ガチャの習慣化アプリ。

PDCA GACHA は、現実世界で **PLAN → DO → CHECK → ACT** を1周するたびに、ゲーム内でガチャを1回引けるプロダクトです。

タスクそのものの「成功 / 失敗」ではなく、振り返って次の行動につなげたことを評価します。

```text
現実世界でPDCAを回す
        ↓
Player XPを獲得
        ↓
ガチャ権 +1
        ↓
キャラクターを集める
        ↓
また次のPDCAを回したくなる
```

---

## Why PDCA GACHA?

継続系アプリでは、記録や振り返りそのものが負担になったり、一度できなかっただけでモチベーションが切れてしまうことがあります。

PDCA GACHAでは、次の考え方を中心に設計しています。

- **頑張らせるのではなく、やめさせない**
- **量を入口にして、質を育てる**
- **1周できれば十分。2周目以降はボーナス**
- タスクを達成できなくても、CHECK / ACTまで行えば正しく1周として扱う
- 自由記述を極力必須にせず、タップ中心で回せる
- AIはユーザーの代わりに決めるのではなく、次のPLANを考える負担だけを減らす

このプロダクトが評価するのは、

> **「できたか」ではなく、「次につながるところまで回したか」**

です。

---

## Core Experience

### 1. Goalを決める

長期的に続けたい対象だけを登録します。

```text
英語学習
筋トレ
卒業研究
読書
```

### 2. 小さなPLANを決める

Goalを、今すぐ実行できるサイズまで落とします。

```text
Goal: 英語学習
PLAN: 英単語を5個復習する
```

PLANは状況に合わせて、

```text
もっと軽く
これでやる
もう少しやる
自分で変更
```

から調整できます。

### 3. DO → CHECK → ACT

DOの結果は3択です。

```text
できた
一部できた
できなかった
```

どの結果でもCHECK / ACTへ進めます。

### 4. PDCA COMPLETE

1周完了すると、基本報酬として以下を獲得します。

```text
Player XP +100
ガチャ権 +1
Streak更新
```

### 5. ガチャを回す

ガチャでは「継続エネルギー」から生まれた小さな精霊・マスコットを集めます。

MVPでは15体を予定しています。

| Rarity | Characters | Rate |
|---|---:|---:|
| R | 8 | 70% |
| SR | 5 | 25% |
| SSR | 2 | 5% |
| **Total** | **15** | **100%** |

重複したキャラクターは欠片へ変換されます。

---

## Main Features

### PDCA Core Loop

- Goal管理
- PLAN / DO / CHECK / ACT
- 途中保存・再開
- DO未達成でも完走可能
- ACTを次回PLANへ接続

### Player Progression

- 1 PDCA = Player XP +100
- Player Level
- 継続回数の可視化
- 将来的な称号 / Progressive PDCA機能解放

### Streak & Recovery

毎日の継続をStreakとして表示します。

ただし、1日抜けただけで即リセットするのではなく、条件を満たしていれば翌日に **Recovery PDCA** で継続を救済できます。

Recoveryも「なぜ昨日できなかったか」を振り返り、今日の小さな行動へつなげるPDCAとして扱います。

### Character Collection

- R / SR / SSR ガチャ
- Character Collection
- 未所持Characterのシルエット表示
- 重複 → 欠片
- お気に入り / 相棒Character

### AI-assisted PLAN

AIはチャットの主役ではなく、裏側の補助役として利用します。

主な用途：

- Goalから最初の小さなPLANを提案
- CHECK / ACTから次回PLANを提案

AIが失敗しても、ルールベースのFallbackでPDCA自体は継続できる設計です。

### Guest First Experience

初回からログインを要求せず、まずPDCA GACHAの価値を体験できます。

```text
Goal
↓
PLAN
↓
PDCA
↓
Gacha
↓
Google Login
↓
Guest Data Migration
```

---

## Product Principles

実装・仕様判断では、以下を重要な不変条件として扱います。

```text
1 PDCA Cycle = 1 record

1 completed PDCA
= XP reward once
= totalCycles +1 once
= gacha right +1 once

Task success / failure
!= base reward amount

1 successful Gacha
= 1 draw right consumed
= 1 gachaHistory record

Client
!= authority for rewards

AI failure
!= core loop failure
```

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend / Database | Convex |
| Authentication | Clerk + Google OAuth |
| AI | LLM API via Convex Action |
| Hosting | Vercel |
| App | Mobile-first PWA |

基本構成：

```text
React
  ↓ User Intent
Convex Query / Mutation / Action
  ├─ Clerk → Identity
  ├─ Convex DB → Source of Truth
  └─ LLM API → PLAN Suggestion
```

### Backend Responsibility

```text
Query
→ Read only

Mutation
→ Domain state change / rewards

Action
→ External API calls
```

基本原則は、

> **Clientは「意図」を送り、Serverが「事実と報酬」を決める。**

です。

---

## MVP Scope

ハッカソンMVPでは、まず以下を完成させます。

- Goal
- PLAN / DO / CHECK / ACT
- PDCA Complete
- Player XP / Player Lv
- Streak / Recovery
- 1 PDCA = 1 Gacha
- Character Collection
- 重複 / 欠片
- 相棒Character
- Guest Mode / Login Migration
- History
- 基本デイリーミッション
- Core Integration / E2E Test

MVPの最重要パスは以下です。

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
↓
XP / Streak / Gacha
↓
Next PDCA
```

---

## Roadmap

### Phase 1 — MVP: Character Collection

現実のPDCAをゲーム報酬へ接続し、キャラクター収集までを完成させます。

### Phase 2 — Character Growth

- Character XP / Character Lv
- 欠片消費
- 進化 / 覚醒
- 親密度
- キャラ別セリフ
- Goalごとの相棒

### Phase 3 — World Growth

- 自分だけの拠点
- 建物 / 家具
- Character配置
- 施設アップグレード
- PDCAを続けるほど世界が成長する仕組み

その他のPost-MVP候補：

- ウィークリーミッション
- Player Lv称号 / 機能解放
- 10連ガチャ
- Soft Pity / SSR保証
- バッジ / Collection達成報酬
- Goal別傾向分析
- 月間PDCAレポート
- PWA Push通知

最終的には、

> **PDCAを続けるほど、自分だけの世界が育っていく**

体験を目指します。

---

## Documentation

仕様は `docs/` 以下をSource of Truthとして管理しています。

| Document | Purpose |
|---|---|
| [`overview.md`](docs/overview.md) | プロダクト概要・思想 |
| [`product-spec.md`](docs/product-spec.md) | プロダクト仕様 |
| [`user-flow.md`](docs/user-flow.md) | ユーザーフロー |
| [`game-design.md`](docs/game-design.md) | ゲーム設計 |
| [`tech-stack.md`](docs/tech-stack.md) | 技術選定 |
| [`ui-spec.md`](docs/ui-spec.md) | UI / UX仕様 |
| [`data-model.md`](docs/data-model.md) | データモデル |
| [`technical-design.md`](docs/technical-design.md) | 技術設計・Domain Rules |
| [`implementation-plan.md`](docs/implementation-plan.md) | 実装順・タスク分解 |
| [`acceptance-criteria.md`](docs/acceptance-criteria.md) | 完成条件・テスト基準 |
| [`AGENTS.md`](AGENTS.md) | Coding Agent向け実装ルール |

コーディングエージェントを利用する場合は、必ず [`AGENTS.md`](AGENTS.md) と対象機能に関連するDocsを確認してください。

---

## Issue Management

実装タスクはGitHub Issuesで管理しています。

### Priority / Phase Labels

| Label | Meaning |
|---|---|
| `MVP` | ハッカソン提出までに必須 |
| `Optional` | MVP期間中、余裕があれば実装 |
| `Post-MVP` | MVP完成後の拡張 |

### Difficulty Labels

```text
Easy
Normal
Hard
```

### Area Labels

例：

```text
Area: Frontend
Area: Backend
Area: Infra
Area: AI
Area: QA
Area: Game Design
```

各Issueには、

- タスク概要
- 担当領域
- 実装内容
- 完了条件
- 参照ドキュメント
- 難易度
- MVP / Optional / Post-MVP
- `Blocked by` による依存Issue

を明記します。

Issues:  
https://github.com/AliceWonerfulWorld/Progate_PDCAGatya/issues

---

## Development Status

### Phase 0 — Project Foundation: Complete

React + Vite + TypeScript + Tailwind CSS によるフロントエンド基盤を構築しました。

現時点で利用できる画面・構成：

- Home / Collection / History / Profile の基本ルーティング
- Goal Detail 用 Route
- Mobile-first の Header / Main / Bottom Navigation
- PDCAフロー用パスでは Bottom Navigation を非表示にできる App Shell 構造

### Phase 1 — Convex Schema / Indexes: Complete

Convex のローカル開発用 deployment と、MVPで使用する6テーブルの Schema を構築しました。

- `users` / `goals` / `pdcaCycles` / `characters` / `inventories` / `gachaHistory`
- `docs/data-model.md` に定義された全 Index
- PDCA、ガチャ、ストリークに必要な enum・optional field・ID参照

未着手の領域：

- Convex / Clerk の接続
- Goal、PDCA、報酬、ガチャ、ストリークの業務ロジック
- Guest Mode / Login Migration
- PWA設定、AI PLAN、各画面の実データ連携

### Local Development

必要環境：Node.js 22 以降、npm 10 以降。

```bash
npm install
npm run dev
```

Vite が表示するローカル URL をブラウザで開いてください。

品質確認には以下を使用します。

```bash
npm run lint
npm run build
```

`npx convex dev --once` を実行すると、ローカル Convex deployment 用の値が `.env.local` に自動作成されます。`.env.local` は Git 管理しません。

Clerk・LLM 用の環境変数は、該当フェーズでここに追記します。

---

## Hackathon Theme

**「ひと夏の狂気 ～究極の『継続』を生み出せ～」**

PDCA GACHAでは、継続を「意志の強さ」だけに任せるのではなく、

```text
回す
↓
報酬が返る
↓
また回したくなる
```

というゲームのループを現実世界の改善サイクルへ接続します。

> **ガチャを回したいから始めたPDCAが、いつの間にか自分自身の習慣になっている。**

その状態をこのプロダクトのゴールとします。
